# MiniRTOS Playground Frontend

React + TypeScript dashboard for MiniRTOS Playground.

---

## Current Phase

Phase 29 — Educational Modules and Visualizers.

Phase 28 added the React Dashboard MVP. Phase 29 expanded it into a more student-friendly learning dashboard by adding guided scenario education and CSS-based visualizations.

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

---

## Requirements

```text
Node.js 22+
npm
Spring Boot backend running on localhost:8081
PostgreSQL running through Docker Compose
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

---

## Run Locally

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

Phase 29 did not require new backend endpoints.

---

## Manual Verification

Expected after running the backend and frontend:

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

---

## Docker

Run through Docker Compose:

```bash
docker compose up --build frontend
```

Open:

```text
http://localhost:5173
```

---

## Troubleshooting

### Dashboard says Failed to fetch

Check:

```bash
cat frontend/.env
```

Expected:

```env
VITE_API_BASE_URL=http://localhost:8081
```

Then restart Vite:

```bash
npm run dev
```

Also check backend:

```bash
curl -i http://localhost:8081/api/scenarios
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
Vitest + React Testing Library
More detailed scheduler visualizer
Dedicated learn pages
Frontend screenshot documentation
Production frontend Dockerfile
Nginx static asset serving for production image
```
