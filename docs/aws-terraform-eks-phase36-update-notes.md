# Phase 36 AWS EKS and Terraform Update Notes

**Updated:** June 17, 2026
**Project:** MiniRTOS Playground
**Phase:** Phase 36 with Phase 37/38 AWS deployment hardening notes

---

## What Changed

Phase 36 moved MiniRTOS Playground from local Kubernetes to an AWS EKS learning deployment managed by Terraform. Phase 37 added ALB single-origin routing. Phase 38 updated the EKS target version, removed NodePorts from the shared base, and switched AWS deployment to immutable Git SHA image tags.

Completed outcomes:

- Terraform provisions the AWS networking and EKS infrastructure.
- EKS runs in `us-east-1` as cluster `minirtos-eks`.
- The dev node group uses two `t3.small` worker nodes.
- The EBS CSI driver is installed as an EKS addon.
- Terraform creates the EKS OIDC provider and an IRSA IAM role for `system:serviceaccount:kube-system:ebs-csi-controller-sa`.
- Kubernetes uses a default `gp3` StorageClass backed by `ebs.csi.aws.com`.
- PostgreSQL runs in-cluster with EBS-backed persistence.
- Backend and frontend deploy to AWS from GHCR images through the `k8s/overlays/aws` Kustomize overlay.
- AWS deployments use immutable Git SHA image tags rendered by `scripts/deploy_aws_release.sh`; local GHCR testing can still use `k8s/overlays/ghcr` and `latest`.
- Terraform creates the AWS Load Balancer Controller IAM policy and IRSA role.
- Terraform exports the controller role ARN, VPC ID, and public subnet IDs needed during controller and ALB setup.
- Local and GHCR overlays keep NodePort services for kind/browser testing, but the shared base and AWS overlay are ClusterIP-only. EKS browser traffic flows through one ALB origin.
- The dashboard loads in a browser and fetches backend data with relative `/api` calls when the frontend is built with an empty `VITE_API_BASE_URL`.

---

## Terraform Layout

```text
terraform/
├── environments/
│   └── dev/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── terraform.tfvars
└── modules/
    ├── vpc/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    └── eks/
        ├── main.tf
        ├── variables.tf
        ├── outputs.tf
        └── aws-load-balancer-controller-policy.json
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

Check status:

```bash
kubectl get pods -n minirtos
kubectl get svc -n minirtos
kubectl get pvc -n minirtos
kubectl get nodes -o wide
```

Expected pods:

```text
minirtos-postgres-0        1/1 Running
minirtos-backend-...       1/1 Running
minirtos-frontend-...      1/1 Running
```

Expected AWS services:

```text
minirtos-postgres            ClusterIP   5432
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

After the AWS Load Balancer Controller is installed and the application ingress is applied, use the ALB DNS name as the public app URL:

```text
Frontend: http://<alb-dns-name>/
Backend:  http://<alb-dns-name>/api/health
```

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
curl http://<alb-dns-name>/api/health
```

Expected:

```json
{"status":"UP","groups":["liveness","readiness"]}
```

Scenarios API:

```bash
curl http://<alb-dns-name>/api/scenarios
```

Frontend health:

```bash
curl http://<alb-dns-name>/health
```

Smoke test:

```bash
./scripts/k8s_smoke_test.sh "http://<alb-dns-name>"
```

The smoke test now accepts one app URL, auto-adds `http://` when needed, follows redirects, and checks frontend root, backend `/api/health`, and `/api/runs` through the same ALB origin. Browser testing is still required because a lightweight smoke test does not prove the full scenario/run/analysis workflow.

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

Phase 38 is still intentionally not production-grade:

- ALB is currently HTTP-only.
- Frontend API URL is still baked into the build, but ALB deployments use an empty value for relative `/api` calls.
- Backend CORS still includes concrete local frontend origins for split-origin dev and kind workflows.
- PostgreSQL runs in-cluster instead of RDS.
- Terraform state is local.
- No HTTPS or DNS yet.
- AWS image deployment now uses immutable Git SHA tags, but there is not yet an automated GitHub Actions deployment workflow.

---

## Phase 39 Direction

Phase 39 should harden the ALB deployment for production-style access:

```text
https://<dns-name>/
https://<dns-name>/api/scenarios
https://<dns-name>/api/runs
```

Recommended next work includes ACM-managed TLS, Route 53 DNS or another custom domain flow, remote Terraform state, AWS Load Balancer Controller automation, and a deployment workflow that can promote a selected Git SHA without running local commands.
