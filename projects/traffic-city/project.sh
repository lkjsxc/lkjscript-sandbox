#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
task=${1:-help}
[[ $# -eq 0 ]] || shift
case "$task" in
  setup) ./scripts/install-runtime.sh; exec npm ci --ignore-scripts "$@" ;;
  build) exec npm run build -- "$@" ;;
  check) exec npm run check -- "$@" ;;
  test) exec npm test -- "$@" ;;
  browser) exec npm run test:browser -- "$@" ;;
  smoke) exec npm run test:smoke -- "$@" ;;
  run) exec ./play.sh "$@" ;;
  help|--help|-h) printf '%s\n' 'Traffic City tasks: setup build check test browser smoke run' ;;
  *) printf 'Unknown Traffic City task: %s\n' "$task" >&2; exit 2 ;;
esac
