# MiniRTOS-Linux / MiniRTOS Playground Architecture

## Current Status

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed the Run Orchestration API. Phase 27 completed PostgreSQL/Flyway run persistence. Phase 28 added the React/TypeScript dashboard MVP layer and frontend Docker integration. Phase 29 added educational learning modules and frontend visualizers.

The platform now includes:

- C++ runtime simulator.
- Python deterministic analyzer.
- Rule-based anomaly detector.
- Synthetic dataset generator.
- Random Forest ML classifier workflow.
- Spring Boot backend orchestration API.
- PostgreSQL persisted run history.
- React/TypeScript educational dashboard.
- CSS-based queue and task visualizers.
- Guided scenario learning modules.
- Docker Compose services for runtime, analyzer, ML, backend, database, and frontend.

---

## 1. Current Architecture

```text
+--------------------------------------------------------------------------------+
| Docker Compose                                                                  |
| demo / runtime-* / analyzer / ml-* / backend / postgres / frontend              |
+----------------------------------------+---------------------------------------+
                                         |
                                         v
+-------------------------------+       +---------------------------------------+
| C++ Runtime Simulator         |       | Java Spring Boot Backend              |
| Config Loader                 |       | GET  /api/health                      |
| Scheduler                     |       | GET  /api/scenarios                   |
| Message Bus                   |       | POST /api/runs                        |
| Fault Injector                |       | GET  /api/runs                        |
| Watchdog                      |       | GET  /api/runs/{runId}                |
| JSONL Logger                  |       | GET  /api/runs/{runId}/analysis       |
+---------------+---------------+       +-------------------+-------------------+
                |                                           |
                v                                           v
+-------------------------------+       +---------------------------------------+
| logs/runtime_logs.jsonl       |       | runs/<runId>/runtime_logs.jsonl      |
+---------------+---------------+       | runs/<runId>/analysis.txt            |
                |                       +-------------------+-------------------+
                v                                           |
+-------------------------------+                           |
| Python Analyzer               |<--------------------------+
| Deterministic report          |
| Anomaly windows               |
| Optional ML prediction        |
+---------------+---------------+
                |
                v
+-------------------------------+       +---------------------------------------+
| Dataset + ML Layer            |       | PostgreSQL                            |
| generate_dataset.py           |       | runs                                  |
| train_model.py                |       | run_event_counts                      |
| predict_model.py              |       | run_severity_counts                   |
| RandomForestClassifier        |       | run_task_metrics                      |
+-------------------------------+       | run_root_causes                       |
                                        +-------------------+-------------------+
                                                            |
                                                            v
                                        +---------------------------------------+
                                        | React/TypeScript Frontend             |
                                        | scenario selector                     |
                                        | run trigger                           |
                                        | latest run summary                    |
                                        | persisted history                     |
                                        | analyzer summary panel                |
                                        | guided learning modules               |
                                        | queue pressure visualizer             |
                                        | task runtime timeline                 |
                                        | fault/health explanation panel        |
                                        +---------------------------------------+
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
Spring Data JPA
PostgreSQL Driver
Flyway
H2 for tests
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
backend/src/main/java/com/minirtos/playground/config/CorsConfig.java
backend/src/main/java/com/minirtos/playground/controller/HealthController.java
backend/src/main/java/com/minirtos/playground/controller/ScenarioController.java
backend/src/main/java/com/minirtos/playground/controller/RunController.java
backend/src/main/java/com/minirtos/playground/service/ScenarioService.java
backend/src/main/java/com/minirtos/playground/service/RunService.java
backend/src/main/java/com/minirtos/playground/service/RuntimeExecutionService.java
backend/src/main/java/com/minirtos/playground/service/AnalyzerExecutionService.java
backend/src/main/java/com/minirtos/playground/service/AnalyzerReportParser.java
backend/src/main/java/com/minirtos/playground/service/ProcessRunner.java
backend/src/main/java/com/minirtos/playground/persistence/RunEntity.java
backend/src/main/java/com/minirtos/playground/persistence/RunRepository.java
backend/src/main/java/com/minirtos/playground/persistence/TaskMetricEntity.java
backend/src/main/resources/application.yml
backend/src/main/resources/db/migration/V1__create_run_storage.sql
backend/README.md
```

CORS is needed because the local dashboard runs on `http://localhost:5173` and the backend runs on `http://localhost:8081`.

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

## 8. Phase 27 Run Storage Architecture

Phase 27 replaced the previous in-memory run state with PostgreSQL-backed persistence.

Filesystem artifacts remain:

```text
runs/<runId>/runtime_logs.jsonl
runs/<runId>/analysis.txt
```

Database-backed metadata now persists:

```text
runs
run_event_counts
run_severity_counts
run_task_metrics
run_root_causes
```

Run storage flow:

```text
POST /api/runs
  -> create RunEntity with RUNNING status
  -> save RunEntity through RunRepository
  -> execute runtime
  -> execute analyzer
  -> parse AnalysisResponse
  -> mark RunEntity COMPLETED or FAILED
  -> persist parsed counters/metrics/root causes/raw report
```

Read flow:

```text
GET /api/runs
  -> RunRepository.findAllByOrderByCreatedAtDesc()
  -> RunEntity.toSummaryResponse()

GET /api/runs/{runId}
  -> RunRepository.findByRunId(runId)
  -> RunEntity.toSummaryResponse()

GET /api/runs/{runId}/analysis
  -> RunRepository.findByRunId(runId)
  -> RunEntity.toAnalysisResponse()
```

Important Phase 27 persistence rule:

```text
rawReport must be PostgreSQL TEXT without @Lob.
```

---

## 9. Phase 28 Frontend Architecture

Frontend stack:

```text
Vite
React
TypeScript
Node 22+
npm
clsx
```

Current frontend port:

```text
5173
```

Environment:

```env
VITE_API_BASE_URL=http://localhost:8081
```

Important frontend files:

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

Frontend API flow:

```text
App.tsx
  -> loadDashboard()
       -> GET /api/scenarios
       -> GET /api/runs
  -> ScenarioSelector
       -> selected scenario ID
       -> run button
  -> createRun()
       -> POST /api/runs
       -> refresh GET /api/runs
  -> RunHistory
       -> select run ID
  -> AnalysisPanel
       -> GET /api/runs/{runId}/analysis
```

Frontend display responsibilities:

- Scenario metadata.
- What each scenario teaches.
- Expected telemetry signals.
- Latest run summary.
- Persisted run history.
- Runtime health.
- Message summary.
- Task metrics.
- Root causes.
- Raw analyzer report.

---

## 10. Phase 29 Educational Frontend Architecture

Phase 29 added educational and visualizer components without backend changes.

New frontend files:

```text
frontend/src/content/learningContent.ts
frontend/src/components/LearningModulePanel.tsx
frontend/src/components/QueuePressureChart.tsx
frontend/src/components/TaskTimeline.tsx
frontend/src/components/FaultExplanationPanel.tsx
```

Updated frontend files:

```text
frontend/src/App.tsx
frontend/src/App.css
frontend/src/components/AnalysisPanel.tsx
```

Phase 29 flow:

```text
ScenarioSelector
  -> selected scenario ID
  -> LearningModulePanel
       -> getScenarioLearningContent(selectedScenario)
       -> show concept modules and signals to watch

AnalysisPanel
  -> QueuePressureChart(messageSummary)
  -> TaskTimeline(taskMetrics)
  -> FaultExplanationPanel(analysis)
  -> existing summary grid / task table / root causes / raw report
```

Phase 29 visualizers use these existing API fields:

```text
messageSummary.sent
messageSummary.received
messageSummary.dropped
messageSummary.queueFullDrops
messageSummary.faultInjectedDrops
taskMetrics[taskName].runs
taskMetrics[taskName].deadlineMisses
taskMetrics[taskName].avgDurationMs
taskMetrics[taskName].maxDurationMs
runtimeHealth
rootCauses
scenarioId
simulationName
```

No chart library was added. Visualizers are implemented with CSS bars and cards.

---

## 11. Docker Architecture

Dockerfiles:

```text
docker/Dockerfile.runtime
docker/Dockerfile.analyzer
docker/Dockerfile.backend
docker/Dockerfile.frontend
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
postgres
backend
frontend
```

Phase 29 did not require Docker changes.

---

## 12. Future Full-Stack Architecture

```text
React/TypeScript Frontend
  -> Spring Boot Backend
  -> PostgreSQL Run History
  -> C++ Runtime
  -> Python Analyzer
  -> ML Predictor
  -> Docker Compose
  -> Kubernetes Jobs/Deployments
  -> Terraform/cloud infrastructure
```

---

## 13. Next Phase Architecture: Full-Stack Docker Compose Hardening

Phase 30 should add:

```text
production frontend Dockerfile
Nginx static serving for built frontend assets
frontend healthcheck
backend readiness checks
Compose dev/prod profiles
Docker build smoke tests
CI validation for backend/frontend images
```
