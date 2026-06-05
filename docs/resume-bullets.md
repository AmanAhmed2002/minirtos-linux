# MiniRTOS-Linux / MiniRTOS Playground Resume and Interview Notes

## Current Status After Phase 29

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 completed the Java Spring Boot backend scaffold. Phase 26 completed backend run orchestration. Phase 27 added PostgreSQL/Flyway run persistence. Phase 28 added the React/TypeScript dashboard MVP. Phase 29 added educational modules and visualizers.

Current project now includes:

- C++20 runtime simulator.
- JSON configs for scheduler/fault scenarios.
- Round-robin, priority, and earliest-deadline-first scheduling.
- Bounded message queues.
- Fault injection for slow tasks, CPU spikes, dropped messages, and task crashes.
- Watchdog timeout and simulated recovery telemetry.
- Structured JSONL telemetry.
- Python deterministic analyzer.
- AI-style anomaly windowing.
- Synthetic dataset generator.
- Random Forest anomaly classifier workflow.
- Dockerized runtime/analyzer/ML/backend/frontend workflows.
- Java Spring Boot REST API.
- PostgreSQL/Flyway persisted run history.
- React/TypeScript dashboard.
- Guided educational learning cards.
- Queue pressure visualizer.
- Task runtime timeline visualizer.
- Fault and health explanation panel.

Verified behavior:

- Backend runs locally on port `8081`.
- `GET /api/health` works.
- `GET /api/scenarios` works.
- `POST /api/runs` works for trusted scenarios.
- `GET /api/runs` returns persisted PostgreSQL-backed history.
- `GET /api/runs/{runId}/analysis` returns parsed analyzer summaries.
- React dashboard works locally on `http://localhost:5173`.
- Phase 29 educational modules and visualizers work.
- Changes were committed and pushed to GitHub.

Important local decisions:

- Backend uses Java 17.
- Backend runs on port `8081` because Nginx already used `8080` locally.
- Frontend uses Node 22+.
- Backend only accepts known scenario IDs and never accepts arbitrary config paths.
- Phase 29 visualizers use CSS and existing API response fields, with no new chart dependency.

---

## 1. Best Project Titles

```text
MiniRTOS Playground — Full-Stack Embedded Systems Learning Platform
Embedded Runtime Simulator with AI-Based Fault Detection
C++ Embedded Runtime Simulator with Python Anomaly Detection
Linux-Based RTOS Simulator with Fault Injection and Watchdog Recovery
Full-Stack RTOS Learning Platform with Java Spring Boot, PostgreSQL, and React
C++/Python/Java/React Embedded Systems Learning Platform
```

---

## 2. One-Line Summary

```text
Built MiniRTOS Playground, a full-stack embedded-systems learning platform with a C++20 runtime simulator, Python anomaly analysis and ML workflow, Spring Boot orchestration API, PostgreSQL run persistence, Dockerized workflows, and a React/TypeScript dashboard with guided learning modules and visual telemetry explanations.
```

---

## 3. Best 4-Bullet Version

```text
- Built MiniRTOS-Linux, a C++20 embedded-runtime simulator on Linux with periodic tasks, round-robin, priority, and earliest-deadline-first scheduling, bounded message queues, structured JSONL telemetry, configurable fault injection, watchdog monitoring, task-crash simulation, and simulated recovery events.
- Developed a Python analysis and ML pipeline that parses runtime logs, computes task/message/fault/watchdog metrics, performs explainable time-windowed anomaly detection, generates labeled synthetic datasets, trains a Random Forest classifier, and reports prediction confidence.
- Extended the simulator into MiniRTOS Playground with a Java Spring Boot REST API, trusted scenario execution, Python analyzer orchestration, PostgreSQL/Flyway run persistence, Docker Compose services, and tests across C++, Python, and backend layers.
- Built a React/TypeScript educational dashboard that lets users run scenarios, inspect persisted history, view analyzer summaries, and learn RTOS concepts through guided learning cards, queue pressure visualizers, task runtime timelines, and fault/health explanations.
```

---

## 4. Best 3-Bullet Version

```text
- Built a C++20 embedded-runtime simulator on Linux with periodic task scheduling, priority and earliest-deadline-first scheduling, bounded message queues, structured JSONL telemetry, configurable fault injection, watchdog monitoring, queue-overflow benchmarking, task-crash simulation, and simulated recovery events.
- Developed a Python analysis/ML pipeline with deterministic health reporting, explainable time-windowed anomaly detection, synthetic dataset generation, and a lightweight Random Forest classifier trained on scenario telemetry.
- Delivered a full-stack MiniRTOS Playground using Spring Boot, PostgreSQL, Docker Compose, and React/TypeScript, enabling browser-based scenario execution, persisted run history, analyzer summaries, guided learning modules, queue visualizations, and task runtime visualizations.
```

---

## 5. Compact One-Bullet Version

```text
- Built MiniRTOS Playground, a C++20/Python/Java/React embedded-systems learning platform with RTOS-style scheduling, bounded queues, fault injection, watchdog telemetry, JSONL log analysis, synthetic ML dataset generation, lightweight anomaly classification, Spring Boot orchestration APIs, PostgreSQL run persistence, Dockerized workflows, and a React dashboard with educational visualizers.
```

---

## 6. Technologies

```text
C++20, Python, Java, Spring Boot, Maven, React, TypeScript, Vite, PostgreSQL, Flyway, Linux, CMake, Ninja, GoogleTest, CTest, pytest, Docker, Docker Compose, JSONL, CSV, scikit-learn, joblib, Random Forest, Bash, Git, GitHub Actions
```

Future additions:

```text
Kubernetes, Terraform, GHCR, CI/CD image publishing, Vitest, React Testing Library
```

---

## 7. Interview Answers

### What is MiniRTOS-Linux?

```text
MiniRTOS-Linux is a software-only embedded runtime simulator. It models periodic tasks, deadlines, bounded queues, scheduler modes, fault injection, watchdog monitoring, structured runtime telemetry, Python analysis, synthetic dataset generation, and a lightweight trained anomaly classifier.
```

### What is MiniRTOS Playground?

```text
MiniRTOS Playground is the full-stack evolution of MiniRTOS-Linux. It turns the simulator into a browser-based embedded systems learning platform where users can select scenarios, run simulations, inspect telemetry, compare scheduler modes, and learn concepts like bounded queues, deadlines, fault injection, watchdog recovery, and ML anomaly detection.
```

### Where is the AI?

```text
The AI layer has two parts. First, the analyzer performs explainable time-windowed anomaly detection by extracting telemetry features such as deadline misses, task duration, message drops, fault events, task failures, and watchdog events. Second, the project generates a synthetic labeled dataset from scenario logs and trains a lightweight Random Forest classifier that predicts anomaly labels with confidence scores.
```

### Why add Spring Boot?

```text
I added Spring Boot to evolve the project from a CLI/Docker demo into a full-stack educational platform. The backend validates trusted scenario IDs, runs the C++ simulator, invokes the Python analyzer, parses the result, persists summaries in PostgreSQL, and exposes them through REST endpoints for the React dashboard.
```

### Why add PostgreSQL?

```text
PostgreSQL turns run history from temporary process-local state into durable persisted data. Users can run simulations, restart the backend, and still revisit previous run summaries and parsed analysis results.
```

### Why add React?

```text
React turns the project from a command-line/API workflow into a student-facing learning platform. Users can select scenarios, trigger runs, inspect persisted history, view analyzer results, and understand embedded systems concepts through guided explanations and visualizations.
```

### What did Phase 29 add?

```text
Phase 29 added guided educational modules and visualizers to the React dashboard. It introduced scenario-specific learning cards, a queue pressure visualizer, a task runtime timeline, and a fault/health explanation panel using the existing backend analysis response. It did not require backend, database, Docker, or new dependency changes.
```

### What is next?

```text
The next step is Phase 30: hardening the full-stack Docker Compose setup by adding a production frontend image, frontend healthcheck, backend readiness checks, dev/prod Compose profiles, and Docker/CI smoke tests.
```

---

## 8. STAR Story

### Situation
I wanted a portfolio project that demonstrated embedded systems concepts without needing specialized hardware.

### Task
I needed to build a runtime simulator that could schedule tasks, produce telemetry, simulate faults, detect unhealthy behavior, generate training data, and later evolve into a full-stack educational platform.

### Action
I implemented the runtime in C++20 with JSON configs, periodic tasks, multiple scheduler modes, bounded message queues, structured JSONL logging, fault injection, and watchdog monitoring. Then I built a Python analyzer, anomaly detector, synthetic dataset generator, and ML classifier. I added tests, Docker Compose demos, benchmark documentation, and a Java Spring Boot backend. I then added run orchestration, PostgreSQL persistence, and a React/TypeScript dashboard with educational modules and visualizers.

### Result
The system can run normal, priority, EDF, queue-overflow, CPU-spike, task-crash, slow-task, dropped-message, and watchdog scenarios; generate structured logs; detect unhealthy behavior; persist run history; train an anomaly classifier; expose scenario/run APIs; and teach embedded systems concepts through a browser-based dashboard.
