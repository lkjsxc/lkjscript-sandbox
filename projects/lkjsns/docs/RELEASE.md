# Shared brand release — October 15, 2026

The approved **lkjsns** icon is now applied throughout the running service, not
only to the browser favicon. The existing [Coder public entrypoint](https://8793--main--tomato-ocelot-73--lkjsxc.apps.coder.lkjsxc.com)
was updated at **2026-10-15 14:09:54 JST** (2026-10-15T05:09:54Z).

## Corrected inconsistency

The preceding favicon release correctly supplied the new four-panel, white-circle,
outlined lkjsns artwork. However, the desktop sidebar and mobile header still
rendered an independent `lk/` text glyph, and the standalone error page used a
text-only brand. Clearing a browser cache could not correct those separate source
implementations.

Normal pages now share `icons::brand` across desktop and mobile. Standalone error
pages use the same component, including access-denied and unavailable-resource
responses. The component loads the reviewed SVG at a stable 32px square and keeps
one English service name and accessible home-link label. There is no old brand
glyph in these shells.

The document head, in-page logo, browser tab/bookmark favicon, Apple touch image,
and application manifest use the same versioned asset catalog. New 192px and
512px PNGs supply application/home-screen icons from the same SVG. A native
browser manifest names lkjsns and declares the icon sizes; the Apple precomposed
fallback is also available. The site does not add a service worker, an offline
cache, or a promise of offline operation.

## Artwork and caching

The approved SVG, 16/32px ICO, 32px PNG, and 180px Apple touch source files remain
**byte-for-byte unchanged** from the preceding release. The four background
colors, white circle, dark full-word lettering, and font-independent outlines are
preserved. This fixes where the artwork is used; it does not redesign the icon
or replace the operator's personal profile image.

The six-image identity catalog revision is **`9ef7b4ce01bf`**. Current document
links and logo images use these new resource URLs. Earlier `b7cf1e2c2a49` image
URLs and unversioned fallback URLs still return their original approved bytes.
The stable manifest points to the new high-resolution image URLs. Asset delivery
retains exact Host/query admission and no-store responses; the content policy
adds only same-origin manifest permission.

An already-created OS shortcut may keep a separately cached image. This release
verifies the image files and declarations supplied by the service, not forced
refresh of every existing home-screen shortcut on every device. No physical
Safari/iOS or Android launcher certification is claimed.

## Native implementation and exact identity

Executable source: `8df9ef0fff720ac7275f2bb89fb2f5a220784a45`

Source tree: `88707dfdaf03dfb2ba252fcd941faa1e35edfddb`

Application SHA-256:
`d389cb37ee6837c5534d0a0dba2141df88c23bcb97dec256283801791abbe741`

Application size: **10,497,547 bytes**.

Native graph:
`rev_dd6475bd9d921928dc33c307bb255d08f421d933cabd630b9a16f6285376957d`

Runtime remains the checksum-pinned **lkjscript 0.1.89** executable, SHA-256
`e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9`.

Binary images are authored as compact hexadecimal constants and decoded by a
bounded native helper. This avoids a separate graph node for each image byte and
keeps the larger icon set inside the existing review limits. No runtime/review
budget was increased. Generation and browser tests use existing local free tools;
application page rendering and asset delivery remain native lkjscript. No font
file, external image service, paid API, or Node/Python application server was added.

The implementation was ordinarily fast-forwarded to main and independently read
back from GitHub. Subsequent deployment-document commits do not alter this exact
executable source identity.

## Completed verification

The selected complete source set passed **577 native tests**, zero failed, with
equal production/reference outcomes. The accepted source manifest binds the
native payloads, browser files, six artwork representations, and manifest to the
bundle. Existing SVG/raster source images were independently compared to the
preceding commit and matched exactly.

A fresh isolated native deployment passed **110 browser groups**, including the
existing account, post, reply, attachment, permission, conflict, search, paging,
256 MiB upload/download, no-JavaScript, and native-restart regressions.

The new identity suite exercised **312 page/width/theme combinations**: 25
signed-in pages, 10 guest pages, and 4 malformed/unavailable paths at 320, 390,
768, and 1280px in light and dark modes. A separate non-administrator access-denial
page was checked as well. Assertions covered actual decoded images, shared
resource URLs, 32px geometry, absence of the old glyph, horizontal overflow,
current and old asset routes, exact source bytes, 192/512px dimensions and palette,
and Chromium manifest parsing with no manifest errors. Synthetic user-profile
image bytes remained unchanged. The mobile logo screenshot was also visually
inspected.

The retained accessibility suite reported zero selected-rule violations across
13 primary/service pages and 3 reply scenarios. This is automated Chromium
coverage rather than a universal accessibility or device certification.

After the actual public replacement, **49 read-only public browser groups**
passed using the same shared brand/asset contract, including guest and error
shells and exact CSS/script/icon/manifest bytes. A separate **8-group public
routing check** confirmed the Coder entrypoint, alias redirects and existing
Host/Origin/session/CSRF boundaries. Deliberately invalid unauthenticated requests
in that routing check did not create or mutate user data. Real-user sign-in was
not used for the synthetic browser suite.

The lightweight repository checker passed for **626 source paths**, syntax,
configuration, documentation links, and dispatcher failures before publication.
The current tests/ux suite was run; historical suites with obsolete UI assertions
were not claimed as newly rerun.

## Preserved data and hosting

The previous live application and storage were retained in a private quiescent
snapshot before replacement. Metadata/object file paths and SHA-256 values were
identical before the swap, after the swap, and after the new service started.
The real public lkjsxc profile image also matched exactly before and after.

The Coder origin, port 8793, runtime binary, capability grants, bootstrap secret,
launch configuration, and unrelated services were unchanged. No synthetic fixture
was promoted. Previous dedicated tunnel services were not re-enabled. Private
snapshot data, credentials, and operational receipts are intentionally not in Git.

Previous bundle SHA-256:
`04d56071771afe60c2e64747e7659590218d16c53d451d84c5f96adb305d867a`.
The [quiet workflow release](RELEASE-QUIET-2026-10-13.md) is archived; its writing,
More navigation, Drive, links, paging and privacy behavior remain intact.

See [shared brand implementation](SHARED-BRAND.md),
[approved artwork](PERSONAL-FAVICON.md), and [Coder hosting](CODER-HOSTING.md).
