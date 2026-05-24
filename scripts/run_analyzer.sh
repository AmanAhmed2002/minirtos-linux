#!/usr/bin/env bash
set -euo pipefail

LOG_PATH="${1:-logs/runtime_logs.jsonl}"

python3 ai-analyzer/app/analyze.py --log "$LOG_PATH"
