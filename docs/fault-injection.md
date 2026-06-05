# MiniRTOS-Linux Fault Injection Guide

**Updated:** June 5, 2026  
**Current Phase:** Phase 30 — Full-Stack Docker Compose Hardening

---

## Current Status

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed the Run Orchestration API. Phase 27 completed PostgreSQL/Flyway run persistence. Phase 28 added the React Dashboard MVP for running and inspecting scenarios from the browser. Phase 29 added educational modules and visualizers that explain fault behavior in student-friendly language. Phase 30 hardened Docker Compose so the backend, dev frontend, and production frontend can run reliably.

The backend can execute fault and queue-pressure scenarios through `POST /api/runs`, persist the resulting run summaries/analysis in PostgreSQL, and expose them to the React dashboard. The frontend can explain and visualize queue pressure, task runtime duration, runtime health, and root causes in both dev and production Docker modes.

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

Phase 29 added a learning layer on top of this data:

- Guided scenario explanation cards.
- Queue pressure visualizer.
- Task runtime timeline.
- Fault and health explanation panel.
- Root-cause teaching notes.

Phase 30 ensured those workflows also work through the production Docker frontend at `http://localhost:3000`.

---

## 2. Supported Fault Types

| Fault Type | Description | Main Runtime Impact | ML Label | Frontend Learning Focus |
|---|---|---|---|---|
| `slow_task` | Adds extra execution time to a target task. | Deadline misses, unstable timing. | `SLOW_TASK` | Deadline misses and long task duration. |
| `cpu_spike` | Adds simulated CPU-load delay. | Increased duration, deadline misses. | `CPU_SPIKE` | CPU timing pressure and max duration. |
| `task_crash` | Simulates task failure state. | `task_failed`, `task_skipped`. | `TASK_CRASH` | Task failure isolation and skipped work. |
| `dropped_messages` | Drops messages by probability. | `message_dropped`. | `DROPPED_MESSAGES` | Fault-injected message loss. |

Related non-fault capacity scenario:

| Scenario | Purpose | ML Label | Frontend Learning Focus |
|---|---|---|---|
| `queue_overflow` | Bounded queue pressure without intentional fault injection. | `QUEUE_PRESSURE` | Queue-full drops and bounded capacity. |

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

### Dev frontend

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

Or through Docker:

```bash
docker compose up -d postgres
docker compose up -d backend
docker compose up --build frontend
```

Open:

```text
http://localhost:5173
```

### Production frontend

Run the production frontend through Nginx:

```bash
docker compose down --remove-orphans
mkdir -p logs runs reports/generated models

docker compose up -d postgres
docker compose build --no-cache backend
docker compose up -d backend

docker compose --profile prod build --no-cache frontend-prod
docker compose --profile prod up -d frontend-prod
```

Open:

```text
http://localhost:3000
```

Expected dashboard flow:

1. Select a fault scenario from the scenario dropdown.
2. Review the Guided Learning panel.
3. Review scenario explanation and expected telemetry signals.
4. Click **Run selected scenario**.
5. Inspect the latest run result card.
6. Click the completed run in persisted history.
7. Review analyzer summary.
8. Review queue pressure visualizer.
9. Review task runtime timeline.
10. Review fault/health explanation panel.
11. Expand raw analyzer report if needed.

Important:

```text
VITE_API_BASE_URL must be http://localhost:8081.
Backend CORS must allow localhost:5173 and localhost:3000.
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

Frontend interpretation:

```text
Task runtime timeline highlights tasks with deadline misses.
Fault explanation panel describes slow execution and deadline risk.
```

### `cpu_spike`

Expected:

```text
fault_type=cpu_spike
target_task=NetworkTask
deadline misses if timing pressure exceeds deadline
Runtime status: UNSTABLE when deadline misses occur
```

Frontend interpretation:

```text
Task timeline shows high max duration on affected task.
Health explanation explains why timing pressure can make a system unstable.
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

Frontend interpretation:

```text
Fault panel explains task failure isolation and skipped-task telemetry.
```

### `dropped_messages`

Expected:

```text
fault_injected
message_dropped
reason=fault_injected_drop
Runtime status: WARNING
```

Frontend interpretation:

```text
Queue pressure chart separates fault-injected drops from queue-full drops.
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

Frontend interpretation:

```text
Guided Learning explains queue pressure.
Queue pressure visualizer shows dropped messages.
Fault/health panel explains WARNING and queue capacity.
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

Frontend interpretation:

```text
Fault panel explains watchdog escalation and simulated recovery telemetry.
```

---

## 8. Queue-Full Drops vs Fault-Injected Drops

| Drop Type | Cause | Meaning | Frontend Explanation |
|---|---|---|---|
| `queue_full` | Target queue reached capacity. | Bounded queue pressure. | Capacity problem or producer/consumer mismatch. |
| `fault_injected_drop` | Fault injector intentionally dropped a message. | Simulated message reliability fault. | Communication reliability issue. |

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
docker compose up -d postgres
docker compose build --no-cache backend
docker compose up -d backend

curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"task_crash"}'
```

Frontend dev through Docker:

```bash
docker compose up --build frontend
```

Open:

```text
http://localhost:5173
```

Frontend production through Docker:

```bash
docker compose --profile prod build --no-cache frontend-prod
docker compose --profile prod up -d frontend-prod
```

Open:

```text
http://localhost:3000
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

The React dashboard consumes all of these APIs in both dev and production modes.

---

## 11. Phase 29 Frontend Learning Files

```text
frontend/src/content/learningContent.ts
frontend/src/components/LearningModulePanel.tsx
frontend/src/components/QueuePressureChart.tsx
frontend/src/components/TaskTimeline.tsx
frontend/src/components/FaultExplanationPanel.tsx
```

---

## 12. Phase 30 Docker/CORS Troubleshooting for Fault Dashboard

If production frontend says:

```text
Dashboard Failed to Fetch
```

check:

```bash
curl -i http://localhost:8081/api/scenarios

curl -i -X OPTIONS http://localhost:8081/api/scenarios \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

Expected:

```text
Access-Control-Allow-Origin: http://localhost:3000
```

If the production frontend cannot load at all, check:

```bash
docker ps
```

Expected:

```text
0.0.0.0:3000->80/tcp
```

---

## 13. Limitations

- `task_crash` simulates failure but does not crash real threads/processes.
- It does not simulate memory corruption.
- It does not simulate corrupted message payloads yet.
- Recovery is logged rather than implemented as a real restart.
- ML labels are scenario-derived.
- PostgreSQL persistence stores run metadata and parsed analysis, but the raw runtime log still lives as a file under `runs/<runId>/runtime_logs.jsonl`.
- Phase 29 visualizers are summary visualizers, not full event-by-event timelines.
- Phase 30 did not add new fault types; it hardened Docker workflows for running existing scenarios.

---

## 14. Recommended Future Faults

```text
corrupted_message
missed_heartbeat
random_latency
network_partition
```
