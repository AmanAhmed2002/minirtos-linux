# MiniRTOS-Linux AI-Style Anomaly Detector and ML Classifier

**Updated:** June 10, 2026
**Current Phase:** Phase 33 — Local Kubernetes Deployment

---

## Current Status

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed the Run Orchestration API. Phase 27 completed PostgreSQL/Flyway run persistence. Phase 28 added the React/TypeScript dashboard MVP that can display parsed analyzer summaries from the backend. Phase 29 added educational modules and visualizers that translate analyzer output into student-friendly explanations. Phase 30 hardened Docker Compose and Dockerfiles so the backend, dev frontend, and production frontend can run reliably through Docker. Phase 31 added frontend automated tests. Phase 32 added Amplitude tracking. Phase 33 added local Kubernetes manifests for the same backend and frontend stack.

The backend can run the deterministic analyzer after each simulation, parse the report, return structured JSON, persist the parsed analysis summary in PostgreSQL, and expose it to the React dashboard.

The frontend can display analysis in three modes:

```text
Dev frontend:
  http://localhost:5173

Production frontend:
  http://localhost:3000

Kubernetes frontend:
  http://localhost:30080
```

All frontend modes use the same backend API shape:

```text
Docker/local backend: http://localhost:8081
Kubernetes backend:   http://localhost:30081
```

The frontend can now display:

- Runtime health explanation.
- Message/queue pressure visualizer.
- Task runtime timeline.
- Root-cause teaching notes.
- Fault-specific learning panels.

---

## 1. Purpose

The Python analysis layer reads structured JSONL runtime logs and reports system health.

It includes:

1. Deterministic health analyzer.
2. Explainable time-windowed anomaly detector.
3. Synthetic training-dataset generator.
4. Lightweight ML anomaly classifier.

Phase 26 connected the Spring Boot backend to the deterministic analyzer. Phase 27 persisted run metadata and parsed analyzer summaries in PostgreSQL. Phase 28 connected those persisted summaries to the frontend dashboard. Phase 29 added a learning/visualization layer on top of the existing analysis response. Phase 30 improved Docker reliability so analyzer-backed run workflows work through the Dockerized backend.

---

## 2. Main Files

```text
ai-analyzer/app/analyze.py
ai-analyzer/app/anomaly_detector.py
ai-analyzer/training/generate_dataset.py
ai-analyzer/ml/train_model.py
ai-analyzer/ml/predict_model.py
```

Backend integration files:

```text
AnalyzerExecutionService.java
AnalyzerReportParser.java
RunService.java
RunController.java
RunEntity.java
RunRepository.java
docker/Dockerfile.backend
```

Frontend integration files:

```text
frontend/src/api/minirtosApi.ts
frontend/src/types/api.ts
frontend/src/components/AnalysisPanel.tsx
frontend/src/content/learningContent.ts
frontend/src/components/QueuePressureChart.tsx
frontend/src/components/TaskTimeline.tsx
frontend/src/components/FaultExplanationPanel.tsx
frontend/src/components/LearningModulePanel.tsx
docker/Dockerfile.frontend
docker/nginx.frontend.conf
```

---

## 3. Analyzer Commands

```bash
./scripts/run_analyzer.sh logs/runtime_logs.jsonl
./scripts/run_analyzer.sh logs/runtime_logs.jsonl 5000
```

With ML:

```bash
python3 ai-analyzer/app/analyze.py \
  --log logs/task_crash_runtime_logs.jsonl \
  --window-ms 5000 \
  --ml-model models/anomaly_classifier.joblib \
  --ml-label-encoder models/label_encoder.joblib
```

Backend analyzer command pattern:

```text
python3 ai-analyzer/app/analyze.py --log runs/<runId>/runtime_logs.jsonl --window-ms 5000
```

---

## 4. Deterministic Analyzer

Reports:

- Event counts.
- Severity counts.
- Task metrics.
- Message metrics.
- Fault counts.
- Watchdog counts.
- Task failure and skipped-task counts.
- Health status.
- Likely root causes.

Classifications:

```text
NORMAL
WARNING
UNSTABLE
```

Frontend interpretation:

| Health | Student-Facing Meaning |
|---|---|
| `NORMAL` | No major timing, queue, fault, watchdog, or failure problems were detected. |
| `WARNING` | The run completed, but degraded behavior such as message drops or queue pressure occurred. |
| `UNSTABLE` | Serious issues such as deadline misses, task failures, CPU spikes, or watchdog events occurred. |

---

## 5. Time-Windowed Anomaly Detection

Default window:

```text
5000 ms
```

Window features include:

```text
event_count
task_completed_count
deadline_missed_count
avg_task_duration_ms
max_task_duration_ms
message_sent_count
message_received_count
message_dropped_count
queue_full_drop_count
fault_injected_drop_count
fault_injected_count
task_failed_count
task_skipped_count
watchdog_timeout_count
task_recovered_count
error_event_count
warning_event_count
```

The rule-based detector reports anomaly scores and top drivers.

---

## 6. Dataset Generation

```bash
python3 ai-analyzer/training/generate_dataset.py \
  --output reports/generated/synthetic_dataset.csv \
  --window-ms 5000 \
  --scenario normal=logs/normal_runtime_logs.jsonl \
  --scenario priority_scheduler=logs/priority_scheduler_runtime_logs.jsonl \
  --scenario deadline_scheduler=logs/deadline_scheduler_runtime_logs.jsonl \
  --scenario queue_overflow=logs/queue_overflow_runtime_logs.jsonl \
  --scenario cpu_spike=logs/cpu_spike_runtime_logs.jsonl \
  --scenario task_crash=logs/task_crash_runtime_logs.jsonl \
  --scenario slow_task=logs/slow_task_runtime_logs.jsonl \
  --scenario dropped_messages=logs/dropped_messages_runtime_logs.jsonl \
  --scenario watchdog=logs/watchdog_runtime_logs.jsonl
```

Docker:

```bash
docker compose run --rm training-dataset
```

Labels:

```text
NORMAL
QUEUE_PRESSURE
CPU_SPIKE
TASK_CRASH
SLOW_TASK
DROPPED_MESSAGES
WATCHDOG_RECOVERY
```

---

## 7. ML Classifier

Pipeline:

```text
synthetic_dataset.csv
  -> feature columns
  -> LabelEncoder
  -> RandomForestClassifier
  -> anomaly_classifier.joblib
  -> label_encoder.joblib
  -> model_metrics.json
```

Train:

```bash
python3 ai-analyzer/ml/train_model.py \
  --dataset reports/generated/synthetic_dataset.csv \
  --model-output models/anomaly_classifier.joblib \
  --label-encoder-output models/label_encoder.joblib \
  --metrics-output reports/generated/model_metrics.json
```

Predict:

```bash
python3 ai-analyzer/ml/predict_model.py \
  --model models/anomaly_classifier.joblib \
  --label-encoder models/label_encoder.joblib \
  --dataset reports/generated/synthetic_dataset.csv \
  --limit 20
```

---

## 8. Scenario Expectations

| Scenario | Rule-Based Classification | ML Label | Frontend Visual Focus |
|---|---|---|---|
| Normal | `NORMAL` or `WARNING` if queue pressure occurs | `NORMAL` | Baseline periodic tasks and bounded queues. |
| Priority scheduler | `NORMAL` or `WARNING` if queue pressure occurs | `NORMAL` | Priority scheduling concept. |
| EDF scheduler | `NORMAL` or `WARNING` if queue pressure occurs | `NORMAL` | Deadline-aware scheduling concept. |
| Queue overflow | `WARNING` | `QUEUE_PRESSURE` | Queue pressure chart and queue-full drops. |
| CPU spike | `UNSTABLE` if deadline misses occur | `CPU_SPIKE` | Task runtime timeline and deadline risk. |
| Task crash | `UNSTABLE` | `TASK_CRASH` | Fault explanation and task skipped/failure signals. |
| Slow task | `UNSTABLE` | `SLOW_TASK` | Deadline misses and long task duration. |
| Dropped messages | `WARNING` | `DROPPED_MESSAGES` | Fault-injected drop explanation. |
| Watchdog slow task | `UNSTABLE` | `WATCHDOG_RECOVERY` | Watchdog timeout and recovery explanation. |

---

## 9. Backend Integration

Current flow:

```text
POST /api/runs
  -> validate scenario ID
  -> run C++ runtime
  -> copy runtime log to runs/<runId>/runtime_logs.jsonl
  -> run analyze.py
  -> save runs/<runId>/analysis.txt
  -> parse analyzer text
  -> persist parsed summary in PostgreSQL
  -> return structured JSON
```

Analysis API:

```text
GET /api/runs/<runId>/analysis
```

Returns:

- Runtime health.
- Event counts.
- Severity counts.
- Task metrics.
- Message summary.
- Root causes.
- Raw analyzer report.

Persisted database tables:

```text
runs
run_event_counts
run_severity_counts
run_task_metrics
run_root_causes
```

Important:

```text
The backend accepts only known scenario IDs.
It does not accept arbitrary user-supplied config paths.
```

Docker backend note:

```text
The backend Docker image must include the compiled C++ runtime and Python analyzer files.
Phase 30 fixed backend Docker compilation by installing CMake and Ninja in the build stage.
```

---

## 10. Frontend Integration

Phase 28 dashboard consumed analysis through:

```text
frontend/src/api/minirtosApi.ts
frontend/src/components/AnalysisPanel.tsx
```

Phase 29 expanded display through:

```text
frontend/src/content/learningContent.ts
frontend/src/components/LearningModulePanel.tsx
frontend/src/components/QueuePressureChart.tsx
frontend/src/components/TaskTimeline.tsx
frontend/src/components/FaultExplanationPanel.tsx
```

Phase 30 added two valid frontend serving modes:

```text
Dev:
  http://localhost:5173

Production:
  http://localhost:3000
```

Frontend call:

```text
GET /api/runs/{runId}/analysis
GET /api/runs/{runId}/logs
```

Displayed fields:

```text
runtimeHealth
eventsLoaded
simulationName
schedulerMode
configuredDurationSeconds
observedDurationMs
messageSummary
taskMetrics
rootCauses
rawReport
```

Student-facing purpose:

- Show why a run is `NORMAL`, `WARNING`, or `UNSTABLE`.
- Separate queue-full drops from fault-injected drops.
- Show which tasks missed deadlines.
- Visualize message drops and queue pressure.
- Visualize task duration and deadline risk.
- Explain analyzer root causes.
- Show raw analyzer output for transparency.

---

## 11. Verified Queue Overflow Example

A verified `queue_overflow` analysis returned:

```text
runtimeHealth=WARNING
eventsLoaded=3064
simulationName=queue_overflow
schedulerMode=round_robin
configuredDurationSeconds=30
observedDurationMs=30000
messageDropped=956
queueFullDrops=956
faultInjectedDrops=0
```

Interpretation:

```text
The run completed successfully, but the analyzer correctly classified it as WARNING because bounded queue pressure caused queue-full message drops.
```

In the frontend dashboard, this should appear in:

```text
latest run card
persisted history
message summary
queue pressure visualizer
fault/health explanation panel
raw analyzer report
```

---

## 12. Phase 30 Docker Verification for Analysis Flow

Backend:

```bash
docker compose up -d postgres
docker compose build --no-cache backend
docker compose up -d backend
```

Production frontend:

```bash
docker compose --profile prod build --no-cache frontend-prod
docker compose --profile prod up -d frontend-prod
```

Check analysis-capable backend:

```bash
curl -i http://localhost:8081/api/scenarios

curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"queue_overflow"}'
```

Open production frontend:

```text
http://localhost:3000
```

Expected:

```text
Run history loads.
Completed run analysis loads.
Queue pressure visualizer appears.
Task timeline appears.
Fault/health explanation panel appears.
Raw report expands.
```

---

## 13. Limitations

- Rule thresholds are manual.
- Labels are scenario-derived.
- ML is trained on synthetic telemetry.
- The classifier is not production-validated.
- Backend analyzer integration currently uses deterministic analyzer output only.
- ML prediction is not yet exposed through the backend API.
- Runtime logs are still stored as files; PostgreSQL stores metadata and parsed analysis summaries.
- Phase 29 frontend visualizers summarize parsed analyzer fields but do not yet provide full event-by-event charts.
- Phase 30 improved Docker reliability but did not change analyzer logic.
