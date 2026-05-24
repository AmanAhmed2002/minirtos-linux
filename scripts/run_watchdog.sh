#!/usr/bin/env bash
set -euo pipefail

./cpp-runtime/build/minirtos_runtime --config configs/watchdog_slow_task.json
