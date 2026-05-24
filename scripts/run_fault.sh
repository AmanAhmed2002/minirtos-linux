#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
    echo "Usage: ./scripts/run_fault.sh <path-to-fault-config.json>"
    echo "Example: ./scripts/run_fault.sh configs/slow_task.json"
    exit 1
fi

./cpp-runtime/build/minirtos_runtime --config "$1"
