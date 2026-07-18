# MiniRTOS Playground Frontend

React + TypeScript learning application for MiniRTOS Playground.

**Updated:** June 26, 2026
**Current Phase:** Phase 41 — Routed learning platform and AWS deployment automation

---

## Current Phase

Phase 28 added the React Dashboard MVP. Phase 29 expanded it into a more student-friendly learning dashboard by adding guided scenario education and CSS-based visualizations. Phase 30 added separate dev and production Docker frontend workflows. Phase 31 added frontend automated tests with Vitest and React Testing Library. Phase 32 added Amplitude event tracking with a safe `isAnalyticsEnabled` guard. Phase 33 added a local Kubernetes deployment path using frontend and backend NodePorts. Phase 36 added EKS deployment support where the frontend can use relative `/api` calls behind one ALB origin. Phase 38 kept that frontend behavior and hardened AWS deployment by using immutable Git SHA image tags instead of `latest`. Phase 39 verified the same-origin frontend over HTTPS at `https://app.minirtos.biz`. Phase 40 added the manual GitHub Actions AWS deployment path and RDS-backed AWS persistence. Phase 41 refactored the frontend into a React Router application with Home, Learn, Lesson Detail, Simulator, Runs, Analysis, and Glossary pages backed by shared `MiniRtosDataProvider` state.

The frontend can now run in four supported modes:

```text
Development frontend:
  Vite dev server
  http://localhost:5173

Production frontend:
  Nginx static server
  http://localhost:3000

Kubernetes frontend:
  local kind NodePort service
  http://localhost:30080

EKS frontend:
  ALB HTTPS custom-domain origin
  https://app.minirtos.biz/
```

---

## Features

- Route between Home, Learn, Lesson Detail, Simulator, Runs, Analysis, and Glossary pages.
- Keep scenarios, runs, selected run, and analysis in shared `MiniRtosDataProvider` state across routes.
- Fetch scenarios from the Spring Boot backend.
- Select a scenario.
- Trigger a backend-orchestrated MiniRTOS simulation run.
- Display latest run status and runtime health.
- Display persisted PostgreSQL-backed run history.
- Load parsed analyzer summaries for completed runs.
- Retrieve saved runtime log content through `GET /api/runs/{runId}/logs`.
- Show task metrics, message drops, root causes, and raw analyzer output.
- Show guided learning modules for the selected scenario.
- Provide a beginner lesson catalog, lesson detail pages, glossary entries, and tooltip definitions.
- Explain concepts such as periodic tasks, bounded queues, priority scheduling, EDF scheduling, queue pressure, CPU spikes, task crashes, slow tasks, dropped messages, and watchdog escalation.
- Display a queue pressure visualizer using analyzer message summary data.
- Display a task runtime timeline using analyzer task metrics.
- Display a fault and health explanation panel using runtime health and root causes.
- Run through Vite for active development.
- Run through Nginx for production-style Docker verification.
- Expose `/health` in the production Nginx container.
- Track key user actions via Amplitude when `VITE_AMPLITUDE_API_KEY` is configured: `dashboard_loaded`, `scenario_run_triggered`, `scenario_run_completed`, and `run_history_selected`. All tracking is a no-op without the key — safe for local dev, CI, and test environments.
- Run through a local Kubernetes NodePort on `http://localhost:30080` when the production image is built for the local Kubernetes backend URL.
- Run behind an EKS ALB with relative `/api` calls at `https://app.minirtos.biz` when the production image is built with an empty `VITE_API_BASE_URL`.
- Deploy to AWS by Git SHA tag through `scripts/deploy_aws_release.sh`; local GHCR testing can still use `latest`.

---

## Requirements

```text
Node.js 22+
npm
Spring Boot backend running on localhost:8081
PostgreSQL running through Docker Compose
Docker / Docker Compose for container workflows
kubectl and kind for local Kubernetes workflow
```

---

## Environment

Create or update:

```text
frontend/.env
```

Expected content:

```env
VITE_API_BASE_URL=http://localhost:8081
VITE_AMPLITUDE_API_KEY=your_amplitude_browser_api_key
```

Important:

```text
Use http://localhost:8081, not https://localhost:8081.
```

Local Spring Boot runs plain HTTP.

`VITE_AMPLITUDE_API_KEY` is optional. Omitting it disables all Amplitude tracking silently — no SDK calls are made and no errors are thrown.

Production build note:

```text
Both VITE_API_BASE_URL and VITE_AMPLITUDE_API_KEY are baked into the built
React bundle by Vite. If either value changes, rebuild the production frontend image.
```

For the local Kubernetes workflow, build the production image with:

```env
VITE_API_BASE_URL=http://localhost:30081
```

For the EKS ALB/HTTPS workflow, build the production image with:

```env
VITE_API_BASE_URL=
```

In AWS, use the image tag produced for the selected Git commit rather than relying on `latest`. The current production browser origin is `https://app.minirtos.biz`, and API requests should resolve to paths such as `https://app.minirtos.biz/api/scenarios`.

The Kubernetes manifests do not override this value at runtime.

---

## Run Locally Without Frontend Docker

From repo root:

```bash
docker compose up -d postgres
cd backend
mvn spring-boot:run
```

Then in another terminal:

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

---

## Run Dev Frontend Through Docker

Use this for active development and Vite dev server behavior:

```bash
docker compose down --remove-orphans
docker compose up -d postgres
docker compose up -d backend
docker compose up --build frontend
```

Open:

```text
http://localhost:5173
```

If your Compose file uses a separate dev profile/service:

```bash
docker compose --profile dev up --build frontend-dev
```

Open:

```text
http://localhost:5173
```

Expected dev behavior:

```text
Vite logs show the local URL.
Frontend uses port 5173.
Backend calls go to http://localhost:8081.
```

---

## Run Production Frontend Through Docker

Use this for Phase 30 production-style verification:

```bash
docker compose down --remove-orphans
mkdir -p logs runs reports/generated models

docker compose up -d postgres
docker compose build --no-cache backend
docker compose up -d backend

docker compose --profile prod build --no-cache frontend-prod
docker compose --profile prod up -d frontend-prod
```

Open:

```text
http://localhost:3000
```

Check production frontend health:

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
Production frontend uses Nginx.
Nginx listens on container port 80.
Correct production port mapping is 3000:80.
Do not map production Nginx as 5173:5173.
```

---

## Run Frontend Through Local Kubernetes

Build the production frontend image for the Kubernetes backend URL:

```bash
docker build \
  -f docker/Dockerfile.frontend \
  --target production \
  --build-arg VITE_API_BASE_URL=http://localhost:30081 \
  -t minirtos-playground-frontend:phase32 .
```

Create the cluster and load the image:

```bash
kind create cluster --config k8s/kind/kind-config.yml
kind load docker-image minirtos-playground-frontend:phase32 --name minirtos
```

Apply the local Kustomize overlay:

```bash
kubectl apply -k k8s/overlays/local
```

Open:

```text
http://localhost:30080
```

Healthcheck:

```bash
curl -i http://localhost:30080/health
```

Important:

```text
Frontend NodePort: http://localhost:30080
Backend NodePort:  http://localhost:30081
If the frontend image was built with http://localhost:8081 instead of http://localhost:30081, browser API calls will target the wrong backend URL.
```

---

## Phase 28/41 Files

```text
frontend/package.json
frontend/.env
frontend/.env.example
frontend/README.md
frontend/src/types/api.ts
frontend/src/api/minirtosApi.ts
frontend/src/components/DashboardHeader.tsx
frontend/src/components/AppNav.tsx
frontend/src/context/MiniRtosDataContext.tsx
frontend/src/context/miniRtosData.ts
frontend/src/pages/HomePage.tsx
frontend/src/pages/LearnPage.tsx
frontend/src/pages/LessonDetailPage.tsx
frontend/src/pages/SimulatorPage.tsx
frontend/src/pages/RunsPage.tsx
frontend/src/pages/AnalysisPage.tsx
frontend/src/pages/GlossaryPage.tsx
frontend/src/data/lessonCatalog.ts
frontend/src/data/glossary.ts
frontend/src/components/ScenarioSelector.tsx
frontend/src/components/RunResultCard.tsx
frontend/src/components/RunHistory.tsx
frontend/src/components/AnalysisPanel.tsx
frontend/src/App.tsx
frontend/src/App.css
frontend/src/index.css
frontend/src/main.tsx
```

---

## Phase 29/41 Learning Files

New files:

```text
frontend/src/content/learningContent.ts
frontend/src/components/LearningModulePanel.tsx
frontend/src/components/QueuePressureChart.tsx
frontend/src/components/TaskTimeline.tsx
frontend/src/components/FaultExplanationPanel.tsx
frontend/src/components/LessonCard.tsx
frontend/src/components/ScenarioConceptCard.tsx
frontend/src/components/TooltipTerm.tsx
frontend/src/components/BeginnerSummary.tsx
frontend/src/components/AnalysisExplanationPanel.tsx
```

Updated files:

```text
frontend/src/App.tsx
frontend/src/App.css
frontend/src/components/AnalysisPanel.tsx
```

---

## Phase 30 Docker Files

```text
docker/Dockerfile.frontend
docker/nginx.frontend.conf
docker-compose.yml
backend/src/main/java/com/minirtos/playground/config/CorsConfig.java
```

Phase 30 frontend Docker requirements:

```text
- Node 22 base image for frontend build/dev stages.
- Dev target runs Vite on 0.0.0.0:5173.
- Production target builds static assets.
- Nginx production stage serves /usr/share/nginx/html.
- Nginx config supports SPA fallback with try_files.
- Nginx exposes /health.
```

---

## Phase 31 Files

New files:

```text
frontend/src/test/setupTests.ts
frontend/src/components/__tests__/DashboardHeader.test.tsx
frontend/src/components/__tests__/ScenarioSelector.test.tsx
frontend/src/components/__tests__/RunHistory.test.tsx
frontend/src/components/__tests__/AnalysisPanel.test.tsx
```

---

## Phase 32 Analytics Files

New files:

```text
frontend/src/analytics/amplitude.ts
```

Updated files:

```text
frontend/src/main.tsx       — calls initAmplitude() once at app entry
frontend/src/App.tsx        — calls trackDashboardLoaded, trackScenarioRunTriggered,
                              trackScenarioRunCompleted, trackRunHistorySelected
frontend/package.json       — adds @amplitude/analytics-browser; removes session replay package
frontend/vite.config.ts     — removes redundant triple-slash reference (lint fix)
```

Phase 32 analytics design rules:

```text
- initAmplitude() only initializes the SDK when VITE_AMPLITUDE_API_KEY is present.
- isAnalyticsEnabled flag is set to true only after a successful amplitude.init().
- Every track* function checks isAnalyticsEnabled before any SDK call.
- Session replay is intentionally excluded — only structured event tracking is used.
- The @amplitude/plugin-session-replay-browser package is not a dependency.
```

---

## Phase 33/35 Kubernetes Files

Kubernetes base files:

```text
k8s/base/00-namespace.yml
k8s/base/01-postgres-secret.yml
k8s/base/02-backend-configmap.yml
k8s/base/03-postgres-statefulset.yml
k8s/base/04-backend-deployment.yml
k8s/base/05-frontend-deployment.yml
k8s/base/kustomization.yaml
k8s/kind/kind-config.yml
```

Kustomize overlays:

```text
k8s/overlays/local/kustomization.yaml
k8s/overlays/ghcr/kustomization.yaml
```

Updated file:

```text
backend/src/main/java/com/minirtos/playground/config/CorsConfig.java
```

---

## Component Responsibilities

| Component | Purpose |
|---|---|
| `AppNav` | Provides primary navigation across Home, Learn, Simulator, Runs, Analysis, and Glossary. |
| `DashboardHeader` | Displays dashboard context where used by simulator-oriented views. |
| `ScenarioSelector` | Lists backend scenarios and triggers selected run creation. |
| `LearningModulePanel` | Shows guided educational content based on selected scenario. |
| `LessonCard` | Presents each lesson module and its scenario action on the Learn page. |
| `TooltipTerm` | Shows glossary-backed term definitions inline. |
| `AnalysisExplanationPanel` | Adds beginner-readable interpretation before the detailed analyzer panel. |
| `RunResultCard` | Displays the latest run status, health, and paths. |
| `RunHistory` | Displays persisted PostgreSQL-backed run history. |
| `AnalysisPanel` | Displays parsed analyzer output and composes the Phase 29 visualizers. |
| `QueuePressureChart` | Visualizes received vs dropped messages and queue-full vs fault-injected drops. |
| `TaskTimeline` | Visualizes task max duration and deadline-miss risk. |
| `FaultExplanationPanel` | Explains runtime health and root causes in student-friendly language. |

---

## API Usage

The frontend calls:

```text
GET  /api/scenarios
POST /api/runs
GET  /api/runs
GET  /api/runs/{runId}/analysis
GET  /api/runs/{runId}/logs
```

Phase 41 added the run-log endpoint; the routed pages otherwise continue to use the existing scenario, run, and analysis APIs.

---

## Manual Verification

Expected after running the backend and either frontend mode:

```text
Home, Learn, Simulator, Runs, Analysis, and Glossary routes render.
Scenario dropdown loads.
Guided Learning panel changes when scenario selection changes.
Run selected scenario button works.
Latest run result card updates.
Persisted history loads.
Clicking a completed run loads analyzer summary.
Queue pressure visualizer appears when messageSummary exists.
Task runtime timeline appears when taskMetrics exists.
Fault/health explanation panel appears when analysis loads.
Raw analyzer report can still be expanded.
A completed run's runtime log can be requested through the frontend API layer.
```

Recommended scenario for verification:

```text
queue_overflow
```

Expected queue-overflow interpretation:

```text
runtimeHealth=WARNING
queueFullDrops > 0
faultInjectedDrops = 0
```

---

## Build Commands

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

Docker build commands:

```bash
docker build -f docker/Dockerfile.frontend --target dev -t minirtos-frontend-dev .

docker build \
  -f docker/Dockerfile.frontend \
  --target production \
  --build-arg VITE_API_BASE_URL=http://localhost:8081 \
  -t minirtos-frontend-prod .

docker build \
  -f docker/Dockerfile.frontend \
  --target production \
  --build-arg VITE_API_BASE_URL=http://localhost:30081 \
  -t minirtos-playground-frontend:phase32 .
```

---

## Troubleshooting

### Production container starts but Docker logs appear stuck

This is normal for Nginx.

Nginx logs may show:

```text
Configuration complete; ready for start up
start worker process
```

That means Nginx is running and waiting for requests.

Open:

```text
http://localhost:3000
```

### Production frontend does not load

Check port mapping:

```bash
docker ps
```

Expected production mapping:

```text
0.0.0.0:3000->80/tcp
```

If you see:

```text
0.0.0.0:5173->5173/tcp
```

but the container is running Nginx, the mapping is wrong.

### Dashboard says Failed to Fetch in production

Check backend:

```bash
curl -i http://localhost:8081/actuator/health
curl -i http://localhost:8081/api/scenarios
```

Check production CORS:

```bash
curl -i -X OPTIONS http://localhost:8081/api/scenarios \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

Expected:

```text
Access-Control-Allow-Origin: http://localhost:3000
```

Check built bundle API URL:

```bash
docker exec -it minirtos-playground-frontend-prod sh -c \
  "grep -R 'localhost:8081' -n /usr/share/nginx/html/assets || true"
```

### Kubernetes frontend loads but API calls fail

Confirm the frontend image was built with the correct API base for the routing mode:

```text
Local kind: VITE_API_BASE_URL=http://localhost:30081
EKS ALB:    VITE_API_BASE_URL=
```

Confirm backend CORS:

```bash
curl -i -X OPTIONS http://localhost:30081/api/scenarios \
  -H "Origin: http://localhost:30080" \
  -H "Access-Control-Request-Method: GET"
```

Expected:

```text
Access-Control-Allow-Origin: http://localhost:30080
```

### Backend logs invalid HTTP method bytes

If backend logs show bytes like:

```text
0x16 0x03 0x01
```

then the browser or frontend is sending HTTPS/TLS to the HTTP backend. Use:

```text
http://localhost:8081
```

---

## Next Frontend Work

```text
Phase 42 — Progress tracking, richer lesson checks, and production operations polish
```

Completed recent frontend phases:

```text
Phase 31 — Frontend Automated Tests
  Vitest + React Testing Library + jsdom
  Component tests for DashboardHeader, ScenarioSelector,
  RunHistory, and AnalysisPanel

Phase 32 — Amplitude Analytics
  src/analytics/amplitude.ts
  initAmplitude() + isAnalyticsEnabled guard
  trackDashboardLoaded, trackScenarioRunTriggered,
  trackScenarioRunCompleted, trackRunHistorySelected
  Requires VITE_AMPLITUDE_API_KEY in .env

Phase 33 — Local Kubernetes Deployment
  k8s manifests and kind config
  frontend NodePort at localhost:30080
  backend NodePort at localhost:30081
  production frontend image must be rebuilt for the Kubernetes API URL

Phase 41 — Routed Learning Platform
  React Router routes for Home, Learn, Lesson Detail, Simulator, Runs,
  Analysis, and Glossary; shared MiniRtosDataProvider state; lesson
  catalog; glossary; tooltip definitions; beginner analysis explanations
  and run-log API support
```
