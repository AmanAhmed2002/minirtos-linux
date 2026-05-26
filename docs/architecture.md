# MiniRTOS-Linux Architecture

## 1. Purpose

MiniRTOS-Linux is a software-only embedded runtime simulator. It models core embedded and RTOS-style ideas using a Linux-friendly C++20 runtime and a Python analysis layer.

The architecture is intentionally modular so each system concept is represented by a clear component:

- Runtime configuration
- Task model
- Scheduler
  - Round-robin mode
  - Priority mode
  - Earliest-deadline-first mode
- Message bus
- Fault injector
  - slow_task
  - dropped_messages
  - cpu_spike
  - task_crash
- Watchdog
- Structured logger
- Python analyzer
- AI-style anomaly detector
- Synthetic training-dataset generator
- Dockerized demonstration workflow

---

## 2. System Overview

```text
+--------------------------+
| Docker Compose           |
|--------------------------|
| demo                     |
| runtime-normal           |
| runtime-priority         |
| runtime-deadline         |
| runtime-queue-overflow   |
| runtime-cpu-spike       |
| runtime-task-crash      |
| runtime-slow-task        |
| runtime-dropped-messages |
| runtime-watchdog         |
| analyzer                 |
+------------+-------------+
             |
             v
+--------------------------+
| C++ Runtime Simulator    |
|--------------------------|
| Config Loader            |
| Task Scheduler           |
| Message Bus              |
| Fault Injector           |
| Watchdog                 |
| JSONL Logger             |
+------------+-------------+
             |
             | logs/*.jsonl
             v
+-------------------------------+
| Python Analyzer               |
|-------------------------------|
| JSONL Parser                  |
| Deterministic Health Report   |
| Task/Message/Fault Metrics    |
| Root-Cause Reporting          |
| AI-Style Anomaly Detector     |
+------------+------------------+
             |
             v
+-------------------------------+
| Docs and Benchmarks           |
|-------------------------------|
| performance-results.md        |
+-------------------------------+
```

---

## 3. C++ Runtime Components

### 3.1 `main.cpp`

`main.cpp` is the runtime entry point.

Responsibilities:

1. Parse the `--config <path>` CLI argument.
2. Load the selected JSON config.
3. Create the runtime logger.
4. Log `runtime_started`.
5. Construct task objects from config.
6. Construct the scheduler.
7. Run the scheduler.
8. Log `runtime_finished`.

Typical command:

```bash
./cpp-runtime/build/minirtos_runtime --config configs/normal.json
```

---

### 3.2 Config Loader

Main files:

```text
cpp-runtime/include/Config.hpp
cpp-runtime/src/Config.cpp
```

The config loader reads runtime settings from JSON.

Current config areas:

- Simulation name
- Duration
- Scheduler mode
- Task definitions
- Optional fault configuration
- Optional watchdog configuration

Example task config:

```json
{
  "name": "ControlTask",
  "period_ms": 100,
  "deadline_ms": 80,
  "priority": 1,
  "execution_time_ms": 10,
  "queue_limit": 10
}
```

The runtime currently uses config files such as:

```text
configs/normal.json
configs/slow_task.json
configs/dropped_messages.json
configs/cpu_spike.json
configs/task_crash.json
configs/watchdog_slow_task.json
```

---

### 3.3 Task Model

Main files:

```text
cpp-runtime/include/Task.hpp
cpp-runtime/src/Task.cpp
```

Each simulated task contains:

- Task name
- Period in milliseconds
- Deadline in milliseconds
- Priority
- Simulated execution time
- Queue limit
- Run count
- Deadline miss count
- Next scheduled run time

The task model allows the scheduler to determine when a task is due and to simulate task execution.

Current simulated task roles:

| Task | Role |
|---|---|
| `ControlTask` | Simulates a fast control-loop task and sends status messages. |
| `NetworkTask` | Simulates network packet work and sends packet messages. |
| `LoggerTask` | Consumes messages from the bounded message bus. |

---

### 3.4 Scheduler

Main files:

```text
cpp-runtime/include/Scheduler.hpp
cpp-runtime/src/Scheduler.cpp
```

The scheduler is responsible for driving the simulated runtime.

Current scheduler modes:

```text
round_robin
priority
earliest_deadline_first
```

Core behavior:

1. Start the scheduler loop.
2. Check which tasks are due.
3. Run due tasks.
4. Apply fault injection if configured, including slow-task, dropped-message, CPU-spike, or task-crash behavior.
5. Log task start and completion events.
6. Inspect task health using the watchdog.
7. Send or receive messages based on task role.
8. Continue until configured duration expires.
9. Log scheduler completion and runtime summaries.


### 3.4.1 Scheduler Modes

MiniRTOS-Linux currently supports three scheduler modes.

| Mode | Config Value | Behavior |
|---|---|---|
| Round robin | `round_robin` | Runs due tasks in the order they appear in the runtime task list. |
| Priority | `priority` | Runs due tasks by ascending priority number. Lower number means higher priority. |
| Earliest deadline first | `earliest_deadline_first` | Runs due tasks by nearest absolute deadline first, then priority, then stable config order. |

The priority scheduler reuses the same execution path as round robin: task start/completion logging, fault injection, watchdog inspection, and message bus handling remain consistent across scheduler modes.

Example priority config:

```json
{
  "simulation_name": "priority_scheduler",
  "duration_seconds": 30,
  "scheduler_mode": "priority",
  "tasks": [
    { "name": "LoggerTask", "period_ms": 500, "deadline_ms": 400, "priority": 3, "execution_time_ms": 15, "queue_limit": 20 },
    { "name": "NetworkTask", "period_ms": 250, "deadline_ms": 200, "priority": 2, "execution_time_ms": 20, "queue_limit": 10 },
    { "name": "ControlTask", "period_ms": 100, "deadline_ms": 80, "priority": 1, "execution_time_ms": 10, "queue_limit": 10 }
  ]
}
```

Although the config lists `LoggerTask` first, priority mode should run due tasks in priority order, with `ControlTask` before `NetworkTask` before `LoggerTask` when all are due.



Example earliest-deadline-first config:

```json
{
  "simulation_name": "deadline_scheduler",
  "duration_seconds": 30,
  "scheduler_mode": "earliest_deadline_first",
  "tasks": [
    { "name": "LoggerTask", "period_ms": 500, "deadline_ms": 400, "priority": 3, "execution_time_ms": 15, "queue_limit": 20 },
    { "name": "NetworkTask", "period_ms": 250, "deadline_ms": 200, "priority": 2, "execution_time_ms": 20, "queue_limit": 10 },
    { "name": "ControlTask", "period_ms": 100, "deadline_ms": 80, "priority": 1, "execution_time_ms": 10, "queue_limit": 10 }
  ]
}
```

When several tasks are due at the same time, `earliest_deadline_first` runs the task with the nearest deadline first. If two due tasks have the same deadline, the scheduler uses ascending numeric priority as the next tie-breaker. If both deadline and priority match, the original task/config order is preserved.

Important scheduler events:

```text
scheduler_started
task_started
task_completed
scheduler_finished
runtime_summary
```

---

### 3.5 Structured JSONL Logger

Main files:

```text
cpp-runtime/include/Logger.hpp
cpp-runtime/src/Logger.cpp
```

The logger writes structured runtime telemetry to JSONL.

Default log path:

```text
logs/runtime_logs.jsonl
```

Each line is a JSON event. This makes the output easy to parse with Python, command-line tools, or future dashboards.

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

### 3.6 Message Bus

Main files:

```text
cpp-runtime/include/Message.hpp
cpp-runtime/include/MessageBus.hpp
cpp-runtime/src/MessageBus.cpp
```

The message bus simulates bounded task-to-task communication.

Message structure:

```cpp
struct Message {
    std::string source_task;
    std::string target_task;
    std::string type;
    std::string payload;
    int sequence_id;
};
```

Message bus behavior:

- Registers one bounded queue per task.
- Enqueues messages when the target queue has capacity.
- Rejects messages when the target queue is full.
- Rejects messages to unknown task queues.
- Supports FIFO receive behavior.
- Exposes queue depth and queue limit telemetry.

Current simulated communication:

| Source Task | Target Task | Message Type |
|---|---|---|
| `ControlTask` | `LoggerTask` | `control_status` |
| `NetworkTask` | `LoggerTask` | `network_packet` |

`LoggerTask` receives at most one message each time it runs.



Phase 18 adds a dedicated queue-overflow scenario through `configs/queue_overflow.json`. This scenario intentionally makes producer tasks run faster than `LoggerTask` can consume messages and lowers the `LoggerTask` queue limit. The result is repeatable `queue_full` telemetry without using the `dropped_messages` fault injector.

Important message events:

```text
message_sent
message_received
message_dropped
```

Common message drop reasons:

```text
queue_full
fault_injected_drop
```

---

### 3.7 Fault Injector

Main files:

```text
cpp-runtime/include/FaultInjector.hpp
cpp-runtime/src/FaultInjector.cpp
```

The fault injector creates reproducible unhealthy runtime scenarios.

Current fault types:

| Fault | Description |
|---|---|
| `slow_task` | Adds extra execution time to a target task after a configured start time. |
| `dropped_messages` | Drops matching messages after a configured start time using a configured probability. |
| `cpu_spike` | Adds simulated CPU-load delay to a target task after a configured start time. |
| `task_crash` | Simulates a target task entering a failed state without terminating the runtime process. |

Example fault config fields:

```json
"faults": {
  "enabled": true,
  "type": "slow_task",
  "target_task": "ControlTask",
  "start_after_ms": 5000,
  "extra_execution_time_ms": 120
}
```

The fault injector logs:

```text
fault_injected
```

Fault-specific impact:

- `slow_task` creates task timing pressure and deadline misses.
- `cpu_spike` creates simulated CPU-load pressure and can produce deadline misses for the targeted task.
- `task_crash` logs task failure and skipped-task telemetry while allowing the overall runtime process to continue.
- `dropped_messages` creates message reliability issues without necessarily affecting task timing.

---

### 3.8 Watchdog

Main files:

```text
cpp-runtime/include/Watchdog.hpp
cpp-runtime/src/Watchdog.cpp
```

The watchdog monitors repeated task deadline misses.

Config fields:

```json
"watchdog": {
  "enabled": true,
  "check_interval_ms": 100,
  "max_consecutive_deadline_misses": 3,
  "recovery_enabled": true,
  "recovery_cooldown_ms": 1000
}
```

Watchdog behavior:

1. Track new deadline misses by task.
2. Count consecutive misses.
3. Log `watchdog_timeout` when a task exceeds the configured threshold.
4. Log `task_recovered` when simulated recovery is enabled.
5. Apply a cooldown to avoid excessive repeated alerts.

Important watchdog events:

```text
watchdog_timeout
task_recovered
```

---

## 4. Runtime Flow

```text
main.cpp
  |
  |-- parse --config argument
  |-- load RuntimeConfig
  |-- create Logger("logs/runtime_logs.jsonl")
  |-- log runtime_started
  |-- construct Task objects
  |-- construct Scheduler
  |-- Scheduler initializes MessageBus queues
  |-- Scheduler selects round_robin or priority mode
  |-- Scheduler constructs FaultInjector
  |-- Scheduler constructs Watchdog
  |-- log scheduler_started
  |-- loop until configured duration expires
        |
        |-- check due tasks
        |-- order due tasks by selected scheduler mode
        |-- apply task_crash fault if active and skip failed tasks
        |-- apply slow_task or cpu_spike timing faults if active
        |-- log task_started
        |-- simulate task execution
        |-- log task_completed
        |-- inspect task with watchdog
        |-- send or receive task messages
        |-- apply dropped_messages fault if active
  |-- log scheduler_finished
  |-- log runtime_summary per task
  |-- log runtime_finished
```

---

## 5. Python Analyzer Architecture

Main files:

```text
ai-analyzer/app/analyze.py
ai-analyzer/app/anomaly_detector.py
```

The Python analyzer reads JSONL logs and generates a system health report.

Analyzer responsibilities:

- Load JSONL events.
- Count events by type.
- Count events by severity.
- Summarize task runtime behavior.
- Summarize message bus behavior.
- Summarize fault injection behavior.
- Summarize watchdog behavior.
- Summarize task failure and skipped-task behavior.
- Classify deterministic system health.
- Identify likely root causes.
- Run AI-style time-windowed anomaly detection.

Default command:

```bash
./scripts/run_analyzer.sh logs/runtime_logs.jsonl 5000
```

---

## 6. AI-Style Anomaly Detector

The anomaly detector converts event streams into fixed time windows.

Default window size:

```text
5000 ms
```

Feature examples:

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

Classifications:

```text
NORMAL
WARNING
UNSTABLE
```

The detector is intentionally feature/rule-based right now. It provides an AI-style anomaly pipeline without requiring a trained model yet.

---

## 6.1 Synthetic Training Dataset Generator

Phase 21 adds a synthetic dataset generator.

Main files:

```text
ai-analyzer/training/generate_dataset.py
ai-analyzer/training/README.md
ai-analyzer/tests/test_training_dataset.py
```

Generated output:

```text
reports/generated/synthetic_dataset.csv
```

The generator uses scenario-specific logs and creates labeled feature rows. It reuses the anomaly detector's windowing and feature-extraction logic so the CSV columns stay aligned with the runtime anomaly pipeline.

Pipeline:

```text
scenario logs -> fixed time windows -> extracted anomaly features -> scenario label assignment -> synthetic_dataset.csv
```

Supported labels:

```text
NORMAL
QUEUE_PRESSURE
CPU_SPIKE
TASK_CRASH
SLOW_TASK
DROPPED_MESSAGES
WATCHDOG_RECOVERY
```

The generated CSV is ignored by Git because it is generated output.

---

## 7. Docker Architecture

Docker files:

```text
docker/Dockerfile.runtime
docker/Dockerfile.analyzer
docker-compose.yml
```

Docker Compose services:

| Service | Purpose |
|---|---|
| `demo` | Runs all scenarios and analyzes each scenario log. |
| `runtime-normal` | Runs the normal scenario. |
| `runtime-priority` | Runs the priority scheduler scenario. |
| `runtime-deadline` | Runs the earliest-deadline-first scheduler scenario. |
| `runtime-queue-overflow` | Runs the dedicated queue-overflow scenario using `configs/queue_overflow.json`. |
| `runtime-cpu-spike` | Runs the CPU spike fault scenario using `configs/cpu_spike.json`. |
| `runtime-task-crash` | Runs the task crash fault scenario using `configs/task_crash.json`. |
| `runtime-slow-task` | Runs the slow-task fault scenario. |
| `runtime-dropped-messages` | Runs the dropped-message fault scenario. |
| `runtime-watchdog` | Runs the watchdog scenario. |
| `runtime-priority-scheduler` | Optional service for the priority scheduler scenario. |
| `runtime-deadline-scheduler` | Optional service for the earliest-deadline-first scheduler scenario. |
| `analyzer` | Runs the analyzer against `logs/runtime_logs.jsonl`. |
| `training-dataset` | Generates `reports/generated/synthetic_dataset.csv` from scenario logs. |

The local `logs/` folder is mounted into the container:

```yaml
volumes:
  - ./logs:/app/logs
```

This makes generated logs visible on the host machine after Docker runs.

---

## 8. Benchmark Flow

```text
docker compose up --build demo
  |
  v
logs/normal_runtime_logs.jsonl
logs/priority_scheduler_runtime_logs.jsonl
logs/deadline_scheduler_runtime_logs.jsonl
logs/queue_overflow_runtime_logs.jsonl
logs/cpu_spike_runtime_logs.jsonl
logs/task_crash_runtime_logs.jsonl
logs/slow_task_runtime_logs.jsonl
logs/dropped_messages_runtime_logs.jsonl
logs/watchdog_runtime_logs.jsonl
  |
  v
Python analyzer metrics
  |
  v
Python synthetic dataset generator
  |
  v
reports/generated/synthetic_dataset.csv
  |
  v
docs/performance-results.md
```

The benchmark report compares:

- Normal runtime behavior
- Priority scheduler behavior
- Earliest-deadline-first scheduler behavior
- Queue-overflow behavior
- CPU-spike timing-pressure behavior
- Task-crash failure behavior
- Slow-task fault behavior
- Dropped-message fault behavior
- Watchdog timeout and recovery behavior

---

## 9. Design Notes

### 9.1 Why JSONL?

JSONL is simple, append-friendly, and easy to analyze. Each runtime event is one JSON object on one line. This makes logs compatible with Python scripts, shell tools, and future dashboards.

### 9.2 Why Bounded Queues?

Embedded systems often use bounded queues to prevent uncontrolled memory growth. The message bus models this by rejecting messages once a queue reaches its limit.

### 9.3 Why Fault Injection?

Fault injection proves the runtime can produce meaningful telemetry under unhealthy conditions. It also gives the Python analyzer realistic signals to classify.

### 9.4 Why Watchdog Recovery?

Watchdogs are common in embedded systems. This simulator logs timeout and recovery events to demonstrate fault-response behavior without requiring actual process restarts.

### 9.5 Why Docker?

Docker makes the project easier to review. A recruiter or engineer can run the demo without manually configuring the full local toolchain.

---

## 10. Current Limitations

- Timing is simulated on Linux rather than hard real-time hardware.
- Recovery and task-crash behavior are simulated through logs and scheduler state rather than real thread/process restart.
- The anomaly detector is feature/rule-based rather than a trained ML model.
- The synthetic dataset generator labels windows based on scenario identity rather than manual human annotation.
- Normal runtime and the dedicated queue-overflow scenario can produce queue-full drops when message production exceeds logger consumption.

---

## 11. Future Architecture Improvements

Potential next improvements:

1. Corrupted-message simulation.
4. FastAPI analyzer endpoint.
5. React dashboard.
6. Synthetic training-data generator.
7. Trained anomaly detection model.
8. Final documentation and CI refresh after advanced features.
