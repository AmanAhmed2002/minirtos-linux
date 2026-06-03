# MiniRTOS Playground Backend

Java Spring Boot backend for the MiniRTOS Playground educational platform.

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

## Requirements

```text
Java 17
Maven 3.9+
C++ runtime binary built at ../cpp-runtime/build/minirtos_runtime for local orchestration
Python 3 available as python3
```

---

## Port

```text
8081
```

The backend uses 8081 because Nginx is using 8080 locally.

Config:

```text
src/main/resources/application.yml
```

Key local config:

```yaml
minirtos:
  project-root: ${MINIRTOS_PROJECT_ROOT:..}
  runtime-binary: ${MINIRTOS_RUNTIME_BINARY:cpp-runtime/build/minirtos_runtime}
  python-command: ${MINIRTOS_PYTHON_COMMAND:python3}
  analyzer-script: ${MINIRTOS_ANALYZER_SCRIPT:ai-analyzer/app/analyze.py}
  logs-dir: ${MINIRTOS_LOGS_DIR:logs}
  runs-dir: ${MINIRTOS_RUNS_DIR:runs}
  window-ms: ${MINIRTOS_WINDOW_MS:5000}
  process-timeout-seconds: ${MINIRTOS_PROCESS_TIMEOUT_SECONDS:120}
```

---

## Run Locally

From repo root:

```bash
./scripts/build_cpp.sh
```

Then:

```bash
cd backend
mvn clean test
mvn spring-boot:run
```

Test:

```bash
curl http://localhost:8081/api/health
curl http://localhost:8081/api/scenarios
```

Run a scenario through the backend:

```bash
curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"queue_overflow"}'
```

Expected successful `queue_overflow` result:

```text
status=COMPLETED
runtimeHealth=WARNING
errorMessage=null
```

---

## API

### `GET /api/health`

Returns backend health.

### `GET /api/scenarios`

Returns metadata for:

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
-> return run summary
```

### `GET /api/runs`

Returns in-memory run summaries for the current backend process.

### `GET /api/runs/{runId}`

Returns one run summary.

### `GET /api/runs/{runId}/analysis`

Returns parsed analyzer JSON plus the raw analyzer report.

---

## Backend Structure

```text
backend/
├── pom.xml
├── README.md
└── src/
    ├── main/
    │   ├── java/com/minirtos/playground/
    │   │   ├── MiniRtosPlaygroundApplication.java
    │   │   ├── config/
    │   │   │   └── MiniRtosProperties.java
    │   │   ├── controller/
    │   │   │   ├── HealthController.java
    │   │   │   ├── ScenarioController.java
    │   │   │   └── RunController.java
    │   │   ├── dto/
    │   │   ├── model/
    │   │   └── service/
    │   └── resources/application.yml
    └── test/
```

Important Phase 26 services:

```text
RunService.java
RuntimeExecutionService.java
AnalyzerExecutionService.java
AnalyzerReportParser.java
ProcessRunner.java
```

---

## Docker

Build:

```bash
docker build -f docker/Dockerfile.backend -t minirtos-playground-backend .
```

Compose:

```bash
docker compose up --build backend
```

Test:

```bash
curl http://localhost:8081/api/health
curl http://localhost:8081/api/scenarios
curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"queue_overflow"}'
```

Phase 26 backend Docker image must include:

```text
Spring Boot JAR
C++ runtime binary
configs/
ai-analyzer/
python3
logs/
runs/
```

---

## Safety Rule

Only accept known scenario IDs.

Do not accept arbitrary config paths, runtime paths, analyzer paths, or shell commands from API clients.

---

## Known Limitation

Run metadata is currently stored in memory only.

Generated files remain on disk:

```text
runs/<runId>/runtime_logs.jsonl
runs/<runId>/analysis.txt
```

But the API list resets when the backend process restarts.

---

## Next Phase

Phase 27 will add:

```text
PostgreSQL run storage
RunEntity
RunRepository
persistent run history
database-backed run lookup
Docker Compose postgres service
```
