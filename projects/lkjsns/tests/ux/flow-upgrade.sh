#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source ops/runtime.sh
source ops/selection.sh
verify_runtime; verify_selection
old=${LKJSNS_PREVIOUS_ARTIFACT:?Supply the exact previous public artifact.}
[[ "$(sha256sum "$old" | cut -d ' ' -f1)" == 611d0fa2e469066a4749f510df08f829f8e8eb65de1cdec76e95844e3b892205 ]]
port=19383
if ss -ltnH|awk '{print $4}'|grep -qE ":$port$";then exit 2;fi
umask 077
fixture=$(mktemp -d "$ROOT/runtime/flow-upgrade-XXXXXXXX")
output=$(mktemp -d "$ROOT/.build/flow-upgrade-XXXXXXXX")
export LKJSNS_TEST_FIXTURE=$fixture LKJSNS_TEST_OUTPUT=$output LKJSNS_TEST_URL="http://127.0.0.1:$port" LKJSNS_PLAYWRIGHT=${LKJSNS_PLAYWRIGHT:-playwright}
"$LKJ" data initialize --root "$fixture/data" > "$output/initialize.log";mkdir "$fixture/objects"
cp "$old" "$fixture/candidate.lkja";openssl rand -hex 32 > "$fixture/bootstrap.secret"
IFS= read -r LKJSNS_BOOTSTRAP_SECRET < "$fixture/bootstrap.secret";export LKJSNS_BOOTSTRAP_SECRET
jq --arg listen "127.0.0.1:$port" --arg origin "$LKJSNS_TEST_URL" '.listen=$listen|.configuration.origin.value=$origin' ops/development.json > "$fixture/service.json"
printf 'export LKJSNS_TEST_FIXTURE=%q\nexport LKJSNS_TEST_OUTPUT=%q\nexport LKJSNS_TEST_URL=%q\nexport LKJSNS_PLAYWRIGHT=%q\n' "$fixture" "$output" "$LKJSNS_TEST_URL" "$LKJSNS_PLAYWRIGHT" > "$output/environment.sh"
printf '%s\n' "$output" > .build/latest-flow-upgrade
"$LKJ" serve --deployment "$fixture/service.json" > "$output/server-before.log" 2>&1 & pid=$!
trap 'kill -TERM "$pid" 2>/dev/null||true;wait "$pid" 2>/dev/null||true' EXIT
ready=0;for _ in $(seq 1 150);do if curl -fsS --max-time 2 "$LKJSNS_TEST_URL/healthz" >/dev/null 2>&1;then ready=1;break;fi;sleep .2;done
[[ "$ready" == 1 ]]
node tests/browser/media-fixtures.cjs
node tests/ux/flow-upgrade.cjs before | tee "$output/before.log"
printf 'Historical fixture seeded: %s\n' "$output"

kill -TERM "$pid";wait "$pid" || true
trap - EXIT
cp "$selected/lkjsns.lkja" "$fixture/candidate.lkja"
pid=''
stop(){ if [[ -n "$pid" ]];then kill -TERM "$pid" 2>/dev/null||true;wait "$pid" 2>/dev/null||true;pid='';fi; }
trap stop EXIT
start(){
 "$LKJ" serve --deployment "$fixture/service.json" >> "$output/server-after.log" 2>&1 & pid=$!
 for _ in $(seq 1 150);do if curl -fsS --max-time 2 "$LKJSNS_TEST_URL/healthz" >/dev/null 2>&1;then return;fi;sleep .2;done
 echo 'Synthetic service failed to start.' >&2;exit 1
}
# A partial alias index must fail closed instead of emitting broken post links.
set +e
bash ops/index-posts.sh "$fixture/service.json" 1 > "$output/partial-index.log" 2>&1
status=$?
set -e
[[ "$status" == 3 ]] || { cat "$output/partial-index.log";echo 'Expected a resumable incomplete batch.' >&2;exit 1; }
start
node - <<'NODE'
const {chromium,base,assert,session}=require('./tests/ux/support.cjs');(async()=>{const b=await chromium.launch();try{const c=await session(b);assert.equal((await c.request.get(base+'/@testowner')).status(),503);const r=await c.request.post(base+'/action',{form:{intent:'logout',csrf:'invalid'},headers:{Origin:base},maxRedirects:0});assert.equal(r.status(),503);}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
NODE
stop
bash ops/index-attention.sh "$fixture/service.json" > "$output/attention-index.log"
bash ops/index-posts.sh "$fixture/service.json" > "$output/completed-index.log"
bash ops/index-posts.sh "$fixture/service.json" > "$output/repeated-index.log"
start
node tests/ux/flow-upgrade.cjs after | tee "$output/after.log"
stop
"$LKJ" data verify --root "$fixture/data" > "$output/data-verify.log"
sha256sum "$fixture/candidate.lkja" > "$output/bundle.sha256"
printf 'Verified legacy-store reading-flow upgrade: %s\n' "$output"
