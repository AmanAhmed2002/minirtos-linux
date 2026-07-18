# Phase 36 AWS EKS and Terraform Update Notes

**Updated:** June 26, 2026
**Project:** MiniRTOS Playground
**Phase:** Phase 36 with Phase 37/38/39/40 AWS deployment hardening notes

---

## What Changed

Phase 36 moved MiniRTOS Playground from local Kubernetes to an AWS EKS learning deployment managed by Terraform. Phase 37 added ALB single-origin routing. Phase 38 updated the EKS target version, removed NodePorts from the shared base, and switched AWS deployment to immutable Git SHA image tags. Phase 39 added HTTPS custom-domain access at `https://app.minirtos.biz`. Phase 40 added S3/DynamoDB remote Terraform state, GitHub Actions OIDC deployment, and Terraform-managed RDS PostgreSQL for the AWS database path.

Completed outcomes:

- Terraform provisions the AWS networking and EKS infrastructure.
- EKS runs in `us-east-1` as cluster `minirtos-eks`.
- The dev node group uses two `t3.small` worker nodes.
- The EBS CSI driver is installed as an EKS addon.
- Terraform creates the EKS OIDC provider and an IRSA IAM role for `system:serviceaccount:kube-system:ebs-csi-controller-sa`.
- Kubernetes uses a default `gp3` StorageClass backed by `ebs.csi.aws.com`.
- AWS PostgreSQL persistence now uses Terraform-managed RDS. The local and GHCR overlays still keep the in-cluster PostgreSQL path for local testing.
- Backend and frontend deploy to AWS from GHCR images through the `k8s/overlays/aws` Kustomize overlay.
- The AWS overlay deletes the base PostgreSQL StatefulSet and patches backend datasource config to the RDS endpoint.
- AWS deployments use immutable Git SHA image tags rendered by `scripts/deploy_aws_release.sh`; local GHCR testing can still use `k8s/overlays/ghcr` and `latest`.
- Terraform creates the AWS Load Balancer Controller IAM policy and IRSA role.
- Terraform exports the controller role ARN, VPC ID, and public subnet IDs needed during controller and ALB setup.
- Local and GHCR overlays keep NodePort services for kind/browser testing, but the shared base and AWS overlay are ClusterIP-only. EKS browser traffic flows through one ALB origin.
- The dashboard loads in a browser and fetches backend data with relative `/api` calls when the frontend is built with an empty `VITE_API_BASE_URL`.
- The manual `Deploy AWS` GitHub Actions workflow validates a Git SHA, verifies GHCR images, assumes the Terraform-created OIDC role, deploys the selected release, and runs the HTTPS smoke test.

---

## Terraform Layout

```text
terraform/
├── bootstrap/remote-state/
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── environments/
│   └── dev/
│       ├── backend.tf
│       ├── github-actions-deploy.tf
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── terraform.tfvars
└── modules/
    ├── vpc/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── eks/
    │   ├── main.tf
    │   ├── variables.tf
    │   ├── outputs.tf
    │   └── aws-load-balancer-controller-policy.json
    └── rds/
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

Important dev values:

```hcl
aws_region         = "us-east-1"
project_name       = "minirtos"
availability_zones = ["us-east-1a", "us-east-1b"]
kubernetes_version = "1.34"
```

Important EKS values:

```text
Cluster name: minirtos-eks
Kubernetes version: 1.34
Worker nodes: 2x t3.small
StorageClass: gp3
EBS CSI provisioner: ebs.csi.aws.com
```

Terraform creates:

- VPC, Internet Gateway, public subnets, and route table.
- EKS cluster IAM role.
- EKS managed node group IAM role.
- EKS cluster and managed node group.
- EKS OIDC provider.
- EBS CSI IAM role and policy attachment.
- `aws-ebs-csi-driver` EKS addon.
- AWS Load Balancer Controller IAM policy and IRSA role for `system:serviceaccount:kube-system:aws-load-balancer-controller`.
- RDS PostgreSQL instance, subnet group, security group, and Secrets Manager managed master password.
- GitHub Actions OIDC provider, deploy role, and EKS access entry for manual deployments.
- S3 remote-state bucket and DynamoDB lock table from the bootstrap stack.

---

## Prerequisites

Install and configure:

```text
AWS CLI v2
Terraform 1.6+
kubectl
Docker
GHCR login for image pushes
```

Configure AWS credentials:

```bash
aws configure
aws sts get-caller-identity
```

GHCR push requires a GitHub token with package permissions:

```bash
docker logout ghcr.io
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u amanahmed2002 --password-stdin
```

Token scopes:

```text
write:packages
read:packages
repo
```

---

## Provision AWS Infrastructure

Bootstrap remote state once before using the dev backend if the state bucket/table do not exist yet:

```bash
cd terraform/bootstrap/remote-state
terraform init
terraform apply
```

From the repo root:

```bash
cd terraform/environments/dev
terraform init
terraform validate
terraform plan
terraform apply
```

Connect `kubectl` to EKS:

```bash
aws eks update-kubeconfig --region us-east-1 --name minirtos-eks
kubectl get nodes -o wide
```

---

## Configure AWS Storage

Apply the AWS-specific StorageClass:

```bash
kubectl apply -f k8s/aws/storageclass-gp3.yml
```

The manifest is:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
parameters:
  type: gp3
```

`WaitForFirstConsumer` matters because EBS volumes are Availability Zone-specific and must be created in the same AZ as the consuming pod.

---

## Deploy the Application

Deploy the AWS release overlay with an immutable Git SHA image tag after CI has published the matching GHCR images:

```bash
RELEASE_SHA="$(git rev-parse HEAD)"
./scripts/deploy_aws_release.sh "$RELEASE_SHA"
```

The script reads Terraform RDS outputs unless RDS environment variables are provided, fetches the RDS password from AWS Secrets Manager, syncs `minirtos-postgres-secret`, renders the AWS overlay with the selected SHA and RDS endpoint, applies the manifest, restarts the backend, and waits for rollouts.

Check status:

```bash
kubectl get pods -n minirtos
kubectl get svc -n minirtos
kubectl get ingress -n minirtos
kubectl get nodes -o wide
```

Expected pods:

```text
minirtos-backend-...       1/1 Running
minirtos-frontend-...      1/1 Running
```

Expected AWS services:

```text
minirtos-backend             ClusterIP   8081
minirtos-frontend            ClusterIP   80
```

NodePort services should appear only in the local and GHCR overlays, not in AWS.

---

## ALB Access

Phase 36 now prepares the EKS cluster for AWS Load Balancer Controller and ALB Ingress. Terraform creates the controller IAM policy and IRSA role; use the exported role ARN when installing the controller service account:

```bash
cd terraform/environments/dev
terraform output aws_load_balancer_controller_role_arn
terraform output vpc_id
terraform output public_subnet_ids
```

After the AWS Load Balancer Controller is installed and the application ingress is applied, Phase 39 uses the custom domain as the public app URL:

```text
Frontend: https://app.minirtos.biz/
Backend:  https://app.minirtos.biz/api/health
HTTP:     http://app.minirtos.biz redirects to HTTPS
```

The GoDaddy DNS zone points the `app` CNAME to the ALB hostname. AWS ACM provides the TLS certificate for `app.minirtos.biz` in `us-east-1`.

The frontend and backend share the same browser origin through the ALB, so normal dashboard API calls do not require an EKS worker-node frontend origin in backend CORS.

The local kind workflow still uses NodePort services:

```text
Frontend: http://localhost:30080
Backend:  http://localhost:30081
```

---

## Verify the Deployment

Backend health through the ALB `/api` path:

```bash
curl https://app.minirtos.biz/api/health
```

Expected:

```json
{"status":"UP","groups":["liveness","readiness"]}
```

Scenarios API:

```bash
curl https://app.minirtos.biz/api/scenarios
```

Frontend health:

```bash
curl https://app.minirtos.biz/health
```

Smoke test:

```bash
./scripts/k8s_smoke_test.sh "https://app.minirtos.biz"
```

The smoke test accepts one app URL, follows redirects, and checks frontend root, backend `/api/health`, and `/api/runs` through the same HTTPS custom-domain origin. Browser testing is still required because a lightweight smoke test does not prove the full scenario/run/analysis workflow.

---

## CORS and Frontend API URL

For ALB deployments, frontend and backend traffic share one origin. Build the frontend with an empty API base URL so `frontend/src/api/minirtosApi.ts` sends requests to relative `/api` paths:

```bash
docker build -f docker/Dockerfile.frontend \
  --build-arg VITE_API_BASE_URL= \
  -t ghcr.io/amanahmed2002/minirtos-linux/frontend:<git-sha> .
```

Local split-origin workflows still require backend CORS entries for the browser frontend origins:

```text
http://localhost:5173
http://127.0.0.1:5173
http://localhost:3000
http://127.0.0.1:3000
http://localhost:30080
http://127.0.0.1:30080
```

If the deployed EKS frontend is still calling `localhost:30081` or a worker-node IP, rebuild and push it with `VITE_API_BASE_URL=` for ALB routing, then redeploy with the matching Git SHA tag.

---

## Release Images

GitHub Actions publishes backend and frontend images as both `latest` and `<github.sha>`. AWS should consume the immutable SHA tag, not `latest`:

```bash
RELEASE_SHA="$(git rev-parse HEAD)"
./scripts/deploy_aws_release.sh "$RELEASE_SHA"
```

The `latest` tag remains useful for local GHCR overlay testing, but it should not be the AWS release contract.

If the old frontend pod keeps serving stale assets, force pod replacement:

```bash
kubectl delete pod -n minirtos -l app=minirtos-frontend
```

---

## Troubleshooting Notes

PVCs stuck `Pending` usually means the StorageClass or EBS CSI driver is missing or unhealthy. Verify:

```bash
kubectl get storageclass
kubectl get pvc -n minirtos
aws eks list-addons --region us-east-1 --cluster-name minirtos-eks
aws eks describe-addon --region us-east-1 --cluster-name minirtos-eks --addon-name aws-ebs-csi-driver
kubectl get pods -n kube-system
```

EBS CSI addon `DEGRADED` with `InsufficientNumberOfReplicas` can be caused by undersized nodes or missing IRSA. Phase 36 fixed this with OIDC, a dedicated EBS CSI IAM role, `AmazonEBSCSIDriverPolicy`, and `t3.small` nodes.

PostgreSQL can fail on EBS with:

```text
initdb: error: directory "/var/lib/postgresql/data" exists but is not empty
It contains a lost+found directory
```

Use a subdirectory for `PGDATA`:

```yaml
- name: PGDATA
  value: /var/lib/postgresql/data/pgdata
```

Backend `CrashLoopBackOff` with Flyway connection errors usually means Postgres is not ready. Fix Postgres first, then restart the backend:

```bash
kubectl rollout restart deployment/minirtos-backend -n minirtos
kubectl rollout status deployment/minirtos-backend -n minirtos
```

Browser timeouts to the ALB usually mean the AWS Load Balancer Controller has not reconciled the Ingress, the ALB security group/listener is not ready, or the target groups are unhealthy.

Dashboard `Failed to fetch` usually means the frontend bundle was built with the wrong `VITE_API_BASE_URL`, the `/api` ALB rule is missing, or the backend target group is unhealthy. Check the browser network tab for the actual URL being called.

---

## Repository Hygiene

Do not commit local AWS installers or Terraform state.

Already ignored patterns include:

```gitignore
**/.terraform/
*.tfstate
*.tfstate.backup
*.tfstate.lock.info
.terraform.lock.hcl
terraform/environments/*/terraform.tfvars
awscliv2.zip
aws/
```

Verify sensitive/generated files are not tracked:

```bash
git ls-files | grep -E "terraform.tfstate|terraform.tfvars|\.terraform|awscliv2.zip"
```

If an AWS CLI installer was accidentally committed:

```bash
git rm awscliv2.zip
git add .gitignore
git commit -m "Remove local AWS CLI installer from repository"
git push
```

---

## Teardown

Delete app resources first:

```bash
kubectl delete namespace minirtos
```

Destroy AWS infrastructure:

```bash
cd terraform/environments/dev
terraform destroy
```

---

## Current Limitations

Phase 39 is still intentionally not production-grade:

- Frontend API URL is still baked into the build, but ALB deployments use an empty value for relative `/api` calls.
- Backend CORS still includes concrete local frontend origins for split-origin dev and kind workflows.
- PostgreSQL runs in-cluster instead of RDS.
- Terraform state is local.
- HTTPS and `app.minirtos.biz` are configured, but DNS and ACM certificate management are still manual.
- AWS image deployment now uses immutable Git SHA tags, but there is not yet an automated GitHub Actions deployment workflow.

---

## Phase 40 Direction

Phase 40 should harden deployment operations:

```text
Manual GitHub Actions deployment with workflow_dispatch
AWS OIDC without static AWS keys
Remote Terraform state with S3 and DynamoDB locking
Cost guardrails and safe apply/destroy documentation
```

ACM and GoDaddy DNS are currently manual. A future phase can decide whether to keep them manual or manage them with Terraform/ExternalDNS.
