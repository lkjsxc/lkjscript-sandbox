# Ordered playback across sampled updates

## Problem and repair

Native street snapshots are a bounded sample, not a complete list of everyone
travelling. An identity can disappear because the sample or viewport changed,
without that resident having completed a trip. The browser previously treated
every disappearance as movement to the end of the known path. A partly travelled
edge could therefore be completed within one display interval, making the omitted
traveller accelerate past still-observed traffic.

TrafficMotion now retains the last observed pose instead of inventing a faster
exit. An already omitted stand-in is retired at the end of its existing buffered
interval, or earlier if an observed follower would reach it. The latter prevents
a stale stationary stand-in from creating the reverse crossing. This retirement
uses distance along shared path geometry, not a screen-space x/y sort. It applies
only to obsolete display history, never to an actor present in the next snapshot.

Groups and retirement times are prepared per snapshot pair using the existing
path cache. There is no new collision scan on every animation frame, no population
scan, and no new route search. Observed pairs retain exactly the previous shared
clock, interpolation, native queue ranks, turning paths and lane offsets.

This is a presentation-only correction. Native actor selection and its limit,
resident counts, actual routes, capacity, simulation, persistence, private city
keys and ownership are unchanged. The rendered historical list can now be shorter
when an obsolete stand-in retires early; no currently observed traveller is hidden.
Walkers remain single circles. Cars, trains, streets, buildings, the river and
static paint retain their appearance. Legitimate passing in different native
lanes is not prohibited. Disappearing/reappearing sample identities can still be
visible as such; this change removes their fabricated fast movement and stale
crossings, not every possible traffic-model or sampling imperfection.

## Reproduction and exact replay (2026-10-15)

The initial missing-identity test failed on the predecessor and passes with the
repair. The final unit suite has 63 checks: three travel modes, omitted followers,
retiring leaders in four directions, turning roads and curved facility entrances.
It checks arc-distance order on curves, exact observed movement, bounded expiry
and the absence of permanent ghosts. The suite is part of npm test.

A disposable browser/native session recorded 113 native messages from the
1,024-person River Boroughs example through cycle 86. Capture used a test-only
125 ms requested interval; actual native arrivals were slower. The same recorded
messages and arrival times were replayed at nominal 60 Hz through both renderers.
No browser-generated residents or simulated native ticks were inserted.

| Recorded replay observation | Predecessor | Final candidate |
| --- | ---: | ---: |
| Sampled presentation frames | 5,189 | 5,189 |
| Omitted-identity pose samples moved beyond their last observed pose | 332,120 | 0 |
| Straight-street order reversals involving an omitted identity | 41 | 0 |
| Still-observed pose comparisons | 217,387 | 217,387 |

All 217,387 still-observed coordinates agree within 1e-10 world units, and every
still-observed identity is retained. The final renderer retires 1,107 otherwise
visible historical pose samples early; those belong only to already omitted
identities. There were 6,288 omissions between advancing messages and 362,911
omitted-identity pose samples. These are events/samples, not distinct residents.

The straight-street metric checks both crossing directions for two previously
ordered travellers on the same straight street segment and direction, exactly
one omitted. Cars must share a lane. Each tick-pair/identity-pair event is counted
once. Facility entrance curves are not straight-axis order tests: an x coordinate
can reverse without path order reversing. Those curves and turning roads are
covered separately by the unit suite's arc-distance assertions. This defines a
reproducible regression criterion, not a universal no-overtaking proof.

The first hold-only candidate eliminated fast omitted followers but a broader
test found reverse crossings with obsolete leaders. The retirement refinement
addresses those too. The earlier exploratory count of 43 included two curved
facility cases; the final straight-street baseline is 41 under the corrected,
explicit criterion. Neither an intermediate passing test nor an invalid geometric
metric is substituted for the final bidirectional verification above.

## Native and local browser verification

The retained game graph passed 709 native tests with zero failures and equal
production/reference results. The final HTTP-only build passed 99 native tests.
The selection check verified both executables/artifacts, all 137 unchanged
non-HTTP modules and the eleven exact embedded browser assets. The complete core
suite passed; the final expanded 63-case regression also passed independently.

The final local release browser suite passed real park construction, native save
acknowledgement, exact saved-city reload, pedestrian pixel checks, portrait layout,
zoom and pan. With OS reduce and default Smooth, walkers, cars and train drawing
poses changed in all 119 adjacent comparisons across 120 frames. The suite found
64 visible pedestrian glyph color matches in actual canvas pixels. Page errors,
failed HTTP responses and WebSocket errors were empty.

The final demand-rendering suite observed 90 paints in 90 moving browser frames,
zero paints in settled pauses (including the 2,048-person example), and zero paints
during its explicitly synthetic two-second hidden-document signal. Reduced mode
painted four times for four native replies. These tests do not simulate operating
system suspension of a physical phone.

The final 2,048-person profile with OS reduce and Smooth sampled 798 eligible
frames in its 16-second window: zero stationary frames, zero maximum hold and
100% painted frames. Median sampling cadence was 59.88 fps; p95 reported draw
cost was 2.40 ms. Delivered native updates had a 1,786.5 ms median. These are
shared-host observations, not a fixed 60 fps guarantee, native simulation speedup
or physical-device certification. The presentation clock itself is unchanged.

An earlier candidate profile overlapped other verification and failed the existing
250 ms maximum-hold threshold at 266.6 ms, with 2.09% stationary frames. The log is
retained and not counted as passed. An isolated repeat of that candidate and the
final profile passed without loosening thresholds. This does not prove the cause
of the earlier timing variation.

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
HTTP_CITY_SELECTION=.build/web-selection.json PROFILE_LABEL=queue-order-final \
  PROFILE_SYSTEM=reduce PROFILE_ASSERT_SMOOTH=1 \
  node tests/with-preview.mjs tests/motion-profile-ui.mjs

# Optional capture/replay; predecessor and capture are separate inputs.
HTTP_CITY_SELECTION=.build/baseline-web.json PREVIEW_TICK_MS=125 \
  node tests/with-preview.mjs tests/queue-order-capture.mjs
BASELINE_MOTION=/path/to/verified/predecessor/web/motion.js \
  ORDER_CAPTURE=evidence/queue-order-before-4.json \
  npm run test:motion-sampling-replay
```

Historical selections are not self-contained fresh-clone fixtures. Serve the
HTTP selection alongside its separately selected game, not an unverified session
artifact. Wire captures, browser keys, test stores, logs and operational records
remain in ignored private directories.

## Publication boundary

The native session remains
`7a11d91c4de42ac23dea569720f0e0f6f134f8926e1531f0aa50e30e6f482af7` on
lkjscript 0.1.83. The final HTTP-only artifact is
`a5e26288d32a4a1ee1add482c6fa00f91d05881d0e1e3905e1b6596258024d7a`.
It replaced only Classic's HTTP upstream on 2026-10-15 at 13:44:46 UTC.
The proxy was backed up, validated and updated in place to preserve its bind-mount
inode. Prior HTTP listeners remain for rollback. The selected game, session
configuration, supervisor, store path and both Metropolis configurations were
unchanged. No agent-issued native session restart, store reset or migration was
performed. No paid model API or Codex task was launched.

During validation of the earlier hold-only release, existing automatic save-history
maintenance restarted the Classic session at 13:27:04 UTC, retaining 54 records.
Its post-maintenance public browser repeat passed. After the final HTTP cutover,
the same existing maintenance ran again at 13:45:06 UTC and verified retention of
59 records. That overlapping browser run reached its checks but failed the strict
zero-WebSocket-errors assertion because a handshake returned HTTP 502. It is not
counted as passed. Maintenance logs record successful backup/restore/verification;
the executable, game artifact and descriptor remain unchanged. The final release's
post-maintenance public verification is recorded separately below.

### Final public verification

The post-maintenance public release suite completed successfully against the
final artifact: real construction, native save acknowledgement, exact saved-city
reload, portrait layout, zoom and pan passed. It found 61 pedestrian glyph color
matches in the canvas. Walkers, cars and train drawing poses each changed in 118
of 119 adjacent comparisons across 120 browser frames under OS reduce and Smooth.
Page errors, failed HTTP responses and WebSocket errors were all empty.

All eleven final public HTTPS assets matched the selected source bytes. Classic's
root and alias, legacy query normalization, same-origin WebSocket, zero settled
idle paints and the separate advancing Metropolis entrypoint passed. These are
real public-browser checks, not a claim that the user's physical device was
measured. The recorded native-scene order replay and 63-case geometry regression
supply the separate deterministic order evidence.
