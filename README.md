# MiniRTOS-Linux / MiniRTOS Playground

**Original Project:** Embedded Runtime Simulator with AI-Based Fault Detection  
**Full-Stack Evolution:** MiniRTOS Playground — Full-Stack Embedded Systems Learning Platform

MiniRTOS-Linux is a software-only C++20 embedded runtime simulator that models periodic tasks, bounded message queues, configurable fault injection, task-crash simulation, watchdog monitoring, structured JSONL telemetry, Python-based runtime analysis, AI-style anomaly detection, synthetic training-dataset generation, a trained lightweight ML anomaly classifier, automated tests, Dockerized demos, and benchmark reporting.

MiniRTOS Playground extends the project into a full-stack educational platform for students learning embedded systems, RTOS concepts, runtime telemetry, scheduling, queues, faults, watchdog behavior, Docker, Kubernetes, and ML-based anomaly detection.

## Current Status After This Chat

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 is now complete.

Phase 25 added the Java Spring Boot backend scaffold for MiniRTOS Playground:

- `backend/pom.xml`
- `MiniRtosPlaygroundApplication.java`
- `HealthController.java`
- `ScenarioController.java`
- `ScenarioService.java`
- `ScenarioResponse.java`
- `application.yml`
- backend controller tests
- `backend/README.md`
- `docker/Dockerfile.backend`
- backend service in `docker-compose.yml`

Verified behavior:

- Spring Boot backend runs locally.
- `GET /api/health` works.
- `GET /api/scenarios` works.
- Backend Dockerfile builds.
- Backend runs through Docker Compose.
- Existing C++/Python/analyzer/ML Docker workflow remains intact.

Important local decision:

- Backend uses Java 17.
- Backend runs on port `8081` because Nginx is already using `8080`.


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
| Backend | Java Spring Boot health and scenario metadata APIs |
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
        -> GET /api/health
        -> GET /api/scenarios
        -> future POST /api/runs
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
cd backend
mvn test
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

Future Phase 26 endpoint:

```text
POST /api/runs
```

---

## Run Runtime Scenarios

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
python3 ai-analyzer/app/analyze.py   --log logs/task_crash_runtime_logs.jsonl   --window-ms 5000   --ml-model models/anomaly_classifier.joblib   --ml-label-encoder models/label_encoder.joblib
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

Run full demo:

```bash
docker compose up --build demo
```

---

## Documentation

| Document | Purpose |
|---|---|
| `docs/architecture.md` | Runtime/analyzer/ML/backend architecture |
| `docs/testing.md` | C++/Python/ML/backend testing |
| `docs/fault-injection.md` | Fault modes and telemetry |
| `docs/anomaly-detector.md` | Analyzer, anomaly, dataset, ML flow |
| `docs/resume-bullets.md` | Resume and interview wording |
| `docs/docker-phase25-update-notes.md` | Phase 25 Docker/backend notes |

---

## Next Phase

```text
Phase 26 — Run Orchestration API
```

Phase 26 will connect the Spring Boot backend to the existing C++ runtime and Python analyzer.
