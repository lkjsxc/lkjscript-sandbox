# lkjsns checkpoint — October 15, 2026

The shared-brand fix is live through the existing Coder public port **8793**.
Promotion completed at **2026-10-15 14:09:54 JST**. Existing accounts, posts,
metadata, file objects and the original lkjsxc profile image were preserved.

Executable source: `8df9ef0fff720ac7275f2bb89fb2f5a220784a45`

Application SHA-256:
`d389cb37ee6837c5534d0a0dba2141df88c23bcb97dec256283801791abbe741`

Runtime remains checksum-pinned lkjscript **0.1.89**. The exact candidate passed
**577 native tests**, **110 fresh synthetic browser groups** (including **312
identity page/width/theme cases**), **49 read-only public groups**, and **8 public
routing/security groups**. See [RELEASE.md](RELEASE.md) for exact graph/tree,
verification boundaries, actual deployment time and preservation evidence.

## Shared application identity

Use `icons::brand` in every desktop/mobile/error shell and `icons::links` for its
document head. The six-image catalog revision is **9ef7b4ce01bf**. Desktop and
mobile brand marks load the same SVG as the favicon. A same-origin native
manifest supplies 192px/512px application icons; Apple touch and fallback routes
are consistent. The earlier b7cf1e2c2a49 paths remain aliases to unchanged bytes.

Do not reintroduce `lk/` glyphs, text-only error brands, a separate image source,
a font dependency or a profile-image replacement. The approved original SVG and
16/32px ICO, 32px PNG and 180px touch images are unchanged. Compact native hex
payloads keep graph/review work bounded without increased limits.

Read [SHARED-BRAND.md](SHARED-BRAND.md) and
[PERSONAL-FAVICON.md](PERSONAL-FAVICON.md). Server verification does not imply
forced refresh of independently cached OS home-screen shortcuts.

## Retained product and hosting contract

The composer has Attach file and Post, not a drafts collection or preview step.
Attachment transitions retain private text, warning, audience and reply identity.
More groups secondary destinations and service information. Mobile navigation is
Home, Post, Notifications, More. Preserve bookmark order, native cursor history,
normal Used in cards, link safety, visibility-aware reply counts, private tags,
4 MiB transfer parts, 256 MiB file limit and the 2 GiB account allowance.

Keep exact Coder Host/Origin, native session/CSRF and port 8793. Do not re-enable
old dedicated tunnels, change unrelated services, or promote test fixtures.
Object effects stay outside retried data transactions. Do not publish internal
snapshots, user data, credentials or generated evidence files in the repository.

Read [quiet workflows](QUIET-WORKFLOWS.md),
[operator responsibilities](OPERATOR-RESPONSIBILITIES.md), and
[Coder hosting](CODER-HOSTING.md). This icon-only release is not a change to the
service policy, data permissions or operator-specific legal responsibilities.
