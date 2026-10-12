#!/usr/bin/env bash
# A selection binds the entire executable source set, not only old filenames.
source_manifest() (
  set -euo pipefail
  cd "$ROOT"
  export LC_ALL=C
  [[ -z "$(find src ops -type l -print -quit)" ]] || {
    echo 'Source symlinks are not accepted.' >&2; exit 2;
  }
  find src -type f -name '*.lkjc' -print0 | sort -z | xargs -0 sha256sum
  sha256sum web/style.css web/ui.js web/transfer.js ops/*.sh ops/development.json project.sh
)
verify_selection() {
  local recorded_path expected actual base recorded_revision current_revision
  [[ -f "$ROOT/.build/selection" && ! -L "$ROOT/.build/selection" ]] || {
    echo 'Build a native candidate first.' >&2; return 2;
  }
  IFS= read -r selected < "$ROOT/.build/selection"
  base=${selected##*/}
  [[ "${selected%/*}" == "$ROOT/.build" && "$base" =~ ^bootstrap-[a-zA-Z0-9]{8}$ &&
     -d "$selected/project" && ! -L "$selected" && ! -L "$selected/project" &&
     -f "$selected/lkjsns.lkja" && ! -L "$selected/lkjsns.lkja" ]] || {
    echo 'Invalid native selection.' >&2; return 2;
  }
  actual=$(source_manifest) || return
  [[ -f "$selected/sources.sha256" && "$actual" == "$(cat "$selected/sources.sha256")" ]] || {
    echo 'Executable sources or their file set changed; rebuild before starting.' >&2; return 2;
  }
  read -r expected recorded_path < "$selected/artifact.sha256"
  [[ "$expected" =~ ^[0-9a-f]{64}$ && "$recorded_path" == "$selected/lkjsns.lkja" &&
     "$(sha256sum "$selected/lkjsns.lkja" | cut -d ' ' -f 1)" == "$expected" ]] || {
    echo 'Selected bundle checksum mismatch.' >&2; return 2;
  }
  [[ -f "$selected/check.log" ]] || { echo 'Missing native check receipt.' >&2; return 2; }
  recorded_revision=$(sed -n 's/^authority .* revision=\(rev_[0-9a-f]\{64\}\) state=.*/\1/p' "$selected/check.log")
  current_revision=$("$LKJ" --project "$selected/project" status | sed -n 's/^revision id=\([^ ]*\).*/\1/p') || return
  [[ "$recorded_revision" =~ ^rev_[0-9a-f]{64}$ && "$current_revision" == "$recorded_revision" ]] || {
    echo 'Accepted graph changed after validation; rebuild before starting.' >&2; return 2;
  }
  selected_sha=$expected
}
