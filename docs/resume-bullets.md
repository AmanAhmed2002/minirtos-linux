# MiniRTOS-Linux / MiniRTOS Playground Resume and Interview Notes

## Current Status After This Chat

MiniRTOS-Linux Phases 1-23 are complete. Phase 24 defined the full-stack educational platform roadmap. Phase 25 is now complete.

Phase 25 added the Java Spring Boot backend scaffold for MiniRTOS Playground:

- `backend/pom.xml`
- `MiniRtosPlaygroundApplication.java`
- `HealthController.java`
- `ScenarioController.java`
- `ScenarioService.java`
- `ScenarioResponse.java`
- `application.yml`
- backend controller tests
- `backend/README.md`
- `docker/Dockerfile.backend`
- backend service in `docker-compose.yml`

Verified behavior:

- Spring Boot backend runs locally.
- `GET /api/health` works.
- `GET /api/scenarios` works.
- Backend Dockerfile builds.
- Backend runs through Docker Compose.
- Existing C++/Python/analyzer/ML Docker workflow remains intact.

Important local decision:

- Backend uses Java 17.
- Backend runs on port `8081` because Nginx is already using `8080`.


---

## 1. Best Project Titles

```text
MiniRTOS Playground — Full-Stack Embedded Systems Learning Platform
Embedded Runtime Simulator with AI-Based Fault Detection
C++ Embedded Runtime Simulator with Python Anomaly Detection
Linux-Based RTOS Simulator with Fault Injection and Watchdog Recovery
Full-Stack RTOS Learning Platform with Java Spring Boot and C++ Runtime Simulation
```

---

## 2. One-Line Summary

```text
Built a C++20 embedded-runtime simulator with scheduler modes, bounded queues, fault injection, watchdog telemetry, Python log analysis, synthetic ML dataset generation, lightweight anomaly classification, Dockerized demos, automated tests, benchmark docs, and a Java Spring Boot backend scaffold for a full-stack embedded systems learning platform.
```

---

## 3. Best 4-Bullet Version

```text
- Built MiniRTOS-Linux, a C++20 embedded-runtime simulator on Linux with periodic tasks, round-robin, priority, and earliest-deadline-first scheduling, bounded message queues, structured JSONL telemetry, configurable fault injection, watchdog monitoring, task-crash simulation, and simulated recovery events.
- Developed a Python analysis and ML pipeline that parses runtime logs, computes task/message/fault/watchdog metrics, performs explainable time-windowed anomaly detection, generates labeled synthetic datasets, trains a Random Forest classifier, and reports prediction confidence.
- Dockerized runtime, analyzer, dataset-generation, ML-training, ML-prediction, and backend workflows with Docker Compose services, while maintaining GoogleTest/CTest, pytest, Spring Boot tests, benchmark docs, and CI-ready project structure.
- Extended the project into MiniRTOS Playground by adding a Java Spring Boot backend scaffold with `/api/health` and `/api/scenarios`, preparing the system for API-driven simulation runs, PostgreSQL run history, and a React/TypeScript educational dashboard.
```

---

## 4. Best 3-Bullet Version

```text
- Built a C++20 embedded-runtime simulator on Linux with periodic task scheduling, priority and earliest-deadline-first scheduling, bounded message queues, structured JSONL telemetry, configurable fault injection, watchdog monitoring, queue-overflow benchmarking, task-crash simulation, and simulated recovery events.
- Developed a Python analysis pipeline with deterministic health reporting, explainable time-windowed anomaly detection, synthetic training-data generation, and a lightweight Random Forest classifier trained on scenario telemetry.
- Added GoogleTest/pytest/Spring Boot test coverage, GitHub Actions CI-ready workflows, Docker Compose demo services, benchmark documentation, and a Java Spring Boot backend scaffold exposing scenario metadata for the future full-stack MiniRTOS Playground dashboard.
```

---

## 5. Compact One-Bullet Version

```text
- Built MiniRTOS Playground, a C++20/Python/Java embedded-systems learning platform with RTOS-style scheduling, bounded queues, fault injection, watchdog telemetry, task-crash simulation, JSONL log analysis, synthetic ML dataset generation, lightweight anomaly classification, Spring Boot scenario APIs, automated tests, Dockerized demos, and benchmark documentation.
```

---

## 6. Technologies

```text
C++20, Python, Java, Spring Boot, Maven, Linux, CMake, Ninja, GoogleTest, CTest, pytest, Docker, Docker Compose, JSONL, CSV, scikit-learn, joblib, Random Forest, Bash, Git, GitHub Actions
```

Future additions:

```text
React, TypeScript, PostgreSQL, Kubernetes, Terraform
```

---

## 7. Interview Answers

### What is MiniRTOS-Linux?

```text
MiniRTOS-Linux is a software-only embedded runtime simulator. It models periodic tasks, deadlines, bounded queues, scheduler modes, fault injection, watchdog monitoring, structured runtime telemetry, Python analysis, synthetic dataset generation, and a lightweight trained anomaly classifier.
```

### What is MiniRTOS Playground?

```text
MiniRTOS Playground is the full-stack evolution of MiniRTOS-Linux. The goal is to turn the simulator into a browser-based embedded systems learning platform where users can select scenarios, run simulations, inspect telemetry, compare scheduler modes, and learn concepts like bounded queues, deadlines, fault injection, watchdog recovery, and ML anomaly detection.
```

### Where is the AI?

```text
The AI layer has two parts. First, the analyzer performs explainable time-windowed anomaly detection by extracting telemetry features such as deadline misses, task duration, message drops, fault events, task failures, and watchdog events. Second, the project generates a synthetic labeled dataset from scenario logs and trains a lightweight Random Forest classifier that predicts anomaly labels with confidence scores.
```

### Why add Spring Boot?

```text
I added Spring Boot to evolve the project from a CLI/Docker demo into a full-stack educational platform. The backend currently exposes health and scenario metadata APIs, and the next phase will let it orchestrate C++ runtime simulations and Python analyzer workflows through REST endpoints.
```

### What is next?

```text
The next step is Phase 26: adding a run orchestration API so the backend can run selected C++ simulation scenarios, copy generated logs to unique run files, invoke the Python analyzer, and return structured JSON results.
```

---

## 8. STAR Story

### Situation
I wanted a portfolio project that demonstrated embedded systems concepts without needing specialized hardware.

### Task
I needed to build a runtime simulator that could schedule tasks, produce telemetry, simulate faults, detect unhealthy behavior, generate training data, and later evolve into a full-stack educational platform.

### Action
I implemented the runtime in C++20 with JSON configs, periodic tasks, multiple scheduler modes, bounded message queues, structured JSONL logging, fault injection, and watchdog monitoring. Then I built a Python analyzer, anomaly detector, synthetic dataset generator, and ML classifier. I added tests, Docker Compose demos, benchmark documentation, and a Java Spring Boot backend scaffold.

### Result
The system can run normal, priority, EDF, queue-overflow, CPU-spike, task-crash, slow-task, dropped-message, and watchdog scenarios; generate structured logs; detect unhealthy behavior; train an anomaly classifier; output prediction confidence; and expose scenario metadata through a Dockerized Spring Boot backend.
