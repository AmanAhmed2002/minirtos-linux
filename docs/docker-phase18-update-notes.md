# Phase 18 Docker and Documentation Update Notes

## What changed

Phase 18 adds a dedicated queue-overflow benchmark scenario. The runtime and analyzer logic did not need code changes because the existing bounded message bus already logs `queue_full` drops and the analyzer already reports queue-full drops separately from fault-injected drops.

Updated files should include:

```text
configs/queue_overflow.json
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
configs/queue_overflow.json
```

The scenario intentionally makes producer tasks run faster than `LoggerTask` can consume messages and lowers `LoggerTask` queue capacity. This creates repeatable bounded-queue pressure without using the `dropped_messages` fault injector.

## Observed analyzer result

```text
Runtime status: WARNING
Simulation: queue_overflow
Scheduler mode: round_robin
queue_full_drops: 958
fault_injected_drops: 0
deadline_misses: 0
watchdog_timeouts: 0
task_recoveries: 0
```

## Docker update

The full Docker demo should now run and analyze these scenarios:

1. Normal runtime
2. Priority scheduler
3. Earliest-deadline-first scheduler
4. Queue overflow
5. Slow task fault
6. Dropped messages fault
7. Watchdog slow task

The new individual Docker service should be:

```bash
docker compose run --rm runtime-queue-overflow
```

The new generated log should be:

```text
logs/queue_overflow_runtime_logs.jsonl
```

## Verification commands

```bash
./scripts/build_cpp.sh
./cpp-runtime/build/minirtos_runtime --config configs/queue_overflow.json
./scripts/run_analyzer.sh logs/runtime_logs.jsonl 5000
./scripts/run_tests.sh
docker compose build
docker compose up --build demo
ls -lh logs
```

## Expected result

The full demo should complete successfully and include `logs/queue_overflow_runtime_logs.jsonl`. The analyzer should classify the queue-overflow scenario as `WARNING` with queue-full drops greater than 0 and fault-injected drops equal to 0.
