#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/ops/runtime.sh"
task=${1:-help}
[[ $# -eq 0 ]] || shift
[[ $# -eq 0 ]] || { echo 'This checkpoint accepts no additional task arguments.' >&2; exit 2; }
case "$task" in
  setup) exec "$ROOT/ops/setup.sh" ;;
  build) exec "$ROOT/ops/build.sh" ;;
  check|test)
    verify_runtime
    [[ -f "$ROOT/.build/selection" && ! -L "$ROOT/.build/selection" ]] || { echo 'Run ./sandbox lkjsns build first.' >&2; exit 2; }
    IFS= read -r selected < "$ROOT/.build/selection"
    [[ "$selected" == "$ROOT"/.build/bootstrap-* && -d "$selected/project" && ! -L "$selected/project" ]] || { echo 'Invalid local graph selection.' >&2; exit 2; }
    (cd "$ROOT" && sha256sum --check --status "$selected/sources.sha256") || { echo 'Sources changed after selection; rebuild or verify the actual accepted graph explicitly.' >&2; exit 2; }
    exec "$LKJ" --project "$selected/project" check ;;
  run)
    echo 'lkjsns is an unfinished checkpoint; public routing and browser flows are not ready. No listener was started.' >&2
    exit 2 ;;
  help|--help|-h) printf '%s\n' 'lkjsns checkpoint tasks: setup build check test' 'run deliberately refuses until end-to-end application verification.' ;;
  *) printf 'Unknown lkjsns task: %s\n' "$task" >&2; exit 2 ;;
esac
