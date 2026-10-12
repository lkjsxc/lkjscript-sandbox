# Writing and the reusable library

## Product direction

lkjsns is a small, chronological community, not an engagement dashboard. Writing,
reading a conversation, and finding a previously uploaded file should have clear,
stable destinations. Product-owned copy and accessibility names are English.
People's own writing, display names, and file names are not language-restricted.

This iteration concentrates on a specific failure mode: leaving a half-written
post to manage its media. Adding a separate file manager is not enough if moving
between it and the editor loses writing, selection, or search position.

## References and decisions

[Misskey Drive](https://misskey-hub.net/en/docs/for-users/features/drive/) separates
uploaded files from the act of attaching them to a note. lkjsns keeps that reusable
library model, but retains its own current-reference authorization: an unposted
file is owner-only. A public post can make its attachments readable through that
post; moving the same file to a folder does not change its audience.

[Mastodon's posting guide](https://docs.joinmastodon.org/user/posting/) makes post
visibility and media descriptions explicit. lkjsns brings both into the review
step, without turning a description reminder into an unexplained publishing error.
A description belongs to the reusable file, so changing it affects existing uses.
The file editor states this before saving.

[W3C's multi-page form guidance](https://www.w3.org/WAI/tutorials/forms/multi-page/)
informs the navigation model: save input before moving between steps and make
returning possible. The implementation uses native HTML forms and server-side
lkjscript, rather than a second client-side draft state or a modal-only workflow.

## The writing contract

The editor offers Save draft, Save & preview, and Post. Saving and previewing do
not publish a draft. A new draft defaults to Members, meaning everyone registered
here, not only followers. Public includes readers who are not signed in.

Save & upload and Save & choose files submit the current body, content warning,
audience, reply target, and draft version before navigating. Attached files offer
Save & edit details and Save & remove for the same reason. Removing an attachment
keeps its original in Drive and updates both sides of its reference in the same
metadata transaction as the saved text.

Enter in a single-line composer field saves the draft rather than choosing a
file or posting it. A new post still requires the explicit Post action. For an
already-published post, the implicit action saves its permitted text changes.
This uses the native HTML form default, not a JavaScript key handler.

The preview is an owner-only view of the saved draft. It uses the same content
renderer as an actual post, including literal text escaping, content warnings,
media controls, descriptions, and sensitive-media disclosures. It has no likes,
reply controls, invented publication time, or public preview URL. Missing media
descriptions are called out without blocking a deliberately textless media post.
An empty draft cannot be posted from the preview.

Posting a preview goes through the normal authorization, CSRF, validation,
reference, and version checks. A change in another tab produces the existing
conflict-recovery editor, with both the submitted and current text available.
It does not silently publish the latest server draft or overwrite a newer edit.
Published-post audience, reply target, and attachment immutability remain intact.

This is **explicit saving, not autosave**. Closing a tab, navigating through an
unrelated link, or leaving file metadata unsaved can still lose unsubmitted edits.
The interface must not claim otherwise. Browser-local recovery and richer upload
progress remain separate product decisions, not implied features of this change.

## Library navigation and bounded search

Selecting or removing a file in the picker retains the file-name query, media
type, folder, and cursor. Return destinations are constructed from a small,
validated set of fields; arbitrary return URLs are not accepted. Duplicate fields
are rejected. Existing file-detail attachment forms can omit the entire optional
filter group, but a partial or malformed group is not accepted.

A selected-file tray shows the current draft's attachments independently of the
active filters. Removing an item from the tray preserves those filters and does
not delete the original. Library cards remain distinct from tray entries, with
unique fragment targets and keyboard-visible focus.

File-name matching ignores ASCII letter case while preserving other UTF-8 bytes.
It is not locale-sensitive or accent-insensitive search. Empty result windows can
be skipped, with no more than four 30-entry listing windows considered by one
request. The search stops at the first window with matches; a sparse result page
is not padded by an unbounded scan. Older matches remain reachable with the
explicit next-page cursor. An empty bounded window is not presented as proof that
no matching file exists anywhere in the account.

## Native implementation boundaries

`writingintents` owns the small, pure vocabulary of writing actions and local
return locations. `writingview` owns the shared content renderer, attachment
controls, review view, and removal-state check. `journalsubmit` connects domain
operations to validation and conflict-recovery presentation.

The submission handler is separate from the journal domain and its views. This
removes their unnecessary circular dependency and lets the pinned runtime review
smaller changes within its existing witness-read budget. No compiler limit is
raised, no canonical graph storage is edited, and application delivery does not
require Node, browser JavaScript, or an external API.

`librarypath` validates filter groups, constructs local returns, and performs the
limited ASCII case fold. Drive browsing and current-reference authorization stay
server-side. There is no synthetic client cache of selected files.

The upload integration checks also cover lowercase and mixed-case MIME part
header names. The parser now compares those names without case sensitivity,
without changing filename bytes or relaxing its single-file, header-shape,
size, or media-content checks.

## Verification entry points

Native tests cover action eligibility, destination construction, filter schemas,
case folding, audience explanations, and empty-preview behavior.
`tests/browser/writing-library.cjs` exercises complete real HTTP workflows against
a fresh loopback fixture, including 125 additional private uploads, older matching
files, stale previews, reverse-reference removal, invalid forms, no-script usage,
and responsive layouts. Its data is not inserted into the public service.

The accessibility suite additionally inspects populated writing, preview, and
filtered selection pages. Actual accepted counts, release identity, persistence
results, and public promotion status belong in `RELEASE.md`, not in this design
record. A source edit alone is not an accepted or deployed release.
