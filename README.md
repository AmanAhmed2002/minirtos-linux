# MiniRTOS-Linux

Software-only C++20 embedded runtime simulator with Python AI-based fault detection.

## Current Status

Phase 1 scaffold is complete:

- Basic C++20 runtime executable
- CMake + Ninja build setup
- Basic Python analyzer placeholder
- Linux shell scripts for build/run commands

## Build the C++ Runtime

```bash
./scripts/build_cpp.sh

## Docker Demo

MiniRTOS-Linux can run inside Docker so the runtime, fault scenarios, watchdog behavior, and Python analyzer can be demonstrated without manually setting up a local C++/Python environment.

### Build Docker Images

```bash
docker compose build
