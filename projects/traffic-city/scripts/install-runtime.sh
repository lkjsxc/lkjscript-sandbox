#!/usr/bin/env bash
set -euo pipefail
game_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
archive_sha=bb68ed1aa32ea2a115fa1102858b92e366a1ffd0e2380574356ed5f3f7c42298
executable_sha=5eaadae4df214f4c5eaa2d4407acab58574b56447307b5a77261b2b9ff7adb37
mkdir -p "$game_root/tools"
if [ -f "$game_root/tools/lkjscript/lkjscript" ]; then
  printf '%s  %s\n' "$executable_sha" "$game_root/tools/lkjscript/lkjscript" | sha256sum --check
  exit 0
fi
game_download=$(mktemp -d "$game_root/tools/download.XXXXXX")
curl --fail --location --proto '=https' --proto-redir '=https' --connect-timeout 15 --max-time 180 \
  https://github.com/lkjsxc/lkjscript/releases/download/v0.1.77/lkjscript-x86_64-unknown-linux-musl.tar.gz \
  --output "$game_download/runtime.tar.gz"
printf '%s  %s\n' "$archive_sha" "$game_download/runtime.tar.gz" | sha256sum --check
tar --no-same-owner -xzf "$game_download/runtime.tar.gz" -C "$game_root/tools"
printf '%s  %s\n' "$executable_sha" "$game_root/tools/lkjscript/lkjscript" | sha256sum --check
"$game_root/tools/lkjscript/lkjscript" --version
