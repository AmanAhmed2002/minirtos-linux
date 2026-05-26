# MiniRTOS-Linux Fault Injection Guide

## 1. Purpose

MiniRTOS-Linux includes configurable fault injection so unhealthy runtime behavior can be reproduced, logged, analyzed, benchmarked, and used as synthetic training data for the ML classifier.

Fault injection turns the simulator from a basic runtime demo into a resilience and observability project. It generates meaningful telemetry such as deadline misses, dropped messages, watchdog timeouts, simulated recovery events, task failures, and skipped-task events.

---

## 2. Fault Injection Components

Main files:

```text
cpp-runtime/include/FaultInjector.hpp
cpp-runtime/src/FaultInjector.cpp
```

Related files:

```text
cpp-runtime/include/Config.hpp
cpp-runtime/src/Config.cpp
cpp-runtime/include/Scheduler.hpp
cpp-runtime/src/Scheduler.cpp
ai-analyzer/app/analyze.py
ai-analyzer/app/anomaly_detector.py
ai-analyzer/training/generate_dataset.py
ai-analyzer/ml/train_model.py
ai-analyzer/ml/predict_model.py
```

---

## 3. Supported Fault Types

Fault injection works with the current scheduler modes:

```text
round_robin
priority
earliest_deadline_first
```

| Fault Type | Description | Main Runtime Impact | Dataset/ML Label |
|---|---|---|---|
| `slow_task` | Adds extra execution time to a selected task after a configured time. | Deadline misses, unstable task timing, possible watchdog timeouts. | `SLOW_TASK` |
| `cpu_spike` | Adds simulated CPU-load delay to a selected task after a configured time. | Increased task duration, deadline misses, unstable timing windows. | `CPU_SPIKE` |
| `task_crash` | Simulates a target task entering a failed state after a configured time. | `task_failed`, `task_skipped`, unstable runtime health. | `TASK_CRASH` |
| `dropped_messages` | Drops matching messages after a configured time using a configured probability. | Message reliability degradation and `message_dropped` telemetry. | `DROPPED_MESSAGES` |

---

## 4. Fault Config Schema

Current C++ fault config shape:

```cpp
struct FaultConfig {
    bool enabled = false;
    std::string type;
    std::string target_task;
    int start_after_ms = 0;
    int extra_execution_time_ms = 0;
    int drop_probability_percent = 0;
};
```

Common JSON fields:

| Field | Purpose |
|---|---|
| `enabled` | Turns fault injection on or off. |
| `type` | Selects the fault type. |
| `target_task` | Selects the affected task or message target. |
| `start_after_ms` | Delays fault activation until the runtime has passed this timestamp. |
| `extra_execution_time_ms` | Adds simulated execution time for timing faults. |
| `drop_probability_percent` | Controls probability of message drops for `dropped_messages`. |

---

## 5. Slow Task Fault

The `slow_task` fault simulates a task taking longer than expected.

Command:

```bash
./scripts/run_fault.sh configs/slow_task.json
```

Expected event types:

```text
fault_injected
task_completed
runtime_summary
```

Expected analyzer behavior:

```text
Runtime status: UNSTABLE
```

Expected ML label after dataset generation:

```text
SLOW_TASK
```

---

## 6. CPU Spike Fault

The `cpu_spike` fault simulates CPU-load pressure on a selected task.

Command:

```bash
./scripts/run_fault.sh configs/cpu_spike.json
```

Equivalent direct command:

```bash
./cpp-runtime/build/minirtos_runtime --config configs/cpu_spike.json
```

Expected telemetry:

```text
fault_type=cpu_spike
target_task=NetworkTask
extra_execution_time_ms=220
```

Expected analyzer behavior:

```text
Fault summary:
  cpu_spike: greater than 0
```

If the CPU spike makes the target task exceed its deadline, the run should classify as:

```text
UNSTABLE
```

Expected ML label:

```text
CPU_SPIKE
```

---

## 7. Task Crash Fault

The `task_crash` fault simulates a task failure without crashing the real runtime process.

Command:

```bash
./cpp-runtime/build/minirtos_runtime --config configs/task_crash.json
```

Expected behavior:

1. Runtime starts normally.
2. Configured start time is reached.
3. Target task enters a failed simulated state.
4. Runtime logs `fault_injected` with `fault_type=task_crash`.
5. Runtime logs `task_failed`.
6. Future due runs of that task are logged as `task_skipped`.
7. Scheduler continues running remaining tasks.
8. Analyzer classifies the scenario as `UNSTABLE`.

Expected event types:

```text
fault_injected
task_failed
task_skipped
runtime_summary
```

Expected analyzer behavior:

```text
Runtime status: UNSTABLE
Fault summary:
  task_crash: greater than 0
Task failure summary:
  task_failures: 1
  task_skips: greater than 0
```

Expected ML label:

```text
TASK_CRASH
```

---

## 8. Dropped Messages Fault

The `dropped_messages` fault simulates message-level reliability failures.

Command:

```bash
./scripts/run_fault.sh configs/dropped_messages.json
```

Expected event types:

```text
fault_injected
message_dropped
```

Expected drop reason:

```text
fault_injected_drop
```

Expected analyzer classification:

```text
WARNING
```

Expected ML label:

```text
DROPPED_MESSAGES
```

---

## 9. Queue-Full Drops vs Fault-Injected Drops

MiniRTOS-Linux separates two message-drop categories.

| Drop Type | Cause | Meaning |
|---|---|---|
| `queue_full` | Target task queue reached its configured limit. | Bounded queue pressure. |
| `fault_injected_drop` | Fault injector intentionally dropped a matching message. | Simulated message reliability fault. |

This distinction is important because queue pressure is a capacity issue, while fault-injected drops are reliability failures.

---

## 10. Dedicated Queue Overflow Scenario

Phase 18 added:

```text
configs/queue_overflow.json
```

This scenario does not intentionally drop messages through the fault injector. It stresses the bounded message bus by making producer tasks send messages faster than `LoggerTask` can consume them.

Expected behavior:

```text
message_dropped events with reason=queue_full
fault_injected events remain 0
fault_injected_drop events remain 0
deadline misses should remain low or 0
```

Expected analyzer classification:

```text
WARNING
```

Expected ML label:

```text
QUEUE_PRESSURE
```

---

## 11. Watchdog Fault Scenario

The watchdog scenario combines slow-task behavior with watchdog monitoring.

Command:

```bash
./cpp-runtime/build/minirtos_runtime --config configs/watchdog_slow_task.json
```

Expected behavior:

1. `ControlTask` receives slow-task fault injection.
2. `ControlTask` repeatedly misses its deadline.
3. Watchdog detects repeated deadline misses.
4. Runtime logs `watchdog_timeout`.
5. Runtime logs `task_recovered` if recovery is enabled.
6. Analyzer classifies the scenario as unstable.

Expected event types:

```text
fault_injected
watchdog_timeout
task_recovered
```

Expected ML label:

```text
WATCHDOG_RECOVERY
```

---

## 12. Run Fault Scenarios

```bash
./scripts/build_cpp.sh
./scripts/run_fault.sh configs/slow_task.json
./scripts/run_fault.sh configs/cpu_spike.json
./cpp-runtime/build/minirtos_runtime --config configs/task_crash.json
./scripts/run_fault.sh configs/dropped_messages.json
./cpp-runtime/build/minirtos_runtime --config configs/watchdog_slow_task.json
./scripts/run_analyzer.sh logs/runtime_logs.jsonl
```

---

## 13. Docker Fault Scenarios

Run the full Docker demo:

```bash
docker compose up --build demo
```

Run individual Docker services:

```bash
docker compose run --rm runtime-cpu-spike
docker compose run --rm runtime-task-crash
docker compose run --rm runtime-slow-task
docker compose run --rm runtime-dropped-messages
docker compose run --rm runtime-watchdog
docker compose run --rm analyzer
```

Generated scenario logs:

```text
logs/cpu_spike_runtime_logs.jsonl
logs/task_crash_runtime_logs.jsonl
logs/slow_task_runtime_logs.jsonl
logs/dropped_messages_runtime_logs.jsonl
logs/watchdog_runtime_logs.jsonl
```

---

## 14. Fault Scenarios as ML Data Sources

After Phase 21 and Phase 22, fault scenarios also serve as labeled data sources.

Dataset generation:

```bash
docker compose run --rm training-dataset
```

ML training:

```bash
docker compose run --rm ml-train
```

ML prediction:

```bash
docker compose run --rm ml-predict
```

Pipeline:

```text
fault scenario logs
  -> synthetic_dataset.csv
  -> RandomForestClassifier training
  -> model artifact
  -> prediction labels and confidence
```

---

## 15. Expected Analyzer Results

| Scenario | Expected Status | Expected ML Label |
|---|---|---|
| Normal | `WARNING` if queue pressure occurs | `NORMAL` |
| Queue overflow | `WARNING` | `QUEUE_PRESSURE` |
| Slow task | `UNSTABLE` | `SLOW_TASK` |
| CPU spike | `UNSTABLE` expected if deadline misses occur | `CPU_SPIKE` |
| Task crash | `UNSTABLE` | `TASK_CRASH` |
| Dropped messages | `WARNING` | `DROPPED_MESSAGES` |
| Watchdog slow task | `UNSTABLE` | `WATCHDOG_RECOVERY` |

---

## 16. Limitations

Current fault injection is simulation-based.

Limitations:

- `task_crash` simulates failure but does not crash real threads or processes.
- It does not simulate memory corruption.
- It does not simulate corrupted message payloads yet.
- Recovery is logged rather than implemented as a real process restart.
- ML labels are scenario-derived from synthetic logs.

---

## 17. Recommended Future Faults

Recommended future fault modes:

```text
corrupted_message
missed_heartbeat
random_latency
network_partition
```

Recommended future config:

```text
configs/corrupted_message.json
```

---

## 18. Interview Talking Points

- The fault injector makes runtime failures reproducible and observable.
- `slow_task` validates deadline-miss detection and watchdog escalation.
- `cpu_spike` validates simulated CPU-load pressure as a distinct timing fault.
- `task_crash` validates simulated task failure handling without terminating the real runtime process.
- `dropped_messages` validates message reliability analysis without affecting task timing.
- Queue-full drops and fault-injected drops are intentionally separated in telemetry.
- Fault scenarios can be converted into labeled feature rows for supervised ML training.
- The trained model adds prediction confidence on top of the existing explainable analyzer.
