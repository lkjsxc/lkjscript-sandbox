#!/usr/bin/env bash
# Optional local browser acceptance. Uses installed Playwright; never downloads it.
set -euo pipefail
source "$(dirname -- "$0")/runtime.sh"
source "$ROOT/ops/selection.sh"
verify_runtime
verify_selection
command -v node >/dev/null || { echo 'Node is required for optional browser tests only.' >&2; exit 1; }
node -e 'require(process.env.LKJSNS_PLAYWRIGHT || "playwright")' >/dev/null
port=${LKJSNS_TEST_PORT:-19373}
[[ "$port" =~ ^[0-9]+$ && "$port" -ge 1024 && "$port" -le 65534 ]]
if [[ -n "$(ss -H -ltn "sport = :$port")" ]]; then
  echo 'The requested loopback test port is already in use.' >&2; exit 1
fi
umask 077
mkdir -p "$ROOT/runtime" "$ROOT/.build"
export LKJSNS_TEST_FIXTURE
LKJSNS_TEST_FIXTURE=$(mktemp -d "$ROOT/runtime/browser-XXXXXXXX")
export LKJSNS_TEST_OUTPUT
LKJSNS_TEST_OUTPUT=$(mktemp -d "$ROOT/.build/browser-XXXXXXXX")
export LKJSNS_TEST_URL="http://127.0.0.1:$port"
mkdir "$LKJSNS_TEST_FIXTURE/objects"
"$LKJ" data initialize --root "$LKJSNS_TEST_FIXTURE/data" > "$LKJSNS_TEST_OUTPUT/initialize.log"
cp "$selected/lkjsns.lkja" "$LKJSNS_TEST_FIXTURE/candidate.lkja"
printf '%s\n' "$selected_sha" > "$LKJSNS_TEST_FIXTURE/bundle.sha256"
od -An -N32 -tx1 /dev/urandom | tr -d ' \n' > "$LKJSNS_TEST_FIXTURE/bootstrap.secret"
printf '\n' >> "$LKJSNS_TEST_FIXTURE/bootstrap.secret"
jq --arg origin "$LKJSNS_TEST_URL" --arg listen "127.0.0.1:$port" \
  '.artifact="candidate.lkja" | .listen=$listen | .configuration.origin.value=$origin' \
  "$ROOT/ops/development.json" > "$LKJSNS_TEST_FIXTURE/service.json"
IFS= read -r LKJSNS_BOOTSTRAP_SECRET < "$LKJSNS_TEST_FIXTURE/bootstrap.secret"
export LKJSNS_BOOTSTRAP_SECRET
pid=''
cleanup() {
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill -TERM "$pid"
    wait "$pid" || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
"$LKJ" serve --deployment "$LKJSNS_TEST_FIXTURE/service.json" > "$LKJSNS_TEST_OUTPUT/server.log" 2>&1 &
pid=$!
for attempt in $(seq 1 80); do
  if curl --fail --silent "$LKJSNS_TEST_URL/healthz" >/dev/null; then break; fi
  kill -0 "$pid" 2>/dev/null || { cat "$LKJSNS_TEST_OUTPUT/server.log" >&2; exit 1; }
  sleep 0.25
done
curl --fail --silent "$LKJSNS_TEST_URL/healthz" >/dev/null
printf 'Fixture: %s\nEvidence: %s\nBundle SHA256: %s\n' "$LKJSNS_TEST_FIXTURE" "$LKJSNS_TEST_OUTPUT" "$selected_sha"
sha256sum "$ROOT"/tests/browser/*.cjs > "$LKJSNS_TEST_OUTPUT/test-sources.sha256"
for test in media-fixtures account-smoke flows reading-context layout-security; do
  node "$ROOT/tests/browser/$test.cjs" 2>&1 | tee "$LKJSNS_TEST_OUTPUT/$test.log"
done
printf 'All selected browser suites completed. Public services were not changed.\n'
