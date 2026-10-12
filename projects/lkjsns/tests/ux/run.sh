#!/usr/bin/env bash
# Synthetic acceptance only; each run gets a new private data/object store.
set -euo pipefail
cd "$(dirname "$0")/../.."
source ops/runtime.sh
source ops/selection.sh
verify_runtime; verify_selection
command -v node >/dev/null; command -v jq >/dev/null; command -v openssl >/dev/null
port=${LKJSNS_TEST_PORT:-19381}
[[ "$port" =~ ^[0-9]{4,5}$ && "$port" -ge 1024 && "$port" -le 65534 ]] || exit 2
if ss -ltnH | awk '{print $4}' | grep -qE ":$port$"; then echo 'The test port is already in use.' >&2;exit 2;fi
umask 077
fixture=$(mktemp -d "$ROOT/runtime/ux-XXXXXXXX")
output=$(mktemp -d "$ROOT/.build/ux-XXXXXXXX")
export LKJSNS_TEST_FIXTURE=$fixture LKJSNS_TEST_OUTPUT=$output LKJSNS_TEST_URL="http://127.0.0.1:$port"
export LKJSNS_PLAYWRIGHT=${LKJSNS_PLAYWRIGHT:-playwright}
node -e 'require(process.env.LKJSNS_PLAYWRIGHT)' >/dev/null
"$LKJ" data initialize --root "$fixture/data" > "$output/initialize.log";mkdir "$fixture/objects"
cp "$selected/lkjsns.lkja" "$fixture/candidate.lkja";openssl rand -hex 32 > "$fixture/bootstrap.secret"
IFS= read -r LKJSNS_BOOTSTRAP_SECRET < "$fixture/bootstrap.secret";export LKJSNS_BOOTSTRAP_SECRET
jq --arg listen "127.0.0.1:$port" --arg origin "$LKJSNS_TEST_URL" '.listen=$listen|.configuration.origin.value=$origin' ops/development.json > "$fixture/service.json"
printf 'export LKJSNS_TEST_FIXTURE=%q\nexport LKJSNS_TEST_OUTPUT=%q\nexport LKJSNS_TEST_URL=%q\nexport LKJSNS_PLAYWRIGHT=%q\n' "$fixture" "$output" "$LKJSNS_TEST_URL" "$LKJSNS_PLAYWRIGHT" > "$output/environment.sh"
printf '%s\n' "$output" > .build/latest-ux-evidence
pid=''
cleanup(){ if [[ -n "$pid" ]];then kill -TERM "$pid" 2>/dev/null || true;wait "$pid" 2>/dev/null || true;fi; }
trap cleanup EXIT
start(){
 "$LKJ" serve --deployment "$fixture/service.json" >> "$output/server.log" 2>&1 & pid=$!
 export LKJSNS_TEST_SERVER_PID=$pid
 for _ in $(seq 1 150);do if curl -fsS --max-time 2 "$LKJSNS_TEST_URL/healthz" >/dev/null 2>&1;then return;fi;sleep .2;done
 echo 'The synthetic service did not become ready.' >&2;exit 1
}
start
node tests/browser/media-fixtures.cjs
for suite in ${LKJSNS_UX_SUITES:-accounts writing media search security transfer-recovery layout large no-script};do
 echo "--- $suite";node "tests/ux/$suite.cjs" 2>&1 | tee "$output/$suite.log"
done
"$LKJ" data verify --root "$fixture/data" > "$output/data-verify.log"
if [[ -f "$fixture/large.json" && -f "$fixture/pending-transfer.json" ]];then cleanup;pid='';start;node tests/ux/persistence.cjs 2>&1|tee "$output/persistence.log";fi
sha256sum "$fixture/candidate.lkja" > "$output/bundle.sha256"
find tests/ux -type f -print0|sort -z|xargs -0 sha256sum > "$output/tests.sha256"
printf 'Evidence: %s\n' "$output"
