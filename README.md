# MiniRTOS-Linux / MiniRTOS Playground

**Original Project:** Embedded Runtime Simulator with AI-Based Fault Detection  
**Full-Stack Evolution:** MiniRTOS Playground — Full-Stack Embedded Systems Learning Platform

MiniRTOS-Linux is a software-only C++20 embedded runtime simulator that models periodic tasks, bounded message queues, configurable fault injection, task-crash simulation, watchdog monitoring, structured JSONL telemetry, Python-based runtime analysis, AI-style anomaly detection, synthetic training-dataset generation, a trained lightweight ML anomaly classifier, automated tests, Dockerized demos, benchmark reporting, a Java/Spring Boot backend with persistent PostgreSQL run history, and a React/TypeScript dashboard MVP.

MiniRTOS Playground extends the project into a full-stack educational platform for students learning embedded systems, RTOS concepts, runtime telemetry, scheduling, queues, faults, watchdog behavior, Docker, Kubernetes, and ML-based anomaly detection.

---

## Current Status

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed the Run Orchestration API. Phase 27 completed PostgreSQL/Flyway run storage. Phase 28 added the React Dashboard MVP implementation plan/code, frontend Docker integration, and local frontend/backend debugging notes.

Current verified backend behavior:

- `GET /api/health` works.
- `GET /api/scenarios` works.
- `POST /api/runs` runs trusted scenarios through the C++ runtime and Python analyzer.
- `GET /api/runs` returns persisted run summaries from PostgreSQL.
- `GET /api/runs/{runId}` returns one persisted run.
- `GET /api/runs/{runId}/analysis` returns persisted parsed analyzer data.
- `queue_overflow` returns `status=COMPLETED`, `runtimeHealth=WARNING`, and `errorMessage=null`.
- Run history survives backend restarts.

Current frontend behavior added in Phase 28:

- Vite + React + TypeScript dashboard under `frontend/`.
- Scenario selector using `GET /api/scenarios`.
- Run trigger using `POST /api/runs`.
- Persisted history using `GET /api/runs`.
- Analyzer panel using `GET /api/runs/{runId}/analysis`.
- Student-friendly scenario details, expected signals, task metrics, message summaries, root causes, and raw report display.
- Local frontend runs on `http://localhost:5173`.
- Backend API base URL should be `http://localhost:8081`.

Important local decisions:

- Backend uses Java 17.
- Backend runs on port `8081` because local Nginx uses `8080`.
- Frontend uses Node 22+ because current Vite tooling may fail on older Node 18 releases.
- Database persistence uses PostgreSQL, Spring Data JPA, and Flyway.
- The backend accepts only known scenario IDs and never accepts arbitrary config paths.

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
| Frontend | React/TypeScript dashboard MVP |
| Testing | GoogleTest, CTest, pytest, Spring Boot tests, repository tests, frontend build/typecheck |
| Docker | Runtime, analyzer, ML, backend, PostgreSQL, and frontend services |

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
  │     -> GET  /api/scenarios
  │     -> POST /api/runs
  │     -> GET  /api/runs
  │     -> GET  /api/runs/{runId}
  │     -> GET  /api/runs/{runId}/analysis
  └── React/TypeScript Frontend
        -> scenario selector
        -> run trigger
        -> persisted run history
        -> analyzer summary display
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
curl http://localhost:8081/api/scenarios
```

Run a scenario:

```bash
curl -X POST http://localhost:8081/api/runs   -H "Content-Type: application/json"   -d '{"scenarioId":"queue_overflow"}'
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

## Quick Start — Frontend Dashboard

The frontend API base URL should be:

```env
VITE_API_BASE_URL=http://localhost:8081
```

Run locally:

```bash
cd frontend
npm install
npm run build
npm run dev
```

Open:

```text
http://localhost:5173
```

Expected:

- Scenario list loads.
- You can select a scenario.
- The run button calls the backend.
- Latest run card updates.
- Persisted history appears.
- Completed runs can load analyzer details.

Troubleshooting:

- If the dashboard shows `Failed to fetch`, confirm the backend is running on `http://localhost:8081`.
- Do not use `https://localhost:8081`; local Spring Boot/Tomcat is running plain HTTP.
- If backend logs show invalid HTTP method bytes like `0x16 0x03 0x01`, something is sending HTTPS/TLS to the HTTP port.

---

## Backend API

### `GET /api/health`

Returns service health.

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

## Docker

Run backend with PostgreSQL:

```bash
docker compose up --build backend
```

Run frontend with backend dependency:

```bash
docker compose up --build frontend
```

Test backend:

```bash
curl http://localhost:8081/api/health
curl http://localhost:8081/api/scenarios
curl -X POST http://localhost:8081/api/runs   -H "Content-Type: application/json"   -d '{"scenarioId":"queue_overflow"}'
curl http://localhost:8081/api/runs
```

Open frontend:

```text
http://localhost:5173
```

Run full existing demo:

```bash
docker compose up --build demo
```

---

## Documentation

| Document | Purpose |
|---|---|
| `docs/architecture.md` | Runtime/analyzer/ML/backend/PostgreSQL/frontend architecture |
| `docs/testing.md` | C++/Python/ML/backend/database/frontend testing |
| `docs/fault-injection.md` | Fault modes, telemetry, backend API, and frontend learning use |
| `docs/anomaly-detector.md` | Analyzer, anomaly, dataset, ML, backend, and frontend analysis flow |
| `docs/performance-results.md` | Runtime/fault/benchmark results and dashboard verification notes |
| `docs/docker-phase28-update-notes.md` | Phase 28 Docker/frontend/backend notes |
| `backend/README.md` | Backend-specific setup and API documentation |
| `frontend/README.md` | Frontend-specific setup and dashboard documentation |

---

## Next Phase

```text
Phase 29 — Educational Modules and Visualizers
```

Phase 29 should build on the React dashboard by adding concept pages, guided learning cards, scheduler timeline visualization, queue pressure charts, fault explanation panels, and more polished student-facing learning flows.
