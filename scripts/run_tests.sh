#!/usr/bin/env bash
set -euo pipefail

echo "[INFO] Configuring C++ build"
cmake -S cpp-runtime -B cpp-runtime/build -G Ninja

echo "[INFO] Building C++ runtime and tests"
cmake --build cpp-runtime/build

echo "[INFO] Running C++ tests"
ctest --test-dir cpp-runtime/build --output-on-failure

echo "[INFO] Checking Python test dependency"
python3 - <<'PY'
try:
    import pytest  # noqa: F401
except ModuleNotFoundError:
    raise SystemExit(
        "[ERROR] pytest is not installed. Install it with: python3 -m pip install pytest"
    )
PY

echo "[INFO] Running Python tests"
python3 -m pytest ai-analyzer/tests -q

echo "[INFO] All tests passed"
