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
ls -1 logs/*runtime_logs.jsonl
