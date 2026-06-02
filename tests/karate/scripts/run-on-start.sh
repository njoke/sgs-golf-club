#!/bin/sh
set -eu

backend_health_url="${WAIT_BACKEND_HEALTH_URL:-http://backend:4000/health}"
wait_timeout_ms="${WAIT_TIMEOUT_MS:-180000}"
wait_interval_ms="${WAIT_INTERVAL_MS:-2000}"
wait_timeout_secs=$((wait_timeout_ms / 1000))
wait_interval_secs=$((wait_interval_ms / 1000))
if [ "${wait_interval_secs}" -lt 1 ]; then
  wait_interval_secs=1
fi

started_at="$(date +%s)"

while true; do
  if curl -fsS "$backend_health_url" >/dev/null; then
    echo "[karate-wait] backend ready at $backend_health_url"
    break
  fi

  now="$(date +%s)"
  elapsed=$((now - started_at))
  if [ "$elapsed" -ge "$wait_timeout_secs" ]; then
    echo "[karate-wait] timed out waiting for backend at $backend_health_url" >&2
    exit 1
  fi

  echo "[karate-wait] backend unavailable, retrying..."
  sleep "$wait_interval_secs"
done

mvn test -DbaseUrl="${KARATE_BASE_URL:-http://backend:4000/graphql}"
