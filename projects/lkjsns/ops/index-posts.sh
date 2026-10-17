#!/usr/bin/env bash
# Offline, resumable native post-address indexing. No HTTP endpoint or account login.
# Call only with the selected service stopped; preserve its private snapshot first.
set -euo pipefail
source "$(dirname -- "$0")/runtime.sh"
verify_runtime
[[ $# -ge 1 && $# -le 2 ]] || { echo 'Usage: index-posts.sh SERVICE_JSON [MAX_STEPS]' >&2; exit 2; }
descriptor=$(realpath -e -- "$1")
[[ -f "$descriptor" && ! -L "$1" ]] || exit 2
steps=${2:-100000}
[[ "$steps" =~ ^[1-9][0-9]{0,5}$ && "$steps" -le 100000 ]] || exit 2
umask 077
dir=$(dirname -- "$descriptor")
command=$(mktemp "$dir/.post-index-XXXXXXXX")
result="$command.result"
log="$command.log"
cleanup() { rm -f -- "$command" "$result" "$log"; }
trap cleanup EXIT
jq '.target="post-index" | .listen=null | .http=null | .session=null | .worker=null' "$descriptor" > "$command"
for ((step=1; step<=steps; step++)); do
  rm -f -- "$result"
  if ! "$LKJ" run --deployment "$command" --result-file "$result" > "$log" 2>&1; then
    cat "$log" >&2; exit 1
  fi
  status=$(jq -er 'select(type=="number" and (.==0 or .==1 or . == -1 or . == -2))' "$result")
  case "$status" in
    0) printf 'Post address index ready; native batches=%s.\n' "$step"; exit 0 ;;
    1) ;;
    *) echo 'Post address indexing refused a conflict or colliding address. Existing aliases were not overwritten; inspect the checkpoint before resuming.' >&2; exit 1 ;;
  esac
done
printf 'Post address indexing checkpoint retained after %s batches; resume before serving.\n' "$steps" >&2
exit 3
