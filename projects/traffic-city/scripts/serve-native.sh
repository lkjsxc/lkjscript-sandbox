#!/bin/bash
# Process supervision and native save-history maintenance only. No game logic or relay.
set -eu
cd "$(dirname "$0")/.."
root="$PWD"
runtime_bin="$root/tools/lkjscript/lkjscript"
mkdir -p runtime/logs
exec 9>runtime/serve.lock
if ! flock -n 9; then echo 'Flowgarden is already supervised in this directory.' >&2; exit 1; fi
./scripts/maintain-saves.sh >>runtime/logs/maintenance.log 2>&1
http_pid=''; session_pid=''
stop_session(){
 if [[ -n "$session_pid" ]] && kill -0 "$session_pid" 2>/dev/null; then kill -INT "$session_pid" 2>/dev/null || true; fi
 if [[ -n "$session_pid" ]]; then wait "$session_pid" 2>/dev/null || true; fi
 session_pid=''
}
stop_children(){ stop_session; if [[ -n "$http_pid" ]]; then kill -INT "$http_pid" 2>/dev/null || true; wait "$http_pid" 2>/dev/null || true; fi; http_pid=''; }
trap stop_children EXIT
trap 'exit 0' INT TERM
start_session(){
 "$runtime_bin" serve --deployment "$root/runtime/session.deployment.json" >>runtime/logs/session.log 2>&1 & session_pid=$!
 printf '%s supervisor=%s http=%s session=%s\n' "$(date -u +%FT%TZ)" "$$" "$http_pid" "$session_pid" | tee -a runtime/logs/supervisor.log
}
while true; do
 "$runtime_bin" serve --deployment "$root/runtime/http.deployment.json" >>runtime/logs/http.log 2>&1 & http_pid=$!
 start_session
 while kill -0 "$http_pid" 2>/dev/null && kill -0 "$session_pid" 2>/dev/null; do
   sleep 1
   save_kib=$(du -sk runtime/data-v4/store | cut -f1)
   # Eight cities, each with one optional previous-city value, <=4 MiB/value.
   # Use twice the last compacted size when retained values exceed half the base
   # watermark. Otherwise a legitimately large backup could cause restart loops.
   compacted_kib=0
   if [[ -f runtime/data-v4/compacted-kib ]]; then read -r compacted_kib < runtime/data-v4/compacted-kib; fi
   if [[ ! "$compacted_kib" =~ ^[0-9]+$ ]]; then compacted_kib=0; fi
   history_kib=${SAVE_HISTORY_KIB:-65536}
   if (( compacted_kib * 2 > history_kib )); then history_kib=$((compacted_kib * 2)); fi
   # A history watermark, not an OS quota; in-flight writes may overshoot.
   if (( save_kib >= history_kib )); then
     stop_session
     ./scripts/maintain-saves.sh compact >>runtime/logs/maintenance.log 2>&1
     start_session
   fi
 done
 stop_children
 if [[ "${RESTART_ON_FAILURE:-1}" != '1' ]]; then exit 1; fi
 echo 'A native listener exited; restarting in two seconds.' >>runtime/logs/supervisor.log
 sleep 2
done
