# MiniRTOS-Linux / MiniRTOS Playground Architecture

**Updated:** June 11, 2026
**Current Phase:** Phase 36 — AWS EKS Deployment with Terraform

---

## Current Status

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed the Run Orchestration API. Phase 27 completed PostgreSQL/Flyway run persistence. Phase 28 added the React/TypeScript dashboard MVP layer and frontend Docker integration. Phase 29 added educational learning modules and frontend visualizers. Phase 30 hardened the Docker Compose architecture for backend, dev frontend, and production frontend workflows. Phase 31 added frontend automated tests with Vitest and React Testing Library. Phase 32 added Amplitude event tracking to the React dashboard. Phase 33 added local Kubernetes manifests for PostgreSQL, backend, frontend, and `kind` host port exposure. Phase 35 added Kustomize overlays for local and GHCR Kubernetes deployments. Phase 36 added Terraform-managed AWS infrastructure and verified the full stack on EKS with EBS-backed PostgreSQL persistence.

The platform now includes:

- C++ runtime simulator.
- Python deterministic analyzer.
- Rule-based anomaly detector.
- Synthetic dataset generator.
- Random Forest ML classifier workflow.
- Spring Boot backend orchestration API.
- PostgreSQL persisted run history.
- React/TypeScript educational dashboard.
- CSS-based queue and task visualizers.
- Guided scenario learning modules.
- Amplitude event tracking for key dashboard interactions.
- Docker Compose services for runtime, analyzer, ML, backend, database, dev frontend, and production frontend.
- Local Kubernetes manifests for namespace, secrets, config, StatefulSet, Deployments, Services, and PVCs.
- Kustomize overlays for local images and GHCR-published images.
- Terraform modules for AWS VPC and EKS infrastructure.
- AWS EKS deployment with an EBS CSI addon, `gp3` StorageClass, EBS-backed PostgreSQL persistence, and AWS Load Balancer Controller IRSA.
- Production Nginx frontend serving on `http://localhost:3000`.
- Vite dev frontend serving on `http://localhost:5173`.
- Local Kubernetes frontend NodePort serving on `http://localhost:30080`.
- Local Kubernetes backend NodePort serving on `http://localhost:30081`.
- AWS EKS ALB routing where `/` serves the frontend and `/api/*` reaches the backend.
- Backend CORS support for local dev, local production, and local Kubernetes split-origin workflows.

---

## 1. Current Architecture

```text
+--------------------------------------------------------------------------------+
| Docker Compose                                                                  |
| demo / runtime-* / analyzer / ml-* / backend / postgres / frontend / frontend-prod |
+----------------------------------------+---------------------------------------+
                                         |
                                         v
+-------------------------------+       +---------------------------------------+
| C++ Runtime Simulator         |       | Java Spring Boot Backend              |
| Config Loader                 |       | GET  /api/health                      |
| Scheduler                     |       | GET  /actuator/health                 |
| Message Bus                   |       | GET  /api/scenarios                   |
| Fault Injector                |       | POST /api/runs                        |
| Watchdog                      |       | GET  /api/runs                        |
| JSONL Logger                  |       | GET  /api/runs/{runId}                |
|                               |       | GET  /api/runs/{runId}/analysis       |
+---------------+---------------+       +-------------------+-------------------+
                |                                           |
                v                                           v
+-------------------------------+       +---------------------------------------+
| logs/runtime_logs.jsonl       |       | runs/<runId>/runtime_logs.jsonl      |
+---------------+---------------+       | runs/<runId>/analysis.txt            |
                |                       +-------------------+-------------------+
                v                                           |
+-------------------------------+                           |
| Python Analyzer               |<--------------------------+
| Deterministic report          |
| Anomaly windows               |
| Optional ML prediction        |
+---------------+---------------+
                |
                v
+-------------------------------+       +---------------------------------------+
| Dataset + ML Layer            |       | PostgreSQL                            |
| generate_dataset.py           |       | runs                                  |
| train_model.py                |       | run_event_counts                      |
| predict_model.py              |       | run_severity_counts                   |
| RandomForestClassifier        |       | run_task_metrics                      |
+-------------------------------+       | run_root_causes                       |
                                        +-------------------+-------------------+
                                                            |
                                                            v
                 +------------------------------------------+----------------------------------+
                 |                                                                             |
                 v                                                                             v
+---------------------------------------+                          +---------------------------------------+
| React/Vite Dev Frontend               |                          | React/Nginx Production Frontend        |
| http://localhost:5173                 |                          | http://localhost:3000                  |
| scenario selector                     |                          | Nginx static assets                    |
| run trigger                           |                          | /health endpoint                       |
| persisted history                     |                          | SPA fallback routing                   |
| analyzer summary panel                |                          | same dashboard bundle                  |
| guided learning modules               |                          | calls backend at localhost:8081        |
| queue pressure visualizer             |                          +---------------------------------------+
| task runtime timeline                 |
| fault/health explanation panel        |
+---------------------------------------+

Local Kubernetes
  -> Namespace: minirtos
  -> PostgreSQL StatefulSet + PVC + ClusterIP
  -> Backend Deployment + ClusterIP + NodePort 30081
  -> Frontend Deployment + ClusterIP + NodePort 30080
  -> kind extraPortMappings 30080/30081

AWS EKS Phase 36
  -> Terraform VPC and EKS cluster in us-east-1
  -> Cluster name: minirtos-eks
  -> Kubernetes version: 1.30
  -> Managed node group: 2x t3.small
  -> OIDC provider + IRSA role for EBS CSI
  -> aws-ebs-csi-driver addon
  -> gp3 StorageClass with WaitForFirstConsumer
  -> PostgreSQL EBS-backed PVC
  -> AWS Load Balancer Controller IRSA role
  -> ALB routes / to frontend and /api to backend
```

---

## 2. C++ Runtime Components

Main runtime concepts:

- Config loading from JSON.
- Periodic task model.
- Round-robin scheduler.
- Priority scheduler.
- Earliest-deadline-first scheduler.
- Bounded message bus.
- Fault injector.
- Watchdog.
- Structured JSONL logger.

Important event types:

```text
runtime_started
scheduler_started
task_started
task_completed
task_failed
task_skipped
message_sent
message_received
message_dropped
fault_injected
watchdog_timeout
task_recovered
scheduler_finished
runtime_summary
runtime_finished
```

---

## 3. Runtime Flow

```text
main.cpp
  -> parse --config
  -> load RuntimeConfig
  -> create Logger
  -> log runtime_started
  -> construct tasks
  -> construct Scheduler
  -> initialize MessageBus
  -> select scheduler mode
  -> construct FaultInjector
  -> construct Watchdog
  -> run loop
       -> check due tasks
       -> order by scheduler mode
       -> apply faults
       -> log task telemetry
       -> send/receive messages
       -> inspect watchdog
  -> log runtime summaries
  -> log runtime_finished
```

---

## 4. Python Analyzer Architecture

Main files:

```text
ai-analyzer/app/analyze.py
ai-analyzer/app/anomaly_detector.py
```

Responsibilities:

- Load JSONL events.
- Count event types and severities.
- Summarize task behavior.
- Summarize message drops.
- Summarize faults.
- Summarize watchdog events.
- Summarize task failures/skips.
- Classify deterministic health.
- Report root causes.
- Run anomaly windows.
- Optionally print ML predictions.

---

## 5. Dataset and ML Architecture

Main files:

```text
ai-analyzer/training/generate_dataset.py
ai-analyzer/ml/train_model.py
ai-analyzer/ml/predict_model.py
```

Pipeline:

```text
scenario logs
  -> fixed time windows
  -> feature extraction
  -> scenario labels
  -> synthetic_dataset.csv
  -> LabelEncoder
  -> RandomForestClassifier
  -> anomaly_classifier.joblib
  -> label_encoder.joblib
  -> model_metrics.json
```

The ML classifier is trained on synthetic scenario-derived telemetry and should not be described as production-validated AI.

---

## 6. Spring Boot Backend Architecture

Backend stack:

```text
Java 17
Spring Boot 3.3.5
Maven
Spring Web
Spring Boot Actuator
Spring Validation
Spring Data JPA
PostgreSQL Driver
Flyway
H2 for tests
Docker image with Python and compiled C++ runtime
```

Current backend API:

```text
GET  /api/health
GET  /actuator/health
GET  /api/scenarios
POST /api/runs
GET  /api/runs
GET  /api/runs/{runId}
GET  /api/runs/{runId}/analysis
```

Current backend port:

```text
8081
```

Important backend files:

```text
backend/pom.xml
backend/src/main/java/com/minirtos/playground/MiniRtosPlaygroundApplication.java
backend/src/main/java/com/minirtos/playground/config/MiniRtosProperties.java
backend/src/main/java/com/minirtos/playground/config/CorsConfig.java
backend/src/main/java/com/minirtos/playground/controller/HealthController.java
backend/src/main/java/com/minirtos/playground/controller/ScenarioController.java
backend/src/main/java/com/minirtos/playground/controller/RunController.java
backend/src/main/java/com/minirtos/playground/service/ScenarioService.java
backend/src/main/java/com/minirtos/playground/service/RunService.java
backend/src/main/java/com/minirtos/playground/service/RuntimeExecutionService.java
backend/src/main/java/com/minirtos/playground/service/AnalyzerExecutionService.java
backend/src/main/java/com/minirtos/playground/service/AnalyzerReportParser.java
backend/src/main/java/com/minirtos/playground/service/ProcessRunner.java
backend/src/main/java/com/minirtos/playground/persistence/RunEntity.java
backend/src/main/java/com/minirtos/playground/persistence/RunRepository.java
backend/src/main/java/com/minirtos/playground/persistence/TaskMetricEntity.java
backend/src/main/resources/application.yml
backend/src/main/resources/db/migration/V1__create_run_storage.sql
backend/README.md
docker/Dockerfile.backend
```

CORS is needed because the browser frontend runs on a different origin from the backend.

Allowed browser origins after Phase 36:

```text
http://localhost:5173
http://127.0.0.1:5173
http://localhost:3000
http://127.0.0.1:3000
http://localhost:30080
http://127.0.0.1:30080
```

---

## 7. Phase 26 Run Orchestration Flow

```text
POST /api/runs
  -> CreateRunRequest(scenarioId)
  -> RunController
  -> RunService
  -> ScenarioService.findById(scenarioId)
  -> reject unknown scenario IDs
  -> RuntimeExecutionService
       -> ProcessRunner
       -> cpp-runtime/build/minirtos_runtime --config configs/<scenario>.json
  -> copy logs/runtime_logs.jsonl
       -> runs/<runId>/runtime_logs.jsonl
  -> AnalyzerExecutionService
       -> ProcessRunner
       -> python3 ai-analyzer/app/analyze.py --log runs/<runId>/runtime_logs.jsonl --window-ms 5000
  -> save runs/<runId>/analysis.txt
  -> AnalyzerReportParser
  -> AnalysisResponse
  -> RunSummaryResponse
```

Important design rule:

```text
Never let API clients provide arbitrary config paths.
```

---

## 8. Phase 27 Run Storage Architecture

Phase 27 replaced the previous in-memory run state with PostgreSQL-backed persistence.

Filesystem artifacts remain:

```text
runs/<runId>/runtime_logs.jsonl
runs/<runId>/analysis.txt
```

Database-backed metadata now persists:

```text
runs
run_event_counts
run_severity_counts
run_task_metrics
run_root_causes
```

Run storage flow:

```text
POST /api/runs
  -> create RunEntity with RUNNING status
  -> save RunEntity through RunRepository
  -> execute runtime
  -> execute analyzer
  -> parse AnalysisResponse
  -> mark RunEntity COMPLETED or FAILED
  -> persist parsed counters/metrics/root causes/raw report
```

Read flow:

```text
GET /api/runs
  -> RunRepository.findAllByOrderByCreatedAtDesc()
  -> RunEntity.toSummaryResponse()

GET /api/runs/{runId}
  -> RunRepository.findByRunId(runId)
  -> RunEntity.toSummaryResponse()

GET /api/runs/{runId}/analysis
  -> RunRepository.findByRunId(runId)
  -> RunEntity.toAnalysisResponse()
```

Important Phase 27 persistence rule:

```text
rawReport must be PostgreSQL TEXT without @Lob.
```

---

## 9. Phase 28 Frontend Architecture

Frontend stack:

```text
Vite
React
TypeScript
Node 22+
npm
clsx
```

Current frontend dev port:

```text
5173
```

Environment:

```env
VITE_API_BASE_URL=http://localhost:8081
VITE_AMPLITUDE_API_KEY=your_amplitude_browser_api_key  # optional — omit to disable tracking
```

Important frontend files:

```text
frontend/package.json
frontend/.env
frontend/.env.example
frontend/README.md
frontend/src/types/api.ts
frontend/src/api/minirtosApi.ts
frontend/src/components/DashboardHeader.tsx
frontend/src/components/ScenarioSelector.tsx
frontend/src/components/RunResultCard.tsx
frontend/src/components/RunHistory.tsx
frontend/src/components/AnalysisPanel.tsx
frontend/src/App.tsx
frontend/src/App.css
frontend/src/index.css
frontend/src/main.tsx
```

Frontend API flow:

```text
App.tsx
  -> loadDashboard()
       -> GET /api/scenarios
       -> GET /api/runs
  -> ScenarioSelector
       -> selected scenario ID
       -> run button
  -> createRun()
       -> POST /api/runs
       -> refresh GET /api/runs
  -> RunHistory
       -> select run ID
  -> AnalysisPanel
       -> GET /api/runs/{runId}/analysis
```

---

## 10. Phase 29 Educational Frontend Architecture

Phase 29 added educational and visualizer components without backend changes.

New frontend files:

```text
frontend/src/content/learningContent.ts
frontend/src/components/LearningModulePanel.tsx
frontend/src/components/QueuePressureChart.tsx
frontend/src/components/TaskTimeline.tsx
frontend/src/components/FaultExplanationPanel.tsx
```

Updated frontend files:

```text
frontend/src/App.tsx
frontend/src/App.css
frontend/src/components/AnalysisPanel.tsx
```

Phase 29 flow:

```text
ScenarioSelector
  -> selected scenario ID
  -> LearningModulePanel
       -> getScenarioLearningContent(selectedScenario)
       -> show concept modules and signals to watch

AnalysisPanel
  -> QueuePressureChart(messageSummary)
  -> TaskTimeline(taskMetrics)
  -> FaultExplanationPanel(analysis)
  -> existing summary grid / task table / root causes / raw report
```

Phase 29 visualizers use these existing API fields:

```text
messageSummary.sent
messageSummary.received
messageSummary.dropped
messageSummary.queueFullDrops
messageSummary.faultInjectedDrops
taskMetrics[taskName].runs
taskMetrics[taskName].deadlineMisses
taskMetrics[taskName].avgDurationMs
taskMetrics[taskName].maxDurationMs
runtimeHealth
rootCauses
scenarioId
simulationName
```

No chart library was added. Visualizers are implemented with CSS bars and cards.

---

## 11. Phase 30 Docker Architecture

Phase 30 split the frontend architecture into dev and production flows.

Dockerfiles:

```text
docker/Dockerfile.runtime
docker/Dockerfile.analyzer
docker/Dockerfile.backend
docker/Dockerfile.frontend
docker/nginx.frontend.conf
```

Services:

```text
demo
runtime-normal
runtime-priority
runtime-deadline
runtime-queue-overflow
runtime-cpu-spike
runtime-task-crash
runtime-slow-task
runtime-dropped-messages
runtime-watchdog
analyzer
training-dataset
ml-train
ml-predict
postgres
backend
frontend
frontend-dev
frontend-prod
```

Backend Docker hardening:

```text
- Backend image compiles the C++ runtime during Docker build.
- Backend build stage installs build-essential, cmake, and ninja-build.
- Backend runtime image includes python3, python3-pip, and curl.
- Backend healthcheck uses /actuator/health.
- Backend depends on healthy PostgreSQL.
```

Frontend Docker hardening:

```text
- Dev frontend target runs Vite on 0.0.0.0:5173.
- Production frontend target builds React/Vite static assets.
- Nginx production stage serves the built frontend on container port 80.
- Host production URL is http://localhost:3000.
- Nginx exposes /health.
- Nginx uses SPA fallback routing.
```

Correct port mappings:

```text
Dev:
  host 5173 -> container 5173

Production:
  host 3000 -> container 80
```

Common incorrect mapping:

```text
host 5173 -> container 5173 for Nginx production
```

Nginx does not listen on `5173`.

---

## 12. Docker Runtime Commands

Backend stack:

```bash
docker compose down --remove-orphans
mkdir -p logs runs reports/generated models
docker compose up -d postgres
docker compose build --no-cache backend
docker compose up -d backend
```

Check backend:

```bash
curl -i http://localhost:8081/actuator/health
curl -i http://localhost:8081/api/scenarios
```

Dev frontend:

```bash
docker compose up --build frontend
```

Open:

```text
http://localhost:5173
```

Production frontend:

```bash
docker compose --profile prod build --no-cache frontend-prod
docker compose --profile prod up -d frontend-prod
```

Open:

```text
http://localhost:3000
```

Production healthcheck:

```bash
curl -i http://localhost:3000/health
```

CORS check:

```bash
curl -i -X OPTIONS http://localhost:8081/api/scenarios \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

Expected:

```text
Access-Control-Allow-Origin: http://localhost:3000
```

---

## 13. Full-Stack Deployment Direction

```text
React/TypeScript Frontend
  -> Spring Boot Backend
  -> PostgreSQL Run History
  -> C++ Runtime
  -> Python Analyzer
  -> ML Predictor
  -> Docker Compose
  -> Local Kubernetes Deployments
  -> AWS EKS deployment
  -> Terraform-managed cloud infrastructure
```

---

## 14. Phase 31 Frontend Test Architecture

Phase 31 added:

```text
Vitest
React Testing Library
jsdom
frontend/src/test/setupTests.ts
frontend/src/components/__tests__/DashboardHeader.test.tsx
frontend/src/components/__tests__/ScenarioSelector.test.tsx
frontend/src/components/__tests__/RunHistory.test.tsx
frontend/src/components/__tests__/AnalysisPanel.test.tsx
```

---

## 15. Phase 32 Analytics Architecture

Phase 32 added client-side Amplitude event tracking.

New file:

```text
frontend/src/analytics/amplitude.ts
```

Module design:

```text
API_KEY = import.meta.env.VITE_AMPLITUDE_API_KEY ?? ""

isAnalyticsEnabled: boolean = false  (module-level flag)

initAmplitude()
  -> return early if API_KEY is empty
  -> amplitude.init(API_KEY, { autocapture: false })
  -> isAnalyticsEnabled = true

trackDashboardLoaded(scenarioCount, runCount)
  -> guard: if (!isAnalyticsEnabled) return
  -> amplitude.track("dashboard_loaded", { scenario_count, run_count })

trackScenarioRunTriggered(scenarioId, scenarioName)
  -> guard: if (!isAnalyticsEnabled) return
  -> amplitude.track("scenario_run_triggered", { scenario_id, scenario_name })

trackScenarioRunCompleted({ scenarioId, scenarioName, status, runtimeHealth, durationMs })
  -> guard: if (!isAnalyticsEnabled) return
  -> amplitude.track("scenario_run_completed", { ... })

trackRunHistorySelected({ scenarioId, scenarioName, status })
  -> guard: if (!isAnalyticsEnabled) return
  -> amplitude.track("run_history_selected", { ... })
```

Call sites:

```text
main.tsx
  -> initAmplitude()   (once, before React renders)

App.tsx loadDashboard()
  -> trackDashboardLoaded(scenarioList.length, runHistory.length)

App.tsx handleRunScenario()
  -> trackScenarioRunTriggered(scenarioId, scenarioName)   (before the POST)
  -> trackScenarioRunCompleted({ ..., durationMs })        (after run persists)

App.tsx handleSelectRun()
  -> trackRunHistorySelected({ scenarioId, scenarioName, status })
```

Design rules:

```text
- Session replay is intentionally excluded. Only structured events are tracked.
- @amplitude/plugin-session-replay-browser is not a project dependency.
- autocapture is disabled — only explicit track() calls fire.
- VITE_AMPLITUDE_API_KEY is optional; missing key = complete no-op, no errors.
- isAnalyticsEnabled is the single source of truth for SDK readiness.
```

Environment variable:

```text
VITE_AMPLITUDE_API_KEY — baked into the React bundle at build time by Vite.
If it changes, rebuild the production frontend image.
```

---

## 16. Phase 33/35 Kubernetes Architecture

Phase 33 added local deployment manifests under `k8s/`. Phase 35 moved them into a Kustomize base and overlays.

Kubernetes resource flow:

```text
k8s/base/00-namespace.yml
  -> Namespace minirtos

k8s/base/01-postgres-secret.yml
  -> DB name/user/password

k8s/base/02-backend-configmap.yml
  -> datasource URL
  -> runtime/analyzer paths
  -> logs/runs directories

k8s/base/03-postgres-statefulset.yml
  -> ClusterIP Service minirtos-postgres:5432
  -> PVC minirtos-postgres-data
  -> StatefulSet minirtos-postgres

k8s/base/04-backend-deployment.yml
  -> ClusterIP Service minirtos-backend:8081
  -> NodePort Service localhost:30081 for local kind
  -> readinessProbe /actuator/health/readiness
  -> livenessProbe /actuator/health/liveness
  -> PVC-backed /app/runs
  -> emptyDir /app/logs

k8s/base/05-frontend-deployment.yml
  -> ClusterIP Service minirtos-frontend:80
  -> NodePort Service localhost:30080 for local kind
  -> readinessProbe /health
  -> livenessProbe /health

k8s/overlays/local
  -> local image tags and IfNotPresent pull policy

k8s/overlays/ghcr
  -> ghcr.io/amanahmed2002/minirtos-linux images
```

Important deployment assumption:

```text
The frontend image must be built ahead of time with `VITE_API_BASE_URL` set for the target routing mode: `http://localhost:30081` for local kind split-origin access, or an empty value for EKS ALB single-origin access.
```

---

## 17. Phase 36 AWS EKS Architecture

Terraform provisions the AWS infrastructure under `terraform/environments/dev` using reusable `vpc` and `eks` modules.

Infrastructure shape:

```text
terraform/environments/dev
  -> module.vpc
       -> VPC
       -> Internet Gateway
       -> public subnets in us-east-1a/us-east-1b
       -> public route table
  -> module.eks
       -> EKS control plane: minirtos-eks
       -> managed node group: 2x t3.small
       -> EKS OIDC provider
       -> EBS CSI IAM role for kube-system/ebs-csi-controller-sa
       -> aws-ebs-csi-driver addon
       -> AWS Load Balancer Controller IAM policy and IRSA role
```

Kubernetes deployment shape:

```text
kubectl apply -f k8s/aws/storageclass-gp3.yml
kubectl apply -k k8s/overlays/ghcr

minirtos namespace
  -> minirtos-postgres StatefulSet
       -> gp3 EBS-backed PVC
  -> minirtos-backend Deployment
       -> ClusterIP 8081
       -> local/kind NodePort 30081
       -> ALB target for /api paths
  -> minirtos-frontend Deployment
       -> ClusterIP 80
       -> local/kind NodePort 30080
       -> ALB target for / paths
```

For EKS ALB routing, build the frontend with `VITE_API_BASE_URL=` so browser calls use relative `/api` paths on the same ALB origin. Local kind still uses `VITE_API_BASE_URL=http://localhost:30081` with frontend NodePort `http://localhost:30080`.

Phase 37 should harden this path with HTTPS, DNS, immutable image tags, and remote Terraform state.
