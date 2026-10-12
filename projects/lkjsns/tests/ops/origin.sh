#!/usr/bin/env bash
# Shell contracts only; the launcher test uses an inert executable, never a server.
set -euo pipefail
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
source "$ROOT/ops/origin.sh"
count=0
pass() { count=$((count + 1)); printf 'PASS %s\n' "$1"; }
for origin in https://app.example.com https://a.b https://a-1.example.com https://xn--test.example.com https://a.trycloudflare.com; do
  valid_public_origin "$origin"
  pass 'valid exact HTTPS origin'
done
for origin in '' http://app.example.com https://localhost https://127.0.0.1 https://app.example.com/ https://app.example.com:443 https://user@app.example.com https://app.example.com/path https://app.example.com?x=1 https://app.example.com#x https://-a.example.com https://a-.example.com https://a..example.com https://APP.example.com 'https://*.example.com' $'https://app.example.com\nhttps://elsewhere.example.com' $'https://app.example.com\r' 'https://app.example.com '; do
  if valid_public_origin "$origin"; then echo "Invalid origin accepted" >&2; exit 1; fi
  pass 'invalid origin rejected'
done
long_label=$(printf 'a%.0s' {1..64})
if valid_public_origin "https://$long_label.example.com"; then echo "Oversized label accepted" >&2; exit 1; fi
pass 'oversized DNS label rejected'
umask 077
mkdir -p "$ROOT/.build"
fixture=$(mktemp -d "$ROOT/.build/launcher-test-XXXXXXXX")
cp "$ROOT/ops/"{origin.sh,live-run.sh,named-tunnel.sh} "$fixture/"
cat > "$fixture/lkjscript" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
[[ "$1" == serve && "$2" == --deployment ]]
[[ "${LKJSNS_BOOTSTRAP_SECRET:-}" == synthetic-test-only ]]
jq -e '.configuration.origin.value == "https://app.example.com"' "$3" >/dev/null
printf 'launched\n' > launched
STUB
chmod 700 "$fixture/lkjscript"
printf 'synthetic bundle\n' > "$fixture/app.lkja"
printf 'synthetic-test-only\n' > "$fixture/bootstrap.secret"
printf '{"configuration":{"origin":{"value":"http://127.0.0.1:1"}}}\n' > "$fixture/service.template.json"
(cd "$fixture"; sha256sum lkjscript > executable.sha256; sha256sum app.lkja > bundle.sha256)
printf 'https://app.example.com\n' > "$fixture/public-url.txt"
bash "$fixture/live-run.sh"
[[ -f "$fixture/launched" ]]
pass 'launcher uses exact configured origin and private secret'
rm "$fixture/launched"
printf 'https://app.example.com\nhttps://other.example.com\n' > "$fixture/public-url.txt"
if bash "$fixture/live-run.sh" 2> "$fixture/rejected.log"; then echo "Invalid launcher state accepted" >&2; exit 1; fi
[[ ! -e "$fixture/launched" ]]
pass 'multiple origin lines refused before execution'
printf 'https://app.example.com\n' > "$fixture/public-url.txt"
printf 'changed bundle\n' > "$fixture/app.lkja"
if bash "$fixture/live-run.sh" 2> "$fixture/rejected.log"; then echo "Invalid launcher state accepted" >&2; exit 1; fi
[[ ! -e "$fixture/launched" ]]
pass 'changed application checksum refused'
cp "$fixture/lkjscript" "$fixture/cloudflared"
(cd "$fixture"; sha256sum cloudflared > tunnel.sha256)
printf 'synthetic-token\n' > "$fixture/tunnel.token"
chmod 644 "$fixture/tunnel.token"
if bash "$fixture/named-tunnel.sh" 2> "$fixture/rejected.log"; then echo "Publicly readable token accepted" >&2; exit 1; fi
grep -F 'owner-only' "$fixture/rejected.log" >/dev/null
pass 'readable-to-others connector token refused'
printf 'Shell checks passed: %s\n' "$count"
