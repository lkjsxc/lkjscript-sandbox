# A usable core before a larger social network

## The experience being optimized

A small community needs a dependable reading and writing loop before it needs more
social features. Optimize for returning to the same conversation, recognizing what
is saved, and knowing who can see an attachment. A long-term architecture that loses
a paragraph during navigation has failed its immediate purpose.

Home stays chronological. Manual refresh protects the reading position; the absence
of a realtime connection is not disguised as a live notification promise. The
composer remains a separate destination, rather than a tiny input squeezed between
feed items. A persisted draft connects writing, file selection, uploading and return.
Do not add an algorithmic timeline, follower-count contest or engagement suggestions
as a substitute for making that loop reliable.

## Borrow workflows, not entire products

[Misskey Drive](https://misskey-hub.net/ja/docs/for-users/features/drive/) is the reference
for reusable files and folders. The deliberate difference is privacy and deletion:
[Misskey's warning](https://misskey-hub.net/ja/docs/for-users/onboarding/warning/)
explains the implications of an unposted file URL; lkjsns instead requires ownership
or a currently readable referencing note. A referenced file cannot be deleted by an
accidental storage-cleanup action. It must first be detached from its uses.

[Mastodon's posting documentation](https://docs.joinmastodon.org/user/posting/)
informs explicit descriptions, warnings and audience choice. Here, Members means
all registered members of this community, not followers. The composer spells that
out beside the scope selector. The primary action says “Post”, not “Make public”,
because submitting a members-only note does not select the Public audience.

These official references were reviewed on 2026-10-11. No third-party assets or
application code were copied. The choices below are this project's design decisions,
not claims that every reference service implements them.

## Three state transitions that must not be conflated

**Save file.** Upload completion creates a ready, owner-private Drive object. The
receipt explains that this alone does not post anything. An interrupted transfer must
not receive that receipt merely because a query parameter says it was uploaded.

**Attach file.** A ready owned file can be attached to the owned persisted draft from
its detail page. This keeps the body and scope, updates both directions of the
reference in the existing data transaction, and returns to the composer. The action
has its own form and explicitly does not save unsaved metadata fields above it.
File metadata has its own clearly labelled save button; its success returns to the
next-step section. Already attached files lead directly back to the body. A full
four-item selection explains the limit and links back to selection, rather than
making the next step disappear.

**Post note.** Only the composer's Post action publishes. Upload and attachment
navigation cannot silently change a draft to published. A failed or conflicting
write preserves submitted text for review. Following, folders and attachment-card
selection must never be interpreted as audience controls.

## Navigation and responsive behavior

Signed-in mobile navigation has four destinations: Home, Drive, Write and Account.
Attachment selection remains part of Write; a user is still writing even while
looking at file cards. Secondary destinations are reachable from Account. Guests
instead receive Home, Sign in and Join with invitation: two taps that only lead to
a login wall are not meaningful navigation. Desktop guest navigation follows the
same model, without a duplicated login button in the footer.

The restrained light/dark design uses native controls, no remote font dependency,
visible focus and a skip link. Mobile form controls use a readable 16px size. Success
messages use status semantics, errors use alerts, and the scope description is linked
to its select control. These features are not a claim of accessibility conformance;
keyboard, screen-reader, zoom and populated-layout acceptance remain necessary.

## Longer-term sequence

First finish the authenticated acceptance matrix and a populated restart/restore
rehearsal, then expose a separate candidate, and only then switch the legacy entry.
That order is more valuable than another unused social feature. Preserve the exact
runtime and bundle together with data snapshots; a source branch alone is not a
restorable deployment.

The next substantial media capability should be validated decoding and derivatives:
bounded dimensions, codec admission, orientation, deliberate metadata handling,
thumbnails and progressive video behavior. Put those behind versioned media states
and retryable jobs, not inside note publication. Report failure and retain the
original without claiming transcoding or metadata stripping exists today.

Incremental browser enhancement is a future option, not a reason to move authority
out of lkjscript. Any upload progress or local-draft enhancement must reconcile with
the same server state, support failed/repeated requests, and preserve a functioning
server-rendered path. Federation, direct messaging and large-scale fan-out are
separate product/security decisions, not prerequisites for this small community.
