#!/usr/bin/env bash
# The worker only deletes retired object chunks outside data transactions.
set -euo pipefail
if [[ -n "${LKJSNS_GC_RUNTIME:-}" ]]; then
  LKJ=$LKJSNS_GC_RUNTIME
  [[ -x "$LKJ" && ! -L "$LKJ" ]] || { echo 'Invalid cleanup runtime.' >&2; exit 2; }
  [[ "$(sha256sum "$LKJ" | cut -d ' ' -f 1)" == e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9 ]] || { echo 'Cleanup runtime checksum mismatch.' >&2; exit 2; }
  [[ "$("$LKJ" --version)" == 'lkjscript 0.1.89' ]] || exit 2
else
  source "$(dirname -- "$0")/runtime.sh"
  verify_runtime
fi
[[ $# -ge 1 && $# -le 2 ]] || { echo 'Usage: gc-post-bodies.sh SERVICE_JSON [MAX_BATCHES]' >&2; exit 2; }
descriptor=$(realpath -e -- "$1")
[[ -f "$descriptor" && ! -L "$1" ]] || exit 2
limit=${2:-128}
[[ "$limit" =~ ^[1-9][0-9]{0,3}$ && "$limit" -le 1000 ]] || exit 2
umask 077
dir=$(dirname -- "$descriptor")
command=$(mktemp "$dir/.post-gc-XXXXXXXX")
result="$command.result"
log="$command.log"
trap 'rm -f -- "$command" "$result" "$log"' EXIT
jq '.target="post-body-gc" | .listen=null | .http=null | .session=null | .worker=null' "$descriptor" > "$command"
for ((batch=1; batch<=limit; batch++)); do
  rm -f -- "$result"
  if ! "$LKJ" run --deployment "$command" --result-file "$result" > "$log" 2>&1; then cat "$log" >&2; exit 1; fi
  status=$(jq -er 'select(type=="number" and (.==0 or .==1 or . == -1 or . == -2))' "$result")
  case "$status" in
    0) printf 'Post body cleanup complete; batches=%s.\n' "$((batch-1))"; exit 0 ;;
    1) ;;
    -1) echo 'Post body cleanup conflicted; the next run can retry.' >&2; exit 1 ;;
    -2) echo 'Post body cleanup found an invalid record and stopped.' >&2; exit 1 ;;
  esac
done
printf 'Post body cleanup reached its batch budget; another run will continue.\n'
