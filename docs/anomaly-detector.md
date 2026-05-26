# MiniRTOS-Linux AI-Style Anomaly Detector and ML Classifier

## 1. Purpose

MiniRTOS-Linux includes a Python analysis layer that reads structured JSONL runtime logs and reports system health.

After Phase 22, the analyzer has four related pieces:

1. A deterministic health analyzer.
2. An explainable AI-style time-windowed anomaly detector.
3. A synthetic training-dataset generator.
4. A trained lightweight ML anomaly classifier.

The anomaly detector remains feature-based and rule-scored. It is useful because it explains unhealthy behavior through concrete telemetry drivers.

The ML classifier is trained on the synthetic dataset generated from runtime scenarios. It predicts scenario-style labels and confidence values from the same window-level feature schema.

---

## 2. Main Files

```text
ai-analyzer/app/analyze.py
ai-analyzer/app/anomaly_detector.py
ai-analyzer/training/generate_dataset.py
ai-analyzer/ml/train_model.py
ai-analyzer/ml/predict_model.py
scripts/run_analyzer.sh
```

Related tests:

```text
ai-analyzer/tests/test_analyzer.py
ai-analyzer/tests/test_anomaly_detector.py
ai-analyzer/tests/test_training_dataset.py
ai-analyzer/tests/test_ml_model.py
```

---

## 3. Analyzer Commands

Analyze the latest runtime log:

```bash
./scripts/run_analyzer.sh logs/runtime_logs.jsonl
```

Analyze with a custom window size:

```bash
./scripts/run_analyzer.sh logs/runtime_logs.jsonl 5000
```

Analyze with optional ML output:

```bash
python3 ai-analyzer/app/analyze.py   --log logs/task_crash_runtime_logs.jsonl   --window-ms 5000   --ml-model models/anomaly_classifier.joblib   --ml-label-encoder models/label_encoder.joblib
```

When `--ml-model` is omitted, the analyzer keeps its original behavior.

---

## 4. Input Data

The analyzer reads JSONL logs produced by the C++ runtime.

Default log path:

```text
logs/runtime_logs.jsonl
```

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

Important severity levels:

```text
info
warning
error
```

---

## 5. Deterministic Analyzer

The deterministic analyzer summarizes the full log.

It reports:

- Total event count
- Event counts by type
- Severity counts
- Task run counts
- Deadline miss counts
- Average task duration
- Max task duration
- Messages sent
- Messages received
- Messages dropped
- Queue-full drops
- Fault-injected drops
- Fault injection counts
- Watchdog timeout counts
- Task recovery counts
- Task failure and skipped-task counts
- Likely root causes
- Overall health status

---

## 6. Deterministic Health Classification

Current deterministic classifications:

```text
NORMAL
WARNING
UNSTABLE
```

### `NORMAL`

A run is normal when there are no major unhealthy signals:

- No watchdog timeouts
- No task recoveries
- No task failures
- No skipped failed tasks
- No deadline misses
- No fault injections
- No message drops

### `WARNING`

A run is a warning when there are moderate unhealthy signals:

- Fault-injected events exist
- Deadline misses exist
- Message drops exist

### `UNSTABLE`

A run is unstable when serious unhealthy signals exist:

- Watchdog timeout events
- Task recovery events
- Task failure events
- Repeated skipped-task events
- High deadline misses
- Slow-task faults with deadline misses

---

## 7. Time-Windowed Rule-Based Anomaly Detection

The anomaly detector splits the event stream into fixed-size windows.

Default window size:

```text
5000 ms
```

Example:

```text
Window 1: 0 ms - 4999 ms
Window 2: 5000 ms - 9999 ms
Window 3: 10000 ms - 14999 ms
```

Each window becomes a feature dictionary. This allows the analyzer to identify when the runtime became unhealthy.

---

## 8. Feature Set

Per-window features:

```text
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

The ML classifier also uses:

```text
event_count
```

These features represent:

- Task execution behavior
- Deadline health
- Message bus pressure
- Fault injection activity
- Task failure and skipped-task telemetry
- Watchdog activity
- Runtime severity level

---

## 9. Rule-Based Anomaly Scoring

Each window receives an anomaly score.

The score increases when unhealthy features appear, such as:

- Deadline misses
- High task duration
- Message drops
- Queue-full drops
- Fault-injected drops
- Fault-injected events
- Task failures
- Skipped failed tasks
- Watchdog timeouts
- Task recovery events
- Warning events
- Error events

This scoring is intentionally explainable. The analyzer reports top anomaly drivers for each window.

---

## 10. Rule-Based Window Classification

Current classifications:

```text
NORMAL
WARNING
UNSTABLE
```

Direct unstable signals include:

```text
task_failed_count > 0
task_skipped_count >= 3
watchdog_timeout_count > 0
task_recovered_count > 0
deadline_missed_count >= 3
score >= 0.70
```

Warning signal:

```text
score >= 0.25
```

Normal signal:

```text
score < 0.25
```

---

## 11. Synthetic Training Dataset Generation

Phase 21 added:

```text
ai-analyzer/training/generate_dataset.py
```

The generator reuses the same window splitting and feature extraction logic from the anomaly detector. This keeps the dataset aligned with the runtime anomaly pipeline.

Dataset command:

```bash
python3 ai-analyzer/training/generate_dataset.py   --output reports/generated/synthetic_dataset.csv   --window-ms 5000   --scenario normal=logs/normal_runtime_logs.jsonl   --scenario priority_scheduler=logs/priority_scheduler_runtime_logs.jsonl   --scenario deadline_scheduler=logs/deadline_scheduler_runtime_logs.jsonl   --scenario queue_overflow=logs/queue_overflow_runtime_logs.jsonl   --scenario cpu_spike=logs/cpu_spike_runtime_logs.jsonl   --scenario task_crash=logs/task_crash_runtime_logs.jsonl   --scenario slow_task=logs/slow_task_runtime_logs.jsonl   --scenario dropped_messages=logs/dropped_messages_runtime_logs.jsonl   --scenario watchdog=logs/watchdog_runtime_logs.jsonl
```

Docker command:

```bash
docker compose run --rm training-dataset
```

Output:

```text
reports/generated/synthetic_dataset.csv
```

---

## 12. Dataset Labels

Current labels:

```text
NORMAL
QUEUE_PRESSURE
CPU_SPIKE
TASK_CRASH
SLOW_TASK
DROPPED_MESSAGES
WATCHDOG_RECOVERY
```

Scenario-to-label mapping:

| Scenario | Label |
|---|---|
| Normal, priority scheduler, deadline scheduler | `NORMAL` |
| Queue overflow | `QUEUE_PRESSURE` |
| CPU spike | `CPU_SPIKE` |
| Task crash | `TASK_CRASH` |
| Slow task | `SLOW_TASK` |
| Dropped messages | `DROPPED_MESSAGES` |
| Watchdog slow task | `WATCHDOG_RECOVERY` |

Labels are scenario-derived. Some early windows in a fault scenario may appear normal before the configured fault start time.

---

## 13. ML Classifier

Phase 22 added:

```text
ai-analyzer/ml/train_model.py
ai-analyzer/ml/predict_model.py
```

The classifier uses a lightweight supervised learning pipeline:

```text
synthetic_dataset.csv
  -> event_count + anomaly feature columns
  -> LabelEncoder
  -> RandomForestClassifier
  -> anomaly_classifier.joblib
  -> label_encoder.joblib
  -> model_metrics.json
```

### Train the Model

```bash
python3 ai-analyzer/ml/train_model.py   --dataset reports/generated/synthetic_dataset.csv   --model-output models/anomaly_classifier.joblib   --label-encoder-output models/label_encoder.joblib   --metrics-output reports/generated/model_metrics.json
```

Docker:

```bash
docker compose run --rm ml-train
```

### Predict From Dataset

```bash
python3 ai-analyzer/ml/predict_model.py   --model models/anomaly_classifier.joblib   --label-encoder models/label_encoder.joblib   --dataset reports/generated/synthetic_dataset.csv   --limit 20
```

Docker:

```bash
docker compose run --rm ml-predict
```

### Predict From Runtime Log

```bash
python3 ai-analyzer/ml/predict_model.py   --model models/anomaly_classifier.joblib   --label-encoder models/label_encoder.joblib   --log logs/task_crash_runtime_logs.jsonl   --window-ms 5000
```

---

## 14. Analyzer ML Integration

`analyze.py` supports optional ML output:

```bash
python3 ai-analyzer/app/analyze.py   --log logs/task_crash_runtime_logs.jsonl   --window-ms 5000   --ml-model models/anomaly_classifier.joblib   --ml-label-encoder models/label_encoder.joblib
```

Expected ML section:

```text
ML Anomaly Classifier
=====================

Windows predicted: ...
Highest-confidence prediction: ...
Prediction counts:
  ...
Window ML summary:
  ...
```

If no ML model is passed, this section is skipped.

If the model path is passed but the file is missing, the analyzer prints a clean skipped message instead of failing.

---

## 15. Scenario Expectations

| Scenario | Rule-Based Classification | ML Label |
|---|---|---|
| Normal runtime | `WARNING` if queue pressure occurs | `NORMAL` |
| Priority scheduler runtime | `WARNING` if queue pressure occurs | `NORMAL` |
| EDF scheduler runtime | `WARNING` if queue pressure occurs | `NORMAL` |
| Queue overflow | `WARNING` | `QUEUE_PRESSURE` |
| CPU spike fault | `UNSTABLE` expected if deadline misses occur | `CPU_SPIKE` |
| Task crash fault | `UNSTABLE` | `TASK_CRASH` |
| Slow task fault | `UNSTABLE` | `SLOW_TASK` |
| Dropped messages fault | `WARNING` | `DROPPED_MESSAGES` |
| Watchdog slow task | `UNSTABLE` | `WATCHDOG_RECOVERY` |

---

## 16. How This Supports the Project

The anomaly/ML layer demonstrates:

- Log parsing
- Feature engineering
- Time-window analysis
- Explainable anomaly scoring
- Root-cause reporting
- Scenario-derived labeled dataset generation
- Supervised ML training
- Prediction confidence output
- Optional model integration into an existing CLI analyzer

This connects low-level runtime telemetry to higher-level health analysis.

---

## 17. Limitations

Current limitations:

- Rule-based thresholds are manually defined.
- Dataset labels are scenario-derived, not manually annotated per-window labels.
- The ML model is trained on synthetic scenario telemetry.
- The trained classifier is not production-validated.
- Generated model artifacts are ignored by Git by default.
- Accuracy can look high on small synthetic datasets, so results should be described carefully.

---

## 18. Future Improvements

Recommended improvements:

1. Generate larger datasets from repeated scenario runs.
2. Add per-window labels instead of only scenario-derived labels.
3. Compare random forest against logistic regression or gradient boosting.
4. Add confusion matrix visualization.
5. Export an ONNX model.
6. Add CI smoke tests for ML training and prediction.
7. Add FastAPI endpoint for log upload and ML prediction.
8. Add React dashboard for runtime health and anomaly windows.
