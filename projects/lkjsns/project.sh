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
    source "$ROOT/ops/selection.sh"
    verify_selection
    exec "$LKJ" --project "$selected/project" check ;;
  prepare|run) exec "$ROOT/ops/development.sh" "$task" ;;
  help|--help|-h) printf '%s\n' 'lkjsns tasks: setup build check test prepare run' 'prepare/run are local-only candidates, not a public deployment.' ;;
  *) printf 'Unknown lkjsns task: %s\n' "$task" >&2; exit 2 ;;
esac
