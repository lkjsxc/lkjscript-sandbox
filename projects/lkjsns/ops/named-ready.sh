#!/usr/bin/env bash
# A running process alone does not prove that Cloudflare accepted the connector.
set -euo pipefail
for attempt in $(seq 1 90); do
  if curl --fail --silent --show-error --max-time 2 http://127.0.0.1:8795/ready >/dev/null 2>&1; then
    exit 0
  fi
  sleep 1
done
echo 'The named tunnel has no ready connection to Cloudflare.' >&2
exit 1
