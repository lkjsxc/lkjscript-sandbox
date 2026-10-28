# Quiet workflows — October 13, 2026

## Product decisions

Writing has two visible actions: **Attach file** and **Post**. An existing published
post has **Save changes**. There is no exposed draft collection, Save draft action,
preview step, or routine warning about persistence. The attachment workflow still
commits an owned working copy before leaving the editor. Text, content warning,
audience, reply identity, and attachment selection therefore travel together.

This is not a new continuous autosave guarantee. Retaining input during a native
attachment transition and publishing a post are different operations. An implicit
form submission must never publish a new post. Stale versions and failed requests
must retain the attempted input instead of silently replacing a newer version.
The UI does not need to describe these implementation details during normal use.

The desktop navigation retains Home, Search, Notifications, Bookmarks, Drive,
and Settings, and adds More. The mobile dock is always Home, Post, Notifications,
and More. Secondary destinations select More on mobile. Settings contains actual
profile/security settings and sign-out; More provides discovery, account links,
administration when authorized, and public service information. Account menus do
not permanently pin About to the bottom of the sidebar.

## Reading and navigation

Bookmarks are ordered by the time they were added to the bookmark list, newest
first, rather than by the creation date of the underlying post. The existing
append-ordered account list is traversed backwards; no data migration is needed.
Removing and later adding a bookmark makes it the most recently bookmarked item.

Pagination sits below its collection in one native navigation landmark. Prev is
on the left, with the larger Next control on the right; Next alone keeps the full
width on the first page. Traversing it adds a bounded history of exact native
cursors, allowing Prev to restore the preceding page and its filters. Arithmetic guesses such as cursor plus 30 are
incorrect for sparse or filtered pages. A direct cursor URL with no preceding
history offers First instead of inventing a previous destination. Search maintains independent post and people cursor histories, and neither
pager resets the other collection. The mechanism works in native HTML without relying on JavaScript or browser history.

The cursor history contains only verified numeric positions and the initial-page
sentinel, never a user-supplied destination URL. It is capped at 64 positions and
704 bytes. Exact query/form schemas, duplicate rejection, and native access
checks still apply. Native reaction forms and file-selection forms preserve the
history while returning to their current collection.

Reply metrics use the same direct-reply visibility, suspension, and mute checks
as the conversation list. Working copies, removed replies, and unreadable replies
are not counted. To bound per-card work, the renderer examines at most 256 indexed
replies. It displays an exact number when that window is complete; otherwise a
positive visible count has a plus sign, denoting a lower bound. An incomplete
window with no readable reply does not falsely claim a zero. This avoids a schema
migration and avoids counting private replies through a public aggregate.

## Text admission

Post text has no separate application length limit. The SNS validates UTF-8,
normalizes CRLF/CR to LF, and rejects disallowed C0 controls and DEL. Other form
fields keep their own limits. Text over 64 KiB uses JavaScript and bounded native
transfers; available shared Drive storage and browser resources still apply.

## Files and links

Drive's storage meter and Upload action share one row, with Upload on the right.
The complete file-info block has consistent inset padding, including when the
preview itself is a selection button. Used in reuses the ordinary post renderer,
including author, content, attachments, replies, and actions. A reaction from this
collection returns to the owning file page. File ownership and contextual access
to raw bytes remain independent checks.

HTTP and HTTPS links in posts and profile text are rendered by lkjscript, not by
a browser-side rewriting pass. Everything outside a recognized URL, as well as
its displayed text and attribute value, is escaped. Sentence punctuation,
balanced URL parentheses, IPv6 brackets, and multibyte text are handled without
turning HTML or non-HTTP schemes into executable markup. The number of linked
URLs per body is bounded; additional text remains escaped plain text.

Links open a separate tab with noopener and noreferrer. They carry an external
indicator and an accessible new-tab description. Rendering a link does not fetch
its destination, generate a third-party preview, or execute a remote script.

## Service information

More links to About, Privacy policy, Terms of service, Community guidelines, and
Contact. These documents are readable without an account; registration links to
the relevant terms and privacy information. The contact address comes from the
operator's public GitHub profile, not a guessed mailbox or a private credential.

The privacy copy describes the implemented audiences, account/session state,
original-file metadata, operational retention limits, and manual contact path.
It does not promise end-to-end encryption, automatic exports or account closure,
metadata stripping, analytics consent controls, a fixed backup-erasure deadline,
or other capabilities that the application does not implement. Publishing this
copy is not a certification that every operator-specific legal obligation has
been resolved. Operator identity details and practices must remain accurate as
the service changes.

## Design and implementation references

- Misskey Drive: centrally managed reusable files and explicit attachment use:
  <https://misskey-hub.net/en/docs/for-users/features/drive/>
- Mastodon's August 2026 composer/navigation design preview: reduce unnecessary
  explanatory steps, keep composition focused, and use one primary navigation.
  This is a design reference, not a claim that its preview is a released feature:
  <https://blog.joinmastodon.org/2026/08/5.0-laying-the-foundation/>
- MDN anchor element: native link behavior and new-tab security semantics:
  <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a>
- W3C WCAG 2.2 target size guidance:
  <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>
- Personal Information Protection Commission, general guidelines:
  <https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/>

The implementation intentionally preserves the current post layout, native HTML
forms, English interface, personal favicon, and exact Coder hosting contract.
Candidate verification and an actual public deployment are separate events;
consult the release record for the identities and checks actually completed.
