#!/usr/bin/env bash
# Verify the real prepared native launcher on loopback, with an exact HTTPS Host.
set -euo pipefail
source "$(dirname -- "$0")/../../ops/runtime.sh"
source "$ROOT/ops/selection.sh"
verify_runtime
verify_selection
[[ $# == 1 && "$1" == /* && -x "$1" ]] || { echo 'Supply the installed cloudflared executable.' >&2; exit 2; }
port=19380
[[ -z "$(ss -H -ltn "sport = :$port")" ]]
umask 077
mkdir -p "$ROOT/.build" "$ROOT/runtime"
evidence=$(mktemp -d "$ROOT/.build/native-origin-XXXXXXXX")
parent=$(mktemp -d "$ROOT/runtime/browser-origin-XXXXXXXX")
fixture="$parent/service"
bash "$ROOT/ops/prepare-live.sh" "$fixture" https://social.example.test "$1" > "$evidence/prepare.log"
jq --arg listen "127.0.0.1:$port" '.listen=$listen' "$fixture/service.template.json" > "$fixture/template.next"
mv "$fixture/template.next" "$fixture/service.template.json"
sha256sum "$ROOT/tests/ops/native-origin.sh" > "$evidence/test-source.sha256"
cp "$selected/sources.sha256" "$evidence/sources.sha256"
printf '%s\n' "$selected_sha" > "$evidence/bundle.sha256"
pid=''
stop() { if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then kill -TERM "$pid"; wait "$pid" || true; fi; pid=''; }
trap stop EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
bash "$fixture/live-run.sh" > "$evidence/server.log" 2>&1 &
pid=$!
base="http://127.0.0.1:$port"
for attempt in $(seq 1 100); do
  if curl -fsS --max-time 1 -H 'Host: social.example.test' "$base/healthz" > "$evidence/health.txt" 2>/dev/null; then break; fi
  kill -0 "$pid" 2>/dev/null
  sleep .1
done
[[ "$(curl -sS -o /dev/null -w '%{http_code}' -H 'Host: social.example.test' "$base/healthz")" == 200 ]]
echo 'PASS prepared launcher starts the exact selected native bundle'
jq -e '.configuration.origin.value == "https://social.example.test"' "$fixture/service.json" >/dev/null
echo 'PASS exact custom origin reaches native configuration'
for host in example.invalid localhost old.trycloudflare.com social.example.test:443; do
  [[ "$(curl -sS -o /dev/null -w '%{http_code}' -H "Host: $host" "$base/healthz")" == 400 ]]
done
echo 'PASS unrelated, former, and altered Host values are rejected'
for origin in https://example.invalid https://old.trycloudflare.com null ''; do
  [[ "$(curl -sS -o /dev/null -w '%{http_code}' -H 'Host: social.example.test' -H "Origin: $origin" --data 'intent=logout&csrf=invalid' "$base/action")" == 403 ]]
done
echo 'PASS foreign, former, null, and absent origins are rejected'
[[ "$(curl -sS -o /dev/null -w '%{http_code}' -H 'Host: social.example.test' -H 'Origin: https://social.example.test' --data 'intent=logout&csrf=invalid' "$base/action")" == 403 ]]
echo 'PASS matching Origin does not bypass session and CSRF requirements'
curl -fsS -H 'Host: social.example.test' -D "$evidence/login.headers" "$base/login" > "$evidence/login.html"
grep -F '<html lang="en">' "$evidence/login.html" >/dev/null
grep -F "script-src 'none'" "$evidence/login.headers" >/dev/null
curl -fsS -H 'Host: social.example.test' "$base/style.css" > "$evidence/style.css"
cmp "$ROOT/web/style.css" "$evidence/style.css"
echo 'PASS English rendering, strict script policy, and exact stylesheet remain intact'
stop
printf 'Native launch checks passed: 6\nEvidence: %s\n' "$evidence"
