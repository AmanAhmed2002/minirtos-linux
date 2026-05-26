# Phase 20 Docker and Documentation Update Notes

## What changed

Phase 20 adds a dedicated task-crash fault-injection scenario. This scenario simulates a task failure without terminating the real runtime process.

Updated files should include:

```text
configs/task_crash.json
docker-compose.yml
scripts/run_docker_demo.sh
README.md
docs/architecture.md
docs/fault-injection.md
docs/anomaly-detector.md
docs/testing.md
docs/performance-results.md
docs/resume-bullets.md
```

## New scenario

```text
configs/task_crash.json
```

The scenario marks the configured target task as failed after the configured start time. The runtime should continue running and log task-failure telemetry instead of crashing the process.

Recommended config behavior:

```text
simulation_name: task_crash
scheduler_mode: round_robin
fault_type: task_crash
target_task: NetworkTask
start_after_ms: 5000
```

## Expected runtime telemetry

Expected event types include:

```text
fault_injected
task_failed
task_skipped
runtime_summary
runtime_finished
```

Expected task-crash metadata includes:

```text
fault_type=task_crash
reason=simulated_task_crash
reason=task_in_failed_state
```

## Docker update

The full Docker demo should now run and analyze these scenarios:

1. Normal runtime
2. Priority scheduler
3. Earliest-deadline-first scheduler
4. Queue overflow
5. CPU spike fault
6. Task crash fault
7. Slow task fault
8. Dropped messages fault
9. Watchdog slow task

The new individual Docker service should be:

```bash
docker compose run --rm runtime-task-crash
```

The new generated log should be:

```text
logs/task_crash_runtime_logs.jsonl
```

## Verification commands

```bash
docker compose config
./scripts/build_cpp.sh
./scripts/run_tests.sh
./cpp-runtime/build/minirtos_runtime --config configs/task_crash.json
./scripts/run_analyzer.sh logs/runtime_logs.jsonl 5000
docker compose build
docker compose up --build demo
ls -lh logs
./scripts/run_analyzer.sh logs/task_crash_runtime_logs.jsonl 5000
```

## Expected analyzer result

The analyzer should report:

```text
Simulation: task_crash
Runtime status: UNSTABLE
Fault summary:
  task_crash: greater than 0
Task failure summary:
  task_failures: 1
  task_skips: greater than 0
```

## Dockerfile note

No Dockerfile changes are required for Phase 20 because this is a runtime/config/demo update using the existing runtime image and analyzer image.

## Documentation note

The previous phase-specific Docker notes from Phase 18 and Phase 19 can be deleted from the repository if the main README and docs now include queue-overflow, CPU-spike, and task-crash coverage. Keep them only if you want a historical changelog/archive.
