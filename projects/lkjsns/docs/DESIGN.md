# Product and architecture decisions

This is a design and implementation-boundary document, not a completion report.
The exact delivered state is recorded in [CHECKPOINT.md](CHECKPOINT.md).

## The product to build

Build a small invitation-only community, not a Misskey clone and not a new protocol.
The main loop is: read a chronological feed, write a note, keep the draft, attach
reusable files, choose the audience, publish, and reply. Drive is a separate first-class
place for files; saving a file must not make it public. The application owns privacy,
identity, indexing, and UI in native lkjscript. An HTTP reverse proxy may terminate TLS;
there must not be a hidden Python, Node, or other language application backend.

Choose Japanese for the user-facing application. Keep the engineering documentation
in English. The product's current job is a responsive web application, not federation,
a native mobile app, an algorithmic feed, encrypted messaging, or a media editing suite.
Those additions require their own evidence and are not prerequisites to the core loop.

## Reference services and deliberate differences

The references below were read on 2026-10-11. They inform decisions; no third-party
source code, icons, photographs or visual assets were copied into this checkpoint.

[Misskey Drive](https://misskey-hub.net/ja/docs/for-users/features/drive/) treats uploads
as reusable files and exposes folders, downloading and attachment selection. Adopt
those separate file-management and reuse workflows. Do **not** adopt the documented
cascade where deleting a Drive file also removes content using it. Show the usage list
and reject deletion while any draft or published note references the file. A user's
attempt to free storage must not silently delete a conversation.

[Mastodon posting](https://docs.joinmastodon.org/user/posting/) makes media descriptions,
content warnings and audience selection explicit. Adopt readable ALT descriptions and
click-to-reveal sensitive media. Keep publishing scope visible beside the primary
submit button rather than burying it in an icon-only menu. The initial scopes are
Members and Public; a draft is a separate unpublished state, not a third publish scope.

[Bluesky's video introduction](https://bsky.social/about/blog/09-11-2024-video) separates
video composition and playback. Its historical file and duration limits are not
lkjsns requirements. This application deliberately does not autoplay video or audio:
playback starts with an explicit user action and the original media uses native browser
controls. Do not present an unimplemented transcoder or derivative-generation queue.

[W3C accessibility fundamentals](https://www.w3.org/WAI/fundamentals/accessibility-intro/)
inform semantic headings, descriptive labels, visible keyboard focus and a skip link.
Compliance is not established by adopting these patterns; keyboard, screen reader,
contrast, zoom, reduced-motion and narrow-viewport behavior still require verification.

## Information architecture

Home owns Everyone and Following, a clearly scoped search field, reply context and a
manual refresh control. Do not move the user's scroll position or insert new content
while they are reading. An explicit refresh is preferable to a broken realtime promise.
A note permalink owns the parent context, replies and owner actions. Reactions stay
limited to Eyes, preserving the existing product choice; bookmarks are private.

Drive owns uploads, file details, folder membership, file-kind filters, search, quota
and incomplete-transfer cleanup. File details show the original, description, sensitive
flag, usage list and destructive actions. A folder is organization, never an ACL. A
folder move must not change any note's audience or invalidate an attachment URL.
The initial folder model is flat; nested folders need cycle-safe ancestry and bounded
operations before they are added. Do not render empty controls implying nesting exists.

Drafts, Notifications, Bookmarks, Members and Settings are secondary destinations.
Desktop navigation may show all of them; mobile navigation should contain four stable
primary entries, with the secondary destinations accessible from Settings or a menu.
Avoid a landing-page hero or repeated promotional explanation inside the working app.
Static guest-page screenshots have been captured; authenticated, populated-layout
acceptance is still required. See CHECKPOINT.md for exactly what ran.

## Composition must survive navigation

The no-application-JavaScript direction makes server-persisted drafts particularly
important. Before opening Drive or the attachment picker, the composer must save the
current body, content warning, scope and reply target. Label this operation honestly:
“Save and choose attachments.” On a validation error or version conflict, render the
submitted content in the response rather than relying solely on browser Back behavior.

The picker operates on one owned persisted note. Every attach/detach operation must
check the note's version, file ownership, ready state, attachment count and duplicate
membership in the same transaction that updates the note and reverse references.
Allow up to four attachments initially. The picker should use thumbnail cards and
explicit attach/remove buttons, not an opaque ID field or a large multi-select box.
Returning from an upload must preserve the original draft ID and return to that note.
Neither navigation nor uploading should publish the draft.

Image-only and video-only notes must be valid. Empty text with no media is invalid for
publication but valid for a saved draft. A published note's audience and reply target
remain immutable in the first release; editing changes only the permitted content.
Conflicts must show both current and submitted content, and never silently overwrite.

## Privacy is checked at delivery, not inferred from a URL

All newly uploaded media is private. An owner may inspect it from Drive. Another user
may fetch it only by identifying a currently readable note that currently references
that exact file. The direct byte endpoint must perform the same check as the HTML
view for every whole or partial request. An opaque random ID is not authorization.

Removing an attachment or deleting its final publicly readable note must immediately
revoke that delivery path. The same file may intentionally appear in more than one
scope; if a public note still references it, hiding another note does not make the
bytes secret. Explain this in the file usage view. Files already downloaded by readers
cannot be recalled. No-store responses and same-origin resource policy reduce accidental
cache reuse but are not encryption or a confidentiality guarantee against the host.

## Two-phase media lifecycle

The public runtime provides incoming byte streams, object storage and bounded range
reads. This checkpoint does not have an authored way to turn a Bytes value back into
a new object-upload stream. It therefore stores a bounded one-file multipart envelope
in a private object namespace and records the payload's offset and length. Only the
validated payload range is eligible for delivery; the envelope has no public route.
The envelope contains only the file part. Authentication material and application
metadata must not be included in the stored file body.

A data transaction first reserves quota and records `uploading`. Object I/O occurs
outside the transaction. The envelope and supported magic bytes are then checked;
a second completed transaction records the payload and changes it to `ready`. Failed
validation removes the object before releasing the reservation. A request interruption
leaves an explicit incomplete entry that is not readable through the media endpoint.
This is reconciliation-oriented design, not an atomic cross-store transaction.

Deletion first verifies there are no references and changes the state to `deleting` in
a completed data transaction. Only then does it delete the object and release quota.
Retries must use the actual state; a missing HTTP response is not proof of rollback.
The current five-minute incomplete-upload cleanup rule must exceed the deployment's
request deadline and cleanup interval. Never allow cleanup to race an active writer.

The initial implemented upload ceiling is 32 MiB of payload with a bounded envelope;
quota is 2 GiB per user, charged by stored bytes, including incomplete reservations.
These are small-community defaults, not measured capacity. Storage metadata lives in
the native ordered DataStore, while object payloads stay outside metadata snapshots.
Feed/index membership uses 32-entry buckets rather than a single ever-growing post list.

## Known security and implementation work before release

The pure codec currently recognizes signatures; it does **not** fully decode media.
In particular, ISO-BMFF `ftyp` recognition must not be described as proof of MP4 codec
compatibility. Add supported-brand checks, decoded dimension/complexity limits where
needed, malformed-container cases and real browser decoding tests. Reject HTML/SVG and
serve only admitted types with nosniff and a restrictive content policy. Do not claim
malware scanning, EXIF removal, transcoding or thumbnail production exists.

The connected HTTP router has been implemented. Acceptance must verify that it rejects incorrect Host/Origin, missing/duplicate/unknown form fields,
missing CSRF, anonymous access and unauthorized owners **before** effects. Destructive
checkboxes must be enforced server-side, not merely marked `required` in HTML. Data
transaction aborts must never yield a success redirect. Upload authorization must be
bound to the current session, and completion must re-check that session's validity.

Direct media tests must include unauthenticated and wrong-user GET/HEAD/Range,
multiple ranges, out-of-bounds ranges, suffix/open ranges, byte equality, and revocation.
HEAD semantics need transport-level verification; no claim is made about Content-Length
until observed against the actual native HTTP adapter.

The native data store retains history and does not imply online compaction. Establish
backup/restore and retention procedures before long-term use. Sessions, notifications,
incomplete reservations and deleted metadata need explicit lifecycle policies. Do not
claim unlimited scale merely because a fixed post count was removed.

## Release gate

The first release needs actual registration through an invitation, login, draft save,
Drive upload, file editing, attachment selection, publication, reply, Eyes/bookmark,
private-file denial, reference-safe deletion, restart and backup/restore tests. Use
synthetic users and media in an isolated store. Verify desktop and 390px mobile layouts,
light/dark schemes, keyboard access, and no console or native runtime errors.

Only after those checks should a separate new deployment be exposed for review.
Retire or migrate the legacy service only as an explicit later operation. Do not change
its public entry, archive its repository, delete accounts or copy its old store merely
because this new project now exists in the monorepo.
