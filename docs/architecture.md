# MiniRTOS-Linux / MiniRTOS Playground Architecture

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

## 1. Current Architecture

```text
+----------------------------------------+
| Docker Compose                         |
| demo / runtime-* / analyzer            |
| training-dataset / ml-* / backend      |
+-------------------+--------------------+
                    |
                    v
+-------------------------------+       +----------------------------------+
| C++ Runtime Simulator         |       | Java Spring Boot Backend         |
| Config Loader                 |       | GET  /api/health                 |
| Scheduler                     |       | GET  /api/scenarios              |
| Message Bus                   |       | POST /api/runs                   |
| Fault Injector                |       | GET  /api/runs                   |
| Watchdog                      |       | GET  /api/runs/{runId}          |
| JSONL Logger                  |       | GET  /api/runs/{runId}/analysis |
+---------------+---------------+       +----------------+-----------------+
                |                                        |
                v                                        v
+-------------------------------+       +----------------------------------+
| logs/runtime_logs.jsonl       |       | runs/<runId>/runtime_logs.jsonl |
+---------------+---------------+       | runs/<runId>/analysis.txt       |
                |                       +----------------+-----------------+
                v                                        |
+-------------------------------+                        |
| Python Analyzer               |<-----------------------+
| Deterministic report          |
| Anomaly windows               |
| Optional ML prediction        |
+---------------+---------------+
                |
                v
+-------------------------------+
| Dataset + ML Layer            |
| generate_dataset.py           |
| train_model.py                |
| predict_model.py              |
| RandomForestClassifier        |
+-------------------------------+
```

---

## 2. C++ Runtime Components

Main runtime concepts:

- Config loading from JSON.
- Periodic task model.
- Round-robin scheduler.
- Priority scheduler.
- Earliest-deadline-first scheduler.
- Bounded message bus.
- Fault injector.
- Watchdog.
- Structured JSONL logger.

Important event types:

```text
runtime_started
scheduler_started
task_started
task_completed
task_failed
task_skipped
message_sent
message_received
message_dropped
fault_injected
watchdog_timeout
task_recovered
scheduler_finished
runtime_summary
runtime_finished
```

---

## 3. Runtime Flow

```text
main.cpp
  -> parse --config
  -> load RuntimeConfig
  -> create Logger
  -> log runtime_started
  -> construct tasks
  -> construct Scheduler
  -> initialize MessageBus
  -> select scheduler mode
  -> construct FaultInjector
  -> construct Watchdog
  -> run loop
       -> check due tasks
       -> order by scheduler mode
       -> apply faults
       -> log task telemetry
       -> send/receive messages
       -> inspect watchdog
  -> log runtime summaries
  -> log runtime_finished
```

---

## 4. Python Analyzer Architecture

Main files:

```text
ai-analyzer/app/analyze.py
ai-analyzer/app/anomaly_detector.py
```

Responsibilities:

- Load JSONL events.
- Count event types and severities.
- Summarize task behavior.
- Summarize message drops.
- Summarize faults.
- Summarize watchdog events.
- Summarize task failures/skips.
- Classify deterministic health.
- Report root causes.
- Run anomaly windows.
- Optionally print ML predictions.

---

## 5. Dataset and ML Architecture

Main files:

```text
ai-analyzer/training/generate_dataset.py
ai-analyzer/ml/train_model.py
ai-analyzer/ml/predict_model.py
```

Pipeline:

```text
scenario logs
  -> fixed time windows
  -> feature extraction
  -> scenario labels
  -> synthetic_dataset.csv
  -> LabelEncoder
  -> RandomForestClassifier
  -> anomaly_classifier.joblib
  -> label_encoder.joblib
  -> model_metrics.json
```

The ML classifier is trained on synthetic scenario-derived telemetry and should not be described as production-validated AI.

---

## 6. Spring Boot Backend Architecture

Backend stack:

```text
Java 17
Spring Boot 3.3.5
Maven
Spring Web
Spring Boot Actuator
Spring Validation
Spring Boot Test
```

Current backend API:

```text
GET  /api/health
GET  /api/scenarios
POST /api/runs
GET  /api/runs
GET  /api/runs/{runId}
GET  /api/runs/{runId}/analysis
```

Current backend port:

```text
8081
```

Important backend files:

```text
backend/pom.xml
backend/src/main/java/com/minirtos/playground/MiniRtosPlaygroundApplication.java
backend/src/main/java/com/minirtos/playground/config/MiniRtosProperties.java
backend/src/main/java/com/minirtos/playground/controller/HealthController.java
backend/src/main/java/com/minirtos/playground/controller/ScenarioController.java
backend/src/main/java/com/minirtos/playground/controller/RunController.java
backend/src/main/java/com/minirtos/playground/service/ScenarioService.java
backend/src/main/java/com/minirtos/playground/service/RunService.java
backend/src/main/java/com/minirtos/playground/service/RuntimeExecutionService.java
backend/src/main/java/com/minirtos/playground/service/AnalyzerExecutionService.java
backend/src/main/java/com/minirtos/playground/service/AnalyzerReportParser.java
backend/src/main/java/com/minirtos/playground/service/ProcessRunner.java
backend/src/main/resources/application.yml
backend/README.md
```

---

## 7. Phase 26 Run Orchestration Flow

```text
POST /api/runs
  -> CreateRunRequest(scenarioId)
  -> RunController
  -> RunService
  -> ScenarioService.findById(scenarioId)
  -> reject unknown scenario IDs
  -> RuntimeExecutionService
       -> ProcessRunner
       -> cpp-runtime/build/minirtos_runtime --config configs/<scenario>.json
  -> copy logs/runtime_logs.jsonl
       -> runs/<runId>/runtime_logs.jsonl
  -> AnalyzerExecutionService
       -> ProcessRunner
       -> python3 ai-analyzer/app/analyze.py --log runs/<runId>/runtime_logs.jsonl --window-ms 5000
  -> save runs/<runId>/analysis.txt
  -> AnalyzerReportParser
  -> AnalysisResponse
  -> RunSummaryResponse
```

Important design rule:

```text
Never let API clients provide arbitrary config paths.
```

---

## 8. Run Storage Architecture

Current Phase 26 storage:

```text
runs/<runId>/runtime_logs.jsonl
runs/<runId>/analysis.txt
```

Current Phase 26 metadata state:

```text
in-memory ConcurrentHashMap in RunService
```

Limitation:

```text
Run list and analysis lookup reset when backend restarts.
```

Phase 27 will replace/augment this with PostgreSQL.

---

## 9. Docker Architecture

Dockerfiles:

```text
docker/Dockerfile.runtime
docker/Dockerfile.analyzer
docker/Dockerfile.backend
```

Services:

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

Backend service should mount logs/runs:

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

---

## 10. Future Full-Stack Architecture

```text
React/TypeScript Frontend
  -> Spring Boot Backend
  -> PostgreSQL Run History
  -> C++ Runtime
  -> Python Analyzer
  -> ML Predictor
  -> Docker Compose
  -> Kubernetes Jobs/Deployments
```

---

## 11. Next Phase Architecture: PostgreSQL

Phase 27 should add:

```text
PostgreSQL container
Spring Data JPA
RunEntity
RunRepository
persistent run metadata
persistent analysis summary
startup-safe run history
```
