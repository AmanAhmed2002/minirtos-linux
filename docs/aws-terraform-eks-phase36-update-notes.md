# Phase 36 AWS EKS and Terraform Update Notes

**Updated:** June 11, 2026
**Project:** MiniRTOS Playground
**Phase:** Phase 36 — AWS EKS Deployment with Terraform

---

## What Changed

Phase 36 moved MiniRTOS Playground from local Kubernetes to an AWS EKS learning deployment managed by Terraform.

Completed outcomes:

- Terraform provisions the AWS networking and EKS infrastructure.
- EKS runs in `us-east-1` as cluster `minirtos-eks`.
- The dev node group uses two `t3.small` worker nodes.
- The EBS CSI driver is installed as an EKS addon.
- Terraform creates the EKS OIDC provider and an IRSA IAM role for `system:serviceaccount:kube-system:ebs-csi-controller-sa`.
- Kubernetes uses a default `gp3` StorageClass backed by `ebs.csi.aws.com`.
- PostgreSQL runs in-cluster with EBS-backed persistence.
- Backend and frontend deploy from GHCR images through the `k8s/overlays/ghcr` Kustomize overlay.
- Frontend and backend are exposed with NodePort services for this phase.
- The dashboard loads in a browser and fetches backend data after rebuilding the frontend with the AWS backend URL.

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
        └── outputs.tf
```

Important dev values:

```hcl
aws_region         = "us-east-1"
project_name       = "minirtos"
availability_zones = ["us-east-1a", "us-east-1b"]
```

Important EKS values:

```text
Cluster name: minirtos-eks
Kubernetes version: 1.30
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

Deploy the GHCR overlay:

```bash
kubectl apply -k k8s/overlays/ghcr
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

Expected services:

```text
minirtos-postgres            ClusterIP   5432
minirtos-backend             ClusterIP   8081
minirtos-backend-nodeport    NodePort    8081:30081
minirtos-frontend            ClusterIP   80
minirtos-frontend-nodeport   NodePort    80:30080
```

---

## NodePort Access

Phase 36 uses public worker node IPs and NodePort services:

```text
Frontend: http://<worker-node-public-ip>:30080
Backend:  http://<worker-node-public-ip>:30081
```

During Phase 36 testing the working node IP was:

```text
44.204.251.13
```

That IP is not stable. Re-check node IPs after recreating infrastructure:

```bash
kubectl get nodes -o wide
```

AWS EC2 worker node security groups must allow inbound access from your public IP:

```text
TCP 30080 from <your-public-ip>/32
TCP 30081 from <your-public-ip>/32
```

`/32` means exactly one public IP address.

---

## Verify the Deployment

Backend health:

```bash
curl http://<worker-node-public-ip>:30081/actuator/health
```

Expected:

```json
{"status":"UP","groups":["liveness","readiness"]}
```

Scenarios API:

```bash
curl http://<worker-node-public-ip>:30081/api/scenarios
```

Frontend health:

```bash
curl http://<worker-node-public-ip>:30080/health
```

Smoke test:

```bash
./scripts/k8s_smoke_test.sh \
  "http://<worker-node-public-ip>:30081" \
  "http://<worker-node-public-ip>:30080"
```

The smoke test checks backend health, readiness, liveness, `/api/health`, `/api/scenarios`, frontend `/health`, CORS preflight, and `/api/runs`. Browser testing is still required because `/health` does not prove that the React dashboard bundle is calling the correct backend URL.

---

## CORS and Frontend API URL

The backend CORS config must allow the frontend origin used by the browser. For NodePort EKS testing, this means:

```text
http://<worker-node-public-ip>:30080
```

CORS preflight test:

```bash
curl -i -X OPTIONS "http://<worker-node-public-ip>:30081/api/scenarios" \
  -H "Origin: http://<worker-node-public-ip>:30080" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: content-type"
```

Expected successful headers include:

```text
HTTP/1.1 200
Access-Control-Allow-Origin: http://<worker-node-public-ip>:30080
Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
Access-Control-Allow-Headers: content-type
```

The frontend is a Vite static bundle. `VITE_API_BASE_URL` is baked into the JavaScript at build time. If the deployed frontend is still calling `localhost:30081`, rebuild and push it with the AWS backend URL.

---

## Rebuild and Push Images

Backend:

```bash
docker build -f docker/Dockerfile.backend \
  -t ghcr.io/amanahmed2002/minirtos-linux/backend:latest .
docker push ghcr.io/amanahmed2002/minirtos-linux/backend:latest
kubectl rollout restart deployment/minirtos-backend -n minirtos
kubectl rollout status deployment/minirtos-backend -n minirtos
```

Frontend:

```bash
docker build -f docker/Dockerfile.frontend \
  --build-arg VITE_API_BASE_URL=http://<worker-node-public-ip>:30081 \
  -t ghcr.io/amanahmed2002/minirtos-linux/frontend:latest .
docker push ghcr.io/amanahmed2002/minirtos-linux/frontend:latest
kubectl rollout restart deployment/minirtos-frontend -n minirtos
kubectl rollout status deployment/minirtos-frontend -n minirtos
```

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
aws eks describe-addon --cluster-name minirtos-eks --addon-name aws-ebs-csi-driver
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

Browser timeouts on `30080` or `30081` usually mean the EC2 worker node security group does not allow those NodePort ports from your public IP.

Dashboard `Failed to fetch` can be either CORS or a frontend bundle built with the wrong `VITE_API_BASE_URL`. Check the browser network tab for the actual URL being called.

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

Phase 36 is intentionally not production-grade:

- Uses NodePort and public EC2 worker node IPs.
- Frontend API URL is hardcoded into the build.
- Backend CORS includes concrete frontend origins.
- Worker node public IPs can change when infrastructure is recreated.
- NodePort security group rules were edited manually during testing.
- PostgreSQL runs in-cluster instead of RDS.
- Terraform state is local.
- No HTTPS, DNS, ALB, or Ingress.
- Images still use `latest` instead of immutable version tags.

---

## Phase 37 Direction

Phase 37 should replace NodePort access with AWS Load Balancer Controller and ALB Ingress.

Recommended target:

```text
http://<alb-dns-name>/
http://<alb-dns-name>/api/scenarios
http://<alb-dns-name>/api/runs
```

That would allow the frontend and backend to share one browser origin, reducing CORS issues and removing hardcoded public worker node IPs from the frontend build.
