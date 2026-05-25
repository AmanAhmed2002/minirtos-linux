# MiniRTOS-Linux Performance and Fault Benchmark Report

## 1. Purpose

This benchmark report summarizes the observed behavior of MiniRTOS-Linux across normal and fault-injected runtime scenarios.

MiniRTOS-Linux is a software-only C++20 embedded runtime simulator that models periodic tasks, bounded message queues, structured JSONL telemetry, configurable fault injection, watchdog monitoring, simulated recovery behavior, and Python-based runtime analysis.

The goal of this benchmark phase is to demonstrate that the runtime can:

- Execute periodic simulated tasks under a round-robin scheduler.
- Produce structured JSONL logs for task, message, fault, watchdog, and recovery events.
- Detect queue pressure through bounded message queue telemetry.
- Detect slow-task behavior through deadline miss metrics.
- Detect message drop faults through message-drop telemetry.
- Detect repeated deadline misses through watchdog timeout and recovery events.
- Support downstream deterministic and AI-style anomaly analysis.

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
logs/slow_task_runtime_logs.jsonl
logs/dropped_messages_runtime_logs.jsonl
logs/watchdog_runtime_logs.jsonl
```

### Analyzer Window Size

The benchmark assumes the default anomaly-analysis window size:

```text
5000 ms
```

## 3. Scenarios Tested

| Scenario | Config File | Log File | Purpose |
|---|---|---|---|
| Normal runtime | `configs/normal.json` | `logs/normal_runtime_logs.jsonl` | Baseline system behavior without explicit fault injection. |
| Slow task fault | `configs/slow_task.json` | `logs/slow_task_runtime_logs.jsonl` | Simulates a task taking longer than its deadline. |
| Dropped messages fault | `configs/dropped_messages.json` | `logs/dropped_messages_runtime_logs.jsonl` | Simulates injected message loss. |
| Watchdog slow task | `configs/watchdog_slow_task.json` | `logs/watchdog_runtime_logs.jsonl` | Simulates slow-task behavior with watchdog timeout and recovery enabled. |

## 4. High-Level Results

| Scenario | Total Events | Info Events | Warning Events | Error Events | Deterministic Status | AI-Style Classification | Key Finding |
|---|---:|---:|---:|---:|---|---|---|
| Normal runtime | 1,444 | 1,105 | 339 | 0 | WARNING | WARNING | No deadline misses or injected faults, but bounded queue pressure caused queue-full message drops. |
| Slow task fault | 1,336 | 731 | 605 | 0 | UNSTABLE | UNSTABLE | `ControlTask` repeatedly exceeded its deadline after slow-task fault injection. |
| Dropped messages fault | 1,617 | 1,103 | 514 | 0 | WARNING | WARNING | Fault injection caused message drops without causing deadline misses. |
| Watchdog slow task | 1,380 | 731 | 627 | 22 | UNSTABLE | UNSTABLE | Watchdog detected repeated deadline misses and logged simulated recovery events. |

## 5. Event Count Summary

| Event Type | Normal | Slow Task Fault | Dropped Messages Fault | Watchdog Slow Task |
|---|---:|---:|---:|---:|
| `runtime_started` | 1 | 1 | 1 | 1 |
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
| Slow task fault | 74 | 54 | 257 | 257 | 0 |
| Dropped messages fault | 80 | 60 | 338 | 162 | 176 |
| Watchdog slow task | 74 | 54 | 257 | 257 | 0 |

## 8. Fault and Watchdog Metrics

| Scenario | Fault Type | Fault Events | Watchdog Timeouts | Recovery Events |
|---|---|---:|---:|---:|
| Normal runtime | None | 0 | 0 | 0 |
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

### 9.2 Slow Task Fault Scenario

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

### 9.3 Dropped Messages Fault Scenario

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

### 9.4 Watchdog Slow Task Scenario

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

## 10. Key Observations

1. The baseline runtime is schedulable from a task-deadline perspective because the normal scenario produced zero deadline misses.
2. The bounded message bus correctly rejects messages when the target queue is full.
3. The default message production and consumption rates create queue pressure because `ControlTask` and `NetworkTask` send messages faster than `LoggerTask` consumes them.
4. Slow-task fault injection creates clear deadline-miss telemetry.
5. Dropped-message fault injection affects message reliability without affecting task timing.
6. Watchdog monitoring successfully detects repeated deadline misses and logs simulated recovery events.
7. The analyzer can distinguish queue pressure, slow-task faults, injected message loss, and watchdog-triggered recovery behavior.

## 11. Limitations

This benchmark is intentionally simulation-based and does not measure real embedded hardware timing.

Current limitations:

- Timing is simulated through Linux process execution and sleep behavior rather than hard real-time scheduling.
- The scheduler currently uses round-robin mode only.
- Queue pressure appears even in the normal scenario because the current default message generation rate exceeds logger consumption rate.
- The anomaly detector is AI-style and feature-based rather than a trained machine learning model.
- Recovery behavior is simulated through logs rather than actual process or thread restart.
- Benchmark results may vary slightly between machines or Docker environments.

## 12. Recommended Follow-Up Improvements

Future phases can improve the benchmark by adding:

- A tuned normal configuration with no queue drops.
- A dedicated `queue_overflow.json` scenario.
- Priority-based or deadline-aware scheduler modes.
- CPU spike fault injection.
- Task crash fault simulation.
- Trained anomaly model using generated scenario data.
- GitHub Actions CI to run C++ and Python tests automatically.
- README screenshots or terminal-output examples.

## 13. Resume and Interview Talking Points

- Built a C++20 embedded-runtime simulator that models periodic tasks, deadlines, bounded queues, fault injection, watchdog monitoring, and structured telemetry.
- Implemented JSONL runtime logging for task execution, queue depth, message drops, deadline misses, injected faults, watchdog timeouts, and simulated recovery.
- Created reproducible fault scenarios for slow tasks and dropped messages.
- Demonstrated that slow-task injection caused 174 deadline misses in `ControlTask`, while watchdog monitoring detected the unhealthy behavior and emitted 22 timeout and 22 recovery events.
- Built a Python analyzer that summarizes runtime health, identifies root causes, and supports AI-style anomaly classification using time-windowed telemetry.
- Dockerized the runtime and analyzer so the full scenario suite can be reproduced with Docker Compose.
