# Phase 29 Frontend Educational Modules and Visualizer Update Notes

## Current Status

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed the Run Orchestration API. Phase 27 completed PostgreSQL/Flyway run persistence. Phase 28 added the React Dashboard MVP and frontend Docker integration. Phase 29 added educational modules and visualizers to the React dashboard.

Phase 29 changed the frontend from a dashboard that only displayed analyzer data into a more student-facing learning experience.

---

## 1. What Changed

Before Phase 29:

```text
React dashboard could load scenarios.
React dashboard could run simulations.
React dashboard could show persisted history.
React dashboard could show analyzer summary, task metrics, message summary, root causes, and raw report.
```

After Phase 29:

```text
React dashboard shows guided scenario learning content.
React dashboard explains embedded concepts by selected scenario.
React dashboard visualizes queue pressure.
React dashboard visualizes task runtime and deadline risk.
React dashboard explains runtime health and analyzer root causes.
React dashboard remains dependency-light with CSS-based visualizers.
```

---

## 2. New Frontend Files

```text
frontend/src/content/learningContent.ts
frontend/src/components/LearningModulePanel.tsx
frontend/src/components/QueuePressureChart.tsx
frontend/src/components/TaskTimeline.tsx
frontend/src/components/FaultExplanationPanel.tsx
```

Updated:

```text
frontend/src/App.tsx
frontend/src/App.css
frontend/src/components/AnalysisPanel.tsx
```

---

## 3. New Learning Features

### `LearningModulePanel`

Displays scenario-specific educational cards.

Example concepts:

```text
periodic tasks
bounded queues
priority scheduling
earliest-deadline-first scheduling
queue pressure
CPU timing pressure
task failure isolation
deadline misses
fault-injected message loss
watchdog monitoring
```

### `learningContent.ts`

Stores scenario-specific learning content and helper functions:

```text
getScenarioLearningContent()
getRuntimeHealthExplanation()
getRootCauseExplanation()
```

---

## 4. New Visualizers

### `QueuePressureChart`

Uses:

```text
messageSummary.sent
messageSummary.received
messageSummary.dropped
messageSummary.queueFullDrops
messageSummary.faultInjectedDrops
```

Displays:

```text
received vs dropped message bars
queue-full share of drops
fault-injected share of drops
student note explaining the difference
```

### `TaskTimeline`

Uses:

```text
taskMetrics[taskName].runs
taskMetrics[taskName].deadlineMisses
taskMetrics[taskName].avgDurationMs
taskMetrics[taskName].maxDurationMs
```

Displays:

```text
task duration bars
runs per task
deadline misses per task
max duration per task
highlighting for deadline risk
```

### `FaultExplanationPanel`

Uses:

```text
analysis.runtimeHealth
analysis.scenarioId
analysis.simulationName
analysis.rootCauses
```

Displays:

```text
scenario fault summary
runtime health explanation
root-cause teaching notes
```

---

## 5. Dependency and Docker Impact

Phase 29 added no new npm dependencies.

No Docker Compose change is required.

Reason:

```text
The visualizers are implemented with React components and CSS.
No chart library was added.
No backend endpoint changed.
No database schema changed.
```

Existing frontend Docker service remains valid:

```yaml
frontend:
  build:
    context: .
    dockerfile: docker/Dockerfile.frontend
  container_name: minirtos-playground-frontend
  ports:
    - "5173:5173"
  environment:
    VITE_API_BASE_URL: http://localhost:8081
  depends_on:
    - backend
  volumes:
    - ./frontend:/app/frontend
    - /app/frontend/node_modules
```

---

## 6. Verification

Start backend stack:

```bash
docker compose up -d postgres
cd backend
mvn spring-boot:run
```

Run frontend locally:

```bash
cd frontend
npm install
npm run typecheck
npm run build
npm run dev
```

Or run frontend through Docker:

```bash
docker compose up --build frontend
```

Test backend:

```bash
curl -i http://localhost:8081/api/scenarios
curl -i http://localhost:8081/api/runs
```

Open frontend:

```text
http://localhost:5173
```

Expected Phase 29 behavior:

```text
Scenario dropdown loads.
Guided Learning panel changes with selected scenario.
Run selected scenario button works.
Latest run result card updates.
Persisted history loads.
Analysis panel loads for completed runs.
Queue pressure visualizer displays message summary.
Task timeline displays task metrics.
Fault/health explanation panel displays runtime health and root causes.
Raw analyzer report can be expanded.
```

User verification:

```text
Everything works.
Changes were committed and pushed to GitHub.
```

---

## 7. Troubleshooting

### Dashboard says Failed to fetch

Check:

```bash
cat frontend/.env
```

Expected:

```env
VITE_API_BASE_URL=http://localhost:8081
```

Restart Vite after changing `.env`:

```bash
cd frontend
npm run dev
```

Check backend:

```bash
curl -i http://localhost:8081/api/scenarios
```

### Backend logs invalid HTTP method bytes

If logs show bytes like:

```text
0x16 0x03 0x01
```

that means HTTPS/TLS traffic is being sent to the HTTP backend.

Fix:

```text
Use http://localhost:8081 everywhere for local backend calls.
```

---

## 8. Recommended `.gitignore`

```gitignore
# Runtime logs
logs/*
!logs/.gitkeep
*.jsonl

# Backend-generated run folders
runs/*
!runs/.gitkeep

# Generated reports
reports/generated/

# Generated ML artifacts
models/*
!models/.gitkeep
*.joblib
*.pkl

# Java / Maven
backend/target/
*.class

# Frontend
frontend/node_modules/
frontend/dist/
frontend/.env

# Docker/local overrides
docker-compose.override.yml
.env
.env.*
```

---

## 9. Next Docker Work

Phase 30 should improve full-stack Docker orchestration:

```text
frontend
backend
postgres
runtime/analyzer jobs or workers
```

Recommended future improvements:

- Add production frontend Dockerfile using `npm run build` and Nginx.
- Add frontend healthcheck.
- Add backend readiness dependency before frontend startup.
- Add Compose profile for dev vs production.
- Add CI Docker build smoke tests for frontend/backend images.
