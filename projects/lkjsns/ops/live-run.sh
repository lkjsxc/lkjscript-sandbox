#!/usr/bin/env bash
# Run the accepted native artifact at one exact, operator-selected HTTPS origin.
set -euo pipefail
cd -- "$(dirname -- "$0")"
source ./origin.sh
umask 077
sha256sum --check --status executable.sha256
sha256sum --check --status bundle.sha256
[[ -f public-url.txt && ! -L public-url.txt ]]
mapfile -t origins < public-url.txt
[[ ${#origins[@]} == 1 ]] || { echo 'Expected exactly one public origin.' >&2; exit 1; }
origin=${origins[0]}
valid_public_origin "$origin" || { echo 'The public HTTPS origin is invalid.' >&2; exit 1; }
[[ -f bootstrap.secret && ! -L bootstrap.secret ]]
jq --arg origin "$origin" '.configuration.origin.value=$origin' service.template.json > service.json.tmp
mv -- service.json.tmp service.json
IFS= read -r LKJSNS_BOOTSTRAP_SECRET < bootstrap.secret
export LKJSNS_BOOTSTRAP_SECRET
exec ./lkjscript serve --deployment "$PWD/service.json"
