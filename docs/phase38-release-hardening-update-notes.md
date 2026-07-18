# Phase 38 Release Hardening and EKS Version Update Notes

**Updated:** June 26, 2026
**Project:** MiniRTOS Playground
**Phase:** Phase 38 — Production Deployment Hardening, Release Versioning, and EKS Version Upgrade

---

## Summary

Phase 38 hardened the AWS deployment path after the Phase 37 ALB migration. The application still runs through one ALB origin, but the Kubernetes and release workflow are now cleaner:

- New EKS clusters target Kubernetes `1.34` instead of `1.30`.
- The shared Kubernetes base contains only portable ClusterIP services.
- Local and GHCR testing overlays own NodePort services for `localhost:30080` and `localhost:30081`.
- The AWS overlay uses ClusterIP services, the `gp3` StorageClass, and ALB Ingress only.
- AWS image deployment no longer relies on `latest`; it uses Git SHA image tags.
- `scripts/deploy_aws_release.sh` renders `aws-release-placeholder` to a chosen image tag before applying the AWS overlay.
- CI validates local, GHCR, and AWS Kustomize overlays with kubectl `v1.34.0`.
- The smoke test is intentionally lightweight and checks only frontend root, `/api/health`, and `/api/runs`.

---

## Terraform Versioning

The dev environment and EKS module expose `kubernetes_version`, defaulting to:

```hcl
kubernetes_version = "1.34"
```

The module passes that value to both:

```hcl
aws_eks_cluster.main.version
aws_eks_node_group.main.version
```

For the dev environment, keep `terraform/environments/dev/terraform.tfvars` aligned with:

```hcl
aws_region         = "us-east-1"
project_name       = "minirtos"
availability_zones = ["us-east-1a", "us-east-1b"]
kubernetes_version = "1.34"
```

Validate with:

```bash
terraform fmt -recursive
cd terraform/environments/dev
terraform init -backend=false
terraform validate
cd ../../..
```

After recreating the cluster, confirm the version:

```bash
aws eks describe-cluster \
  --region us-east-1 \
  --name minirtos-eks \
  --query 'cluster.version' \
  --output text
```

Expected:

```text
1.34
```

---

## Kustomize Overlay Ownership

The base manifests are environment-neutral and should not expose NodePorts.

```text
k8s/base/
  ClusterIP services only
  no NodePort services
```

Local workstation testing keeps NodePorts in the local overlay:

```text
k8s/overlays/local/nodeports.yml
  minirtos-backend-nodeport: 30081
  minirtos-frontend-nodeport: 30080
```

GHCR-image local testing keeps its own copy because Kustomize does not allow an overlay to reference a raw YAML file from a sibling overlay:

```text
k8s/overlays/ghcr/nodeports.yml
  minirtos-backend-nodeport: 30081
  minirtos-frontend-nodeport: 30080
```

AWS stays private behind the ALB:

```text
k8s/overlays/aws/
  storageclass-gp3.yml
  minirtos-ingress.yml
  ClusterIP services only
  no NodePort services
```

Validate overlays:

```bash
kubectl kustomize k8s/overlays/local
kubectl kustomize k8s/overlays/ghcr
kubectl kustomize k8s/overlays/aws
```

Check exposure behavior:

```bash
kubectl kustomize k8s/overlays/aws | grep -n "NodePort" || true
kubectl kustomize k8s/overlays/local | grep -n "NodePort"
kubectl kustomize k8s/overlays/ghcr | grep -n "NodePort"
```

Expected:

```text
AWS: no NodePort output
local: NodePort services appear
ghcr: NodePort services appear
```

---

## Immutable AWS Release Deployment

CI publishes both `latest` and `<github.sha>` image tags to GHCR:

```text
ghcr.io/amanahmed2002/minirtos-linux/backend:<git-sha>
ghcr.io/amanahmed2002/minirtos-linux/frontend:<git-sha>
```

The AWS overlay intentionally uses a placeholder:

```yaml
images:
  - name: minirtos-backend-placeholder
    newName: ghcr.io/amanahmed2002/minirtos-linux/backend
    newTag: aws-release-placeholder
  - name: minirtos-frontend-placeholder
    newName: ghcr.io/amanahmed2002/minirtos-linux/frontend
    newTag: aws-release-placeholder
```

Deploy a release after the matching CI image build has completed:

```bash
RELEASE_SHA="$(git rev-parse HEAD)"
./scripts/deploy_aws_release.sh "$RELEASE_SHA"
```

The script copies `k8s/` to a temporary directory, replaces `aws-release-placeholder` with the requested image tag, renders `k8s/overlays/aws`, and applies the generated manifest.

---

## ALB Verification

Get the ALB URL:

```bash
ALB_URL="http://$(kubectl get ingress minirtos-ingress -n minirtos -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
echo "$ALB_URL"
```

Run the lightweight smoke check:

```bash
./scripts/k8s_smoke_test.sh "$ALB_URL"
```

The smoke test follows redirects, accepts an ALB hostname with or without `http://`, and checks:

```text
/
/api/health
/api/runs
```

It is not a full integration test. Final deployment confidence still comes from the browser flow: the dashboard loads, scenarios run, run history updates, and analysis loads through the ALB origin.

---

## Add-on Validation

Do not assume every core EKS component is an EKS managed add-on. Terraform explicitly manages:

```text
aws-ebs-csi-driver
```

Commands such as `aws eks describe-addon --addon-name vpc-cni`, `coredns`, or `kube-proxy` can return not found if those components are present as self-managed Kubernetes components rather than managed EKS add-ons.

Better checks:

```bash
aws eks list-addons --region us-east-1 --cluster-name minirtos-eks
kubectl get pods -n kube-system
kubectl get storageclass
kubectl get pvc -n minirtos
```

Look for healthy cluster components such as `aws-node`, `coredns`, `kube-proxy`, `aws-load-balancer-controller`, and EBS CSI pods. If PVCs are bound and the application works, EBS provisioning is functioning.

---

## Remaining Production Gaps

Phase 38 closed the release-hardening gaps it targeted. Phase 39 later completed the HTTPS and custom-domain gap with `https://app.minirtos.biz`. Remaining gaps after Phase 40/41 are:

- AWS Load Balancer Controller installation is still a manual Helm step.
- Terraform state is remote in S3 with DynamoDB locking, but bootstrap and state migration remain operator-managed.
- AWS PostgreSQL now runs on RDS; local Docker and local Kubernetes still use the in-cluster/project PostgreSQL service.
- RDS password is managed by AWS Secrets Manager and synced into a Kubernetes Secret during deployment; External Secrets is not implemented.
- AWS deployment can be run through a manual GitHub Actions OIDC workflow, but it is not continuous GitOps.
- DNS and ACM certificate management are manual.
- Cost control still depends on manual teardown.

Recommended next phase:

```text
Phase 42 — Production operations polish, externalized secrets, and cost guardrails
```
