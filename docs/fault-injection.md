# MiniRTOS-Linux Fault Injection Guide

## Current Status

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed the Run Orchestration API. Phase 27 completed PostgreSQL/Flyway run persistence. Phase 28 added the React Dashboard MVP for running and inspecting scenarios from the browser.

The backend can execute fault and queue-pressure scenarios through `POST /api/runs`, persist the resulting run summaries/analysis in PostgreSQL, and expose them to the React dashboard.

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

In MiniRTOS Playground, these scenarios are exposed through backend metadata, can be executed through the Run Orchestration API, are persisted through PostgreSQL run storage, and can be inspected from the React dashboard.

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

Run a fault or queue scenario through Spring Boot:

```bash
curl -X POST http://localhost:8081/api/runs   -H "Content-Type: application/json"   -d '{"scenarioId":"queue_overflow"}'
```

Other scenario IDs:

```text
cpu_spike
task_crash
slow_task
dropped_messages
watchdog_slow_task
```

Then inspect persisted results:

```bash
curl http://localhost:8081/api/runs
curl http://localhost:8081/api/runs/<runId>
curl http://localhost:8081/api/runs/<runId>/analysis
```

Generated files:

```text
runs/<runId>/runtime_logs.jsonl
runs/<runId>/analysis.txt
```

Persisted database records:

```text
runs
run_event_counts
run_severity_counts
run_task_metrics
run_root_causes
```

---

## 6. Frontend Dashboard Usage

Run backend and frontend:

```bash
docker compose up -d postgres
cd backend
mvn spring-boot:run
```

Then:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

Expected dashboard flow:

1. Select a fault scenario from the scenario dropdown.
2. Review the scenario explanation and expected telemetry signals.
3. Click **Run selected scenario**.
4. Inspect the latest run result card.
5. Click the completed run in persisted history.
6. Review the analyzer panel for message drops, deadline misses, root causes, and raw report details.

Important:

```text
VITE_API_BASE_URL must be http://localhost:8081.
```

---

## 7. Expected Behavior

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

Verified through backend orchestration and persistence:

```text
POST /api/runs with scenarioId=queue_overflow
-> status=COMPLETED
-> runtimeHealth=WARNING
-> errorMessage=null
-> GET /api/runs returns the persisted run
-> GET /api/runs/{runId}/analysis returns queueFullDrops and faultInjectedDrops
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

## 8. Queue-Full Drops vs Fault-Injected Drops

| Drop Type | Cause | Meaning |
|---|---|---|
| `queue_full` | Target queue reached capacity. | Bounded queue pressure. |
| `fault_injected_drop` | Fault injector intentionally dropped a message. | Simulated message reliability fault. |

This distinction is important for educational explanations, root-cause analysis, ML labeling, persisted analysis summaries, and the frontend dashboard.

---

## 9. Docker Fault Scenarios

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
curl -X POST http://localhost:8081/api/runs   -H "Content-Type: application/json"   -d '{"scenarioId":"task_crash"}'
```

Frontend through Docker:

```bash
docker compose up --build frontend
```

Open:

```text
http://localhost:5173
```

---

## 10. Fault Scenarios as Backend Metadata

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

Run results are persisted in PostgreSQL and can be revisited through:

```text
GET /api/runs
GET /api/runs/{runId}
GET /api/runs/{runId}/analysis
```

The React dashboard consumes all of these APIs.

---

## 11. Limitations

- `task_crash` simulates failure but does not crash real threads/processes.
- It does not simulate memory corruption.
- It does not simulate corrupted message payloads yet.
- Recovery is logged rather than implemented as a real restart.
- ML labels are scenario-derived.
- PostgreSQL persistence stores run metadata and parsed analysis, but the raw runtime log still lives as a file under `runs/<runId>/runtime_logs.jsonl`.
- Phase 28 frontend displays fault/analyzer summaries but does not yet include charts or timeline visualizations.

---

## 12. Recommended Future Faults

```text
corrupted_message
missed_heartbeat
random_latency
network_partition
```
