# MiniRTOS-Linux / MiniRTOS Playground Testing Guide

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

## 2. Backend Test Workflow

From repo root:

```bash
./scripts/build_cpp.sh
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

Test:

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

---

## 3. Docker Verification

Validate Compose:

```bash
docker compose config
```

Run backend:

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
```

Run full existing demo:

```bash
docker compose up --build demo
docker compose run --rm ml-train
docker compose run --rm ml-predict
```

---

## 4. C++ Test Coverage

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

## 5. Python Test Coverage

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

## 6. Backend Test Coverage

Backend tests live in:

```text
backend/src/test/java/com/minirtos/playground/
```

Current tests should cover:

```text
HealthControllerTest.java
ScenarioControllerTest.java
```

They verify:

- `/api/health` returns 200.
- `/api/health` returns `status=OK`.
- `/api/health` returns correct service name.
- `/api/scenarios` returns 200.
- `/api/scenarios` includes the expected scenario IDs.
- `/api/scenarios` exposes at least 9 scenarios.

Phase 26 added logic that should be tested next:

- `POST /api/runs` accepts valid scenario IDs.
- Unknown scenario IDs are rejected.
- Arbitrary config paths are not accepted.
- Runtime subprocess timeout behavior.
- Analyzer subprocess error handling.
- Unique run log path creation.
- `AnalyzerReportParser` parses analyzer reports.
- `ProcessRunner` drains output without hanging.

---

## 7. Manual Phase 26 Verification

Start backend:

```bash
cd backend
mvn spring-boot:run
```

Run queue overflow:

```bash
curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"queue_overflow"}'
```

Expected successful result:

```text
status=COMPLETED
runtimeHealth=WARNING
errorMessage=null
```

List runs:

```bash
curl http://localhost:8081/api/runs
```

Inspect one run:

```bash
curl http://localhost:8081/api/runs/<runId>
curl http://localhost:8081/api/runs/<runId>/analysis
```

Inspect generated files:

```bash
ls -R runs/<runId>
```

Expected:

```text
runtime_logs.jsonl
analysis.txt
```

Safety check:

```bash
curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"../../bad/path"}'
```

Expected:

```text
Rejected as an unknown scenario ID.
```

---

## 8. Dataset and ML Verification

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

## 9. What Passing Tests Prove

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
- Phase 26 local backend orchestration can run the simulator and analyzer successfully.

---

## 10. What Tests Do Not Prove Yet

Current tests do not fully prove:

- Hard real-time behavior.
- Real hardware timing correctness.
- Real process/thread crash recovery.
- Production ML accuracy.
- PostgreSQL persistence.
- React frontend behavior.
- Kubernetes deployment.
- Full async job execution under concurrent users.

---

## 11. Recommended CI Updates

Future GitHub Actions improvements:

- Add backend Maven test job.
- Add backend Docker build smoke test.
- Add Docker Compose config validation.
- Add dataset-generation smoke test.
- Add ML-training smoke test.
- Add backend orchestration smoke test with a short-duration test config.
- Add frontend test job once React exists.
