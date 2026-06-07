# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MiniRTOS Playground is a full-stack embedded systems learning platform. A C++20 RTOS simulator generates JSONL telemetry, a Python analyzer processes it, a Java/Spring Boot backend orchestrates runs and persists results in PostgreSQL, and a React/TypeScript frontend provides an educational dashboard.

## Commands

### C++ Runtime

```bash
# Build
cmake -S cpp-runtime -B cpp-runtime/build -G Ninja
cmake --build cpp-runtime/build

# Run a scenario directly
./cpp-runtime/build/minirtos_runtime --config configs/queue_overflow.json

# Run all C++ + Python tests
./scripts/run_tests.sh

# Run only C++ tests
ctest --test-dir cpp-runtime/build --output-on-failure

# Run only Python tests
python3 -m pytest ai-analyzer/tests -q

# Run a single Python test file
python3 -m pytest ai-analyzer/tests/test_analyzer.py -q
```

### Backend (Java/Spring Boot)

```bash
# Start PostgreSQL first
docker compose up -d postgres

# Run tests
cd backend && mvn clean test

# Run a single test class
cd backend && mvn test -Dtest=RunRepositoryTest

# Start dev server (requires postgres running)
cd backend && mvn spring-boot:run
# → http://localhost:8081
```

### Frontend (React/TypeScript/Vite)

```bash
cd frontend
npm install
npm run typecheck      # tsc -b
npm run build          # typecheck + vite build
npm run dev            # → http://localhost:5173
npm run lint           # eslint
npm run test           # vitest run (single pass)
npm run test:watch     # vitest watch mode
npm run test:coverage  # vitest with v8 coverage
```

### Docker Compose

```bash
# Full backend stack (postgres + backend)
docker compose up -d postgres
docker compose build --no-cache backend
docker compose up -d backend

# Dev frontend (Vite, hot-reload)
docker compose up --build frontend
# → http://localhost:5173

# Production frontend (Nginx)
docker compose --profile prod build --no-cache frontend-prod
docker compose --profile prod up -d frontend-prod
# → http://localhost:3000

# Validate compose config
docker compose config

# Quick smoke tests
curl http://localhost:8081/api/health
curl http://localhost:8081/api/scenarios
curl -X POST http://localhost:8081/api/runs -H "Content-Type: application/json" -d '{"scenarioId":"queue_overflow"}'
```

## Architecture

### Data Flow

```
configs/*.json
  → C++ runtime (cpp-runtime/build/minirtos_runtime)
  → logs/runtime_logs.jsonl
  → Python analyzer (ai-analyzer/app/analyze.py)
  → runs/<runId>/analysis.txt
  → Spring Boot backend (RunService) persists to PostgreSQL
  → REST API consumed by React frontend
```

### C++ Runtime (`cpp-runtime/`)

Core simulation loop in `src/main.cpp`. Key classes:
- `Scheduler` — round-robin, priority, and EDF scheduling modes
- `Task` — periodic task abstraction with deadline tracking
- `MessageBus` — bounded FIFO queues with drop-on-full semantics
- `FaultInjector` — injects `slow_task`, `dropped_messages`, `cpu_spike`, `task_crash` faults
- `Watchdog` — detects repeated deadline misses
- `Logger` — emits JSONL telemetry to `logs/runtime_logs.jsonl`

Depends on `nlohmann/json` (fetched via CMake FetchContent if not system-installed). Tests use GoogleTest (also FetchContent).

### Python Analyzer (`ai-analyzer/`)

- `app/analyze.py` — parses JSONL logs, computes health metrics, outputs structured analysis
- `app/anomaly_detector.py` — time-windowed feature extraction and anomaly scoring
- `ml/train_model.py` / `ml/predict_model.py` — Random Forest classifier (scikit-learn + joblib)
- `training/generate_dataset.py` — synthetic training dataset from scenario logs

### Backend (`backend/`)

Spring Boot 3.3.5, Java 17. Package root: `com.minirtos.playground`.

Key service flow for `POST /api/runs`:
1. `RunController` → `RunService`
2. `RunService` validates scenario via `ScenarioService` (allowlist only — no arbitrary paths)
3. `RuntimeExecutionService` (via `ProcessRunner`) runs the C++ binary
4. Copies `logs/runtime_logs.jsonl` into `runs/<runId>/`
5. `AnalyzerExecutionService` runs the Python analyzer
6. `AnalyzerReportParser` parses the output
7. `RunRepository` (Spring Data JPA) persists to PostgreSQL via `RunEntity`

Database schema managed by Flyway. Single migration: `V1__create_run_storage.sql`. Tables: `runs`, `run_event_counts`, `run_severity_counts`, `run_task_metrics`, `run_root_causes`.

Backend tests use H2 in-memory for `RunRepositoryTest`, real Spring context for controller tests.

Config properties are in `application.yml` under `minirtos.*` and can be overridden by environment variables (e.g., `MINIRTOS_PROJECT_ROOT`, `MINIRTOS_RUNTIME_BINARY`).

### Frontend (`frontend/`)

Vite + React 19 + TypeScript. Test stack: Vitest + React Testing Library + jsdom.

- `src/api/minirtosApi.ts` — all fetch calls; `VITE_API_BASE_URL` env var sets base URL (default `http://localhost:8081`)
- `src/types/api.ts` — shared TypeScript types matching backend DTOs
- `src/components/` — UI components (visualizers use CSS only, no chart library)
- `src/content/learningContent.ts` — per-scenario educational copy for the learning panel
- `src/analytics/amplitude.ts` — Amplitude event tracking; `VITE_AMPLITUDE_API_KEY` env var enables it (omit to disable all tracking safely)

## Key Constraints

- Backend port is **8081** (not 8080 — local Nginx occupies 8080).
- Production frontend maps host **3000 → container 80** (Nginx). Dev frontend maps **5173 → 5173** (Vite). Do not mix these.
- Production React build bakes `VITE_API_BASE_URL` at build time — rebuild the image if the API URL changes.
- Backend scenario allowlist is the only accepted input to `POST /api/runs`; arbitrary config paths are rejected by design.
- Frontend requires **Node 22+** (Vite tooling may fail on older Node 18).
- Backend requires **Java 17**.
- The Docker backend image builds the C++ runtime inside the build stage using CMake + Ninja — both must be installed in that Dockerfile stage.
- CORS allowed origins: `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:3000`, `http://127.0.0.1:3000`.
- `VITE_AMPLITUDE_API_KEY` is optional. When absent, `initAmplitude()` returns immediately and all `track*` functions are no-ops — no SDK is called.
- Session replay (`@amplitude/plugin-session-replay-browser`) is not a project dependency and must not be added back without explicit approval.
