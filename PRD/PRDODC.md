# MiniRTOS Playground — Phase 34 Complete Handoff PRD

**Project:** MiniRTOS-Linux / MiniRTOS Playground
**Original Project:** Embedded Runtime Simulator with AI-Based Fault Detection
**Full-Stack Evolution:** MiniRTOS Playground — Full-Stack Embedded Systems Learning Platform
**Current Completed Phase:** Phase 34 — Kubernetes CI/CD Image Publishing and Local Deployment Fixes
**Prepared For:** New chat handoff
**Date:** June 10, 2026

---

## 1. Executive Summary

MiniRTOS-Linux began as a software-only C++20 embedded runtime simulator with RTOS-style scheduling, bounded queues, structured telemetry, fault injection, watchdog behavior, Python analysis, anomaly detection, synthetic ML dataset generation, and lightweight anomaly classification.

It has since evolved into **MiniRTOS Playground**, a full-stack educational platform for learning embedded systems, RTOS concepts, fault injection, telemetry analysis, Docker, Kubernetes, and ML-based anomaly detection.

The current project includes:

* C++20 runtime simulator.
* Python deterministic analyzer.
* AI-style anomaly windowing.
* Synthetic dataset generator.
* Random Forest anomaly classifier workflow.
* Java Spring Boot backend.
* PostgreSQL/Flyway persistence.
* React/TypeScript dashboard.
* Guided educational modules.
* CSS-based queue and task visualizers.
* Amplitude event tracking.
* Docker Compose dev and production workflows.
* Local Kubernetes manifests using `kind`.
* GitHub Actions CI for runtime/analyzer and frontend tests.
* Phase 34 setup for publishing backend/frontend Docker images to GitHub Container Registry.
* Phase 34 debugging around invalid Kubernetes image names.

Phase 34 focused on moving from a purely local Kubernetes image-loading workflow toward a registry-backed workflow while preserving the working local `kind` deployment path.

---

## 2. Phase Timeline Summary

### Phases 1–23 — Core MiniRTOS-Linux Runtime and Analyzer

Completed the original simulator foundation:

* C++20 runtime.
* Config-driven simulations.
* Periodic task model.
* Round-robin scheduling.
* Priority scheduling.
* Earliest-deadline-first scheduling.
* Bounded FIFO message queues.
* Structured JSONL telemetry.
* Fault injection.
* Watchdog timeout and simulated recovery.
* Runtime summary logs.
* Python analyzer.
* Rule-based health classification.
* Anomaly windowing.
* Dataset generation.
* Random Forest classifier workflow.
* Runtime/analyzer tests.
* Docker demo workflows.

### Phase 24 — Full-Stack Educational Platform Roadmap

Defined the transition from CLI/Docker simulator to browser-based educational platform.

Goal:

```text
C++ runtime + Python analyzer
-> Java Spring Boot backend
-> PostgreSQL persistence
-> React dashboard
-> Dockerized full-stack workflow
-> Kubernetes/cloud deployment
```

### Phase 25 — Spring Boot Backend Scaffold

Added Java Spring Boot backend foundation:

* `backend/` project.
* Spring Boot main app.
* Health controller.
* Scenario metadata structure.
* Maven configuration.
* Java 17 setup.
* Backend README.

### Phase 26 — Run Orchestration API

Added backend orchestration:

* `POST /api/runs`.
* Trusted scenario ID validation.
* Runtime process execution.
* Python analyzer process execution.
* Per-run artifact folders under `runs/<runId>/`.
* `runtime_logs.jsonl` copy.
* `analysis.txt` generation.
* Structured run summary response.
* Safety rule: backend accepts known scenario IDs only, not arbitrary config paths.

### Phase 27 — PostgreSQL/Flyway Run Persistence

Added durable run storage:

* PostgreSQL via Docker Compose.
* Flyway migration.
* Spring Data JPA.
* Persisted run metadata.
* Persisted parsed analyzer summaries.
* `GET /api/runs`.
* `GET /api/runs/{runId}`.
* `GET /api/runs/{runId}/analysis`.
* Fixed PostgreSQL `@Lob` issue by storing `rawReport` as normal `TEXT`.

Verified behavior:

```text
POST /api/runs queue_overflow -> COMPLETED, WARNING
GET /api/runs -> 200
GET /api/runs/{runId} -> 200
GET /api/runs/{runId}/analysis -> 200
Run history survives backend restarts
```

### Phase 28 — React Dashboard MVP

Added React/TypeScript frontend:

* Vite frontend.
* `frontend/src/api/minirtosApi.ts`.
* Scenario selector.
* Run trigger.
* Latest run card.
* Persisted run history.
* Analysis panel.
* Frontend `.env` with `VITE_API_BASE_URL=http://localhost:8081`.
* CORS support for `http://localhost:5173`.

Verified behavior:

```text
Frontend builds.
Dashboard loads scenarios.
Runs can be created from browser.
Persisted history displays.
Analysis loads for completed runs.
```

### Phase 29 — Educational Modules and Visualizers

Added student-facing learning layer:

* Guided Learning panel.
* Scenario-specific educational cards.
* Queue pressure visualizer.
* Task runtime timeline.
* Fault and health explanation panel.
* Root-cause teaching notes.
* No backend API changes.
* No chart dependency added; CSS-based visualizers use existing API fields.

Important files:

```text
frontend/src/content/learningContent.ts
frontend/src/components/LearningModulePanel.tsx
frontend/src/components/QueuePressureChart.tsx
frontend/src/components/TaskTimeline.tsx
frontend/src/components/FaultExplanationPanel.tsx
frontend/src/components/AnalysisPanel.tsx
frontend/src/App.tsx
frontend/src/App.css
```

Verified behavior:

```text
Guided Learning panel changes by selected scenario.
queue_overflow runs successfully.
Latest run shows COMPLETED/WARNING.
Analysis loads.
Queue pressure visualizer appears.
Task timeline appears.
Fault/health explanation panel appears.
Raw report remains expandable.
```

### Phase 30 — Docker Compose Hardening

Hardened Docker workflow:

* Backend Docker image builds C++ runtime inside Docker.
* Backend Dockerfile installs `build-essential`, `cmake`, and `ninja-build`.
* Backend image includes Python analyzer dependencies.
* Dev frontend workflow preserved on Vite port `5173`.
* Production frontend workflow added through Nginx on host port `3000`.
* Nginx `/health` endpoint added.
* SPA fallback routing added.
* Backend CORS updated for `localhost:3000`.
* Fixed production dashboard `Failed to Fetch`.

Important rule:

```text
Production Nginx listens on container port 80.
Correct host mapping is 3000:80.
Do not map production Nginx as 5173:5173.
```

### Phase 31 — Frontend Automated Tests and CI

Added frontend testing:

* Vitest.
* React Testing Library.
* jsdom.
* jest-dom matchers.
* Test fixtures.
* App integration-style tests.
* Component tests.
* Visualizer tests.
* CI frontend job.

Current frontend CI commands:

```bash
npm ci
npm run test
npm run typecheck
npm run build
```

Important testing lesson:

When duplicated text appears in multiple UI sections, avoid brittle `getByText` tests. Use:

```ts
screen.getAllByText("956")
```

or scoped assertions with `within(...)`.

### Phase 32 — Amplitude Analytics

Added frontend analytics:

* `frontend/src/analytics/amplitude.ts`.
* `initAmplitude()`.
* `isAnalyticsEnabled` guard.
* `trackDashboardLoaded`.
* `trackScenarioRunTriggered`.
* `trackScenarioRunCompleted`.
* `trackRunHistorySelected`.
* `VITE_AMPLITUDE_API_KEY` optional.
* No-op behavior when key is absent.
* Session replay intentionally excluded.
* `autocapture` disabled.

Design rules:

```text
Missing VITE_AMPLITUDE_API_KEY = complete no-op.
Only explicit structured events are tracked.
Session replay package is not included.
Safe for local dev and CI.
```

### Phase 33 — Local Kubernetes Deployment

Added Kubernetes manifests:

```text
k8s/00-namespace.yml
k8s/01-postgres-secret.yml
k8s/02-backend-configmap.yml
k8s/03-postgres-statefulset.yml
k8s/04-backend-deployment.yml
k8s/05-frontend-deployment.yml
k8s/kind/kind-config.yml
```

Kubernetes resources:

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

Kubernetes ports:

```text
Frontend NodePort: http://localhost:30080
Backend NodePort:  http://localhost:30081
```

Backend Kubernetes config:

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

Kubernetes frontend build rule:

```text
Vite bakes VITE_API_BASE_URL into the production bundle.
For kind, build frontend with:
VITE_API_BASE_URL=http://localhost:30081
```

Phase 33 limitation:

```text
Images were built locally and loaded into kind.
Images were not yet pulled from a remote registry.
No Ingress, TLS, HPA, Helm, Kustomize, or cloud deployment existed yet.
```

### Phase 34 — Kubernetes CI/CD Image Publishing and Local Deployment Fixes

Phase 34 was completed in this chat.

The intended Phase 34 direction was:

```text
Add GitHub Actions image publishing to GHCR.
Publish backend and frontend Docker images.
Update Kubernetes manifests to optionally use registry images.
Keep local kind deployment working.
Debug InvalidImageName when Kubernetes image references are malformed.
```

Work completed / decisions made:

1. Reviewed Phase 33 PRD/docs and confirmed the next natural phase should be CI/CD image publishing plus Kubernetes hardening.
2. Requested and reviewed key files:

   * `.github/workflows/ci.yml`
   * `frontend/.env.example`
   * Dockerfiles
   * Kubernetes manifests
   * backend `application.yml`
   * `CorsConfig.java`
   * frontend `package.json`
   * `vite.config.ts`
3. Identified pasted `.github/workflows/ci.yml` indentation problem:

   * `on:` must be top-level, not indented under `name:`.
4. Added planned `permissions` for package publishing:

   * `contents: read`
   * `packages: write`
5. Added planned `docker-images` GitHub Actions job:

   * depends on `build-and-test` and `frontend-tests`
   * runs only on push to `main`
   * logs into `ghcr.io`
   * builds/pushes backend image
   * builds/pushes frontend image
   * lowercases repository namespace
   * tags images as `latest` and `${{ github.sha }}`
6. Fixed `frontend/.env.example` formatting:

   * remove accidental indentation
   * expected:

     ```env
     VITE_API_BASE_URL=http://localhost:8081
     VITE_AMPLITUDE_API_KEY=
     ```
7. Recreated local Kubernetes instructions because the previous cluster had been deleted.
8. Re-provided Phase 33 local kind deployment flow:

   * create cluster
   * build local images
   * load images into kind
   * apply manifests
   * verify health
9. User hit `InvalidImageName` for backend and frontend deployments.
10. Root cause explained:

    * Kubernetes image references must be valid lowercase Docker image names.
    * The likely bad image value was an uppercase GHCR path such as:

      ```text
      ghcr.io/AmanAhmed2002/minirtos-linux/backend:latest
      ```
    * Correct lowercase path:

      ```text
      ghcr.io/amanahmed2002/minirtos-linux/backend:latest
      ghcr.io/amanahmed2002/minirtos-linux/frontend:latest
      ```
11. Safer fix recommended:

    * For local kind verification, use local images first:

      ```yaml
      image: minirtos-playground-backend:phase32
      imagePullPolicy: IfNotPresent
      ```

      ```yaml
      image: minirtos-playground-frontend:phase32
      imagePullPolicy: IfNotPresent
      ```
    * Then build and load images:

      ```bash
      docker build -f docker/Dockerfile.backend -t minirtos-playground-backend:phase32 .
      docker build \
        -f docker/Dockerfile.frontend \
        --target production \
        --build-arg VITE_API_BASE_URL=http://localhost:30081 \
        -t minirtos-playground-frontend:phase32 .

      kind load docker-image minirtos-playground-backend:phase32 --name minirtos
      kind load docker-image minirtos-playground-frontend:phase32 --name minirtos
      ```
12. Explained difference between:

    * `InvalidImageName`: image string is malformed.
    * `ImagePullBackOff`: image string is valid but Kubernetes cannot pull it.
13. User confirmed Phase 34 is finished.

---

## 3. Current Architecture

```text
Docker Compose / Local Kubernetes / Future GHCR
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
  │     -> GET  /actuator/health/readiness
  │     -> GET  /actuator/health/liveness
  │     -> GET  /api/scenarios
  │     -> POST /api/runs
  │     -> GET  /api/runs
  │     -> GET  /api/runs/{runId}
  │     -> GET  /api/runs/{runId}/analysis
  ├── React/Vite Dev Frontend
  │     -> http://localhost:5173
  ├── React/Nginx Production Frontend
  │     -> http://localhost:3000
  │     -> GET /health
  └── Local Kubernetes Frontend
        -> http://localhost:30080

Local Kubernetes:
  ├── Namespace: minirtos
  ├── PostgreSQL StatefulSet + PVC + ClusterIP
  ├── Backend Deployment + ClusterIP + NodePort
  │     -> http://localhost:30081
  └── Frontend Deployment + ClusterIP + NodePort
        -> http://localhost:30080
```

Future deployment direction:

```text
GitHub Actions
  -> Build/test C++ + Python
  -> Test/build React frontend
  -> Build backend Docker image
  -> Build frontend Docker image
  -> Push images to GHCR
  -> Kubernetes manifests consume GHCR image tags
  -> Later: Kustomize/Helm, Ingress, TLS, cloud deployment
```

---

## 4. Core Features

| Area               | Feature                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| Runtime            | C++20 CLI simulator                                                                 |
| Config             | JSON configs for tasks, scheduler, faults, watchdog                                 |
| Scheduler          | Round-robin, priority, earliest-deadline-first                                      |
| Message Bus        | Bounded FIFO queues and queue-full drops                                            |
| Fault Injection    | `slow_task`, `dropped_messages`, `cpu_spike`, `task_crash`                          |
| Watchdog           | Repeated deadline miss detection and simulated recovery                             |
| Analyzer           | Python JSONL health analyzer                                                        |
| AI-Style Detection | Time-windowed feature extraction and anomaly scoring                                |
| ML                 | Synthetic dataset generation and Random Forest classifier                           |
| Backend            | Java Spring Boot API for health, scenarios, and runs                                |
| Persistence        | PostgreSQL run history with Flyway migrations                                       |
| Frontend           | React/TypeScript educational dashboard                                              |
| Learning UI        | Scenario learning cards, queue visualizer, task timeline, health/fault explanations |
| Analytics          | Amplitude event tracking with no-op guard                                           |
| Testing            | GoogleTest, CTest, pytest, Maven tests, Vitest, React Testing Library               |
| Docker             | Runtime, analyzer, ML, backend, PostgreSQL, dev frontend, production frontend       |
| Kubernetes         | Namespace, Secret, ConfigMap, StatefulSet, Deployments, Services, PVCs, kind config |
| CI/CD              | Existing test CI plus Phase 34 GHCR image-publishing direction                      |

---

## 5. Repository Structure

```text
minirtos-linux/
├── .github/
│   └── workflows/
│       └── ci.yml
├── backend/
│   ├── README.md
│   └── src/main/
├── frontend/
│   ├── README.md
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
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
│   ├── 00-namespace.yml
│   ├── 01-postgres-secret.yml
│   ├── 02-backend-configmap.yml
│   ├── 03-postgres-statefulset.yml
│   ├── 04-backend-deployment.yml
│   ├── 05-frontend-deployment.yml
│   └── kind/
│       └── kind-config.yml
├── logs/
├── models/
├── reports/generated/
├── runs/
├── docker-compose.yml
└── README.md
```

---

## 6. Current Known Configuration

### Backend

```text
Java 17
Spring Boot 3.3.5
Port: 8081
Database: PostgreSQL 16
Persistence: Spring Data JPA + Flyway
Runtime binary: cpp-runtime/build/minirtos_runtime
Analyzer script: ai-analyzer/app/analyze.py
```

### Frontend

```text
Node.js 22+
React 19
TypeScript 6
Vite 8
Dev URL: http://localhost:5173
Production Docker URL: http://localhost:3000
Kubernetes URL: http://localhost:30080
```

### Frontend `.env.example`

Expected:

```env
VITE_API_BASE_URL=http://localhost:8081
VITE_AMPLITUDE_API_KEY=
```

For Kubernetes production image build:

```bash
--build-arg VITE_API_BASE_URL=http://localhost:30081
```

### CORS

Expected allowed origins:

```text
http://localhost:5173
http://127.0.0.1:5173
http://localhost:3000
http://127.0.0.1:3000
http://localhost:30080
http://127.0.0.1:30080
```

### Important Local URLs

```text
Backend local/Docker:         http://localhost:8081
Frontend dev:                 http://localhost:5173
Frontend production Docker:   http://localhost:3000
Kubernetes frontend NodePort: http://localhost:30080
Kubernetes backend NodePort:  http://localhost:30081
```

---

## 7. Backend API

### `GET /api/health`

Returns backend health metadata.

### `GET /actuator/health`

Used by Docker and Kubernetes health checks.

### `GET /actuator/health/readiness`

Used by Kubernetes readiness probe.

### `GET /actuator/health/liveness`

Used by Kubernetes liveness probe.

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

Runs a trusted scenario.

Example:

```bash
curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"queue_overflow"}'
```

Expected queue-overflow behavior:

```text
status=COMPLETED
runtimeHealth=WARNING
errorMessage=null
```

### `GET /api/runs`

Returns persisted run history.

### `GET /api/runs/{runId}`

Returns one persisted run.

### `GET /api/runs/{runId}/analysis`

Returns parsed analyzer summary plus raw analyzer report.

---

## 8. Local Kubernetes Rebuild / Reverification Commands

Use this if the cluster was deleted.

### Create cluster

```bash
kind create cluster --config k8s/kind/kind-config.yml
```

Verify:

```bash
kubectl cluster-info --context kind-minirtos
kubectl get nodes
```

### Build local images

```bash
docker build -f docker/Dockerfile.backend -t minirtos-playground-backend:phase32 .

docker build \
  -f docker/Dockerfile.frontend \
  --target production \
  --build-arg VITE_API_BASE_URL=http://localhost:30081 \
  -t minirtos-playground-frontend:phase32 .
```

### Load images into kind

```bash
kind load docker-image minirtos-playground-backend:phase32 --name minirtos
kind load docker-image minirtos-playground-frontend:phase32 --name minirtos
```

### Apply manifests

```bash
kubectl apply -f k8s/00-namespace.yml
kubectl apply -f k8s/01-postgres-secret.yml
kubectl apply -f k8s/02-backend-configmap.yml
kubectl apply -f k8s/03-postgres-statefulset.yml
kubectl apply -f k8s/04-backend-deployment.yml
kubectl apply -f k8s/05-frontend-deployment.yml
```

### Watch pods

```bash
kubectl get pods -n minirtos -w
```

Expected:

```text
minirtos-postgres-0       Running
minirtos-backend-...      Running
minirtos-frontend-...     Running
```

### Smoke test

```bash
curl -i http://localhost:30081/actuator/health
curl -i http://localhost:30081/actuator/health/readiness
curl -i http://localhost:30081/actuator/health/liveness
curl -i http://localhost:30081/api/scenarios
curl -i http://localhost:30080/health
```

CORS check:

```bash
curl -i -X OPTIONS http://localhost:30081/api/scenarios \
  -H "Origin: http://localhost:30080" \
  -H "Access-Control-Request-Method: GET"
```

Expected:

```text
Access-Control-Allow-Origin: http://localhost:30080
```

Run scenario:

```bash
curl -X POST http://localhost:30081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"queue_overflow"}'
```

List runs:

```bash
curl -i http://localhost:30081/api/runs
```

Open frontend:

```text
http://localhost:30080
```

Expected UI behavior:

```text
Dashboard loads.
Scenario dropdown loads.
queue_overflow runs.
Latest run shows COMPLETED.
Runtime health shows WARNING.
Persisted history updates.
Analysis loads when selecting completed run.
```

---

## 9. Phase 34 GitHub Actions CI/CD Direction

The updated `.github/workflows/ci.yml` should include:

```yaml
permissions:
  contents: read
  packages: write
```

Existing jobs:

```text
build-and-test
frontend-tests
```

New intended job:

```text
docker-images
```

Job behavior:

```text
Runs only on push to main.
Depends on runtime/analyzer tests and frontend tests.
Uses Docker Buildx.
Logs into ghcr.io using GITHUB_TOKEN.
Builds backend Docker image.
Builds frontend Docker image.
Pushes latest and commit SHA tags.
```

Important implementation detail:

```bash
IMAGE_NAMESPACE="ghcr.io/${GITHUB_REPOSITORY,,}"
```

This lowercases the GitHub repository path before using it as a Docker image namespace.

Why this matters:

```text
GHCR/Docker image references must be lowercase.
Uppercase owner/repo paths can cause Kubernetes InvalidImageName.
```

Expected GHCR image format:

```text
ghcr.io/amanahmed2002/minirtos-linux/backend:latest
ghcr.io/amanahmed2002/minirtos-linux/frontend:latest
```

Do not use uppercase:

```text
ghcr.io/AmanAhmed2002/minirtos-linux/backend:latest
```

---

## 10. Kubernetes Image Rules

### Local kind image path

Use this for local kind verification:

```yaml
image: minirtos-playground-backend:phase32
imagePullPolicy: IfNotPresent
```

```yaml
image: minirtos-playground-frontend:phase32
imagePullPolicy: IfNotPresent
```

Requires:

```bash
kind load docker-image minirtos-playground-backend:phase32 --name minirtos
kind load docker-image minirtos-playground-frontend:phase32 --name minirtos
```

### GHCR image path

Use this only after GitHub Actions has published the images:

```yaml
image: ghcr.io/amanahmed2002/minirtos-linux/backend:latest
imagePullPolicy: Always
```

```yaml
image: ghcr.io/amanahmed2002/minirtos-linux/frontend:latest
imagePullPolicy: Always
```

If the repo or owner name differs, replace with the actual lowercase owner/repo.

---

## 11. Phase 34 Debugging Notes

### `InvalidImageName`

Meaning:

```text
Kubernetes thinks the image string itself is malformed.
```

Likely cause from Phase 34:

```text
Uppercase GHCR image path, e.g. ghcr.io/AmanAhmed2002/...
```

Fix:

```text
Use lowercase image path.
```

Check what Kubernetes sees:

```bash
kubectl get deployment minirtos-backend -n minirtos \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'

kubectl get deployment minirtos-frontend -n minirtos \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

Expected local kind values:

```text
minirtos-playground-backend:phase32
minirtos-playground-frontend:phase32
```

Expected GHCR values:

```text
ghcr.io/amanahmed2002/minirtos-linux/backend:latest
ghcr.io/amanahmed2002/minirtos-linux/frontend:latest
```

### `ImagePullBackOff`

Meaning:

```text
The image name is valid, but Kubernetes cannot pull it.
```

Likely causes:

```text
GHCR package is private.
Image has not been published yet.
Wrong tag.
No imagePullSecret for private package.
```

Simplest learning-phase fix:

```text
Make GHCR package public.
```

Later production fix:

```text
Add imagePullSecret.
```

---

## 12. Test and Verification Checklist

### Core runtime/analyzer

```bash
./scripts/run_tests.sh
```

Expected:

```text
CMake configure passes.
C++ build passes.
CTest passes.
pytest passes.
```

### Backend

```bash
./scripts/build_cpp.sh
docker compose up -d postgres
cd backend
mvn clean test
mvn spring-boot:run
```

Test:

```bash
curl http://localhost:8081/api/health
curl http://localhost:8081/actuator/health
curl http://localhost:8081/api/scenarios
```

### Frontend

```bash
cd frontend
npm install
npm run test
npm run typecheck
npm run build
npm run dev
```

Open:

```text
http://localhost:5173
```

### Docker production frontend

```bash
docker compose --profile prod build --no-cache frontend-prod
docker compose --profile prod up -d frontend-prod
curl -i http://localhost:3000/health
```

Open:

```text
http://localhost:3000
```

### Kubernetes

```bash
kubectl get all -n minirtos
kubectl get pvc -n minirtos

curl -i http://localhost:30081/actuator/health
curl -i http://localhost:30081/api/scenarios
curl -i http://localhost:30080/health
```

Run queue overflow:

```bash
curl -X POST http://localhost:30081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"queue_overflow"}'
```

Expected:

```text
status=COMPLETED
runtimeHealth=WARNING
```

---

## 13. Known Limitations

Current limitations:

```text
Timing is simulated on Linux, not hard real-time hardware.
Task crash is simulated rather than killing a real OS process/thread.
Recovery is telemetry-based rather than full restart orchestration.
ML labels are scenario-derived.
ML is not production-validated.
Runtime logs still live as files; PostgreSQL stores metadata and parsed analysis.
Frontend visualizers are summary visualizers, not event-by-event charts.
Kubernetes is local kind-based, not production cloud.
No Ingress yet.
No TLS yet.
No HPA yet.
No Helm/Kustomize overlays yet.
No cloud Terraform yet.
Frontend API base URL is still baked into the Vite production image.
GHCR/private image pulling may require imagePullSecrets if packages are private.
```

---

## 14. Next Phase Recommendation

### Phase 35 — Kubernetes Deployment Hardening with Kustomize or Helm

Recommended next phase:

```text
Add Kustomize overlays or Helm chart to cleanly separate local kind, Docker, staging, and future production configuration.
```

Why this is the best next step:

```text
Phase 34 exposed the need to switch between local images and GHCR images.
Hardcoding image names directly in base manifests is not ideal.
Frontend API URL differs between Docker, kind, and future cloud.
Kustomize or Helm will make environment-specific config cleaner.
```

Recommended Phase 35 scope:

1. Add Kubernetes base manifests under:

```text
k8s/base/
```

2. Add local overlay:

```text
k8s/overlays/local/
```

Local overlay should use:

```text
minirtos-playground-backend:phase32
minirtos-playground-frontend:phase32
imagePullPolicy: IfNotPresent
```

3. Add GHCR/dev overlay:

```text
k8s/overlays/ghcr-local/
```

GHCR overlay should use:

```text
ghcr.io/amanahmed2002/minirtos-linux/backend:latest
ghcr.io/amanahmed2002/minirtos-linux/frontend:latest
imagePullPolicy: Always
```

4. Add documentation for:

```bash
kubectl apply -k k8s/overlays/local
kubectl apply -k k8s/overlays/ghcr-local
```

5. Add a Kubernetes smoke-test script:

```text
scripts/k8s_smoke_test.sh
```

6. Add optional CI job that validates manifests:

```bash
kubectl kustomize k8s/overlays/local
kubectl kustomize k8s/overlays/ghcr-local
```

7. Update docs:

```text
README.md
docs/architecture.md
docs/testing.md
docs/kubernetes-phase35-update-notes.md
backend/README.md
frontend/README.md
resume-bullets.md
```

### Alternative Phase 35

If choosing cloud next instead:

```text
Phase 35 — Cloud Infrastructure Planning
```

Potential scope:

```text
Choose target cloud provider.
Choose managed PostgreSQL or external DB.
Add Ingress.
Add TLS.
Add domain.
Add secrets strategy.
Add Terraform skeleton.
```

However, Kustomize/Helm should probably come first because it makes cloud deployment cleaner.

---

## 15. Suggested Commit Messages

For Phase 34 CI image publishing:

```bash
git add .github/workflows/ci.yml frontend/.env.example
git commit -m "Add GHCR image publishing workflow"
```

For Kubernetes image fixes:

```bash
git add k8s/04-backend-deployment.yml k8s/05-frontend-deployment.yml
git commit -m "Fix Kubernetes image references"
```

For Phase 34 docs after updating:

```bash
git add README.md docs/ backend/README.md frontend/README.md
git commit -m "Document Phase 34 Kubernetes image publishing"
```

For Phase 35 Kustomize later:

```bash
git add k8s scripts README.md docs/
git commit -m "Add Kubernetes environment overlays"
```

---

## 16. Handoff Instructions for Next Chat

Start the next chat with:

```text
We completed Phase 34 of MiniRTOS Playground. The project is a C++/Python/Java/React embedded systems learning platform with Docker, PostgreSQL, Amplitude, and local Kubernetes. Phase 34 added GHCR image publishing direction and fixed Kubernetes InvalidImageName issues caused by uppercase image paths. The next recommended phase is Phase 35: Kubernetes Kustomize/Helm overlays and deployment hardening. Please review this PRD and ask for any code files needed before proceeding.
```

Files the next chat should request first:

```text
.github/workflows/ci.yml
k8s/00-namespace.yml
k8s/01-postgres-secret.yml
k8s/02-backend-configmap.yml
k8s/03-postgres-statefulset.yml
k8s/04-backend-deployment.yml
k8s/05-frontend-deployment.yml
k8s/kind/kind-config.yml
docker/Dockerfile.backend
docker/Dockerfile.frontend
docker/nginx.frontend.conf
frontend/.env.example
frontend/package.json
backend/src/main/resources/application.yml
backend/src/main/java/com/minirtos/playground/config/CorsConfig.java
README.md
docs/architecture.md
docs/testing.md
docs/kubernetes-phase33-update-notes.md
```

Most important caution for next chat:

```text
Do not assume the Kubernetes cluster is still running.
If it was deleted, recreate it with kind before verifying Kubernetes.
Do not use uppercase GHCR image names.
For local kind, prefer local image names and kind load first.
Only switch to GHCR images after the packages exist and are pullable.
```
