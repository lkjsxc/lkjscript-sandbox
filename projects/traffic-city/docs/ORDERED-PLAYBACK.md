# Ordered playback across sampled updates

## Problem and repair

Native street snapshots are a bounded sample, not a complete list of everyone
travelling. An identity can disappear from a snapshot because the sample or
viewport changed, without that resident having completed a trip. The browser
previously treated every disappearance as a movement to the end of the known
path. A partly travelled edge could therefore be completed within one display
interval, making the omitted traveller accelerate past still-observed traffic.

TrafficMotion now retains that identity's last observed pose for the remainder
of its existing buffered interval, then removes it as before. It does not invent
an arrival or a faster exit. Geometry for the retained pose is prepared once.
Observed identity pairs continue to use exactly the previous interpolation,
shared presentation clock, native queue ranks, turning paths and lane offsets.

This is a presentation-only correction. There is no new actor sampling, no change
to counts, actual routes, capacity, simulation, native authority, persistence,
private city keys or ownership. Walkers remain single circles. Cars, trains,
streets, buildings, the river and all static paint retain their appearance.
It does not prohibit legitimate passing in different native lanes or purport to
fix every possible traffic model issue. Disappearing/reappearing sample identities
can still be visible as such; they no longer receive fabricated fast movement.

## Reproduction and evidence (2026-10-15)

The new motion-sampling unit test failed on the predecessor, then passed with
this change for walking, driving and station-access walking. It also checks that
an expired identity cannot remain as a permanent ghost. It is part of npm test.
The existing geometry, timing and demand-painter tests remain intact.

A disposable browser/native session recorded 113 native messages from the
1,024-person River Boroughs example through cycle 86. Capture used a test-only
125 ms requested native interval; actual arrivals were slower. The exact same
recorded native messages and arrival times were then replayed at nominal 60 Hz
through the predecessor and the candidate. No browser-generated residents,
route commands or simulated native ticks were inserted.

| Recorded replay observation | Predecessor | Candidate |
| --- | ---: | ---: |
| Sampled presentation frames | 5,189 | 5,189 |
| Omitted-identity samples moved beyond their last observed pose | 332,120 | 0 |
| Detected omitted-follower overtaking events | 43 | 0 |
| Still-observed pose comparisons | 217,387 | 217,387 |

All 217,387 still-observed coordinates agree within 1e-10 world units. Rendered
identity lists and their counts agree on every replay frame. There were 6,288
identity omissions between advancing native messages and 362,911 sampled poses
of omitted identities. Those are observations/events, not distinct residents.
An overtaking event here requires a previously following omitted identity to
pass a still-observed identity on the same straight segment/direction; cars must
also share the same lane. Distinct tick-pair/identity-pair events are counted once.
This is a precise regression criterion, not a universal no-overtaking proof.

The retained game graph passed 709 native tests with zero failures and equal
production/reference results. The HTTP-only build passed 99 native tests. The
selection check verified both executables/artifacts, all 137 unchanged non-HTTP
modules and the eleven exact embedded browser assets. The complete core suite
and the new regression test passed locally.

Local real-browser release checks passed park construction, native save
acknowledgement, exact saved-city reload, pedestrian pixel checks, portrait
layout, zoom and pan. Under OS reduce with default Smooth, walkers, cars and
train drawing poses moved in 119 of 119 adjacent comparisons across 120 frames.
The demand-rendering suite observed 90 paints in 90 moving browser frames,
zero paints in settled pauses (including the 2,048-person example), and zero
paints during its explicitly synthetic two-second hidden-document signal.
Page errors, failed HTTP responses and WebSocket errors were empty.

An initial 2,048-person smoothness profile overlapped other local verification.
It had 2.09% stationary/undrawn frames and a 266.6 ms maximum hold, failing the
existing strict 250 ms hold limit. This attempt is retained, not counted as
passed. It does not by itself identify the cause of that timing variation.
The rendering change does not alter PresentationClock or server cadence.

## Build and replay

```sh
npm run test:motion-sampling
LKJSCRIPT=/path/to/selected/0.1.83/lkjscript npm run build:web
npm run test:presentation-selection
npm run check
npm test
HTTP_CITY_SELECTION=.build/web-selection.json \
  node tests/with-preview.mjs tests/classic-release-ui.mjs
HTTP_CITY_SELECTION=.build/web-selection.json \
  node tests/with-preview.mjs tests/demand-render-ui.mjs

# Optional evidence capture/replay; predecessor and capture are separate inputs.
HTTP_CITY_SELECTION=.build/baseline-web.json PREVIEW_TICK_MS=125 \
  node tests/with-preview.mjs tests/queue-order-capture.mjs
BASELINE_MOTION=/path/to/verified/predecessor/web/motion.js \
  ORDER_CAPTURE=evidence/queue-order-before-4.json \
  npm run test:motion-sampling-replay
```

Historical selections are not self-contained fresh-clone fixtures. Build and
serve the HTTP selection alongside the separately selected game, never by
substituting an unverified session artifact. Raw wire captures, browser keys,
test stores, logs and deployment records remain in ignored private directories.

## Release boundary

The selected native session remains
`7a11d91c4de42ac23dea569720f0e0f6f134f8926e1531f0aa50e30e6f482af7` on
lkjscript 0.1.83. The new HTTP-only artifact is
`e3e7501c5a9fcd10d50cf9d4bb78a154d57702035288a99b0ff3b68ba1360f7b`.
At this source checkpoint, the independent candidate HTTP listener is staged;
public cutover and its verification must be recorded separately. No paid model
API or Codex task was launched.
