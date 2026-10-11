#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
umask 077
sha256sum --check --status tunnel.sha256
: > tunnel.log
exec ./cloudflared --no-autoupdate tunnel --protocol http2 \
  --url http://127.0.0.1:8796 --metrics 127.0.0.1:8795 \
  --logfile "$PWD/tunnel.log"
