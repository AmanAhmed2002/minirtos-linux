# MiniRTOS-Linux / MiniRTOS Playground Testing Guide

## Current Status

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed the Run Orchestration API. Phase 27 completed PostgreSQL/Flyway run persistence. Phase 28 added the React/TypeScript dashboard MVP and frontend Docker integration. Phase 29 added educational modules and CSS-based frontend visualizers.

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
- Docker Compose can start the `frontend` service.
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

## 5. Docker Verification

Validate Compose:

```bash
docker compose config
```

Run backend with PostgreSQL:

```bash
docker compose up --build backend
```

Test:

```bash
curl http://localhost:8081/api/health
curl http://localhost:8081/api/scenarios
curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"queue_overflow"}'
curl http://localhost:8081/api/runs
```

Run frontend:

```bash
docker compose up --build frontend
```

Open:

```text
http://localhost:5173
```

Run full existing demo:

```bash
docker compose up --build demo
docker compose run --rm ml-train
docker compose run --rm ml-predict
```

---

## 6. C++ Test Coverage

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

## 7. Python Test Coverage

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

## 8. Backend Test Coverage

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

## 9. Frontend Test Coverage To Add

Current frontend verification is build/typecheck/manual API testing.

Recommended next frontend tests:

```text
ScenarioSelector renders scenario options.
Run button calls createRun with selected scenario ID.
RunHistory renders persisted runs.
AnalysisPanel renders message summary and task metrics.
LearningModulePanel changes with selected scenario.
QueuePressureChart renders received/dropped bars.
TaskTimeline renders task duration rows.
FaultExplanationPanel renders runtime health and root-cause explanations.
Failed API calls show error banner.
Empty state displays when there are no runs or no analysis.
```

Recommended tools:

```text
Vitest
React Testing Library
jsdom
```

Potential commands after adding tests:

```bash
npm run test
npm run test:coverage
```

---

## 10. Dataset and ML Verification

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

## 11. What Passing Tests Prove

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

---

## 12. What Tests Do Not Prove Yet

Current tests do not fully prove:

- Hard real-time behavior.
- Real hardware timing correctness.
- Real process/thread crash recovery.
- Production ML accuracy.
- Full frontend automated test coverage.
- Kubernetes deployment.
- Full async job execution under concurrent users.
- Production-grade database migrations beyond the initial schema.
- Production Docker frontend serving through Nginx.

---

## 13. Recommended CI Updates

Future GitHub Actions improvements:

- Add backend Maven test job.
- Add backend Docker build smoke test.
- Add Docker Compose config validation.
- Add PostgreSQL service container for backend integration tests.
- Add dataset-generation smoke test.
- Add ML-training smoke test.
- Add backend orchestration smoke test with a short-duration test config.
- Add frontend Node setup, `npm ci`, `npm run typecheck`, and `npm run build`.
- Add frontend tests once Vitest/React Testing Library are introduced.
- Add Docker frontend production image build smoke test after Phase 30.
