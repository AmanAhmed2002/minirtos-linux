# Phase 31 Frontend Automated Tests and CI Update Notes

**Updated:** June 5, 2026  
**Project:** MiniRTOS Playground  
**Phase:** Phase 31 — Frontend Automated Tests and CI Integration

---

## 1. Purpose

Phase 31 added automated frontend test coverage for the MiniRTOS Playground React dashboard and integrated those tests into GitHub Actions CI.

The goal was to verify the dashboard UI without requiring the backend to be running.

---

## 2. What Changed

Phase 31 added:

```text
Vitest
React Testing Library
jsdom
@testing-library/jest-dom
@testing-library/user-event
@vitest/coverage-v8
frontend test scripts
shared test fixtures
dashboard integration-style tests
component tests
visualizer tests
GitHub Actions frontend CI job
```

---

## 3. Updated Files

```text
frontend/package.json
frontend/package-lock.json
frontend/vite.config.ts
frontend/tsconfig.app.json
frontend/tsconfig.node.json
frontend/src/test/setupTests.ts
frontend/src/test/testData.ts
frontend/src/App.test.tsx
frontend/src/components/ScenarioSelector.test.tsx
frontend/src/components/AnalysisPanel.test.tsx
frontend/src/components/Visualizers.test.tsx
.github/workflows/ci.yml
```

---

## 4. Package Scripts

Phase 31 added these scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

Existing scripts remain:

```text
dev
build
typecheck
lint
preview
```

---

## 5. Test Configuration

`vite.config.ts` now uses Vitest config:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setupTests.ts",
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
    },
  },
});
```

TypeScript was updated so test globals and jest-dom matchers are recognized.

---

## 6. Test Setup

`frontend/src/test/setupTests.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

`frontend/src/test/testData.ts` contains shared mock data for:

```text
scenario fixtures
completed run fixture
failed run fixture
analysis fixture
```

---

## 7. Test Coverage Added

### App tests

`frontend/src/App.test.tsx` verifies:

```text
Dashboard initial loading
Scenario list loading
Persisted run history loading
Analysis loading
Run creation
Run history refresh
Dashboard API error banner
Selected failed run error display
```

### Scenario selector tests

`frontend/src/components/ScenarioSelector.test.tsx` verifies:

```text
Scenario options render.
Selected scenario metadata renders.
Run button calls the callback with selected scenario ID.
Controls are disabled while a run is in progress.
```

### Analysis panel tests

`frontend/src/components/AnalysisPanel.test.tsx` verifies:

```text
Loading state.
Empty state.
Runtime health.
Events loaded.
Scheduler mode.
Message summary values.
Task metrics.
Root causes.
Raw report.
```

### Visualizer tests

`frontend/src/components/Visualizers.test.tsx` verifies:

```text
QueuePressureChart.
TaskTimeline.
LearningModulePanel.
FaultExplanationPanel.
RunResultCard.
RunHistory.
```

---

## 8. Important Debugging Lesson

Some tests initially failed because the same text appeared more than once in the rendered dashboard.

Examples:

```text
956
ControlTask
NetworkTask
Runtime process failed.
Queue pressure detected
```

These values can appear in:

```text
summary cards
metric tables
visualizer cards
run cards
raw analyzer report
```

Correct testing approach:

```ts
expect(screen.getAllByText("956").length).toBeGreaterThan(0);
```

or scoped assertions:

```ts
const table = screen.getByRole("table");
expect(within(table).getByText("ControlTask")).toBeInTheDocument();
```

Avoid using `getByText` when the text is expected to appear in multiple places.

---

## 9. Local Verification

Run from `frontend/`:

```bash
npm install
npm run test
npm run typecheck
npm run build
```

Optional coverage:

```bash
npm run test:coverage
```

Expected:

```text
All frontend tests pass.
TypeScript typecheck passes.
Vite production build succeeds.
```

---

## 10. GitHub Actions CI Update

`.github/workflows/ci.yml` now includes:

```text
Build and Test Runtime + Analyzer
Test Frontend Dashboard
```

Frontend CI job:

```yaml
frontend-tests:
  name: Test Frontend Dashboard
  runs-on: ubuntu-24.04

  defaults:
    run:
      working-directory: frontend

  steps:
    - name: Check out repository
      uses: actions/checkout@v4

    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: "22"
        cache: npm
        cache-dependency-path: frontend/package-lock.json

    - name: Install frontend dependencies
      run: npm ci

    - name: Run frontend tests
      run: npm run test

    - name: Run frontend typecheck
      run: npm run typecheck

    - name: Build frontend
      run: npm run build
```

---

## 11. Why This Matters

Phase 31 improves project quality because:

```text
Dashboard behavior is now protected by automated tests.
Frontend API workflows can be tested with mocked responses.
Educational visualizers are covered by component tests.
TypeScript and production build checks run in CI.
Future UI changes are less likely to silently break existing behavior.
The project now demonstrates frontend testing and CI/CD skills.
```

---

## 12. Completion Criteria

Phase 31 is complete when:

```text
npm run test passes.
npm run typecheck passes.
npm run build passes.
GitHub Actions includes the frontend-tests job.
Existing dashboard behavior remains unchanged.
```

User verification:

```text
Frontend tests passed locally after duplicate-text assertions were fixed.
CI workflow was updated to include frontend automated tests.
```

---

## 13. Later Follow-Up Areas

At the time this Phase 31 note was written, likely next areas included:

```text
Frontend analytics
Kubernetes manifests
PostgreSQL deployment/service or external DB strategy
Backend deployment/service
Frontend production deployment/service
ConfigMaps and Secrets
Local verification with minikube/kind/Docker Desktop Kubernetes
```
