# Reply rendering and favicon release — October 13, 2026

The reply-display repair and native favicon assets are live at
[the existing Coder entry](https://8793--main--tomato-ocelot-73--lkjsxc.apps.coder.lkjsxc.com).
Promotion completed at **2026-10-13 06:00:36 JST** (2026-10-12T21:00:36Z).
Existing accounts, posts, files, sessions and invitations were preserved. The
same Coder workspace, public port 8793, origin and custom-domain alias remain.

## Reproduced reply issues and repair

A later `.parent-card .context-copy { display:block }` rule had disabled the
parent excerpt's line-clamp container. In the isolated reproduction, the same
30-line multilingual parent occupied **745.375px** at a 390px viewport and the
reply card did not start until **834.375px**. The old Home reply card also had
**zero parent links** after the previous original-post-button removal.

The new native excerpt is bounded on a UTF-8 boundary and the stylesheet clamps
it to three lines. At the same 390px viewport, the measured parent preview is
**114.65625px**, and the reply's own body starts at
**277.921875px**, inside the first viewport. **Only the parent preview is
shortened; the reply body is not truncated by this rule.**

Home, Search, Bookmarks and profile reply cards now retain a directly clickable
parent preview. A focused reply shows its immediate parent in the card. Direct
replies beneath an already-visible parent do not repeat that same preview.
Nested replies link to their immediate parent and retain their own resource URL.
Reading links use the same tab, while composing links can still open a separate
tab to protect unsubmitted input. No View original post/Open original post button
or normal page-title banner is reintroduced.

Deleted, muted or otherwise unreadable parents become a compact unavailable
context, without their private handle/body or composing instructions appearing
in a reading page. Content warnings hide the underlying parent body. Reply
images still load through their own post's media authorization, not the parent's.

A dedicated reply window checks immediate-parent identity and current readability
and can skip up to four 30-entry windows when the newest entries are all hidden
or removed. An older readable reply is no longer obscured by a deleted first
window. Existing reply IDs, publication records and index entries are retained;
editing a published reply does not duplicate its thread entry.

## Favicon

The website now serves **SVG and ICO favicons**, a 32px PNG fallback, and a 180px
touch icon. They use the existing **lk/** mark in the application's blue accent
with white strokes. This is not a claim to have recreated an unprovided lkjsxc
avatar image.

Normal and standalone error documents declare the same root-relative icons.
They are served from exact native routes with the proper MIME types, without
requiring sign-in or a Node/Python asset server. SVG has no script or external
font dependency. ICO contains checked 16px/32px PNG entries. The committed SVG,
ICO and PNG files are included in the native source manifest and match the bytes
embedded in the selected bundle.

Browser testing checked the declarations and decoded all four representations
at their declared dimensions. Public verification fetched the exact icon bytes.
No physical iOS/Safari certification is implied by the presence of a touch icon.

## Exact executable identity

Source commit: `e36e471a71263f676cc5799ed94c7ff43710fa4d`

Source tree: `71177810ac4880de9977d0f85afd81f08848695c`

Application SHA-256: `777bedfe7300593453775c88051fa6f4151cb77b6a8be2e3b260b1f76cd85051`

Application size: **9,940,091 bytes**.

Runtime remains checksum-pinned public **lkjscript 0.1.89**, executable SHA-256
`e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9`.

Native graph: `rev_9be32818c2ad3dcca0f146d7b9df7139e5c8b7f2b2359a2f0e93e6ad3d44808c`

Internal bundle identity:
`artifact_bundle_9322b491cf59f1155ba984c7fac45d2ad55c8796af727aac8301fe26507063f4`

The internal identity is distinct from the application file checksum. The feature
commit was normally fast-forwarded to main and independently read back through
GitHub. Documentation-only release commits do not change this executable identity.

## Verification on this exact bundle

**482 native tests passed**, with zero failures and equal production/reference
outcomes. **83 synthetic browser groups passed**: the previous 68 plus ten reply
regression groups, four favicon groups, and one additional restart group.

Reply coverage includes multiline/Unicode sizing at four widths in both color
schemes, feed/profile/search/bookmark context, immediate-parent navigation,
nested replies, saving and publishing from preview, edits without index
duplication, warnings/private/muted/deleted parents, actual image attachments,
sparse reply windows, keyboard use and JavaScript-disabled navigation.

The full regression suite also rechecked direct item selection, root-ID URLs,
unlimited/finite invitations, CSRF/Origin/Host validation, tagged Drive, 256 MiB
upload/download SHA-256 integrity, interrupted transfers, and cold restart.
The native data store was verified. These authenticated tests use isolated
synthetic loopback stores, not live user accounts or files.

The existing responsive matrix covers 96 page/theme/width combinations, with
eight additional reply-layout combinations. The optional axe inspection covered
eight primary pages and three populated reply scenarios, reporting zero
violations in its selected rules. These are automated Chromium checks, not full
accessibility conformance or comprehensive cross-browser/device coverage.

**26 read-only public groups passed**: twenty guest page/theme/width combinations,
private-route admission, exact CSS/script bytes, unavailable routes, root-ID
redirect/query authority, exact favicon/touch bytes, and health/browser checks.
No public accounts, posts, invitations or media were created by that verification.

## Preserved state and operating boundaries

A quiescent snapshot retained the preceding executable, bundle, descriptor,
secret, metadata and objects. Data/object paths and SHA-256 values were identical
before and after replacing application files. The bootstrap secret, canonical
origin, runtime binary, capability grants and service dependencies are unchanged.
No synthetic store was deployed and no unrelated service was restarted.

The preceding bundle was `68f9ae90b43ec2e9be05c09569df4f0abdf307362ece12d2e187c10a019b27fb`; its
[direct-interaction release record](RELEASE-DIRECT-2026-10-13.md) is archived.
The restart is not a zero-downtime guarantee. This repair changes rendering and
static assets, not the stored note/media schema.

The previous boundaries remain: explicit saving, bounded literal search,
256 MiB per file, 2 GiB per account, four attachments, 8 MiB profile images,
media HEAD refusal, no transcoding or metadata stripping, and browser transfer
resumption requiring the current page/file handle. See
[the repair notes](REPLIES-FAVICON.md), [operations](OPERATIONS.md), and
[Coder hosting](CODER-HOSTING.md).
