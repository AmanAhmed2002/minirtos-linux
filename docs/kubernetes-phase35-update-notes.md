# Phase 35 Kubernetes Kustomize Overlays Update Notes

**Updated:** June 11, 2026
**Project:** MiniRTOS Playground
**Phase:** Phase 35 — Kubernetes Deployment Hardening with Kustomize

---

## What Changed

Before Phase 35, Kubernetes manifests in `k8s/` directly embedded image names. Switching between local kind images and GHCR images required manually editing backend and frontend deployment manifests.

Phase 35 moved the Kubernetes resources into a Kustomize base and environment-specific overlays:

```text
k8s/
├── base/
│   ├── 00-namespace.yml
│   ├── 01-postgres-secret.yml
│   ├── 02-backend-configmap.yml
│   ├── 03-postgres-statefulset.yml
│   ├── 04-backend-deployment.yml
│   ├── 05-frontend-deployment.yml
│   └── kustomization.yaml
├── overlays/
│   ├── local/
│   │   ├── kustomization.yaml
│   │   ├── patch-backend-image.yml
│   │   └── patch-frontend-image.yml
│   └── ghcr/
│       ├── kustomization.yaml
│       ├── patch-backend-image.yml
│       └── patch-frontend-image.yml
└── kind/kind-config.yml
```

---

## Local Overlay

Use the local overlay when testing images built on the workstation and loaded into kind.

Typical flow:

```bash
docker build -f docker/Dockerfile.backend -t minirtos-backend:local .
docker build -f docker/Dockerfile.frontend \
  --build-arg VITE_API_BASE_URL=http://localhost:30081 \
  -t minirtos-frontend:local .
kind load docker-image minirtos-backend:local
kind load docker-image minirtos-frontend:local
kubectl apply -k k8s/overlays/local
```

The local overlay should use `imagePullPolicy: IfNotPresent` so kind can run locally loaded images.

---

## GHCR Overlay

Use the GHCR overlay when deploying published images:

```bash
kubectl apply -k k8s/overlays/ghcr
```

Expected image names:

```text
ghcr.io/amanahmed2002/minirtos-linux/backend:latest
ghcr.io/amanahmed2002/minirtos-linux/frontend:latest
```

This is the overlay used by Phase 36 on AWS EKS.

---

## Validation Commands

Render manifests locally:

```bash
kubectl kustomize k8s/overlays/local
kubectl kustomize k8s/overlays/ghcr
```

Deploy and verify:

```bash
kubectl apply -k k8s/overlays/ghcr
kubectl get pods -n minirtos
kubectl get svc -n minirtos
```

---

## Related Phase 36 AWS EKS Notes

Phase 35 introduced the Kustomize overlay structure used by Phase 36. For AWS/EKS setup, Terraform commands, `gp3` StorageClass setup, GHCR deployment, NodePort verification, image rebuild commands, smoke tests, troubleshooting, and teardown, see:

```text
docs/aws-terraform-eks-phase36-update-notes.md
```
