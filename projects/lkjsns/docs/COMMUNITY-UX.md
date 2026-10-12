# Community UX and bounded media transfer

> Superseded in part by [direct interactions](DIRECT-INTERACTIONS.md): Drive is
> again primary, all normal page banners are hidden, picker items are direct
> controls, and resources use root-ID URLs. The transfer architecture below remains.

This work replaces the inventory-like navigation with five primary destinations:
Home, Search, Notifications, Bookmarks, and Settings. The account identity opens
its public profile, not its settings. Drive, Drafts, and Members remain available
from Settings; Profile and Password and security are separate settings children.
Admin is an overview with Invitations as a child, not an invitation form pretending
to be an administration home.

## Interaction decisions

The composer receives keyboard focus immediately and has a visible text boundary.
Audience is a native account preference; the browser also retains an unacknowledged
selection briefly across navigation. Saving or publishing a draft commits its
selected audience. A reply never widens a Members parent.

Writing actions share one group: Save draft, Save & preview, Save & choose files,
and Post. Upload belongs in the attachment picker. Uploading from that picker
attaches a completed file to the saved draft and returns to writing; it never
publishes the draft. The preview displays the actual content before its audience
summary. Deletion has an explicit second confirmation, rather than a disclosure,
checkbox, and final button sequence. In supported browsers that confirmation is
a dialog, so Cancel keeps unsubmitted writing in the editor. The native
confirmation page is retained for clients without JavaScript.

The reading view omits redundant visible Home, Notifications, and profile-title
headers. Feed and activity tabs have a full-width hit area. Post-body clicks open
the actual permalink; links, media controls, text selection, and modifier-clicks
keep their ordinary meanings. The reaction is Attention rather than an endorsement
called Like. It does not imply notification subscriptions or ranking.

Drive has no name-search/type/folder form. A file can carry several private tags.
Tags are separate native metadata, not a replacement public filename and not
public hashtags. Existing filenames remain available for nonvisual file download
cards and Content-Disposition. No filename or media-description editor is required
in the upload workflow. Existing descriptions are retained, not erased.

## References and adaptations

Misskey's [Drive](https://misskey-hub.net/en/docs/for-users/features/drive/) is a useful
model for reusable files separate from individual posts. Its folders are not
copied here: the user's requested organization model is tags. Misskey's
[notes](https://misskey-hub.net/en/docs/for-users/features/note/) keep content,
attachments, content warnings, and audience choices in one writing flow.

Mastodon's [posting documentation](https://docs.joinmastodon.org/user/posting/) and
[preferences](https://docs.joinmastodon.org/user/preferences/) distinguish the
per-post audience from a posting default, and media presentation from extra
metadata. lkjsns keeps those distinctions without importing federation, the
services' exact visibility names, or their media restrictions.

References were checked on October 12, 2026. These are interaction references,
not claims that lkjsns implements either service's full feature set.

## Native server, narrow browser enhancements

All authentication, account settings, post mutations, tag metadata, search,
visibility decisions, quota reservation, object storage, and HTML rendering remain
native lkjscript. Node/Playwright are development-test tools, not an application
server. The browser JavaScript handles focus polish, post-card navigation,
unacknowledged audience delivery, transfer progress/resumption, and binary saving.
It does not authorize an action or bypass native form admission.

A metadata-only form can retry an optimistic transaction conflict at most twice.
A returned stale-version response is not retried or overwritten. This prevents
an audience-preference write from spuriously rejecting a simultaneous post,
while preserving the explicit conflict UI for genuine concurrent editing.

The pinned native HTTP transport has a bounded response/request envelope. Setting
that descriptor to 256 MiB would be an invalid deployment, not a working upload
feature. A 256 MiB file therefore uses 64 immutable 4 MiB object parts, with each
part admitted against its owner's native pending-upload record. A separate
acknowledgement transaction records the object receipt. Only a complete set of
acknowledged parts can become a ready file. Object effects are not executed in a
retried data transaction.

The browser resumes an interrupted upload from the first unacknowledged part
while the upload page and selected file remain available. A page refresh does
not reconstruct the browser's file handle. Quota includes incomplete reservations;
incomplete files remain owner-only and may be removed after the existing five-minute
stale-upload interval. Each account retains its existing 2 GiB total allowance.

The native server ignores untrusted upload MIME labels. Recognized raster images,
audio, and video can render in the browser; other formats, including HTML and SVG,
are stored and delivered as application/octet-stream attachments with nosniff.
This is type-independent storage, not a promise that every format has an inline
viewer. Originals are not compressed, transcoded, or stripped of metadata.

A full response is bounded to 32 MiB and a requested binary range to 8 MiB. Larger
full-file requests lead to the native download screen; its browser control reads
validated ranges. When available, a file-system writer saves progressively;
the portable fallback accumulates the file for a Blob download. Images larger
than the full-response bound are download cards rather than broken inline images.
Media HEAD remains deliberately unsupported with an accurate 405 response.

Profile images are selected from ready, nonsensitive Drive images up to 8 MiB.
A separate public avatar endpoint derives its authority from the current profile
selection. It does not make the private original's generic media URL public.
Changing the selection revokes future avatar delivery of the previous selection;
it cannot revoke bytes a viewer has already downloaded.

## Search and evolution

The search UI accepts one query. Results combine readable published posts and,
for signed-in viewers, member handles/display names. Matching is literal substring
search with ASCII case folding; Japanese and other Unicode text are preserved.
Unpublished drafts, deleted posts, and muted authors are excluded using current
records. Cached normalized text is an accelerator, not a visibility authority.

Work per request is bounded: post search checks at most four windows of 30 indexed
IDs before offering the next page. Member search pages independently. This is not
ranked, fuzzy, federated, or unbounded full-text search. A future inverted index
can replace candidate selection without changing the readability checks or the
single-query UI.

The native router currently has exact capture fallbacks for one through eight
nonempty path segments. Ordinary unknown application paths render a branded
unavailable page rather than an empty transport response. Unusual paths outside
that selector boundary still belong to the transport; the release should not
claim a universal arbitrary-depth fallback.

## Acceptance

The release record, not this design document, records the selected source,
executable/bundle hashes, native test counts, synthetic browser outcomes, measured
256 MiB transfer, restart checks, and actual public cutover. A native build is not
proof of browser behavior, and loopback acceptance is not proof of a public upload
through every proxy on the route.
