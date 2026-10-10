# Lower native simulation cost

Classic Traffic City retains its individual residents, small buildings, river,
freely drawn roads, turning cars, single-circle pedestrians, stations and trains.
The browser assets and save schema are unchanged. Metropolis remains separate.

## Policy and implementation

Car routing minimizes legal hops using the prepared directed adjacency and
explicit layer portals. It then estimates congestion-weighted travel time for
mode choice. This intentionally may choose a congested short route over a longer
fast route: a test records six hops at cost 57 versus eight hops at cost 25.
Walking retains weighted routing. Existing saved routes remain valid until
normal topology/cache invalidation. This is an experimental approximation, not
an equivalent fastest-path algorithm.

After a cycle's search budget is exhausted, an unplanned resident checks required
cached route identities (topology version, origin, destination and mode). If any
required route is absent, the resident's wait still advances, but diagnostic
walking/car ETAs retain their previous values. Planning computes fresh estimates
when it can proceed. Cached choices still pass through the full planner in the
same cycle; returning drivers and mid-route replans retain their existing rules.
No resident is deleted, counted as arrived, or hidden to obtain this saving.

Rail planning rejects services with no stop within the existing 12-cell access
radius before constructing a path-position index. The inclusive boundary and
candidate ordering remain intact. A rail line is looked up only for an active
access plan. Non-driving residents that occupy no facility return the unchanged
admission facts instead of reconstructing the record. Reservations, capacity,
journey conservation, money and save ownership remain authoritative lkjscript.

## Reproduction

Use pinned lkjscript 0.1.83. The normal `npm run build` replays the checked-in
proposals. For a retained verified graph, `scripts/author-relaxed.mjs` adds the
car policy and `scripts/author-hotpaths.mjs` applies the three bounded hot-path
module edits through public draft/plan/apply/check/build operations. Both verify
compiler, source and artifact identities; neither edits accepted graph internals.
The optimized native artifact retains older embedded HTTP. Pair it with the
verified current HTTP-only selection for local browser checks and hosting.

```sh
npm test
BASELINE_SELECTION=.build/route-only.json node tests/hotpath-replay.mjs
BASELINE_SELECTION=.build/baseline.json node tests/hotpath-performance.mjs
BASELINE_SELECTION=.build/baseline.json node tests/hotpath-live.mjs
HTTP_CITY_SELECTION=.build/web-selection.json node tests/with-preview.mjs tests/classic-release-ui.mjs
HTTP_CITY_SELECTION=.build/web-selection.json npm run test:commuter-residents-ui
HTTP_CITY_SELECTION=.build/web-selection.json npm run test:gestures
```

`hotpath-replay` compares full native physical state against the retained
route-only candidate, excluding only the two diagnostic ETA fields. It covers
startup, warm caches, rail suspension/resumption and a topology edit.
`hotpath-performance` uses three serial alternating-order runs of the existing
2,048-person native observer. Zero cycles measures construction and initial
observation; 16 minus zero measures continuation plus per-cycle observation.
The command decoder cannot accept the full 2,048-person city as JSON input.
`hotpath-live` therefore backs up one paused native seed and restores it to two
isolated stores. It directly measures continuation of that same saved city,
including normal autosave, native view projection and WebSocket delivery.

## Whole-city measurements (2026-10-10)

The complete selected candidate passed 709 native checks, with zero failures and
production/reference evaluator equality. Its artifact SHA-256 is
`91cb1bcc4cca236c4172b99f45547c53bc6e988f6ff0f6e277b1bcaf0b69658d`;
the baseline is
`f45907341c9dd4d8c040f904d4c2739f433a5ebcb4ec1385a8479de109c82767`.
All 137 selected non-HTTP source hashes and the pinned compiler were verified.
The separate retained HTTP artifact is
`b6c3271e8183236d0c6e19c3a03a3cb92ae15153a97cf8b3c6fbbf3ee9d355da`.

Three serial alternating-order runs of Commuter Boroughs (2,048 people, eight
services) produced these median native invocation times and deterministic
instruction counts. Command startup is excluded from invocation time.

| Workload | Before | After | Instructions before / after |
| --- | ---: | ---: | ---: |
| Construction and initial observation | 7.11 s | 6.31 s | 34,699,214 / 34,699,214 |
| Construction plus 16 cycles | 29.16 s | 21.03 s | 130,877,300 / 93,671,567 |
| Per-run difference: 16 cycles plus observation | 22.05 s | 13.90 s | 96,178,086 / 58,972,353 |

The continuation instruction reduction is **38.7%**; construction itself did not
change. Treat its timing difference as shared-host variation. The total workload
uses **28.4%** fewer instructions. All runs preserve 2,048 distinct residents,
eight services, population/journey/monetary conservation, 472 people on actual
walking hops at cycle 16, and 1,504 still planning. The substantial planning queue
remains a limitation; this does not establish instant departures for everyone.

The 512-person physical-state comparison through cycle 108 passed, including
88 actual boardings, rail suspension/resumption and an infrastructure edit.
Every native city field matched the route-only candidate except diagnostic
walking/car ETAs. This does not assert equivalence to the original weighted car
routing policy.

The direct native-session comparison restored the **same saved 2,048-person
city** into separate stores, with normal 500 ms requested ticks and autosave:

| Session measurement | Before | After |
| --- | ---: | ---: |
| Mean delivered cycle, cycles 9–32 | 1,488 ms | 930 ms |
| p95 delivered cycle | 1,860 ms | 1,118 ms |
| Cycle 32 plus pause acknowledgement | 44.48 s | 27.93 s |
| Pause acknowledgement | 1,636 ms | 1,184 ms |
| Explicit save acknowledgement while paused | 381 ms | 409 ms |

This is one serial run per arm, not a latency guarantee. Both pause commands
finished at cycle 33. Generation was outside these intervals (baseline scenario
load acknowledgement: 6.61 s). Autosaves through at least cycle 20 were observed.
Saving itself did not become faster in this sample, and the requested 500 ms
cycle still is not sustained at this population.

## Release validation

The selected candidate passed the complete `npm test`, return planning,
employment preservation, continuous management, rail, tunnel edits and
current-format tunnel persistence suites. Rail checks include 100 every-cycle
snapshots, FIFO boarding, finite seats, actual arrivals, fare accounting,
suspension/resumption and unfunded-service fallback. Persistence includes an
actual process restart; the historical-binary downgrade-refusal branch was not
run. The direct live comparison separately restored a baseline-created native
save into the candidate.

Local Chromium checks passed for classic release, Commuter Boroughs residents,
touch gestures, tunnels and city flow. They cover real canvas pedestrian pixels,
moving walkers/cars/trains, park and road construction, removal, ordered rail
stops, save acknowledgement, exact reload, reconnection and portrait camera
changes. The 2,048-person overview rendered 128 walkers and reloaded its saved
city. Desktop and portrait screenshots were visually inspected; browser errors
were empty. Normal socket tests also cover save ownership. Current HTTP assets
were paired explicitly with the new native session artifact throughout.

The retained route kernel evidence was revalidated against its compiler,
artifact and all five source hashes: 180 topology-first and 180 weighted-reference
directed/layered comparisons, plus route-policy checks. These are reused results
for unchanged routing sources, not new whole-city benchmark repetitions.
Repository syntax, documentation links and publication-content scans passed.
Generated artifacts, stores, keys, operational receipts and raw evidence remain
outside Git. CI remains unchanged and lightweight.

For deployment, retain the independently selected HTTP listener, gracefully stop
the session writer under its supervisor, verify and back up the native store,
restore and verify the backup in a separate directory, then switch only the
session artifact. Retain the previous descriptor and artifact for rollback and
verify the public game in a disposable browser context. Never initialize over
an existing store or start a competing writer.

## Public verification

The native session artifact above was deployed while retaining the independent
classic HTTP artifact. The existing store was verified and backed up while its
writer was stopped; that backup was restored and verified separately. Previous
artifacts, descriptors, supervisor configuration and native backups were retained
for rollback. Neither classic keys nor the separate Metropolis store were reset.

All eleven public browser assets matched current source bytes. Classic root,
`/classic`, legacy-query normalization and the explicit `/metropolis` entry
responded correctly. The final disposable public browser passed construction,
acknowledged saving and exact reload, moving walkers/cars/trains, 64 visible
pedestrian pixel samples, and portrait zoom/pan. Browser, HTTP and WebSocket
errors were empty in that final run.

Earlier public attempts encountered the existing automatic save-history
compaction: one movement wait timed out across a restart and another completed
the functional checks but reported a reconnect WebSocket 502. These were not
counted as passing tests. The public supervisor's existing configurable history
watermark was raised from 64 to 256 MiB, with the prior script preserved. Its
existing larger-store rule (twice the last compacted size) still applies. This
reduces interruption frequency at the cost of more on-disk history; it does not
eliminate maintenance reconnects. Saving frequency, admission limits, store
contents and the game artifact were unchanged by this operational adjustment.
The successful public rerun occurred after that change.

## Limits

Shared-host times are observations, not guaranteed device latency or browser
frame rates. Cumulative modeled allocation is not process RSS. Native command
startup and JSON overhead are reported separately from invocation time. This
work does not establish 100,000-person support or change the 2,048-person build
limit. The existing public supervisor may briefly reconnect sessions during
save-history compaction.
