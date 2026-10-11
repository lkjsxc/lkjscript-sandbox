#!/usr/bin/env bash
# A replacement quick tunnel must announce a new origin before the app restarts.
set -euo pipefail
cd -- "$(dirname -- "$0")"
umask 077
for attempt in $(seq 1 100); do
  origin=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' tunnel.log | tail -1 || true)
  if [[ "$origin" =~ ^https://[a-z0-9-]+\.trycloudflare\.com$ ]]; then
    printf '%s\n' "$origin" > public-url.txt.tmp
    mv -- public-url.txt.tmp public-url.txt
    exit 0
  fi
  sleep 1
done
echo 'The tunnel did not announce a valid HTTPS origin.' >&2
exit 1
