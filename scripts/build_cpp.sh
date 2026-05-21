#!/usr/bin/env bash
set -euo pipefail

cmake -S cpp-runtime -B cpp-runtime/build -G Ninja
cmake --build cpp-runtime/build
