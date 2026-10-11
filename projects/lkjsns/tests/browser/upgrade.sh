#!/usr/bin/env bash
# Cross-build upgrade and binary rollback on a stopped synthetic fixture only.
# Usage: LKJSNS_PLAYWRIGHT=/installed/playwright bash tests/browser/upgrade.sh FIXTURE EVIDENCE
set -euo pipefail
source "$(dirname -- "$0")/../../ops/runtime.sh"
source "$ROOT/ops/selection.sh"
verify_runtime
verify_selection
[[ $# == 2 ]] || { echo 'Supply a stopped synthetic fixture and its browser evidence directory.' >&2; exit 2; }
previous=$(readlink -f -- "$1")
evidence=$(readlink -f -- "$2")
[[ "$previous" == "$ROOT/runtime/browser-"* && -d "$previous/data" && -d "$previous/objects" ]]
[[ "$evidence" == "$ROOT/.build/browser-"* && -d "$evidence/media" ]]
[[ -f "$previous/test-accounts.json" && -f "$previous/flow-state.json" && -f "$previous/candidate.lkja" ]]
[[ -z "$(find "$previous" -type l -print -quit)" ]]
if ps -eo args= | grep -F -- "serve --deployment $previous/" | grep -v grep >/dev/null; then
  echo 'Stop the source fixture before copying it.' >&2; exit 2
fi
jq -e '[.grants[] | select(.adapter.kind == "data" or .adapter.kind == "object_local") | .adapter.root] == ["data", "objects"]' "$previous/service.json" >/dev/null
port=${LKJSNS_UPGRADE_PORT:-19375}
[[ "$port" =~ ^[0-9]+$ && "$port" -ge 1024 && "$port" -le 65534 ]]
[[ -z "$(ss -H -ltn "sport = :$port")" ]]
umask 077
export LKJSNS_TEST_FIXTURE LKJSNS_TEST_OUTPUT LKJSNS_TEST_URL
LKJSNS_TEST_FIXTURE=$(mktemp -d "$ROOT/runtime/browser-upgraded-XXXXXXXX")
LKJSNS_TEST_OUTPUT=$(mktemp -d "$ROOT/.build/upgrade-XXXXXXXX")
LKJSNS_TEST_URL="http://127.0.0.1:$port"
cp -a -- "$previous/." "$LKJSNS_TEST_FIXTURE/"
cp -a -- "$evidence/media" "$LKJSNS_TEST_OUTPUT/media"
old_sha=$(sha256sum "$previous/candidate.lkja" | cut -d ' ' -f 1)
[[ "$old_sha" == "$(head -n 1 "$previous/bundle.sha256")" ]]
printf 'Source fixture: %s\nCopied fixture: %s\nEvidence: %s\nOld bundle: %s\nNew bundle: %s\n' \
  "$previous" "$LKJSNS_TEST_FIXTURE" "$LKJSNS_TEST_OUTPUT" "$old_sha" "$selected_sha"
sha256sum "$ROOT/tests/browser/upgrade.sh" "$ROOT/tests/browser/persistence.cjs" > "$LKJSNS_TEST_OUTPUT/test-sources.sha256"
jq --arg origin "$LKJSNS_TEST_URL" --arg listen "127.0.0.1:$port" \
  '.listen=$listen | .artifact="candidate.lkja" | .configuration.origin.value=$origin' \
  "$previous/service.json" > "$LKJSNS_TEST_FIXTURE/service.json"
IFS= read -r LKJSNS_BOOTSTRAP_SECRET < "$LKJSNS_TEST_FIXTURE/bootstrap.secret"
export LKJSNS_BOOTSTRAP_SECRET
pid=''
stop() {
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill -TERM "$pid"; wait "$pid" || true
  fi
  pid=''
}
trap stop EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
phase() {
  local name=$1 bundle=$2 expected=$3
  [[ -z "$pid" ]]
  cp -- "$bundle" "$LKJSNS_TEST_FIXTURE/candidate.lkja"
  [[ "$(sha256sum "$LKJSNS_TEST_FIXTURE/candidate.lkja" | cut -d ' ' -f 1)" == "$expected" ]]
  printf '%s\n' "$expected" > "$LKJSNS_TEST_FIXTURE/bundle.sha256"
  "$LKJ" serve --deployment "$LKJSNS_TEST_FIXTURE/service.json" > "$LKJSNS_TEST_OUTPUT/server-$name.log" 2>&1 &
  pid=$!
  for attempt in $(seq 1 80); do
    if curl --fail --silent "$LKJSNS_TEST_URL/healthz" >/dev/null; then break; fi
    kill -0 "$pid" 2>/dev/null || { cat "$LKJSNS_TEST_OUTPUT/server-$name.log" >&2; return 1; }
    sleep 0.25
  done
  curl --fail --silent "$LKJSNS_TEST_URL/healthz" >/dev/null
  export LKJSNS_PERSISTENCE_PHASE="$name"
  node "$ROOT/tests/browser/persistence.cjs" 2>&1 | tee "$LKJSNS_TEST_OUTPUT/persistence-$name.log"
  stop
}
phase upgrade "$selected/lkjsns.lkja" "$selected_sha"
# No data restore: the previous artifact must read the data after the upgrade ran.
phase rollback "$previous/candidate.lkja" "$old_sha"
printf '%s\n' "$selected_sha" > "$LKJSNS_TEST_OUTPUT/upgraded-bundle.sha256"
printf '%s\n' "$old_sha" > "$LKJSNS_TEST_OUTPUT/rollback-bundle.sha256"
printf 'Synthetic cross-build upgrade and rollback passed. Public state was not touched.\n'
