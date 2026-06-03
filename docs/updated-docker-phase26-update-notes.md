# Phase 26 Docker and Backend Orchestration Update Notes

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

## 1. What Changed

Phase 26 changed the backend from a metadata-only API into an orchestration API.

Before Phase 26, backend Docker only needed to run the Spring Boot JAR.

After Phase 26, backend Docker must also support:

```text
running the C++ runtime binary
reading configs/
writing logs/
writing runs/
running python3
running ai-analyzer/app/analyze.py
```

---

## 2. Backend Dockerfile Requirements

`docker/Dockerfile.backend` should be multi-stage:

1. Build the Spring Boot JAR with Maven.
2. Build the C++ runtime binary with CMake/Ninja.
3. Create a Java runtime image that also includes Python 3.
4. Copy the backend JAR, runtime binary, configs, and analyzer into `/app`.

Required runtime content:

```text
/app/app.jar
/app/cpp-runtime/build/minirtos_runtime
/app/configs/
/app/ai-analyzer/
/app/logs/
/app/runs/
```

Required environment:

```dockerfile
ENV MINIRTOS_PROJECT_ROOT=/app
ENV MINIRTOS_RUNTIME_BINARY=cpp-runtime/build/minirtos_runtime
ENV MINIRTOS_PYTHON_COMMAND=python3
ENV MINIRTOS_ANALYZER_SCRIPT=ai-analyzer/app/analyze.py
ENV MINIRTOS_LOGS_DIR=logs
ENV MINIRTOS_RUNS_DIR=runs
ENV MINIRTOS_WINDOW_MS=5000
ENV MINIRTOS_PROCESS_TIMEOUT_SECONDS=120
```

---

## 3. Docker Compose Backend Service

Backend service should expose port 8081 and persist generated logs/runs:

```yaml
backend:
  build:
    context: .
    dockerfile: docker/Dockerfile.backend
  container_name: minirtos-playground-backend
  ports:
    - "8081:8081"
  volumes:
    - ./logs:/app/logs
    - ./runs:/app/runs
```

Keep all existing services:

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
backend
```

---

## 4. Verification

Build and run backend:

```bash
docker compose up --build backend
```

Test metadata APIs:

```bash
curl http://localhost:8081/api/health
curl http://localhost:8081/api/scenarios
```

Run a scenario through backend orchestration:

```bash
curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"queue_overflow"}'
```

Expected:

```text
status=COMPLETED
runtimeHealth=WARNING
errorMessage=null
```

Check generated files:

```bash
ls -R runs
```

Expected:

```text
runs/<runId>/runtime_logs.jsonl
runs/<runId>/analysis.txt
```

---

## 5. Existing ML Docker Workflow

Still valid:

```bash
docker compose up --build demo
docker compose run --rm training-dataset
docker compose run --rm ml-train
docker compose run --rm ml-predict
```

Generated outputs:

```text
reports/generated/synthetic_dataset.csv
reports/generated/model_metrics.json
models/anomaly_classifier.joblib
models/label_encoder.joblib
```

---

## 6. Recommended `.gitignore`

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
```

---

## 7. Phase 26 Lessons Learned

### Spring configuration

A record-based `@ConfigurationProperties` implementation caused startup friction during Phase 26. The stable implementation uses a normal `@Component` with `@Value` fields.

### Process execution

The original `ProcessRunner` waited for the subprocess to finish before reading output. That caused a timeout when the C++ runtime output pipe filled.

The fixed `ProcessRunner` drains output asynchronously while the process runs.

### API safety

The backend must continue to accept only scenario IDs, not arbitrary config paths.

---

## 8. Next Docker Work

Phase 27 should add:

```text
postgres service
database volume
backend DB environment variables
database healthcheck/dependency behavior
```
