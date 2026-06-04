# MiniRTOS-Linux Performance, Fault, Dataset, ML, Backend, and Frontend Benchmark Report

**Updated:** June 4, 2026  
**Phase:** Phase 28 React dashboard update after Phase 27 PostgreSQL/Flyway integration  
**Project:** MiniRTOS-Linux — Embedded Runtime Simulator with AI-Based Fault Detection

---

## 1. Purpose

This benchmark report summarizes the observed behavior of MiniRTOS-Linux across scheduler, queue-pressure, fault-injected, watchdog, dataset-generation, ML-classifier, backend persistence, and frontend dashboard workflows.

MiniRTOS-Linux is a software-only C++20 embedded runtime simulator that models periodic tasks, round-robin scheduling, priority scheduling, earliest-deadline-first scheduling, bounded message queues, structured JSONL telemetry, configurable fault injection, watchdog monitoring, simulated recovery behavior, Python-based runtime analysis, synthetic training-dataset generation, and a trained lightweight ML anomaly classifier.

Phase 27 added persistent PostgreSQL/Flyway run storage around backend-orchestrated runs. Phase 28 added the React/TypeScript dashboard MVP for scenario selection, run creation, persisted run history, and analyzer summary display.

---

## 2. Verification Context

Previously verified by user:

```bash
python3 -m pytest ai-analyzer/tests -q
./scripts/run_tests.sh
docker compose config
docker compose up --build demo
docker compose run --rm training-dataset
docker compose run --rm ml-train
docker compose run --rm ml-predict
```

Phase 27 verified backend/database behavior:

```bash
docker compose up -d postgres
cd backend
mvn clean test
mvn spring-boot:run
curl http://localhost:8081/api/scenarios
curl http://localhost:8081/api/runs
curl -X POST http://localhost:8081/api/runs -H "Content-Type: application/json" -d '{"scenarioId":"queue_overflow"}'
curl http://localhost:8081/api/runs/<runId>/analysis
```

Phase 28 frontend verification checklist:

```bash
cd frontend
npm install
npm run typecheck
npm run build
npm run dev
```

Open:

```text
http://localhost:5173
```

Important Phase 28 debugging context:

```text
VITE_API_BASE_URL must be http://localhost:8081.
The backend is plain HTTP locally, not HTTPS.
If backend logs show invalid HTTP method bytes such as 0x16 0x03 0x01, the browser/frontend is sending HTTPS/TLS to the HTTP backend port.
```

---

## 3. Scenarios Tested

| Scenario | Config File | Log File | Dataset/ML Label | Purpose |
|---|---|---|---|---|
| Normal runtime | `configs/normal.json` | `normal_runtime_logs.jsonl` | `NORMAL` | Baseline round-robin behavior without explicit fault injection. |
| Earliest-deadline-first scheduler | `configs/deadline_scheduler.json` | `deadline_scheduler_runtime_logs.jsonl` | `NORMAL` | Validates earliest-deadline-first ordering while preserving the runtime log schema. |
| Queue overflow | `configs/queue_overflow.json` | `queue_overflow_runtime_logs.jsonl` | `QUEUE_PRESSURE` | Stresses bounded queue capacity without explicit fault injection. |
| CPU spike fault | `configs/cpu_spike.json` | `cpu_spike_runtime_logs.jsonl` | `CPU_SPIKE` | Injects simulated CPU-load pressure into `NetworkTask`. |
| Task crash fault | `configs/task_crash.json` | `task_crash_runtime_logs.jsonl` | `TASK_CRASH` | Simulates `NetworkTask` entering a failed state while the runtime process continues. |
| Slow task fault | `configs/slow_task.json` | `slow_task_runtime_logs.jsonl` | `SLOW_TASK` | Injects repeated slow-task timing pressure into `ControlTask`. |
| Dropped messages fault | `configs/dropped_messages.json` | `dropped_messages_runtime_logs.jsonl` | `DROPPED_MESSAGES` | Injects message reliability faults through `fault_injected_drop` behavior. |
| Watchdog slow task | `configs/watchdog_slow_task.json` | `watchdog_runtime_logs.jsonl` | `WATCHDOG_RECOVERY` | Combines slow-task timing pressure with watchdog timeout and simulated recovery telemetry. |
| Priority scheduler | `configs/priority_scheduler.json` | Not included in uploaded logs | `NORMAL` | Expected to validate priority ordering; refresh when `priority_scheduler_runtime_logs.jsonl` is available. |

---

## 4. High-Level Runtime Results

| Scenario | Scheduler Mode | Events | Runtime Status | Info | Warnings | Errors | Key Finding |
|---|---|---:|---|---:|---:|---:|---|
| Normal runtime | `round_robin` | 1444 | `WARNING` | 1105 | 339 | 0 | Baseline run completed with no deadline misses, no faults, and queue-full drops caused by bounded queue pressure. |
| Earliest-deadline-first scheduler | `earliest_deadline_first` | 1444 | `WARNING` | 1105 | 339 | 0 | EDF run preserved the same telemetry profile as the baseline run while using the deadline scheduler mode. |
| Queue overflow | `round_robin` | 3070 | `WARNING` | 2112 | 958 | 0 | Dedicated queue-overflow scenario created the strongest queue pressure with no deadline misses and no fault-injected drops. |
| CPU spike fault | `round_robin` | 1070 | `UNSTABLE` | 690 | 380 | 0 | CPU spike scenario produced CPU-spike fault events and deadline misses, especially on `NetworkTask`. |
| Task crash fault | `round_robin` | 1245 | `UNSTABLE` | 905 | 338 | 2 | Task-crash scenario logged one task failure and repeated skipped-task telemetry while the runtime continued. |
| Slow task fault | `round_robin` | 1336 | `UNSTABLE` | 731 | 605 | 0 | Slow-task scenario produced repeated `ControlTask` deadline misses. |
| Dropped messages fault | `round_robin` | 1625 | `WARNING` | 1105 | 520 | 0 | Dropped-message scenario separated fault-injected drops from queue-full drops. |
| Watchdog slow task | `round_robin` | 1380 | `UNSTABLE` | 731 | 627 | 22 | Watchdog scenario escalated slow-task deadline misses into timeout and recovery telemetry. |
| Priority scheduler | `priority` | Not measured | Not measured | Not measured | Not measured | Not measured | Upload `priority_scheduler_runtime_logs.jsonl` to refresh this row. |

---

## 5. Message, Fault, Watchdog, and Failure Metrics

| Scenario | Messages Sent | Messages Received | Messages Dropped | Queue-Full Drops | Fault-Injected Drops | Fault Events | Deadline Misses | Watchdog Timeouts | Recoveries | Task Failures | Task Skips |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal runtime | 80 | 60 | 339 | 339 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Earliest-deadline-first scheduler | 80 | 60 | 339 | 339 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Queue overflow | 33 | 30 | 958 | 958 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| CPU spike fault | 78 | 58 | 186 | 186 | 0 | 97 | 193 | 0 | 0 | 0 | 0 |
| Task crash fault | 80 | 60 | 239 | 239 | 0 | 1 | 0 | 0 | 0 | 1 | 99 |
| Slow task fault | 74 | 54 | 257 | 257 | 0 | 174 | 174 | 0 | 0 | 0 | 0 |
| Dropped messages fault | 80 | 60 | 339 | 158 | 181 | 181 | 0 | 0 | 0 | 0 | 0 |
| Watchdog slow task | 74 | 54 | 257 | 257 | 0 | 174 | 174 | 22 | 22 | 0 | 0 |

---

## 6. Fault-Type Breakdown

| Scenario | Fault-Type Counts |
|---|---|
| Normal runtime | None |
| Earliest-deadline-first scheduler | None |
| Queue overflow | None |
| CPU spike fault | `cpu_spike`: 97 |
| Task crash fault | `task_crash`: 1 |
| Slow task fault | `slow_task`: 174 |
| Dropped messages fault | `dropped_messages`: 181 |
| Watchdog slow task | `slow_task`: 174 |

---

## 7. Per-Task Runtime Metrics

Average and maximum durations are computed from `task_completed` events in the uploaded logs.

| Scenario | Task | Runs | Deadline Misses | Avg Duration ms | Max Duration ms |
|---|---|---:|---:|---:|---:|
| Normal runtime | `ControlTask` | 299 | 0 | 10.00 | 10.00 |
| Normal runtime | `NetworkTask` | 120 | 0 | 20.00 | 20.00 |
| Normal runtime | `LoggerTask` | 60 | 0 | 15.00 | 15.00 |
| Earliest-deadline-first scheduler | `ControlTask` | 299 | 0 | 10.00 | 10.00 |
| Earliest-deadline-first scheduler | `NetworkTask` | 120 | 0 | 20.00 | 20.00 |
| Earliest-deadline-first scheduler | `LoggerTask` | 60 | 0 | 15.00 | 15.00 |
| Queue overflow | `ControlTask` | 594 | 0 | 5.00 | 5.00 |
| Queue overflow | `NetworkTask` | 397 | 0 | 8.00 | 8.00 |
| Queue overflow | `LoggerTask` | 30 | 0 | 15.00 | 15.00 |
| CPU spike fault | `ControlTask` | 147 | 96 | 10.00 | 10.00 |
| CPU spike fault | `NetworkTask` | 117 | 97 | 202.39 | 240.00 |
| CPU spike fault | `LoggerTask` | 58 | 0 | 15.00 | 15.00 |
| Task crash fault | `ControlTask` | 299 | 0 | 10.00 | 10.00 |
| Task crash fault | `NetworkTask` | 20 | 0 | 20.00 | 20.00 |
| Task crash fault | `LoggerTask` | 60 | 0 | 15.00 | 15.00 |
| Slow task fault | `ControlTask` | 224 | 174 | 103.21 | 130.00 |
| Slow task fault | `NetworkTask` | 107 | 0 | 20.00 | 20.00 |
| Slow task fault | `LoggerTask` | 54 | 0 | 15.00 | 15.00 |
| Dropped messages fault | `ControlTask` | 299 | 0 | 10.00 | 10.00 |
| Dropped messages fault | `NetworkTask` | 120 | 0 | 20.00 | 20.00 |
| Dropped messages fault | `LoggerTask` | 60 | 0 | 15.00 | 15.00 |
| Watchdog slow task | `ControlTask` | 224 | 174 | 103.21 | 130.00 |
| Watchdog slow task | `NetworkTask` | 107 | 0 | 20.00 | 20.00 |
| Watchdog slow task | `LoggerTask` | 54 | 0 | 15.00 | 15.00 |

---

## 8. Scenario Observations

### 8.1 Normal Runtime
The normal runtime completed with 1,444 events, no deadline misses, no fault injection, no watchdog events, and 339 queue-full message drops.

### 8.2 Earliest-Deadline-First Scheduler
The EDF scheduler run completed with the same top-level telemetry profile as the normal run: 1,444 events, 339 queue-full drops, and 0 deadline misses.

### 8.3 Queue Overflow
The queue-overflow scenario produced 3,070 events and 958 queue-full drops. There were 0 fault-injected drops, 0 deadline misses, 0 watchdog timeouts, and 0 task failures.

### 8.4 CPU Spike
The CPU-spike scenario produced 97 `cpu_spike` fault events and 193 total deadline misses.

### 8.5 Task Crash
The task-crash scenario produced 1 `task_crash` fault event, 1 `task_failed` event, and 99 `task_skipped` events.

### 8.6 Slow Task
The slow-task scenario produced 174 `slow_task` fault events and 174 `ControlTask` deadline misses.

### 8.7 Dropped Messages
The dropped-message scenario produced 181 fault-injected message drops and 158 queue-full drops.

### 8.8 Watchdog Slow Task
The watchdog scenario produced 22 watchdog timeout events and 22 simulated task recovery events.

---

## 9. Synthetic Dataset Implications

Using a 5,000 ms window size, the uploaded benchmark logs produce **56 derived window rows** across the 8 uploaded non-duplicate scenario logs.

| Scenario | Label | Derived 5s Windows |
|---|---|---:|
| Normal runtime | `NORMAL` | 7 |
| Earliest-deadline-first scheduler | `NORMAL` | 7 |
| Queue overflow | `QUEUE_PRESSURE` | 7 |
| CPU spike fault | `CPU_SPIKE` | 7 |
| Task crash fault | `TASK_CRASH` | 7 |
| Slow task fault | `SLOW_TASK` | 7 |
| Dropped messages fault | `DROPPED_MESSAGES` | 7 |
| Watchdog slow task | `WATCHDOG_RECOVERY` | 7 |
| **Total from uploaded logs** |  | **56** |

A complete 9-scenario dataset that also includes the priority scheduler log would be expected to add another 7 windows.

---

## 10. ML Classifier Benchmark Context

Phase 22 added the trained ML classifier workflow:

```bash
python3 ai-analyzer/ml/train_model.py   --dataset reports/generated/synthetic_dataset.csv   --model-output models/anomaly_classifier.joblib   --label-encoder-output models/label_encoder.joblib   --metrics-output reports/generated/model_metrics.json

python3 ai-analyzer/ml/predict_model.py   --model models/anomaly_classifier.joblib   --label-encoder models/label_encoder.joblib   --dataset reports/generated/synthetic_dataset.csv   --limit 20
```

Correct interpretation:

- The classifier is a lightweight supervised ML layer.
- It is trained on synthetic scenario telemetry generated by the simulator.
- It predicts scenario-style anomaly labels with confidence values.
- It should not be described as production-validated AI.

---

## 11. Phase 27 Backend Persistence Verification

Phase 27 did not change the C++ runtime timing model or the Python analyzer logic. It added persistence around backend-orchestrated runs.

Verified backend/database behavior:

| Check | Result |
|---|---|
| `POST /api/runs` with `queue_overflow` | Passed. Returned `status=COMPLETED` and `runtimeHealth=WARNING`. |
| `GET /api/runs` | Passed. Returned HTTP 200 with persisted run summaries from PostgreSQL. |
| `GET /api/runs/{runId}` | Passed. Returned HTTP 200 with one persisted run summary. |
| `GET /api/runs/{runId}/analysis` | Passed. Returned HTTP 200 with parsed persisted analyzer data. |
| PostgreSQL LOB issue | Fixed by removing `@Lob` from `rawReport` and storing it as normal PostgreSQL `TEXT`. |

Verified example analysis for `queue_overflow`:

```text
runtimeHealth=WARNING
eventsLoaded=3064
simulationName=queue_overflow
schedulerMode=round_robin
configuredDurationSeconds=30
observedDurationMs=30000
messageDropped=956
queueFullDrops=956
faultInjectedDrops=0
```

---

## 12. Phase 28 Frontend/API Workflow Verification

Phase 28 adds a browser workflow benchmark:

| Check | Expected Result |
|---|---|
| `npm run typecheck` | TypeScript passes. |
| `npm run build` | Vite production build succeeds. |
| Dashboard loads at `http://localhost:5173` | Page renders the MiniRTOS dashboard. |
| `GET /api/scenarios` from frontend | Scenario dropdown is populated. |
| `POST /api/runs` from frontend | Run is created through backend orchestration. |
| `GET /api/runs` from frontend | Persisted run history is displayed. |
| `GET /api/runs/{runId}/analysis` from frontend | Analyzer panel displays message summary, task metrics, root causes, and raw report. |

Known local issue and fix:

```text
Dashboard error: Failed to fetch
```

Likely causes:

1. Backend not running.
2. CORS config missing or backend not restarted after adding CORS.
3. `VITE_API_BASE_URL` set to HTTPS instead of HTTP.
4. Browser cached old environment/build.

Correct local configuration:

```env
VITE_API_BASE_URL=http://localhost:8081
```

---

## 13. Final Measured Summary

| Scenario | Final Benchmark Result |
|---|---|
| Normal runtime | Pass. Baseline run produced no deadline misses or faults; queue-full drops show bounded-queue pressure. |
| Earliest-deadline-first scheduler | Pass. EDF run preserved analyzer-compatible telemetry and produced no deadline misses. |
| Queue overflow | Pass. Queue pressure reproduced clearly with 958 queue-full drops and no fault-injected drops. |
| CPU spike fault | Pass. CPU-spike fault reproduced with 97 fault events and 193 total deadline misses. |
| Task crash fault | Pass. Task-crash behavior reproduced with 1 failure and 99 skipped-task events while runtime continued. |
| Slow task fault | Pass. Slow-task behavior reproduced with 174 `ControlTask` deadline misses. |
| Dropped messages fault | Pass. Fault-injected drops reproduced and separated from queue-full drops. |
| Watchdog slow task | Pass. Watchdog escalation reproduced with 22 timeouts and 22 recoveries. |
| Priority scheduler | Not refreshed from uploaded logs. Re-run/upload `priority_scheduler_runtime_logs.jsonl` if exact measured values are required. |
| Backend persistence | Pass. PostgreSQL stores and returns run metadata/analysis summaries. |
| Frontend dashboard | Added. Complete verification requires confirming local API base URL, CORS, backend uptime, and successful browser API calls. |

---

## 14. Limitations

Current limitations remain:

- Timing is simulated on Linux, not hard real-time hardware.
- Task-crash behavior simulates task failure through scheduler state and logs rather than killing an actual process or thread.
- Recovery behavior is represented through telemetry rather than a real restart mechanism.
- Queue pressure can appear in baseline scenarios depending on message production and consumption rates.
- Synthetic ML labels are scenario-derived, not manually reviewed per-window labels.
- ML metrics are not listed in this refresh because `model_metrics.json` was not included with the uploaded benchmark logs.
- Frontend currently displays analyzer summaries but does not yet provide charts/timelines.
- Phase 28 dashboard verification should be repeated after resolving any local `Failed to fetch` environment issue.

---

## 15. Recommended Next Updates

Recommended follow-up polish:

1. Add or upload `priority_scheduler_runtime_logs.jsonl` and refresh the priority row.
2. Paste or upload `reports/generated/model_metrics.json` if exact ML accuracy and confusion-matrix values should be included.
3. Keep generated logs, datasets, metrics, `.joblib` files, frontend `node_modules`, frontend `dist`, and local `.env` files ignored by Git.
4. Add automated frontend tests after the dashboard stabilizes.
5. Add a frontend/API workflow screenshot or benchmark after Phase 28 verification succeeds.
