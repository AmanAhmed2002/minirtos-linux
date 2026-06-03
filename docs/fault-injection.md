# MiniRTOS-Linux Fault Injection Guide

## Current Status After This Chat

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 is now complete for the local backend MVP.

Phase 26 added the Run Orchestration API:

- `POST /api/runs`
- `GET /api/runs`
- `GET /api/runs/{runId}`
- `GET /api/runs/{runId}/analysis`
- trusted scenario-ID validation
- C++ runtime execution from Spring Boot
- unique per-run output folders under `runs/<runId>/`
- runtime log copying from `logs/runtime_logs.jsonl`
- Python analyzer execution from Spring Boot
- analyzer text saved as `analysis.txt`
- structured analysis JSON returned by the backend
- backend process timeout handling
- safe subprocess output draining to avoid hanging processes

Verified behavior:

- Spring Boot backend runs locally on port `8081`.
- `GET /api/health` works.
- `GET /api/scenarios` works.
- `POST /api/runs` successfully runs `queue_overflow`.
- A successful `queue_overflow` run returned `status=COMPLETED`, `runtimeHealth=WARNING`, and `errorMessage=null`.
- `WARNING` is expected for `queue_overflow` because the scenario intentionally creates bounded queue pressure and dropped messages.
- Backend generated `runs/<runId>/runtime_logs.jsonl` and `runs/<runId>/analysis.txt`.
- Existing C++/Python/analyzer/ML Docker workflow remains intact.

Important implementation notes:

- Backend uses Java 17.
- Backend runs on port `8081` because Nginx is already using `8080` locally.
- Phase 26 stores run metadata in memory only. Run history resets when the backend restarts.
- Phase 27 should add PostgreSQL persistence.
- The backend accepts only known scenario IDs and never accepts arbitrary user-provided config paths.


---

## 1. Purpose

Fault injection lets MiniRTOS-Linux reproduce unhealthy runtime behavior in a controlled way.

It generates telemetry such as:

- Deadline misses.
- Dropped messages.
- Queue-full drops.
- Fault-injected drops.
- Watchdog timeouts.
- Simulated recoveries.
- Task failures.
- Skipped-task events.

In MiniRTOS Playground, these scenarios are now exposed through backend metadata and can be executed through the Phase 26 Run Orchestration API.

---

## 2. Supported Fault Types

| Fault Type | Description | Main Runtime Impact | ML Label |
|---|---|---|---|
| `slow_task` | Adds extra execution time to a target task. | Deadline misses, unstable timing. | `SLOW_TASK` |
| `cpu_spike` | Adds simulated CPU-load delay. | Increased duration, deadline misses. | `CPU_SPIKE` |
| `task_crash` | Simulates task failure state. | `task_failed`, `task_skipped`. | `TASK_CRASH` |
| `dropped_messages` | Drops messages by probability. | `message_dropped`. | `DROPPED_MESSAGES` |

Related non-fault capacity scenario:

| Scenario | Purpose | ML Label |
|---|---|---|
| `queue_overflow` | Bounded queue pressure without intentional fault injection. | `QUEUE_PRESSURE` |

---

## 3. Fault Config Schema

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
| `enabled` | Turns fault injection on/off. |
| `type` | Selects fault type. |
| `target_task` | Selects affected task/message target. |
| `start_after_ms` | Delays activation. |
| `extra_execution_time_ms` | Adds execution time for timing faults. |
| `drop_probability_percent` | Controls dropped-message probability. |

---

## 4. Manual Commands

Slow task:

```bash
./scripts/run_fault.sh configs/slow_task.json
```

CPU spike:

```bash
./scripts/run_fault.sh configs/cpu_spike.json
```

Task crash:

```bash
./cpp-runtime/build/minirtos_runtime --config configs/task_crash.json
```

Dropped messages:

```bash
./scripts/run_fault.sh configs/dropped_messages.json
```

Watchdog slow task:

```bash
./cpp-runtime/build/minirtos_runtime --config configs/watchdog_slow_task.json
```

Queue overflow:

```bash
./cpp-runtime/build/minirtos_runtime --config configs/queue_overflow.json
```

Analyze:

```bash
./scripts/run_analyzer.sh logs/runtime_logs.jsonl
```

---

## 5. Backend API Commands

Phase 26 allows scenarios to be executed through Spring Boot:

```bash
curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"queue_overflow"}'
```

Other scenario IDs:

```text
cpu_spike
task_crash
slow_task
dropped_messages
watchdog_slow_task
```

Then inspect:

```bash
curl http://localhost:8081/api/runs/<runId>
curl http://localhost:8081/api/runs/<runId>/analysis
```

Generated files:

```text
runs/<runId>/runtime_logs.jsonl
runs/<runId>/analysis.txt
```

---

## 6. Expected Behavior

### `slow_task`

Expected:

```text
fault_injected
task_completed
deadline_missed
runtime_summary
Runtime status: UNSTABLE when deadline misses cross analyzer thresholds
```

### `cpu_spike`

Expected:

```text
fault_type=cpu_spike
target_task=NetworkTask
deadline misses if timing pressure exceeds deadline
Runtime status: UNSTABLE when deadline misses occur
```

### `task_crash`

Expected:

```text
fault_injected
task_failed
task_skipped
runtime_summary
Runtime status: UNSTABLE
```

### `dropped_messages`

Expected:

```text
fault_injected
message_dropped
reason=fault_injected_drop
Runtime status: WARNING
```

### `queue_overflow`

Expected:

```text
message_dropped
reason=queue_full
fault_injected events remain 0
Runtime status: WARNING
```

Verified through Phase 26 backend orchestration:

```text
POST /api/runs with scenarioId=queue_overflow
-> status=COMPLETED
-> runtimeHealth=WARNING
-> errorMessage=null
```

### `watchdog_slow_task`

Expected:

```text
fault_injected
deadline_missed
watchdog_timeout
task_recovered
Runtime status: UNSTABLE
```

---

## 7. Queue-Full Drops vs Fault-Injected Drops

| Drop Type | Cause | Meaning |
|---|---|---|
| `queue_full` | Target queue reached capacity. | Bounded queue pressure. |
| `fault_injected_drop` | Fault injector intentionally dropped a message. | Simulated message reliability fault. |

This distinction is important for educational explanations, root-cause analysis, and ML labeling.

---

## 8. Docker Fault Scenarios

```bash
docker compose up --build demo
docker compose run --rm runtime-cpu-spike
docker compose run --rm runtime-task-crash
docker compose run --rm runtime-slow-task
docker compose run --rm runtime-dropped-messages
docker compose run --rm runtime-watchdog
docker compose run --rm analyzer
```

Backend orchestration through Docker:

```bash
docker compose up --build backend
curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"task_crash"}'
```

---

## 9. Fault Scenarios as Backend Metadata

These scenarios are exposed through:

```text
GET /api/scenarios
```

The backend returns metadata such as:

- Scenario ID.
- Name.
- Scheduler mode.
- Difficulty.
- Concept.
- Description.
- Config path.
- What the scenario teaches.
- Expected telemetry signals.

They can now be run through:

```text
POST /api/runs
```

---

## 10. Limitations

- `task_crash` simulates failure but does not crash real threads/processes.
- It does not simulate memory corruption.
- It does not simulate corrupted message payloads yet.
- Recovery is logged rather than implemented as a real restart.
- ML labels are scenario-derived.
- Backend run metadata is currently in memory only.

---

## 11. Recommended Future Faults

```text
corrupted_message
missed_heartbeat
random_latency
network_partition
```
