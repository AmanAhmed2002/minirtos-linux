# MiniRTOS-Linux Testing Guide

## 1. Purpose

This document explains the automated testing setup for MiniRTOS-Linux.

The project uses:

- GoogleTest for C++ runtime component tests
- CTest through CMake for running C++ tests
- pytest for Python analyzer and anomaly-detector tests
- `scripts/run_tests.sh` as the one-command local test workflow
- GitHub Actions CI for automated build and test verification on `main` pushes and pull requests

The goal is to prove that core runtime components and analyzer logic continue working as the project grows.

---

## 2. Run All Tests

From the repository root:

```bash
./scripts/run_tests.sh
```

This script performs the full test workflow:

1. Configure C++ build with CMake and Ninja.
2. Build the C++ runtime and C++ test targets.
3. Run C++ tests through CTest.
4. Check that pytest is installed.
5. Run Python tests.

Expected output after Phase 20 includes the expanded scheduler, CPU-spike, and task-crash tests:

```text
100% tests passed, 0 tests failed out of 34
17 passed
[INFO] All tests passed
```

---

## 3. Test Script

Current intended `scripts/run_tests.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "[INFO] Configuring C++ build"
cmake -S cpp-runtime -B cpp-runtime/build -G Ninja

echo "[INFO] Building C++ runtime and tests"
cmake --build cpp-runtime/build

echo "[INFO] Running C++ tests"
ctest --test-dir cpp-runtime/build --output-on-failure

echo "[INFO] Checking Python test dependency"
python3 - <<'PY'
try:
    import pytest  # noqa: F401
except ModuleNotFoundError:
    raise SystemExit(
        "[ERROR] pytest is not installed. Install it with: python3 -m pip install pytest"
    )
PY

echo "[INFO] Running Python tests"
python3 -m pytest ai-analyzer/tests -q

echo "[INFO] All tests passed"
```

Make sure the script is executable:

```bash
chmod +x scripts/run_tests.sh
```

---

## 4. C++ Test Coverage

C++ tests are located in:

```text
cpp-runtime/tests/
```

Current C++ test files:

```text
cpp-runtime/tests/test_message_bus.cpp
cpp-runtime/tests/test_fault_injector.cpp
cpp-runtime/tests/test_scheduler.cpp
cpp-runtime/tests/test_watchdog.cpp
```

### 4.1 Message Bus Tests

File:

```text
cpp-runtime/tests/test_message_bus.cpp
```

Expected coverage:

| Behavior | Purpose |
|---|---|
| Queue registration | Confirms task queues can be created. |
| FIFO send/receive | Confirms messages are received in send order. |
| Full queue rejection | Confirms bounded queues reject messages when full. |
| Empty receive | Confirms receiving from an empty queue is handled safely. |
| Unknown target rejection | Confirms messages to unregistered queues are rejected. |
| Invalid queue limit | Confirms invalid queue configuration is rejected. |
| Empty task name | Confirms invalid task names are rejected. |

### 4.2 Fault Injector Tests

File:

```text
cpp-runtime/tests/test_fault_injector.cpp
```

Expected coverage:

| Behavior | Purpose |
|---|---|
| Disabled faults | Confirms inactive faults do not affect runtime behavior. |
| Slow-task timing | Confirms slow-task faults activate only after configured start time. |
| Target matching | Confirms slow-task faults apply only to matching target tasks. |
| Dropped-message 100% drop | Confirms configured message drops can always occur. |
| Source/target matching | Confirms message drop faults apply to matching messages only. |
| Zero-percent drop | Confirms 0% probability does not drop messages. |
| CPU-spike activation timing | Confirms CPU-spike faults activate only after the configured start time. |
| CPU-spike target matching | Confirms CPU-spike faults apply only to the configured target task. |
| CPU-spike disabled behavior | Confirms disabled CPU-spike faults do not affect task timing. |
| Task-crash activation timing | Confirms task-crash faults activate only after the configured start time. |
| Task-crash target matching | Confirms task-crash faults apply only to the configured target task. |
| Task-crash disabled behavior | Confirms disabled task-crash faults do not fail tasks. |

### 4.3 Scheduler Tests

File:

```text
cpp-runtime/tests/test_scheduler.cpp
```

Expected coverage:

| Behavior | Purpose |
|---|---|
| Round-robin ordering | Confirms due tasks run in config/vector order under `round_robin`. |
| Priority ordering | Confirms due tasks run by ascending priority number under `priority`. |
| Earliest-deadline-first ordering | Confirms due tasks run by nearest absolute deadline under `earliest_deadline_first`. |
| Earliest-deadline-first priority tie-break | Confirms priority breaks ties when due tasks have the same deadline. |
| Earliest-deadline-first stable-order tie-break | Confirms original task order is preserved when deadline and priority are tied. |
| Invalid scheduler mode | Confirms unsupported scheduler modes still raise an error. |
| Task-crash scheduler handling | Confirms task-crash faults log failure/skipped-task telemetry while allowing the scheduler to continue. |

### 4.4 Watchdog Tests

File:

```text
cpp-runtime/tests/test_watchdog.cpp
```

Expected coverage:

| Behavior | Purpose |
|---|---|
| Disabled watchdog | Confirms disabled watchdog does not alert. |
| Threshold alert | Confirms repeated deadline misses trigger watchdog timeout. |
| Recovery disabled | Confirms timeout can occur without recovery event. |
| Recovery cooldown | Confirms cooldown limits repeated recovery events. |

---

## 5. Python Test Coverage

Python tests are located in:

```text
ai-analyzer/tests/
```

Current Python test files:

```text
ai-analyzer/tests/test_analyzer.py
ai-analyzer/tests/test_anomaly_detector.py
```

### 5.1 Analyzer Tests

File:

```text
ai-analyzer/tests/test_analyzer.py
```

Expected coverage:

| Behavior | Purpose |
|---|---|
| Valid JSONL loading | Confirms normal log files can be parsed. |
| Missing log handling | Confirms missing files are handled correctly. |
| Invalid JSONL handling | Confirms malformed logs are handled safely. |
| Normal health classification | Confirms clean logs classify correctly. |
| Watchdog unstable classification | Confirms watchdog events classify as unstable. |
| Message drop reason counting | Confirms queue-full and fault-injected drops are counted separately. |
| CPU-spike root cause reporting | Confirms CPU-spike faults are counted separately and reported in root causes. |
| Task-crash root cause reporting | Confirms task-crash faults, task failures, and skipped tasks are counted and reported as unstable. |

### 5.2 Anomaly Detector Tests

File:

```text
ai-analyzer/tests/test_anomaly_detector.py
```

Expected coverage:

| Behavior | Purpose |
|---|---|
| Window splitting | Confirms event streams are split into time windows. |
| Invalid window size | Confirms invalid settings are rejected. |
| Feature extraction | Confirms event windows become feature dictionaries. |
| Clean-window classification | Confirms normal windows classify as normal. |
| Watchdog unstable classification | Confirms watchdog events classify as unstable. |
| Deadline-miss unstable classification | Confirms repeated deadline misses classify as unstable. |
| Overall anomaly report | Confirms summary report generation works. |
| CPU-spike timing pressure | Confirms CPU-spike windows can classify as unstable when deadline misses occur. |
| Task-crash failure windows | Confirms task-failure and skipped-task windows classify as unstable. |

---

## 6. Run C++ Tests Manually

Configure and build:

```bash
cmake -S cpp-runtime -B cpp-runtime/build -G Ninja
cmake --build cpp-runtime/build
```

Run all C++ tests:

```bash
ctest --test-dir cpp-runtime/build --output-on-failure
```

Run with verbose output:

```bash
ctest --test-dir cpp-runtime/build --output-on-failure --verbose
```

---

## 7. Run Python Tests Manually

Run all Python tests:

```bash
python3 -m pytest ai-analyzer/tests -q
```

Run with verbose output:

```bash
python3 -m pytest ai-analyzer/tests -v
```

Run one file:

```bash
python3 -m pytest ai-analyzer/tests/test_analyzer.py -q
python3 -m pytest ai-analyzer/tests/test_anomaly_detector.py -q
```

---

## 8. What Passing Tests Prove

Passing tests show that:

- The bounded message bus respects queue limits.
- FIFO message behavior is stable.
- Invalid message-bus inputs are rejected.
- Fault injection activates only under intended conditions.
- Round-robin scheduling preserves task-list order for due tasks.
- Priority scheduling runs higher-priority due tasks first, where lower numeric priority means higher priority.
- Earliest-deadline-first scheduling runs due tasks by nearest absolute deadline, then priority, then stable task order.
- Slow-task, CPU-spike, task-crash, and dropped-message fault logic behaves predictably.
- Watchdog threshold and cooldown behavior works.
- Analyzer log parsing handles normal and bad inputs.
- Health classification detects unstable watchdog scenarios.
- Message drop reasons are counted correctly.
- Anomaly detector windowing, feature extraction, and classification are stable.

---

## 9. What Tests Do Not Prove Yet

Current tests do not fully prove:

- Real hardware timing correctness.
- Hard real-time scheduling guarantees.
- Real process/thread crash recovery behavior. The project currently simulates task crash behavior inside the scheduler.
- Performance under very large logs.
- Accuracy of a trained ML model.

Phase 18 adds a config-driven queue-overflow scenario. Phase 19 adds CPU-spike unit/analyzer tests and a Docker/demo scenario. Phase 20 adds task-crash unit/analyzer tests and a Docker/demo scenario. This scenario does not require a new unit test because it exercises existing bounded queue behavior already covered by the Message Bus tests. The scenario is validated through runtime execution, analyzer output, and Docker demo coverage.

Those areas are future enhancement opportunities.

---

## 10. GitHub Actions CI

GitHub Actions CI was added in Phase 15.

Target file:

```text
.github/workflows/ci.yml
```

Current CI tasks:

1. Checkout repository.
2. Install Linux C++ build dependencies.
3. Install Python and pytest.
4. Configure CMake with Ninja.
5. Build runtime and tests.
6. Run C++ tests with CTest.
7. Run Python tests with pytest.

The existing CI workflow should continue to work after Phase 17 because it builds the CMake test target and runs all discovered C++ tests automatically.

Future CI improvements can optionally add Docker image builds, analyzer smoke tests on sample logs, and script permission checks.
