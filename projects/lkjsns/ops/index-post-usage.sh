#!/usr/bin/env bash
# Quiescent, idempotent Drive accounting migration. Never invoke while the service writes.
set -euo pipefail
source "$(dirname -- "$0")/runtime.sh"
verify_runtime
[[ $# == 1 ]] || { echo 'Usage: index-post-usage.sh SERVICE_JSON' >&2; exit 2; }
descriptor=$(realpath -e -- "$1")
[[ -f "$descriptor" && ! -L "$1" ]] || exit 2
umask 077
dir=$(dirname -- "$descriptor")
work=$(mktemp -d "$dir/.post-usage-XXXXXXXX")
command=$(mktemp "$dir/.post-usage-command-XXXXXXXX")
trap 'rm -f -- "$command"; rm -rf -- "$work"' EXIT
result="$work/result.json"
log="$work/run.log"
jq '.target="post-usage-status" | .listen=null | .http=null | .session=null | .worker=null' "$descriptor" > "$command"
rm -f -- "$result"
"$LKJ" run --deployment "$command" --result-file "$result" > "$log" 2>&1 || { cat "$log" >&2; exit 1; }
if jq -e '. == true' "$result" >/dev/null; then echo 'Post storage accounting is ready.'; exit 0; fi
jq -e '. == false' "$result" >/dev/null
: > "$work/rows.ndjson"
for mode in note index-page search-text post-share post-return post-alias; do
  cursor=''
  while :; do
    jq --arg mode "$mode" --arg cursor "$cursor"       '.target="post-usage-scan" | .listen=null | .http=null | .session=null | .worker=null |
       .configuration["post-usage-mode"]={"kind":"text","value":$mode} |
       .configuration["post-usage-cursor"]={"kind":"text","value":$cursor}' "$descriptor" > "$command"
    rm -f -- "$result"
    "$LKJ" run --deployment "$command" --result-file "$result" > "$log" 2>&1 || { cat "$log" >&2; exit 1; }
    jq -e '.valid == true and (.rows | type == "array") and (.next | type == "string") and all(.rows[]; .valid == true and (.amount | type == "number" and . >= 0))' "$result" >/dev/null || {
      echo 'Post inventory contains an invalid record; no service cutover was performed.' >&2; exit 1;
    }
    jq -c '.rows[]' "$result" >> "$work/rows.ndjson"
    next=$(jq -r '.next' "$result")
    [[ -n "$next" ]] || break
    [[ "$next" != "$cursor" && "$next" =~ ^[0-9a-f]+$ && ${#next} -le 32768 ]] || exit 1
    cursor=$next
  done
done
python3 - "$work/rows.ndjson" "$work/totals.tsv" <<'PY'
import collections, json, pathlib, re, sys
totals=collections.defaultdict(int)
for line in pathlib.Path(sys.argv[1]).read_text().splitlines():
    item=json.loads(line)
    owner=item["owner"]
    amount=item["amount"]
    if not re.fullmatch(r"[a-z0-9_-]{3,24}",owner) or not isinstance(amount,int) or amount<0:
        raise SystemExit("Invalid post inventory row")
    totals[owner]+=amount
with pathlib.Path(sys.argv[2]).open("w") as out:
    for owner, amount in sorted(totals.items()):
        if amount > 9223372036854775807: raise SystemExit("Post usage exceeds the accounting range")
        out.write(f"{owner}\t{amount}\n")
PY
apply() {
  local owner=$1 amount=$2
  jq --arg owner "$owner" --arg amount "$amount"     '.target="post-usage-apply" | .listen=null | .http=null | .session=null | .worker=null |
     .configuration["post-usage-owner"]={"kind":"text","value":$owner} |
     .configuration["post-usage-amount"]={"kind":"text","value":$amount}' "$descriptor" > "$command"
  rm -f -- "$result"
  "$LKJ" run --deployment "$command" --result-file "$result" > "$log" 2>&1 || { cat "$log" >&2; return 1; }
  jq -e '. == 0' "$result" >/dev/null || { echo 'Post accounting refused an inconsistent checkpoint.' >&2; return 1; }
}
while IFS=$'\t' read -r owner amount; do
  [[ -n "$owner" && "$amount" =~ ^[0-9]+$ ]]
  apply "$owner" "$amount"
done < "$work/totals.tsv"
apply '@finish' 0
printf 'Post storage accounting is ready; accounts=%s.\n' "$(wc -l < "$work/totals.tsv")"
