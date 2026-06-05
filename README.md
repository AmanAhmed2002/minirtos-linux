# MiniRTOS-Linux / MiniRTOS Playground

**Original Project:** Embedded Runtime Simulator with AI-Based Fault Detection  
**Full-Stack Evolution:** MiniRTOS Playground — Full-Stack Embedded Systems Learning Platform  
**Current Phase:** Phase 30 — Full-Stack Docker Compose Hardening  
**Updated:** June 5, 2026

MiniRTOS-Linux is a software-only C++20 embedded runtime simulator that models periodic tasks, bounded message queues, configurable fault injection, task-crash simulation, watchdog monitoring, structured JSONL telemetry, Python-based runtime analysis, AI-style anomaly detection, synthetic training-dataset generation, a trained lightweight ML anomaly classifier, automated tests, Dockerized demos, benchmark reporting, a Java/Spring Boot backend with persistent PostgreSQL run history, and a React/TypeScript educational dashboard.

MiniRTOS Playground extends the project into a full-stack educational platform for students learning embedded systems, RTOS concepts, runtime telemetry, scheduling, queues, faults, watchdog behavior, Docker, Kubernetes, and ML-based anomaly detection.

---

## Current Status

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed the Run Orchestration API. Phase 27 completed PostgreSQL/Flyway run storage. Phase 28 added the React Dashboard MVP, frontend Docker integration, and local frontend/backend debugging notes. Phase 29 added educational modules and visualizers to the React dashboard. Phase 30 hardened Docker Compose and Dockerfiles for backend, dev frontend, and production frontend workflows.

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

Important local decisions:

- Backend uses Java 17.
- Backend runs on port `8081` because local Nginx uses `8080`.
- Frontend uses Node 22+ because current Vite tooling may fail on older Node 18 releases.
- Database persistence uses PostgreSQL, Spring Data JPA, and Flyway.
- The backend accepts only known scenario IDs and never accepts arbitrary config paths.
- Phase 29 visualizers are CSS-based and add no new chart dependency.
- Phase 30 production frontend uses Nginx, which listens on container port `80`.
- Phase 30 dev frontend uses Vite, which listens on container port `5173`.

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
| Testing | GoogleTest, CTest, pytest, Spring Boot tests, repository tests, frontend build/typecheck |
| Docker | Runtime, analyzer, ML, backend, PostgreSQL, dev frontend, and production frontend services |

---

## Architecture

```text
Docker Compose
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
```

Future architecture:

```text
React/TypeScript Frontend
  -> Java Spring Boot API
  -> PostgreSQL
  -> C++ Runtime
  -> Python Analyzer + ML Predictor
  -> Docker/Kubernetes deployment
  -> Terraform/cloud infrastructure
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

Allowed local origins should include:

```text
http://localhost:5173
http://127.0.0.1:5173
http://localhost:3000
http://127.0.0.1:3000
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
3. Backend CORS does not include `http://localhost:3000`.
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
| `backend/README.md` | Backend-specific setup and API documentation |
| `frontend/README.md` | Frontend-specific setup and dashboard documentation |

---

## Next Phase

```text
Phase 31 — Frontend Automated Tests
```

Recommended scope:

```text
Vitest
React Testing Library
jsdom
Scenario selector tests
Run button tests
Run history tests
Analysis panel tests
Learning panel tests
Queue pressure visualizer tests
Task timeline tests
Fault/health explanation tests
Failed fetch and empty-state tests
```
