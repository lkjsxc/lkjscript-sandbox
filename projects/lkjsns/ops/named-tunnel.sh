#!/usr/bin/env bash
# A remotely managed named tunnel. Its token grants only this tunnel's connection.
set -euo pipefail
cd -- "$(dirname -- "$0")"
umask 077
sha256sum --check --status tunnel.sha256
[[ -f tunnel.token && ! -L tunnel.token ]] || { echo 'Missing private tunnel token file.' >&2; exit 1; }
mode=$(stat -c '%a' tunnel.token)
[[ "$mode" == 600 || "$mode" == 400 ]] || { echo 'Tunnel token must have owner-only permissions.' >&2; exit 1; }
unset TUNNEL_TOKEN
exec ./cloudflared --no-autoupdate tunnel --protocol http2 \
  --metrics 127.0.0.1:8795 run --token-file "$PWD/tunnel.token"
