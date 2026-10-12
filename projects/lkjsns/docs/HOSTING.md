# Fixed-hostname native hosting

Historical named-tunnel design. On October 12, 2026 at 17:22 JST, the user
reaffirmed Coder workspace hosting and the existing public port was restored.
[CODER-HOSTING.md](CODER-HOSTING.md) is the current operating contract. The
dedicated connector described below is now stopped, not the active entrypoint.

The product's canonical origin is an explicit operator setting, not a hostname
scraped from a temporary tunnel log. Application accounts and data are separate
from the connector, its token, and all synthetic browser fixtures.

## Components

The native service runs the checksum-verified lkjscript executable and detached
application bundle. `live-run.sh` reads exactly one HTTPS DNS origin from
`public-url.txt`, validates its syntax with `origin.sh`, writes that exact origin
to the service descriptor, and starts the native process. This validation is not
a Host allowlist: the application still requires an exact match with the one
configured Host and checks Origin and CSRF independently for writes.

A separately supervised named Cloudflare Tunnel maps one hostname to the local
native HTTP listener. Its last ingress rule is an explicit HTTP 404 catch-all.
No Host rewrite, wildcard origin, or disabled TLS verification is required.
The outside connection uses HTTPS; the same-host origin listener stays loopback.

`named-tunnel.sh` checks its executable checksum and requires an owner-only token
file. It passes the token by file path, not a command-line secret or log message.
`named-ready.sh` checks the connector's loopback readiness endpoint. The supervisor
must not treat only an existing PID as evidence of a working external connection.
The public service is not restarted merely because its connector reconnects.
When retiring the old tunnel, inspect the effective systemd Wants and After
dependencies. Empty dependency assignments in drop-ins do not remove existing
dependencies. Replace the full unit and archive obsolete dependency drop-ins;
otherwise the old connector can be started again and overwrite the origin.

The connector grants connection access to one tunnel, not general account or DNS
administration. Its credential belongs in a private service directory, never in
Git, public evidence, a browser fixture, or a user-facing page.

## Provisioning and promotion

`prepare-live.sh` initializes only a fresh detached service directory. It refuses
to overwrite an existing service. Supply the desired HTTPS origin and an installed
connector executable. Provision a named-tunnel token separately. The preparation
command does not create accounts, expose fixtures, change DNS, or start a service.

Before an update, verify the selected source manifest, application checksum,
runtime checksum, and exact source commit. Stop the native process and take one
consistent snapshot of both metadata and object bytes. Do not copy a running
store as though its independently copied files were a coherent backup.

Update the detached bundle and launcher deliberately, preserve the existing
store, set the selected canonical origin, and restart the native service. Verify
its exact-Host loopback response, actual external HTTPS health, anonymous pages,
security headers, and byte equality between the externally served stylesheet
and the accepted stylesheet. DNS and connector health alone do not prove that
the application is working.

A tunnel or application restart can cause temporary errors. This is not a
zero-downtime or highly available deployment. Fixed DNS does not remove the
origin host's availability dependency. Keep monitored backups and service
supervision separate from the UI's correctness guarantees.

## Checks

`tests/ops/origin.sh` exercises origin syntax and fail-closed launcher contracts
using an inert executable, not an application mock claimed to be a native test.
`tests/ops/native-origin.sh` prepares and launches the actual selected native
bundle in an isolated loopback directory, verifying exact Host, Origin, CSRF,
English HTML, script policy, and stylesheet equality.

The optional browser suite and restart/restore/upgrade/rollback procedures remain
separate gates. Source or operations changes invalidate the previous selection;
rebuild and recheck the actual selected artifact rather than copying old counts.
Public promotion records are maintained in [RELEASE.md](RELEASE.md).

## Reference

The connector and DNS arrangement follows the official
[Cloudflare Tunnel setup documentation](https://developers.cloudflare.com/tunnel/get-started/).
Quick Tunnels are temporary development URLs, not the intended stable entrypoint.
