#!/usr/bin/env bash
set -euo pipefail

mkdir -p logs

run_and_analyze() {
    local scenario_name="$1"
    local config_path="$2"
    local log_path="$3"

    echo
    echo "========================================"
    echo "[DEMO] Running ${scenario_name}"
    echo "========================================"

    ./cpp-runtime/build/minirtos_runtime --config "${config_path}"
    cp logs/runtime_logs.jsonl "${log_path}"
    python3 ai-analyzer/app/analyze.py --log "${log_path}" --window-ms 5000
}

echo "========================================"
echo "[DEMO] MiniRTOS-Linux Docker Demo"
echo "========================================"

run_and_analyze \
    "normal scenario" \
    "configs/normal.json" \
    "logs/normal_runtime_logs.jsonl"

run_and_analyze \
    "priority scheduler scenario" \
    "configs/priority_scheduler.json" \
    "logs/priority_scheduler_runtime_logs.jsonl"

run_and_analyze \
    "earliest-deadline-first scheduler scenario" \
    "configs/deadline_scheduler.json" \
    "logs/deadline_scheduler_runtime_logs.jsonl"

run_and_analyze \
    "queue overflow scenario" \
    "configs/queue_overflow.json" \
    "logs/queue_overflow_runtime_logs.jsonl"

run_and_analyze \
    "CPU spike fault scenario" \
    "configs/cpu_spike.json" \
    "logs/cpu_spike_runtime_logs.jsonl"
run_and_analyze \
    "task crash fault scenario" \
    "configs/task_crash.json" \
    "logs/task_crash_runtime_logs.jsonl"

run_and_analyze \
    "slow task fault scenario" \
    "configs/slow_task.json" \
    "logs/slow_task_runtime_logs.jsonl"

run_and_analyze \
    "dropped messages fault scenario" \
    "configs/dropped_messages.json" \
    "logs/dropped_messages_runtime_logs.jsonl"

run_and_analyze \
    "watchdog scenario" \
    "configs/watchdog_slow_task.json" \
    "logs/watchdog_runtime_logs.jsonl"

echo
echo "========================================"
echo "[DEMO] Docker demo completed successfully"
echo "========================================"
echo "[DEMO] Generated logs:"
echo
echo "========================================"
echo "[DEMO] Generating synthetic training dataset"
echo "========================================"

python3 ai-analyzer/training/generate_dataset.py \
    --output reports/generated/synthetic_dataset.csv \
    --window-ms 5000 \
    --scenario normal=logs/normal_runtime_logs.jsonl \
    --scenario priority_scheduler=logs/priority_scheduler_runtime_logs.jsonl \
    --scenario deadline_scheduler=logs/deadline_scheduler_runtime_logs.jsonl \
    --scenario queue_overflow=logs/queue_overflow_runtime_logs.jsonl \
    --scenario cpu_spike=logs/cpu_spike_runtime_logs.jsonl \
    --scenario task_crash=logs/task_crash_runtime_logs.jsonl \
    --scenario slow_task=logs/slow_task_runtime_logs.jsonl \
    --scenario dropped_messages=logs/dropped_messages_runtime_logs.jsonl \
    --scenario watchdog=logs/watchdog_runtime_logs.jsonl
echo
echo "========================================"
echo "[DEMO] Training ML anomaly classifier"
echo "========================================"

mkdir -p models

python3 ai-analyzer/ml/train_model.py \
    --dataset reports/generated/synthetic_dataset.csv \
    --model-output models/anomaly_classifier.joblib \
    --label-encoder-output models/label_encoder.joblib \
    --metrics-output reports/generated/model_metrics.json

echo
echo "========================================"
echo "[DEMO] Running ML predictions"
echo "========================================"

python3 ai-analyzer/ml/predict_model.py \
    --model models/anomaly_classifier.joblib \
    --label-encoder models/label_encoder.joblib \
    --dataset reports/generated/synthetic_dataset.csv \
    --limit 20
ls -1 logs/*runtime_logs.jsonl
