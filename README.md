# MiniRTOS-Linux / MiniRTOS Playground

**Original Project:** Embedded Runtime Simulator with AI-Based Fault Detection
**Full-Stack Evolution:** MiniRTOS Playground — Full-Stack Embedded Systems Learning Platform
**Current Phase:** Phase 36 — AWS EKS Deployment with Terraform
**Updated:** June 11, 2026

MiniRTOS-Linux is a software-only C++20 embedded runtime simulator that models periodic tasks, bounded message queues, configurable fault injection, task-crash simulation, watchdog monitoring, structured JSONL telemetry, Python-based runtime analysis, AI-style anomaly detection, synthetic training-dataset generation, a trained lightweight ML anomaly classifier, automated tests, Dockerized demos, benchmark reporting, a Java/Spring Boot backend with persistent PostgreSQL run history, a React/TypeScript educational dashboard, local Kubernetes manifests, Kustomize overlays, Terraform AWS infrastructure, and an AWS EKS deployment path.

MiniRTOS Playground extends the project into a full-stack educational platform for students learning embedded systems, RTOS concepts, runtime telemetry, scheduling, queues, faults, watchdog behavior, Docker, Kubernetes, and ML-based anomaly detection.

---

## Current Status

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed the Run Orchestration API. Phase 27 completed PostgreSQL/Flyway run storage. Phase 28 added the React Dashboard MVP, frontend Docker integration, and local frontend/backend debugging notes. Phase 29 added educational modules and visualizers to the React dashboard. Phase 30 hardened Docker Compose and Dockerfiles for backend, dev frontend, and production frontend workflows. Phase 31 added frontend automated tests using Vitest, React Testing Library, and jsdom. Phase 32 added Amplitude event tracking to the React dashboard. Phase 33 added local Kubernetes manifests for PostgreSQL, backend, frontend, and a `kind` cluster entrypoint. Phase 35 added Kustomize overlays for local and GHCR image workflows. Phase 36 added Terraform-managed AWS infrastructure and verified the full application on EKS with EBS-backed PostgreSQL storage.

Current verified backend behavior:

- `GET /api/health` works.
- `GET /actuator/health` works for Docker healthchecks.
- `GET /api/scenarios` works.
- `POST /api/runs` runs trusted scenarios through the C++ runtime and Python analyzer.
- `GET /api/runs` returns persisted run summaries from PostgreSQL.
- `GET /api/runs/{runId}` returns one persisted run.
- `GET /api/runs/{runId}/analysis` returns persisted parsed analyzer data.
- `queue_overflow` returns `status=COMPLETED`, `runtimeHealth=WARNING`, and `errorMessage=null`.
- Run history survives backend restarts.
- Backend Docker image builds the C++ runtime inside the Docker build using CMake and Ninja.

Current frontend behavior:

- Vite + React + TypeScript dashboard under `frontend/`.
- Dev frontend runs on `http://localhost:5173`.
- Production frontend runs through Nginx on `http://localhost:3000`.
- Production frontend exposes `GET /health`.
- Scenario selector uses `GET /api/scenarios`.
- Run trigger uses `POST /api/runs`.
- Persisted history uses `GET /api/runs`.
- Analyzer panel uses `GET /api/runs/{runId}/analysis`.
- Guided Learning panel changes by selected scenario.
- Queue pressure visualizer, task runtime timeline, fault/health explanation panel, and root-cause teaching notes work.
- Backend CORS allows both dev and production local frontend origins.
- Amplitude event tracking fires `dashboard_loaded`, `scenario_run_triggered`, `scenario_run_completed`, and `run_history_selected` when `VITE_AMPLITUDE_API_KEY` is set. All tracking is a no-op when the key is absent.
- Local Kubernetes manifests exist under `k8s/` for namespace, secrets, config, PostgreSQL, backend, frontend, and `kind` port mapping.
- AWS EKS deployment works through Terraform-provisioned infrastructure in `us-east-1`.
- EKS uses two `t3.small` worker nodes, the EBS CSI addon, and a `gp3` StorageClass for dynamic EBS-backed PVCs.
- The GHCR Kustomize overlay deploys backend and frontend images to EKS.
- Phase 36 exposes backend and frontend through NodePort services on `30081` and `30080`.
- The EKS frontend bundle must be rebuilt with the public backend URL through `VITE_API_BASE_URL` because Vite embeds this value at build time.

Important local decisions:

- Backend uses Java 17.
- Backend runs on port `8081` because local Nginx uses `8080`.
- Frontend uses Node 22+ because current Vite tooling may fail on older Node 18 releases.
- Database persistence uses PostgreSQL, Spring Data JPA, and Flyway.
- The backend accepts only known scenario IDs and never accepts arbitrary config paths.
- Phase 29 visualizers are CSS-based and add no new chart dependency.
- Phase 30 production frontend uses Nginx, which listens on container port `80`.
- Phase 30 dev frontend uses Vite, which listens on container port `5173`.
- Phase 32 Amplitude tracking is fully disabled (no SDK calls) when `VITE_AMPLITUDE_API_KEY` is missing — safe for local dev and CI.
- Phase 32 does not include session replay; only structured event tracking is enabled.
- Local kind backend NodePort is `http://localhost:30081` and frontend NodePort is `http://localhost:30080` when using the provided `kind` config.
- Backend CORS allows the local kind frontend origins `http://localhost:30080` and `http://127.0.0.1:30080`.
- Phase 36 AWS NodePort access requires EC2 worker node security group inbound rules for `30080` and `30081`.
- Phase 36 is a learning deployment, not production-grade exposure. Phase 37 should replace NodePort/public worker node access with AWS Load Balancer Controller and ALB Ingress.

---

## Core Features

| Area | Feature |
|---|---|
| Runtime | C++20 CLI simulator |
| Config | JSON configs for tasks, scheduler, faults, watchdog |
| Scheduler | Round-robin, priority, earliest-deadline-first |
| Message Bus | Bounded FIFO queues and queue-full drops |
| Fault Injection | `slow_task`, `dropped_messages`, `cpu_spike`, `task_crash` |
| Watchdog | Repeated deadline miss detection and simulated recovery |
| Analyzer | Python JSONL health analyzer |
| AI-Style Detection | Time-windowed feature extraction and anomaly scoring |
| ML | Synthetic dataset generation and Random Forest classifier |
| Backend | Java Spring Boot API for health, scenarios, and runs |
| Persistence | PostgreSQL run history with Flyway migrations |
| Frontend | React/TypeScript educational dashboard |
| Learning UI | Scenario learning cards, queue visualizer, task timeline, health/fault explanations |
| Analytics | Amplitude event tracking for dashboard load, run trigger, run completion, and history selection |
| Testing | GoogleTest, CTest, pytest, Spring Boot tests, repository tests, Vitest + React Testing Library frontend component tests |
| Docker | Runtime, analyzer, ML, backend, PostgreSQL, dev frontend, and production frontend services |
| Kubernetes | Local and EKS namespace, Secret, ConfigMap, PostgreSQL StatefulSet, backend/frontend Deployments, Services, PVCs, Kustomize overlays, and `kind` port mappings |
| AWS/Terraform | VPC, public subnets, EKS cluster, managed node group, OIDC provider, EBS CSI IRSA role, EBS CSI addon, and `gp3` EBS-backed storage |

---

## Architecture

```text
Docker Compose / Local Kubernetes / AWS EKS
  ├── C++ Runtime Services
  │     -> logs/*.jsonl
  ├── Python Analyzer / ML Services
  │     -> reports/generated/*
  │     -> models/*
  ├── PostgreSQL
  │     -> persisted run metadata and parsed analysis summaries
  ├── Spring Boot Backend
  │     -> GET  /api/health
  │     -> GET  /actuator/health
  │     -> GET  /api/scenarios
  │     -> POST /api/runs
  │     -> GET  /api/runs
  │     -> GET  /api/runs/{runId}
  │     -> GET  /api/runs/{runId}/analysis
  ├── React/Vite Dev Frontend
  │     -> http://localhost:5173
  └── Nginx Production Frontend
        -> http://localhost:3000
        -> GET /health
        -> Kubernetes NodePort: http://localhost:30080

Kubernetes local manifests
  ├── Namespace: minirtos
  ├── PostgreSQL Service + StatefulSet + PVC
  ├── Backend ConfigMap + Deployment + ClusterIP + NodePort
  │     -> http://localhost:30081
  └── Frontend Deployment + ClusterIP + NodePort
        -> http://localhost:30080

AWS EKS Phase 36
  ├── Terraform VPC + EKS in us-east-1
  ├── 2x t3.small worker nodes
  ├── EBS CSI addon with IRSA/OIDC
  ├── gp3 StorageClass for PostgreSQL EBS persistence
  ├── GHCR Kustomize overlay
  ├── Backend NodePort: http://<worker-node-public-ip>:30081
  └── Frontend NodePort: http://<worker-node-public-ip>:30080
```

Future architecture:

```text
React/TypeScript Frontend
  -> Java Spring Boot API
  -> PostgreSQL
  -> C++ Runtime
  -> Python Analyzer + ML Predictor
  -> Docker, local Kubernetes, and AWS EKS deployment
  -> Terraform-managed cloud infrastructure
```

---

## Repository Structure

```text
minirtos-linux/
├── backend/
├── frontend/
├── cpp-runtime/
├── ai-analyzer/
├── configs/
├── scripts/
├── docker/
│   ├── Dockerfile.runtime
│   ├── Dockerfile.analyzer
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.frontend.conf
├── docs/
├── k8s/
│   ├── base/
│   ├── overlays/
│   │   ├── local/
│   │   └── ghcr/
│   ├── aws/storageclass-gp3.yml
│   └── kind/kind-config.yml
├── terraform/
│   ├── environments/dev/
│   └── modules/
│       ├── eks/
│       └── vpc/
├── logs/
├── models/
├── reports/generated/
├── runs/
├── docker-compose.yml
└── README.md
```

---

## Requirements

Runtime/analyzer:

```text
Linux or WSL
C++20 compiler
CMake
Ninja
Python 3.11+
pytest
scikit-learn
joblib
Docker
Docker Compose
kubectl
kind
Terraform 1.6+
AWS CLI v2
```

Backend/database:

```text
Java 17
Maven 3.9+
Spring Boot 3.3.5
PostgreSQL 16 via Docker Compose
Flyway
```

Frontend:

```text
Node.js 22+
npm
Vite
React
TypeScript
Nginx for production container serving
```

---

## Quick Start — Runtime

```bash
./scripts/build_cpp.sh
./scripts/run_normal.sh
./scripts/run_analyzer.sh logs/runtime_logs.jsonl
./scripts/run_tests.sh
docker compose up --build demo
```

---

## Quick Start — Backend with PostgreSQL

From repo root:

```bash
./scripts/build_cpp.sh
docker compose up -d postgres
cd backend
mvn clean test
mvn spring-boot:run
```

Backend URL:

```text
http://localhost:8081
```

Test:

```bash
curl http://localhost:8081/api/health
curl http://localhost:8081/actuator/health
curl http://localhost:8081/api/scenarios
```

Run a scenario:

```bash
curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"queue_overflow"}'
```

List persisted runs:

```bash
curl http://localhost:8081/api/runs
```

Inspect a run and its analysis:

```bash
curl http://localhost:8081/api/runs/<runId>
curl http://localhost:8081/api/runs/<runId>/analysis
```

---

## Quick Start — Full Docker Backend

From repo root:

```bash
docker compose down --remove-orphans
mkdir -p logs runs reports/generated models
docker compose up -d postgres
docker compose build --no-cache backend
docker compose up -d backend
```

Check:

```bash
curl -i http://localhost:8081/actuator/health
curl -i http://localhost:8081/api/scenarios
```

If backend build fails with:

```text
cmake: not found
```

ensure `docker/Dockerfile.backend` installs these packages in the runtime-build stage:

```text
build-essential
cmake
ninja-build
```

---

## Quick Start — Frontend Dev Dashboard

The frontend API base URL should be:

```env
VITE_API_BASE_URL=http://localhost:8081
```

To enable Amplitude event tracking, also add:

```env
VITE_AMPLITUDE_API_KEY=your_amplitude_browser_api_key
```

Omitting `VITE_AMPLITUDE_API_KEY` is safe — all tracking functions become no-ops.

Run locally without Docker:

```bash
cd frontend
npm install
npm run typecheck
npm run build
npm run dev
```

Open:

```text
http://localhost:5173
```

Run dev frontend through Docker Compose:

```bash
docker compose up --build frontend
```

Open:

```text
http://localhost:5173
```

If using a separate dev service/profile:

```bash
docker compose --profile dev up --build frontend-dev
```

Open:

```text
http://localhost:5173
```

---

## Quick Start — Production Frontend with Nginx

The production frontend is served by Nginx and should map host port `3000` to container port `80`.

Build and run:

```bash
docker compose --profile prod build --no-cache frontend-prod
docker compose --profile prod up -d frontend-prod
```

Open:

```text
http://localhost:3000
```

Healthcheck:

```bash
curl -i http://localhost:3000/health
```

Expected:

```text
HTTP/1.1 200 OK
ok
```

Important:

```text
Production Nginx listens on container port 80.
Do not map production frontend as 5173:5173.
Correct production mapping is 3000:80.
```

The production React bundle bakes in `VITE_API_BASE_URL` during `npm run build`. If the API URL changes, rebuild the production frontend image.

---

## Quick Start — Local Kubernetes with kind

The Kustomize overlays support local images and published GHCR images:

```text
ghcr.io/amanahmed2002/minirtos-linux/backend:latest
ghcr.io/amanahmed2002/minirtos-linux/frontend:latest
```

Create the cluster:

```bash
kind create cluster --config k8s/kind/kind-config.yml
```

Apply the GHCR overlay:

```bash
kubectl apply -k k8s/overlays/ghcr
```

Validate:

```bash
kubectl get pods -n minirtos
curl -i http://localhost:30081/actuator/health
curl -i http://localhost:30080/health
```

Open:

```text
Frontend: http://localhost:30080
Backend:  http://localhost:30081
```

Important:

```text
The frontend image must be built with a backend URL that the browser can reach.
For local kind, use `VITE_API_BASE_URL=http://localhost:30081`.
For EKS NodePort, rebuild with `VITE_API_BASE_URL=http://<worker-node-public-ip>:30081`.
```

---

## Quick Start — AWS EKS with Terraform

Phase 36 provisions AWS infrastructure with Terraform and deploys the app to EKS with GHCR images.

Configure AWS credentials first:

```bash
aws configure
aws sts get-caller-identity
```

Review `terraform/environments/dev/terraform.tfvars`:

```hcl
aws_region         = "us-east-1"
project_name       = "minirtos"
availability_zones = ["us-east-1a", "us-east-1b"]
```

Provision infrastructure:

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

Install the AWS `gp3` StorageClass and deploy the app:

```bash
kubectl apply -f k8s/aws/storageclass-gp3.yml
kubectl apply -k k8s/overlays/ghcr
```

Check the deployment:

```bash
kubectl get pods -n minirtos
kubectl get svc -n minirtos
kubectl get pvc -n minirtos
```

Phase 36 uses NodePort exposure:

```text
Frontend: http://<worker-node-public-ip>:30080
Backend:  http://<worker-node-public-ip>:30081
```

Allow browser access by adding inbound EC2 worker node security group rules for your public IP:

```text
TCP 30080 from <your-public-ip>/32
TCP 30081 from <your-public-ip>/32
```

Build and push images when API origins change:

```bash
docker build -f docker/Dockerfile.backend \
  -t ghcr.io/amanahmed2002/minirtos-linux/backend:latest .
docker push ghcr.io/amanahmed2002/minirtos-linux/backend:latest
kubectl rollout restart deployment/minirtos-backend -n minirtos
kubectl rollout status deployment/minirtos-backend -n minirtos

docker build -f docker/Dockerfile.frontend \
  --build-arg VITE_API_BASE_URL=http://<worker-node-public-ip>:30081 \
  -t ghcr.io/amanahmed2002/minirtos-linux/frontend:latest .
docker push ghcr.io/amanahmed2002/minirtos-linux/frontend:latest
kubectl rollout restart deployment/minirtos-frontend -n minirtos
kubectl rollout status deployment/minirtos-frontend -n minirtos
```

Smoke test:

```bash
./scripts/k8s_smoke_test.sh \
  "http://<worker-node-public-ip>:30081" \
  "http://<worker-node-public-ip>:30080"
```

Stop AWS billing when finished:

```bash
kubectl delete namespace minirtos
cd terraform/environments/dev
terraform destroy
```

More details are in `docs/aws-terraform-eks-phase36-update-notes.md`.

---

## Backend API

### `GET /api/health`

Returns service health.

### `GET /actuator/health`

Returns actuator health for Docker healthchecks.

### `GET /api/scenarios`

Returns scenario metadata for:

```text
normal
priority_scheduler
deadline_scheduler
queue_overflow
cpu_spike
task_crash
slow_task
dropped_messages
watchdog_slow_task
```

### `POST /api/runs`

Creates and executes a backend-orchestrated run.

Request:

```json
{
  "scenarioId": "queue_overflow"
}
```

Behavior:

```text
validate scenario ID
-> map to trusted config path
-> run C++ runtime
-> copy logs/runtime_logs.jsonl into runs/<runId>/runtime_logs.jsonl
-> run Python analyzer
-> save runs/<runId>/analysis.txt
-> persist run metadata and parsed analysis summary in PostgreSQL
-> return run summary
```

### `GET /api/runs`

Returns persisted run summaries from PostgreSQL.

### `GET /api/runs/{runId}`

Returns one persisted run summary.

### `GET /api/runs/{runId}/analysis`

Returns persisted parsed analyzer JSON plus the raw analyzer report.

---

## Docker Verification

Validate Compose:

```bash
docker compose config
```

Run backend stack:

```bash
docker compose up -d postgres
docker compose build --no-cache backend
docker compose up -d backend
```

Run production frontend:

```bash
docker compose --profile prod build --no-cache frontend-prod
docker compose --profile prod up -d frontend-prod
```

Test backend:

```bash
curl -i http://localhost:8081/actuator/health
curl -i http://localhost:8081/api/health
curl -i http://localhost:8081/api/scenarios
curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"queue_overflow"}'
curl -i http://localhost:8081/api/runs
```

Test frontend:

```bash
curl -i http://localhost:3000/health
```

Open production frontend:

```text
http://localhost:3000
```

Open dev frontend:

```text
http://localhost:5173
```

---

## CORS and Troubleshooting

Allowed browser origins should include the local frontend origins and, for Phase 36 NodePort testing, the current EKS frontend origin:

```text
http://localhost:5173
http://127.0.0.1:5173
http://localhost:3000
http://127.0.0.1:3000
http://localhost:30080
http://127.0.0.1:30080
http://<worker-node-public-ip>:30080
```

Confirm production CORS:

```bash
curl -i -X OPTIONS http://localhost:8081/api/scenarios \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

Expected header:

```text
Access-Control-Allow-Origin: http://localhost:3000
```

Common issue:

```text
Dashboard Failed to Fetch
```

Likely causes:

1. Backend is not running on `http://localhost:8081`.
2. Production frontend was built with the wrong `VITE_API_BASE_URL`.
3. Backend CORS does not include the frontend origin (`http://localhost:3000`, `http://localhost:30080`, or `http://<worker-node-public-ip>:30080`).
4. Browser is using HTTPS against the HTTP backend.
5. Nginx production frontend is incorrectly mapped as `5173:5173`.

Fix checklist:

```bash
curl -i http://localhost:8081/actuator/health
curl -i http://localhost:8081/api/scenarios
curl -i http://localhost:3000/health
docker compose logs backend --tail=100
docker logs minirtos-playground-frontend-prod --tail=100
```

---

## Documentation

| Document | Purpose |
|---|---|
| `docs/architecture.md` | Runtime/analyzer/ML/backend/PostgreSQL/frontend architecture |
| `docs/testing.md` | C++/Python/ML/backend/database/frontend testing |
| `docs/fault-injection.md` | Fault modes, telemetry, backend API, frontend learning use, and visualizer interpretation |
| `docs/anomaly-detector.md` | Analyzer, anomaly, dataset, ML, backend, frontend analysis flow, and educational display |
| `docs/performance-results.md` | Runtime/fault/benchmark results and dashboard verification notes |
| `docs/docker-phase30-update-notes.md` | Phase 30 Docker Compose hardening notes |
| `docs/kubernetes-phase35-update-notes.md` | Kustomize overlay structure for local and GHCR Kubernetes deployments |
| `docs/aws-terraform-eks-phase36-update-notes.md` | AWS/Terraform/EKS setup, deployment, verification, troubleshooting, and teardown |
| `backend/README.md` | Backend-specific setup and API documentation |
| `frontend/README.md` | Frontend-specific setup, dashboard documentation, and analytics setup |

---

## Next Phase

```text
Phase 37 — Production-grade AWS exposure with AWS Load Balancer Controller and ALB Ingress
```

Completed recent phases:

```text
Phase 31 — Frontend Automated Tests
  Vitest + React Testing Library + jsdom
  Scenario selector, run button, run history, analysis panel,
  learning panel, visualizer, and error-state tests

Phase 32 — Amplitude Analytics
  Event tracking: dashboard_loaded, scenario_run_triggered,
  scenario_run_completed, run_history_selected
  isAnalyticsEnabled guard — safe no-op without API key
  Session replay intentionally excluded

Phase 33 — Local Kubernetes Deployment
  k8s namespace, Secret, ConfigMap, PostgreSQL StatefulSet,
  backend/frontend Deployments, ClusterIP + NodePort Services,
  kind config with host ports 30080 and 30081

Phase 35 — Kubernetes Kustomize Overlays
  k8s/base plus local and GHCR overlays for image selection

Phase 36 — AWS EKS Deployment with Terraform
  Terraform VPC/EKS, 2x t3.small nodes, EBS CSI addon,
  gp3 StorageClass, GHCR overlay deployment, NodePort verification,
  and browser-tested dashboard fetch behavior
```
