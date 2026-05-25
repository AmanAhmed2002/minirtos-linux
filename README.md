# MiniRTOS-Linux

**Embedded Runtime Simulator with AI-Based Fault Detection**

MiniRTOS-Linux is a software-only C++20 embedded runtime simulator that models periodic tasks, bounded message queues, configurable fault injection, watchdog monitoring, structured JSONL telemetry, Python-based runtime analysis, AI-style anomaly detection, automated tests, Dockerized demos, and benchmark reporting.

The project is designed as a recruiter-ready systems/embedded portfolio project. It demonstrates Linux development workflow, C++20 runtime design, Python tooling, observability, fault analysis, testing, Docker, and documentation without requiring physical embedded hardware.

---

## Project Status

Phases 1-13 are complete.

Completed capabilities include:

- Linux project scaffold
- C++20 runtime executable
- JSON config loading
- Periodic task model
- Round-robin scheduler
- Structured JSONL runtime logger
- Bounded message bus
- Configurable fault injection
- Watchdog timeout and simulated recovery telemetry
- Python runtime log analyzer
- AI-style time-windowed anomaly detector
- GoogleTest and pytest automated tests
- Docker and Docker Compose demo
- Performance and fault benchmark report

Current phase:

```text
Phase 14 - Documentation and GitHub Polish
```

---

## Why This Project Exists

Many embedded and real-time systems rely on periodic tasks, bounded queues, deadlines, watchdogs, and telemetry to detect unhealthy runtime behavior. MiniRTOS-Linux simulates those concepts in a Linux-based software environment so the project can be built, tested, and demonstrated on a normal development machine.

This project is useful for demonstrating:

- C++ systems programming
- Embedded/RTOS-style thinking
- Linux command-line workflow
- Runtime telemetry and observability
- Fault injection and resilience testing
- Python analysis tooling
- AI-style anomaly detection features
- Dockerized reproducibility
- Test-driven project hardening

---

## Core Features

| Area | Feature |
|---|---|
| Runtime | C++20 CLI simulator |
| Configuration | JSON configs for tasks, scheduler, faults, and watchdog settings |
| Tasks | Simulated periodic tasks with period, deadline, priority, execution time, queue limit, run counters, and deadline-miss counters |
| Scheduler | Round-robin scheduler loop |
| Logging | Structured JSONL logs for runtime, scheduler, task, message, fault, watchdog, and recovery events |
| Message Bus | Bounded FIFO queues with queue-depth telemetry and queue-full drops |
| Fault Injection | `slow_task` and `dropped_messages` scenarios |
| Watchdog | Detects repeated deadline misses and logs simulated task recovery |
| Analyzer | Python CLI reads JSONL logs and reports system health, metrics, and root causes |
| AI-Style Detection | Time-windowed feature extraction, anomaly scoring, state classification, and top anomaly drivers |
| Testing | GoogleTest for C++ and pytest for Python |
| Docker | Dockerized runtime/analyzer demo with Docker Compose |
| Benchmarking | Markdown benchmark report comparing normal and fault scenarios |

---

## Architecture Overview

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
| Metrics / JSONL Logger   |
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
| Time-Window Feature Extraction|
| Anomaly Scoring               |
+------------+------------------+
             |
             v
+-------------------------------+
| Documentation / Benchmarks    |
|-------------------------------|
| docs/performance-results.md   |
| docs/architecture.md          |
| docs/testing.md               |
| docs/fault-injection.md       |
| docs/anomaly-detector.md      |
| docs/resume-bullets.md        |
+-------------------------------+
```

More detail is available in [`docs/architecture.md`](docs/architecture.md).

---

## Repository Structure

```text
minirtos-linux/
├── cpp-runtime/
│   ├── CMakeLists.txt
│   ├── include/
│   │   ├── Config.hpp
│   │   ├── FaultInjector.hpp
│   │   ├── Logger.hpp
│   │   ├── Message.hpp
│   │   ├── MessageBus.hpp
│   │   ├── Scheduler.hpp
│   │   ├── Task.hpp
│   │   └── Watchdog.hpp
│   ├── src/
│   │   ├── Config.cpp
│   │   ├── FaultInjector.cpp
│   │   ├── Logger.cpp
│   │   ├── MessageBus.cpp
│   │   ├── Scheduler.cpp
│   │   ├── Task.cpp
│   │   ├── Watchdog.cpp
│   │   └── main.cpp
│   └── tests/
│       ├── test_fault_injector.cpp
│       ├── test_message_bus.cpp
│       └── test_watchdog.cpp
├── ai-analyzer/
│   ├── app/
│   │   ├── analyze.py
│   │   └── anomaly_detector.py
│   └── tests/
│       ├── test_analyzer.py
│       └── test_anomaly_detector.py
├── configs/
│   ├── normal.json
│   ├── slow_task.json
│   ├── dropped_messages.json
│   └── watchdog_slow_task.json
├── scripts/
│   ├── build_cpp.sh
│   ├── run_normal.sh
│   ├── run_fault.sh
│   ├── run_watchdog.sh
│   ├── run_analyzer.sh
│   ├── run_tests.sh
│   └── run_docker_demo.sh
├── docker/
│   ├── Dockerfile.runtime
│   └── Dockerfile.analyzer
├── docs/
│   ├── architecture.md
│   ├── anomaly-detector.md
│   ├── fault-injection.md
│   ├── performance-results.md
│   ├── resume-bullets.md
│   └── testing.md
├── logs/
│   └── .gitkeep
├── docker-compose.yml
├── .dockerignore
├── .gitignore
├── LICENSE
└── README.md
```

---

## Requirements

### Local Development

Recommended local environment:

- Linux or WSL/Linux-like shell
- C++20 compiler
- CMake
- Ninja
- Python 3.11+
- pytest
- Git

### Docker Demo

Recommended Docker environment:

- Docker
- Docker Compose plugin

---

## Quick Start

Build the C++ runtime:

```bash
./scripts/build_cpp.sh
```

Run the normal runtime scenario:

```bash
./scripts/run_normal.sh
```

Analyze the generated runtime log:

```bash
./scripts/run_analyzer.sh logs/runtime_logs.jsonl
```

Run the full test suite:

```bash
./scripts/run_tests.sh
```

Run the full Docker demo:

```bash
docker compose up --build demo
```

---

## Build the C++ Runtime

```bash
./scripts/build_cpp.sh
```

Equivalent manual commands:

```bash
cmake -S cpp-runtime -B cpp-runtime/build -G Ninja
cmake --build cpp-runtime/build
```

The runtime executable is generated at:

```text
cpp-runtime/build/minirtos_runtime
```

---

## Run Runtime Scenarios

### Normal Scenario

```bash
./scripts/run_normal.sh
```

Equivalent command:

```bash
./cpp-runtime/build/minirtos_runtime --config configs/normal.json
```

### Slow Task Fault Scenario

```bash
./scripts/run_fault.sh configs/slow_task.json
```

### Dropped Messages Fault Scenario

```bash
./scripts/run_fault.sh configs/dropped_messages.json
```

### Watchdog Scenario

```bash
./scripts/run_watchdog.sh
```

Equivalent command:

```bash
./cpp-runtime/build/minirtos_runtime --config configs/watchdog_slow_task.json
```

---

## Runtime Logs

The runtime writes structured JSONL telemetry to:

```text
logs/runtime_logs.jsonl
```

Scenario-specific Docker demo logs include:

```text
logs/normal_runtime_logs.jsonl
logs/slow_task_runtime_logs.jsonl
logs/dropped_messages_runtime_logs.jsonl
logs/watchdog_runtime_logs.jsonl
```

Generated logs are intentionally ignored by Git. The repository keeps only:

```text
logs/.gitkeep
```

---

## Analyze Runtime Logs

Run the analyzer against the latest runtime log:

```bash
./scripts/run_analyzer.sh logs/runtime_logs.jsonl
```

Run the analyzer with a custom anomaly window size:

```bash
./scripts/run_analyzer.sh logs/runtime_logs.jsonl 1000
```

Analyze a specific Docker demo scenario:

```bash
./scripts/run_analyzer.sh logs/normal_runtime_logs.jsonl 5000
./scripts/run_analyzer.sh logs/slow_task_runtime_logs.jsonl 5000
./scripts/run_analyzer.sh logs/dropped_messages_runtime_logs.jsonl 5000
./scripts/run_analyzer.sh logs/watchdog_runtime_logs.jsonl 5000
```

The analyzer reports:

- Event counts
- Severity counts
- Task runs and deadline misses
- Average and max task durations
- Messages sent, received, and dropped
- Queue-full drops
- Fault-injected drops
- Fault event counts
- Watchdog timeout counts
- Task recovery counts
- Likely root causes
- Overall deterministic health status
- AI-style anomaly classification
- Per-window anomaly drivers

More detail is available in [`docs/anomaly-detector.md`](docs/anomaly-detector.md).

---

## Run Tests

Run all C++ and Python tests:

```bash
./scripts/run_tests.sh
```

This script:

1. Configures the C++ CMake/Ninja build.
2. Builds the runtime and C++ test targets.
3. Runs C++ tests with CTest.
4. Checks for pytest.
5. Runs Python tests.

Expected verified result from Phase 11:

```text
100% tests passed, 0 tests failed out of 19
13 passed
[INFO] All tests passed
```

More detail is available in [`docs/testing.md`](docs/testing.md).

---

## Docker Demo

MiniRTOS-Linux can run inside Docker so the runtime, fault scenarios, watchdog behavior, and Python analyzer can be demonstrated without manually setting up a local C++/Python environment.

### Build Docker Images

```bash
docker compose build
```

### Run the Full Demo

```bash
docker compose up --build demo
```

The full demo runs:

1. Normal runtime scenario
2. Slow task fault scenario
3. Dropped messages fault scenario
4. Watchdog slow task scenario
5. Analyzer output for each scenario

Generated logs are written to the local `logs/` directory through a mounted Docker volume.

### Run Individual Docker Services

```bash
docker compose run --rm runtime-normal
docker compose run --rm runtime-slow-task
docker compose run --rm runtime-dropped-messages
docker compose run --rm runtime-watchdog
docker compose run --rm analyzer
```

The `analyzer` service analyzes the latest `logs/runtime_logs.jsonl`.

---

## Benchmark Results

The benchmark report compares the normal, slow-task, dropped-message, and watchdog scenarios.

Report:

```text
docs/performance-results.md
```

Summary:

| Scenario | Deterministic Status | AI-Style Classification | Key Finding |
|---|---|---|---|
| Normal runtime | WARNING | WARNING | No deadline misses or injected faults, but queue pressure caused queue-full message drops. |
| Slow task fault | UNSTABLE | UNSTABLE | `ControlTask` repeatedly exceeded its deadline after slow-task fault injection. |
| Dropped messages fault | WARNING | WARNING | Fault injection caused message drops without causing deadline misses. |
| Watchdog slow task | UNSTABLE | UNSTABLE | Watchdog detected repeated deadline misses and logged simulated recovery events. |

See [`docs/performance-results.md`](docs/performance-results.md) for the full benchmark report.

---

## Documentation

| Document | Purpose |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Explains the runtime architecture, data flow, components, and Docker/analyzer flow. |
| [`docs/testing.md`](docs/testing.md) | Explains C++ and Python test coverage and test commands. |
| [`docs/fault-injection.md`](docs/fault-injection.md) | Explains `slow_task`, `dropped_messages`, fault configs, expected logs, and analyzer impact. |
| [`docs/anomaly-detector.md`](docs/anomaly-detector.md) | Explains JSONL parsing, feature extraction, scoring, classifications, and limitations. |
| [`docs/performance-results.md`](docs/performance-results.md) | Benchmark report from the generated runtime logs. |
| [`docs/resume-bullets.md`](docs/resume-bullets.md) | Resume, LinkedIn, and interview-ready project summaries. |

---

## Resume Highlights

- Built a C++20 embedded-runtime simulator that models periodic tasks, deadlines, bounded message queues, configurable fault injection, watchdog monitoring, JSONL telemetry, Python analysis, Dockerized demos, and benchmark reporting on Linux.
- Implemented round-robin scheduling with structured telemetry for task latency, message drops, queue depth, deadline misses, injected faults, watchdog timeouts, and simulated recovery.
- Developed a Python analyzer that parses runtime logs, computes task/message/fault/watchdog metrics, classifies system health, reports likely root causes, and performs AI-style time-windowed anomaly detection.
- Added automated C++ and Python test coverage with GoogleTest, CTest, pytest, and a one-command test workflow.
- Dockerized the runtime and analyzer with Docker Compose services for normal, fault, watchdog, and full-demo scenarios.

More options are available in [`docs/resume-bullets.md`](docs/resume-bullets.md).

---

## Roadmap

Completed:

- Phase 1: Linux scaffold
- Phase 2: JSON config loader
- Phase 3: Task model
- Phase 4: Round-robin scheduler
- Phase 5: Structured JSONL logger
- Phase 6: Bounded message bus
- Phase 7: Fault injection
- Phase 8: Watchdog monitoring
- Phase 9: Python log analyzer
- Phase 10: AI-style anomaly detection
- Phase 11: Automated testing
- Phase 12: Dockerized demo
- Phase 13: Benchmark report
- Phase 14: Documentation and GitHub polish

Recommended next phases:

- Phase 15: GitHub Actions CI
- Phase 16: Optional advanced features

Optional future features:

- Priority scheduler mode
- Deadline-aware scheduler mode
- Dedicated queue overflow scenario
- CPU spike fault injection
- Task crash simulation
- Corrupted message simulation
- FastAPI analyzer endpoint
- React dashboard
- Synthetic training-data generator
- Trained anomaly detection model

---

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE).
