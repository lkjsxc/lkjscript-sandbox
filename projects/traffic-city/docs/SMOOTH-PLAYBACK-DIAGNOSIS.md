# Smooth playback diagnosis (2026-10-15)

Status: diagnosis only. No production game, browser asset, preference, listener,
proxy, save, or default runtime was changed. The proposed preference repair is
not implemented or deployed by this checkpoint.

## Reproduced cause

The existing browser computes reduced traffic animation as:

```js
const motionReduced = () => reducedMotion.matches || preferences.motion;
```

The checkbox displays only `preferences.motion`. Consequently, system-level
`prefers-reduced-motion: reduce` disables traffic interpolation while the game's
Reduce motion checkbox remains unchecked. Unchecking it cannot override the
system preference. Pedestrians, cars and trains all use this same effective
setting. Ordinary interface transition reduction can remain independent.

This reproduces a concrete route to the reported stop-motion appearance. It does
not establish the setting or performance of the user's actual browser/device.

The public app.js and motion.js bytes matched the inspected source exactly:

- app.js: `e6e60b80d713cbab1458559b4167f074a28167c52835308ca3711bf0ec4be88a`
- motion.js: `9cf443741963eb45dcf4591fb4efe94bd70eea7148a12d126218e9bde5abe606`

## Actual browser observations

Two disposable native/browser runs loaded Commuter Boroughs (2,048 residents),
used the normal requested 500 ms session interval, warmed through cycle 18 and
sampled the actual rendered actor coordinates for 16 seconds. No residents or
simulation ticks were injected from JavaScript. These are headless Chromium
measurements on a shared development host, not the user's device or a physical
phone. Browser errors were empty in both runs.

| Observation | System no-preference | System reduce |
| --- | ---: | ---: |
| Eligible browser frames | 958 | 958 |
| Frames where no matched traveller moved | 0% | 98.43% |
| Longest measured stationary window | 0 ms | 1,833.3 ms |
| Frames with a canvas repaint | 100% | 1.57% |
| Median browser sampling cadence | 59.88 fps | 59.88 fps |
| Median delivered native cycle interval | 907.8 ms | 883.7 ms |
| p95 reported canvas draw duration | 1.30 ms | 2.20 ms |
| Game Reduce motion checkbox | unchecked | unchecked |

Sampling cadence is not rendered-motion FPS: the second browser samples around
60 times per second but only repaints on native updates. A stationary frame here
means no change among more than ten identities present in both adjacent samples;
it does not mean every traveller should move at every instant. Changing native
server speed is not needed to repair the demonstrated hidden preference conflict.

Current interpolation timing and demand-painter unit tests passed. The selected
session/HTTP identity check verified the executable, both artifacts, all 137
non-HTTP source modules and the eleven exact embedded browser assets. The scene,
actor cap and renderer geometry remain unchanged.

## Proposed narrow repair (not implemented)

Expose a Traffic animation setting with Smooth, Reduced and Follow system.
Default to Smooth for the requested gameplay behavior; preserve an explicit old
`motion: true` preference as Reduced. Old `motion: false`, missing or malformed
preferences should normalize to Smooth. Only Follow system should apply the
system media query to traffic. CSS already respects the system preference for
nonessential interface transitions and should continue to do so.

Show the effective choice rather than an unchecked switch whose behavior is
silently overridden. Keep one shared clock for walkers, cars and trains. Preserve
idle/hidden-tab sleeping, all glyphs and street geometry, queues, actual actor
identities and counts, native authority and save ownership. Test all three modes,
system changes, legacy preference migration, reload, pauses and portrait layout.
The existing app.js is 64,719 bytes; its native embedded literal must stay within
65,536 bytes. Small pure preference helpers can live in motion.js rather than
expanding the entrypoint excessively.

The repair should first ship as a presentation-only release using the retained
0.1.83 session and a new native HTTP bundle. Do not restart a session or migrate
player saves for a browser preference fix. See DEMAND-RENDERING.md for the prior
HTTP-only release boundary and private operational evidence for the live host.

## Released runtime investigation

GitHub's latest published release checked on 2026-10-15 was v0.1.94, published
2026-10-12 at 09:49:30 UTC. Its verified local executable identifies as
lkjscript 0.1.94 and matches the retained release manifest executable SHA-256:
`b3a76ce915f4866ae9ce742c7c0e4e556162b57f1e49497b50131b18d42e5e14`.

The currently selected 0.1.83 game artifact is:
`7a11d91c4de42ac23dea569720f0e0f6f134f8926e1531f0aa50e30e6f482af7`.
Attempting to execute this exact artifact with v0.1.94 failed with:

```text
artifact_bundle_contract: predecessor artifacts require rebuilding from canonical meaning
```

A separately copied canonical game graph was then checked with v0.1.94. That
check also failed, without changing the original graph:

```text
kernel_callable_flow_work: composed callable flow exhausted its work admission
```

The intended three-repetition runtime comparison stopped on the first released
runtime invocation. Only the first 0/16-cycle pinned pair completed. No released
runtime speedup, valid game rebuild, save migration, or production suitability
has been established. These failures do not prove that a correctly rebuilt game
would be slower. They show that replacing the executable is not a drop-in update.
Keep this separate from the demonstrated presentation fix.

## Reproduction

```sh
HTTP_CITY_SELECTION=.build/baseline-web.json PROFILE_LABEL=baseline-large \
  node tests/with-preview.mjs tests/motion-profile-ui.mjs
HTTP_CITY_SELECTION=.build/baseline-web.json PROFILE_LABEL=baseline-system-reduce \
  PROFILE_SYSTEM=reduce node tests/with-preview.mjs tests/motion-profile-ui.mjs
HTTP_CITY_SELECTION=.build/baseline-web.json npm run test:presentation-selection
node tests/motion-timing.mjs
node tests/demand-painter.mjs
RELEASE_RUNTIME=/path/to/verified/released/lkjscript \
  node tests/runtime-release-comparison.mjs
```

The baseline selections are separately retained ignored records, not fresh-clone
fixtures. Runtime comparison currently intentionally fails at the documented
artifact compatibility boundary; it must not be reported as passed. All browser
stores, raw reports, release binaries and deployment identifiers remain private
under ignored build/runtime/evidence directories. No Codex task or paid model API
was launched.
