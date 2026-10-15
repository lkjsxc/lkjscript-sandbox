# Explicit traffic animation

The traffic animation preference offers **Smooth**, **Reduced**, and **Follow
system**. Smooth is the default and interpolates walkers, cars and trains even
when the operating system requests reduced motion. Reduced draws native traffic
snapshots. Follow system changes traffic animation when the system media query
changes. Nonessential CSS transitions still respect the system preference in all
three modes.

An explicit legacy `motion: true` becomes Reduced. Legacy false, absent and
malformed preferences default to Smooth. A valid new `animation` value takes
precedence over the legacy key. Changing a setting saves the normalized
preferences under the existing device preference key; city keys, native saves
and tab ownership are unaffected. The existing shared interpolation clock,
snapshot gate, hidden-document cancellation and paused idle behavior are retained.

This repairs the preference conflict documented in
[the original diagnosis](SMOOTH-PLAYBACK-DIAGNOSIS.md). Classic geometry, actor
sampling, circular pedestrians, turning cars, trains, buildings and the river are
unchanged. The entrypoint is 64,859 bytes, below the native 65,536-byte text limit.

## Local verification, 2026-10-15

The existing 0.1.83 session artifact remains
`7a11d91c4de42ac23dea569720f0e0f6f134f8926e1531f0aa50e30e6f482af7`.
All 137 non-HTTP source modules match that selection. Its retained graph check
passed 709 tests with zero failures and equal production/reference results.
The HTTP-only build passed 99 native tests. No game regeneration or runtime
upgrade was required.

The existing actual-coordinate profile ran Commuter Boroughs (2,048 residents)
with normal requested 500 ms native updates, after warming through cycle 18.
Both observations below used system reduce and 16 seconds of browser sampling.
The baseline is the retained diagnosis, not a repeated simulation.

| Measurement | Before | Smooth after repair |
| --- | ---: | ---: |
| Eligible sampled frames | 958 | 935 |
| Frames with no matched traveller moving | 98.43% | 0.43% |
| Longest stationary window | 1,833.3 ms | 66.6 ms |
| Frames with canvas paint | 1.57% | 99.57% |
| Median browser sampling cadence | 59.88 fps | 59.88 fps |
| Median delivered native cycle interval | 883.7 ms | 942.1 ms |
| p95 reported draw duration | 2.20 ms | 1.60 ms |

Browser cadence is not motion FPS. These are headless Chromium observations on a
shared development host, not physical-phone measurements or a native simulation
speed claim. Browser errors were empty. No residents or ticks were injected.

Preference tests cover all six mode/system combinations, live media-query
changes while Follow system stays selected, old true/false and malformed values,
all three modes across reload, and portrait control bounds. The demand-rendering
test now explicitly selects Follow system before asserting OS-driven snapshot
rendering; its original motion, pause and visibility assertions remain.
It observed 90 paints in 90 moving browser frames, four paints for four native
replies in reduced mode, zero paints during a two-second synthetic hidden signal,
and zero paints in settled one-second pauses, including the 2,048-person city.
The synthetic hidden signal does not claim to reproduce OS suspension.

The management browser suite verifies construction, removal, exact previous-city
restoration after reset/reload, and 390/360-pixel layouts. The release browser
suite also observes actual walker/car positions and rail poses consumed by the
drawing loop under OS reduce, checks visible pedestrian pixels, park construction,
native save/reload, zoom and pan. Generated reports and screenshots stay ignored.

## Reproduction

```sh
# Reuse the selected pinned binary if tools/lkjscript is absent in this worktree.
LKJSCRIPT=/path/to/selected/0.1.83/lkjscript npm run build:web
npm run test:presentation-selection
npm run check
npm test
HTTP_CITY_SELECTION=.build/web-selection.json node tests/with-preview.mjs tests/animation-preferences-ui.mjs
HTTP_CITY_SELECTION=.build/web-selection.json PROFILE_LABEL=smooth-system-reduce \
  PROFILE_SYSTEM=reduce PROFILE_ASSERT_SMOOTH=1 \
  node tests/with-preview.mjs tests/motion-profile-ui.mjs
HTTP_CITY_SELECTION=.build/web-selection.json node tests/with-preview.mjs tests/demand-render-ui.mjs
HTTP_CITY_SELECTION=.build/web-selection.json node tests/with-preview.mjs tests/ui-management.mjs
HTTP_CITY_SELECTION=.build/web-selection.json node tests/with-preview.mjs tests/classic-release-ui.mjs
```

The selections reference retained private build artifacts. A fresh clone needs
its own native build. The failed v0.1.94 experiment is outside this release.

## Public presentation release, 2026-10-15

Only Classic's HTTP upstream was replaced with the independently supervised
HTTP-only artifact
`621c323b3311cdc04f0b940e24d5247fdda4d359453aea19855c3393f2f95143`.
All eleven candidate assets matched source on loopback and public HTTPS.
The proxy configuration was backed up, updated in place to retain its bind-mount
inode, validated and reloaded. The former listener remains available for rollback.
The root, `/classic`, legacy query normalization, same-origin `/live`, a settled
paused canvas and the separate Metropolis entrypoint passed browser checks.

The cutover did not signal or reconfigure a native session. Classic's pinned
compiler and game artifact, session descriptor, supervisor and save path remain
unchanged; Metropolis descriptors and both native process identities remain
unchanged. An operational caveat occurred during public validation: at
12:59:29 UTC, 19 seconds after the HTTP cutover, the **existing Classic
supervisor's automatic save-history compaction** restarted its session child.
Its logs show successful backup, restore and verification, retaining all 48
records. Thus session PID continuity holds at cutover, but not throughout the
verification period. This was existing automatic maintenance, not an agent-issued
session restart or migration. The replacement child runs the same verified
0.1.83 executable, game artifact and descriptor. No maintenance setting was
changed. Operational paths, city keys, stores and raw reports stay private.

After automatic maintenance, the public 2,048-person profile passed under OS
reduce with Smooth: 951 eligible frames, 0.74% stationary frames, a 116.7 ms
maximum hold, 99.26% painted frames, 59.88 fps median sampling cadence,
937.1 ms median native update interval and 1.30 ms p95 draw duration. Browser
errors were empty. The initial public release smoke overlapped compaction and
timed out waiting for scenario review readiness; that attempt is not counted
as passed. Its failure log is retained separately.

The repeat public release smoke after maintenance completed successfully: park
construction, native save acknowledgement, exact saved-city reload, pedestrian
pixels, portrait layout, zoom and pan all passed. Across 120 sampled browser
frames, walkers, cars and train drawing poses each changed in 119 comparisons
with OS reduce and default Smooth. Page errors, failed HTTP responses and
WebSocket errors were empty. The core `npm test`, repository publication checks
and final selected-source/asset identity check also completed successfully.
