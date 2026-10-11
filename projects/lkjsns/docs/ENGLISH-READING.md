# English-first, reading-first lkjsns

## Product decisions

lkjsns is a small invitation-only community, not an engagement dashboard. The
home feed is chronological. New activity does not move the page while someone is
reading. A narrow reading column, explicit actions and a reusable Drive are the
core interface. Desktop navigation becomes a compact bottom bar on small screens;
writing and attachment actions remain within reach without a client-side app shell.

All product-owned copy is English: navigation, form labels, errors, confirmations,
accessibility names, titles and relative times. The document language is `en`.
System typography and a cool neutral/blue palette replace the previous Japanese-
first visual treatment. Light, dark and forced-color modes share the same structure.
User-written content can still use any language; an intentional non-English URL-
encoding test remains a test, not interface copy.

The useful reference from Misskey is the distinction between uploading to a Drive
and attaching an existing file to a post. From Mastodon, the useful references are
explicit audiences, content warnings, media descriptions and user-controlled
playback. These are interaction principles rather than a copied visual skin:

- https://misskey-hub.net/en/docs/for-users/features/drive/
- https://misskey-hub.net/en/docs/for-users/onboarding/warning/
- https://docs.joinmastodon.org/user/posting/

This implementation deliberately goes further than a guessable-link privacy model:
an unattached original is accessible only to its owner. A shared media URL must
identify a currently readable post that still references that file. A folder is
organization, not an access-control boundary.

## Preserve the reader's place

Like and Bookmark are small actions, not requests to leave the current collection.
Their forms carry a closed reading-place enum, the current pagination cursor and
a server-validated post identity. The server constructs the return URL; it never
accepts an arbitrary redirect URL. Home, Following, Bookmarks, profile feeds and
parent conversations retain their context. An article anchor returns the reader to
the acted-on post. This is not a claim of pixel-exact restoration after content is
removed or substantially resized.

Published text edits, private drafts and file metadata use version checks. A stale
edit exposes the saved version and preserves submitted input rather than silently
overwriting another tab. Saving a draft, uploading a file, attaching it and posting
are separate actions with separate confirmations. No interface claims autosave.
Members means every registered member, not followers. Public means anonymous
readers can access the post and its referenced attachments.

## A browser defect that pure checks did not catch

The initial native graph passed its pure checks, but a real registration form
failed. `Referrer-Policy: no-referrer` causes a navigation-mode form submission's
Origin to become `null`; the server correctly refused that unexpected origin.
The application now uses `same-origin`. Exact Host and Origin validation and CSRF
checks remain in place. The browser test submits the actual form and does not add
an Origin header on its behalf.

- https://fetch.spec.whatwg.org/#append-a-request-origin-header
- https://www.w3.org/TR/referrer-policy/#referrer-policy-same-origin

## Media contract and current limits

GET serves exact original bytes, with single byte-range support, including open,
suffix and clamped ranges. Unsupported or unsatisfiable ranges are explicit. An
unverified If-Range falls back to the complete representation. A public reference
being deleted revokes subsequent guest access, even when the original stays in
its owner's Drive. Previously downloaded copies cannot be recalled.

The pinned public lkjscript 0.1.89 clears a HEAD response body before encoding its
transport headers and forbids applications from setting Content-Length. It cannot
represent the corresponding GET length without a runtime change. Instead of
claiming that a nonempty original is zero bytes, authorized media HEAD requests
currently return 405 with Allow: GET. Unauthorized requests still return 404 before
this capability distinction. Restore HEAD only after the runtime can express
representation metadata independently of a response body, with real HTTP tests.
Do not reinterpret this limitation as successful HEAD metadata support.

Uploads are limited to 32 MiB per file and 2 GiB per account. Posts accept four
attachments. Image, video and audio playback relies on browser codec support;
there is no transcoding, thumbnail service, automatic EXIF/location removal or
malware scanning. File signatures are checked, not a complete decoder proof.
There is no federation, email recovery or guaranteed physical erasure of retained
data history. These limits must remain visible, not hidden behind optimistic copy.

## Verification and operation

`./sandbox lkjsns build` creates a checksum-bound native candidate and executes
native tests. `./sandbox lkjsns browser` is an optional local Playwright suite using
an already-installed Playwright package. Set LKJSNS_PLAYWRIGHT to its module path
when necessary. No browser dependency is installed or executed by the app server.
The suite creates a new loopback-only store, posts synthetic fixtures through
admitted native HTTP actions, preserves evidence under `.build`, and stops its own
server on exit. It never runs against a public URL. Normal CI remains lightweight.

Browser coverage includes actual registration and invitations, media upload and
playback, byte equality and delivery ACLs, stale edits, reading destinations,
responsive layouts and rejected writes. Layout checks are not full accessibility
certification or a large-community load test. Restart and offline restore must be
verified against populated data as separate gates.

A live service is a detached, checksum-verified executable and bundle with its own
fresh data and object roots. It must not reuse the browser fixture. The tunnel's
current HTTPS origin is recorded atomically and consumed before the app starts.
A quick-tunnel restart may change that URL; the stable long-term deployment target
is a named hostname, not a promise that an ephemeral address will remain forever.
