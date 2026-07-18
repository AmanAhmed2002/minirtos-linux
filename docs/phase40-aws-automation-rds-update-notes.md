# Phase 40/41 AWS Automation, RDS, and Learning Platform Update Notes

**Updated:** July 17, 2026
**Project:** MiniRTOS Playground
**Phase:** Phase 40/41 — AWS deployment automation, RDS persistence, and learning platform expansion

---

## Summary

Recent commits moved the project beyond the Phase 39 HTTPS custom-domain deployment. The AWS path now has remote Terraform state, a manual GitHub Actions deployment workflow using OIDC, and Terraform-managed RDS PostgreSQL. The frontend also moved from a single dashboard into a routed learning application with beginner modules, glossary pages, and run analysis views.

Completed outcomes:

- `terraform/bootstrap/remote-state` provisions the S3 state bucket and DynamoDB lock table.
- `terraform/environments/dev/backend.tf` points dev Terraform state at the remote S3 backend.
- `terraform/environments/dev/github-actions-deploy.tf` creates the GitHub Actions OIDC provider, deploy role, EKS access entry, and permissions to describe EKS and read the RDS master secret.
- `.github/workflows/deploy-aws.yml` adds a manual `workflow_dispatch` deployment with image SHA, environment, and explicit confirmation inputs.
- The workflow validates deployment from `main`, rejects `latest`, checks both GHCR images exist, assumes AWS credentials through OIDC, deploys the selected SHA, and runs the HTTPS smoke test.
- `terraform/modules/rds` provisions encrypted RDS PostgreSQL with AWS-managed master password, deletion protection, backups, and a security group allowing PostgreSQL from EKS nodes.
- `k8s/overlays/aws` deletes the base in-cluster PostgreSQL StatefulSet and patches backend datasource configuration to the RDS endpoint.
- `scripts/deploy_aws_release.sh` renders the image SHA, reads RDS outputs, fetches the RDS password from Secrets Manager, syncs the Kubernetes database Secret, applies the AWS overlay, restarts the backend, and waits for rollouts.
- `scripts/sync_rds_db_secret.sh` re-syncs the Kubernetes database Secret after an automatic RDS password rotation, and `.github/workflows/sync-rds-secret.yml` runs it hourly so rotations no longer take the deployed backend down.
- The backend exposes `GET /api/runs/{runId}/logs` for saved runtime log retrieval.
- The frontend now uses React Router routes for Home, Learn, Lesson Detail, Simulator, Runs, Analysis, and Glossary.
- `MiniRtosDataProvider` centralizes scenario, run, selected-run, and analysis state across routes.
- The lesson catalog and glossary are frontend-owned metadata that link beginner learning modules to backend scenario IDs.

---

## Remote Terraform State

Bootstrap once before using the dev backend in a fresh AWS account:

```bash
cd terraform/bootstrap/remote-state
terraform init
terraform apply
```

The dev environment then uses:

```text
S3 bucket: minirtos-terraform-state-<account-id>-us-east-1
State key: minirtos/dev/terraform.tfstate
DynamoDB table: minirtos-terraform-locks
Region: us-east-1
```

Do not delete the state bucket or lock table while the dev infrastructure exists.

---

## RDS AWS Database Path

AWS no longer uses the in-cluster PostgreSQL StatefulSet from the base manifests. Local Docker, local kind, and GHCR local testing still use the project PostgreSQL manifests.

AWS path:

```text
Terraform module rds
  -> encrypted RDS PostgreSQL
  -> private endpoint
  -> Secrets Manager managed master password
  -> security group allows port 5432 from EKS nodes

k8s/overlays/aws
  -> patch-delete-incluster-postgres.yml
  -> patch-backend-rds-configmap.yml
  -> minirtos-backend connects to RDS
```

`deploy_aws_release.sh` resolves these values from Terraform unless they are already supplied as environment variables:

```text
RDS_ENDPOINT
RDS_DATABASE_NAME
RDS_USERNAME
RDS_SECRET_ARN
RDS_PASSWORD
```

---

## RDS Password Rotation Outage and Fix

On July 15, 2026 the deployed site failed on every database-backed endpoint: the Simulator tab returned HTTP 500 from `POST /api/runs`, and run analysis views showed analysis errors. Backend logs showed the root cause:

```text
FATAL: password authentication failed for user "minirtos" (SQLState 28P01)
```

The RDS master password is AWS-managed in Secrets Manager and rotates automatically every 7 days. `deploy_aws_release.sh` only syncs the password into the `minirtos-postgres-secret` Kubernetes Secret at deploy time, so the rotation on July 9 left the running backend holding a stale password. Every new database connection then failed authentication until the Secret was re-synced and the backend restarted.

The fix has two parts:

```text
scripts/sync_rds_db_secret.sh
  -> fetches the current password from Secrets Manager
  -> compares it with the Kubernetes Secret
  -> no-op when they match
  -> otherwise re-applies the Secret, restarts the backend, waits for rollout

.github/workflows/sync-rds-secret.yml
  -> hourly schedule plus workflow_dispatch
  -> uses the existing GitHub Actions OIDC deploy role
  -> runs the sync script, then the HTTPS smoke test
```

The script resolves `RDS_DATABASE_NAME`, `RDS_USERNAME`, and `RDS_SECRET_ARN` from the environment (as the workflow supplies them from repository variables) or falls back to Terraform outputs, mirroring `deploy_aws_release.sh`. No new AWS permissions or repository variables were needed — the deploy role already reads the RDS master secret and holds an EKS access entry.

Manual recovery, if ever needed:

```bash
./scripts/sync_rds_db_secret.sh
```

---

## Manual GitHub Actions Deployment

Workflow file:

```text
.github/workflows/deploy-aws.yml
```

Inputs:

```text
image_sha: Git SHA image tag to deploy; must already exist in GHCR
environment: dev
confirm: must equal deploy
```

Required repository variables:

```text
AWS_GITHUB_ACTIONS_DEPLOY_ROLE_ARN
AWS_REGION
EKS_CLUSTER_NAME
APP_URL
RDS_ENDPOINT
RDS_DATABASE_NAME
RDS_USERNAME
RDS_SECRET_ARN
```

The workflow uses OIDC, not static AWS keys. It still requires the AWS Load Balancer Controller and cluster prerequisites to already be installed/configured.

---

## Frontend Learning Platform

Current routes:

```text
/                  Home
/learn             Lesson catalog
/learn/:lessonId   Lesson detail
/simulator         Scenario runner
/runs              Persisted run history
/analysis          Completed-run analysis
/glossary          Glossary
```

Important frontend files:

```text
frontend/src/App.tsx
frontend/src/context/MiniRtosDataContext.tsx
frontend/src/context/miniRtosData.ts
frontend/src/data/lessonCatalog.ts
frontend/src/data/glossary.ts
frontend/src/pages/HomePage.tsx
frontend/src/pages/LearnPage.tsx
frontend/src/pages/LessonDetailPage.tsx
frontend/src/pages/SimulatorPage.tsx
frontend/src/pages/RunsPage.tsx
frontend/src/pages/AnalysisPage.tsx
frontend/src/pages/GlossaryPage.tsx
frontend/src/components/AppNav.tsx
frontend/src/components/LessonCard.tsx
frontend/src/components/TooltipTerm.tsx
frontend/src/components/AnalysisExplanationPanel.tsx
```

The lesson catalog references backend scenario IDs instead of duplicating backend scenario configuration.

---

## Backend API Additions

New endpoint:

```text
GET /api/runs/{runId}/logs
```

Response shape:

```text
runId
logPath
content
```

This endpoint reads the runtime log path already persisted for the selected run and returns the saved log content for analysis/learning views.

---

## Remaining Production Gaps

- AWS Load Balancer Controller installation is still operator-managed.
- DNS and ACM certificate lifecycle are still manual.
- RDS password is synced into a Kubernetes Secret at deployment and re-synced hourly by the `Sync RDS Secret` workflow after automatic rotations; External Secrets or Secrets Manager CSI integration is not implemented.
- Deployment is manual `workflow_dispatch`, not continuous GitOps.
- No scheduled teardown or automated cost guardrail exists.
- Smoke testing is intentionally lightweight and should be paired with browser verification.
