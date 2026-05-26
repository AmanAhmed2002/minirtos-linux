# MiniRTOS-Linux Performance and Fault Benchmark Report

## 1. Purpose

This benchmark report summarizes the observed behavior of MiniRTOS-Linux across normal and fault-injected runtime scenarios.

MiniRTOS-Linux is a software-only C++20 embedded runtime simulator that models periodic tasks, round-robin, priority, and earliest-deadline-first scheduling, bounded message queues, structured JSONL telemetry, configurable fault injection, watchdog monitoring, simulated recovery behavior, Python-based runtime analysis, and synthetic training-dataset generation.

The goal of this benchmark phase is to demonstrate that the runtime can:

- Execute periodic simulated tasks under round-robin scheduling.
- Validate priority scheduling as an advanced scheduler mode added in Phase 16.
- Validate earliest-deadline-first scheduling as an advanced scheduler mode added in Phase 17.
- Produce structured JSONL logs for task, message, fault, watchdog, and recovery events.
- Detect queue pressure through bounded message queue telemetry.
- Detect slow-task behavior through deadline miss metrics.
- Detect message drop faults through message-drop telemetry.
- Detect repeated deadline misses through watchdog timeout and recovery events.
- Detect simulated task-crash behavior through `task_failed` and `task_skipped` telemetry.
- Support downstream deterministic and AI-style anomaly analysis.
- Convert scenario logs into labeled synthetic training-data rows for future ML work.

## 2. Test Environment

The benchmark logs were generated from the Dockerized MiniRTOS-Linux demo added in Phase 12.

The Docker demo runs the runtime and analyzer across multiple scenarios and writes generated logs into the local `logs/` directory.

### Commands Used

```bash
docker compose up --build demo
ls -lh logs
```

### Generated Logs

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

### Generated Dataset

Phase 21 adds:

```text
reports/generated/synthetic_dataset.csv
```

Generated reports are ignored by Git.

### Analyzer Window Size

The benchmark assumes the default anomaly-analysis window size:

```text
5000 ms
```

## 3. Scenarios Tested

| Scenario | Config File | Log File | Dataset Label | Purpose |
|---|---|---|---|---|
| Normal runtime | `configs/normal.json` | `logs/normal_runtime_logs.jsonl` | `NORMAL` | Baseline system behavior without explicit fault injection. |
| Priority scheduler | `configs/priority_scheduler.json` | `logs/priority_scheduler_runtime_logs.jsonl` | `NORMAL` | Validates that due tasks can be ordered by priority instead of config order. |
| Earliest-deadline-first scheduler | `configs/deadline_scheduler.json` | `logs/deadline_scheduler_runtime_logs.jsonl` | `NORMAL` | Validates that due tasks can be ordered by nearest absolute deadline instead of config order. |
| Queue overflow | `configs/queue_overflow.json` | `logs/queue_overflow_runtime_logs.jsonl` | `QUEUE_PRESSURE` | Intentionally stresses `LoggerTask` bounded queue capacity. |
| CPU spike fault | `configs/cpu_spike.json` | `logs/cpu_spike_runtime_logs.jsonl` | `CPU_SPIKE` | Injects simulated CPU-load pressure into `NetworkTask`. |
| Task crash fault | `configs/task_crash.json` | `logs/task_crash_runtime_logs.jsonl` | `TASK_CRASH` | Simulates `NetworkTask` entering a failed state without terminating the runtime process. |
| Slow task fault | `configs/slow_task.json` | `logs/slow_task_runtime_logs.jsonl` | `SLOW_TASK` | Simulates a task taking longer than its deadline. |
| Dropped messages fault | `configs/dropped_messages.json` | `logs/dropped_messages_runtime_logs.jsonl` | `DROPPED_MESSAGES` | Simulates injected message loss. |
| Watchdog slow task | `configs/watchdog_slow_task.json` | `logs/watchdog_runtime_logs.jsonl` | `WATCHDOG_RECOVERY` | Simulates slow-task behavior with watchdog timeout and recovery enabled. |

## 4. High-Level Results

| Scenario | Total Events | Info Events | Warning Events | Error Events | Deterministic Status | AI-Style Classification | Key Finding |
|---|---:|---:|---:|---:|---|---|---|
| Normal runtime | 1,444 | 1,105 | 339 | 0 | WARNING | WARNING | No deadline misses or injected faults, but bounded queue pressure caused queue-full message drops. |
| Queue overflow | 3,070 | 2,112 | 958 | 0 | WARNING | WARNING | Dedicated queue-pressure scenario produced 958 queue-full drops with no deadline misses or fault-injected drops. |
| CPU spike fault | Pending measured result | Pending measured result | Pending measured result | Pending measured result | Pending verification | Pending verification | Simulated CPU-load pressure targets `NetworkTask`; final metrics should be recorded after running Docker/analyzer verification. |
| Task crash fault | Pending measured result | Pending measured result | Pending measured result | Pending measured result | Pending verification | Pending verification | Simulated task failure should produce `task_failed` and `task_skipped` telemetry while the runtime continues. |
| Slow task fault | 1,336 | 731 | 605 | 0 | UNSTABLE | UNSTABLE | `ControlTask` repeatedly exceeded its deadline after slow-task fault injection. |
| Dropped messages fault | 1,617 | 1,103 | 514 | 0 | WARNING | WARNING | Fault injection caused message drops without causing deadline misses. |
| Watchdog slow task | 1,380 | 731 | 627 | 22 | UNSTABLE | UNSTABLE | Watchdog detected repeated deadline misses and logged simulated recovery events. |

## 5. Event Count Summary

| Event Type | Normal | Slow Task Fault | Dropped Messages Fault | Watchdog Slow Task |
|---|---:|---:|---:|---:|
| `runtime_started` | 1 | 1 | 1 | 1 | 1 |
| `scheduler_started` | 1 | 1 | 1 | 1 |
| `task_started` | 479 | 385 | 478 | 385 |
| `task_completed` | 479 | 385 | 478 | 385 |
| `message_sent` | 80 | 74 | 80 | 74 |
| `message_received` | 60 | 54 | 60 | 54 |
| `message_dropped` | 339 | 257 | 338 | 257 |
| `fault_injected` | 0 | 174 | 176 | 174 |
| `watchdog_timeout` | 0 | 0 | 0 | 22 |
| `task_recovered` | 0 | 0 | 0 | 22 |
| `scheduler_finished` | 1 | 1 | 1 | 1 |
| `runtime_summary` | 3 | 3 | 3 | 3 |
| `runtime_finished` | 1 | 1 | 1 | 1 |

## 6. Task-Level Runtime Metrics

### 6.1 Normal Runtime

| Task | Runs | Deadline Misses | Average Duration | Max Duration |
|---|---:|---:|---:|---:|
| `ControlTask` | 299 | 0 | 10 ms | 10 ms |
| `NetworkTask` | 120 | 0 | 20 ms | 20 ms |
| `LoggerTask` | 60 | 0 | 15 ms | 15 ms |

The normal runtime completed without task deadline misses. However, it still produced queue-full message drops because `ControlTask` and `NetworkTask` generated messages faster than `LoggerTask` consumed them.


### 6.1.1 Queue Overflow Runtime

| Task | Runs | Deadline Misses | Average Duration | Max Duration |
|---|---:|---:|---:|---:|
| `ControlTask` | 594 | 0 | 5 ms | 5 ms |
| `NetworkTask` | 397 | 0 | 8 ms | 8 ms |
| `LoggerTask` | 30 | 0 | 15 ms | 15 ms |

The queue-overflow scenario completed without task deadline misses. The warning state came from bounded queue pressure only. The analyzer reported 958 `queue_full` message drops, 0 fault-injected drops, 0 watchdog timeouts, and 0 task recovery events.


### 6.2 Slow Task Fault

| Task | Runs | Deadline Misses | Average Duration | Max Duration |
|---|---:|---:|---:|---:|
| `ControlTask` | 224 | 174 | 103.21 ms | 130 ms |
| `NetworkTask` | 107 | 0 | 20 ms | 20 ms |
| `LoggerTask` | 54 | 0 | 15 ms | 15 ms |

The slow task scenario shows that `ControlTask` was directly impacted by fault injection. Its observed runtime increased significantly, causing 174 deadline misses.

### 6.3 Dropped Messages Fault

| Task | Runs | Deadline Misses | Average Duration | Max Duration |
|---|---:|---:|---:|---:|
| `ControlTask` | 298 | 0 | 10 ms | 10 ms |
| `NetworkTask` | 120 | 0 | 20 ms | 20 ms |
| `LoggerTask` | 60 | 0 | 15 ms | 15 ms |

The dropped messages scenario did not affect task execution timing. All tasks completed without deadline misses, but the fault injector produced message-level failures.

### 6.4 Watchdog Slow Task

| Task | Runs | Deadline Misses | Average Duration | Max Duration |
|---|---:|---:|---:|---:|
| `ControlTask` | 224 | 174 | 103.21 ms | 130 ms |
| `NetworkTask` | 107 | 0 | 20 ms | 20 ms |
| `LoggerTask` | 54 | 0 | 15 ms | 15 ms |

The watchdog scenario used the same slow-task behavior as the slow task fault scenario, but with watchdog monitoring enabled. This resulted in watchdog timeout and recovery telemetry.

## 7. Message Bus Metrics

| Scenario | Messages Sent | Messages Received | Messages Dropped | Queue-Full Drops | Fault-Injected Drops |
|---|---:|---:|---:|---:|---:|
| Normal runtime | 80 | 60 | 339 | 339 | 0 |
| Queue overflow | 33 | 30 | 958 | 958 | 0 |
| Slow task fault | 74 | 54 | 257 | 257 | 0 |
| Dropped messages fault | 80 | 60 | 338 | 162 | 176 |
| Watchdog slow task | 74 | 54 | 257 | 257 | 0 |

## 8. Fault and Watchdog Metrics

| Scenario | Fault Type | Fault Events | Watchdog Timeouts | Recovery Events |
|---|---|---:|---:|---:|
| Normal runtime | None | 0 | 0 | 0 |
| Queue overflow | None | 0 | 0 | 0 |
| CPU spike fault | `cpu_spike` | Pending measured result | Pending measured result | Pending measured result |
| Task crash fault | `task_crash` | Pending measured result | Pending measured result | Pending measured result |
| Slow task fault | `slow_task` | 174 | 0 | 0 |
| Dropped messages fault | `dropped_messages` | 176 | 0 | 0 |
| Watchdog slow task | `slow_task` | 174 | 22 | 22 |

## 9. Scenario Analysis

### 9.1 Normal Runtime

The normal scenario produced no deadline misses and no injected faults. The task durations remained stable:

- `ControlTask`: 10 ms
- `NetworkTask`: 20 ms
- `LoggerTask`: 15 ms

However, the runtime still produced 339 `message_dropped` events due to `queue_full`.

This indicates that the bounded message queue is working correctly, but the default communication pattern creates more messages than `LoggerTask` can consume. This is not a task execution failure, but it is useful telemetry because it shows queue pressure in the system.

Classification:

```text
WARNING
```

Reason:

```text
Queue-full drops occurred even though no explicit fault was injected.
```


### 9.2 Queue Overflow Scenario

Phase 18 added a dedicated queue-overflow benchmark scenario using:

```text
configs/queue_overflow.json
```

This scenario intentionally creates bounded-queue pressure by making `ControlTask` and `NetworkTask` run more frequently while making `LoggerTask` consume messages less frequently with a smaller queue limit.

Observed analyzer result:

```text
Runtime status: WARNING
queue_full_drops: 958
fault_injected_drops: 0
deadline_misses: 0
watchdog_timeouts: 0
task_recoveries: 0
```

Classification:

```text
WARNING
```

Reason:

```text
The runtime remained schedulable, but bounded queue capacity was exceeded.
```

This validates that queue pressure can be reproduced as a standalone benchmark scenario instead of only appearing incidentally in the normal runtime.



### 9.3 CPU Spike Fault Scenario

Phase 19 adds a CPU spike scenario using:

```text
configs/cpu_spike.json
```

This scenario injects simulated CPU-load pressure into `NetworkTask` after the configured start time. The current recommended config uses:

```text
target_task: NetworkTask
start_after_ms: 5000
extra_execution_time_ms: 220
```

Expected analyzer result after verification:

```text
Simulation: cpu_spike
Fault summary:
  cpu_spike: greater than 0
```

If the injected CPU spike makes `NetworkTask` exceed its deadline, the expected deterministic and AI-style classifications are:

```text
UNSTABLE
```

Reason:

```text
CPU-spike fault injection increased target-task duration and produced deadline-miss telemetry.
```

Final measured event counts, task metrics, and anomaly scores should be recorded after running:

```bash
docker compose up --build demo
./scripts/run_analyzer.sh logs/cpu_spike_runtime_logs.jsonl 5000
```


### 9.4 Task Crash Fault Scenario

Phase 20 adds a task crash scenario using:

```text
configs/task_crash.json
```

This scenario simulates `NetworkTask` entering a failed state after the configured start time. The real runtime process should not terminate. Instead, the scheduler should continue running other tasks while logging failure telemetry for the crashed task.

Expected analyzer result after verification:

```text
Simulation: task_crash
Runtime status: UNSTABLE
Fault summary:
  task_crash: greater than 0
Task failure summary:
  task_failures: 1
  task_skips: greater than 0
```

Expected reason:

```text
Task-crash fault injection caused the target task to fail and subsequent due runs to be skipped.
```

Final measured event counts, task metrics, and anomaly scores should be recorded after running:

```bash
docker compose up --build demo
./scripts/run_analyzer.sh logs/task_crash_runtime_logs.jsonl 5000
```


### 9.5 Slow Task Fault Scenario

The slow task scenario injected 174 `slow_task` faults into `ControlTask`.

`ControlTask` normally has an expected duration of 10 ms, but under fault injection it reached up to 130 ms. This caused 174 deadline misses.

Classification:

```text
UNSTABLE
```

Reason:

```text
The target task repeatedly exceeded its deadline after fault injection.
```

Primary root cause:

```text
ControlTask slow_task fault injection
```

### 9.6 Dropped Messages Fault Scenario

The dropped messages scenario injected 176 `dropped_messages` faults.

Unlike the slow task scenario, this did not affect task execution timing. All tasks completed without deadline misses.

However, the system logged both natural queue pressure and fault-injected message drops:

```text
queue_full drops: 162
fault_injected_drop drops: 176
```

Classification:

```text
WARNING
```

Reason:

```text
The system remained schedulable, but message reliability was degraded by injected message loss.
```

Primary root cause:

```text
Dropped message fault injection
```

### 9.7 Watchdog Slow Task Scenario

The watchdog scenario injected the same type of slow-task behavior as the slow task fault scenario, but watchdog monitoring was enabled.

The runtime logged:

```text
watchdog_timeout events: 22
task_recovered events: 22
```

This demonstrates that the watchdog layer detected repeated deadline misses and emitted simulated recovery actions.

Classification:

```text
UNSTABLE
```

Reason:

```text
The system had repeated deadline misses, watchdog timeouts, and simulated task recovery events.
```

Primary root cause:

```text
ControlTask slow_task fault injection caused repeated deadline misses, which triggered watchdog timeout and recovery behavior.
```


## 9.8 Priority Scheduler Scenario

Phase 16 added a priority scheduler mode using this config value:

```json
"scheduler_mode": "priority"
```

Priority mode keeps the same task execution, logging, fault-injection, watchdog, and message-bus behavior as the baseline scheduler. The key difference is how due tasks are ordered. In priority mode, lower numeric priority values run first. For example, `priority: 1` runs before `priority: 2`.

The priority scheduler validation config intentionally lists tasks out of priority order:

```text
LoggerTask priority 3
NetworkTask priority 2
ControlTask priority 1
```

When all three tasks are due, the expected priority-mode execution order is:

```text
ControlTask
NetworkTask
LoggerTask
```

This scenario was added as a runtime validation scenario. The measured benchmark tables above still reflect the Phase 13 Docker benchmark logs. A future Phase 22 benchmark refresh should regenerate and record measured priority-scheduler metrics alongside the existing normal, queue-overflow, CPU-spike, slow-task, dropped-message, and watchdog scenarios.



## 9.9 Earliest-Deadline-First Scheduler Scenario

Phase 17 added an earliest-deadline-first scheduler mode using this config value:

```json
"scheduler_mode": "earliest_deadline_first"
```

This mode keeps the same task execution, logging, fault-injection, watchdog, and message-bus behavior as the existing scheduler modes. The key difference is how due tasks are ordered. When multiple tasks are due, the scheduler runs the task with the nearest absolute deadline first.

Tie-breakers:

```text
1. Earliest absolute deadline
2. Ascending numeric priority if deadlines are tied
3. Stable config/task order if both deadline and priority are tied
```

This scenario was added as a runtime validation scenario. The measured benchmark tables above still reflect the earlier Docker benchmark logs. A future benchmark refresh should regenerate and record priority-scheduler and earliest-deadline-first metrics alongside the normal, queue-overflow, CPU-spike, slow-task, dropped-message, and watchdog scenarios.

## 10. Synthetic Dataset Generation Results

Phase 21 adds dataset generation from scenario logs.

Command:

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

Docker command:

```bash
docker compose run --rm training-dataset
```

Expected output:

```text
reports/generated/synthetic_dataset.csv
```

Expected labels:

```text
NORMAL
QUEUE_PRESSURE
CPU_SPIKE
TASK_CRASH
SLOW_TASK
DROPPED_MESSAGES
WATCHDOG_RECOVERY
```

The generated CSV should be treated as a reproducible artifact, not a committed source file.

## 11. Key Observations

1. The baseline runtime is schedulable from a task-deadline perspective because the normal scenario produced zero deadline misses.
2. The priority scheduler can run due tasks by priority while preserving the same logging and analyzer schema.
3. The earliest-deadline-first scheduler can run due tasks by nearest deadline while preserving the same logging and analyzer schema.
4. The dedicated queue-overflow scenario reproduces bounded-queue pressure with 958 queue-full drops and no deadline misses.
5. The CPU spike scenario adds a distinct timing-pressure fault type that should be tracked separately from slow-task faults after verification.
6. The task crash scenario adds simulated failure telemetry through `task_failed` and `task_skipped` events.
7. The bounded message bus correctly rejects messages when the target queue is full.
4. The default message production and consumption rates create queue pressure because `ControlTask` and `NetworkTask` send messages faster than `LoggerTask` consumes them.
5. Slow-task fault injection creates clear deadline-miss telemetry.
6. Dropped-message fault injection affects message reliability without affecting task timing.
7. Watchdog monitoring successfully detects repeated deadline misses and logs simulated recovery events.
8. The analyzer can distinguish queue pressure, slow-task faults, injected message loss, and watchdog-triggered recovery behavior.

## 12. Limitations

This benchmark is intentionally simulation-based and does not measure real embedded hardware timing.

Current limitations:

- Timing is simulated through Linux process execution and sleep behavior rather than hard real-time scheduling.
- Queue pressure appears even in the normal scenario because the current default message generation rate exceeds logger consumption rate.
- The anomaly detector is AI-style and feature-based rather than a trained machine learning model.
- The synthetic dataset labels are scenario-derived rather than manually annotated.
- Recovery behavior is simulated through logs rather than actual process or thread restart.
- Benchmark results may vary slightly between machines or Docker environments.

## 13. Recommended Follow-Up Improvements

Future phases can improve the benchmark by adding:

- A tuned normal configuration with no queue drops.
- Trained anomaly model using generated scenario data.
- Dataset generator smoke tests in CI.
- Expanded GitHub Actions CI with Docker build and analyzer smoke-test coverage.
- README screenshots or terminal-output examples.

## 14. Resume and Interview Talking Points

- Built a C++20 embedded-runtime simulator that models periodic tasks, round-robin, priority, and earliest-deadline-first scheduling, deadlines, bounded queues, fault injection, watchdog monitoring, and structured telemetry.
- Implemented JSONL runtime logging for task execution, queue depth, message drops, deadline misses, injected faults, watchdog timeouts, and simulated recovery.
- Created reproducible scenarios for queue overflow, CPU spikes, task crashes, slow tasks, and dropped messages.
- Demonstrated that slow-task injection caused 174 deadline misses in `ControlTask`, while watchdog monitoring detected the unhealthy behavior and emitted 22 timeout and 22 recovery events.
- Built a Python analyzer that summarizes runtime health, identifies root causes, and supports AI-style anomaly classification using time-windowed telemetry.
- Dockerized the runtime, analyzer, and dataset generator so the full scenario suite can be reproduced with Docker Compose.
