# lkjsns checkpoint — October 13, 2026

The reply-rendering and favicon update is live through
[Coder public port 8793](https://8793--main--tomato-ocelot-73--lkjsxc.apps.coder.lkjsxc.com).
Promotion completed at **2026-10-13 06:00:36 JST** with existing user state preserved.

Executable source: `e36e471a71263f676cc5799ed94c7ff43710fa4d`

Application SHA-256: `777bedfe7300593453775c88051fa6f4151cb77b6a8be2e3b260b1f76cd85051`

Runtime remains the checksum-pinned lkjscript 0.1.89 executable.

## Current repair

Long parent previews are natively bounded and visually clamped to three lines;
reply bodies are not shortened by that rule. Do not reintroduce a `display:block`
override on `.parent-card .context-copy`. Feed, profile, Search and Bookmarks
reply cards retain their immediate parent context. Reading and composing modes
have separate link/message behavior. Hidden/deleted/muted parents do not leak
content or show draft instructions in reading views.

`threadview` owns bounded readable reply-window selection and the detail page.
`journalview` still owns reusable post/draft cards. Reply indexes and stored
schemas are unchanged. The selected bundle includes SVG/ICO/PNG/touch icons in
`icons`; all authored icon binaries and the SVG belong in source provenance.
Normal and error-page heads use the same `icons::links` declarations.

Drive remains primary. Normal page-title banners stay hidden. Item-native media
selection, whole-draft links, root resource IDs, explicit invitation infinity,
private tags, search, profile images, and bounded file transfer are retained.
There is no new application server, external asset CDN or paid execution agent.

## Verification and operation

The exact bundle passed 482 native tests and 83 synthetic browser groups, including
ten new reply groups, four favicon groups and cold-restart reply/icon checks.
Eleven axe scenarios reported no selected-rule violations. Read-only public
verification passed 26 groups. See [RELEASE.md](RELEASE.md) for identities,
measurements, scope and the preserved-data cutover.

Use `tests/ux/run.sh` via the normal browser command for optional local acceptance;
`replies.cjs` and `favicons.cjs` are included. Regenerating icon rasters must be
accompanied by the matching native payload update; exact-byte browser checks
catch divergence. Never replace production with a synthetic test store or revive
the stopped tunnel dependencies. Keep the Coder Host/Origin and port 8793.

Keep private test evidence, credentials and snapshots out of Git. See
[REPLIES-FAVICON.md](REPLIES-FAVICON.md) for the reproduced regression and
[DIRECT-INTERACTIONS.md](DIRECT-INTERACTIONS.md) for the retained UI/URL contract.
