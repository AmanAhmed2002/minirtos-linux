# MiniRTOS-Linux Architecture

## 1. Purpose

MiniRTOS-Linux is a software-only embedded runtime simulator. It models core embedded and RTOS-style ideas using a Linux-friendly C++20 runtime and a Python analysis layer.

The architecture is intentionally modular so each system concept is represented by a clear component:

- Runtime configuration
- Task model
- Scheduler
- Message bus
- Fault injector
- Watchdog
- Structured logger
- Python analyzer
- AI-style anomaly detector
- Dockerized demonstration workflow

---

## 2. System Overview

```text
+--------------------------+
| Docker Compose           |
|--------------------------|
| demo                     |
| runtime-normal           |
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

Current scheduler mode:

```text
round_robin
```

Core behavior:

1. Start the scheduler loop.
2. Check which tasks are due.
3. Run due tasks.
4. Apply fault injection if configured.
5. Log task start and completion events.
6. Inspect task health using the watchdog.
7. Send or receive messages based on task role.
8. Continue until configured duration expires.
9. Log scheduler completion and runtime summaries.

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
  |-- Scheduler constructs FaultInjector
  |-- Scheduler constructs Watchdog
  |-- log scheduler_started
  |-- loop until configured duration expires
        |
        |-- check due tasks
        |-- apply slow_task fault if active
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
| `runtime-slow-task` | Runs the slow-task fault scenario. |
| `runtime-dropped-messages` | Runs the dropped-message fault scenario. |
| `runtime-watchdog` | Runs the watchdog scenario. |
| `analyzer` | Runs the analyzer against `logs/runtime_logs.jsonl`. |

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
logs/slow_task_runtime_logs.jsonl
logs/dropped_messages_runtime_logs.jsonl
logs/watchdog_runtime_logs.jsonl
  |
  v
Python analyzer metrics
  |
  v
docs/performance-results.md
```

The benchmark report compares:

- Normal runtime behavior
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

- The scheduler currently supports round-robin mode only.
- Timing is simulated on Linux rather than hard real-time hardware.
- Recovery is simulated through logs rather than real thread/process restart.
- The anomaly detector is feature/rule-based rather than a trained ML model.
- Normal runtime still produces queue-full drops because message production exceeds logger consumption.

---

## 11. Future Architecture Improvements

Potential next improvements:

1. Priority scheduler mode.
2. Deadline-aware scheduler mode.
3. Dedicated queue-overflow config.
4. CPU-spike fault injection.
5. Task-crash simulation.
6. Corrupted-message simulation.
7. FastAPI analyzer endpoint.
8. React dashboard.
9. Synthetic training-data generator.
10. Trained anomaly detection model.
