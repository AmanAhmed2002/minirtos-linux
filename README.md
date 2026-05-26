# MiniRTOS-Linux

**Embedded Runtime Simulator with AI-Based Fault Detection**  
![CI](https://github.com/AmanAhmed2002/minirtos-linux/actions/workflows/ci.yml/badge.svg)

MiniRTOS-Linux is a software-only C++20 embedded runtime simulator that models periodic tasks, bounded message queues, configurable fault injection, task-crash simulation, watchdog monitoring, structured JSONL telemetry, Python-based runtime analysis, AI-style anomaly detection, synthetic training-dataset generation, a trained lightweight ML anomaly classifier, automated tests, Dockerized demos, and benchmark reporting.

The project is designed as a systems/embedded portfolio project. It demonstrates Linux development workflow, C++20 runtime design, Python tooling, observability, fault analysis, testing, Docker, machine-learning integration, and documentation without requiring physical embedded hardware.

---
## Why This Project Exists

Many embedded and real-time systems rely on periodic tasks, bounded queues, deadlines, watchdogs, and telemetry to detect unhealthy runtime behavior. MiniRTOS-Linux simulates those concepts in a Linux-based software environment so the project can be built, tested, analyzed, and demonstrated on a normal development machine.

This project is useful for demonstrating:

- C++ systems programming
- Embedded/RTOS-style thinking
- Linux command-line workflow
- Runtime telemetry and observability
- Fault injection and resilience testing
- Python analysis tooling
- Explainable anomaly detection
- Synthetic feature dataset generation
- Lightweight supervised ML classification
- Dockerized reproducibility
- Test-driven project hardening

---

## Core Features

| Area | Feature |
|---|---|
| Runtime | C++20 CLI simulator |
| Configuration | JSON configs for tasks, scheduler, faults, and watchdog settings |
| Tasks | Simulated periodic tasks with period, deadline, priority, execution time, queue limit, run counters, and deadline-miss counters |
| Scheduler | Round-robin, priority, and earliest-deadline-first scheduler modes |
| Logging | Structured JSONL logs for runtime, scheduler, task, message, fault, watchdog, recovery, and failure events |
| Message Bus | Bounded FIFO queues with queue-depth telemetry, queue-full drops, and a dedicated queue-overflow benchmark scenario |
| Fault Injection | `slow_task`, `dropped_messages`, `cpu_spike`, and `task_crash` scenarios |
| Watchdog | Detects repeated deadline misses and logs simulated task recovery |
| Analyzer | Python CLI reads JSONL logs and reports system health, metrics, and root causes |
| AI-Style Detection | Time-windowed feature extraction, anomaly scoring, state classification, and top anomaly drivers |
| Synthetic Dataset | Converts scenario logs into labeled window-level CSV rows for ML training/evaluation |
| ML Classifier | Trains and runs a lightweight supervised classifier with prediction confidence |
| Testing | GoogleTest for C++ and pytest for Python |
| Docker | Dockerized runtime, analyzer, dataset, ML training, and ML prediction workflows |
| Benchmarking | Markdown benchmark report comparing normal, scheduler, queue-overflow, and fault scenarios |

---

## Architecture Overview

```text
+--------------------------+
| Docker Compose           |
|--------------------------|
| demo                     |
| runtime-* services       |
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
+------------+------------------+
             |
             | reports/generated/synthetic_dataset.csv
             v
+-------------------------------+
| ML Layer                      |
|-------------------------------|
| train_model.py                |
| predict_model.py              |
| RandomForestClassifier        |
| joblib model artifacts        |
| model_metrics.json            |
+-------------------------------+
```

More detail is available in [`docs/architecture.md`](docs/architecture.md).

---

## Repository Structure

```text
minirtos-linux/
├── cpp-runtime/
├── ai-analyzer/
│   ├── app/
│   │   ├── analyze.py
│   │   └── anomaly_detector.py
│   ├── training/
│   │   ├── README.md
│   │   └── generate_dataset.py
│   ├── ml/
│   │   ├── README.md
│   │   ├── train_model.py
│   │   └── predict_model.py
│   └── tests/
│       ├── test_analyzer.py
│       ├── test_anomaly_detector.py
│       ├── test_training_dataset.py
│       └── test_ml_model.py
├── configs/
├── scripts/
├── docker/
├── docs/
├── logs/
├── models/
│   └── .gitkeep
├── reports/
│   └── generated/
├── docker-compose.yml
├── .dockerignore
├── .gitignore
├── LICENSE
└── README.md
```

Generated files such as logs, datasets, metrics, and `.joblib` model artifacts are ignored by Git.

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
- scikit-learn
- joblib
- Git

Install Python ML dependencies if needed:

```bash
python3 -m pip install scikit-learn joblib
```

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

Run all tests:

```bash
./scripts/run_tests.sh
```

Run the full Docker demo:

```bash
docker compose up --build demo
```

---

## Run Runtime Scenarios

```bash
./cpp-runtime/build/minirtos_runtime --config configs/normal.json
./cpp-runtime/build/minirtos_runtime --config configs/priority_scheduler.json
./cpp-runtime/build/minirtos_runtime --config configs/deadline_scheduler.json
./cpp-runtime/build/minirtos_runtime --config configs/queue_overflow.json
./cpp-runtime/build/minirtos_runtime --config configs/cpu_spike.json
./cpp-runtime/build/minirtos_runtime --config configs/task_crash.json
./scripts/run_fault.sh configs/slow_task.json
./scripts/run_fault.sh configs/dropped_messages.json
./cpp-runtime/build/minirtos_runtime --config configs/watchdog_slow_task.json
```

---

## Analyze Runtime Logs

Run the analyzer against the latest runtime log:

```bash
./scripts/run_analyzer.sh logs/runtime_logs.jsonl
```

Run the analyzer with a custom anomaly window size:

```bash
./scripts/run_analyzer.sh logs/runtime_logs.jsonl 5000
```

Run the analyzer with optional ML model output:

```bash
python3 ai-analyzer/app/analyze.py   --log logs/task_crash_runtime_logs.jsonl   --window-ms 5000   --ml-model models/anomaly_classifier.joblib   --ml-label-encoder models/label_encoder.joblib
```

When no ML flags are provided, the analyzer behaves as before and prints only the deterministic and AI-style rule-based reports.

---

## Generate Synthetic Training Dataset

Run this after scenario logs exist:

```bash
python3 ai-analyzer/training/generate_dataset.py   --output reports/generated/synthetic_dataset.csv   --window-ms 5000   --scenario normal=logs/normal_runtime_logs.jsonl   --scenario priority_scheduler=logs/priority_scheduler_runtime_logs.jsonl   --scenario deadline_scheduler=logs/deadline_scheduler_runtime_logs.jsonl   --scenario queue_overflow=logs/queue_overflow_runtime_logs.jsonl   --scenario cpu_spike=logs/cpu_spike_runtime_logs.jsonl   --scenario task_crash=logs/task_crash_runtime_logs.jsonl   --scenario slow_task=logs/slow_task_runtime_logs.jsonl   --scenario dropped_messages=logs/dropped_messages_runtime_logs.jsonl   --scenario watchdog=logs/watchdog_runtime_logs.jsonl
```

Or through Docker:

```bash
docker compose run --rm training-dataset
```

---

## Train the ML Classifier

Train locally:

```bash
python3 ai-analyzer/ml/train_model.py   --dataset reports/generated/synthetic_dataset.csv   --model-output models/anomaly_classifier.joblib   --label-encoder-output models/label_encoder.joblib   --metrics-output reports/generated/model_metrics.json
```

Train through Docker:

```bash
docker compose run --rm ml-train
```

Generated artifacts:

```text
models/anomaly_classifier.joblib
models/label_encoder.joblib
reports/generated/model_metrics.json
```

These are generated outputs and should not be committed.

---

## Run ML Predictions

Predict from the generated dataset:

```bash
python3 ai-analyzer/ml/predict_model.py   --model models/anomaly_classifier.joblib   --label-encoder models/label_encoder.joblib   --dataset reports/generated/synthetic_dataset.csv   --limit 20
```

Predict from a runtime log:

```bash
python3 ai-analyzer/ml/predict_model.py   --model models/anomaly_classifier.joblib   --label-encoder models/label_encoder.joblib   --log logs/task_crash_runtime_logs.jsonl   --window-ms 5000
```

Predict through Docker:

```bash
docker compose run --rm ml-predict
```

---

## Run Tests

Run all C++ and Python tests:

```bash
./scripts/run_tests.sh
```

Run ML tests only:

```bash
python3 -m pytest ai-analyzer/tests/test_ml_model.py -q
```

Run all Python tests:

```bash
python3 -m pytest ai-analyzer/tests -q
```

---

## Docker Demo

Build Docker images:

```bash
docker compose build
```

Run the full demo:

```bash
docker compose up --build demo
```

The full demo should run:

1. Normal runtime scenario
2. Priority scheduler scenario
3. Earliest-deadline-first scheduler scenario
4. Queue overflow scenario
5. CPU spike fault scenario
6. Task crash fault scenario
7. Slow task fault scenario
8. Dropped messages fault scenario
9. Watchdog slow task scenario
10. Analyzer output for each scenario
11. Synthetic training dataset generation
12. ML model training
13. ML prediction output

Individual Docker services:

```bash
docker compose run --rm runtime-normal
docker compose run --rm runtime-priority
docker compose run --rm runtime-deadline
docker compose run --rm runtime-queue-overflow
docker compose run --rm runtime-cpu-spike
docker compose run --rm runtime-task-crash
docker compose run --rm runtime-slow-task
docker compose run --rm runtime-dropped-messages
docker compose run --rm runtime-watchdog
docker compose run --rm analyzer
docker compose run --rm training-dataset
docker compose run --rm ml-train
docker compose run --rm ml-predict
```

---

## Benchmark Results

The benchmark report compares normal, scheduler, queue-overflow, CPU-spike, task-crash, slow-task, dropped-message, watchdog, dataset-generation, and ML-classifier workflows.

See [`docs/performance-results.md`](docs/performance-results.md).

---

## Documentation

| Document | Purpose |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Runtime/analyzer/training/ML architecture. |
| [`docs/testing.md`](docs/testing.md) | C++/Python/ML test coverage and commands. |
| [`docs/fault-injection.md`](docs/fault-injection.md) | Fault modes and expected telemetry. |
| [`docs/anomaly-detector.md`](docs/anomaly-detector.md) | Deterministic, rule-based, dataset, and ML analyzer flow. |
| [`docs/performance-results.md`](docs/performance-results.md) | Benchmark and generated artifact report. |
| [`docs/resume-bullets.md`](docs/resume-bullets.md) | Resume, LinkedIn, and interview-ready wording. |
| [`ai-analyzer/training/README.md`](ai-analyzer/training/README.md) | Synthetic dataset generator guide. |
| [`ai-analyzer/ml/README.md`](ai-analyzer/ml/README.md) | ML training and prediction guide. |

---

This project is licensed under the MIT License. See [`LICENSE`](LICENSE).
