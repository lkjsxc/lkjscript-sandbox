#!/usr/bin/env bash
# Rebuild only the accepted checkpoint. This script does not author missing UI work.
set -euo pipefail
source "$(dirname -- "$0")/runtime.sh"
verify_runtime
umask 077
mkdir -p "$ROOT/.build"
work=$(mktemp -d "$ROOT/.build/bootstrap-XXXXXXXX")
project="$work/project"
"$LKJ" new "$project" --template web-editor --name lkjsns > "$work/new.log"
apply_fragment() {
  local name=$1 revision token
  shift
  revision=$("$LKJ" --project "$project" status | sed -n 's/^revision id=\([^ ]*\).*/\1/p')
  [[ "$revision" =~ ^rev_[0-9a-f]{64}$ ]]
  {
    printf 'request base=%s\ndeclarations.begin\n(units\n' "$revision"
    cat "$ROOT/src/00-types.lkjc"
    for source in "$@"; do cat "$ROOT/src/$source.lkjc"; done
    printf ')\ndeclarations.end\n'
  } > "$work/$name.request.lkjc"
  if ! "$LKJ" --project "$project" change plan --input-file "$work/$name.request.lkjc" > "$work/$name.plan.log" 2>&1; then
    cat "$work/$name.plan.log" >&2; exit 1
  fi
  token=$(sed -n 's/^plan token=\([^ ]*\).*/\1/p' "$work/$name.plan.log")
  [[ "$token" =~ ^plan_[0-9a-f]+$ ]]
  if ! "$LKJ" --project "$project" change apply --input-file "$work/$name.request.lkjc" --plan "$token" > "$work/$name.apply.log" 2>&1; then
    cat "$work/$name.apply.log" >&2; exit 1
  fi
  printf 'Accepted %s\n' "$name"
}
apply_fragment boundary service http
for name in util db page assets auth access codec social compose notes drive delivery; do
  apply_fragment "$name" "$name"
done
"$LKJ" --project "$project" check | tee "$work/check.log"
"$LKJ" --project "$project" build --output "$work/lkjsns-checkpoint.lkja" | tee "$work/build.log"
sha256sum "$work/lkjsns-checkpoint.lkja" > "$work/artifact.sha256"
(cd "$ROOT" && sha256sum src/*.lkjc web/style.css ops/*.sh project.sh) > "$work/sources.sha256"
printf '%s\n' "$work" > "$ROOT/.build/selection.next"
mv -- "$ROOT/.build/selection.next" "$ROOT/.build/selection"
printf 'Selected native checkpoint: %s\nNo application listener or data store was started.\n' "$work"
