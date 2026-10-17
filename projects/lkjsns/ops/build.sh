#!/usr/bin/env bash
# Bootstrap native proposal fragments in dependency-sized, publicly reviewed changes.
# This creates a local executable candidate only; it never starts an app or store.
set -euo pipefail
source "$(dirname -- "$0")/runtime.sh"
verify_runtime
source "$ROOT/ops/selection.sh"
umask 077
mkdir -p "$ROOT/.build"
work=$(mktemp -d "$ROOT/.build/bootstrap-XXXXXXXX")
project="$work/project"
source_manifest > "$work/sources.sha256"
"$LKJ" new "$project" --template web-editor --name lkjsns > "$work/new.log"
apply_request() {
  local name=$1 input=$2 token
  if ! "$LKJ" --project "$project" change plan --input-file "$input" > "$work/$name.plan.log" 2>&1; then
    cat "$work/$name.plan.log" >&2; return 1
  fi
  token=$(sed -n 's/^plan token=\([^ ]*\).*/\1/p' "$work/$name.plan.log")
  [[ "$token" =~ ^plan_[0-9a-f]+$ ]] || { echo "No reviewed token for $name" >&2; return 1; }
  if ! "$LKJ" --project "$project" change apply --input-file "$input" --plan "$token" > "$work/$name.apply.log" 2>&1; then
    cat "$work/$name.apply.log" >&2; return 1
  fi
  printf 'Accepted %s\n' "$name"
}
apply_fragment() {
  local name=$1 revision
  shift
  revision=$("$LKJ" --project "$project" status | sed -n 's/^revision id=\([^ ]*\).*/\1/p')
  [[ "$revision" =~ ^rev_[0-9a-f]{64}$ ]]
  {
    printf 'request base=%s\ndeclarations.begin\n(units\n' "$revision"
    cat "$ROOT/src/00-types.lkjc"
    for fragment in "$@"; do cat "$fragment"; done
    printf ')\ndeclarations.end\n'
  } > "$work/$name.request.lkjc"
  apply_request "$name" "$work/$name.request.lkjc"
}
# A component must own a port in the pinned runtime. Keep the permanent health
# port during capability bootstrap, but create no target until the real HTTP
# router and all of its dependencies have been accepted. Nothing is executable
# or selectable as the SNS during these intermediate changes.
[[ "$(grep -c '^    (port create view' "$ROOT/src/service.lkjc")" == 1 ]]
[[ "$(grep -c '^    (port create health' "$ROOT/src/service.lkjc")" == 1 ]]
[[ "$(grep -c '^(target create lkjsns' "$ROOT/src/service.lkjc")" == 1 ]]
{
  awk '/^    \(port create view/{exit} {print}' "$ROOT/src/service.lkjc"
  printf '  ))\n'
} > "$work/capabilities.lkjc"
apply_fragment capabilities "$work/capabilities.lkjc" "$ROOT/src/health.lkjc"
apply_fragment text-input "$ROOT/src/textinput.lkjc"
for name in util paths invitations; do
  apply_fragment "$name" "$ROOT/src/$name.lkjc"
done
apply_fragment icon-bytes "$ROOT/src/icondata/bytes.lkjc"
for name in ico png touch app192 app512; do
  apply_fragment "icon-$name" "$ROOT/src/icondata/$name.lkjc"
done
apply_fragment icons "$ROOT/src/icons.lkjc"
apply_fragment account-codec "$ROOT/src/attention/accountcodec.lkjc"
for name in db preferences page assets auth access codec social compose notes drive; do
  apply_fragment "$name" "$ROOT/src/$name.lkjc"
done
apply_fragment post-ids "$ROOT/src/reading/postids.lkjc"
apply_fragment post-index "$ROOT/src/reading/postindex.lkjc"
apply_fragment reading-return "$ROOT/src/reading/returnnav.lkjc"
apply_fragment attention-store "$ROOT/src/attention/store.lkjc"
apply_fragment attention-migration "$ROOT/src/attention/migration.lkjc"
for name in controls navigation; do
  apply_fragment "$name" "$ROOT/src/ui/$name.lkjc"
done
apply_fragment paging "$ROOT/src/reading/paging.lkjc"
apply_fragment attention-navigation "$ROOT/src/attention/navigation.lkjc"
apply_fragment attention-ui "$ROOT/src/attention/ui.lkjc"
apply_fragment sequence "$ROOT/src/reading/sequence.lkjc"
for name in math store io; do
  apply_fragment "transfer-$name" "$ROOT/src/transfers/$name.lkjc"
done
apply_fragment delivery "$ROOT/src/delivery.lkjc"
apply_fragment library-path "$ROOT/src/reading/librarypath.lkjc"
apply_fragment tags "$ROOT/src/tags.lkjc"
apply_fragment search-text "$ROOT/src/searchtext.lkjc"
apply_fragment links "$ROOT/src/reading/links.lkjc"
for name in admission mediaui; do
  apply_fragment "$name" "$ROOT/src/ui/$name.lkjc"
done
for name in conversation activity; do
  apply_fragment "$name" "$ROOT/src/reading/$name.lkjc"
done
apply_fragment reply-metrics "$ROOT/src/reading/replymetrics.lkjc"
for name in intents workspace; do
  apply_fragment "writing-$name" "$ROOT/src/writing/$name.lkjc"
done
# Domain operations and rendering do not depend on the submission/recovery handler.
# Keeping these components separate bounds the pinned native review workload.
apply_fragment journal "$ROOT/src/ui/journal.lkjc"
apply_fragment journal-view "$ROOT/src/ui/journalview.lkjc"
apply_fragment journal-submit "$ROOT/src/writing/submit.lkjc"
for name in attachments relations adminview accounts fileactions; do
  apply_fragment "$name" "$ROOT/src/ui/$name.lkjc"
done
apply_fragment attention-view "$ROOT/src/attention/view.lkjc"
apply_fragment information "$ROOT/src/ui/information.lkjc"
apply_fragment identity "$ROOT/src/identity.lkjc"
for name in driveview mediaflow recovery; do
  apply_fragment "$name" "$ROOT/src/ui/$name.lkjc"
done
apply_fragment search-view "$ROOT/src/searchview.lkjc"
apply_fragment confirmation "$ROOT/src/confirmation.lkjc"
for name in flow download; do
  apply_fragment "transfer-$name" "$ROOT/src/transfers/$name.lkjc"
done
apply_fragment thread-view "$ROOT/src/reading/threadview.lkjc"
apply_fragment resources "$ROOT/src/resources.lkjc"
apply_fragment http "$ROOT/src/http.lkjc"
apply_fragment unavailable "$ROOT/src/unavailable.lkjc"
# The link step edits a complete public draft, keeping existing exact requirement
# identities, and adds the authored port/routes. It never edits canonical storage.
source "$ROOT/ops/link.sh"
link_http_target
"$LKJ" --project "$project" check | tee "$work/check.log"
"$LKJ" --project "$project" build --output "$work/lkjsns.lkja" | tee "$work/build.log"
sha256sum "$work/lkjsns.lkja" > "$work/artifact.sha256"
[[ "$(source_manifest)" == "$(cat "$work/sources.sha256")" ]] || {
  echo 'Source snapshot changed during the build; no selection was published.' >&2
  exit 1
}
printf '%s\n' "$work" > "$ROOT/.build/selection.next"
mv -- "$ROOT/.build/selection.next" "$ROOT/.build/selection"
printf 'Selected native candidate: %s\nNo browser-flow verification or service cutover is implied.\n' "$work"
