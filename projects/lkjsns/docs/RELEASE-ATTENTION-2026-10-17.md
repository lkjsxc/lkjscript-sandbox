# Attention and circular identity — October 17, 2026

The native public service was updated at **2026-10-17 02:52:20 JST**
(2026-10-16T17:52:20Z). It runs in Coder workspace **devmain**, agent **main**,
on the existing public port **8793**.

[Open lkjsns](https://8793--main--devmain--lkjsxc.apps.coder.lkjsxc.com).
The custom domain is a read-redirect alias to this origin, not a separate host.

## Attention means both people and posts

User relationships now use **Attention**, including profile controls, the selected
people's timeline, notifications, native action names and the account model.
Post reactions also remain **Attention**, as explicitly requested. A reaction to
a post and an ongoing relationship with its author are separate operations;
neither silently performs the other.

Profiles link to **Attention to** and **Attention from**. Both lists keep the
profile identity in view and use ordinary direction tabs, without a redundant
visible title or follower-count display. Avatar, name, handle and short bio form
one profile link. The sibling Attention button can add or remove attention in
place, retaining the viewed person's direction, page and bounded history trail.
Mutual attention, Attention to you and You describe the relationship to the viewer.
Native forms and links work without JavaScript.

Notifications distinguish **Post attention** from **People attention**. The post
button has not been renamed Like or React. Relationship toggles use a stable
Attention label, a separate pressed state and plus/check affordances.

Relationship lists are available to signed-in members, not guests. Mutes remain
independent of attention. Your own outgoing list retains muted people with a
label so that those relationships remain manageable; incoming and third-person
lists honor the viewer's mutes. Missing and suspended accounts do not render.
The updated service-information copy describes this boundary and is dated
October 17, 2026. Member-audience posts remain readable by all registered members.

## Indexed relationships without discarding existing accounts

The canonical account field is `attention`. The old serialized field and old
notification kind are recognized only at the account/notice codec boundary.
Passwords, sessions, profile versions, bookmarks, media and relationship meaning
are preserved; the next ordinary account write uses the new field.

A relation transition and its forward/reverse index updates commit together.
Immutable relationship events are checked against the current edge pointer and
outgoing membership. Removing and re-adding attention cannot resurrect stale
rows or create duplicates, and repeating a desired-state request does not emit
another notification.

Both directions use indexed pages rather than scanning every account on each
request. A window inspects 30 events, with at most four empty windows inspected
per request. Prev/Next preserve the native cursor trail. Legacy incoming ordering
reflects stable backfill, since the old records do not contain per-edge creation
times. New relation events are ordered newest first. Outgoing attention remains
bounded to 512 accounts; historical-index compaction is not part of this release.

An offline native command builds the indexes in resumable batches of at most 16
account/edge steps. It has no HTTP route and does not emit replacement notices
or rewrite existing posts/accounts. An incomplete index returns 503 for its
lists instead of pretending to be a complete empty graph. The public migration
finished before the new service was started.

## A genuinely circular icon

The approved four-color panels, white disk and outlined **lkjsns** lettering are
preserved. An outer SVG circle clips the entire composition. SVG, ICO, PNG,
Apple touch and application images now have transparent corners, not just a CSS
border radius. Desktop, mobile and error-page brands use the same source.

The current six-asset revision is **`23eb76263041`**. New head/manifest/brand URLs
carry this revision. Earlier versioned URLs and unversioned fallbacks remain
aliases to the current circular bytes, not archives of the former square art.
The user's actual profile image is a separate asset and was not changed.

An initial lossless RGBA representation exceeded the pinned native verifier's
persistent-collection budget. The accepted variant retains the existing artwork
palette and adds alpha-aware edge entries, with coverage quantization bounded to
4/255. The 512px representation is 10,372 bytes. Smaller decoder work blocks keep
verification within the existing limits; no native execution/review budget was
raised. There is no new font dependency, external image service or application
server. Previously installed OS shortcuts may retain their own cached images.

## Exact executable identity

Executable source: `8e0b2e9f19faebacb7c474cf3d00fb25c7f0cb72`

Source tree: `495f504f100d4d3f72be5a7c3346e63922740e15`

Application SHA-256:
`e1f55a8b462f9b4e3da6ad3bdffecc64d489a136d886864f70ff89bc5b6b4b16`

Application size: **10,973,707 bytes**.

Native graph:
`rev_00e650f80cf974ef6cef0fc3485f9a8343f5209ede76278b39ebe0202ee0bcc2`

Runtime: checksum-pinned **lkjscript 0.1.89**, SHA-256
`e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9`.

All fragments and targets were accepted through public native authoring
operations. Scoped public draft/plan/apply edits subsequently compacted the icon
payloads and updated the service-information date. The complete candidate was
checked and built again, with an exact source-input manifest. Canonical graph
storage was not edited directly. Later documentation commits do not change this
executable identity.

## Completed verification

The final exact candidate passed **607 native tests**, zero failed, with equal
production/reference outcomes. A fresh isolated deployment passed **120 browser
groups**, including native restart, 256 MiB upload/download, media references,
writing, replies, search, bookmarks, malformed requests and no-script operation.

Attention-specific tests cover both directions, concurrent/replayed desired
state, reciprocal removal, mute independence, notification meanings, safe return
locations, escaped profile text and a 34-person incoming graph with pagination.
Five profile/list/notification routes were checked at 320, 390, 768 and 1280px in
both themes. The current policy date and member-only list disclosure were checked.
The synthetic mobile list screenshot was also visually inspected.

The shared-brand suite covered **312 page/width/theme combinations**, plus
administrative denial and no-script shells. Native image bytes, all aliases,
actual browser decoding, four artwork colors, transparent corners, manifest
parsing and independent profile-image preservation passed. Selected axe checks
reported zero violations on 13 primary/service pages, four attention-list
width/theme cases and the retained reply scenarios. These are Chromium and
selected-rule checks, not physical Safari/iOS/Android certification.

A separate fresh store was created using the exact preceding published artifact.
Eight synthetic accounts established **56 directed legacy relationships** through
real forms. Indexing was interrupted after one batch, the incomplete-list 503
was checked, three further batches completed it, and a completed rerun was a
single no-op batch. Every relationship appeared in both directions; old sessions,
profile versions, avatar, posts and notices survived. A canonical account write
and fresh login with the original password also passed. Native store verification
succeeded. These fixtures were never exposed or promoted.

After public cutover, **49 read-only public browser groups** and **8 routing/
authorization groups** passed. Public CSS, scripts, all six images and the manifest
matched the selected source bytes. Both attention directions required native
sign-in. The routing checks use deliberately invalid, unauthenticated forms;
there were no synthetic writes or real-user sign-in tests against the live store.
The lightweight repository checker also passed before source publication.

## Preserved state and repaired environment

The old app and complete state were retained in a private, stopped-service
snapshot before replacement. All pre-existing immutable data-object hashes
remained valid after indexing. Uploaded media paths/bytes and runtime, bootstrap,
origin and launch-configuration hashes were unchanged. The actual public lkjsxc
profile image matched byte-for-byte before and after the cutover.

The workspace had already changed to devmain, but the custom-domain rule still
redirected to tomato-ocelot-73. That one rule was corrected and independently
read back. It still matches only this hostname's GET/HEAD requests, returns 302,
and preserves paths and queries. Exact native Host/Origin and session/CSRF
validation remain intact. No dedicated tunnel or unrelated service was changed.

Rollback after canonical account writes requires the retained old state as well
as the old application; do not replace only the binary or discard new user writes.
Private snapshots, credentials, stores and raw operational receipts are not in Git.

Previous application SHA-256:
`d389cb37ee6837c5534d0a0dba2141df88c23bcb97dec256283801791abbe741`.

See [attention architecture](ATTENTION.md), [circular identity](CIRCULAR-IDENTITY.md),
[Coder hosting](CODER-HOSTING.md), and the
[preceding shared-brand release](RELEASE-BRAND-2026-10-15.md).
