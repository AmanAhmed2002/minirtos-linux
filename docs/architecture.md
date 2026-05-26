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
  - `slow_task`
  - `dropped_messages`
  - `cpu_spike`
  - `task_crash`
- Watchdog
- Structured logger
- Python deterministic analyzer
- AI-style anomaly detector
- Synthetic training-dataset generator
- Trained lightweight ML anomaly classifier
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
| runtime-cpu-spike        |
| runtime-task-crash       |
| runtime-slow-task        |
| runtime-dropped-messages |
| runtime-watchdog         |
| analyzer                 |
| training-dataset         |
| ml-train                 |
| ml-predict               |
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
| Optional ML Prediction Report |
+------------+------------------+
             |
             | windowed features
             v
+-------------------------------+
| Dataset + ML Layer            |
|-------------------------------|
| generate_dataset.py           |
| synthetic_dataset.csv         |
| train_model.py                |
| predict_model.py              |
| anomaly_classifier.joblib     |
| label_encoder.joblib          |
| model_metrics.json            |
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

Current config files include:

```text
configs/normal.json
configs/priority_scheduler.json
configs/deadline_scheduler.json
configs/queue_overflow.json
configs/cpu_spike.json
configs/task_crash.json
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
- Failure/skipped state for simulated task-crash behavior

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

Current scheduler modes:

| Mode | Config Value | Behavior |
|---|---|---|
| Round robin | `round_robin` | Runs due tasks in config/task-list order. |
| Priority | `priority` | Runs due tasks by ascending priority number. Lower number means higher priority. |
| Earliest deadline first | `earliest_deadline_first` | Runs due tasks by nearest absolute deadline, then priority, then stable config order. |

Core behavior:

1. Start scheduler loop.
2. Check which tasks are due.
3. Order due tasks based on scheduler mode.
4. Apply task-crash fault state if configured.
5. Apply slow-task or CPU-spike timing faults if configured.
6. Log task start/completion/failure/skipped events.
7. Inspect task health using the watchdog.
8. Send or receive messages based on task role.
9. Apply dropped-message fault behavior if configured.
10. Continue until configured duration expires.
11. Log scheduler completion and runtime summaries.

---

### 3.5 Structured JSONL Logger

Main files:

```text
cpp-runtime/include/Logger.hpp
cpp-runtime/src/Logger.cpp
```

The logger writes structured runtime telemetry to:

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

### 3.6 Message Bus

Main files:

```text
cpp-runtime/include/Message.hpp
cpp-runtime/include/MessageBus.hpp
cpp-runtime/src/MessageBus.cpp
```

The message bus simulates bounded task-to-task communication.

Behavior:

- Registers one bounded queue per task.
- Enqueues messages when the target queue has capacity.
- Rejects messages when the target queue is full.
- Rejects messages to unknown task queues.
- Supports FIFO receive behavior.
- Exposes queue depth and queue limit telemetry.

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

Current fault types:

| Fault | Description |
|---|---|
| `slow_task` | Adds extra execution time to a target task after a configured start time. |
| `dropped_messages` | Drops matching messages after a configured start time using a configured probability. |
| `cpu_spike` | Adds simulated CPU-load delay to a target task after a configured start time. |
| `task_crash` | Simulates a target task entering a failed state without terminating the runtime process. |

Fault-specific impact:

- `slow_task` creates task timing pressure and deadline misses.
- `cpu_spike` creates simulated CPU-load pressure and can produce deadline misses.
- `task_crash` logs task failure and skipped-task telemetry while the runtime continues.
- `dropped_messages` creates message reliability issues without necessarily affecting task timing.

---

### 3.8 Watchdog

Main files:

```text
cpp-runtime/include/Watchdog.hpp
cpp-runtime/src/Watchdog.cpp
```

The watchdog monitors repeated task deadline misses.

Behavior:

1. Track new deadline misses by task.
2. Count consecutive misses.
3. Log `watchdog_timeout` when a task exceeds the configured threshold.
4. Log `task_recovered` when simulated recovery is enabled.
5. Apply cooldown to avoid excessive repeated alerts.

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
  |-- Scheduler selects scheduler strategy
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
- Optionally load a trained model and print ML window predictions.

Default command:

```bash
./scripts/run_analyzer.sh logs/runtime_logs.jsonl 5000
```

ML-enabled command:

```bash
python3 ai-analyzer/app/analyze.py   --log logs/task_crash_runtime_logs.jsonl   --window-ms 5000   --ml-model models/anomaly_classifier.joblib   --ml-label-encoder models/label_encoder.joblib
```

---

## 6. AI-Style Anomaly Detector

The anomaly detector converts event streams into fixed time windows.

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

The detector remains explainable and rule-based. It provides anomaly scores and top drivers.

---

## 7. Synthetic Training Dataset Generator

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

Pipeline:

```text
scenario logs -> fixed time windows -> extracted anomaly features -> scenario labels -> synthetic_dataset.csv
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

The generated CSV is ignored by Git.

---

## 8. ML Classifier Architecture

Phase 22 adds:

```text
ai-analyzer/ml/train_model.py
ai-analyzer/ml/predict_model.py
ai-analyzer/ml/README.md
ai-analyzer/tests/test_ml_model.py
models/.gitkeep
```

Generated artifacts:

```text
models/anomaly_classifier.joblib
models/label_encoder.joblib
reports/generated/model_metrics.json
```

ML pipeline:

```text
synthetic_dataset.csv
  -> load feature columns
  -> encode labels
  -> train RandomForestClassifier
  -> save model artifact
  -> save label encoder
  -> write metrics JSON
  -> predict from dataset or runtime log windows
```

The ML model is trained on synthetic scenario-derived telemetry. It is useful as a portfolio AI/ML layer, but it is not a production safety classifier.

---

## 9. Docker Architecture

Docker files:

```text
docker/Dockerfile.runtime
docker/Dockerfile.analyzer
docker-compose.yml
```

Docker Compose services:

| Service | Purpose |
|---|---|
| `demo` | Runs all scenarios, analyzes logs, generates dataset, trains ML model, and prints predictions. |
| `runtime-normal` | Runs the normal scenario. |
| `runtime-priority` | Runs the priority scheduler scenario. |
| `runtime-deadline` | Runs the earliest-deadline-first scheduler scenario. |
| `runtime-queue-overflow` | Runs dedicated queue-overflow scenario. |
| `runtime-cpu-spike` | Runs CPU-spike fault scenario. |
| `runtime-task-crash` | Runs task-crash fault scenario. |
| `runtime-slow-task` | Runs slow-task fault scenario. |
| `runtime-dropped-messages` | Runs dropped-message fault scenario. |
| `runtime-watchdog` | Runs watchdog scenario. |
| `analyzer` | Runs analyzer against `logs/runtime_logs.jsonl`. |
| `training-dataset` | Generates `reports/generated/synthetic_dataset.csv`. |
| `ml-train` | Trains the ML classifier. |
| `ml-predict` | Runs predictions using the trained classifier. |

Mounted host folders:

```yaml
volumes:
  - ./logs:/app/logs
  - ./reports/generated:/app/reports/generated
  - ./models:/app/models
```

---

## 10. Benchmark Flow

```text
docker compose up --build demo
  |
  v
logs/*runtime_logs.jsonl
  |
  v
Python analyzer metrics
  |
  v
reports/generated/synthetic_dataset.csv
  |
  v
models/anomaly_classifier.joblib
models/label_encoder.joblib
reports/generated/model_metrics.json
  |
  v
ML prediction output
```

---

## 11. Design Notes

### 11.1 Why JSONL?

JSONL is simple, append-friendly, and easy to analyze. Each runtime event is one JSON object on one line.

### 11.2 Why Bounded Queues?

Embedded systems often use bounded queues to prevent uncontrolled memory growth. The message bus models this by rejecting messages once a queue reaches its limit.

### 11.3 Why Fault Injection?

Fault injection proves the runtime can produce meaningful telemetry under unhealthy conditions.

### 11.4 Why Keep the Rule-Based Detector?

The rule-based anomaly detector remains useful because it is explainable. It shows why a window is considered abnormal.

### 11.5 Why Add ML?

The ML layer demonstrates a real supervised-learning workflow using the synthetic telemetry dataset generated by the simulator.

### 11.6 Why Random Forest?

A random forest is a practical first model for tabular telemetry because it can learn nonlinear feature interactions and expose class probabilities without requiring a large deep-learning pipeline.

---

## 12. Current Limitations

- Timing is simulated on Linux rather than hard real-time hardware.
- Recovery and task-crash behavior are simulated through logs and scheduler state.
- The synthetic dataset labels are scenario-derived, not human-annotated per-window labels.
- The model is trained on synthetic scenario telemetry and is not production-validated.
- Generated model artifacts are intentionally excluded from Git unless intentionally added later for demo convenience.

---

## 13. Future Architecture Improvements

Potential next improvements:

1. Corrupted-message simulation.
2. FastAPI analyzer endpoint.
3. React dashboard.
4. ONNX model export.
5. Visualization for anomaly scores and ML predictions.
6. CI smoke tests for Docker, dataset generation, and ML training.
