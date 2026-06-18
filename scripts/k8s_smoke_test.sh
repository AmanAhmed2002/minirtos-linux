#!/usr/bin/env bash
set -euo pipefail

APP_URL="${1:-http://localhost:30080}"
APP_URL="${APP_URL%/}"

if [[ "$APP_URL" != http://* && "$APP_URL" != https://* ]]; then
  APP_URL="http://$APP_URL"
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required to run scripts/k8s_smoke_test.sh"
  exit 2
fi

echo ""
echo "=== MiniRTOS Playground — ALB Smoke Test ==="
echo "App URL: $APP_URL"
echo ""

fail=0

check() {
  local label="$1"
  local url="$2"
  local expected="$3"
  local attempts="${4:-12}"
  local sleep_seconds="${5:-10}"
  local response="000"

  for attempt in $(seq 1 "$attempts"); do
    response=$(curl -L -s -o /dev/null -w "%{http_code}" --max-time 30 "$url" || echo "000")

    if [ "$response" = "$expected" ]; then
      echo "  PASS  $label ($url) -> $response"
      return 0
    fi

    echo "  WAIT  $label ($url) -> got $response, expected $expected [attempt $attempt/$attempts]"

    if [ "$attempt" -lt "$attempts" ]; then
      sleep "$sleep_seconds"
    fi
  done

  echo "  FAIL  $label ($url) -> got $response, expected $expected"
  fail=1
}

echo "--- Frontend ---"
check "frontend root" "$APP_URL/" 200

echo ""
echo "--- Backend through ALB /api path ---"
check "api/runs" "$APP_URL/api/runs" 200
check "api/health" "$APP_URL/api/health" 200

echo ""
if [ "$fail" -eq 0 ]; then
  echo "All checks passed."
else
  echo "One or more checks failed."
  exit 1
fi
