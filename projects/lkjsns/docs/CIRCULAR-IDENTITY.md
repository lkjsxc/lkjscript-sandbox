# Circular application identity

The approved four-panel blue/periwinkle artwork, central white disk and outlined
**lkjsns** lettering are preserved. An outer SVG `clipPath` clips the complete
composition to a 256-unit circle. The four corners are genuinely transparent;
this is not a square image disguised only by a CSS border radius.

The same source is rasterized into 16/32px ICO entries, a 32px PNG, 180px Apple
touch image and 192/512px application images. The rasterizer retains the preceding 80-color artwork palette and adds a PNG
transparency table for the outer edge. Alpha is quantized in steps of 8, with a
maximum coverage error of 4/255. It no longer discards alpha by mapping every
pixel into an opaque color palette. Native-size tests compare the SVG and PNG
coverage and inspect transparent corners, the white disk and dark lettering.

The shared desktop/mobile/error brand still uses `icons::brand`. Every document
head uses `icons::links`; favicon, touch image and manifest references carry one
content revision. Earlier asset paths and unversioned fallbacks remain admitted
aliases to the **current circular bytes**, not immutable archives of square art.
The new content URL is the refresh mechanism for normal browser asset caches.

An initial lossless RGBA representation exceeded the pinned native verifier’s
collection-storage budget. The compact alpha-aware representation stays within
the existing 16 KiB decoder chunk bound. Decoder, review and runtime execution
limits are not increased. This is development-time
rasterization/embedding; the application server remains native lkjscript.

User-uploaded profile images are separate assets and are not changed. No new
font dependency, image service, service worker, remote rendering request or paid
API is introduced. A previously installed OS shortcut may keep its own image;
server verification cannot force every launcher or browser to refresh it.

SVG clipping reference:
<https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/clipPath>.
See [the shared brand contract](SHARED-BRAND.md) for the existing common shells.
