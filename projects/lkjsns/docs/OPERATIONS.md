# Local operations and release boundaries

This document defines build and candidate-test discipline. The current public
service, completed promotion, and hosting topology are recorded in
[RELEASE.md](RELEASE.md) and [CODER-HOSTING.md](CODER-HOSTING.md).

## Selection and initialization

`setup` installs a checksum-pinned executable. `build` creates a fresh native graph,
accepts bounded dependency fragments, links the real HTTP port, checks the graph,
and writes a bundle. The permanent health port makes capability bootstrap valid;
there is no temporary fake SNS target. The service target is created only when the
real router can be linked. Do not add a placeholder responder to make a build green.

`ops/selection.sh` records all native source files, the CSS, both browser scripts, operation scripts,
development descriptor and dispatcher. The complete current manifest must equal the
record, so adding a new native file also invalidates an old selection. The selected
bundle is checked independently, and the graph revision must still equal the native
check receipt. This protects ordinary local edits, not a malicious owner of the build
cache or host. A documentation edit does not change the executable
selection; a runtime or operations change does.

`prepare` is an explicit one-time local operation. It creates a private development
directory, native DataStore, object root, random bootstrap invitation and ready marker.
It refuses to overwrite an existing directory. Interrupted preparation can leave a
partial directory: inspect it before taking any action; do not automatically delete
it or run initialization against a possibly populated store.

`run` keeps existing development data and stages the selected bundle under its hash.
The localhost descriptor is generated from a reviewed, checked-in template with no
embedded secret. The bootstrap value is read from a private file into the native
process environment and is not logged. A process lock rejects duplicate launchers.
No tunnel, reverse proxy, public host, account registration or legacy shutdown is
part of either command. The default listener is `127.0.0.1:19272`.

## What a native check proves

The native graph checks types, effects, declarations and its executable test cases.
The production and reference evaluators must agree. Pure tests cover parser and
access decisions, rendering contracts, strict form schema and workflow predicates.
They do not reproduce a browser session, a completed media lifecycle or a storage
failure just because the relevant task functions compile.

Anonymous HTTP smoke checks verify actual routing, private-page redirects, Host/query
admission and response policies. Static-page screenshots verify only those captured
pages. Neither is a substitute for authenticated publication and media-byte checks.
Never label a public smoke check as full end-to-end acceptance.

## Release acceptance still required

Use synthetic users and actual valid/malformed media in a new isolated store. Exercise
invite registration and exhaustion, login/logout, failed login, draft save, conflict
recovery, upload, private tag edits, profile-image selection, attach/detach,
publication, replies and deletion.
Test both attachment destinations, repeated submissions, stale draft versions, full
selection, two users, guests, and revocation after the final readable reference ends.
Compare GET/range bytes with the input; check suffix/open/invalid/multiple ranges and
HEAD at the actual transport boundary. Do not infer HEAD Content-Length correctness
from an empty native response body.

Verify 390px mobile and desktop light/dark layouts with populated notes and Drive,
keyboard focus, zoom, native media playback and server/browser errors. An operation
blocked by the execution environment is an unrun test, not a failure of the app and
not permission to count another kind of check as a substitute.

## Media transport review

Native request selection ignores Range for HEAD and unknown range units. A supplied
If-Range also selects the full representation because this application does not yet
emit a validator it can compare. It never pretends that an unverified condition
matched. These decisions have pure native regression tests and are separate from
actual byte delivery. See [RFC 9110, Range](https://www.rfc-editor.org/rfc/rfc9110.html#section-14.2)
and [If-Range](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.5).

The transport owns Content-Length. An empty native HEAD body alone does not establish
that the wire header describes GET's representation correctly. Verify that against
the selected executable and [RFC 9110 section 8.6](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.6)
before claiming complete media HEAD support. Do not add a transport-owned header to
an application response as an untested workaround.

## Data preservation and public cutover

A production candidate needs a separate deployment descriptor, origin, process and
private data roots. Do not expose a fixture with a bootstrap invitation casually.
Grant paths and public Origin/Host expectations must be checked before exposure.
Default development concurrency and quota are policy choices, not capacity claims.

Rehearse shutdown, backup, restore and restart with populated data before replacing
the old entry. Copy metadata and objects from one quiescent application state; two
independent live directory copies are not a consistent backup. Retain the exact
executable, bundle, descriptor and secret-management information with the snapshot.
Record hashes without publishing credentials or private data. Native metadata history
is not a backup policy and logical deletion is not physical erasure.

After the separate candidate passes acceptance, record the old deployment identity,
stop it gracefully, switch the proxy deliberately, and verify the external origin.
Rollback is a routing/process operation unless data migration has also occurred.
Never restart the old store against an incompatible new runtime to improvise recovery.
Public cutover status is recorded separately in [RELEASE.md](RELEASE.md).


## Current community UX gate

Use `tests/ux/run.sh` with an installed Playwright package. It uses only a fresh
loopback store; `tests/ux/public-read.cjs` is read-only verification at the exact
public HTTPS origin. Normal CI must not acquire the full native/browser build.

The new media representation keeps core account, post, session, and legacy-media
record layouts unchanged. Additive metadata stores preferences, tags, search text,
and pending chunk receipts. A negative media offset marks chunk-backed files.
Old binaries do not understand that representation: after new uploads, do not
claim an old-binary rollback is compatible with the updated store. Keep a complete
quiescent snapshot and decide recovery explicitly rather than discarding newer
user writes.

The current Coder service must continue to bind port 8793 with its exact public
origin. Updating an established service must preserve its data, objects, bootstrap
secret, and origin. The historical fresh-service `prepare-live.sh` helper has
different initial-host assumptions; it is not a shortcut for this promotion.
No dedicated Cloudflare tunnel should be started or enabled by the application.

A 256 MiB file must not be implemented by raising the native HTTP descriptor
above its transport ceiling. Native upload parts are 4 MiB; full responses are
bounded to 32 MiB, and byte ranges to 8 MiB. Keep object effects outside retried
data transactions, enforce pending-plan ownership before each part, and only
publish a complete acknowledged plan. The full file size is reserved against the
account allowance before accepting any part.

A selected profile image is an explicit public representation. The general
media URL still uses current readable post references or ownership; never make
all of an owner's files public because one is their avatar. The file UI must not
claim a selected profile image is visible only to its owner.
