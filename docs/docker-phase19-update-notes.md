# Phase 19 Docker and Documentation Update Notes

## What changed

Phase 19 adds a dedicated CPU spike fault-injection scenario. This scenario should be treated as a timing-pressure fault that is distinct from the existing `slow_task` fault.

Updated files should include:

```text
configs/cpu_spike.json
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
configs/cpu_spike.json
```

The scenario injects simulated CPU-load pressure into `NetworkTask` after the configured start time.

Recommended config behavior:

```text
simulation_name: cpu_spike
scheduler_mode: round_robin
fault_type: cpu_spike
target_task: NetworkTask
start_after_ms: 5000
extra_execution_time_ms: 220
```

## Docker update

The full Docker demo should now run and analyze these scenarios:

1. Normal runtime
2. Priority scheduler
3. Earliest-deadline-first scheduler
4. Queue overflow
5. CPU spike fault
6. Slow task fault
7. Dropped messages fault
8. Watchdog slow task

The new individual Docker service should be:

```bash
docker compose run --rm runtime-cpu-spike
```

The new generated log should be:

```text
logs/cpu_spike_runtime_logs.jsonl
```

## Verification commands

```bash
docker compose config
./scripts/build_cpp.sh
./scripts/run_tests.sh
./cpp-runtime/build/minirtos_runtime --config configs/cpu_spike.json
./scripts/run_analyzer.sh logs/runtime_logs.jsonl 5000
docker compose build
docker compose up --build demo
ls -lh logs
./scripts/run_analyzer.sh logs/cpu_spike_runtime_logs.jsonl 5000
```

## Expected result

The analyzer should report:

```text
Simulation: cpu_spike
Fault summary:
  cpu_spike: greater than 0
```

If the injected CPU spike makes the target task exceed its deadline, the analyzer should classify the scenario as `UNSTABLE` and report deadline misses for `NetworkTask`.

## Dockerfile note

No Dockerfile changes are required for Phase 19 because this is a runtime/config/demo update using the existing runtime image and analyzer image.
