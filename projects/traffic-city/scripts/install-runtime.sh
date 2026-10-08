#!/usr/bin/env bash
set -euo pipefail
game_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
archive_sha=2b0dedeadcd159fdc04285f2d382e8f26d1deae6513b61500a2825f1f6c73376
executable_sha=8a92ff982e06c2ce1efafd90bf824242edfe782359ecf849036772befc261cf7
mkdir -p "$game_root/tools"
if [ -f "$game_root/tools/lkjscript/lkjscript" ]; then
  printf '%s  %s\n' "$executable_sha" "$game_root/tools/lkjscript/lkjscript" | sha256sum --check
  exit 0
fi
game_download=$(mktemp -d "$game_root/tools/download.XXXXXX")
curl --fail --location --proto '=https' --proto-redir '=https' --connect-timeout 15 --max-time 180 \
  https://github.com/lkjsxc/lkjscript/releases/download/v0.1.83/lkjscript-x86_64-unknown-linux-musl.tar.gz \
  --output "$game_download/runtime.tar.gz"
printf '%s  %s\n' "$archive_sha" "$game_download/runtime.tar.gz" | sha256sum --check
tar --no-same-owner -xzf "$game_download/runtime.tar.gz" -C "$game_root/tools"
printf '%s  %s\n' "$executable_sha" "$game_root/tools/lkjscript/lkjscript" | sha256sum --check
"$game_root/tools/lkjscript/lkjscript" --version
