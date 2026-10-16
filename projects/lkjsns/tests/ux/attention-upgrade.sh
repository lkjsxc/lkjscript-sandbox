#!/usr/bin/env bash
# Complete old-artifact -> native index -> new-artifact proof on synthetic data.
set -euo pipefail
cd "$(dirname "$0")/../.."
source ops/runtime.sh
source ops/selection.sh
verify_runtime; verify_selection
previous=${LKJSNS_PREVIOUS_ARTIFACT:?Set the exact preceding published bundle path.}
[[ -f "$previous" && ! -L "$previous" ]]
[[ "$(sha256sum "$previous" | cut -d ' ' -f 1)" == d389cb37ee6837c5534d0a0dba2141df88c23bcb97dec256283801791abbe741 ]]
port=${LKJSNS_TEST_PORT:-19383}
[[ "$port" =~ ^[0-9]{4,5}$ && "$port" -ge 1024 && "$port" -le 65534 ]]
if ss -ltnH|awk '{print $4}'|grep -qE ":$port$";then echo 'Test port in use.' >&2;exit 2;fi
umask 077
fixture=$(mktemp -d "$ROOT/runtime/attention-upgrade-XXXXXXXX")
output=$(mktemp -d "$ROOT/.build/attention-upgrade-XXXXXXXX")
export LKJSNS_TEST_FIXTURE=$fixture LKJSNS_TEST_OUTPUT=$output LKJSNS_TEST_URL="http://127.0.0.1:$port"
"$LKJ" data initialize --root "$fixture/data" > "$output/initialize.log"
mkdir "$fixture/objects";openssl rand -hex 32 > "$fixture/bootstrap.secret"
IFS= read -r LKJSNS_BOOTSTRAP_SECRET < "$fixture/bootstrap.secret";export LKJSNS_BOOTSTRAP_SECRET
cp -- "$previous" "$fixture/candidate.lkja"
jq --arg listen "127.0.0.1:$port" --arg origin "$LKJSNS_TEST_URL" '.listen=$listen|.configuration.origin.value=$origin' ops/development.json > "$fixture/service.json"
printf 'export LKJSNS_TEST_FIXTURE=%q\nexport LKJSNS_TEST_OUTPUT=%q\nexport LKJSNS_TEST_URL=%q\nexport LKJSNS_PLAYWRIGHT=%q\n' "$fixture" "$output" "$LKJSNS_TEST_URL" "$LKJSNS_PLAYWRIGHT" > "$output/environment.sh"
printf '%s\n' "$output" > .build/latest-attention-upgrade
pid=''
stop(){ if [[ -n "$pid" ]];then kill -TERM "$pid" 2>/dev/null||true;wait "$pid" 2>/dev/null||true;pid='';fi; }
trap stop EXIT
start(){
 "$LKJ" serve --deployment "$fixture/service.json" >> "$output/server.log" 2>&1 & pid=$!
 for _ in $(seq 1 150);do if curl -fsS --max-time 2 "$LKJSNS_TEST_URL/healthz" >/dev/null 2>&1;then return;fi;sleep .2;done
 echo 'Synthetic upgrade service did not become ready.' >&2;exit 1
}
start
node tests/ux/attention-upgrade.cjs before | tee "$output/before.log"
stop
cp -- "$selected/lkjsns.lkja" "$fixture/candidate.lkja"
# A single intentionally bounded batch stops part way without losing progress.
set +e
bash ops/index-attention.sh "$fixture/service.json" 1 > "$output/partial-index.log" 2>&1
status=$?
set -e
[[ "$status" == 3 ]] || { cat "$output/partial-index.log" >&2;echo 'Expected resumable partial indexing.' >&2;exit 1; }
start
# Incomplete indexes must never look like complete/empty relationship directories.
node - <<'NODE'
const {chromium,base,assert,session}=require('./tests/ux/support.cjs');
(async()=>{const b=await chromium.launch({headless:true});try{const c=await session(b);const r=await c.request.get(base+'/attention?user=testowner&direction=to');assert.equal(r.status(),503);}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
NODE
stop
bash ops/index-attention.sh "$fixture/service.json" | tee "$output/completed-index.log"
# Already complete: one read-only batch, no additional event generation.
bash ops/index-attention.sh "$fixture/service.json" | tee "$output/repeated-index.log"
start
node tests/ux/attention-upgrade.cjs after | tee "$output/after.log"
stop
"$LKJ" data verify --root "$fixture/data" > "$output/data-verify.log"
sha256sum "$fixture/candidate.lkja" > "$output/bundle.sha256"
printf 'Upgrade evidence: %s\n' "$output"
