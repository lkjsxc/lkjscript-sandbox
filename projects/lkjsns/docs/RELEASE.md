# Reading flow and resource addresses — October 17, 2026

Published at **2026-10-17 14:27:21 JST** (2026-10-17T05:27:21+00:00) through the existing
Coder workspace **devmain**, agent **main**, public port **8793**.
The origin remains <https://8793--main--devmain--lkjsxc.apps.coder.lkjsxc.com>.
The independent domain remains a read-redirect alias, not a second application.

## Pagination belongs to its collection

Prev and Next share a single row after the items they paginate. No previous-page
control appears above a profile identity, Everyone/Attention tabs, search input,
file details, picker context or the post being discussed. The left control is
Prev, or First for a direct cursor without history; Next stays on the right and
uses the full width when alone. Search has separate named post/people pagination
and independent cursor histories, so navigating one list retains the other.

This integrates the unfinished, unpublished pagination changes already in the
worktree when this request began. They were retained in a private patch and an
exact source baseline rather than discarded or confused with the live service.

## Back to reading is not a previous page of replies

Individual posts have a separate Back link at the top. Its native fallback uses
only bounded, validated same-host reading locations. Foreign, direct, editor and
self-post entries fall back to Home instead of looping or accepting an arbitrary
return URL. Native links work without JavaScript.

The existing first-party script additionally restores the original feed/filter,
page and scroll offset, and avoids returning to an intervening reaction or edit
submission. It uses the preceding browser entry only when that entry is known
to match. Otherwise it uses the validated internal link. Per-tab state is bounded
to 24 reading positions and 24 post-return records, with a 30-minute eligibility
window, no post text or credentials, and clearing on sign-out. Service-information
copy now describes that local reading state. No external analytics or JavaScript
application server was added.

## Short post URLs and profile paths

New posts and working copies use **16-character lowercase base32 IDs** drawn from
80 random bits. Existing 64-character posts retain their stored identities and
resolve through explicitly indexed short aliases; old readable URLs redirect.
Reply indexes, bookmarks and media references are not destructively rewritten.
Authentication, CSRF, invitation, media and digest validators stay full-length.
A post ID remains a resource identifier, not a substitute for access checks.

Profiles use **/@handle**, with **/@handle/attention/to** and
**/@handle/attention/from** for relationship lists. Old query-style profile and
attention URLs preserve their cursor/trail when redirecting. A query cannot
override a handle or direction established by the path. Member-only relationship
lists, ownership, mutes, post audiences and native CSRF/Origin checks remain intact.

The offline native post-index command walks the timeline and working-copy indexes
in resumable batches of at most 16 steps. It writes only alias/checkpoint data,
has no HTTP route, and completes before service admission resumes. Incomplete
indexes return a preparation response and refuse writes rather than displaying
broken links. A collision never overwrites an existing mapping or silently opens
a different post; it is rejected. Missing legacy query URLs are checked against
the original post before redirecting, including the deliberately forced collision
case in the isolated suite.

## Parent above, reply below

A reply's immediate parent is a separate sibling above the reply article, with
normal avatar, identity, text color and a quiet connecting line. It is no longer
a dark In reply to quotation nested inside the reply body. Parent excerpts remain
bounded to three lines; thread rows avoid repeating the parent already in view.

Warnings never reveal the warned body. Private, deleted, suspended and muted
parents retain their existing visibility checks. Original attachments are not
rendered through an inaccessible preview. Composer previews keep the safe
separate-tab link and the original reply identity. The synthetic mobile layout
was visually inspected in addition to DOM, geometry and accessibility assertions.

## Saves complete an editing task

Save profile returns to the resulting profile. Saving a published post returns
to that post's short address. Independent file settings return to Drive and the
file's anchor; file settings entered from writing return directly to the same
working copy and retained text. Errors, unauthorized changes and optimistic
conflicts preserve recoverable input instead of discarding it during a redirect.
The avatar picker remains a child step of profile editing, and password changes
retain the intentional fresh-sign-in requirement.

Both post reactions and user relationships remain **Attention**, with separate
Post attention and People attention notification filters. The prior redundant
You badge stays absent from the viewer's own profile. Circular favicon/brand
assets and the user's independent profile image were not redesigned.

## Exact executable identity

Executable source: `3c750cb9005456593923d9c5480ab4dbe6f5c83e`

Source tree: `c7b88049633f91d2502bd4fbdb4532856d676cd2`

Application SHA-256:
`d9c8f5d9169c46bf9e1f32a25b6075608c2b1a778c177e36cb28e2e7646e2c22`

Application size: **11,608,801 bytes**.

Native graph:
`rev_18b30daec91a23471842fb901930df013f4f3f0e922bb4726585167320c23a11`

Runtime remains checksum-pinned **lkjscript 0.1.89**, executable SHA-256
`e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9`.

The candidate began from an exact isolated copy of the accepted, unpublished
pagination graph. Every subsequent native change used public draft/plan/apply
operations. Scoped changes preserve existing declaration identities; canonical
graph storage was not edited directly. Native inputs, browser assets, operations
scripts and the complete input file set match the selected manifest. No runtime,
review budget, paid API or application-server dependency was increased.

## Completed verification

The final exact candidate passed **650 native tests**, zero failed, with equal
production/reference outcomes. The fresh full browser suite passed
**139 groups**, including native restart, resumed uploads, 256 MiB
upload/download, media permission boundaries, writing, replies, search, bookmarks,
Attention, the quiet self-profile and no-script workflows.

The pagination suite covers **16 collection contexts and 256 layout cases**:
four widths, two themes, JavaScript enabled/disabled, plus real Prev/Next actions.
Both search histories stay independent, and attachment choices retain the exact
working-copy, filter, cursor and history. The shared-brand suite retains **312
page/width/theme cases**; self-profile coverage retains **48 cases**. Reading-flow
checks cover short IDs, native profile paths, completed saves, sibling parent/
reply layout, Back through filters/pages/scroll and intervening reactions, direct
or foreign fallback, and no-script navigation. Selected automated accessibility
checks cover the new and retained workflows; this is Chromium/selected-rule
coverage rather than physical iOS/Android/Safari certification.

A separate fresh private store was created with the exact preceding published
bundle. It contains **39 legacy posts/working copies**, two accounts, replies,
a bookmark and referenced media created through real native forms. Indexing was
interrupted after one batch; the incomplete-service 503 and refusal to write
were checked. Five additional batches completed indexing, and a completed rerun
was an idempotent one-batch check. Every legacy resource, owner/session/password,
reply, bookmark and file-reference test passed. A new short-ID reply to an old
parent and editing the old parent also passed. A forced alias collision was
rejected for root, note-query and edit-query URLs without replacing its owner.
These fixtures were never exposed or copied into production.

Public verification after the actual cutover passed **49 read-only
browser groups**, **16 pagination cases**,
**8 resource/reading-flow groups**, and **8
routing/security groups**. Public CSS, scripts, icons and manifest matched the
selected source. Authenticated workflows were tested on synthetic loopback data;
there were no real-user sign-in tests or synthetic writes against the live store.
The routing suite's deliberately invalid unauthenticated requests did not create
or mutate user content. The lightweight repository checker also passed.

The first external reading-flow attempt encountered one 30-second navigation
timeout. An immediate independent request returned the complete profile with
HTTP 200 (153 ms to DOM readiness and 357 ms to load); the unchanged suite then
passed all eight groups, including three public post pages. This records the
observations without attributing an unverified network or browser cause.

## Preserved live state and deployment

A stopped-service private snapshot retained the previous bundle and complete
state before replacement. Post aliases were indexed in eight native batches before restarting the public
service. All previously existing immutable data-object hashes remained valid;
uploaded media paths/bytes and the public lkjsxc avatar matched. Runtime, bootstrap,
origin and launch configuration remained unchanged. New alias/checkpoint records
are expected metadata additions; this is not a claim that all metadata files
stayed byte-identical after migration.

Only the lkjsns service was restarted. The Coder workspace, port, custom-domain
redirect, strict Host/Origin policy and unrelated services were not changed.
Private snapshots, credentials, user data, generated graphs and raw acceptance
outputs are intentionally excluded from Git. Rollback after new short-ID writes
requires careful reconciliation with the retained matching old state, not an
unconditional swap to an older application or discarding later user changes.

The previous self-profile release is archived in
[RELEASE-SELF-PROFILE-2026-10-17.md](RELEASE-SELF-PROFILE-2026-10-17.md).
See [reading flow](READING-FLOW.md), [pagination](PAGINATION.md),
[attention relationships](ATTENTION.md), and [hosting](CODER-HOSTING.md).
