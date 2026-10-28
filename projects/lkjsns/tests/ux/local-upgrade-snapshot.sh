#!/usr/bin/env bash
# Exercise development startup against an isolated previous-version synthetic store.
set -euo pipefail
source ops/runtime.sh
source ops/selection.sh
verify_runtime; verify_selection
fixture=${LKJSNS_UPGRADE_FIXTURE:?Set LKJSNS_UPGRADE_FIXTURE to a synthetic upgrade fixture}
fixture=$(realpath -e -- "$fixture")
[[ "$fixture" == "$ROOT"/runtime/post-quota-upgrade-* && ! -L "$fixture" && -d "$fixture/data-before-migration" && -d "$fixture/objects-before-migration" ]] || exit 2
if ss -ltnH | awk '{print $4}' | grep -qE ':19272$'; then echo 'Synthetic development port is in use.' >&2; exit 2; fi
umask 077
work=$(mktemp -d "$ROOT/runtime/local-snapshot-check-XXXXXXXX")
mkdir -p "$work/.build" "$work/.tools/lkjscript"
cp -a --reflink=auto -- "$ROOT/src" "$ROOT/ops" "$ROOT/web" "$ROOT/project.sh" "$work/"
cp --reflink=auto -- "$LKJ" "$work/.tools/lkjscript/lkjscript"
copy="$work/.build/${selected##*/}"
mkdir "$copy"
cp -a --reflink=auto -- "$selected/project" "$copy/project"
cp -- "$selected/lkjsns.lkja" "$selected/check.log" "$selected/sources.sha256" "$copy/"
printf '%s  %s\n' "$selected_sha" "$copy/lkjsns.lkja" > "$copy/artifact.sha256"
printf '%s\n' "$copy" > "$work/.build/selection"
(cd "$work" && bash ops/development.sh prepare > "$work/prepare.log")
dev="$work/runtime/development"
rm -rf -- "$dev/data" "$dev/objects"
cp -a --reflink=auto -- "$fixture/data-before-migration" "$dev/data"
cp -a --reflink=auto -- "$fixture/objects-before-migration" "$dev/objects"
cp -- "$fixture/bootstrap.secret" "$dev/bootstrap.secret"
chmod 600 "$dev/bootstrap.secret"
old_head=$(sha256sum "$dev/data/HEAD" | cut -d ' ' -f 1)
pid=''
stop(){ if [[ -n "$pid" ]]; then kill -TERM "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; pid=''; fi; }
trap stop EXIT
start(){
 (cd "$work" && exec bash ops/development.sh run) >> "$work/run.log" 2>&1 & pid=$!
 for _ in $(seq 1 300); do if curl -fsS --max-time 2 http://127.0.0.1:19272/healthz >/dev/null 2>&1; then return; fi; sleep .2; done
 echo 'Synthetic local service did not start.' >&2; tail -30 "$work/run.log" >&2; exit 1
}
start
[[ $(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:19272/) == 200 ]]
stop
mapfile -t snapshots < <(find "$dev/snapshots" -mindepth 1 -maxdepth 1 -type d)
[[ ${#snapshots[@]} == 1 ]]
[[ $(sha256sum "${snapshots[0]}/data/HEAD" | cut -d ' ' -f 1) == "$old_head" ]]
[[ $(sha256sum "$dev/data/HEAD" | cut -d ' ' -f 1) != "$old_head" ]]
diff -qr "$fixture/objects-before-migration" "${snapshots[0]}/objects" > "$work/objects-check.log"
start
stop
mapfile -t snapshots < <(find "$dev/snapshots" -mindepth 1 -maxdepth 1 -type d)
[[ ${#snapshots[@]} == 1 ]]
printf 'Verified local pre-upgrade snapshot and repeat startup: %s\n' "$work"
