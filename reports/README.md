# MiniRTOS-Linux / MiniRTOS Playground

**Original Project:** Embedded Runtime Simulator with AI-Based Fault Detection  
**Full-Stack Evolution:** MiniRTOS Playground — Full-Stack Embedded Systems Learning Platform

MiniRTOS-Linux is a software-only C++20 embedded runtime simulator that models periodic tasks, bounded message queues, configurable fault injection, task-crash simulation, watchdog monitoring, structured JSONL telemetry, Python-based runtime analysis, AI-style anomaly detection, synthetic training-dataset generation, a trained lightweight ML anomaly classifier, automated tests, Dockerized demos, benchmark reporting, and a Java Spring Boot backend API.

MiniRTOS Playground extends the project into a full-stack educational platform for students learning embedded systems, RTOS concepts, runtime telemetry, scheduling, queues, faults, watchdog behavior, Docker, Kubernetes, and ML-based anomaly detection.

## Current Status After This Chat

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 is now complete for the local backend MVP.

Phase 26 added the Run Orchestration API:

- `POST /api/runs`
- `GET /api/runs`
- `GET /api/runs/{runId}`
- `GET /api/runs/{runId}/analysis`
- trusted scenario-ID validation
- C++ runtime execution from Spring Boot
- unique per-run output folders under `runs/<runId>/`
- runtime log copying from `logs/runtime_logs.jsonl`
- Python analyzer execution from Spring Boot
- analyzer text saved as `analysis.txt`
- structured analysis JSON returned by the backend
- backend process timeout handling
- safe subprocess output draining to avoid hanging processes

Verified behavior:

- Spring Boot backend runs locally on port `8081`.
- `GET /api/health` works.
- `GET /api/scenarios` works.
- `POST /api/runs` successfully runs `queue_overflow`.
- A successful `queue_overflow` run returned `status=COMPLETED`, `runtimeHealth=WARNING`, and `errorMessage=null`.
- `WARNING` is expected for `queue_overflow` because the scenario intentionally creates bounded queue pressure and dropped messages.
- Backend generated `runs/<runId>/runtime_logs.jsonl` and `runs/<runId>/analysis.txt`.
- Existing C++/Python/analyzer/ML Docker workflow remains intact.

Important implementation notes:

- Backend uses Java 17.
- Backend runs on port `8081` because Nginx is already using `8080` locally.
- Phase 26 stores run metadata in memory only. Run history resets when the backend restarts.
- Phase 27 should add PostgreSQL persistence.
- The backend accepts only known scenario IDs and never accepts arbitrary user-provided config paths.


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
| Backend | Java Spring Boot health, scenario metadata, and run orchestration APIs |
| Testing | GoogleTest, CTest, pytest, Spring Boot tests |
| Docker | Runtime, analyzer, ML, and backend services |

---

## Architecture

```text
Docker Compose
  ├── C++ Runtime Services
  │     -> logs/*.jsonl
  ├── Python Analyzer / ML Services
  │     -> reports/generated/*
  │     -> models/*
  └── Spring Boot Backend
        -> GET  /api/health
        -> GET  /api/scenarios
        -> POST /api/runs
        -> GET  /api/runs
        -> GET  /api/runs/{runId}
        -> GET  /api/runs/{runId}/analysis
        -> runs/<runId>/runtime_logs.jsonl
        -> runs/<runId>/analysis.txt
```

Future architecture:

```text
React/TypeScript Frontend
  -> Java Spring Boot API
  -> PostgreSQL
  -> C++ Runtime
  -> Python Analyzer + ML Predictor
  -> Docker/Kubernetes deployment
```

---

## Repository Structure

```text
minirtos-linux/
├── backend/
├── cpp-runtime/
├── ai-analyzer/
├── configs/
├── scripts/
├── docker/
├── docs/
├── logs/
├── runs/
├── models/
├── reports/generated/
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

Backend:

```text
Java 17
Maven 3.9+
Spring Boot 3.3.5
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

## Quick Start — Backend

```bash
./scripts/build_cpp.sh
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

Runs a trusted scenario through the backend.

Example:

```bash
curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"queue_overflow"}'
```

Expected successful response for `queue_overflow`:

```text
status=COMPLETED
runtimeHealth=WARNING
errorMessage=null
```

`WARNING` is expected because `queue_overflow` intentionally creates queue pressure and dropped messages.

### `GET /api/runs`

Lists in-memory run summaries for the current backend process.

### `GET /api/runs/{runId}`

Returns one run summary.

### `GET /api/runs/{runId}/analysis`

Returns parsed analyzer output and the raw analyzer report.

---

## Run Runtime Scenarios Manually

```bash
./cpp-runtime/build/minirtos_runtime --config configs/normal.json
./cpp-runtime/build/minirtos_runtime --config configs/priority_scheduler.json
./cpp-runtime/build/minirtos_runtime --config configs/deadline_scheduler.json
./cpp-runtime/build/minirtos_runtime --config configs/queue_overflow.json
./cpp-runtime/build/minirtos_runtime --config configs/cpu_spike.json
./cpp-runtime/build/minirtos_runtime --config configs/task_crash.json
./scripts/run_fault.sh configs/slow_task.json
./scripts/run_fault.sh configs/dropped_messages.json
./cpp-runtime/build/minirtos_runtime --config configs/watchdog_slow_task.json
```

---

## Analyze Runtime Logs

```bash
./scripts/run_analyzer.sh logs/runtime_logs.jsonl
./scripts/run_analyzer.sh logs/runtime_logs.jsonl 5000
```

With ML output:

```bash
python3 ai-analyzer/app/analyze.py \
  --log logs/task_crash_runtime_logs.jsonl \
  --window-ms 5000 \
  --ml-model models/anomaly_classifier.joblib \
  --ml-label-encoder models/label_encoder.joblib
```

---

## Generate Dataset and Train ML

```bash
docker compose up --build demo
docker compose run --rm training-dataset
docker compose run --rm ml-train
docker compose run --rm ml-predict
```

---

## Docker

Run backend:

```bash
docker compose up --build backend
```

Test backend:

```bash
curl http://localhost:8081/api/health
curl http://localhost:8081/api/scenarios
```

Run a backend-orchestrated scenario:

```bash
curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"queue_overflow"}'
```

Run full existing demo:

```bash
docker compose up --build demo
```

---

## Generated Runtime Outputs

Backend run orchestration generates:

```text
runs/<runId>/runtime_logs.jsonl
runs/<runId>/analysis.txt
```

The backend also keeps run metadata in memory for:

```text
GET /api/runs
GET /api/runs/{runId}
GET /api/runs/{runId}/analysis
```

This metadata resets when the backend restarts. Phase 27 will add PostgreSQL persistence.

---

## Documentation

| Document | Purpose |
|---|---|
| `docs/architecture.md` | Runtime/analyzer/ML/backend orchestration architecture |
| `docs/testing.md` | C++/Python/ML/backend/API testing |
| `docs/fault-injection.md` | Fault modes, telemetry, and backend scenario runs |
| `docs/anomaly-detector.md` | Analyzer, anomaly, dataset, ML, and backend analyzer integration |
| `docs/resume-bullets.md` | Resume and interview wording |
| `docs/docker-phase25-update-notes.md` | Phase 25 Docker/backend scaffold notes |
| `docs/docker-phase26-update-notes.md` | Phase 26 Docker/backend orchestration notes |

---

## Next Phase

```text
Phase 27 — PostgreSQL Run Storage
```

Phase 27 will persist run metadata and analysis summaries in PostgreSQL instead of keeping them only in memory.
