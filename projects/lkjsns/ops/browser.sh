#!/usr/bin/env bash
# Optional local browser acceptance; no public storage or production writes.
set -euo pipefail
exec bash "$(dirname -- "$0")/../tests/ux/run.sh"
