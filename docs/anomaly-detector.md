# MiniRTOS-Linux AI-Style Anomaly Detector and ML Classifier

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

## 1. Purpose

The Python analysis layer reads structured JSONL runtime logs and reports system health.

It includes:

1. Deterministic health analyzer.
2. Explainable time-windowed anomaly detector.
3. Synthetic training-dataset generator.
4. Lightweight ML anomaly classifier.

Phase 26 connected the Spring Boot backend to the deterministic analyzer. The backend can now run a scenario, run `analyze.py`, save the analyzer report, parse key fields, and return structured JSON.

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

Backend Phase 26 analyzer command pattern:

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

## 9. Phase 26 Backend Integration

Current flow:

```text
POST /api/runs
  -> validate scenario ID
  -> run C++ runtime
  -> copy runtime log to runs/<runId>/runtime_logs.jsonl
  -> run analyze.py
  -> save runs/<runId>/analysis.txt
  -> parse analyzer text
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

Important:

```text
The backend accepts only known scenario IDs.
It does not accept arbitrary user-supplied config paths.
```

---

## 10. Limitations

- Rule thresholds are manual.
- Labels are scenario-derived.
- ML is trained on synthetic telemetry.
- The classifier is not production-validated.
- Phase 26 backend analyzer integration currently uses deterministic analyzer output only.
- ML prediction is not yet exposed through the backend API.
- Run metadata is in memory only until Phase 27.
