# Phase 21 Docker and Documentation Update Notes

## What changed

Phase 21 adds a synthetic training-data generator for MiniRTOS-Linux. The new workflow converts existing scenario JSONL logs into labeled, fixed-window feature rows and writes a generated CSV dataset.

Updated files should include:

```text
ai-analyzer/training/generate_dataset.py
ai-analyzer/training/README.md
ai-analyzer/tests/test_training_dataset.py
docker-compose.yml
scripts/run_docker_demo.sh
README.md
docs/architecture.md
docs/anomaly-detector.md
docs/testing.md
docs/performance-results.md
docs/resume-bullets.md
docs/fault-injection.md
```

## New workflow

```text
ai-analyzer/training/generate_dataset.py
```

The generator reads scenario logs and writes:

```text
reports/generated/synthetic_dataset.csv
```

The generated CSV should not be committed.

## Dataset labels

Expected labels include:

```text
NORMAL
QUEUE_PRESSURE
CPU_SPIKE
TASK_CRASH
SLOW_TASK
DROPPED_MESSAGES
WATCHDOG_RECOVERY
```

## Docker update

The new individual Docker service should be:

```bash
docker compose run --rm training-dataset
```

The full demo may also generate the dataset after running all scenarios.

## Verification commands

```bash
python3 -m pytest ai-analyzer/tests/test_training_dataset.py -q
python3 -m pytest ai-analyzer/tests -q
./scripts/run_tests.sh
docker compose config
docker compose build
docker compose up --build demo
docker compose run --rm training-dataset
ls -lh reports/generated
head -n 5 reports/generated/synthetic_dataset.csv
git status
```

## Expected result

The dataset generator should report:

```text
Synthetic dataset generated
Rows: greater than 0
Scenarios requested: 9
Window size: 5000 ms
```

## Dockerfile note

No Dockerfile changes are required for Phase 21 if the existing runtime/analyzer image already includes Python and copies the full project directory. The required Docker update is to add the `training-dataset` service and/or call `generate_dataset.py` in `scripts/run_docker_demo.sh`.

## Documentation note

Documentation should be clear that Phase 21 creates a synthetic training dataset, but it does not train a production machine-learning model yet. The current AI layer should be described as:

```text
AI-style anomaly detection
explainable rule/feature-based anomaly scoring
synthetic training-data groundwork
```

Do not describe the project as having a trained ML model until a model is actually trained, evaluated, and documented.
