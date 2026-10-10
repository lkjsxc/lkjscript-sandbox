#!/usr/bin/env bash
# Shared build provenance. Sourcing this file performs no network or server I/O.
set -euo pipefail
ROOT=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
VERSION=0.1.89
ARCHIVE_SHA256=3b4ced16faa94142c3bcf70098be4168a462dc661d0d3095089dcfd9b0860418
BINARY_SHA256=e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9
LKJ="$ROOT/.tools/lkjscript/lkjscript"
verify_runtime() {
  [[ -x "$LKJ" && ! -L "$LKJ" ]] || { echo 'Run ./sandbox lkjsns setup first.' >&2; return 2; }
  [[ "$(sha256sum "$LKJ" | cut -d ' ' -f 1)" == "$BINARY_SHA256" ]] || { echo 'Pinned runtime SHA-256 mismatch.' >&2; return 2; }
  [[ "$("$LKJ" --version)" == "lkjscript $VERSION" ]] || { echo 'Pinned runtime version mismatch.' >&2; return 2; }
}
