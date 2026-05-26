# Phase 22 Docker and Documentation Update Notes

## What changed

Phase 22 adds the actual ML/AI implementation for MiniRTOS-Linux.

The new workflow trains a lightweight supervised anomaly classifier from the Phase 21 synthetic dataset and runs predictions against either dataset rows or runtime log windows.

Updated files should include:

```text
ai-analyzer/ml/train_model.py
ai-analyzer/ml/predict_model.py
ai-analyzer/ml/README.md
ai-analyzer/tests/test_ml_model.py
ai-analyzer/app/analyze.py
docker-compose.yml
docker/Dockerfile.runtime
docker/Dockerfile.analyzer
scripts/run_docker_demo.sh
README.md
docs/architecture.md
docs/anomaly-detector.md
docs/testing.md
docs/performance-results.md
docs/resume-bullets.md
docs/fault-injection.md
ai-analyzer/training/README.md
.gitignore
models/.gitkeep
```

---

## New ML workflow

Training:

```bash
python3 ai-analyzer/ml/train_model.py   --dataset reports/generated/synthetic_dataset.csv   --model-output models/anomaly_classifier.joblib   --label-encoder-output models/label_encoder.joblib   --metrics-output reports/generated/model_metrics.json
```

Prediction from dataset:

```bash
python3 ai-analyzer/ml/predict_model.py   --model models/anomaly_classifier.joblib   --label-encoder models/label_encoder.joblib   --dataset reports/generated/synthetic_dataset.csv   --limit 20
```

Prediction from runtime log:

```bash
python3 ai-analyzer/ml/predict_model.py   --model models/anomaly_classifier.joblib   --label-encoder models/label_encoder.joblib   --log logs/task_crash_runtime_logs.jsonl   --window-ms 5000
```

Analyzer integration:

```bash
python3 ai-analyzer/app/analyze.py   --log logs/task_crash_runtime_logs.jsonl   --window-ms 5000   --ml-model models/anomaly_classifier.joblib   --ml-label-encoder models/label_encoder.joblib
```

---

## New Docker services

Recommended individual services:

```bash
docker compose run --rm ml-train
docker compose run --rm ml-predict
```

The full demo should now be able to run:

```bash
docker compose up --build demo
```

and include:

1. Runtime scenario generation.
2. Analyzer output for each scenario.
3. Synthetic dataset generation.
4. ML model training.
5. ML prediction output.

---

## Dockerfile update

Phase 22 introduces new Python dependencies:

```text
scikit-learn
joblib
```

The runtime/analyzer Docker images should include these dependencies if they run ML training or prediction.

Possible Ubuntu package approach:

```dockerfile
python3-sklearn
python3-joblib
```

Possible pip approach:

```dockerfile
pip install --no-cache-dir scikit-learn joblib
```

Use the approach that matches the existing Dockerfile base image.

---

## Generated outputs

Phase 22 generates:

```text
models/anomaly_classifier.joblib
models/label_encoder.joblib
reports/generated/model_metrics.json
```

Phase 21 still generates:

```text
reports/generated/synthetic_dataset.csv
```

These generated files should not be committed by default.

Recommended `.gitignore` additions:

```gitignore
# Generated ML artifacts
models/*
!models/.gitkeep
*.joblib
*.pkl
```

Keep:

```gitignore
reports/generated/
```

Commit:

```text
models/.gitkeep
```

---

## Verification commands

Run these after implementation:

```bash
python3 -m pytest ai-analyzer/tests/test_ml_model.py -q
python3 -m pytest ai-analyzer/tests -q
./scripts/run_tests.sh
python3 ai-analyzer/ml/train_model.py   --dataset reports/generated/synthetic_dataset.csv   --model-output models/anomaly_classifier.joblib   --label-encoder-output models/label_encoder.joblib   --metrics-output reports/generated/model_metrics.json
python3 ai-analyzer/ml/predict_model.py   --model models/anomaly_classifier.joblib   --label-encoder models/label_encoder.joblib   --dataset reports/generated/synthetic_dataset.csv   --limit 20
python3 ai-analyzer/app/analyze.py   --log logs/task_crash_runtime_logs.jsonl   --window-ms 5000   --ml-model models/anomaly_classifier.joblib   --ml-label-encoder models/label_encoder.joblib
docker compose config
docker compose up --build demo
docker compose run --rm ml-train
docker compose run --rm ml-predict
git status
```

---

## Expected result

Training should report:

```text
MiniRTOS-Linux ML Training
Model type: RandomForestClassifier
Rows: greater than 0
Train rows: greater than 0
Test rows: greater than 0
Accuracy: numeric value
```

Prediction should report:

```text
MiniRTOS-Linux ML Predictions
Predictions: greater than 0
prediction=<LABEL>
confidence=<VALUE>
```

Analyzer with ML should report:

```text
ML Anomaly Classifier
Windows predicted: greater than 0
Highest-confidence prediction: <LABEL> confidence=<VALUE>
Prediction counts:
...
Window ML summary:
...
```

---

## Documentation note

After Phase 22 is verified, documentation can now say:

```text
trained lightweight ML anomaly classifier
RandomForestClassifier
saved model artifact
label encoder artifact
prediction confidence output
model metrics report
```

Continue to avoid overclaiming:

```text
production AI
production safety classifier
deep learning detector
hardware-validated ML model
```

Correct framing:

```text
The ML classifier is trained on synthetic scenario telemetry and is intended as a portfolio AI/ML layer, not a production-validated safety model.
```

---

## Docker update rule

After every new runtime, analyzer, training, or ML feature, check whether Docker needs updates.

For Phase 22, Docker needed review because new ML dependencies, services, mounted model artifacts, and demo steps were added.
