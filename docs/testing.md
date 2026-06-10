# MiniRTOS-Linux / MiniRTOS Playground Testing Guide

**Updated:** June 10, 2026
**Current Phase:** Phase 33 — Local Kubernetes Deployment

---

## Current Status

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed the Run Orchestration API. Phase 27 completed PostgreSQL/Flyway run persistence. Phase 28 added the React/TypeScript dashboard MVP and frontend Docker integration. Phase 29 added educational modules and CSS-based frontend visualizers. Phase 30 hardened Docker Compose and Dockerfiles for backend, dev frontend, and production frontend workflows. Phase 31 added frontend automated tests with Vitest and React Testing Library. Phase 32 added Amplitude event tracking with a safe `isAnalyticsEnabled` guard. Phase 33 added local Kubernetes manifests and `kind` host port mappings.

Verified Phase 27 behavior:

- `POST /api/runs` successfully runs `queue_overflow`.
- `GET /api/runs` returns HTTP 200 with persisted run summaries.
- `GET /api/runs/{runId}` returns HTTP 200 with one persisted run.
- `GET /api/runs/{runId}/analysis` returns HTTP 200 with parsed persisted analysis.
- `queue_overflow` returns `status=COMPLETED`, `runtimeHealth=WARNING`, and `errorMessage=null`.
- The PostgreSQL `@Lob` issue was fixed by storing `rawReport` as normal `TEXT`.

Verified Phase 28 behavior:

- React dashboard builds.
- Frontend can call backend APIs from `http://localhost:5173`.
- CORS allows local browser API requests.
- `VITE_API_BASE_URL` uses `http://localhost:8081`.
- Docker Compose can start the frontend service.
- Dashboard can display scenarios, create runs, show persisted history, and load analysis.

Verified Phase 29 behavior:

- Dashboard still loads successfully.
- Scenario dropdown still loads.
- Guided Learning panel changes when selecting a different scenario.
- `queue_overflow` can still be run successfully.
- Latest run still shows `COMPLETED` and `WARNING` where expected.
- Persisted history still updates.
- Completed run analysis still loads.
- Queue pressure visualizer displays parsed message summary data.
- Task runtime timeline displays parsed task metric data.
- Fault/health explanation panel displays student-friendly runtime health and root-cause explanations.
- Raw analyzer report still expands correctly.
- User confirmed everything works and committed/pushed the phase.

Verified Phase 30 behavior:

- Backend Docker build works after installing `build-essential`, `cmake`, and `ninja-build` in the backend C++ runtime build stage.
- Backend Docker image runs on `http://localhost:8081`.
- Backend actuator health works at `GET /actuator/health`.
- Dev frontend works on `http://localhost:5173`.
- Production frontend works on `http://localhost:3000`.
- Production frontend health works at `GET /health`.
- Backend CORS allows both `localhost:5173` and `localhost:3000`.
- Production dashboard initially failed to fetch until `localhost:3000` was added to CORS.
- User confirmed production frontend now connects to backend correctly.

Verified Phase 31 behavior:

- Vitest + React Testing Library + jsdom added to the frontend.
- 16 component tests pass across DashboardHeader, ScenarioSelector, RunHistory, and AnalysisPanel.
- `npm run test`, `npm run test:coverage` work.
- Frontend CI job runs `npm run typecheck`, `npm run build`, and `npm run test`.

Verified Phase 32 behavior:

- `frontend/src/analytics/amplitude.ts` added with `initAmplitude()` and four `track*` helpers.
- `isAnalyticsEnabled` flag prevents any SDK call when `VITE_AMPLITUDE_API_KEY` is absent.
- Session replay package removed; bundle dropped from 527 kB + rrweb chunks to 423 kB single chunk.
- Pre-existing `@typescript-eslint/triple-slash-reference` lint error in `vite.config.ts` fixed.
- `npm run typecheck`, `npm run lint`, `npm run test` (16/16), and `npm run build` all pass.

Verified Phase 33 repo state:

- `k8s/` contains committed manifests for namespace, secret, config, PostgreSQL, backend, frontend, and `kind`.
- Backend CORS now includes `http://localhost:30080` and `http://127.0.0.1:30080`.
- Backend actuator probe paths are present in `application.yml` for readiness and liveness probes.
- Frontend Kubernetes deployment depends on a production image built with `VITE_API_BASE_URL=http://localhost:30081` or another browser-reachable backend URL.

---

## 1. Core C++/Python Test Workflow

From repo root:

```bash
./scripts/run_tests.sh
```

This runs:

1. CMake configure.
2. C++ build.
3. CTest.
4. pytest dependency check.
5. Python tests.

---

## 2. Backend and Database Test Workflow

From repo root:

```bash
./scripts/build_cpp.sh
docker compose up -d postgres
cd backend
mvn clean test
```

Expected:

```text
BUILD SUCCESS
```

Run backend:

```bash
mvn spring-boot:run
```

Test health and scenarios:

```bash
curl http://localhost:8081/api/health
curl http://localhost:8081/actuator/health
curl http://localhost:8081/api/scenarios
```

Run a scenario:

```bash
curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"queue_overflow"}'
```

Expected:

```text
status=COMPLETED
runtimeHealth=WARNING
errorMessage=null
```

List persisted runs:

```bash
curl -i http://localhost:8081/api/runs
```

Expected:

```text
HTTP/1.1 200
```

Inspect one persisted run:

```bash
curl -i http://localhost:8081/api/runs/<runId>
```

Expected:

```text
HTTP/1.1 200
```

Inspect persisted analysis:

```bash
curl -i http://localhost:8081/api/runs/<runId>/analysis
```

Expected:

```text
HTTP/1.1 200
```

Restart persistence test:

```bash
# stop backend with CTRL+C
mvn spring-boot:run
curl http://localhost:8081/api/runs
```

Expected:

```text
the previous run still appears
```

---

## 3. Frontend Test Workflow

From repo root:

```bash
cd frontend
npm install
npm run typecheck
npm run build
npm run dev
```

Expected:

```text
TypeScript typecheck passes.
Vite production build succeeds.
Development server runs on http://localhost:5173.
```

Manual frontend checks:

```text
Open http://localhost:5173
Scenario dropdown loads scenarios from backend.
Guided Learning panel appears.
Guided Learning panel changes when selecting a different scenario.
Run selected scenario button works.
Latest run card updates.
Persisted history appears.
Selecting a completed run loads analyzer summary.
Queue pressure visualizer appears when messageSummary exists.
Task runtime timeline appears when taskMetrics exists.
Fault/health explanation panel appears when analysis exists.
Message summary, task metrics, root causes, and raw report display correctly.
```

Troubleshooting API failures:

```bash
cat frontend/.env
# expected:
VITE_API_BASE_URL=http://localhost:8081

curl -i http://localhost:8081/api/scenarios
# expected:
HTTP/1.1 200
```

Do not use:

```text
https://localhost:8081
```

Local Spring Boot is running plain HTTP. If backend logs show invalid HTTP method bytes such as `0x16 0x03 0x01`, the browser/frontend is trying HTTPS against the HTTP port.

---

## 4. Phase 29 Manual Verification

Start PostgreSQL and backend:

```bash
docker compose up -d postgres
cd backend
mvn spring-boot:run
```

Start frontend:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

Recommended test scenario:

```text
queue_overflow
```

Expected:

```text
Scenario list loads.
Guided Learning panel explains queue pressure.
Run selected scenario is enabled after scenarios load.
Clicking queue_overflow creates a run.
Latest run card shows COMPLETED and WARNING.
History count increases.
Clicking the completed run loads analyzer summary.
Message summary shows queueFullDrops > 0 and faultInjectedDrops = 0.
Queue pressure visualizer shows dropped messages.
Task runtime timeline shows task bars.
Fault/health panel explains WARNING and queue pressure.
Raw analyzer report remains expandable.
```

---

## 5. Phase 30 Docker Verification

Validate Compose:

```bash
docker compose config
```

Create generated folders:

```bash
mkdir -p logs runs reports/generated models
```

Run backend with PostgreSQL:

```bash
docker compose down --remove-orphans
docker compose up -d postgres
docker compose build --no-cache backend
docker compose up -d backend
```

Test backend:

```bash
curl -i http://localhost:8081/actuator/health
curl -i http://localhost:8081/api/health
curl -i http://localhost:8081/api/scenarios
curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"queue_overflow"}'
curl -i http://localhost:8081/api/runs
```

Run dev frontend:

```bash
docker compose up --build frontend
```

Open:

```text
http://localhost:5173
```

Run production frontend:

```bash
docker compose --profile prod build --no-cache frontend-prod
docker compose --profile prod up -d frontend-prod
```

Open:

```text
http://localhost:3000
```

Production frontend healthcheck:

```bash
curl -i http://localhost:3000/health
```

Expected:

```text
HTTP/1.1 200 OK
ok
```

Confirm production CORS:

```bash
curl -i -X OPTIONS http://localhost:8081/api/scenarios \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

Expected:

```text
Access-Control-Allow-Origin: http://localhost:3000
```

Confirm frontend bundle uses the correct backend URL:

```bash
docker exec -it minirtos-playground-frontend-prod sh -c \
  "grep -R 'localhost:8081' -n /usr/share/nginx/html/assets || true"
```

---

## 6. Docker Failure Troubleshooting

### Backend Docker build fails with `cmake: not found`

Cause:

```text
The backend Dockerfile runs cmake in the C++ runtime build stage, but cmake/ninja are not installed in that stage.
```

Fix:

```text
Install build-essential, cmake, and ninja-build in docker/Dockerfile.backend.
```

Then run:

```bash
docker compose build --no-cache backend
docker compose up -d backend
```

### Nginx frontend appears stuck in logs

This is normal. Nginx stays attached and waits for requests.

Expected logs include:

```text
Configuration complete; ready for start up
start worker process
```

Open:

```text
http://localhost:3000
```

### Production frontend cannot load site

Check Docker port mapping:

```bash
docker ps
```

Expected:

```text
0.0.0.0:3000->80/tcp
```

Incorrect for Nginx:

```text
0.0.0.0:5173->5173/tcp
```

Nginx listens on container port `80`, not `5173`.

### Production dashboard says Failed to Fetch

Check backend health:

```bash
curl -i http://localhost:8081/actuator/health
curl -i http://localhost:8081/api/scenarios
```

Check production CORS:

```bash
curl -i -X OPTIONS http://localhost:8081/api/scenarios \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

Expected:

```text
Access-Control-Allow-Origin: http://localhost:3000
```

---

## 7. C++ Test Coverage

C++ tests live in:

```text
cpp-runtime/tests/
```

Current coverage:

- Message bus queue registration.
- FIFO send/receive.
- Full queue rejection.
- Unknown target rejection.
- Fault injector activation timing.
- Fault target matching.
- Scheduler ordering for round-robin, priority, and EDF.
- Invalid scheduler mode handling.
- Task-crash scheduler handling.
- Watchdog threshold and recovery cooldown.

---

## 8. Python Test Coverage

Python tests live in:

```text
ai-analyzer/tests/
```

Current coverage:

- Analyzer JSONL loading.
- Missing/invalid log handling.
- Health classification.
- Message drop reason counting.
- CPU-spike root cause reporting.
- Task-crash root cause reporting.
- Anomaly window splitting.
- Feature extraction.
- Dataset label inference.
- CSV dataset generation.
- ML training artifact generation.
- ML prediction and confidence range.

---

## 9. Backend Test Coverage

Backend tests live in:

```text
backend/src/test/java/com/minirtos/playground/
```

Current tests should cover:

```text
HealthControllerTest.java
ScenarioControllerTest.java
RunRepositoryTest.java
```

They verify:

- `/api/health` returns 200.
- `/api/health` returns `status=OK`.
- `/api/health` returns correct service name.
- `/api/scenarios` returns 200.
- `/api/scenarios` includes the expected scenario IDs.
- `/api/scenarios` exposes at least 9 scenarios.
- `RunRepository` can save and find runs by run ID.
- `RunRepository` can return newest runs first.

Recommended next backend tests:

- CORS config allows `http://localhost:5173`.
- CORS config allows `http://localhost:3000`.
- `POST /api/runs` accepts valid scenario IDs.
- Unknown scenario IDs are rejected.
- Arbitrary config paths are not accepted.
- Runtime subprocess timeout behavior.
- Analyzer subprocess error handling.
- Unique run log path creation.
- `AnalyzerReportParser` parses analyzer reports.
- `ProcessRunner` drains output without hanging.
- `RunService` persists completed analysis summaries.

---

## 10. Frontend Test Coverage

Phase 31 added automated frontend tests. Current passing coverage:

```text
DashboardHeader renders title and phase context.
ScenarioSelector renders scenario options from backend.
ScenarioSelector run button calls createRun with selected scenario ID.
RunHistory renders persisted run list.
AnalysisPanel renders message summary and task metrics.
```

Frontend test commands:

```bash
cd frontend
npm run test              # vitest run (single pass, 16 tests)
npm run test:watch        # vitest watch mode
npm run test:coverage     # vitest with v8 coverage report
```

Recommended additional coverage:

```text
LearningModulePanel changes with selected scenario.
QueuePressureChart renders received/dropped bars.
TaskTimeline renders task duration rows.
FaultExplanationPanel renders runtime health and root-cause explanations.
Failed API calls show error banner.
Empty state displays when there are no runs or no analysis.
Analytics: initAmplitude no-ops when key is absent.
Analytics: track* functions no-op when isAnalyticsEnabled is false.
```

---

## 11. Phase 32 Analytics Testing

Phase 32 analytics behavior verified manually and through existing test suite:

```text
Verified: npm run typecheck — 0 errors.
Verified: npm run lint      — 0 errors (including vite.config.ts fix).
Verified: npm run test      — 16/16 tests pass (analytics is a no-op in tests; no key present).
Verified: npm run build     — single 423 kB chunk, no size warnings.
```

Analytics tests to add in a future phase:

```text
initAmplitude() does not call amplitude.init() when API key is absent.
initAmplitude() calls amplitude.init() with the correct key when present.
trackDashboardLoaded() is a no-op when isAnalyticsEnabled is false.
trackScenarioRunTriggered() fires with correct scenarioId and scenarioName.
trackScenarioRunCompleted() includes status, runtimeHealth, and durationMs.
trackRunHistorySelected() fires on run history click.
```

---

## 12. Dataset and ML Verification

```bash
docker compose up --build demo
docker compose run --rm training-dataset
docker compose run --rm ml-train
docker compose run --rm ml-predict
```

Local ML commands:

```bash
python3 ai-analyzer/ml/train_model.py \
  --dataset reports/generated/synthetic_dataset.csv \
  --model-output models/anomaly_classifier.joblib \
  --label-encoder-output models/label_encoder.joblib \
  --metrics-output reports/generated/model_metrics.json

python3 ai-analyzer/ml/predict_model.py \
  --model models/anomaly_classifier.joblib \
  --label-encoder models/label_encoder.joblib \
  --dataset reports/generated/synthetic_dataset.csv \
  --limit 20
```

---

## 13. What Passing Tests Prove

Passing tests prove:

- Runtime components compile and work.
- Scheduler modes preserve expected ordering.
- Message bus respects bounded queues.
- Fault injection works under configured conditions.
- Watchdog threshold/cooldown behavior works.
- Analyzer parsing and health classification work.
- Dataset generation works.
- ML training/prediction workflows work.
- Spring Boot health and scenario APIs work.
- Backend orchestration can run the simulator and analyzer successfully.
- PostgreSQL can store and return run metadata and parsed analysis summaries.
- Frontend TypeScript compiles.
- Frontend production build succeeds.
- Frontend can consume backend APIs when backend, CORS, and `VITE_API_BASE_URL` are configured correctly.
- Phase 29 educational and visualizer components render using existing API data.
- Phase 30 dev and production Docker frontend workflows both work.
- Phase 31 frontend component tests pass (Vitest + React Testing Library, 16 tests).
- Phase 32 Amplitude analytics are a complete no-op in tests and dev without an API key.

---

## 14. What Tests Do Not Prove Yet

Current tests do not fully prove:

- Hard real-time behavior.
- Real hardware timing correctness.
- Real process/thread crash recovery.
- Production ML accuracy.
- Full frontend automated test coverage.
- End-to-end local Kubernetes deployment from these manifests has not been re-run in this documentation pass.
- Full async job execution under concurrent users.
- Production-grade database migrations beyond the initial schema.
- Cloud deployment readiness.

---

## 15. Recommended CI Updates

Future GitHub Actions improvements:

- Add backend Maven test job.
- Add backend Docker build smoke test.
- Add frontend production Docker build smoke test.
- Add Docker Compose config validation.
- Add PostgreSQL service container for backend integration tests.
- Add dataset-generation smoke test.
- Add ML-training smoke test.
- Add backend orchestration smoke test with a short-duration test config.
- Add frontend Node setup, `npm ci`, `npm run typecheck`, and `npm run build`.
- Add frontend tests once Vitest/React Testing Library are introduced.
- Add analytics unit tests: verify no-op behavior without key, and correct event payloads with key.
