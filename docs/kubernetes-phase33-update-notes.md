# Phase 33 Local Kubernetes Deployment Update Notes

**Updated:** June 10, 2026  
**Project:** MiniRTOS Playground  
**Phase:** Phase 33 — Local Kubernetes Deployment

---

## Current Status

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed the Run Orchestration API. Phase 27 completed PostgreSQL/Flyway run persistence. Phase 28 added the React dashboard MVP. Phase 29 added educational modules and visualizers. Phase 30 hardened Docker Compose workflows. Phase 31 added frontend automated tests. Phase 32 added Amplitude event tracking. Phase 33 adds local Kubernetes manifests for the full stack.

Phase 33 introduces:

```text
k8s/00-namespace.yml
k8s/01-postgres-secret.yml
k8s/02-backend-configmap.yml
k8s/03-postgres-statefulset.yml
k8s/04-backend-deployment.yml
k8s/05-frontend-deployment.yml
k8s/kind/kind-config.yml
```

---

## 1. What Changed

Before Phase 33:

```text
Docker Compose was the only documented local deployment workflow.
Kubernetes was referenced as future work.
Backend CORS covered localhost:5173 and localhost:3000.
There was no committed local cluster config.
```

After Phase 33:

```text
A minirtos namespace manifest exists.
PostgreSQL runs as a StatefulSet with a PVC and ClusterIP Service.
Backend runs as a Deployment with ClusterIP and NodePort Services.
Frontend runs as a Deployment with ClusterIP and NodePort Services.
Backend configuration is split between a ConfigMap and Secret references.
kind port mappings expose frontend on localhost:30080 and backend on localhost:30081.
Backend CORS also allows localhost:30080.
```

---

## 2. Manifest Layout

```text
k8s/
  00-namespace.yml
  01-postgres-secret.yml
  02-backend-configmap.yml
  03-postgres-statefulset.yml
  04-backend-deployment.yml
  05-frontend-deployment.yml
  kind/kind-config.yml
```

Resource summary:

```text
Namespace: minirtos
Secret: minirtos-postgres-secret
ConfigMap: minirtos-backend-config
StatefulSet: minirtos-postgres
Deployment: minirtos-backend
Deployment: minirtos-frontend
PVC: minirtos-postgres-data
PVC: minirtos-backend-runs
ClusterIP Services: postgres, backend, frontend
NodePort Services: backend-nodeport, frontend-nodeport
```

---

## 3. Ports and URLs

Docker URLs still used elsewhere in the repo:

```text
Backend:  http://localhost:8081
Frontend: http://localhost:3000
Dev UI:   http://localhost:5173
```

Kubernetes URLs introduced in Phase 33:

```text
Frontend NodePort: http://localhost:30080
Backend NodePort:  http://localhost:30081
```

Important:

```text
The browser frontend and backend now run on different origins in Kubernetes.
Backend CORS must allow the frontend NodePort origin.
```

---

## 4. Backend Kubernetes Configuration

`k8s/02-backend-configmap.yml` defines:

```text
SPRING_DATASOURCE_URL=jdbc:postgresql://minirtos-postgres:5432/minirtos_playground
MINIRTOS_PROJECT_ROOT=/app
MINIRTOS_RUNTIME_BINARY=cpp-runtime/build/minirtos_runtime
MINIRTOS_PYTHON_COMMAND=python3
MINIRTOS_ANALYZER_SCRIPT=ai-analyzer/app/analyze.py
MINIRTOS_LOGS_DIR=logs
MINIRTOS_RUNS_DIR=runs
MINIRTOS_WINDOW_MS=5000
MINIRTOS_PROCESS_TIMEOUT_SECONDS=120
```

`k8s/04-backend-deployment.yml` adds:

```text
ClusterIP Service on port 8081
NodePort Service on port 30081
readinessProbe -> /actuator/health/readiness
livenessProbe  -> /actuator/health/liveness
PVC mount at /app/runs
emptyDir mount at /app/logs
```

The backend image referenced by the manifest is:

```text
ghcr.io/amanahmed2002/minirtos-linux/backend:latest
```

The CI workflow also publishes a commit-SHA tag for the same image namespace.

---

## 5. Frontend Kubernetes Configuration

`k8s/05-frontend-deployment.yml` adds:

```text
ClusterIP Service on port 80
NodePort Service on port 30080
readinessProbe -> /health
livenessProbe  -> /health
image: ghcr.io/amanahmed2002/minirtos-linux/frontend:latest
```

Important image-build constraint:

```text
The frontend manifest does not inject VITE_API_BASE_URL at runtime.
Vite bakes the API base URL into the production bundle at build time.
```

For the local kind workflow, build the frontend image with:

```text
VITE_API_BASE_URL=http://localhost:30081
```

If you use another cluster exposure method, rebuild with the matching backend URL.

---

## 6. Local kind Workflow

Create cluster:

```bash
kind create cluster --config k8s/kind/kind-config.yml
```

Apply manifests:

```bash
kubectl apply -f k8s/00-namespace.yml
kubectl apply -f k8s/01-postgres-secret.yml
kubectl apply -f k8s/02-backend-configmap.yml
kubectl apply -f k8s/03-postgres-statefulset.yml
kubectl apply -f k8s/04-backend-deployment.yml
kubectl apply -f k8s/05-frontend-deployment.yml
```

Verify:

```bash
kubectl get all -n minirtos
curl -i http://localhost:30081/actuator/health
curl -i http://localhost:30080/health
```

Published image source:

```text
Backend:  ghcr.io/amanahmed2002/minirtos-linux/backend:latest
Frontend: ghcr.io/amanahmed2002/minirtos-linux/frontend:latest
```

Local override note:

```text
The manifests now use imagePullPolicy: Always.
If you need to test unpublished local images in kind, either change the manifests to local tags or temporarily switch the pull policy and image names before applying them.
```

---

## 7. CORS Update

Backend CORS now includes:

```text
http://localhost:5173
http://127.0.0.1:5173
http://localhost:3000
http://127.0.0.1:3000
http://localhost:30080
http://127.0.0.1:30080
```

This keeps all currently documented frontend entrypoints working:

```text
Vite dev on 5173
Docker Nginx on 3000
Kubernetes frontend NodePort on 30080
```

---

## 8. Current Limitations

Phase 33 adds committed local manifests, but this repo state still assumes:

```text
Frontend API base URL is decided at image build time.
The documented path targets kind-style local development, not production ingress.
No HorizontalPodAutoscaler, Ingress, or TLS configuration is present yet.
```

---

## 9. Relevant Files

```text
k8s/00-namespace.yml
k8s/01-postgres-secret.yml
k8s/02-backend-configmap.yml
k8s/03-postgres-statefulset.yml
k8s/04-backend-deployment.yml
k8s/05-frontend-deployment.yml
k8s/kind/kind-config.yml
backend/src/main/java/com/minirtos/playground/config/CorsConfig.java
backend/src/main/resources/application.yml
docker/Dockerfile.backend
docker/Dockerfile.frontend
```

---

## 10. Next Phase

```text
Phase 34 — TBD
```

Natural follow-up areas:

```text
Ingress or gateway configuration
Helm or Kustomize overlays
Environment-specific frontend API URLs
Cloud infrastructure automation
```
