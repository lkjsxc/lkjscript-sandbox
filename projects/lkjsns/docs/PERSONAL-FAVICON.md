# Profile-derived lkjsns favicon

The favicon is based on the current public `lkjsxc` profile artwork, not the
previous generic `lk/` mark. Both the live community profile image and the public
GitHub avatar were inspected on October 13, 2026 (JST). They use the same four
background panels, centered white circle, and dark `lkjsxc` lettering. The source
avatar is not replaced, resized in storage, or republished as a new user upload.

The adapted artwork keeps that composition and replaces the lettering with the
full **lkjsns** name. The lettering is stored as SVG outlines, not an external font
or a platform-dependent text element. No font file is distributed or needed by
the service. The original circle's diameter is 78.125% of the square, preserved
as a radius-100 circle in the 256-unit view box.

The colors are adjusted modestly rather than replacing the original visual style:

| Panel | Original | lkjsns |
| --- | --- | --- |
| Upper left | `#1e88e5` | `#2589ca` |
| Upper right | `#43a0e7` | `#51aad7` |
| Lower left | `#3a66e3` | `#526fd5` |
| Lower right | `#717bef` | `#8388e0` |

White stays white and the lettering retains `#0b1020`. The full word is preserved
in every representation; at a browser's 16px tab size the four panels and circle
are the main recognition cues, rather than a promise of comfortably readable
six-letter text at that size.

## Delivery and browser caching

The reviewed SVG is rasterized to the existing 16/32px ICO, 32px PNG and 180px
touch representations. The raster palette now preserves all four panels, white,
dark ink and antialiasing shades; it no longer uses the old one-blue palette.

Document heads link to content-versioned filenames derived from the bytes of
all four assets. A changed design gets new browser icon URLs. The original
`/favicon.svg`, `/favicon.ico`, `/favicon-32.png`, and `/apple-touch-icon.png` paths
remain compatible aliases, serving the same new bytes without sign-in. No
arbitrary query-string exemption or changed Host policy is introduced.

The native module embeds all icon bytes. Raster payloads are accepted as separate
small public proposal fragments, followed by the icon dispatch/link declarations;
this respects the pinned runtime's bounded review budget. There is no external
asset server, runtime font loader, image API, or Node/Python application service.

The generation tools are optional development tools:

```sh
LKJSNS_PLAYWRIGHT=/path/to/playwright node tests/ux/render-icons.cjs
node tests/ux/embed-icons.cjs
./project.sh build
```

The checked-in SVG already contains its outlines; these commands do not need the
original font or avatar. Native payloads and routes must be regenerated together.
The standard source manifest binds all native fragments and all four authored
asset files to the selected detached application bundle.

## Verification

Favicon acceptance checks public/legacy and content-versioned delivery, exact
native/source bytes, correct MIME types, ICO entries, browser decoding, normal
and error-page head declarations, four-panel pixel colors, the white center,
dark ink and font-independent lkjsns outlines. Mainline account/post/reply/media
behavior and the current owner's original avatar are not intentionally changed.

The actual build identity, browser checks, preserved-data promotion, and public
verification belong in [RELEASE.md](RELEASE.md). An authored icon or a native
build alone is not evidence that a live browser is using it.
