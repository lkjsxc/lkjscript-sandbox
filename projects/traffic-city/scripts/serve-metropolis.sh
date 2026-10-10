#!/usr/bin/env bash
# Own native listeners and native save-history compaction. No game server in JS.
set -euo pipefail
umask 077
cd -- "$(dirname -- "$0")/.."
root=$PWD
export METRO_DIR=${METRO_DIR:-"$root/runtime/metropolis-host"}
mkdir -p -- "$METRO_DIR"
exec 9>"$METRO_DIR/supervisor.lock"
flock -n 9 || { echo 'This Metropolis host is already supervised.' >&2; exit 1; }
node scripts/prepare-metropolis.mjs
cd -- "$METRO_DIR"
read -r bin < compiler-path
sha256sum --check artifact.sha256 compiler.sha256
http_pid=''; session_pid=''
stop_session(){
 if [[ -n "$session_pid" ]]; then kill -INT "$session_pid" 2>/dev/null || true; wait "$session_pid" 2>/dev/null || true; fi
 session_pid=''
}
stop_all(){ stop_session; if [[ -n "$http_pid" ]]; then kill -INT "$http_pid" 2>/dev/null || true; wait "$http_pid" 2>/dev/null || true; fi; http_pid=''; }
trap stop_all EXIT
trap 'exit 0' INT TERM
rotate(){ local file=$1; if [[ -f "$file" ]] && (( $(stat -c %s "$file") > 4194304 )); then cp -- "$file" "$file.previous"; : > "$file"; fi; }
compact(){
 mkdir -p checkpoints
 local next="checkpoints/checkpoint-$(date -u +%Y%m%dT%H%M%S)-$$.native"
 "$bin" data verify --root "$METRO_DIR/data" >>maintenance.log 2>&1
 "$bin" data backup --root "$METRO_DIR/data" --output "$METRO_DIR/$next" >>maintenance.log 2>&1
 chmod 600 "$next"
 local staged
 staged=$(mktemp -d "$METRO_DIR/restore-XXXXXXXX")
 "$bin" data restore --backup "$METRO_DIR/$next" --root "$staged/data" >>maintenance.log 2>&1
 "$bin" data verify --root "$staged/data" >>maintenance.log 2>&1
 # Recoverable two-step exchange. prepare-metropolis restores data.retired if
 # shutdown occurred between renames; it never initializes over that store.
 [[ ! -e data.retired ]] || { echo 'Unresolved retired store; refusing compaction.' >&2; return 1; }
 mv -- data data.retired
 mv -- "$staged/data" data
 rmdir -- "$staged"
 rm -rf -- data.retired
 du -sk data | cut -f1 > compacted-kib
 mapfile -t copies < <(find checkpoints -maxdepth 1 -type f -name 'checkpoint-*.native' -printf '%f\n' | sort -r)
 for ((i=2;i<${#copies[@]};i++)); do rm -- "checkpoints/${copies[i]}"; done
}
# Prior store history is compacted only while no listener from this supervisor runs.
compact
"$bin" serve --deployment "$METRO_DIR/http.json" >>http.log 2>&1 & http_pid=$!
start_session(){ "$bin" serve --deployment "$METRO_DIR/session.json" >>session.log 2>&1 & session_pid=$!; printf '%s supervisor=%s http=%s session=%s\n' "$(date -u +%FT%TZ)" "$$" "$http_pid" "$session_pid"; }
start_session
while kill -0 "$http_pid" 2>/dev/null && kill -0 "$session_pid" 2>/dev/null; do
 sleep 2
 for file in http.log session.log maintenance.log; do rotate "$file"; done
 read -r compacted < compacted-kib
 limit=${METRO_HISTORY_KIB:-16384}; [[ "$limit" =~ ^[0-9]+$ ]] && ((limit>=1024)) || { echo 'History watermark must be at least 1024 KiB.' >&2; exit 1; }
 ((compacted*2<=limit)) || limit=$((compacted*2))
 if (( $(du -sk data | cut -f1) >= limit )); then stop_session; compact; start_session; fi
done
echo 'A native Metropolis listener exited; stopping its peer. The saved store is retained.' >&2
exit 1
