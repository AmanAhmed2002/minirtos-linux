# MiniRTOS Playground Backend

Java Spring Boot backend for the MiniRTOS Playground educational platform.

**Updated:** June 11, 2026
**Current Phase:** Phase 36 — AWS EKS Deployment with Terraform and ALB Routing

---

## Current Status

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed the Run Orchestration API. Phase 27 completed PostgreSQL/Flyway run persistence. Phase 28 added the React Dashboard MVP and required local CORS support for browser API calls. Phase 29 added frontend educational modules and visualizers without requiring backend API changes. Phase 30 hardened the Docker backend/frontend workflow. Phase 31 added frontend automated tests. Phase 32 added frontend Amplitude tracking without backend API changes. Phase 33 added local Kubernetes manifests and a Kubernetes frontend origin for browser access. Phase 36 added EKS deployment support with AWS Load Balancer Controller IAM wiring and same-origin ALB routing.

The backend can now:

- Return health metadata.
- Return actuator health metadata for Docker healthchecks.
- Return trusted scenario metadata.
- Run trusted C++ runtime scenarios through HTTP.
- Run the Python analyzer after each simulation.
- Save `runtime_logs.jsonl` and `analysis.txt` under `runs/<runId>/`.
- Parse analyzer text into structured JSON.
- Persist run metadata and parsed analysis summaries in PostgreSQL.
- Return run history after backend restarts.
- Serve APIs consumed by the React dev frontend running at `http://localhost:5173`.
- Serve APIs consumed by the production Nginx frontend running at `http://localhost:3000`.
- Serve APIs consumed by the local Kubernetes frontend NodePort running at `http://localhost:30080`.
- Serve APIs through the EKS ALB `/api` path when frontend and backend share one ALB origin.
- Provide the persisted analysis data used by Phase 29 learning and visualizer components.
- Expose actuator liveness and readiness probe paths for Kubernetes.

Verified behavior:

- `GET /api/health` works.
- `GET /actuator/health` works.
- `GET /api/scenarios` works.
- `POST /api/runs` successfully runs `queue_overflow`.
- `GET /api/runs` returns HTTP 200 with persisted runs.
- `GET /api/runs/{runId}` returns HTTP 200 with one persisted run.
- `GET /api/runs/{runId}/analysis` returns HTTP 200 with parsed persisted analysis.
- A successful `queue_overflow` run returned `status=COMPLETED`, `runtimeHealth=WARNING`, and `errorMessage=null`.
- `WARNING` is expected for `queue_overflow` because the scenario intentionally creates bounded queue pressure and dropped messages.
- Phase 29 frontend visualizers work using existing `messageSummary`, `taskMetrics`, `runtimeHealth`, `scenarioId`, and `rootCauses` fields.
- Phase 30 production frontend works on `http://localhost:3000` after CORS was updated.
- Backend CORS includes `http://localhost:30080` for the local Kubernetes frontend NodePort. EKS ALB routing uses one browser origin and does not require a worker-node frontend CORS entry.

Important implementation notes:

- Backend uses Java 17.
- Backend runs on port `8081` because Nginx uses `8080` locally.
- PostgreSQL persistence uses Spring Data JPA and Flyway migrations.
- `rawReport` should be stored as PostgreSQL `TEXT` without `@Lob`.
- The backend accepts only known scenario IDs and never accepts arbitrary user-provided config paths.
- Local React frontend calls require CORS for both dev and production origins.
- Backend Docker image must install C++ build tools in the build stage so it can compile `cpp-runtime/build/minirtos_runtime`.
- Backend Docker runtime image should include `curl` for healthchecks.

---

## Requirements

```text
Java 17
Maven 3.9+
Docker / Docker Compose
PostgreSQL 16 through Docker Compose
C++ runtime binary built at ../cpp-runtime/build/minirtos_runtime for local orchestration
Python 3 available as python3
React dev frontend on localhost:5173
React production frontend on localhost:3000
Kubernetes frontend NodePort on localhost:30080
```

---

## Port

```text
8081
```

Local backend URL:

```text
http://localhost:8081
```

Important:

```text
The local backend uses HTTP, not HTTPS.
```

If logs show invalid HTTP method bytes such as `0x16 0x03 0x01`, something is trying to call `https://localhost:8081` instead of `http://localhost:8081`.

---

## Key Configuration

Config file:

```text
backend/src/main/resources/application.yml
```

Expected database config:

```yaml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/minirtos_playground}
    username: ${SPRING_DATASOURCE_USERNAME:minirtos}
    password: ${SPRING_DATASOURCE_PASSWORD:minirtos}
    driver-class-name: org.postgresql.Driver

  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false

  flyway:
    enabled: true
    locations: classpath:db/migration
```

Expected MiniRTOS config:

```yaml
minirtos:
  project-root: ${MINIRTOS_PROJECT_ROOT:..}
  runtime-binary: ${MINIRTOS_RUNTIME_BINARY:cpp-runtime/build/minirtos_runtime}
  python-command: ${MINIRTOS_PYTHON_COMMAND:python3}
  analyzer-script: ${MINIRTOS_ANALYZER_SCRIPT:ai-analyzer/app/analyze.py}
  logs-dir: ${MINIRTOS_LOGS_DIR:logs}
  runs-dir: ${MINIRTOS_RUNS_DIR:runs}
  window-ms: ${MINIRTOS_WINDOW_MS:5000}
  process-timeout-seconds: ${MINIRTOS_PROCESS_TIMEOUT_SECONDS:120}
```

---

## CORS Configuration

Expected file:

```text
backend/src/main/java/com/minirtos/playground/config/CorsConfig.java
```

Expected allowed origins for local split-origin workflows:

```text
http://localhost:5173
http://127.0.0.1:5173
http://localhost:3000
http://127.0.0.1:3000
http://localhost:30080
http://127.0.0.1:30080
```

This allows:

- Vite dev frontend at `http://localhost:5173`.
- Nginx production frontend at `http://localhost:3000`.
- Local Kubernetes frontend NodePort at `http://localhost:30080`.

EKS ALB routing should send frontend and backend requests through the same origin, with API calls using `/api` paths.

Confirm CORS for production frontend:

```bash
curl -i -X OPTIONS http://localhost:8081/api/scenarios \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

Expected header:

```text
Access-Control-Allow-Origin: http://localhost:3000
```

Confirm CORS for Kubernetes frontend:

```bash
curl -i -X OPTIONS http://localhost:30081/api/scenarios \
  -H "Origin: http://localhost:30080" \
  -H "Access-Control-Request-Method: GET"
```

Expected header:

```text
Access-Control-Allow-Origin: http://localhost:30080
```

---

## Run Locally Without Backend Docker

From repo root:

```bash
./scripts/build_cpp.sh
docker compose up -d postgres
```

Then:

```bash
cd backend
mvn clean test
mvn spring-boot:run
```

Test:

```bash
curl http://localhost:8081/api/health
curl http://localhost:8081/actuator/health
curl http://localhost:8081/api/scenarios
```

Run a scenario through the backend:

```bash
curl -X POST http://localhost:8081/api/runs \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"queue_overflow"}'
```

Expected successful `queue_overflow` result:

```text
status=COMPLETED
runtimeHealth=WARNING
errorMessage=null
```

List persisted runs:

```bash
curl http://localhost:8081/api/runs
```

Inspect one persisted run:

```bash
curl http://localhost:8081/api/runs/<runId>
curl http://localhost:8081/api/runs/<runId>/analysis
```

---

## Run Backend Through Docker

From repo root:

```bash
docker compose down --remove-orphans
mkdir -p logs runs reports/generated models
docker compose up -d postgres
docker compose build --no-cache backend
docker compose up -d backend
```

Check:

```bash
curl -i http://localhost:8081/actuator/health
curl -i http://localhost:8081/api/health
curl -i http://localhost:8081/api/scenarios
```

Logs:

```bash
docker compose logs -f backend
```

If backend Docker build fails with:

```text
cmake: not found
```

then `docker/Dockerfile.backend` is missing build tools in the `runtime-build` stage. Add:

```text
build-essential
cmake
ninja-build
```

The backend runtime image should also include:

```text
python3
python3-pip
curl
```

---

## Run Backend Through Local Kubernetes

The local overlay uses workstation-built images loaded into kind. The GHCR overlay pulls the published backend image:

```text
ghcr.io/amanahmed2002/minirtos-linux/backend:latest
```

Create the cluster:

```bash
kind create cluster --config k8s/kind/kind-config.yml
```

Apply backend-related manifests through Kustomize:

```bash
kubectl apply -k k8s/overlays/local
```

Check backend resources:

```bash
kubectl get pods -n minirtos
kubectl get svc -n minirtos
```

Test backend:

```bash
curl -i http://localhost:30081/actuator/health
curl -i http://localhost:30081/actuator/health/readiness
curl -i http://localhost:30081/actuator/health/liveness
curl -i http://localhost:30081/api/scenarios
```

Important:

```text
The local overlay uses local images with `imagePullPolicy: IfNotPresent`.
The backend NodePort is 30081.
The frontend NodePort is 30080.
For local kind, build the frontend image with `VITE_API_BASE_URL=http://localhost:30081`.
For EKS ALB, build the frontend image with `VITE_API_BASE_URL=`.
```

---

## Frontend Integration

Frontend dev URL:

```text
http://localhost:5173
```

Frontend production URL:

```text
http://localhost:3000
```

Frontend environment should contain:

```env
VITE_API_BASE_URL=http://localhost:8081
```

The frontend calls:

```text
GET  /api/scenarios
POST /api/runs
GET  /api/runs
GET  /api/runs/{runId}/analysis
```

Phase 29 frontend components use existing response fields:

```text
ScenarioResponse.id
ScenarioResponse.name
ScenarioResponse.description
AnalysisResponse.runtimeHealth
AnalysisResponse.scenarioId
AnalysisResponse.simulationName
AnalysisResponse.messageSummary
AnalysisResponse.taskMetrics
AnalysisResponse.rootCauses
AnalysisResponse.rawReport
```

No backend endpoint change was required for Phases 29-33.

---

## API

### `GET /api/health`

Returns backend health.

### `GET /actuator/health`

Returns actuator health for Docker healthchecks.

### `GET /api/scenarios`

Returns metadata for:

```text
normal
priority_scheduler
deadline_scheduler
queue_overflow
cpu_spike
task_crash
slow_task
dropped_messages
watchdog_slow_task
```

### `POST /api/runs`

Creates and executes a backend-orchestrated run.

Request:

```json
{
  "scenarioId": "queue_overflow"
}
```

Behavior:

```text
validate scenario ID
-> map to trusted config path
-> run C++ runtime
-> copy logs/runtime_logs.jsonl into runs/<runId>/runtime_logs.jsonl
-> run Python analyzer
-> save runs/<runId>/analysis.txt
-> persist metadata and parsed analysis summary in PostgreSQL
-> return run summary
```

### `GET /api/runs`

Returns persisted run summaries from PostgreSQL.

### `GET /api/runs/{runId}`

Returns one persisted run summary.

### `GET /api/runs/{runId}/analysis`

Returns parsed analyzer JSON plus the raw analyzer report from persisted data.

---

## Phase 27 Database Storage

Database tables:

```text
runs
run_event_counts
run_severity_counts
run_task_metrics
run_root_causes
```

Data persisted:

- Run ID.
- Scenario ID/name.
- Run status.
- Runtime health.
- Log path.
- Analysis path.
- Created/completed timestamps.
- Error message.
- Event counts.
- Severity counts.
- Task metrics.
- Message summary fields.
- Root causes.
- Raw analyzer report as PostgreSQL `TEXT`.

Important bug fix:

```text
Do not annotate rawReport with @Lob.
```

Correct mapping:

```java
@Column(name = "raw_report", columnDefinition = "text")
private String rawReport;
```

---

## Docker

Backend Compose:

```bash
docker compose up -d postgres
docker compose build --no-cache backend
docker compose up -d backend
```

Backend Docker image must include:

```text
Spring Boot JAR
C++ runtime binary
configs/
ai-analyzer/
python3
curl
logs/
runs/
```

Backend Compose environment must include database variables:

```text
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/minirtos_playground
SPRING_DATASOURCE_USERNAME=minirtos
SPRING_DATASOURCE_PASSWORD=minirtos
```

Full production frontend stack:

```bash
docker compose --profile prod build --no-cache frontend-prod
docker compose --profile prod up -d frontend-prod
```

Full dev frontend stack:

```bash
docker compose up --build frontend
```

---

## Troubleshooting

### Backend container builds fail with `cmake: not found`

Fix `docker/Dockerfile.backend` and install build tools in the C++ runtime build stage:

```text
build-essential
cmake
ninja-build
```

Then run:

```bash
docker compose build --no-cache backend
docker compose up -d backend
```

### Production dashboard says `Dashboard failed to fetch`

Check CORS and backend reachability:

```bash
curl -i http://localhost:8081/actuator/health
curl -i http://localhost:8081/api/scenarios

curl -i -X OPTIONS http://localhost:8081/api/scenarios \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

Expected:

```text
Access-Control-Allow-Origin: http://localhost:3000
```

### Backend logs invalid HTTP method bytes

If logs show bytes like:

```text
0x16 0x03 0x01
```

something is trying to call HTTPS on the HTTP backend. Use:

```text
http://localhost:8081
```

---

## Safety Rule

Only accept known scenario IDs.

Do not accept arbitrary config paths, runtime paths, analyzer paths, or shell commands from API clients.

---

## Next Phase

```text
Phase 34 — TBD
```
