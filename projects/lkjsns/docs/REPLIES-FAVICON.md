# Reply rendering and favicon

## Reproduced display regression

The direct-interaction stylesheet changed `.parent-card .context-copy` to
`display:block`, overriding the earlier line-clamp container. A synthetic 30-line
parent at 390px produced a 745.375px parent preview; the reply's card started at
834.375px. Its excerpt was not actually clamped. Separately, feed cards had lost
their parent context when the old original-post button was removed. The thread
page reused the composing preview, including a new-tab target and draft advice
when a parent became unavailable.

The repair keeps parent context separate from the reply's body. The native
excerpt is bounded at 360 bytes rounded forward to a UTF-8 boundary, with an
ellipsis when shortened. CSS independently clamps that excerpt to three lines.
The reply itself is never truncated by this preview rule. Content warnings show
the warning summary rather than the hidden parent body; previews do not load
parent media automatically.

Home, Search, Bookmarks and profile reply cards include the bounded parent link.
A focused reply includes its immediate parent in the same card. Direct replies
under their already-visible parent do not repeat that same preview. A nested
reply points to its immediate parent, not automatically to the root. Reading
context uses ordinary links; composing context still opens a separate tab to
protect unsubmitted writing. No View original post/Open original post button or
normal page-title banner is reintroduced.

A parent is checked against current publication, audience, deletion, author and
viewer-mute records. An inaccessible parent becomes a compact unavailable note,
without leaking its handle/body or displaying draft instructions in a reading
page. Independently readable replies remain readable after parent deletion.

Thread rendering uses a bounded dedicated window: at most four 30-entry reply
windows can be considered while skipping an empty/deleted/muted window. Each
result must still identify the requested immediate parent and be currently
readable. Older windows remain paginated. Editing an already-published reply
does not add a second index entry. This does not change stored note IDs, reply
records, publication policy, or media access.

## Favicon delivery

The favicon adapts the application's existing `lk/` mark, using the current blue
accent and white strokes. It is not claimed to be a recreation of an unprovided
lkjsxc avatar image. The checked-in assets are a scalable SVG, an ICO containing
16px and 32px PNG representations, a 32px PNG, and a 180px touch icon.

All normal and standalone error documents link to the same root-relative assets.
They are available through exact native GET routes with matching MIME types and
without requiring sign-in. The browser's ordinary favicon selection follows the
[HTML link relationship](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel#icon);
the parent preview remains an ordinary
[anchor](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a),
not a nested button or another post's click target.

The native application embeds reviewed icon bytes; it does not read arbitrary
web files at request time or use a Node/Python asset server. The complete source
manifest includes the SVG, ICO and both PNG files. `tests/ux/render-icons.cjs` is
an optional development rasterizer; its Playwright dependency is not needed to
build or run the native app from the reviewed sources.

## Acceptance scope

`tests/ux/replies.cjs` exercises multiline/Unicode parent sizing, feed and thread
context, reply-to-reply links, drafts and preview publication, post editing,
warning/private/muted/deleted parents, actual image attachments, sparse reply
windows, keyboard operation and no-script navigation. The favicon suite checks
exact native bytes, ICO structure, browser image decoding, document declarations,
and unchanged Host/query checks. The normal browser regression and cold restart
remain part of the release gate. The actual release identity, outcomes and public
cutover are recorded in [RELEASE.md](RELEASE.md), not inferred from a build alone.
