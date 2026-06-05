# MiniRTOS Playground Frontend

React + TypeScript dashboard for MiniRTOS Playground.

**Updated:** June 5, 2026  
**Current Phase:** Phase 30 — Full-Stack Docker Compose Hardening

---

## Current Phase

Phase 28 added the React Dashboard MVP. Phase 29 expanded it into a more student-friendly learning dashboard by adding guided scenario education and CSS-based visualizations. Phase 30 added separate dev and production Docker frontend workflows.

The frontend can now run in two supported modes:

```text
Development frontend:
  Vite dev server
  http://localhost:5173

Production frontend:
  Nginx static server
  http://localhost:3000
```

---

## Features

- Fetch scenarios from the Spring Boot backend.
- Select a scenario.
- Trigger a backend-orchestrated MiniRTOS simulation run.
- Display latest run status and runtime health.
- Display persisted PostgreSQL-backed run history.
- Load parsed analyzer summaries for completed runs.
- Show task metrics, message drops, root causes, and raw analyzer output.
- Show guided learning modules for the selected scenario.
- Explain concepts such as periodic tasks, bounded queues, priority scheduling, EDF scheduling, queue pressure, CPU spikes, task crashes, slow tasks, dropped messages, and watchdog escalation.
- Display a queue pressure visualizer using analyzer message summary data.
- Display a task runtime timeline using analyzer task metrics.
- Display a fault and health explanation panel using runtime health and root causes.
- Run through Vite for active development.
- Run through Nginx for production-style Docker verification.
- Expose `/health` in the production Nginx container.

---

## Requirements

```text
Node.js 22+
npm
Spring Boot backend running on localhost:8081
PostgreSQL running through Docker Compose
Docker / Docker Compose for container workflows
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
```

Important:

```text
Use http://localhost:8081, not https://localhost:8081.
```

Local Spring Boot runs plain HTTP.

Production build note:

```text
VITE_API_BASE_URL is baked into the built React bundle by Vite.
If VITE_API_BASE_URL changes, rebuild the production frontend image.
```

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

## Phase 28 Files

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

---

## Phase 29 Files

New files:

```text
frontend/src/content/learningContent.ts
frontend/src/components/LearningModulePanel.tsx
frontend/src/components/QueuePressureChart.tsx
frontend/src/components/TaskTimeline.tsx
frontend/src/components/FaultExplanationPanel.tsx
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

## Component Responsibilities

| Component | Purpose |
|---|---|
| `DashboardHeader` | Displays the dashboard title and project/phase context. |
| `ScenarioSelector` | Lists backend scenarios and triggers selected run creation. |
| `LearningModulePanel` | Shows guided educational content based on selected scenario. |
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
```

Phase 29 and Phase 30 did not require new backend endpoints.

---

## Manual Verification

Expected after running the backend and either frontend mode:

```text
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

Recommended next frontend work:

```text
Phase 31 — Frontend Automated Tests
Vitest
React Testing Library
jsdom
Scenario selector tests
Run button tests
Run history tests
Analysis panel tests
Learning module tests
Queue pressure visualizer tests
Task timeline tests
Fault/health explanation tests
Failed fetch and empty state tests
```
