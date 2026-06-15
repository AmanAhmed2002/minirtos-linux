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

if ! command -v kubectl >/dev/null 2>&1; then
  echo "ERROR: kubectl is required."
  exit 2
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cp -R k8s "$TMP_DIR/k8s"

AWS_KUSTOMIZATION="$TMP_DIR/k8s/overlays/aws/kustomization.yaml"

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
echo "Applied AWS release using image tag: $IMAGE_TAG"
