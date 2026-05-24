#!/usr/bin/env bash
set -euo pipefail

mkdir -p logs

echo "========================================"
echo "[DEMO] MiniRTOS-Linux Docker Demo"
echo "========================================"

echo
echo "========================================"
echo "[DEMO] Running normal scenario"
echo "========================================"
./cpp-runtime/build/minirtos_runtime --config configs/normal.json
cp logs/runtime_logs.jsonl logs/normal_runtime_logs.jsonl
python3 ai-analyzer/app/analyze.py --log logs/normal_runtime_logs.jsonl --window-ms 5000

echo
echo "========================================"
echo "[DEMO] Running slow task fault scenario"
echo "========================================"
./cpp-runtime/build/minirtos_runtime --config configs/slow_task.json
cp logs/runtime_logs.jsonl logs/slow_task_runtime_logs.jsonl
python3 ai-analyzer/app/analyze.py --log logs/slow_task_runtime_logs.jsonl --window-ms 5000

echo
echo "========================================"
echo "[DEMO] Running dropped messages fault scenario"
echo "========================================"
./cpp-runtime/build/minirtos_runtime --config configs/dropped_messages.json
cp logs/runtime_logs.jsonl logs/dropped_messages_runtime_logs.jsonl
python3 ai-analyzer/app/analyze.py --log logs/dropped_messages_runtime_logs.jsonl --window-ms 5000

echo
echo "========================================"
echo "[DEMO] Running watchdog scenario"
echo "========================================"
./cpp-runtime/build/minirtos_runtime --config configs/watchdog_slow_task.json
cp logs/runtime_logs.jsonl logs/watchdog_runtime_logs.jsonl
python3 ai-analyzer/app/analyze.py --log logs/watchdog_runtime_logs.jsonl --window-ms 5000

echo
echo "========================================"
echo "[DEMO] Docker demo completed successfully"
echo "========================================"
echo "[DEMO] Generated logs:"
ls -1 logs/*runtime_logs.jsonl
