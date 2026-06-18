#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG="${1:-}"

if [ -z "$IMAGE_TAG" ]; then
  echo "Usage: $0 <git-sha-image-tag>"
  echo ""
  echo "Example:"
  echo "  $0 \$(git rev-parse HEAD)"
  exit 2
fi

if [ "$IMAGE_TAG" = "latest" ]; then
  echo "ERROR: Do not deploy latest to AWS. Use a concrete Git SHA image tag."
  exit 2
fi

if ! [[ "$IMAGE_TAG" =~ ^[0-9a-f]{7,40}$ ]]; then
  echo "ERROR: IMAGE_TAG should be a Git SHA, for example:"
  echo "  $(git rev-parse --short HEAD 2>/dev/null || echo abc1234)"
  exit 2
fi

if ! command -v kubectl >/dev/null 2>&1; then
  echo "ERROR: kubectl is required."
  exit 2
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cp -R k8s "$TMP_DIR/k8s"

AWS_KUSTOMIZATION="$TMP_DIR/k8s/overlays/aws/kustomization.yaml"

if ! grep -q "aws-release-placeholder" "$AWS_KUSTOMIZATION"; then
  echo "ERROR: aws-release-placeholder was not found in:"
  echo "  $AWS_KUSTOMIZATION"
  echo "The AWS overlay must use aws-release-placeholder as the image tag placeholder."
  exit 2
fi

sed -i.bak "s/newTag: aws-release-placeholder/newTag: ${IMAGE_TAG}/g" "$AWS_KUSTOMIZATION"

echo ""
echo "=== Rendering AWS release manifest ==="
echo "Image tag: $IMAGE_TAG"
echo ""

kubectl kustomize "$TMP_DIR/k8s/overlays/aws" > "$TMP_DIR/minirtos-aws-release.yml"

echo "Rendered manifest:"
echo "$TMP_DIR/minirtos-aws-release.yml"
echo ""

echo "=== Applying AWS release ==="
kubectl apply -f "$TMP_DIR/minirtos-aws-release.yml"

echo ""
echo "=== Waiting for Kubernetes rollouts ==="
kubectl rollout status deployment/minirtos-backend -n minirtos --timeout=180s
kubectl rollout status deployment/minirtos-frontend -n minirtos --timeout=180s
kubectl rollout status statefulset/minirtos-postgres -n minirtos --timeout=180s

echo ""
echo "=== Current app state ==="
kubectl get pods -n minirtos
kubectl get svc -n minirtos
kubectl get ingress -n minirtos

echo ""
echo "Applied AWS release using image tag: $IMAGE_TAG"
