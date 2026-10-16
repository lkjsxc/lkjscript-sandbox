# Current Coder entrypoint — October 17, 2026

The workspace is now **devmain**, agent **main**, public port **8793**.
The canonical origin is
<https://8793--main--devmain--lkjsxc.apps.coder.lkjsxc.com>.
The app already used this exact origin when the October 17 work began. The
custom-domain redirect still pointed at tomato-ocelot-73 and was corrected to
devmain, preserving its GET/HEAD-only match, HTTP 302 and path/query handling.
No tunnel was re-enabled and no application Host/Origin validation was relaxed.

The earlier record below describes the original hosting repair; its old workspace
name is historical. Consult [RELEASE.md](RELEASE.md) for the current application.

---

# Coder workspace hosting — October 12, 2026

> The community UX application was subsequently promoted on October 13, 2026
> at 00:24:41 JST without changing this Coder routing contract. Its current bundle,
> preserved-data cutover, and verification are recorded in [RELEASE.md](RELEASE.md).
> The October 12 configuration-only repair below is historical, not the current
> executable identity.

## Current entrypoint

The user's intended public entrypoint is the existing Coder workspace port:

[Open lkjsns](https://8793--main--tomato-ocelot-73--lkjsxc.apps.coder.lkjsxc.com)

Workspace: `lkjsxc/tomato-ocelot-73`. Agent: `main`. Public port: **8793**.
The native application listens on `127.0.0.1:8793` inside that workspace.
Coder forwards the port over HTTPS. The existing public sharing configuration
was retained; no Coder login is required to open the guest pages. Posting and
Drive still require the application's own account and sign-in.

The native process already ran inside the Coder workspace before this correction.
The mismatch was its public entrypoint: it listened on 8796 and admitted only the
custom-domain Host, while the previously shared Coder port 8793 had no listener
and returned HTTP 502. The unshared 8796 Coder URL requested Coder authentication.

The user also reported that the custom domain would not open. That exact symptom
was not reproduced from the development network: the custom-domain home and
health returned HTTP 200 during initial checks. Do not claim a diagnosed browser,
DNS-cache, or client-network cause. The broken Coder entrypoint was reproduced
and corrected independently.

## Configuration-only repair

At **2026-10-12 17:22:50 JST** (08:22:50 UTC), the application was restarted with
the Coder URL as its one canonical origin and 8793 as its loopback listener.
The app's systemd service has no dependency on either dedicated Cloudflare tunnel.
A stopped-service snapshot was retained, and the stored metadata and object
files were checked before restart. No application code, runtime, media, account,
or data-format migration was involved.

The unchanged application SHA-256 is
`60fce5fc6ec5b9acb52d061ccdabfdf62dafaf3ea2cbf42d4a94fa6ab28dba11`.
Its released executable source remains
`7a5d8032a2c5ff97f5407775b0f439e2cde70ec6`, with lkjscript 0.1.89.
New documentation or routing tests do not mean that this executable was rebuilt.

A scoped Cloudflare redirect now sends GET and HEAD requests for
`lkjsns.lkjsxc.com` to the Coder origin with HTTP 302, preserving the application
path and query string. It does not match other hostnames or forward submitted
POST bodies. Application writes must originate on the Coder URL with valid
session and CSRF state; the old Host is not trusted by the native listener.

At **17:25:00 JST**, the dedicated named-tunnel service was stopped and disabled.
The app process stayed unchanged, and both direct Coder health and old-domain
redirected health passed afterward. The legacy standalone application and old
quick-tunnel service remain disabled. No unrelated service or workspace was
restarted. Cloudflare resources for the unused connector were not deleted.

## Verified behavior

A fresh, unauthenticated Chromium context checked 16 guest-page/theme/width
combinations through the Coder URL: Home, Sign in, Join, and About, at 390 and
1440 pixels in light and dark modes. English document language, strict script
policy, no horizontal overflow, exact native CSS bytes, and the private Drive
sign-in redirect passed. No real user session or account was used.

`tests/ops/coder-route.cjs` separately passed eight grouped routing checks:
Coder health, path/query-preserving redirects, redirected Sign in, private Drive
access, rejection of old/foreign/null/missing origins, session/CSRF enforcement
even for the matching origin, rejection of the old Host at the loopback listener,
and stylesheet equality. Its form submissions contain no cookie or credential
and deliberately fail authorization; it does not create users or publish data.

The main 435 native tests and previous full browser acceptance describe the
unchanged released artifact; they were not represented as newly rerun for a
configuration-only repair. Authenticated user workflows were not exercised
against the public store in this repair.

## Operational contract

Keep Coder port 8793 and the exact Coder origin together. Do not silently replace
them with an independent custom-domain tunnel. The generic HTTPS origin launcher
already accepts this Coder hostname; no Host rewrite, wildcard authorization,
CORS relaxation, or TLS bypass is needed.

Changing the canonical hostname does not copy cookies between domains. Users
who signed in through the old domain need to sign in again at the Coder URL;
existing account credentials and stored data remain intact. The service depends
on the Coder workspace being running. The app's normal service restart does not
restart the workspace or its other projects.

See [the current checkpoint](CHECKPOINT.md), [the release record](RELEASE.md), and
[Coder's port sharing documentation](https://coder.com/docs/user-guides/workspace-access/port-forwarding).
