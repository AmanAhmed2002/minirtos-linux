# Phase 39 HTTPS Custom Domain Update Notes

**Updated:** June 17, 2026
**Project:** MiniRTOS Playground
**Phase:** Phase 39 — HTTPS, Custom Domain, and Production Deployment Polish

---

## Summary

Phase 39 added production-style HTTPS access to the AWS EKS deployment.

Current production URL:

```text
https://app.minirtos.biz
```

Completed outcomes:

- `minirtos.biz` was purchased through GoDaddy.
- DNS remains managed in GoDaddy.
- `app.minirtos.biz` is the production subdomain.
- GoDaddy has an `app` CNAME pointing to the AWS ALB hostname.
- AWS ACM issued a certificate for `app.minirtos.biz` in `us-east-1`.
- ACM DNS validation was completed through a GoDaddy CNAME record.
- The AWS ALB Ingress listens on HTTP 80 and HTTPS 443.
- HTTP redirects to HTTPS.
- `/` routes to the frontend service.
- `/api` routes to the backend service.
- The frontend uses relative `/api` calls because production images are built with `VITE_API_BASE_URL=`.
- `scripts/k8s_smoke_test.sh https://app.minirtos.biz` passes.
- Dashboard load, scenario execution, run history, and analysis loading were verified through HTTPS.

---

## DNS

GoDaddy DNS has two important records.

App CNAME:

```text
Type:  CNAME
Name:  app
Value: <aws-alb-hostname>
TTL:   Default
```

Do not include `http://`, `https://`, or a trailing slash in the CNAME value.

ACM validation CNAME:

```text
Type:  CNAME
Name:  <acm-generated-prefix>.app
Value: <acm-generated-value>.acm-validations.aws
TTL:   Default
```

When AWS shows a fully qualified name such as `_abc.app.minirtos.biz.`, GoDaddy usually expects only `_abc.app` because the managed DNS zone is already `minirtos.biz`.

---

## ACM Certificate

Certificate region:

```text
us-east-1
```

Certificate domain:

```text
app.minirtos.biz
```

Validation method:

```text
DNS validation through GoDaddy
```

Check certificate status:

```bash
aws acm describe-certificate \
  --region us-east-1 \
  --certificate-arn <certificate-arn> \
  --query 'Certificate.Status' \
  --output text
```

Expected:

```text
ISSUED
```

Do not publish the real ACM certificate ARN in public documentation. Use this placeholder in docs:

```text
arn:aws:acm:us-east-1:<aws-account-id>:certificate/<certificate-id>
```

---

## Ingress Behavior

The AWS overlay should keep ClusterIP services only and expose the app through ALB Ingress.

Expected Ingress behavior:

```text
https://app.minirtos.biz/      -> minirtos-frontend service
https://app.minirtos.biz/api   -> minirtos-backend service
http://app.minirtos.biz/       -> redirects to HTTPS
```

Expected ALB annotations include:

```yaml
alb.ingress.kubernetes.io/listen-ports: '[{"HTTP":80},{"HTTPS":443}]'
alb.ingress.kubernetes.io/certificate-arn: <certificate-arn>
alb.ingress.kubernetes.io/ssl-redirect: "443"
```

The Ingress rule should use:

```yaml
host: app.minirtos.biz
```

The AWS overlay still uses immutable release tags through `aws-release-placeholder`; deploy with:

```bash
RELEASE_SHA="$(git rev-parse HEAD)"
./scripts/deploy_aws_release.sh "$RELEASE_SHA"
```

Before deploying a SHA, confirm CI has published both images:

```text
ghcr.io/amanahmed2002/minirtos-linux/backend:<sha>
ghcr.io/amanahmed2002/minirtos-linux/frontend:<sha>
```

---

## Verification

DNS:

```bash
nslookup app.minirtos.biz
```

HTTPS and redirect checks:

```bash
curl -I http://app.minirtos.biz
curl -I https://app.minirtos.biz
curl -i https://app.minirtos.biz/api/health
curl -i https://app.minirtos.biz/api/runs
```

Smoke test:

```bash
./scripts/k8s_smoke_test.sh https://app.minirtos.biz
```

Kubernetes checks:

```bash
kubectl get pods -n minirtos
kubectl get svc -n minirtos
kubectl get ingress -n minirtos
kubectl describe ingress minirtos-ingress -n minirtos
kubectl get pvc -n minirtos
kubectl get pods -n kube-system
```

Kustomize checks:

```bash
kubectl kustomize k8s/overlays/aws
kubectl kustomize k8s/overlays/local
kubectl kustomize k8s/overlays/ghcr
kubectl kustomize k8s/overlays/aws | grep -n "certificate-arn"
kubectl kustomize k8s/overlays/aws | grep -n "ssl-redirect"
kubectl kustomize k8s/overlays/aws | grep -n "app.minirtos.biz"
kubectl kustomize k8s/overlays/aws | grep -n "NodePort" || true
```

Expected:

```text
AWS overlay renders successfully.
certificate-arn appears.
ssl-redirect appears.
app.minirtos.biz appears.
No NodePort output appears for the AWS overlay.
```

---

## Known Limitations

Acceptable limitations after Phase 39:

- AWS Load Balancer Controller is still installed manually with Helm.
- Terraform state is still local unless changed separately.
- Postgres still runs in-cluster instead of RDS.
- Secrets are Kubernetes Secrets, not AWS Secrets Manager or External Secrets.
- GitHub Actions does not deploy to AWS yet.
- No `workflow_dispatch` AWS deployment workflow exists yet.
- DNS is manually managed through GoDaddy.
- ACM certificate creation and validation are manual.
- Root domain `minirtos.biz` is not configured; only `app.minirtos.biz` is configured.
- No automatic cost guardrail or scheduled teardown exists.
- Smoke testing is lightweight and does not replace browser scenario/run/analysis verification.

---

## Cost Control

The EKS cluster, ALB, worker nodes, EBS volumes, and related AWS resources can continue to incur cost while running.

To destroy the learning environment when it is no longer needed:

```bash
cd terraform/environments/dev
terraform destroy
```

After destroy, the GoDaddy domain remains owned, but the `app` CNAME may point to an ALB that no longer exists.

---

## Phase 40 Direction

Recommended next phase:

```text
Phase 40 — Deployment Automation, Remote Terraform State, and Production Ops Polish
```

Recommended goals:

- Add a manual GitHub Actions AWS deployment workflow.
- Use GitHub Actions OIDC instead of static AWS keys.
- Add `workflow_dispatch` inputs for image SHA, environment, and explicit confirmation.
- Deploy the AWS Kustomize overlay from CI using `scripts/deploy_aws_release.sh`.
- Run the HTTPS smoke test from CI when appropriate.
- Add remote Terraform state with S3 and DynamoDB locking.
- Document safe Terraform apply/destroy and cost guardrails.
