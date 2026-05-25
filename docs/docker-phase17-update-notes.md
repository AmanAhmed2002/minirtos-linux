# Phase 17 Docker Demo Update Notes

## What changed

This update keeps the existing Dockerfiles unchanged and updates only:

```text
docker-compose.yml
scripts/run_docker_demo.sh
```

The Dockerfiles do not need to change because they already build the runtime image and copy the project files into the container. The important change is making the Docker Compose demo run the new scheduler scenarios added in Phases 16 and 17.

## New Docker Compose services

Two runtime services were added:

```text
runtime-priority
runtime-deadline
```

These run:

```bash
./cpp-runtime/build/minirtos_runtime --config configs/priority_scheduler.json
./cpp-runtime/build/minirtos_runtime --config configs/deadline_scheduler.json
```

## New full demo behavior

The full demo now runs and analyzes these scenarios:

1. Normal runtime
2. Priority scheduler
3. Earliest-deadline-first scheduler
4. Slow task fault
5. Dropped messages fault
6. Watchdog slow task

## New generated logs

The full Docker demo now generates these additional scheduler logs:

```text
logs/priority_scheduler_runtime_logs.jsonl
logs/deadline_scheduler_runtime_logs.jsonl
```

## Commands to verify

```bash
docker compose build
docker compose up --build demo
ls -lh logs
```

Optional individual checks:

```bash
docker compose run --rm runtime-priority
docker compose run --rm runtime-deadline
docker compose run --rm analyzer
```

## Expected result

The full demo should complete successfully and list all `*runtime_logs.jsonl` files at the end.
