#!/usr/bin/env bash
# Runs from an isolated service directory prepared by prepare-live.sh.
set -euo pipefail
cd -- "$(dirname -- "$0")"
umask 077
sha256sum --check --status executable.sha256
sha256sum --check --status bundle.sha256
IFS= read -r origin < public-url.txt
[[ "$origin" =~ ^https://[a-z0-9-]+\.trycloudflare\.com$ ]] || {
  echo 'The public tunnel origin is unavailable or invalid.' >&2; exit 1;
}
jq --arg origin "$origin" '.configuration.origin.value=$origin' service.template.json > service.json.tmp
mv -- service.json.tmp service.json
IFS= read -r LKJSNS_BOOTSTRAP_SECRET < bootstrap.secret
export LKJSNS_BOOTSTRAP_SECRET
exec ./lkjscript serve --deployment "$PWD/service.json"
