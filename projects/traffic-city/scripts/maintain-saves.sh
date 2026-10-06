#!/bin/bash
# Offline native DataStore maintenance. Only the owned v4 directory is modified.
# Call while the native session process is stopped; the supervisor owns its flock.
set -eu
cd "$(dirname "$0")/.."
root="$PWD/runtime/data-v4"
bin="$PWD/tools/lkjscript/lkjscript"
mkdir -p "$root"
if [[ ! -d "$root/store" && -d "$root/retired" ]]; then mv "$root/retired" "$root/store"; fi
if [[ ! -d "$root/store" ]]; then
  if [[ -e "$root/INITIALIZED" ]]; then echo 'Saved-city store is missing. Manual recovery required; refusing to reset.' >&2; exit 1; fi
  "$bin" data initialize --root "$root/store"
  touch "$root/INITIALIZED"
fi
"$bin" data verify --root "$root/store"
if [[ "${1:-}" != 'compact' ]]; then exit 0; fi
# A failed attempt leaves the live root untouched. No old v3 paths are considered.
rm -rf -- "$root/staged"
rm -f -- "$root/backup.next"
"$bin" data backup --root "$root/store" --output "$root/backup.next"
"$bin" data restore --backup "$root/backup.next" --root "$root/staged"
"$bin" data verify --root "$root/staged"
rm -rf -- "$root/retired"
mv "$root/store" "$root/retired"
mv "$root/staged" "$root/store"
mv -f "$root/backup.next" "$root/latest.backup"
du -sk "$root/store" | cut -f1 > "$root/compacted-kib"
rm -rf -- "$root/retired"
printf '%s native save history compacted\n' "$(date -u +%FT%TZ)"
