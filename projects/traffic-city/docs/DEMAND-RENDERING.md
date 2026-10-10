# Demand-driven classic rendering

Status: locally verified candidate, not deployed in this work session. The
existing classic public game, native session process and both save spaces were
left unchanged. This is a presentation change, not a new simulation engine.

## Behavior

The classic canvas requests a frame for changed native scenes, input, camera and
layout changes, or buffered native movement. A burst of invalidations coalesces
into one pending animation-frame request. Movement retains the previous browser
cadence and shared interpolation clock until the exact received endpoint; it is
not capped to a lower frame rate. Camera motion includes a final detailed frame
after the temporary overview phase ends.

A paused, unchanged scene has no continuous paint loop. Reduced-motion mode
paints received snapshots rather than intermediate animation. A hidden document
cancels its pending paint; visibility restoration requests the latest received
state. None of this stops native simulation, WebSocket processing, connection
renewal, save acknowledgements or ownership checks.

Native sessions also send periodic replies while paused. `SnapshotGate` compares
all received fields except `seq`, `ack`, `saved` and `notice`. Those four fields
still update delivery and UI on every message. An identical scene skips tile,
rail and motion preparation as well as paint. One bounded serialized scene is
retained; this is exact comparison, not a lossy hash or simulation cache. Actor,
rail, layer, congestion and City Lab fields remain part of the comparison,
including newly introduced fields. Pending map-edit outlines invalidate when
queued edit identities change; an unchanged acknowledgement does not repaint.

No colors, single-circle pedestrians, car glyphs, route geometry, buildings,
rail tracks, station entrances, actor limits, native rules or save schema change.
Future canvas-only state changes must invalidate paint explicitly or use the
existing input/native/layout hooks. Do not restore an unconditional draw loop
merely to satisfy a test that assumed idle redraws.

## Verification on 2026-10-10

The selected native game artifact is unchanged:
`91cb1bcc4cca236c4172b99f45547c53bc6e988f6ff0f6e277b1bcaf0b69658d`.
All 137 non-HTTP module hashes and the pinned 0.1.83 compiler were checked. A fresh
check of that retained graph passed 709 tests with zero failures and equal
production/reference results; this is not a rebuild of the game engine.

The new HTTP-only artifact is:
`c7bbc634b1aad80290b5451a7a18de334939e922cce74f5eaa697f6e3bb7af6f`.
Its native build/check passed 99 tests. The HTTP build embeds the eleven browser
files. An earlier complete core `npm test` run finished successfully. The final
scheduler unit cases and browser suites below also returned successful results.
The deterministic cases cover coalescing, frame id zero, reentrant invalidation,
visibility, disposal, native endpoint settling and exact scene comparison.

A later combined selection-identity/core/repository recheck was started, but its
completion could not be retrieved. That repeated run, including its new
byte-for-byte presentation-selection check, is not counted as passed. Source
and artifact identity must be confirmed again before publication; prior success
is not a substitute for receiving the final check result.

A real native-server Chromium test observed zero draw calls during one-second
settled pauses in both the starter and 2,048-person Commuter Boroughs. During
normal movement it observed 90 draws in 90 browser frames and changing resident
positions. Reduced-motion delivered five draws for five native replies over two
seconds, while five native cycles advanced. An explicitly synthetic document
visibility signal produced zero paints over two seconds while four native cycles
advanced, then repainted on restoration. That case does not measure real phone
suspension or operating-system background policies.

The same paused Willow Metro save and camera were compared against the retained
previous HTTP bundle. Full-canvas pixel observations and one-second idle windows:

| View | Before idle draws | After idle draws | Changed pixels |
| --- | ---: | ---: | ---: |
| Desktop overview, 1440 x 1000 | 60 | 0 | 7 / 1,440,000 |
| Desktop detail, 1440 x 1000 | 60 | 0 | 0 / 1,440,000 |
| Portrait, 390 x 844 | 60 | 0 | 3 / 329,160 |

The differences above are measured rather than assumed to be zero. Real native
construction/removal changed the expected canvas pixels and balances at device
pixel ratios one and two, including camera panning and portrait rotation.

The touch-gesture, continuous-city-controls, tunnel and Commuter Boroughs browser
suites also passed with the selected new HTTP and retained native session.
They cover ordered construction strokes, traffic continuing during menus and
removal review, line-only service controls, tunnel/layer editing, interrupted
command recovery and exact saved-city reload. Commuter Boroughs reported 544
walkers in view with 128 sampled and 128 rendered, and a successful save reload.
No additional actor sampling was introduced by this change.

Early candidate browser tests failed because unchanged paused replies still
invalidated paint. They are not counted as passing; `SnapshotGate` fixed that
case, and the reported browser and pixel comparisons were rerun afterward.

## Reproduction and release boundary

```sh
npm run test:presentation-selection
npm test
HTTP_CITY_SELECTION=.build/web-selection.json npm run test:demand-render-ui
HTTP_CITY_SELECTION=.build/web-selection.json node tests/with-preview.mjs tests/render-cache-ui.mjs
HTTP_CITY_SELECTION=.build/baseline-web.json node tests/with-preview.mjs tests/render-equivalence-ui.mjs
```

`baseline-web.json` is a separately retained previous HTTP selection. The pixel
comparison uses that bundle first, then explicitly overrides only current
`app.js` and `motion.js`; both views use the same native save. It is not a
fresh-clone test without that baseline. All servers/stores in these checks are
isolated test instances; generated evidence and selections remain ignored.

Deploy only after authorized inspection of the active HTTP/proxy lifecycle.
Follow the presentation-only procedure in [ATMOSPHERE.md](ATMOSPHERE.md), retain
the current HTTP listener and config for rollback, and leave the native session
writer and save roots alone. Recheck the selected hashes, served asset bytes,
public classic entrypoint, browser edits/save/reload and separate Metropolis URL.
A completed local build is not a completed public cutover.

These results concern unnecessary browser draw/preparation work. They do not
establish total browser CPU reduction, battery savings, physical-phone frame
rates, faster native simulation, or 100,000-person classic support.
