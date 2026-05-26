# MiniRTOS-Linux Fault Injection Guide

## 1. Purpose

MiniRTOS-Linux includes configurable fault injection so unhealthy runtime behavior can be reproduced, logged, analyzed, and benchmarked.

Fault injection is important because it turns the simulator from a basic runtime demo into a resilience and observability project. It allows the runtime to generate meaningful failure telemetry such as deadline misses, dropped messages, watchdog timeouts, and simulated recovery events.

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
configs/priority_scheduler.json
configs/slow_task.json
configs/dropped_messages.json
configs/watchdog_slow_task.json
scripts/run_fault.sh
scripts/run_watchdog.sh
```

---

## 3. Supported Fault Types

Fault injection works with the current scheduler modes: `round_robin`, `priority`, and `earliest_deadline_first`. The scheduler mode controls the order of due task execution, while the fault injector controls whether configured runtime faults are applied to matching tasks or messages.

| Fault Type | Description | Main Runtime Impact |
|---|---|---|
| `slow_task` | Adds extra execution time to a selected task after a configured time. | Deadline misses, unstable task timing, possible watchdog timeouts. |
| `cpu_spike` | Adds simulated CPU-load delay to a selected task after a configured time. | Increased task duration, deadline misses, unstable timing windows. |
| `dropped_messages` | Drops matching messages after a configured time using a configured probability. | Message reliability degradation and `message_dropped` telemetry. |

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
| `type` | Selects the fault type, such as `slow_task` or `dropped_messages`. |
| `target_task` | Selects the affected task or message target. |
| `start_after_ms` | Delays fault activation until the runtime has passed this timestamp. |
| `extra_execution_time_ms` | Adds simulated execution time for `slow_task`. |
| `drop_probability_percent` | Controls probability of message drops for `dropped_messages`. |

---

## 5. Slow Task Fault

The `slow_task` fault simulates a task taking longer than expected.

Example behavior:

1. Runtime starts normally.
2. The configured start time is reached.
3. The configured target task begins receiving extra simulated execution time.
4. Task duration increases.
5. If duration exceeds deadline, deadline misses are logged.
6. Analyzer classifies repeated deadline misses as unhealthy.

Example scenario command:

```bash
./scripts/run_fault.sh configs/slow_task.json
```

Expected event types:

```text
fault_injected
task_completed
runtime_summary
```

Expected task-level impact:

```text
ControlTask deadline misses increase
ControlTask average duration increases
ControlTask max duration increases
```

Expected analyzer classification:

```text
UNSTABLE
```

Phase 13 benchmark result:

```text
ControlTask produced 174 deadline misses in the slow task fault scenario.
```

---


---

## 6. CPU Spike Fault

The `cpu_spike` fault simulates CPU-load pressure on a selected task.

Unlike `dropped_messages`, this fault affects task timing rather than message reliability. It is similar to `slow_task` in that it increases simulated execution time, but it is logged separately as `fault_type=cpu_spike` so the analyzer and documentation can distinguish CPU-load pressure from a generic slow-task fault.

Example scenario command:

```bash
./scripts/run_fault.sh configs/cpu_spike.json
```

Equivalent direct command:

```bash
./cpp-runtime/build/minirtos_runtime --config configs/cpu_spike.json
```

Expected event types:

```text
fault_injected
task_completed
runtime_summary
```

Expected fault telemetry:

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

If the injected CPU spike makes the observed task duration exceed the target task deadline, the run should also produce deadline-miss telemetry and may be classified as `UNSTABLE`.

## 7. Dropped Messages Fault

The `dropped_messages` fault simulates message-level reliability failures.

Example behavior:

1. Runtime starts normally.
2. The configured start time is reached.
3. Matching messages are evaluated by the fault injector.
4. Some messages are dropped instead of being enqueued.
5. The runtime logs fault injection and message-drop events.
6. Analyzer reports message reliability degradation.

Example scenario command:

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

Reason:

```text
The system can remain schedulable while message reliability is degraded.
```

Phase 13 benchmark result:

```text
The dropped messages scenario produced 176 fault-injected message drops.
```

---

## 8. Queue-Full Drops vs Fault-Injected Drops

MiniRTOS-Linux can produce two important message-drop categories.

| Drop Type | Cause | Meaning |
|---|---|---|
| `queue_full` | Target task queue reached its configured limit. | Bounded queue pressure. |
| `fault_injected_drop` | Fault injector intentionally dropped a matching message. | Simulated message reliability fault. |

This distinction is important because a queue-full drop is a capacity/throughput issue, while a fault-injected drop is a simulated reliability failure.

The analyzer reports these separately.

---


## 9. Dedicated Queue Overflow Scenario

Phase 18 adds a dedicated queue-overflow scenario:

```text
configs/queue_overflow.json
```

This scenario is different from the `dropped_messages` fault. It does not intentionally drop messages through the fault injector. Instead, it stresses the bounded message bus by making producer tasks send messages faster than `LoggerTask` can consume them.

Expected behavior:

```text
message_dropped events appear with reason=queue_full
fault_injected events remain 0
fault_injected_drop events remain 0
deadline misses should remain low or 0
```

Expected analyzer classification:

```text
WARNING
```

Observed Phase 18 result:

```text
queue_full_drops: 958
fault_injected_drops: 0
deadline_misses: 0
watchdog_timeouts: 0
```

Reason:

```text
The runtime remains schedulable, but bounded queue capacity is exceeded.
```

## 10. Watchdog Fault Scenario

The watchdog scenario combines slow-task behavior with watchdog monitoring.

Command:

```bash
./scripts/run_watchdog.sh
```

Equivalent command:

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

Phase 13 benchmark result:

```text
The watchdog scenario produced 22 watchdog timeout events and 22 task recovery events.
```

---

## 11. Run Fault Scenarios

### Build First

```bash
./scripts/build_cpp.sh
```

### Run Slow Task Fault

```bash
./scripts/run_fault.sh configs/slow_task.json
```

### Run CPU Spike Fault

```bash
./scripts/run_fault.sh configs/cpu_spike.json
```

### Run Dropped Messages Fault

```bash
./scripts/run_fault.sh configs/dropped_messages.json
```

### Run Watchdog Scenario

```bash
./scripts/run_watchdog.sh
```

### Analyze Latest Log

```bash
./scripts/run_analyzer.sh logs/runtime_logs.jsonl
```

---

## 12. Docker Fault Scenarios

Run the full Docker demo:

```bash
docker compose up --build demo
```

Run individual Docker services:

```bash
docker compose run --rm runtime-cpu-spike
docker compose run --rm runtime-slow-task
docker compose run --rm runtime-dropped-messages
docker compose run --rm runtime-watchdog
docker compose run --rm analyzer
```

Generated scenario logs:

```text
logs/cpu_spike_runtime_logs.jsonl
logs/slow_task_runtime_logs.jsonl
logs/dropped_messages_runtime_logs.jsonl
logs/watchdog_runtime_logs.jsonl
```

---

## 13. Expected Analyzer Results

| Scenario | Expected Status | Reason |
|---|---|---|
| Normal | `WARNING` | Queue pressure causes queue-full message drops. |
| Queue overflow | `WARNING` | Dedicated bounded-queue pressure causes queue-full drops without fault injection. |
| Slow task | `UNSTABLE` | Repeated deadline misses from `slow_task`. |
| CPU spike | `UNSTABLE` expected if deadline misses occur | Simulated CPU-load pressure increases target-task duration. |
| Dropped messages | `WARNING` | Message reliability degraded without deadline misses. |
| Watchdog slow task | `UNSTABLE` | Repeated deadline misses trigger watchdog timeout and recovery telemetry. |

---

## 14. Fault Logging Events

### `fault_injected`

Indicates a configured fault was applied.

Useful metadata may include:

- Fault type
- Target task
- Source task
- Target task/message
- Runtime timestamp
- Extra execution time
- Drop probability

### `message_dropped`

Indicates a message was dropped.

Important reasons:

```text
queue_full
fault_injected_drop
```

### `watchdog_timeout`

Indicates repeated deadline misses reached the watchdog threshold.

### `task_recovered`

Indicates simulated recovery was logged after watchdog timeout.

---

## 15. Limitations

Current fault injection is simulation-based.

Limitations:

- It does not crash real threads or processes yet.
- It does not simulate memory corruption.
- It does not simulate corrupted message payloads yet.
- Recovery is currently logged rather than implemented as a true process restart.
- The scheduler currently supports round-robin, priority, and earliest-deadline-first modes.

---

## 16. Recommended Future Faults

Recommended future fault modes:

1. `task_crash`
4. `corrupted_message`
5. `missed_heartbeat`
6. `random_latency`
7. `network_partition`

Recommended future configs:

```text
configs/task_crash.json
configs/corrupted_message.json
```

---

## 17. Interview Talking Points

- The fault injector makes runtime failures reproducible and observable.
- `slow_task` validates deadline-miss detection and watchdog escalation.
- `cpu_spike` validates simulated CPU-load pressure as a distinct timing fault.
- `dropped_messages` validates message reliability analysis without affecting task execution timing.
- Queue-full drops and fault-injected drops are intentionally separated in telemetry.
- Fault scenarios can be run under the existing scheduler modes, including priority and earliest-deadline-first scheduling, without changing the analyzer event schema.
- Watchdog scenarios demonstrate embedded-style health monitoring and simulated recovery behavior.
