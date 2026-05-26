# MiniRTOS-Linux Performance, Fault, Dataset, and ML Benchmark Report

## 1. Purpose

This benchmark report summarizes the observed behavior of MiniRTOS-Linux across normal, scheduler, fault-injected, dataset-generation, and ML-classifier workflows.

MiniRTOS-Linux is a software-only C++20 embedded runtime simulator that models periodic tasks, round-robin, priority, and earliest-deadline-first scheduling, bounded message queues, structured JSONL telemetry, configurable fault injection, watchdog monitoring, simulated recovery behavior, Python-based runtime analysis, synthetic training-dataset generation, and a trained lightweight ML anomaly classifier.

The benchmark phase demonstrates that the runtime can:

- Execute periodic simulated tasks.
- Validate priority and earliest-deadline-first scheduler modes.
- Produce structured JSONL logs.
- Detect queue pressure through bounded message queue telemetry.
- Detect slow-task and CPU-spike behavior through deadline miss metrics.
- Detect message drop faults through message-drop telemetry.
- Detect repeated deadline misses through watchdog timeout and recovery events.
- Detect simulated task-crash behavior through `task_failed` and `task_skipped` telemetry.
- Convert scenario logs into labeled synthetic training rows.
- Train a lightweight ML classifier from generated telemetry features.
- Produce prediction labels and confidence values.

---

## 2. Test Environment

The benchmark logs are generated from the Dockerized MiniRTOS-Linux demo.

Commands:

```bash
docker compose up --build demo
ls -lh logs
ls -lh reports/generated
ls -lh models
```

Generated logs:

```text
logs/normal_runtime_logs.jsonl
logs/priority_scheduler_runtime_logs.jsonl
logs/deadline_scheduler_runtime_logs.jsonl
logs/queue_overflow_runtime_logs.jsonl
logs/cpu_spike_runtime_logs.jsonl
logs/task_crash_runtime_logs.jsonl
logs/slow_task_runtime_logs.jsonl
logs/dropped_messages_runtime_logs.jsonl
logs/watchdog_runtime_logs.jsonl
```

Generated dataset:

```text
reports/generated/synthetic_dataset.csv
```

Generated ML artifacts:

```text
models/anomaly_classifier.joblib
models/label_encoder.joblib
reports/generated/model_metrics.json
```

Generated reports and model artifacts are ignored by Git.

---

## 3. Scenarios Tested

| Scenario | Config File | Log File | Dataset Label | Purpose |
|---|---|---|---|---|
| Normal runtime | `configs/normal.json` | `logs/normal_runtime_logs.jsonl` | `NORMAL` | Baseline behavior without explicit fault injection. |
| Priority scheduler | `configs/priority_scheduler.json` | `logs/priority_scheduler_runtime_logs.jsonl` | `NORMAL` | Validates priority ordering. |
| Earliest-deadline-first scheduler | `configs/deadline_scheduler.json` | `logs/deadline_scheduler_runtime_logs.jsonl` | `NORMAL` | Validates nearest-deadline ordering. |
| Queue overflow | `configs/queue_overflow.json` | `logs/queue_overflow_runtime_logs.jsonl` | `QUEUE_PRESSURE` | Stresses bounded queue capacity. |
| CPU spike fault | `configs/cpu_spike.json` | `logs/cpu_spike_runtime_logs.jsonl` | `CPU_SPIKE` | Injects simulated CPU-load pressure. |
| Task crash fault | `configs/task_crash.json` | `logs/task_crash_runtime_logs.jsonl` | `TASK_CRASH` | Simulates a task entering failed state. |
| Slow task fault | `configs/slow_task.json` | `logs/slow_task_runtime_logs.jsonl` | `SLOW_TASK` | Simulates a task exceeding its deadline. |
| Dropped messages fault | `configs/dropped_messages.json` | `logs/dropped_messages_runtime_logs.jsonl` | `DROPPED_MESSAGES` | Simulates injected message loss. |
| Watchdog slow task | `configs/watchdog_slow_task.json` | `logs/watchdog_runtime_logs.jsonl` | `WATCHDOG_RECOVERY` | Simulates watchdog timeout and recovery. |

---

## 4. High-Level Runtime Results

| Scenario | Deterministic Status | AI-Style Classification | Expected ML Label | Key Finding |
|---|---|---|---|---|
| Normal runtime | `WARNING` if queue pressure occurs | `WARNING` if queue pressure occurs | `NORMAL` | No explicit fault, but default message rates may create queue pressure. |
| Priority scheduler | `WARNING` if queue pressure occurs | `WARNING` if queue pressure occurs | `NORMAL` | Validates priority ordering while preserving log schema. |
| Earliest-deadline-first scheduler | `WARNING` if queue pressure occurs | `WARNING` if queue pressure occurs | `NORMAL` | Validates EDF ordering while preserving log schema. |
| Queue overflow | `WARNING` | `WARNING` | `QUEUE_PRESSURE` | Produces repeatable queue-full drops without fault injection. |
| CPU spike fault | `UNSTABLE` expected if deadline misses occur | `UNSTABLE` expected | `CPU_SPIKE` | Simulated CPU-load pressure targets `NetworkTask`. |
| Task crash fault | `UNSTABLE` | `UNSTABLE` | `TASK_CRASH` | Produces `task_failed` and `task_skipped` telemetry. |
| Slow task fault | `UNSTABLE` | `UNSTABLE` | `SLOW_TASK` | Produces repeated deadline misses. |
| Dropped messages fault | `WARNING` | `WARNING` | `DROPPED_MESSAGES` | Degrades message reliability without necessarily causing deadline misses. |
| Watchdog slow task | `UNSTABLE` | `UNSTABLE` | `WATCHDOG_RECOVERY` | Logs watchdog timeout and simulated recovery events. |

---

## 5. Previously Observed Metrics

Earlier measured results from the benchmark documentation included:

| Scenario | Key Metric |
|---|---|
| Normal runtime | 339 queue-full drops, 0 deadline misses. |
| Queue overflow | 958 queue-full drops, 0 deadline misses, 0 fault-injected drops. |
| Slow task fault | 174 slow-task fault events and 174 `ControlTask` deadline misses. |
| Dropped messages fault | 176 fault-injected message drops and 0 deadline misses. |
| Watchdog slow task | 22 watchdog timeout events and 22 task recovery events. |

CPU-spike and task-crash final measured counts should be refreshed after the current Docker demo run.

---

## 6. Dataset Generation Results

Phase 21 added dataset generation from scenario logs.

Command:

```bash
python3 ai-analyzer/training/generate_dataset.py   --output reports/generated/synthetic_dataset.csv   --window-ms 5000   --scenario normal=logs/normal_runtime_logs.jsonl   --scenario priority_scheduler=logs/priority_scheduler_runtime_logs.jsonl   --scenario deadline_scheduler=logs/deadline_scheduler_runtime_logs.jsonl   --scenario queue_overflow=logs/queue_overflow_runtime_logs.jsonl   --scenario cpu_spike=logs/cpu_spike_runtime_logs.jsonl   --scenario task_crash=logs/task_crash_runtime_logs.jsonl   --scenario slow_task=logs/slow_task_runtime_logs.jsonl   --scenario dropped_messages=logs/dropped_messages_runtime_logs.jsonl   --scenario watchdog=logs/watchdog_runtime_logs.jsonl
```

Docker command:

```bash
docker compose run --rm training-dataset
```

Expected output:

```text
reports/generated/synthetic_dataset.csv
```

Expected columns:

```text
scenario_name
label
scheduler_mode
window_start_ms
window_end_ms
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

---

## 7. ML Training Results

Phase 22 added ML model training.

Command:

```bash
python3 ai-analyzer/ml/train_model.py   --dataset reports/generated/synthetic_dataset.csv   --model-output models/anomaly_classifier.joblib   --label-encoder-output models/label_encoder.joblib   --metrics-output reports/generated/model_metrics.json
```

Docker command:

```bash
docker compose run --rm ml-train
```

Expected generated artifacts:

```text
models/anomaly_classifier.joblib
models/label_encoder.joblib
reports/generated/model_metrics.json
```

Expected terminal output includes:

```text
MiniRTOS-Linux ML Training
Model type: RandomForestClassifier
Rows: ...
Train rows: ...
Test rows: ...
Accuracy: ...
Labels:
  ...
```

The model should be described as a lightweight supervised classifier trained on synthetic scenario telemetry.

---

## 8. ML Prediction Results

Predict from dataset:

```bash
python3 ai-analyzer/ml/predict_model.py   --model models/anomaly_classifier.joblib   --label-encoder models/label_encoder.joblib   --dataset reports/generated/synthetic_dataset.csv   --limit 20
```

Predict from runtime log windows:

```bash
python3 ai-analyzer/ml/predict_model.py   --model models/anomaly_classifier.joblib   --label-encoder models/label_encoder.joblib   --log logs/task_crash_runtime_logs.jsonl   --window-ms 5000
```

Analyzer integration:

```bash
python3 ai-analyzer/app/analyze.py   --log logs/task_crash_runtime_logs.jsonl   --window-ms 5000   --ml-model models/anomaly_classifier.joblib   --ml-label-encoder models/label_encoder.joblib
```

Expected output includes prediction label and confidence values.

---

## 9. Key Observations

1. The runtime produces structured telemetry suitable for both deterministic analysis and ML feature extraction.
2. The scheduler modes preserve the event schema, so the analyzer and ML pipeline do not need scheduler-specific parsing.
3. Queue pressure, timing faults, message faults, task crashes, and watchdog behavior generate distinct feature patterns.
4. The synthetic dataset generator converts scenario logs into labeled window-level rows.
5. The ML classifier adds a real trained-model layer while preserving the explainable rule-based detector.
6. The analyzer can optionally print ML prediction output without changing the default workflow.
7. Docker now supports runtime scenarios, dataset generation, ML training, and ML prediction.

---

## 10. Limitations

This benchmark is intentionally simulation-based.

Current limitations:

- Timing is simulated through Linux process execution and sleep behavior.
- Queue pressure may appear in normal scenarios depending on message production/consumption rates.
- Synthetic labels are scenario-derived, not human-reviewed per-window labels.
- The trained model is not production-validated.
- Model accuracy on a small synthetic dataset should not be interpreted as real-world performance.
- Recovery behavior is simulated through logs rather than actual process or thread restart.

---

## 11. Recommended Follow-Up Improvements

Future phases can improve the benchmark by adding:

- A tuned normal configuration with no queue drops.
- Larger generated datasets from repeated runs.
- Per-window label refinement.
- Docker/CI smoke tests for dataset generation and ML training.
- Confusion matrix visualization.
- README screenshots or terminal-output examples.
- A final benchmark refresh after all Phase 22 outputs are verified.

---

## 12. Resume and Interview Talking Points

- Built a C++20 embedded-runtime simulator that models periodic tasks, scheduling, bounded queues, fault injection, watchdog monitoring, and structured telemetry.
- Created reproducible scenarios for queue overflow, CPU spikes, task crashes, slow tasks, dropped messages, and watchdog recovery.
- Built a Python analyzer that summarizes runtime health, identifies root causes, and performs explainable anomaly scoring.
- Added a synthetic dataset generator that converts runtime logs into labeled feature rows.
- Trained a lightweight supervised ML classifier on synthetic telemetry and added prediction confidence output.
- Dockerized runtime, analyzer, dataset-generation, ML-training, and ML-prediction workflows.
