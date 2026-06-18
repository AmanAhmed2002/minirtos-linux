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
  echo "ERROR: IMAGE_TAG should be a Git SHA."
  exit 2
fi

for cmd in kubectl aws jq; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: $cmd is required."
    exit 2
  fi
done

TF_DIR="${TF_DIR:-terraform/environments/dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"

if [ -z "${RDS_ENDPOINT:-}" ]; then
  RDS_ENDPOINT="$(cd "$TF_DIR" && terraform output -raw rds_endpoint)"
fi

if [ -z "${RDS_DATABASE_NAME:-}" ]; then
  RDS_DATABASE_NAME="$(cd "$TF_DIR" && terraform output -raw rds_database_name)"
fi

if [ -z "${RDS_USERNAME:-}" ]; then
  RDS_USERNAME="$(cd "$TF_DIR" && terraform output -raw rds_username)"
fi

if [ -z "${RDS_SECRET_ARN:-}" ]; then
  RDS_SECRET_ARN="$(cd "$TF_DIR" && terraform output -raw rds_master_user_secret_arn)"
fi

if [ -z "${RDS_PASSWORD:-}" ]; then
  RDS_PASSWORD="$(
    aws secretsmanager get-secret-value \
      --secret-id "$RDS_SECRET_ARN" \
      --region "$AWS_REGION" \
      --query SecretString \
      --output text | jq -r '.password'
  )"
fi

if [ -z "$RDS_ENDPOINT" ] || [ -z "$RDS_DATABASE_NAME" ] || [ -z "$RDS_USERNAME" ] || [ -z "$RDS_PASSWORD" ]; then
  echo "ERROR: Missing one or more RDS values."
  exit 2
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cp -R k8s "$TMP_DIR/k8s"

AWS_KUSTOMIZATION="$TMP_DIR/k8s/overlays/aws/kustomization.yaml"
AWS_RDS_CONFIG_PATCH="$TMP_DIR/k8s/overlays/aws/patch-backend-rds-configmap.yml"

if ! grep -q "aws-release-placeholder" "$AWS_KUSTOMIZATION"; then
  echo "ERROR: aws-release-placeholder was not found in $AWS_KUSTOMIZATION"
  exit 2
fi

if ! grep -q "__RDS_ENDPOINT__" "$AWS_RDS_CONFIG_PATCH"; then
  echo "ERROR: __RDS_ENDPOINT__ placeholder was not found in $AWS_RDS_CONFIG_PATCH"
  exit 2
fi

sed -i.bak "s/newTag: aws-release-placeholder/newTag: ${IMAGE_TAG}/g" "$AWS_KUSTOMIZATION"
sed -i.bak "s|__RDS_ENDPOINT__|${RDS_ENDPOINT}|g" "$AWS_RDS_CONFIG_PATCH"
sed -i.bak "s|__RDS_DATABASE_NAME__|${RDS_DATABASE_NAME}|g" "$AWS_RDS_CONFIG_PATCH"

echo ""
echo "=== Syncing Kubernetes DB Secret for RDS ==="
kubectl create secret generic minirtos-postgres-secret \
  --namespace minirtos \
  --from-literal=POSTGRES_DB="$RDS_DATABASE_NAME" \
  --from-literal=POSTGRES_USER="$RDS_USERNAME" \
  --from-literal=POSTGRES_PASSWORD="$RDS_PASSWORD" \
  --dry-run=client \
  -o yaml | kubectl apply -f -

echo ""
echo "=== Rendering AWS release manifest ==="
echo "Image tag: $IMAGE_TAG"
echo "RDS endpoint: $RDS_ENDPOINT"
echo "RDS database: $RDS_DATABASE_NAME"
echo "RDS username: $RDS_USERNAME"
echo ""

kubectl kustomize "$TMP_DIR/k8s/overlays/aws" > "$TMP_DIR/minirtos-aws-release.yml"

echo "Rendered manifest:"
echo "$TMP_DIR/minirtos-aws-release.yml"
echo ""

echo "=== Applying AWS release ==="
kubectl apply -f "$TMP_DIR/minirtos-aws-release.yml"

echo ""
echo "=== Restarting backend so it picks up RDS config/secret ==="
kubectl rollout restart deployment/minirtos-backend -n minirtos

echo ""
echo "=== Waiting for Kubernetes rollouts ==="
kubectl rollout status deployment/minirtos-backend -n minirtos --timeout=240s
kubectl rollout status deployment/minirtos-frontend -n minirtos --timeout=180s

echo ""
echo "=== Current app state ==="
kubectl get pods -n minirtos
kubectl get svc -n minirtos
kubectl get ingress -n minirtos

echo ""
echo "Applied AWS release using image tag: $IMAGE_TAG"
