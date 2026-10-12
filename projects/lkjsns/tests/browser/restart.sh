#!/usr/bin/env bash
# Restart or independently restore only a stopped synthetic acceptance fixture.
# Usage: LKJSNS_PLAYWRIGHT=/installed/playwright bash restart.sh FIXTURE EVIDENCE restart|restore
set -euo pipefail
source "$(dirname -- "$0")/../../ops/runtime.sh"
source "$ROOT/ops/selection.sh"
verify_runtime
verify_selection
[[ $# == 3 && ( "$3" == restart || "$3" == restore ) ]] || {
  echo 'Supply a stopped synthetic fixture, its browser evidence, and restart or restore.' >&2
  exit 2
}
previous=$(readlink -f -- "$1")
evidence=$(readlink -f -- "$2")
phase=$3
[[ "$previous" == "$ROOT/runtime/browser-"* && -d "$previous/data" && -d "$previous/objects" ]]
[[ "$evidence" == "$ROOT/.build/browser-"* && -d "$evidence/media" ]]
[[ -f "$previous/test-accounts.json" && -f "$previous/flow-state.json" && -f "$previous/writing-state.json" ]]
[[ -z "$(find "$previous" -type l -print -quit)" ]]
if ps -eo args= | grep -F -- "$previous/" | grep -F 'serve --deployment' | grep -v grep >/dev/null; then
  echo 'Stop the source fixture before checking or copying it.' >&2
  exit 2
fi
[[ "$(sha256sum "$previous/candidate.lkja" | cut -d ' ' -f 1)" == "$selected_sha" ]]
jq -e '[.grants[] | select(.adapter.kind == "data" or .adapter.kind == "object_local") | .adapter.root] == ["data", "objects"]' "$previous/service.json" >/dev/null
port=${LKJSNS_RESTART_PORT:-19374}
[[ "$port" =~ ^[0-9]+$ && "$port" -ge 1024 && "$port" -le 65534 ]]
[[ -z "$(ss -H -ltn "sport = :$port")" ]]
umask 077
export LKJSNS_TEST_FIXTURE LKJSNS_TEST_OUTPUT LKJSNS_TEST_URL LKJSNS_PERSISTENCE_PHASE
LKJSNS_TEST_OUTPUT=$(mktemp -d "$ROOT/.build/persistence-XXXXXXXX")
LKJSNS_TEST_FIXTURE=$previous
if [[ "$phase" == restore ]]; then
  LKJSNS_TEST_FIXTURE=$(mktemp -d "$ROOT/runtime/browser-restored-XXXXXXXX")
  cp -a -- "$previous/." "$LKJSNS_TEST_FIXTURE/"
fi
cp -a -- "$evidence/media" "$LKJSNS_TEST_OUTPUT/media"
LKJSNS_TEST_URL="http://127.0.0.1:$port"
LKJSNS_PERSISTENCE_PHASE=$phase
jq --arg origin "$LKJSNS_TEST_URL" --arg listen "127.0.0.1:$port" \
  '.listen=$listen | .artifact="candidate.lkja" | .configuration.origin.value=$origin' \
  "$previous/service.json" > "$LKJSNS_TEST_FIXTURE/service-persistence.json"
sha256sum "$ROOT/tests/browser/"{restart.sh,persistence.cjs,writing-persistence.cjs,support.cjs} \
  > "$LKJSNS_TEST_OUTPUT/test-sources.sha256"
printf '%s\n' "$selected_sha" > "$LKJSNS_TEST_OUTPUT/bundle.sha256"
printf 'Phase: %s\nFixture: %s\nEvidence: %s\n' "$phase" "$LKJSNS_TEST_FIXTURE" "$LKJSNS_TEST_OUTPUT"
IFS= read -r LKJSNS_BOOTSTRAP_SECRET < "$LKJSNS_TEST_FIXTURE/bootstrap.secret"
export LKJSNS_BOOTSTRAP_SECRET
pid=''
stop() {
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill -TERM "$pid"
    wait "$pid" || true
  fi
  pid=''
}
trap stop EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
"$LKJ" serve --deployment "$LKJSNS_TEST_FIXTURE/service-persistence.json" \
  > "$LKJSNS_TEST_OUTPUT/server.log" 2>&1 &
pid=$!
for attempt in $(seq 1 80); do
  if curl --fail --silent "$LKJSNS_TEST_URL/healthz" >/dev/null; then break; fi
  kill -0 "$pid" 2>/dev/null || { cat "$LKJSNS_TEST_OUTPUT/server.log" >&2; exit 1; }
  sleep 0.25
done
curl --fail --silent "$LKJSNS_TEST_URL/healthz" >/dev/null
for test in persistence writing-persistence; do
  node "$ROOT/tests/browser/$test.cjs" 2>&1 | tee "$LKJSNS_TEST_OUTPUT/$test.log"
done
stop
printf 'Synthetic %s passed. The public service was not accessed or changed.\n' "$phase"
