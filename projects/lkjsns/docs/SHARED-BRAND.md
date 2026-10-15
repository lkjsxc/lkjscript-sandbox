# Shared application identity

The service identity is the approved four-panel blue/periwinkle artwork, with a
white circle and the full outlined **lkjsns** word. The original SVG, palette,
16/32px ICO, 32px PNG, and 180px touch image are unchanged by this integration.
The owner's profile image is a separate user asset and is not replaced.

## One identity, every shell

`icons::brand` owns the brand link and `icons::mark` its image markup. The normal
page shell uses the shared link in the desktop sidebar and mobile header; the
standalone error shell uses it too. There is no separate `lk/` glyph or text-only
error-page logo. A 32px intrinsic square prevents layout movement. The visible
service name and accessible home-link label remain English and appear once.

`icons::links` owns the document-head declarations for normal and error pages.
Favicons, the Apple touch icon, the in-page brand, and the application manifest
resolve to the same content-versioned asset catalog. The favicon layout is not
inferred from a user profile or a loaded font at runtime.

## Browser and home-screen assets

The browser manifest adds native 192px and 512px PNG representations derived from
the same SVG, with explicit sizes, media types, and `purpose: any`. The original
composition is preserved; no monochrome or untested maskable variant is declared.
The stable manifest URL allows a later revision of its icon references to be
retrieved. The document policy permits only same-origin manifests and images.
No service worker, offline cache, tracking, or new application server is added.

The complete identity bundle revision is `9ef7b4ce01bf`. Current document and brand
references use this revision. The earlier `b7cf1e2c2a49` favicon/touch paths remain
aliases to their unchanged reviewed bytes, alongside unversioned fallbacks. The
Apple precomposed fallback is supplied as well. Native Host and query admission
remain strict for all assets and manifest routes.

An already-added OS shortcut can retain its own cached image independently of
what the service supplies. Browser/device update timing is not controlled by
this release. Server-side asset and markup verification is not a claim to have
refreshed every previously installed shortcut on every user's device.

## Authoring and tests

`tests/ux/icon-catalog.cjs` is the common development catalog for generation and
browser assertions. `render-icons.cjs` rasterizes the SVG. `embed-icons.cjs` emits
native byte payloads, shared markup, the manifest, and admitted routes. Compact hexadecimal constants and a bounded native decoder keep image data
inside the existing review budget, without one graph node per image byte or
increased limits. The ordinary source manifest binds all six
images and the browser manifest to the checked native bundle.

The application does not execute these Node tools. Runtime asset delivery and
page rendering remain native lkjscript. The approved SVG is self-contained and
uses outlines, so no font file or third-party asset request is necessary.

The brand browser suite covers desktop/mobile widths, both color schemes,
authenticated and guest pages, post/file paths, attachments, administrative access
denial, malformed requests and missing resources. It checks actual decoded image
sizes, visible 32px geometry, shared URLs, high-resolution palette samples,
manifest parsing, old aliases and unchanged profile bytes. The same read-only
contract is exercised against the running public deployment. Actual completion,
source identity and preservation evidence belong in the release record.

Primary references:

- Browser manifest icon members and sizes:
  <https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons>
- Apple web application icons:
  <https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html>
