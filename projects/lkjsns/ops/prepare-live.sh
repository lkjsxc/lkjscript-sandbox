#!/usr/bin/env bash
# Prepare a fresh, self-contained service. Does not stop, start or expose anything.
set -euo pipefail
source "$(dirname -- "$0")/runtime.sh"
source "$ROOT/ops/selection.sh"
source "$ROOT/ops/origin.sh"
verify_runtime
verify_selection
if [[ $# != 3 ]]; then
  echo 'Usage: prepare-live.sh /absolute/new-service-directory https://app.example.com /absolute/cloudflared' >&2
  exit 2
fi
live=$1 origin=$2 tunnel=$3
[[ "$live" == /* && "$tunnel" == /* && -x "$tunnel" ]]
valid_public_origin "$origin"
[[ ! -e "$live" ]] || { echo 'Refusing to overwrite an existing service directory.' >&2; exit 1; }
umask 077
mkdir -p -- "$live/objects"
cp -- "$LKJ" "$live/lkjscript"
cp -- "$tunnel" "$live/cloudflared"
cp -- "$selected/lkjsns.lkja" "$live/app.lkja"
for script in live-run.sh origin.sh named-tunnel.sh named-ready.sh tunnel-start.sh tunnel-ready.sh; do
  cp -- "$ROOT/ops/$script" "$live/$script"
done
"$live/lkjscript" data initialize --root "$live/data"
od -An -N32 -tx1 /dev/urandom | tr -d ' \n' > "$live/bootstrap.secret"
printf '\n' >> "$live/bootstrap.secret"
printf '%s\n' "$origin" > "$live/public-url.txt"
jq '.artifact="app.lkja" | .listen="127.0.0.1:8796"' \
  "$ROOT/ops/development.json" > "$live/service.template.json"
printf '%s  app.lkja\n' "$selected_sha" > "$live/bundle.sha256"
(cd -- "$live"; sha256sum lkjscript > executable.sha256; sha256sum cloudflared > tunnel.sha256)
cp -- "$selected/sources.sha256" "$live/sources.sha256"
printf '%s\n' "$selected" > "$live/build-selection.txt"
echo 'Fresh native service prepared. Provision a private named-tunnel token separately when needed.'
echo 'No account, publication, or service cutover has occurred.'
