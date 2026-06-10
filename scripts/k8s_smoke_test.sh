#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL="${1:-http://localhost:30081}"
FRONTEND_URL="${2:-http://localhost:30080}"

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required to run scripts/k8s_smoke_test.sh"
  exit 2
fi

echo ""
echo "=== MiniRTOS Playground — Kubernetes Smoke Test ==="
echo "Backend:  $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo ""

fail=0

check() {
  local label="$1"
  local url="$2"
  local expected="$3"

  response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")

  if [ "$response" = "$expected" ]; then
    echo "  PASS  $label ($url) -> $response"
  else
    echo "  FAIL  $label ($url) -> got $response, expected $expected"
    fail=1
  fi
}

echo "--- Backend health ---"
check "actuator/health"           "$BACKEND_URL/actuator/health"           200
check "actuator/health/readiness" "$BACKEND_URL/actuator/health/readiness" 200
check "actuator/health/liveness"  "$BACKEND_URL/actuator/health/liveness"  200
check "api/health"                "$BACKEND_URL/api/health"                200
check "api/scenarios"             "$BACKEND_URL/api/scenarios"             200

echo ""
echo "--- Frontend health ---"
check "frontend /health"          "$FRONTEND_URL/health"                   200

echo ""
echo "--- CORS check (frontend origin -> backend) ---"
cors_header=$(curl -s -o /dev/null -D - --max-time 10 \
  -X OPTIONS "$BACKEND_URL/api/scenarios" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" \
  | grep -i "access-control-allow-origin" || echo "")

if echo "$cors_header" | grep -q "$FRONTEND_URL"; then
  echo "  PASS  CORS header present for $FRONTEND_URL"
else
  echo "  FAIL  CORS header missing or wrong for $FRONTEND_URL"
  echo "        Got: $cors_header"
  fail=1
fi

echo ""


echo ""
echo "--- Run history ---"
check "api/runs" "$BACKEND_URL/api/runs" 200

echo ""
if [ "$fail" -eq 0 ]; then
  echo "All checks passed."
else
  echo "One or more checks failed."
  exit 1
fi
