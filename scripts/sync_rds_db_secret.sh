#!/usr/bin/env bash
set -euo pipefail

# Syncs the Kubernetes database Secret with the current RDS master password.
#
# The RDS master password is AWS-managed in Secrets Manager and rotates
# automatically (every 7 days by default). deploy_aws_release.sh only syncs
# the password at deploy time, so after a rotation the backend fails with
# "password authentication failed" until the Secret is re-synced and the
# backend restarted. This script closes that gap and is safe to run on a
# schedule: it is a no-op unless the password actually changed.

for cmd in kubectl aws jq; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: $cmd is required."
    exit 2
  fi
done

TF_DIR="${TF_DIR:-terraform/environments/dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"

if [ -z "${RDS_DATABASE_NAME:-}" ]; then
  RDS_DATABASE_NAME="$(cd "$TF_DIR" && terraform output -raw rds_database_name)"
fi

if [ -z "${RDS_USERNAME:-}" ]; then
  RDS_USERNAME="$(cd "$TF_DIR" && terraform output -raw rds_username)"
fi

if [ -z "${RDS_SECRET_ARN:-}" ]; then
  RDS_SECRET_ARN="$(cd "$TF_DIR" && terraform output -raw rds_master_user_secret_arn)"
fi

RDS_PASSWORD="$(
  aws secretsmanager get-secret-value \
    --secret-id "$RDS_SECRET_ARN" \
    --region "$AWS_REGION" \
    --query SecretString \
    --output text | jq -r '.password'
)"

if [ -z "$RDS_DATABASE_NAME" ] || [ -z "$RDS_USERNAME" ] || [ -z "$RDS_PASSWORD" ]; then
  echo "ERROR: Missing one or more RDS values."
  exit 2
fi

CURRENT_PASSWORD="$(
  kubectl get secret minirtos-postgres-secret \
    --namespace minirtos \
    -o jsonpath='{.data.POSTGRES_PASSWORD}' 2>/dev/null | base64 -d || true
)"

if [ "$CURRENT_PASSWORD" = "$RDS_PASSWORD" ]; then
  echo "Kubernetes Secret already matches Secrets Manager. Nothing to do."
  exit 0
fi

echo "=== Password changed in Secrets Manager. Syncing Kubernetes Secret ==="
kubectl create secret generic minirtos-postgres-secret \
  --namespace minirtos \
  --from-literal=POSTGRES_DB="$RDS_DATABASE_NAME" \
  --from-literal=POSTGRES_USER="$RDS_USERNAME" \
  --from-literal=POSTGRES_PASSWORD="$RDS_PASSWORD" \
  --dry-run=client \
  -o yaml | kubectl apply -f -

echo ""
echo "=== Restarting backend so it picks up the new password ==="
kubectl rollout restart deployment/minirtos-backend -n minirtos
kubectl rollout status deployment/minirtos-backend -n minirtos --timeout=240s

echo ""
echo "Synced RDS password into minirtos-postgres-secret and restarted backend."
