# MiniRTOS-Linux AI-Style Anomaly Detector and ML Classifier

## Current Status

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed the Run Orchestration API. Phase 27 completed PostgreSQL/Flyway run persistence. Phase 28 added the React/TypeScript dashboard MVP that can display parsed analyzer summaries from the backend.

The backend can run the deterministic analyzer after each simulation, parse the report, return structured JSON, persist the parsed analysis summary in PostgreSQL, and expose it to the React dashboard.

---

## 1. Purpose

The Python analysis layer reads structured JSONL runtime logs and reports system health.

It includes:

1. Deterministic health analyzer.
2. Explainable time-windowed anomaly detector.
3. Synthetic training-dataset generator.
4. Lightweight ML anomaly classifier.

Phase 26 connected the Spring Boot backend to the deterministic analyzer. Phase 27 persisted run metadata and parsed analyzer summaries in PostgreSQL. Phase 28 connected those persisted summaries to the frontend dashboard.

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
```

Frontend integration files:

```text
frontend/src/api/minirtosApi.ts
frontend/src/types/api.ts
frontend/src/components/AnalysisPanel.tsx
```

---

## 3. Analyzer Commands

```bash
./scripts/run_analyzer.sh logs/runtime_logs.jsonl
./scripts/run_analyzer.sh logs/runtime_logs.jsonl 5000
```

With ML:

```bash
python3 ai-analyzer/app/analyze.py   --log logs/task_crash_runtime_logs.jsonl   --window-ms 5000   --ml-model models/anomaly_classifier.joblib   --ml-label-encoder models/label_encoder.joblib
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
python3 ai-analyzer/training/generate_dataset.py   --output reports/generated/synthetic_dataset.csv   --window-ms 5000   --scenario normal=logs/normal_runtime_logs.jsonl   --scenario priority_scheduler=logs/priority_scheduler_runtime_logs.jsonl   --scenario deadline_scheduler=logs/deadline_scheduler_runtime_logs.jsonl   --scenario queue_overflow=logs/queue_overflow_runtime_logs.jsonl   --scenario cpu_spike=logs/cpu_spike_runtime_logs.jsonl   --scenario task_crash=logs/task_crash_runtime_logs.jsonl   --scenario slow_task=logs/slow_task_runtime_logs.jsonl   --scenario dropped_messages=logs/dropped_messages_runtime_logs.jsonl   --scenario watchdog=logs/watchdog_runtime_logs.jsonl
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
python3 ai-analyzer/ml/train_model.py   --dataset reports/generated/synthetic_dataset.csv   --model-output models/anomaly_classifier.joblib   --label-encoder-output models/label_encoder.joblib   --metrics-output reports/generated/model_metrics.json
```

Predict:

```bash
python3 ai-analyzer/ml/predict_model.py   --model models/anomaly_classifier.joblib   --label-encoder models/label_encoder.joblib   --dataset reports/generated/synthetic_dataset.csv   --limit 20
```

---

## 8. Scenario Expectations

| Scenario | Rule-Based Classification | ML Label |
|---|---|---|
| Normal | `NORMAL` or `WARNING` if queue pressure occurs | `NORMAL` |
| Priority scheduler | `NORMAL` or `WARNING` if queue pressure occurs | `NORMAL` |
| EDF scheduler | `NORMAL` or `WARNING` if queue pressure occurs | `NORMAL` |
| Queue overflow | `WARNING` | `QUEUE_PRESSURE` |
| CPU spike | `UNSTABLE` if deadline misses occur | `CPU_SPIKE` |
| Task crash | `UNSTABLE` | `TASK_CRASH` |
| Slow task | `UNSTABLE` | `SLOW_TASK` |
| Dropped messages | `WARNING` | `DROPPED_MESSAGES` |
| Watchdog slow task | `UNSTABLE` | `WATCHDOG_RECOVERY` |

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

---

## 10. Frontend Integration

Phase 28 dashboard consumes analysis through:

```text
frontend/src/api/minirtosApi.ts
frontend/src/components/AnalysisPanel.tsx
```

Frontend call:

```text
GET /api/runs/{runId}/analysis
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
- Show raw analyzer output for transparency.
- Prepare for future visualizations in Phase 29.

---

## 11. Verified Phase 27/28 Analysis Example

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

In the frontend dashboard, this should appear in the latest run card, persisted history, message summary, and analyzer panel after selecting the completed run.

---

## 12. Limitations

- Rule thresholds are manual.
- Labels are scenario-derived.
- ML is trained on synthetic telemetry.
- The classifier is not production-validated.
- Backend analyzer integration currently uses deterministic analyzer output only.
- ML prediction is not yet exposed through the backend API.
- Runtime logs are still stored as files; PostgreSQL stores metadata and parsed analysis summaries.
- Phase 28 frontend displays parsed analyzer summaries but does not yet visualize time windows/charts.
