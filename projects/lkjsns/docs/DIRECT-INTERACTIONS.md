# Direct interaction and resource paths

The main navigation now includes Drive alongside Home, Search, Notifications,
Bookmarks, and Settings. The same destinations are available on mobile.
Normal pages retain a browser title and an assistive heading, but no visible
page-title banner. This is shared shell behavior, rather than a per-page exception.
Meaningful content sections and error/confirmation messages remain visible.

A picker item is the selection control. There is no second Attach/Remove strip
below each preview. Clicking the image, filename, or tile toggles its attachment;
a checked marker and aria-pressed state identify the current selection. The
four-attachment rule and all native ownership/version checks are unchanged.
A filtered library can still show the selected items independently of the active
tag. The same preview interaction removes a selected item from the draft,
not from Drive.

The profile-image picker uses selectable image tiles, including a default tile.
The current profile image opens this picker directly from profile settings.
There is no separate Use as profile image button below each image or in a file's
editing toolbar. These controls remain native forms, keyboard-operable without
JavaScript. The control roles and keyboard behavior follow the
[WAI button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/).

Drafts are single native links containing their preview. They have no nested
interactive controls and no separate Continue writing button. The whole draft
opens its editor, including with Enter or ordinary link gestures. This preserves
native browser behavior rather than simulating a link with a click-only div;
see the [WAI link pattern](https://www.w3.org/WAI/ARIA/apg/patterns/link/).
A reply's readable parent preview is itself a link, without a View original post
or Open original post control. The duplicate reply action and redundant file/
profile navigation shortcuts are removed.

## Resource identity

Posts, drafts, and file-detail pages are addressed as `/<id>`. Existing immutable
64-hex-character IDs are retained; there is no data migration or new shortened-ID
collision domain. A draft's root address opens writing for its owner. Published
post editing is `/<id>/edit`, and the private preview can be opened through
`/<id>/preview` or its edit query context. Original bytes are `/<id>/raw`.

The native root router distinguishes post and file records. A record collision
fails closed. It never derives access from an ID alone: current ownership,
publication, audience, deletion, and attachment references remain authoritative.
Incoming `id` query fields on root resource paths are rejected instead of being
allowed to overwrite the path identity. Raw-media query fields carry only the
readable parent-post context and download disposition.

Old `/note?id=...`, `/file?id=...`, `/compose?id=...`, and `/media?id=...` GET links
redirect to the corresponding path-based address. Valid cursor/draft/visibility
context is retained, while the existing exact Host/query checks run first.
Application-generated links and response locations use the canonical path form.
Creation, search, picker context, and upload-protocol requests still use named
operation endpoints and legitimate query fields; this is not a claim that every
query parameter has been removed from the application.

## Invitation policy

The former 20-person and 30-day product limits are removed. Positive whole-number
counts and durations are accepted without those arbitrary caps. Leaving people
blank means unlimited uses; leaving days blank means no expiration. The default
values remain one person and seven days, rather than silently making every new
invitation unlimited.

Unlimited uses do not decrement, nonexpiring invitations do not become expired,
and explicit revocation always works. Finite invitations still consume exactly
one use per successful registration in the native transaction. Zero, negative,
fractional, malformed, or nonrepresentable values are rejected. Checked 64-bit
parsing and checked expiry arithmetic prevent overflow; unlimited policy is an
explicit sentinel, not an overflowing approximation of infinity. Existing finite
invitation records are preserved and continue to work.

## Verification boundary

`tests/ux/direct-interactions.cjs` checks the redesigned controls, canonical and
legacy URLs, private-root denial, conflicting-ID query rejection, keyboard/no-script
operation, large invitation values, unlimited reuse, revocation, finite exhaustion,
and numeric overflow. The usual native and complete browser suites remain the
release gate, including media byte integrity and cold restart. The current
[release record](RELEASE.md) states what was actually tested and deployed.
