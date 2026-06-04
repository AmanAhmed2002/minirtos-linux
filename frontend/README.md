# MiniRTOS Playground Frontend

React + TypeScript dashboard for MiniRTOS Playground.

## Current Phase

Phase 28 — React Dashboard MVP.

## Features

- Fetch scenarios from the Spring Boot backend.
- Select a scenario.
- Trigger a backend-orchestrated MiniRTOS simulation run.
- Display latest run status and runtime health.
- Display persisted PostgreSQL-backed run history.
- Load parsed analyzer summaries for completed runs.
- Show task metrics, message drops, root causes, and raw analyzer output.

## Requirements

```text
Node.js 20+
npm
Spring Boot backend running on localhost:8081
PostgreSQL running through Docker Compose
