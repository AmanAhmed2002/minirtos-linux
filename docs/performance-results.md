# MiniRTOS-Linux Performance, Fault, Dataset, and ML Benchmark Report
**Updated:** May 26, 2026  
**Phase:** Phase 23 verification refresh after Phase 22 ML integration  
**Project:** MiniRTOS-Linux — Embedded Runtime Simulator with AI-Based Fault Detection

---

## 1. Purpose
This benchmark report summarizes the observed behavior of MiniRTOS-Linux across scheduler, queue-pressure, fault-injected, watchdog, dataset-generation, and ML-classifier workflows.

MiniRTOS-Linux is a software-only C++20 embedded runtime simulator that models periodic tasks, round-robin scheduling, priority scheduling, earliest-deadline-first scheduling, bounded message queues, structured JSONL telemetry, configurable fault injection, watchdog monitoring, simulated recovery behavior, Python-based runtime analysis, synthetic training-dataset generation, and a trained lightweight ML anomaly classifier.

This Phase 23 refresh uses the uploaded JSONL runtime logs to replace the older placeholder/expected benchmark values with actual observed metrics from the latest verified run.

---

## 2. Verification Context
The user confirmed that the local test and Docker workflows pass. This document focuses on the benchmark evidence available from the uploaded JSONL logs.

Verified by user:

```bash
python3 -m pytest ai-analyzer/tests -q
./scripts/run_tests.sh
docker compose config
docker compose up --build demo
docker compose run --rm training-dataset
docker compose run --rm ml-train
docker compose run --rm ml-predict
```

Uploaded logs parsed for this report:

```text
normal_runtime_logs.jsonl
deadline_scheduler_runtime_logs.jsonl
queue_overflow_runtime_logs.jsonl
cpu_spike_runtime_logs.jsonl
task_crash_runtime_logs.jsonl
slow_task_runtime_logs.jsonl
dropped_messages_runtime_logs.jsonl
watchdog_runtime_logs.jsonl
runtime_logs.jsonl
```

Note: `runtime_logs.jsonl` matched the watchdog slow-task scenario contents. A separate `priority_scheduler_runtime_logs.jsonl` file was not included in this upload, so priority-scheduler measured values are not listed in the refreshed tables below.

---

## 3. Scenarios Tested
| Scenario | Config File | Log File | Dataset/ML Label | Purpose |
|---|---|---|---|---|
| Normal runtime | `configs/normal.json` | `normal_runtime_logs.jsonl` | `NORMAL` | Baseline round-robin behavior without explicit fault injection. |
| Earliest-deadline-first scheduler | `configs/deadline_scheduler.json` | `deadline_scheduler_runtime_logs.jsonl` | `NORMAL` | Validates earliest-deadline-first ordering while preserving the runtime log schema. |
| Queue overflow | `configs/queue_overflow.json` | `queue_overflow_runtime_logs.jsonl` | `QUEUE_PRESSURE` | Stresses bounded queue capacity without explicit fault injection. |
| CPU spike fault | `configs/cpu_spike.json` | `cpu_spike_runtime_logs.jsonl` | `CPU_SPIKE` | Injects simulated CPU-load pressure into `NetworkTask`. |
| Task crash fault | `configs/task_crash.json` | `task_crash_runtime_logs.jsonl` | `TASK_CRASH` | Simulates `NetworkTask` entering a failed state while the runtime process continues. |
| Slow task fault | `configs/slow_task.json` | `slow_task_runtime_logs.jsonl` | `SLOW_TASK` | Injects repeated slow-task timing pressure into `ControlTask`. |
| Dropped messages fault | `configs/dropped_messages.json` | `dropped_messages_runtime_logs.jsonl` | `DROPPED_MESSAGES` | Injects message reliability faults through `fault_injected_drop` behavior. |
| Watchdog slow task | `configs/watchdog_slow_task.json` | `watchdog_runtime_logs.jsonl` | `WATCHDOG_RECOVERY` | Combines slow-task timing pressure with watchdog timeout and simulated recovery telemetry. |
| Priority scheduler | `configs/priority_scheduler.json` | Not included in uploaded logs | `NORMAL` | Expected to validate priority ordering; refresh when `priority_scheduler_runtime_logs.jsonl` is available. |

---

## 4. High-Level Runtime Results
| Scenario | Scheduler Mode | Events | Runtime Status | Info | Warnings | Errors | Key Finding |
|---|---|---:|---|---:|---:|---:|---|
| Normal runtime | `round_robin` | 1444 | `WARNING` | 1105 | 339 | 0 | Baseline run completed with no deadline misses, no faults, and queue-full drops caused by bounded queue pressure. |
| Earliest-deadline-first scheduler | `earliest_deadline_first` | 1444 | `WARNING` | 1105 | 339 | 0 | EDF run preserved the same telemetry profile as the baseline run while using the deadline scheduler mode. |
| Queue overflow | `round_robin` | 3070 | `WARNING` | 2112 | 958 | 0 | Dedicated queue-overflow scenario created the strongest queue pressure with no deadline misses and no fault-injected drops. |
| CPU spike fault | `round_robin` | 1070 | `UNSTABLE` | 690 | 380 | 0 | CPU spike scenario produced CPU-spike fault events and deadline misses, especially on `NetworkTask`. |
| Task crash fault | `round_robin` | 1245 | `UNSTABLE` | 905 | 338 | 2 | Task-crash scenario logged one task failure and repeated skipped-task telemetry while the runtime continued. |
| Slow task fault | `round_robin` | 1336 | `UNSTABLE` | 731 | 605 | 0 | Slow-task scenario produced repeated `ControlTask` deadline misses. |
| Dropped messages fault | `round_robin` | 1625 | `WARNING` | 1105 | 520 | 0 | Dropped-message scenario separated fault-injected drops from queue-full drops. |
| Watchdog slow task | `round_robin` | 1380 | `UNSTABLE` | 731 | 627 | 22 | Watchdog scenario escalated slow-task deadline misses into timeout and recovery telemetry. |
| Priority scheduler | `priority` | Not measured | Not measured | Not measured | Not measured | Not measured | Upload `priority_scheduler_runtime_logs.jsonl` to refresh this row. |

---

## 5. Message, Fault, Watchdog, and Failure Metrics
| Scenario | Messages Sent | Messages Received | Messages Dropped | Queue-Full Drops | Fault-Injected Drops | Fault Events | Deadline Misses | Watchdog Timeouts | Recoveries | Task Failures | Task Skips |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal runtime | 80 | 60 | 339 | 339 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Earliest-deadline-first scheduler | 80 | 60 | 339 | 339 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Queue overflow | 33 | 30 | 958 | 958 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| CPU spike fault | 78 | 58 | 186 | 186 | 0 | 97 | 193 | 0 | 0 | 0 | 0 |
| Task crash fault | 80 | 60 | 239 | 239 | 0 | 1 | 0 | 0 | 0 | 1 | 99 |
| Slow task fault | 74 | 54 | 257 | 257 | 0 | 174 | 174 | 0 | 0 | 0 | 0 |
| Dropped messages fault | 80 | 60 | 339 | 158 | 181 | 181 | 0 | 0 | 0 | 0 | 0 |
| Watchdog slow task | 74 | 54 | 257 | 257 | 0 | 174 | 174 | 22 | 22 | 0 | 0 |

---

## 6. Fault-Type Breakdown
| Scenario | Fault-Type Counts |
|---|---|
| Normal runtime | None |
| Earliest-deadline-first scheduler | None |
| Queue overflow | None |
| CPU spike fault | `cpu_spike`: 97 |
| Task crash fault | `task_crash`: 1 |
| Slow task fault | `slow_task`: 174 |
| Dropped messages fault | `dropped_messages`: 181 |
| Watchdog slow task | `slow_task`: 174 |

---

## 7. Per-Task Runtime Metrics
Average and maximum durations are computed from `task_completed` events in the uploaded logs.

| Scenario | Task | Runs | Deadline Misses | Avg Duration ms | Max Duration ms |
|---|---|---:|---:|---:|---:|
| Normal runtime | `ControlTask` | 299 | 0 | 10.00 | 10.00 |
| Normal runtime | `NetworkTask` | 120 | 0 | 20.00 | 20.00 |
| Normal runtime | `LoggerTask` | 60 | 0 | 15.00 | 15.00 |
| Earliest-deadline-first scheduler | `ControlTask` | 299 | 0 | 10.00 | 10.00 |
| Earliest-deadline-first scheduler | `NetworkTask` | 120 | 0 | 20.00 | 20.00 |
| Earliest-deadline-first scheduler | `LoggerTask` | 60 | 0 | 15.00 | 15.00 |
| Queue overflow | `ControlTask` | 594 | 0 | 5.00 | 5.00 |
| Queue overflow | `NetworkTask` | 397 | 0 | 8.00 | 8.00 |
| Queue overflow | `LoggerTask` | 30 | 0 | 15.00 | 15.00 |
| CPU spike fault | `ControlTask` | 147 | 96 | 10.00 | 10.00 |
| CPU spike fault | `NetworkTask` | 117 | 97 | 202.39 | 240.00 |
| CPU spike fault | `LoggerTask` | 58 | 0 | 15.00 | 15.00 |
| Task crash fault | `ControlTask` | 299 | 0 | 10.00 | 10.00 |
| Task crash fault | `NetworkTask` | 20 | 0 | 20.00 | 20.00 |
| Task crash fault | `LoggerTask` | 60 | 0 | 15.00 | 15.00 |
| Slow task fault | `ControlTask` | 224 | 174 | 103.21 | 130.00 |
| Slow task fault | `NetworkTask` | 107 | 0 | 20.00 | 20.00 |
| Slow task fault | `LoggerTask` | 54 | 0 | 15.00 | 15.00 |
| Dropped messages fault | `ControlTask` | 299 | 0 | 10.00 | 10.00 |
| Dropped messages fault | `NetworkTask` | 120 | 0 | 20.00 | 20.00 |
| Dropped messages fault | `LoggerTask` | 60 | 0 | 15.00 | 15.00 |
| Watchdog slow task | `ControlTask` | 224 | 174 | 103.21 | 130.00 |
| Watchdog slow task | `NetworkTask` | 107 | 0 | 20.00 | 20.00 |
| Watchdog slow task | `LoggerTask` | 54 | 0 | 15.00 | 15.00 |

---

## 8. Scenario Observations
### 8.1 Normal Runtime

The normal runtime completed with 1,444 events, no deadline misses, no fault injection, no watchdog events, and 339 queue-full message drops. This means the run is healthy from a task-timing perspective, but still surfaces bounded-queue pressure.

### 8.2 Earliest-Deadline-First Scheduler

The earliest-deadline-first scheduler run completed with the same top-level telemetry profile as the normal run: 1,444 events, 339 queue-full drops, and 0 deadline misses. This confirms that the EDF scheduler mode preserves the same log schema and analyzer compatibility while changing the scheduling strategy.

### 8.3 Queue Overflow

The queue-overflow scenario produced 3,070 events and 958 queue-full drops. There were 0 fault-injected drops, 0 deadline misses, 0 watchdog timeouts, and 0 task failures. This remains the clearest benchmark for bounded-queue pressure independent of fault injection.

### 8.4 CPU Spike

The CPU-spike scenario produced 97 `cpu_spike` fault events and 193 total deadline misses. `NetworkTask` recorded 97 deadline misses with a maximum observed duration of 240 ms, while `ControlTask` recorded 96 deadline misses due to downstream timing pressure. This scenario is correctly classified as unstable.

### 8.5 Task Crash

The task-crash scenario produced 1 `task_crash` fault event, 1 `task_failed` event, and 99 `task_skipped` events. `NetworkTask` completed 20 runs before entering the failed state. The runtime process continued, which confirms that the crash behavior is simulated through scheduler state and telemetry rather than a real process crash.

### 8.6 Slow Task

The slow-task scenario produced 174 `slow_task` fault events and 174 `ControlTask` deadline misses. `ControlTask` reached a maximum observed duration of 130 ms against an 80 ms deadline. This scenario is correctly classified as unstable.

### 8.7 Dropped Messages

The dropped-message scenario produced 181 fault-injected message drops and 158 queue-full drops. This confirms that the analyzer can separate reliability faults from bounded-queue pressure.

### 8.8 Watchdog Slow Task

The watchdog scenario produced the same slow-task pressure as the slow-task scenario, plus 22 watchdog timeout events and 22 simulated task recovery events. This confirms the watchdog escalation path from repeated deadline misses into timeout and recovery telemetry.

---

## 9. Synthetic Dataset Implications
Using a 5,000 ms window size, the uploaded benchmark logs produce **56 derived window rows** across the 8 uploaded non-duplicate scenario logs.

| Scenario | Label | Derived 5s Windows |
|---|---|---:|
| Normal runtime | `NORMAL` | 7 |
| Earliest-deadline-first scheduler | `NORMAL` | 7 |
| Queue overflow | `QUEUE_PRESSURE` | 7 |
| CPU spike fault | `CPU_SPIKE` | 7 |
| Task crash fault | `TASK_CRASH` | 7 |
| Slow task fault | `SLOW_TASK` | 7 |
| Dropped messages fault | `DROPPED_MESSAGES` | 7 |
| Watchdog slow task | `WATCHDOG_RECOVERY` | 7 |
| **Total from uploaded logs** |  | **56** |

A complete 9-scenario dataset that also includes the priority scheduler log would be expected to add another 7 windows, for a total of approximately **63 rows** with the current 30-second runs and 5,000 ms window size.

---

## 10. ML Classifier Benchmark Context
Phase 22 added the trained ML classifier workflow:

```bash
python3 ai-analyzer/ml/train_model.py \
  --dataset reports/generated/synthetic_dataset.csv \
  --model-output models/anomaly_classifier.joblib \
  --label-encoder-output models/label_encoder.joblib \
  --metrics-output reports/generated/model_metrics.json

python3 ai-analyzer/ml/predict_model.py \
  --model models/anomaly_classifier.joblib \
  --label-encoder models/label_encoder.joblib \
  --dataset reports/generated/synthetic_dataset.csv \
  --limit 20
```

Expected generated artifacts:

```text
models/anomaly_classifier.joblib
models/label_encoder.joblib
reports/generated/model_metrics.json
```

The user confirmed the ML-related commands pass. Exact accuracy, train/test split, label distribution, and confusion-matrix values should be copied from `reports/generated/model_metrics.json` if this report is refreshed again with the metrics file included.

Correct interpretation:

- The classifier is a lightweight supervised ML layer.
- It is trained on synthetic scenario telemetry generated by the simulator.
- It predicts scenario-style anomaly labels with confidence values.
- It should not be described as production-validated AI.

---

## 11. Final Measured Summary
| Scenario | Final Benchmark Result |
|---|---|
| Normal runtime | Pass. Baseline run produced no deadline misses or faults; queue-full drops show bounded-queue pressure. |
| Earliest-deadline-first scheduler | Pass. EDF run preserved analyzer-compatible telemetry and produced no deadline misses. |
| Queue overflow | Pass. Queue pressure reproduced clearly with 958 queue-full drops and no fault-injected drops. |
| CPU spike fault | Pass. CPU-spike fault reproduced with 97 fault events and 193 total deadline misses. |
| Task crash fault | Pass. Task-crash behavior reproduced with 1 failure and 99 skipped-task events while runtime continued. |
| Slow task fault | Pass. Slow-task behavior reproduced with 174 `ControlTask` deadline misses. |
| Dropped messages fault | Pass. Fault-injected drops reproduced and separated from queue-full drops. |
| Watchdog slow task | Pass. Watchdog escalation reproduced with 22 timeouts and 22 recoveries. |
| Priority scheduler | Not refreshed from uploaded logs. Re-run/upload `priority_scheduler_runtime_logs.jsonl` if exact measured values are required. |

---

## 12. Limitations
Current limitations remain:

- Timing is simulated on Linux, not hard real-time hardware.
- Task-crash behavior simulates task failure through scheduler state and logs rather than killing an actual process or thread.
- Recovery behavior is represented through telemetry rather than a real restart mechanism.
- Queue pressure can appear in baseline scenarios depending on message production and consumption rates.
- Synthetic ML labels are scenario-derived, not manually reviewed per-window labels.
- ML metrics are not listed in this refresh because `model_metrics.json` was not included with the uploaded benchmark logs.

---

## 13. Recommended Next Updates
Recommended follow-up polish:

1. Add or upload `priority_scheduler_runtime_logs.jsonl` and refresh the priority row.
2. Paste or upload `reports/generated/model_metrics.json` if exact ML accuracy and confusion-matrix values should be included.
3. Keep generated logs, datasets, metrics, and `.joblib` files ignored by Git.
4. Commit this refreshed benchmark report as:

```bash
git add docs/performance-results.md
git commit -m "Refresh final benchmark results"
git push
```

---

## 14. Resume and Interview Talking Points
Updated measured points that can be discussed carefully:

- Queue-overflow benchmark produced 958 queue-full drops with 0 deadline misses and 0 fault-injected drops.
- CPU-spike benchmark produced 97 CPU-spike fault events and 193 total deadline misses.
- Task-crash benchmark produced 1 task failure and 99 skipped-task events while the runtime process continued.
- Slow-task benchmark produced 174 slow-task fault events and 174 `ControlTask` deadline misses.
- Dropped-message benchmark produced 181 fault-injected drops and 158 queue-full drops, proving that the analyzer separates reliability faults from capacity pressure.
- Watchdog benchmark produced 22 watchdog timeouts and 22 simulated recovery events.
- The ML pipeline trains a lightweight classifier on synthetic telemetry and reports prediction labels with confidence values.
