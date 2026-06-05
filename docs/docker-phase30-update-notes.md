# Phase 30 Full-Stack Docker Compose Hardening Update Notes

**Updated:** June 5, 2026  
**Project:** MiniRTOS Playground  
**Phase:** Phase 30 — Full-Stack Docker Compose Hardening

---

## Current Status

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed the Run Orchestration API. Phase 27 completed PostgreSQL/Flyway run persistence. Phase 28 added the React Dashboard MVP and frontend Docker integration. Phase 29 added educational modules and visualizers to the React dashboard. Phase 30 hardened the Docker Compose workflow for backend, dev frontend, and production frontend execution.

Phase 30 changed the Docker setup from a mostly development-focused frontend workflow into a clearer two-mode frontend architecture:

```text
Dev frontend:
  Vite dev server
  http://localhost:5173

Production frontend:
  Nginx static server
  http://localhost:3000
```

---

## 1. What Changed in Phase 30

Before Phase 30:

```text
Backend Docker build could fail if cmake/ninja were missing in the build stage.
Frontend Docker behavior could mix production Nginx with dev Vite port mappings.
Frontend was mainly verified on localhost:5173.
Backend CORS allowed the dev frontend origin.
Production frontend on localhost:3000 was not fully verified.
```

After Phase 30:

```text
Backend Docker image builds the C++ runtime successfully inside Docker.
Backend Docker build stage installs build-essential, cmake, and ninja-build.
Backend runtime image includes curl for healthchecks.
Dev frontend remains available through Vite on localhost:5173.
Production frontend is served by Nginx on localhost:3000.
Production frontend has a /health endpoint.
Backend CORS allows localhost:5173 and localhost:3000.
Dashboard Failed to Fetch in production was fixed by adding localhost:3000 to CORS.
```

---

## 2. Updated / Relevant Files

```text
docker-compose.yml
docker/Dockerfile.backend
docker/Dockerfile.frontend
docker/nginx.frontend.conf
backend/src/main/java/com/minirtos/playground/config/CorsConfig.java
```

Optional CI follow-up:

```text
.github/workflows/ci.yml
```

---

## 3. Backend Docker Fix

### Problem

Backend image build failed with:

```text
cmake: not found
```

Cause:

```text
The backend Dockerfile had a runtime-build stage that ran cmake and ninja, but that stage did not install the required C++ build tools.
```

### Fix

Install these packages in the backend Docker build stage:

```text
build-essential
cmake
ninja-build
```

Also include `curl` in the runtime image so Docker healthchecks can call:

```text
http://localhost:8081/actuator/health
```

---

## 4. Frontend Docker Fix

### Problem

Production frontend uses Nginx, which listens on container port `80`.

If Compose maps:

```text
5173:5173
```

while the container is running Nginx, the site will not load correctly because nothing is listening on container port `5173`.

### Correct Mapping

Dev frontend:

```text
host 5173 -> container 5173
```

Production frontend:

```text
host 3000 -> container 80
```

---

## 5. Nginx Production Frontend

Production frontend should use:

```text
docker/nginx.frontend.conf
```

Expected Nginx features:

```text
Serve built Vite/React assets.
Support SPA fallback routing.
Expose /health.
Cache static assets.
```

Expected production URL:

```text
http://localhost:3000
```

Expected healthcheck:

```bash
curl -i http://localhost:3000/health
```

Expected response:

```text
HTTP/1.1 200 OK
ok
```

---

## 6. Backend CORS Fix for Production Frontend

### Problem

The production dashboard at:

```text
http://localhost:3000
```

showed:

```text
Dashboard Failed to Fetch
```

Backend logs showed the backend was healthy and running on:

```text
http://localhost:8081
```

Cause:

```text
The backend CORS config allowed localhost:5173 but did not allow localhost:3000.
```

### Fix

Allow these origins:

```text
http://localhost:5173
http://127.0.0.1:5173
http://localhost:3000
http://127.0.0.1:3000
```

Confirm production CORS:

```bash
curl -i -X OPTIONS http://localhost:8081/api/scenarios \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

Expected header:

```text
Access-Control-Allow-Origin: http://localhost:3000
```

---

## 7. Correct Docker Commands

### Reset Containers

```bash
docker compose down --remove-orphans
mkdir -p logs runs reports/generated models
```

### Start Backend Stack

```bash
docker compose up -d postgres
docker compose build --no-cache backend
docker compose up -d backend
```

### Check Backend

```bash
curl -i http://localhost:8081/actuator/health
curl -i http://localhost:8081/api/health
curl -i http://localhost:8081/api/scenarios
```

### Run Dev Frontend

```bash
docker compose up --build frontend
```

Open:

```text
http://localhost:5173
```

If using a separate dev service/profile:

```bash
docker compose --profile dev up --build frontend-dev
```

Open:

```text
http://localhost:5173
```

### Run Production Frontend

```bash
docker compose --profile prod build --no-cache frontend-prod
docker compose --profile prod up -d frontend-prod
```

Open:

```text
http://localhost:3000
```

### Check Production Frontend

```bash
curl -i http://localhost:3000/health
```

### Run Scenario Through Backend

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

## 8. Manual End-to-End Verification

Production flow:

```text
1. Start postgres.
2. Start backend.
3. Confirm /actuator/health returns 200.
4. Start frontend-prod.
5. Confirm /health returns 200 on localhost:3000.
6. Open http://localhost:3000.
7. Confirm scenario list loads.
8. Run queue_overflow.
9. Confirm latest run shows COMPLETED.
10. Confirm runtimeHealth is WARNING.
11. Open completed run analysis.
12. Confirm queue pressure visualizer, task timeline, fault/health panel, and raw report still work.
```

Dev flow:

```text
1. Start postgres.
2. Start backend.
3. Start Vite frontend on localhost:5173.
4. Confirm scenario list loads.
5. Run queue_overflow.
6. Confirm analysis loads.
```

---

## 9. Troubleshooting

### Nginx logs look stuck

This is normal. Nginx is a long-running process.

Logs such as:

```text
Configuration complete; ready for start up
start worker process
```

mean the frontend is running.

Open:

```text
http://localhost:3000
```

### Production frontend cannot connect to backend

Check:

```bash
curl -i http://localhost:8081/api/scenarios
curl -i http://localhost:3000/health
```

Then check CORS:

```bash
curl -i -X OPTIONS http://localhost:8081/api/scenarios \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

### Production bundle has wrong backend URL

Because Vite bakes in `VITE_API_BASE_URL` at build time, rebuild the production frontend image:

```bash
docker compose --profile prod build --no-cache frontend-prod
docker compose --profile prod up -d frontend-prod
```

Optional check:

```bash
docker exec -it minirtos-playground-frontend-prod sh -c \
  "grep -R 'localhost:8081' -n /usr/share/nginx/html/assets || true"
```

---

## 10. Phase 30 Completion Criteria

Phase 30 is complete when:

```text
docker compose config passes.
Backend Docker image builds.
Backend runs on localhost:8081.
Backend healthcheck works.
Dev frontend works on localhost:5173.
Production frontend works on localhost:3000.
Production frontend /health works.
Backend CORS accepts localhost:3000.
Dashboard loads scenarios in production.
Dashboard can run queue_overflow in production.
Analysis loads in production.
Existing runtime/analyzer/ML services are not broken.
```

User verification:

```text
Dev frontend worked.
Production frontend initially failed to fetch.
Backend logs confirmed backend startup was healthy.
CORS was updated for localhost:3000.
Production frontend then worked.
Phase 30 was considered functionally complete.
```

---

## 11. Next Docker Work

Recommended future improvements:

```text
Add CI Docker build smoke tests for backend and frontend-prod.
Add CI Compose config validation.
Add backend integration smoke test with PostgreSQL service container.
Add production image publishing to GHCR.
Prepare Kubernetes manifests using the hardened Docker images.
```
