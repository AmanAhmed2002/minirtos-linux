# MiniRTOS-Linux Performance, Fault, Dataset, ML, Backend, Frontend, and Docker Benchmark Report

**Updated:** June 5, 2026  
**Phase:** Phase 30 Docker Compose hardening after Phase 29 educational modules and frontend visualizers  
**Project:** MiniRTOS-Linux — Embedded Runtime Simulator with AI-Based Fault Detection

---

## 1. Purpose

This benchmark report summarizes the observed behavior of MiniRTOS-Linux across scheduler, queue-pressure, fault-injected, watchdog, dataset-generation, ML-classifier, backend persistence, frontend dashboard, educational visualizer, and Docker workflow verification.

MiniRTOS-Linux is a software-only C++20 embedded runtime simulator that models periodic tasks, round-robin scheduling, priority scheduling, earliest-deadline-first scheduling, bounded message queues, structured JSONL telemetry, configurable fault injection, watchdog monitoring, simulated recovery behavior, Python-based runtime analysis, synthetic training-dataset generation, and a trained lightweight ML anomaly classifier.

Phase 27 added persistent PostgreSQL/Flyway run storage around backend-orchestrated runs. Phase 28 added the React/TypeScript dashboard MVP for scenario selection, run creation, persisted run history, and analyzer summary display. Phase 29 added guided learning modules, queue pressure visualizer, task runtime timeline, fault/health explanation panel, and root-cause teaching notes. Phase 30 hardened the full-stack Docker workflow by fixing backend Docker builds, separating dev and production frontend modes, adding production Nginx serving, and updating CORS for the production frontend.

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

Phase 28/29 frontend verification checklist:

```bash
cd frontend
npm install
npm run typecheck
npm run build
npm run dev
```

Phase 29 frontend verification checklist:

```text
Dashboard loads at http://localhost:5173.
Scenario dropdown loads.
Guided Learning panel changes by selected scenario.
Run selected scenario works.
Persisted history updates.
Completed run analysis loads.
Queue pressure visualizer appears.
Task runtime timeline appears.
Fault/health explanation panel appears.
Raw analyzer report remains expandable.
```

Phase 30 Docker verification checklist:

```bash
docker compose down --remove-orphans
mkdir -p logs runs reports/generated models
docker compose config

docker compose up -d postgres
docker compose build --no-cache backend
docker compose up -d backend

curl -i http://localhost:8081/actuator/health
curl -i http://localhost:8081/api/scenarios

docker compose up --build frontend
# open http://localhost:5173

docker compose --profile prod build --no-cache frontend-prod
docker compose --profile prod up -d frontend-prod
curl -i http://localhost:3000/health
# open http://localhost:3000
```

User confirmed after Phase 30:

```text
Dev frontend worked.
Production frontend initially failed to fetch.
The issue was fixed by updating backend CORS to include localhost:3000.
Production frontend then connected to backend correctly.
Phase 30 was considered functionally complete.
```

Important frontend/backend debugging context:

```text
VITE_API_BASE_URL must be http://localhost:8081.
The backend is plain HTTP locally, not HTTPS.
If backend logs show invalid HTTP method bytes such as 0x16 0x03 0x01, the browser/frontend is sending HTTPS/TLS to the HTTP backend port.
Production frontend runs on http://localhost:3000.
Dev frontend runs on http://localhost:5173.
Backend CORS must allow both frontend origins.
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

## 6. Backend Persistence Verification

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

## 7. Frontend/API Workflow Verification

| Check | Expected Result | Phase |
|---|---|---|
| `npm run typecheck` | TypeScript passes. | Phase 28/29/30 |
| `npm run build` | Vite production build succeeds. | Phase 28/29/30 |
| Dashboard loads at `http://localhost:5173` | Dev dashboard renders the MiniRTOS dashboard. | Phase 28/29/30 |
| Dashboard loads at `http://localhost:3000` | Production Nginx dashboard renders the MiniRTOS dashboard. | Phase 30 |
| `GET /api/scenarios` from frontend | Scenario dropdown is populated. | Phase 28/29/30 |
| `POST /api/runs` from frontend | Run is created through backend orchestration. | Phase 28/29/30 |
| `GET /api/runs` from frontend | Persisted run history is displayed. | Phase 28/29/30 |
| `GET /api/runs/{runId}/analysis` from frontend | Analyzer panel displays message summary, task metrics, root causes, and raw report. | Phase 28/29/30 |
| Guided Learning panel | Changes based on selected scenario. | Phase 29/30 |
| Queue pressure visualizer | Displays received/dropped and queue/fault drop breakdown. | Phase 29/30 |
| Task runtime timeline | Displays task duration bars and deadline risk. | Phase 29/30 |
| Fault/health panel | Explains runtime health and root causes. | Phase 29/30 |
| Production `/health` | Returns HTTP 200 from Nginx. | Phase 30 |

Known local issue and fix:

```text
Dashboard error: Failed to fetch
```

Likely causes:

1. Backend not running.
2. CORS config missing or backend not restarted after adding CORS.
3. `VITE_API_BASE_URL` set to HTTPS instead of HTTP.
4. Browser cached old environment/build.
5. Production frontend on localhost:3000 is not included in backend CORS.
6. Production frontend was built with the wrong API URL.

Correct local configuration:

```env
VITE_API_BASE_URL=http://localhost:8081
```

Allowed CORS origins after Phase 30:

```text
http://localhost:5173
http://127.0.0.1:5173
http://localhost:3000
http://127.0.0.1:3000
```

---

## 8. Phase 30 Docker Benchmark Summary

| Check | Result |
|---|---|
| Backend Docker build | Passed after adding CMake/Ninja/build tools. |
| Backend container startup | Passed. Tomcat starts on port 8081. |
| Backend health | Passed at `/actuator/health`. |
| Dev frontend Docker workflow | Passed at `http://localhost:5173`. |
| Production frontend Docker workflow | Passed at `http://localhost:3000`. |
| Nginx health | Passed at `/health`. |
| Production frontend CORS | Passed after adding `localhost:3000` to allowed origins. |
| Production dashboard fetch | Passed after CORS fix. |
| Existing analyzer/runtime behavior | Unchanged by Phase 30. |

---

## 9. Final Measured Summary

| Scenario / Area | Final Benchmark Result |
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
| Frontend dev dashboard | Pass. Dashboard works with correct API base URL and backend/CORS setup. |
| Frontend production dashboard | Pass after CORS update. Dashboard works through Nginx on localhost:3000. |
| Phase 29 learning modules and visualizers | Pass after user verification. Educational cards, queue visualizer, task timeline, and fault/health panel work. |
| Phase 30 Docker hardening | Pass after user verification. Dev/prod frontend and backend Docker workflows work. |

---

## 10. Limitations

Current limitations remain:

- Timing is simulated on Linux, not hard real-time hardware.
- Task-crash behavior simulates task failure through scheduler state and logs rather than killing an actual process or thread.
- Recovery behavior is represented through telemetry rather than a real restart mechanism.
- Queue pressure can appear in baseline scenarios depending on message production and consumption rates.
- Synthetic ML labels are scenario-derived, not manually reviewed per-window labels.
- ML metrics are not listed in this refresh because `model_metrics.json` was not included with the uploaded benchmark logs.
- Phase 29 visualizers summarize parsed analyzer output but do not yet render a full event-by-event timeline.
- Frontend automated tests were added in Phase 31.
- Local Kubernetes manifests were added in Phase 33, but Kubernetes benchmark verification is not included in this report.

---

## 11. Recommended Next Updates

Recommended follow-up polish:

1. Add or upload `priority_scheduler_runtime_logs.jsonl` and refresh the priority row.
2. Paste or upload `reports/generated/model_metrics.json` if exact ML accuracy and confusion-matrix values should be included.
3. Keep generated logs, datasets, metrics, `.joblib` files, frontend `node_modules`, frontend `dist`, and local `.env` files ignored by Git.
4. Add CI Docker build smoke tests for backend and frontend-prod if not already committed.
5. Add a frontend/API workflow screenshot showing `localhost:5173`, `localhost:3000`, and `localhost:30080`.
6. Add a local Kubernetes smoke test covering `kind`, `kubectl apply`, and NodePort healthchecks.
