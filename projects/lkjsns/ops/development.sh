#!/usr/bin/env bash
# Local-only native service. This never changes a proxy, legacy store or user account.
set -euo pipefail
source "$(dirname -- "$0")/runtime.sh"
source "$ROOT/ops/selection.sh"
verify_runtime
verify_selection
command -v jq >/dev/null || { echo 'jq is required for local deployment operations.' >&2; exit 2; }
umask 077
dev="$ROOT/runtime/development"
[[ ! -L "$ROOT/runtime" && ! -L "$dev" ]] || { echo 'Refusing a linked development directory.' >&2; exit 2; }
case "${1:-}" in
  prepare)
    mkdir -p "$ROOT/runtime"
    mkdir "$dev" || { echo 'Development data already exists; it was not changed. Use run.' >&2; exit 2; }
    chmod 700 "$dev"
    mkdir "$dev/bundles" "$dev/objects"
    "$LKJ" data initialize --root "$dev/data"
    od -An -N32 -tx1 /dev/urandom | tr -d ' \n' > "$dev/bootstrap.secret"
    printf '\n' >> "$dev/bootstrap.secret"
    printf 'local-development-v1\n' > "$dev/ready"
    printf 'Prepared private local data. Bootstrap invitation: %s/bootstrap.secret\n' "$dev"
    printf 'No account or listener was created. Run ./sandbox lkjsns run.\n'
    ;;
  run)
    [[ -f "$dev/ready" && -d "$dev/data" && ! -L "$dev/data" &&
       -d "$dev/objects" && ! -L "$dev/objects" && -d "$dev/bundles" && ! -L "$dev/bundles" &&
       -f "$dev/bootstrap.secret" && ! -L "$dev/bootstrap.secret" &&
       "$(stat -c '%a' "$dev/bootstrap.secret")" == 600 ]] || {
      echo 'Prepare an isolated development store first.' >&2; exit 2;
    }
    [[ ! -L "$dev/serve.lock" ]] || exit 2
    exec 9> "$dev/serve.lock"
    flock --nonblock 9 || { echo 'This development service is already running.' >&2; exit 2; }
    bundle="$dev/bundles/$selected_sha.lkja"
    [[ ! -L "$bundle" ]] || exit 2
    if [[ ! -e "$bundle" ]]; then
      # Offline indexes and quota reconciliation can change existing metadata.
      # Keep a private, verified restore point once per newly selected bundle.
      [[ ! -L "$dev/snapshots" ]] || { echo 'Refusing a linked snapshot directory.' >&2; exit 2; }
      mkdir -p -m 700 "$dev/snapshots"
      snapshot=$(mktemp -d "$dev/snapshots/before-bundle-XXXXXXXX")
      cp -a --reflink=auto -- "$dev/data" "$snapshot/data"
      cp -a --reflink=auto -- "$dev/objects" "$snapshot/objects"
      if [[ -f "$dev/service.json" && ! -L "$dev/service.json" ]]; then
        cp -a -- "$dev/service.json" "$snapshot/service.before.json"
      fi
      "$LKJ" data verify --root "$snapshot/data" > "$snapshot/verify.log"
      printf 'Saved a private pre-upgrade snapshot: %s\n' "$snapshot"
      cp -- "$selected/lkjsns.lkja" "$bundle.next"
      [[ "$(sha256sum "$bundle.next" | cut -d ' ' -f 1)" == "$selected_sha" ]]
      mv -- "$bundle.next" "$bundle"
    fi
    [[ "$(sha256sum "$bundle" | cut -d ' ' -f 1)" == "$selected_sha" ]] || exit 2
    jq --arg artifact "bundles/$selected_sha.lkja" '.artifact=$artifact' \
      "$ROOT/ops/development.json" > "$dev/service.next.json"
    mv -- "$dev/service.next.json" "$dev/service.json"
    IFS= read -r LKJSNS_BOOTSTRAP_SECRET < "$dev/bootstrap.secret"
    [[ "$LKJSNS_BOOTSTRAP_SECRET" =~ ^[0-9a-f]{64}$ ]] || { echo 'Invalid bootstrap secret file.' >&2; exit 2; }
    export LKJSNS_BOOTSTRAP_SECRET
    printf 'Starting native local candidate %s on 127.0.0.1:19272\n' "$selected_sha"
    printf 'Authentication/media browser acceptance and public cutover remain separate.\n'
    bash "$ROOT/ops/index-attention.sh" "$dev/service.json"
    bash "$ROOT/ops/index-posts.sh" "$dev/service.json"
    exec "$LKJ" serve --deployment "$dev/service.json"
    ;;
  *) echo 'Expected prepare or run.' >&2; exit 2 ;;
esac
