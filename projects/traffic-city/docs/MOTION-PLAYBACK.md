# Buffered motion playback

## Problem reproduced

The browser previously advanced its presentation clock at exactly one native
cycle per 500 ms, regardless of when native snapshots arrived. If updates came
once per second, the browser completed the known transition halfway through
that interval, then stopped until another snapshot arrived. The train renderer
had a separate hard-coded 500 ms interpolation timer. This was presentation
stutter, not evidence that residents should move faster in the native model.

## Change

Cars, walkers and trains now use one presentation clock whose cadence is
estimated from a bounded window of actual advancing snapshots. A small jitter
buffer and bounded clock-rate correction preserve continuous, monotonic
playback between already received states. Same-cycle inspect, save and viewport
replies do not change the measured cadence. Paused traffic settles at its final
committed pose; reduced-motion preferences still show committed state without
animation. World/layer/time resets clear stale history.

Geometry for the current pair of snapshots is prepared once and reused across
animation frames, including the existing lane offsets, queue order, turns,
facility entrances and explicit portal geometry. Walkers remain one filled
circle. Snapshot history is bounded to eight actor snapshots and trails retain
at most the existing short history. No route, edge admission, resident, native
clock, account, save format or simulation rule changes.

The clock deliberately never extrapolates beyond the latest received native
state. Unexpected stalls can exhaust the buffer. Abrupt sustained cadence
changes take several snapshots to settle; this is not a guarantee of smooth
motion during outages, prolonged compute stalls or history overruns. Buffering
adds a small display delay rather than inventing future city state.

## Verification

`tests/motion-timing.mjs` covers fixed 500/1,000/2,000 ms arrivals, bounded
irregular arrivals, same-cycle replies, pause/resume, reduced motion, geometry
reuse, shared car/train time, and layer/topology resets. In the steady synthetic
cadence checks no sampled movement frame was stationary after warmup. The
irregular schedule's stationary fraction was approximately 0.24%, with a maximum
83 ms hold. Those are controlled presentation inputs, not native throughput.

The browser comparison uses the same unchanged native game artifact and the
native-generated Garden City example with 384 people. Only the HTTP
presentation artifact changes. Both isolated native sessions use a **test-only
1,000 ms timer**. The real canvas is sampled for 16 seconds after warmup, without
injecting residents or advancing the city from JavaScript.

| Measurement | Previous presentation | Buffered presentation |
| --- | ---: | ---: |
| Sampled frames | 959 | 960 |
| Frames with no movement among more than ten matched displayed travellers | 48.49% | 0% |
| Median native update arrival interval | 1,009.13 ms | 1,005.58 ms |
| 95th-percentile JavaScript draw duration | 1.70 ms | 1.30 ms |
| Browser errors | 0 | 0 |

These are single serial headless Chromium measurements on a shared host, not
physical-device certification, a universal FPS gain, or faster native traffic.
The candidate prepared geometry 63 times across the captured session rather
than rebuilding curve tables on every redraw. The deterministic geometry test
also compares cached and direct interpolation positions exactly over 300 frames.

The native HTTP-only build passed **99 native tests**, with equal production
and reference results. Existing `npm test` passed using the unchanged native
game and the updated presentation modules. Smoke, tunnel controls, pedestrian
rendering, gesture and WebKit browser suites passed against the newly embedded
HTTP artifact and that same native game. The user-requested single-circle
pedestrians, topology changes, persistence/reload and reduced-motion semantics
remain covered. The complete native game is not claimed to have been rebuilt
for this presentation-only change.

Native game artifact SHA-256:
`15efe04181ac026cde80e72b178d9ce25eda572ade404ea3f9c674dc9806dccd`.

New native HTTP artifact SHA-256:
`f70e9c4382121d56490ae5daa6ddfcc1abc0ca589f9cb8c62fc0efc6e9382a4c`.

Both use lkjscript 0.1.83, executable SHA-256:
`8a92ff982e06c2ce1efafd90bf824242edfe782359ecf849036772befc261cf7`.

## Reproduction and deployment

The normal build still embeds all browser files into the native game artifact.
`npm run build:web` can instead build the same tracked assets and HTTP routes
into a separately selected native HTTP-only artifact. It has no game session
or data-store grant. This permits an HTTP presentation replacement without
restarting existing native simulation sessions. It does not introduce a Node
or Python production server.

`npm run test:motion-cadence` starts disposable native HTTP/session hosts and
uses the 1,000 ms test timer. `CITY_SELECTION` selects the native game;
`HTTP_CITY_SELECTION` optionally selects a separate HTTP artifact. The default
full build needs no separate HTTP selection. CI includes the cadence test and
the timing unit checks. Historical before/after evidence uses an explicitly
selected predecessor artifact, not live player stores.

An already open browser has its old JavaScript module loaded. A normal page
reload fetches the new no-store HTTP assets and resumes the same saved city;
clearing browser storage is neither needed nor safe for the recovery key.
The game and operating system's reduced-motion preferences remain respected.
