# MiniRTOS-Linux AI-Style Anomaly Detector

## 1. Purpose

MiniRTOS-Linux includes a Python analysis layer that reads structured JSONL runtime logs and reports system health.

The analyzer has two layers:

1. A deterministic health analyzer.
2. An AI-style time-windowed anomaly detector.

The anomaly detector is currently feature-based and rule-scored. It is called "AI-style" because it follows the structure of a machine-learning pipeline:

```text
runtime logs -> scheduler/task/message/fault/watchdog events -> time windows -> feature extraction -> anomaly score -> classification -> top drivers
```

It is not yet a trained machine learning model.

---

## 2. Main Files

```text
ai-analyzer/app/analyze.py
ai-analyzer/app/anomaly_detector.py
scripts/run_analyzer.sh
```

Related tests:

```text
ai-analyzer/tests/test_analyzer.py
ai-analyzer/tests/test_anomaly_detector.py
```

---

## 3. Analyzer Command

Analyze the latest runtime log:

```bash
./scripts/run_analyzer.sh logs/runtime_logs.jsonl
```

Analyze with a custom window size:

```bash
./scripts/run_analyzer.sh logs/runtime_logs.jsonl 1000
```

Analyze Docker demo logs:

```bash
./scripts/run_analyzer.sh logs/normal_runtime_logs.jsonl 5000
./scripts/run_analyzer.sh logs/slow_task_runtime_logs.jsonl 5000
./scripts/run_analyzer.sh logs/dropped_messages_runtime_logs.jsonl 5000
./scripts/run_analyzer.sh logs/watchdog_runtime_logs.jsonl 5000
```

Current script behavior:

```bash
LOG_PATH="${1:-logs/runtime_logs.jsonl}"
WINDOW_MS="${2:-5000}"

python3 ai-analyzer/app/analyze.py --log "$LOG_PATH" --window-ms "$WINDOW_MS"
```

---

## 4. Input Data

The analyzer reads JSONL logs produced by the C++ runtime.

Default log path:

```text
logs/runtime_logs.jsonl
```

Each line is one structured event.

Important event types include the following. These event types are stable across `round_robin`, `priority`, and `earliest_deadline_first` scheduler modes:

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

Important severity levels include:

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

### 6.1 `NORMAL`

A run is normal when there are no major unhealthy signals:

- No watchdog timeouts
- No task recoveries
- No deadline misses
- No fault injections
- No message drops

### 6.2 `WARNING`

A run is a warning when there are moderate unhealthy signals:

- Fault-injected events exist
- Deadline misses exist
- Message drops exist

### 6.3 `UNSTABLE`

A run is unstable when there are serious unhealthy signals:

- Watchdog timeout events exist
- Task recovery events exist
- Task failure or repeated skipped-task events exist
- Total deadline misses are high
- Slow-task faults exist with deadline misses

---

## 7. Time-Windowed Anomaly Detection

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

Each window becomes a feature dictionary.

This allows the analyzer to identify when during the runtime the system became unhealthy, not just whether the overall run was unhealthy.

---

## 8. Current Feature Set

Per-window features include:

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

These features represent:

- Task execution behavior
- Deadline health
- Message bus pressure
- Fault injection activity, including `cpu_spike` and `task_crash` events
- Task failure and skipped-task telemetry
- Watchdog activity
- Runtime severity level

---

## 9. Anomaly Scoring

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

Current scoring is intentionally explainable. This makes it easier to show why a window was classified as unhealthy.

---

## 10. Window Classification

Current classifications:

```text
NORMAL
WARNING
UNSTABLE
```

### 10.1 Direct Unstable Signals

A window is considered unstable if it contains severe signals such as:

```text
task_failed_count > 0
task_skipped_count >= 3
watchdog_timeout_count > 0
task_recovered_count > 0
deadline_missed_count >= 3
score >= 0.70
```

### 10.2 Warning Signals

A window is considered a warning if:

```text
score >= 0.25
```

### 10.3 Normal Signals

A window is normal when:

```text
score < 0.25
```

and no direct unstable signals are present.

---

## 11. Top Anomaly Drivers

The analyzer reports top anomaly drivers so the classification is explainable.

Example drivers:

```text
deadline_missed_count
max_task_duration_ms
message_dropped_count
queue_full_drop_count
fault_injected_drop_count
fault_injected_count
task_failed_count
task_skipped_count
watchdog_timeout_count
task_recovered_count
warning_event_count
error_event_count
```

This helps connect the final classification to concrete runtime behavior.

---

## 12. Scenario Expectations

| Scenario | Expected Classification | Main Drivers |
|---|---|---|
| Normal runtime | `WARNING` | Queue-full message drops. |
| Priority scheduler runtime | `WARNING` expected if using the same message rates as normal runtime | Queue-full message drops, with task ordering controlled by priority mode. |
| Earliest-deadline-first scheduler runtime | `WARNING` expected if using the same message rates as normal runtime | Queue-full message drops, with task ordering controlled by EDF mode. |
| Queue overflow | `WARNING` | High queue-full message drops caused by bounded queue pressure. |
| CPU spike fault | `UNSTABLE` expected if deadline misses occur | CPU-spike fault events, high task duration, and deadline misses. |
| Task crash fault | `UNSTABLE` | Task-crash fault events, task failure, and skipped-task telemetry. |
| Slow task fault | `UNSTABLE` | Slow-task fault events and deadline misses. |
| Dropped messages fault | `WARNING` | Fault-injected message drops. |
| Watchdog slow task | `UNSTABLE` | Deadline misses, watchdog timeouts, and recovery events. |

---

## 13. How This Supports the Project

The anomaly detector adds an AI/data-analysis layer to the runtime simulator.

It demonstrates:

- Log parsing
- Feature engineering
- Time-window analysis
- Explainable anomaly scoring
- Health classification
- Root-cause reporting
- Separation between runtime generation and analysis

This is useful for resumes and interviews because it connects low-level runtime telemetry to higher-level health analysis.

---

## 14. Limitations

Current limitations:

- The detector is feature/rule-based, not trained.
- It does not use historical baseline learning yet.
- It does not use supervised labels yet.
- It does not persist model artifacts.
- It does not export ONNX or pickle models.
- It does not include visualization yet.
- Thresholds are manually defined.
- Results depend on the simulated scenarios and event schema.

---

## 15. Future Improvements

Recommended improvements:

1. Generate synthetic labeled datasets from many scenario runs.
2. Add a training script under `ai-analyzer/training/`.
3. Train a lightweight model such as logistic regression, random forest, or gradient boosting.
4. Compare trained-model classifications against current rule-based classifications.
5. Export model artifacts.
6. Add confidence scores.
7. Add visualizations for anomaly scores over time.
8. Add a FastAPI endpoint for log upload and analysis.
9. Add a React dashboard for runtime health.
10. Extend GitHub Actions CI with analyzer smoke tests on sample logs and optional Docker image builds.

---

## 16. Interview Talking Points

- The runtime emits structured JSONL telemetry that becomes analyzer input.
- The analyzer separates deterministic health reporting from AI-style anomaly scoring.
- The anomaly detector uses fixed time windows, feature extraction, and explainable scoring.
- The system can distinguish between dedicated queue pressure, CPU-spike timing pressure, task-crash failure behavior, slow-task timing faults, dropped-message reliability faults, and watchdog recovery behavior.
- Scheduler mode changes such as priority and earliest-deadline-first scheduling preserve the same event schema, so the analyzer can continue processing logs without special-case parsing.
- The design is intentionally extensible toward a trained machine learning model.
