# Native local candidate — 2026-10-11

## Delivery boundary

This branch now contains the connected native HTTP application, not a placeholder
boundary response. It is a local candidate, not a completed public replacement.
The legacy repository, users, data, media, process and public entrypoint were not
imported, retired or changed. Authenticated browser and media acceptance remain open.

The pinned public executable is **lkjscript 0.1.89**. The published release was
re-read during this work; this does not assert equality with development main.
Archive SHA-256:
`3b4ced16faa94142c3bcf70098be4168a462dc661d0d3095089dcfd9b0860418`

Executable SHA-256:
`e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9`

## Changes since the connected-source checkpoint

The graph now assembles successfully. Capability bootstrap owns a permanent health
port while retaining the exact capability identities needed by application functions.
The real HTTP target is added only after all router dependencies have been accepted.
There is no temporary product responder and no canonical-store patching.

The media UI test source was reduced from 457,492 to 10,813 bytes by replacing
repeatedly expanded fixture records with three private native functions. All twelve
existing delivery-ACL cases remain. This is a build-source simplification, not a
claim of an equivalent improvement in social-feed or media throughput.

File details now expose the next action in the writing workflow. A successful upload
shows that the file is saved, not posted. Metadata saves preserve the draft context.
An owned ready file can be attached and return directly to the composer, or return
without another mutation when already attached. Full selections explain the limit.
The attachment destination is an enum, not an arbitrary redirect. The established
transaction still updates both note attachments and reverse file references.

The composer labels its primary action Post and explains Members versus Public.
Guests receive navigation they can actually use; the signed-in four-destination
mobile layout is retained. The attachment picker remains part of Write. Success,
error, focus and scope descriptions use explicit HTML semantics. Mobile controls use
16px input text. These source changes do not establish accessibility conformance.

Media request selection now ignores Range on HEAD and unknown range units. A supplied
If-Range conservatively selects the full representation because no comparable media
validator is implemented. Six pure tests cover these choices. Actual HEAD framing,
range byte delivery and privacy revocation still require a populated HTTP fixture.

The checked-in local preparation/run workflow initializes only an isolated development
store and serves only loopback. It refuses accidental reinitialization and duplicate
launchers. Selection verifies the complete source file set, bundle checksum and exact
native graph revision. It is a local consistency check, not malicious-host attestation.

## Evidence and its limits

Earlier connected candidates passed 308 native tests, then 328 after the workflow and
navigation improvements. Those earlier counts are historical, not substitutes for
checking the final delivery-method changes. Final selected-graph evidence is recorded
below only after the corresponding commands complete.

The separate selection-wrapper harness passed ten checks using synthetic files and a
mock status command: exact selection, added/deleted/changed native source, modified
bundle, linked source, noncanonical selection path, changed graph revision, missing
check receipt, and restoration. This does not simulate authentication or object I/O.
An actual stale-selection prepare attempt was rejected before creating a data store.

Anonymous HTTP requests on the earlier connected native server verified public page
responses, private-page redirects, strict Host/query admission and response policies.
Guest login/home screenshots were captured from that earlier candidate. Only the
initial login screenshot was visually reviewed; these are not populated or final-UI
browser acceptance. Final local HTTP observations, when completed, appear below.

Custom browser automation was rejected by the execution environment before account
registration. No test account was created, and no authenticated browser run passed.
A later read-only investigation was also denied; it was not treated as a passed test
or retried through another execution path. Source editing and native builds continued
where available. These blocks are workflow limitations, not evidence of app correctness.

## Release gates still open

Registration/invite exhaustion, login/logout, draft save and navigation, uploads,
metadata editing, both attachment destinations, publication, replies, bookmarks,
notification behavior and conflict recovery need real authenticated acceptance.
Synthetic users and actual valid/malformed media must exercise the native data and
object adapters, not only pure predicates or HTML strings.

Verify guest/wrong-user GET, HEAD and Range; exact payload bytes; range edge cases;
reference-safe deletion; revocation after removing the final readable note; quota;
interrupted-transfer cleanup; restart with populated data; and consistent backup and
restore. Static or empty-store checks do not close any of those lifecycle gates.

The media sniffer is not a full decoder. ISO-BMFF recognition, codec compatibility,
bounded decoded dimensions, metadata handling and browser playback remain work.
No transcoding, generated thumbnails, EXIF removal, email recovery, federation or
physical deletion of retained metadata history is implemented by this checkpoint.

Review populated desktop/mobile light/dark screens, keyboard operation, zoom and
screen readers. Only then expose a separate candidate and deliberately switch the
old public entry. No public cutover or completed product acceptance is claimed here.
See [OPERATIONS.md](OPERATIONS.md) and [USABLE-CORE.md](USABLE-CORE.md).

## Verified local run — continuation

The exact selected graph `rev_532943fe7fdaec0eb8807d9e271fc7481d74d1bee186d115b5d2383bca175024`
passed **334/334 native checks**, with production and reference execution equal.
The selected bundle SHA-256 is
`81d0d86eeb1eb0e154bac59e8c5a81ce7a97c87f99949afb61e78facb8eb581d`.
A separate `./sandbox lkjsns check` against that selected graph also passed.

`./sandbox lkjsns prepare` created an isolated empty native data store and private
bootstrap secret (file mode 0600), without initializing any account. The selected
bundle was started using `./sandbox lkjsns run` on **127.0.0.1:19272**. The native
service returned the expected ready event. Local HTTP smoke verification observed
200 responses from `/healthz`, `/`, `/login`, `/join`, and `/style.css`; 303 redirects
from `/compose`, `/drive`, `/drafts`, and `/settings` as an anonymous visitor;
400 on an unknown query and wrong Host; and 403 on a POST from the wrong Origin.
The process is a local-only development candidate, not a public deployment.

Authenticated end-to-end workflows, media delivery, populated accessibility and
backup/restore remain unverified; they must not be inferred from these checks.
