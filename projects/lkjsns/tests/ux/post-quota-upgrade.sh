#!/usr/bin/env bash
set -euo pipefail
source ops/runtime.sh
source ops/selection.sh
verify_runtime
verify_selection
old_bundle=${LKJSNS_OLD_BUNDLE:?Set LKJSNS_OLD_BUNDLE to the previous production bundle}
[[ "$(sha256sum "$old_bundle" | cut -d ' ' -f 1)" == d10fe7850c4f04344208290c697287b54f9afccd629d7378ef74f51d432efa1e ]] || { echo 'Previous bundle checksum mismatch.' >&2; exit 2; }
port=${LKJSNS_UPGRADE_PORT:-19383}
if ss -ltnH | awk '{print $4}' | grep -qE ":$port$"; then echo 'Synthetic port in use.' >&2; exit 1; fi
umask 077
fixture=$(mktemp -d "$ROOT/runtime/post-quota-upgrade-XXXXXXXX")
output=$(mktemp -d "$ROOT/.build/post-quota-upgrade-XXXXXXXX")
export LKJSNS_TEST_FIXTURE="$fixture" LKJSNS_TEST_OUTPUT="$output" LKJSNS_TEST_URL="http://127.0.0.1:$port"
export LKJSNS_PLAYWRIGHT=${LKJSNS_PLAYWRIGHT:-playwright}
"$LKJ" data initialize --root "$fixture/data" > "$output/initialize.log"
mkdir "$fixture/objects"
cp "$old_bundle" "$fixture/candidate.lkja"
openssl rand -hex 32 > "$fixture/bootstrap.secret"
IFS= read -r LKJSNS_BOOTSTRAP_SECRET < "$fixture/bootstrap.secret"; export LKJSNS_BOOTSTRAP_SECRET
jq --arg listen "127.0.0.1:$port" --arg origin "$LKJSNS_TEST_URL" '.listen=$listen|.configuration.origin.value=$origin' ops/development.json > "$fixture/service.json"
printf '%s\n' "$output" > "$ROOT/.build/latest-post-quota-upgrade"
bash ops/index-attention.sh "$fixture/service.json" > "$output/attention.log" 2>&1
command=$(mktemp "$fixture/.old-index-XXXXXXXX")
result="$fixture/.old-index-result"
trap 'rm -f -- "$command" "$result"' EXIT
jq '.target="post-index" | .listen=null | .http=null | .session=null | .worker=null' "$fixture/service.json" > "$command"
for _ in $(seq 1 1000); do
 rm -f "$result"
 "$LKJ" run --deployment "$command" --result-file "$result" > "$output/old-index.log" 2>&1
 [[ $(cat "$result") == 0 ]] && break
 [[ $(cat "$result") == 1 ]]
done
rm -f "$command" "$result";trap - EXIT
"$LKJ" serve --deployment "$fixture/service.json" > "$output/server-before.log" 2>&1 & pid=$!
stop(){ if [[ -n "$pid" ]]; then kill -TERM "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; pid=''; fi; }
trap stop EXIT
ready=0;for _ in $(seq 1 150); do if curl -fsS --max-time 2 "$LKJSNS_TEST_URL/healthz" >/dev/null 2>&1; then ready=1;break;fi;sleep .2;done
[[ $ready == 1 ]]
node tests/browser/media-fixtures.cjs
for suite in accounts writing link-only; do node "tests/ux/$suite.cjs" > "$output/before-$suite.log" 2>&1 || { tail -30 "$output/before-$suite.log"; exit 1; }; done
node - <<'NODE'
const {chromium,session,goto,fixture,path,fs}=require('./tests/ux/support.cjs');
(async()=>{const b=await chromium.launch();try{for(const role of ['owner','member']){const c=await session(b,role),p=await c.newPage();await goto(p,'/drive');fs.writeFileSync(path.join(fixture,role+'-usage-before'),await p.locator('.quota progress').getAttribute('value'));await c.close();}}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
NODE
stop
cp -a --reflink=auto "$fixture/data" "$fixture/data-before-migration"
cp -a --reflink=auto "$fixture/objects" "$fixture/objects-before-migration"
cp "$selected/lkjsns.lkja" "$fixture/candidate.lkja"
head_before=$(sha256sum "$fixture/data/HEAD" | cut -d ' ' -f 1)
"$LKJ" serve --deployment "$fixture/service.json" > "$output/server-unmigrated.log" 2>&1 & pid=$!
ready=0;for _ in $(seq 1 150); do if curl -fsS --max-time 2 "$LKJSNS_TEST_URL/healthz" >/dev/null 2>&1; then ready=1;break;fi;sleep .2;done
[[ $ready == 1 ]]
[[ $(curl -sS -o /dev/null -w '%{http_code}' "$LKJSNS_TEST_URL/") == 503 ]]
[[ $(curl -sS -o /dev/null -w '%{http_code}' -X POST --data '' "$LKJSNS_TEST_URL/action") == 503 ]]
stop
[[ $(sha256sum "$fixture/data/HEAD" | cut -d ' ' -f 1) == "$head_before" ]]
bash ops/index-posts.sh "$fixture/service.json" > "$output/migrate.log" 2>&1 || { tail -30 "$output/migrate.log"; exit 1; }
bash ops/index-posts.sh "$fixture/service.json" > "$output/repeat.log" 2>&1 || { tail -30 "$output/repeat.log"; exit 1; }
"$LKJ" data verify --root "$fixture/data" > "$output/data-verify.log"
"$LKJ" serve --deployment "$fixture/service.json" > "$output/server-after.log" 2>&1 & pid=$!
ready=0;for _ in $(seq 1 150); do if curl -fsS --max-time 2 "$LKJSNS_TEST_URL/healthz" >/dev/null 2>&1; then ready=1;break;fi;sleep .2;done
[[ $ready == 1 ]]
node - <<'NODE'
const {chromium,session,goto,fixture,path,fs,assert,load}=require('./tests/ux/support.cjs');
(async()=>{const b=await chromium.launch();try{for(const role of ['owner','member']){const c=await session(b,role),p=await c.newPage();await goto(p,'/drive');const before=Number(fs.readFileSync(path.join(fixture,role+'-usage-before'))),after=Number(await p.locator('.quota progress').getAttribute('value'));assert(after>before,role+' did not include existing post storage');assert((await p.locator('.quota').innerText()).includes('Posts'));await c.close();}
const c=await session(b),p=await c.newPage(),posts=load('posts');await goto(p,'/'+posts.publicId);assert((await p.locator('body').innerText()).includes('A small observation from the riverside.'));await goto(p,'/compose?id='+posts.protectedDraft);assert.equal(await p.locator('[name=body]').inputValue(),'Newest private draft nebula.');await c.close();
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
NODE
echo "Verified existing post and file accounting, idempotence and data preservation: $output"
