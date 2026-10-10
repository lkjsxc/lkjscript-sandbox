#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/runtime.sh"
[[ "$(uname -s)/$(uname -m)" == Linux/x86_64 ]] || { echo 'This runtime pin requires Linux x86-64.' >&2; exit 2; }
if [[ -f "$LKJ" ]]; then verify_runtime; echo 'Pinned lkjscript 0.1.89 verified.'; exit 0; fi
umask 077
mkdir -p "$ROOT/.tools"
work=$(mktemp -d "$ROOT/.tools/install-XXXXXXXX")
trap 'rm -rf -- "$work"' EXIT
archive=lkjscript-x86_64-unknown-linux-musl.tar.gz
curl --fail --location --silent --show-error --proto '=https' --tlsv1.2 \
  "https://github.com/lkjsxc/lkjscript/releases/download/v$VERSION/$archive" -o "$work/$archive"
printf '%s  %s\n' "$ARCHIVE_SHA256" "$work/$archive" | sha256sum --check --status
tar -xzf "$work/$archive" -C "$work"
[[ -f "$work/lkjscript/lkjscript" && ! -L "$work/lkjscript/lkjscript" ]]
printf '%s  %s\n' "$BINARY_SHA256" "$work/lkjscript/lkjscript" | sha256sum --check --status
[[ ! -e "$ROOT/.tools/lkjscript" ]] || { echo 'Refusing to overwrite an existing runtime directory.' >&2; exit 2; }
mv -- "$work/lkjscript" "$ROOT/.tools/lkjscript"
verify_runtime
printf 'Installed verified lkjscript %s.\n' "$VERSION"
