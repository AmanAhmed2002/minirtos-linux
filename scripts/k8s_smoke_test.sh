#!/usr/bin/env bash
set -euo pipefail

APP_URL="${1:-http://localhost:30080}"
APP_URL="${APP_URL%/}"

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

  response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$url" || echo "000")

  if [ "$response" = "$expected" ]; then
    echo "  PASS  $label ($url) -> $response"
  else
    echo "  FAIL  $label ($url) -> got $response, expected $expected"
    fail=1
  fi
}

echo "--- Frontend ---"
check "frontend root"    "$APP_URL/"       200
check "frontend health"  "$APP_URL/health" 200

echo ""
echo "--- Backend through ALB /api path ---"
check "api/health"    "$APP_URL/api/health"    200
check "api/scenarios" "$APP_URL/api/scenarios" 200
check "api/runs"      "$APP_URL/api/runs"      200

echo ""
if [ "$fail" -eq 0 ]; then
  echo "All checks passed."
else
  echo "One or more checks failed."
  exit 1
fi
