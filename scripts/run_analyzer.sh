#!/usr/bin/env bash
set -euo pipefail

LOG_PATH="${1:-logs/runtime_logs.jsonl}"
WINDOW_MS="${2:-5000}"

python3 ai-analyzer/app/analyze.py --log "$LOG_PATH" --window-ms "$WINDOW_MS"
