# Classic atmosphere and rendering

Classic Traffic City is again the default public game. Metropolis remains a
separate opt-in experiment; neither save space is migrated or discarded.

## Presentation changes

The renderer now uses `TileIndex` for the current native cell objects. A repeated
viewport reuses its query; every native frame rebuilds the projection after map
replacement, detail reset, heat updates, object replacement and removal. The
query keeps the previous row order and distinguishes ground from underground.
Congestion ordering, assigned tracks, station labels and waiting totals are
prepared once per native frame. Shared rail geometry is cached by immutable
received line objects and route shape. Trains and platform totals stay live.

Each canvas draw reads its layout once. Outside that draw, gestures still read
current layout, including palette changes and portrait rotation. Static road and
building paint is reused at overview as well as detail scale. Dense camera motion
uses direct overview paint to avoid rebuilding a full bitmap on every drag step.
Queues, pedestrians, trains, selection and pending edits remain dynamic overlays.

No new actor thinning, changed glyphs, colors, roads, rail curves, facility
entrances, native rules or save schema are introduced. This restoration release retained the
continuous animation loop. The subsequent [demand-driven rendering candidate](DEMAND-RENDERING.md)
removes idle paint; its separate deployment status is recorded there. Simulation
still follows its native running state, including while menus are open.

## Reproduction

Use the pinned lkjscript 0.1.83 runtime and installed development dependencies.
Keep a native selection built from the unchanged game sources; verify its source,
compiler and artifact hashes. Build presentation with `npm run build:web`.

```sh
npm run check
npm test
HTTP_CITY_SELECTION=.build/web-selection.json node tests/with-preview.mjs tests/render-cache-ui.mjs
HTTP_CITY_SELECTION=.build/web-selection.json node tests/with-preview.mjs tests/browser-render-scaling.mjs
HTTP_CITY_SELECTION=.build/web-selection.json npm run test:city-flow-ui
HTTP_CITY_SELECTION=.build/web-selection.json npm run test:gestures
HTTP_CITY_SELECTION=.build/web-selection.json npm run test:tunnel-ui
HTTP_CITY_SELECTION=.build/web-selection.json npm run test:street-ui
HTTP_CITY_SELECTION=.build/web-selection.json npm run test:commuter-residents-ui
```

For before/after comparison, run `tests/render-equivalence-ui.mjs` through
`tests/with-preview.mjs` with `CITY_SELECTION` pointing to the original native
bundle and **without** `HTTP_CITY_SELECTION`. The test first uses that bundle's
embedded browser assets, then explicitly overrides app/motion with working-tree
files. Both render the same saved, paused Willow Metro city. Generated evidence
and screenshots stay under ignored `evidence/`.

## Public routing and presentation-only deployment

Serve classic at `/` and `/classic`, preserving same-origin `/live` to its existing
native session listener. Keep `/metropolis` and `/metropolis/live` explicit.
On a gateway host, normalize legacy `session_port` queries at the exact classic
entry routes before returning HTML. A relative redirect to the same classic path
without the query avoids selecting an unreachable external TCP port. Browser
storage keys and Origin validation remain unchanged. Local direct listeners keep
their validated `session_port` behavior.

Before changing routes, save the active proxy configuration and identify both
stores and their supervisors. For a Docker single-file bind mount, write the new
contents into the existing file rather than replacing its inode. Run `nginx -t`
and reload; on failure restore the saved bytes in place, test and reload again.

Build a native HTTP-only bundle, pin its compiler/artifact digests, start it on an
unused loopback listener, and compare every served browser asset with source.
After local browser validation, change only the classic HTTP upstream, test and
reload the proxy. Keep the old HTTP listener for rollback and leave native session
and DataStore processes under their existing supervisor. Verify the public root,
legacy bookmark, same-origin WebSocket, edits, save/reload and asset hashes using
a disposable browser context. Do not log browser recovery keys or owner tokens.

## Verification on 2026-10-10

The unchanged native session artifact was verified against all original selected
sources and the live bundle, then its graph check was rerun: **709 passed, zero
failed, production/reference equal**. This is a fresh check of the retained
session graph, not a claim that the new HTTP artifact contains game tests. The
new HTTP-only build/check passed **99 tests**. `npm test` passed, including the
new 360 rectangle/layer differential checks, object/map replacement and removal,
station queues, motion geometry/timing, independent routing, conservation,
deterministic replay and native WebSocket saving/ownership.

The HTTP-only bundle SHA-256 is
`b6c3271e8183236d0c6e19c3a03a3cb92ae15153a97cf8b3c6fbbf3ee9d355da`.
The retained native game artifact SHA-256 is
`f45907341c9dd4d8c040f904d4c2739f433a5ebcb4ec1385a8479de109c82767`.
All eleven served HTML/JS/CSS/icon assets matched working-tree source bytes on
both the staged listener and public HTTPS after reload completed.

Local Chromium suites passed: render cache at DPR 1 and 2, render scaling,
gestures, city flow, tunnels, street glyphs, and Commuter Boroughs residents.
These cover native edits/removal and actual canvas pixels, palette and portrait
layout, drag queue order, line stops/operation, reconnection, single-circle people,
ground/underground and exact save reload. At a fixed viewport, 36/37 draws made
only one tile query and 41/42 layout reads, including native view replies outside
paint. No additional actor sampling was added.

The same paused Willow Metro save was compared before/after: detailed canvas
pixels matched exactly; fit and portrait differed in 0.0122% and 0.0374% of pixels
respectively after static raster compositing. Screenshots were also visually
inspected. These comparisons do not claim every possible city was pixel-tested.

Renderer-only dense native fixtures at 1440 × 1000 produced the following draw
callback p95 timings on a shared Linux/Chromium host:

| Workload | Before | After |
| --- | ---: | ---: |
| 1,024 tiles, overview | 1.5 ms | 0.4 ms |
| 1,024 tiles, detail | 0.4 ms | 0.3 ms |
| 8,192 tiles, overview | 3.6 ms | 0.5 ms |
| 8,192 tiles, detail | 1.0 ms | 0.3 ms |
| 8,192 tiles, pan | 1.3 ms | 1.3 ms |

Stationary samples contain 180 draw callbacks; pan contains 210 samples over
about 3.5 seconds. Pan maximum was 33.3 ms before and 36.0 ms after, so this does
not eliminate occasional rebuild frames. These fixtures use a test-only protocol
adapter and no moving population; they measure rendering, not native simulation
or total browser/GPU cost. Live people and rail were checked separately.

A new public browser context passed `tests/classic-release-ui.mjs`: classic root
and legacy-query normalization, park construction, acknowledged saving and exact
reload, moving native walkers/cars/trains, 64 pedestrian glyphs reaching actual
canvas pixels, portrait layout, zoom and pan. Final browser errors, failed HTTP
responses and WebSocket errors were empty. Early checks observed a transient 502
at existing automatic save compaction; the final public check passed afterward.
The proxy's root and HTTP upstream were changed without explicitly restarting
native sessions or changing either DataStore descriptor. Metropolis remains at
its explicit URL. Private keys, stores, deployment descriptors and receipts stay
outside Git, and CI remains unchanged.

## Limits

Classic has not reached 100,000 residents. Its existing admission limits remain
2,048 residents, 8,192 occupied tiles and a 128 × 128 map. Renderer-only dense
fixtures are not simulation throughput tests. Browser measurements on a shared
Linux host are not a physical phone performance guarantee. Existing automatic
save-history compaction can briefly reconnect native sessions; this release does
not change that lifecycle.
