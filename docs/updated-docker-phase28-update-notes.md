# Phase 28 Docker, Frontend, Backend, and Dashboard Update Notes

## Current Status

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed the Run Orchestration API. Phase 27 completed PostgreSQL/Flyway run persistence. Phase 28 added the React Dashboard MVP and frontend Docker integration.

Phase 28 changed the platform from a backend/API-only full-stack foundation into an actual browser-accessible learning dashboard.

---

## 1. What Changed

Before Phase 28:

```text
POST /api/runs executed the runtime/analyzer.
GET /api/runs read persisted run history from PostgreSQL.
Users interacted through curl/API clients only.
```

After Phase 28:

```text
React dashboard can call GET /api/scenarios.
React dashboard can call POST /api/runs.
React dashboard can call GET /api/runs.
React dashboard can call GET /api/runs/{runId}/analysis.
Users can select scenarios and view analysis from a browser.
Docker Compose includes a frontend service.
```

---

## 2. New Frontend Stack

Phase 28 uses:

```text
Vite
React
TypeScript
Node 22+
npm
clsx
```

Important Node note:

```text
Node v18.17.0 caused create-vite to fail because newer Vite tooling uses node:util.styleText.
Use Node 22 with nvm install 22 && nvm use 22.
```

---

## 3. New Frontend Files

```text
frontend/package.json
frontend/.env
frontend/.env.example
frontend/README.md
frontend/src/types/api.ts
frontend/src/api/minirtosApi.ts
frontend/src/components/DashboardHeader.tsx
frontend/src/components/ScenarioSelector.tsx
frontend/src/components/RunResultCard.tsx
frontend/src/components/RunHistory.tsx
frontend/src/components/AnalysisPanel.tsx
frontend/src/App.tsx
frontend/src/App.css
frontend/src/index.css
frontend/src/main.tsx
```

Updated/added:

```text
backend/src/main/java/com/minirtos/playground/config/CorsConfig.java
docker/Dockerfile.frontend
docker-compose.yml
.gitignore
```

---

## 4. Frontend Environment

Local frontend environment file:

```text
frontend/.env
```

Expected content:

```env
VITE_API_BASE_URL=http://localhost:8081
```

Important:

```text
Use http://localhost:8081, not https://localhost:8081.
```

Spring Boot/Tomcat is running plain HTTP locally. If the frontend/browser tries HTTPS, the backend log may show invalid HTTP method bytes such as `0x16 0x03 0x01`.

---

## 5. Backend CORS

Because the frontend runs on:

```text
http://localhost:5173
```

and the backend runs on:

```text
http://localhost:8081
```

the backend needs CORS config.

Expected file:

```text
backend/src/main/java/com/minirtos/playground/config/CorsConfig.java
```

Expected allowed origins:

```text
http://localhost:5173
http://127.0.0.1:5173
```

---

## 6. Frontend Dockerfile

Expected file:

```text
docker/Dockerfile.frontend
```

Development Docker behavior:

```text
build from Node image
install frontend dependencies
mount frontend source for local iteration
serve Vite on 0.0.0.0:5173
```

Expected command:

```text
npm run dev -- --host 0.0.0.0
```

---

## 7. Docker Compose Frontend Service

Phase 28 added:

```yaml
frontend:
  build:
    context: .
    dockerfile: docker/Dockerfile.frontend
  container_name: minirtos-playground-frontend
  ports:
    - "5173:5173"
  environment:
    VITE_API_BASE_URL: http://localhost:8081
  depends_on:
    - backend
  volumes:
    - ./frontend:/app/frontend
    - /app/frontend/node_modules
```

Existing services remain:

```text
demo
runtime-normal
runtime-priority
runtime-deadline
runtime-queue-overflow
runtime-cpu-spike
runtime-task-crash
runtime-slow-task
runtime-dropped-messages
runtime-watchdog
analyzer
training-dataset
ml-train
ml-predict
postgres
backend
frontend
```

---

## 8. Verification

Start backend stack:

```bash
docker compose up -d postgres
cd backend
mvn spring-boot:run
```

Run frontend locally:

```bash
cd frontend
npm install
npm run build
npm run dev
```

Or run frontend through Docker:

```bash
docker compose up --build frontend
```

Test backend:

```bash
curl -i http://localhost:8081/api/scenarios
curl -i http://localhost:8081/api/runs
```

Open frontend:

```text
http://localhost:5173
```

Expected dashboard behavior:

```text
Scenario dropdown loads.
Run selected scenario button works.
Latest run result card updates.
Persisted history loads.
Analysis panel loads for completed runs.
Raw analyzer report can be expanded.
```

---

## 9. Troubleshooting

### Dashboard says Failed to fetch

Check:

```bash
cat frontend/.env
```

Expected:

```env
VITE_API_BASE_URL=http://localhost:8081
```

Restart Vite after changing `.env`:

```bash
cd frontend
npm run dev
```

Check backend:

```bash
curl -i http://localhost:8081/api/scenarios
```

### Backend logs invalid HTTP method bytes

If logs show bytes like:

```text
0x16 0x03 0x01
```

that means HTTPS/TLS traffic is being sent to the HTTP backend.

Fix:

```text
Use http://localhost:8081 everywhere for local backend calls.
```

### Browser still fails after env fix

Hard refresh:

```text
Ctrl + Shift + R
```

Also confirm `frontend/src/api/minirtosApi.ts` fallback is:

```ts
"http://localhost:8081"
```

---

## 10. Recommended `.gitignore`

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

# Frontend
frontend/node_modules/
frontend/dist/
frontend/.env

# Docker/local overrides
docker-compose.override.yml
.env
.env.*
```

---

## 11. Next Docker Work

Phase 29/30 should improve full-stack Docker orchestration:

```text
frontend
backend
postgres
runtime/analyzer jobs or workers
```

Recommended future improvements:

- Add production frontend Dockerfile using `npm run build` and Nginx.
- Add frontend healthcheck.
- Add backend readiness dependency before frontend startup.
- Add Compose profile for dev vs production.
- Add CI Docker build smoke tests for frontend/backend images.
