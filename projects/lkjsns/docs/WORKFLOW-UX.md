# Workflow UX refinements

These are implementation decisions and acceptance criteria, **not a visual review
or a completed screen set**. They refine [DESIGN.md](DESIGN.md). The delivered
source/evidence boundary is recorded in [WORKFLOWS.md](WORKFLOWS.md).

## Product judgment

Optimize for a small community whose members can reliably read, write and reuse
files. Do not measure progress by the number of sidebars, settings or social
features. The first coherent product is a complete conversation loop with clear
ownership and recoverable mistakes, not a partially wired collection of screens.

Uploading means storing a private file. Saving means keeping a private draft.
Publishing means making a note readable to the displayed audience. Those three
verbs must never share an ambiguous primary button or a hidden side effect.

## References and boundaries

[Misskey Drive](https://misskey-hub.net/ja/docs/for-users/features/drive/) informs
reusable files, folders and choosing an attachment from existing storage. Its
documented deletion cascade is deliberately not adopted: freeing storage must
not silently remove a conversation. Files in use need an explicit usage list and
an explanation before deletion can become available.

[Mastodon posting](https://docs.joinmastodon.org/user/posting/) informs visible
posting scope, content warnings and useful media descriptions. Adopt the clarity
of those controls rather than recreating its whole feature set. An attachment
without text must eventually be a valid note; a warning should hide the associated
content, not merely add a colored label above an already exposed preview.

[W3C WAI form notifications](https://www.w3.org/WAI/tutorials/forms/notifications/)
inform prominent, specific feedback and a meaningful recovery action. A generic
red toast or an instruction to use browser Back is not sufficient evidence that
someone's submitted work survived. These patterns alone do not establish
accessibility conformance.

## Navigation and visual hierarchy

Use a two-column desktop application by default: stable navigation and a readable
content column, approximately 680–720 CSS pixels wide. The third explanatory rail
in the old page shell is a proposal to remove, not a change delivered in this
checkpoint. Repeated product slogans and feature explanations do not belong next
to every conversation. Put occasional help beside the operation it explains.

On mobile, keep four stable destinations: Home, Drive, Write and Account. Account
owns access to drafts, bookmarks, notifications, members and settings. Do not make
secondary destinations desktop-only. A separate notifications badge is justified
only after its unread state and acknowledgement behavior actually exist.

Use restrained separators between notes, consistent avatars, readable whitespace
and a visible focus outline. Make a file card or member row openable across its
non-interactive area. Do not make an entire note one giant click target: selecting
text, opening a media item and pressing a reaction must remain distinct actions.
Avoid icon-only controls for audience, deletion and attachment selection.

## Reading without losing position

Everyone and Following are explicit chronological views. Do not reorder the feed
by reaction counts, surprise the reader with a new recommendation mode, or insert
new notes above their position. Start with manual refresh and honest pagination.
A future new-items notice should let the reader choose when to refresh.

A query cursor refers to a stable position in an ordered index. Filtering private,
deleted or muted entries must not imply the end of history; retain a next-page
action when more index entries remain. A page with no currently readable entries
must not state that the entire community is empty.

On a note permalink, show the reply relationship before the reply composer.
Preserve the context when returning from an action. Eyes and bookmarks submit the
desired resulting state, not a blind toggle. This prevents a repeated delivery
from undoing the reader's original intention, subject to actual transaction tests.

## Composition and recovery

The primary new-note screen needs a labelled body, a visible audience selector,
a secondary warning field and two distinct actions: Save draft and Publish.
Default to Members. Keep a published note's audience and reply parent immutable
until safe audience-changing semantics and their effects are deliberately built.

The initial native/server-rendered implementation must not label itself autosaving.
A saved-state label describes the version actually stored, not unsubmitted edits.
A query string that says `saved=1` is not evidence of a commit. Passwords must never
be echoed as part of a generic submitted-form recovery view.

Before opening the picker, save body, warning, audience and reply target with the
draft version. Use an honest action such as “Save and choose attachments.” The
picker edits that one persisted draft. Returning from a new upload must retain the
draft ID; upload completion must not redirect the user to an unrelated screen or
publish their draft.

On a validation failure, return the submitted text in editable controls with the
specific problem. On a stale version, show current saved content and the submitted
content, then require a deliberate reviewed save. Do not silently overwrite, merge
arbitrary paragraphs, or retry publication after an uncertain response. A draft
must remain available after login expires, or the error response must preserve
its submitted non-secret content without disclosing someone else's data.

## Drive as a library, not an upload dialog

Drive lists owned files independently of the feed. Provide file-kind and name
filters, folders, quota and explicit incomplete-transfer state. Folder membership
is organizational and must never change who can read bytes. Keep the initial
folder model flat rather than showing unsupported nesting controls.

The picker shows an understandable preview and filename, selected state and the
attachment count. Selection and opening file details are different actions.
File details own the description, sensitive flag, folder and usage list. A note's
publication scope is shown in that usage list: hiding one note cannot make a file
secret while another public note still intentionally exposes it.

A file used by any draft or note cannot be deleted silently. Offer links to those
uses and require references to be removed through their owners first. The note
and its reverse references must change together. A stale usage screen must not
be enough authority to delete the file after another tab attaches it.

Do not invent thumbnails, compression or video transcoding in the interface.
Until such processing exists, say that originals are stored, and explain that
browser codec support affects playback. Do not autoplay audio/video. Provide
native controls, meaningful descriptions and an explicit sensitive-content reveal.
Do not promise EXIF stripping, media sanitization or physical erasure of history.

## Long-term architecture without premature expansion

Keep metadata/index authority in native lkjscript and object bytes separate.
Identifiers locate a record; they do not authorize it. Every direct media read,
including a partial response, must validate a current readable note reference or
owned Drive access. Hiding a button cannot substitute for that rule.

An interrupted object upload is a recoverable state, not a transaction that can
be described as rolled back. Give the user a way to recognize and reconcile an
incomplete transfer without pretending a progress percentage exists. Cleanup must
not race an active upload. A backup must pair the appropriate metadata snapshot
with its objects and prove restoration, not merely create an archive file.

Do not require federation, DMs, native mobile clients or a recommendation system
to finish this loop. Their privacy and operational contracts are separate work.
Likewise, avoid a large frontend framework just to mask unreliable forms. Should
small progressive client behavior later become useful, it must preserve the
server's authority, work without background third-party services and degrade to
the complete native flow; it must not become a second application backend.

## Acceptance scenarios

Before a separate preview is exposed, one synthetic user must register through an
invitation, compose a draft, leave and resume it, upload a real photo and video,
choose existing files, publish, receive a reply, add/remove Eyes and a bookmark,
and find the same data after restart. A second user and an anonymous reader must
see only what their current permissions admit, including direct media URLs.

Use two tabs to collide saves, re-submit a request after a missing response,
attach a file while another tab tries to delete it, revoke the last public media
reference, expire a session mid-flow and interrupt an upload. Check both the
visible explanation and the actual stored outcome. A screenshot cannot prove
these behaviors.

Inspect desktop and 390px mobile layouts at normal size and 200% zoom. Walk the
flow using only the keyboard; inspect focus, headings, labels, error summaries,
light/dark contrast and reduced motion. Do not expose empty controls for unfinished
features or count a non-product HTTP boundary probe as a successful preview.
