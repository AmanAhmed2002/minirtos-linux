# Phase 27 Docker, PostgreSQL, and Backend Persistence Update Notes

## Current Status

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed the Run Orchestration API. Phase 27 completed PostgreSQL/Flyway run persistence.

Phase 27 changed backend run storage from process-local memory to PostgreSQL persistence.

---

## 1. What Changed

Before Phase 27:

```text
POST /api/runs executed the runtime/analyzer.
GET /api/runs read from an in-memory map.
Run history disappeared after backend restart.
```

After Phase 27:

```text
POST /api/runs executes the runtime/analyzer and persists the run.
GET /api/runs reads from PostgreSQL.
GET /api/runs/{runId} reads from PostgreSQL.
GET /api/runs/{runId}/analysis reads persisted parsed analysis.
Run history survives backend restart.
```

---

## 2. New Backend Dependencies

Phase 27 added:

```text
spring-boot-starter-data-jpa
postgresql
flyway-core
flyway-database-postgresql
h2 for tests
```

---

## 3. New Backend Files

```text
backend/src/main/java/com/minirtos/playground/persistence/RunEntity.java
backend/src/main/java/com/minirtos/playground/persistence/RunRepository.java
backend/src/main/java/com/minirtos/playground/persistence/TaskMetricEntity.java
backend/src/main/resources/db/migration/V1__create_run_storage.sql
backend/src/test/resources/application-test.yml
backend/src/test/java/com/minirtos/playground/persistence/RunRepositoryTest.java
```

Updated:

```text
backend/pom.xml
backend/src/main/resources/application.yml
backend/src/main/java/com/minirtos/playground/service/RunService.java
docker-compose.yml
```

---

## 4. Database Schema

Flyway migration creates:

```text
runs
run_event_counts
run_severity_counts
run_task_metrics
run_root_causes
```

The `runs` table stores:

```text
run_id
scenario_id
scenario_name
status
runtime_health
log_path
analysis_path
created_at
completed_at
error_message
events_loaded
simulation_name
scheduler_mode
configured_duration_seconds
observed_duration_ms
message counters
raw_report
```

---

## 5. Important PostgreSQL/Hibernate Fix

Initial issue:

```text
GET /api/runs returned HTTP 500.
Root cause: Large Objects may not be used in auto-commit mode.
```

Cause:

```text
rawReport was annotated with @Lob.
PostgreSQL/Hibernate treated it like a Large Object/CLOB.
```

Fix:

```java
@Column(name = "raw_report", columnDefinition = "text")
private String rawReport;
```

Also added read-only transactions to read methods:

```java
@Transactional(readOnly = true)
public List<RunSummaryResponse> getRuns()

@Transactional(readOnly = true)
public RunSummaryResponse getRun(String runId)

@Transactional(readOnly = true)
public AnalysisResponse getAnalysis(String runId)
```

---

## 6. Docker Compose PostgreSQL Service

Phase 27 added a PostgreSQL service:

```yaml
postgres:
  image: postgres:16
  container_name: minirtos-postgres
  environment:
    POSTGRES_DB: minirtos_playground
    POSTGRES_USER: minirtos
    POSTGRES_PASSWORD: minirtos
  ports:
    - "5432:5432"
  volumes:
    - minirtos-postgres-data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U minirtos -d minirtos_playground"]
    interval: 5s
    timeout: 5s
    retries: 10
```

Backend service should depend on healthy Postgres:

```yaml
backend:
  depends_on:
    postgres:
      condition: service_healthy
```

Backend service should use DB environment variables:

```yaml
SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/minirtos_playground
SPRING_DATASOURCE_USERNAME: minirtos
SPRING_DATASOURCE_PASSWORD: minirtos
```

Volume:

```yaml
volumes:
  minirtos-postgres-data:
```

---

## 7. Verification

Start Postgres:

```bash
docker compose up -d postgres
```

Run backend tests:

```bash
cd backend
mvn clean test
```

Run backend:

```bash
mvn spring-boot:run
```

Create a run:

```bash
curl -X POST http://localhost:8081/api/runs   -H "Content-Type: application/json"   -d '{"scenarioId":"queue_overflow"}'
```

Expected:

```text
status=COMPLETED
runtimeHealth=WARNING
errorMessage=null
```

List runs:

```bash
curl -i http://localhost:8081/api/runs
```

Expected:

```text
HTTP/1.1 200
```

Inspect persisted run:

```bash
curl -i http://localhost:8081/api/runs/<runId>
```

Inspect persisted analysis:

```bash
curl -i http://localhost:8081/api/runs/<runId>/analysis
```

Expected analysis values for queue overflow include:

```text
runtimeHealth=WARNING
messageDropped > 0
queueFullDrops > 0
faultInjectedDrops=0
```

Restart backend and list runs again:

```bash
curl http://localhost:8081/api/runs
```

Expected:

```text
previous run still appears
```

---

## 8. Recommended `.gitignore`

```gitignore
# Runtime logs
logs/*
!logs/.gitkeep
*.jsonl

# Backend-generated run folders
runs/*
!runs/.gitkeep

# Generated reports
reports/generated/

# Generated ML artifacts
models/*
!models/.gitkeep
*.joblib
*.pkl

# Java / Maven
backend/target/
*.class

# Docker/local overrides
docker-compose.override.yml
.env
.env.*
```

---

## 9. Next Docker Work

Phase 28 should add the React frontend service once the dashboard exists.

Future Docker Compose services may include:

```text
frontend
backend
postgres
runtime/analyzer jobs or workers
```
