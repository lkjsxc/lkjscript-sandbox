# Directed roads and tunnels: integration checkpoint

Status: **experimental, not release-approved, not deployed**. Native integration and browser controls are implemented, but the directed-trip release gates below are not satisfied. Passing `npm test` alone does not approve this branch for release.

## Implemented scope

The ordinary native authoring pipeline now includes the prepared road kernel, layered construction, portal reservation domains, layer-specific reviewed removal, typed migration, and integration probes. Simulation, routing, construction, economics, views, and storage still execute in lkjscript. Browser JavaScript only handles controls, projection, interpolation, and material-cost previews. Python remains optional source-generation tooling, not a game runtime.

Ground cells retain IDs 0 through 16383. Underground cells use the same coordinate plus 16384. One-way kinds 9, 10, 11, and 12 point east, south, west, and north. Ground kind 13 is an explicit portal. Walking ignores one-way restrictions; driving checks them. A crossing of layers is only possible at an explicitly connected portal. The two physical road layers retain separate lane capacities, while the portal uses a common all-way-stop conflict domain.

`build-tunnel` creates a straight underground stroke and both dry-land entrances atomically. It requires at least three tiles. `build-underground` extends the lower layer without implicitly creating entrances; `build-portal` adds an entrance above existing underground infrastructure. Strokes are limited to 64 tiles. Underground local roads, avenues, footpaths, and one-way roads cost 48, 72, 24, and 60 per changed tile respectively; each new entrance costs 60. Whole-command affordability is checked before publication. Buildings and stations are protected, and occupied changes of road direction are refused.

A removal quote records its layer and topology version. Underground removal does not select overlapping surface buildings or railway infrastructure. Removing a ground portal disconnects, but does not remove, its underground counterpart. Confirmed removal accounts for explicitly cancelled journeys without inventing destination income or losing residents.

The browser provides Ground / Underground controls, a complete-tunnel toggle, one-way direction selection, and a separate portal tool. U changes layers; R changes direction when the map, rather than a form field, has keyboard focus. The existing single-filled-circle pedestrian glyph is retained. Portal interpolation does not animate a traveller across 128 map rows.

Format 9 fences layered saves from old releases. Format-8 migration preserves non-derived city, resident, railway, and monetary state; it rebuilds prepared topology metadata and clears the old coordinate-keyed route lookup. Existing typed predecessor readers feed that migration. Current-format decoding is not a per-checkpoint topology rebuild. The current record, recoverable backup, and restoration paths all use the new format.

## Exact tested build

The checked source was built with the pinned lkjscript 0.1.83 executable. This is a version-specific statement, not a claim about unreleased language development.

- Executable SHA-256: `8a92ff982e06c2ce1efafd90bf824242edfe782359ecf849036772befc261cf7`.
- Integrated artifact SHA-256: `01e1300f0365a4d4f26b2fb61c76850479c03ad953d762b048bb620637f88e07`.
- Fresh native check: 539 passed, 0 failed, production/reference differential equal; 1,203 newly compiled units.
- 101 selected source files match the captured build hashes. All 103 checked-in native proposal files reproduced twice in a source-only temporary archive.

Executable, graph, artifact, synthetic stores, browser profiles, raw output, and screenshots remain ignored development files. None are publication inputs.

## Completed validation

All rows below refer to the integrated artifact above unless expressly described as predecessor work. The interrupted verification attempt was not counted as successful; the complete regression/browser runs were repeated in fresh isolated test stores and exited successfully.

| Validation | Result and scope |
| --- | --- |
| Native check/build | 539 native tests; production/reference agreement |
| `npm test` | Passed existing geometry, accounting, movement, weighted routing, correctness, and socket suites |
| Weighted path comparison | 22 independently checked shortest-path cases |
| Game correctness | 12 existing whole-game cases, including deterministic replay and conservation |
| Layered street presentation | 10 cases, including separate 40-walker/40-driver populations on each layer |
| `tunnel-edits.mjs` | 13 checks: atomic budget rejection, protected objects, captured/stale quotes, layer-only removal, occupancy, cancellation, and exact migration/roundtrip fields |
| `tunnel-persistence.mjs` | 5 checks: real native process restart, all 32 residents preserved, old-version refusal without overwriting, durable reviewed removal, and reset/restore |
| `tunnel-ui.mjs` | 8 visible-control checks in desktop Chromium and a 390 by 844 viewport; construction, arrows, portal addition, layer changes, reviewed removal, reload, and zero browser errors |
| Existing pedestrian rendering | Single-circle geometry regression retained and passed |

The mobile check is desktop Chromium at a mobile viewport, not a physical-phone or WebKit certification. The new UI test pans to an empty construction area through normal keyboard controls; it does not inject city mutations through a host simulator.

## Unresolved release gates

1. **A driver can depart into a network with no car route home.** A 39-tile eastbound tunnel between one home and one workplace reproduced eight car departures and eight work arrivals. At cycle 440 all eight residents were waiting for a return car route; no walking choice had been made. Returning drivers intentionally retain their car mode, so simply treating them as fresh walkers would discard the vehicle-location invariant. The proposed correction is to admit an outbound car choice only when a bounded, cached return route is known; insufficient route-search budget must remain distinct from disconnection. That correction has not been applied. Topology changes after departure require a separate, explicit recovery policy, not vehicle teleportation.
2. **The supplemental directed-circuit test did not meet its car-trip-count expectation.** The experiment constructed an eastbound upper tunnel, a westbound lower return corridor, and ordinary corner connectors, then ran 600 native cycles. Its `carTrips >= 16` assertion failed. Detailed state inspection was not completed. This is an unresolved test result, not proof that its counter assumption is correct, and not proof of a specific movement defect.
3. **The adversarial portal observer has an over-specific assertion.** Its fixture contains two portals, but its vertical-edge assertion expects only the first coordinate. The first run stopped when it observed the second portal, `2572`, against an expectation of `2570`. Correct that observer while retaining explicit-portal, direction, occupancy, conflict, and completion assertions; then complete both resident-priority orders. Do not count the current observer as passed.
4. **Whole-game performance improvement is not established.** See the fixed-runtime measurements below. Prepared-kernel microbenchmarks are not whole-game speedups.

`npm run test:tunnels` is therefore not a passing release gate. The full directed-journey suite stops before all later cases. Do not present those unrun cases as successful. Additional full City Lab, railway, WebKit, and live-scale release regressions also remain outstanding for the final corrected artifact.

## Whole-game performance, fixed runtime

The predecessor and candidate used the same checksum-verified 0.1.83 executable. Three serial, counterbalanced repetitions were completed for each condition. Fresh-grid measurements include native topology preparation. River Boroughs uses each implementation's prepared seed; the seed is exactly equal after removing the derived `world.junctions` field. Each implementation's full result hash was stable across its own three repetitions. The reported traffic outcomes matched between implementations in these short samples; **complete cross-version state equality was not asserted**.

| Native game workload | Baseline median invocation | Candidate median invocation | Baseline instructions | Candidate instructions | Instruction change |
| --- | ---: | ---: | ---: | ---: | ---: |
| Starter, 32 residents, 64 cycles | 736.364 ms | 771.756 ms | 4,816,181 | 5,259,917 | +9.21% |
| Grid fixture, 64 residents, 32 cycles | 2,268.735 ms | 2,205.570 ms | 12,945,839 | 14,471,959 | +11.79% |
| River Boroughs, 1,024 residents, first 4 cycles | 950.084 ms | 929.972 ms | 6,112,648 | 6,196,103 | +1.37% |

These shared-host timings are not isolated benchmarks, steady-state frame rates, or statistically established gains. Process wall time is retained separately in the raw report. Modeled native allocation increased in all three conditions; it is cumulative allocation, not peak resident memory. The deterministic instruction results show additional whole-game work, despite favorable earlier kernel-only experiments. Profile the common ground-only movement path and preparation/amortization costs before claiming a performance improvement.

The reproducible runner is `tests/integrated-routing-performance.mjs`. Provide a separately built predecessor selection through `BASELINE_SELECTION` and the candidate through `CITY_SELECTION`. Keep the runtime fixed and preserve the exact source/artifact hashes. The runner checks conservation and records all 18 samples, full-state hashes, and native observations; it does not modify a public store.

## Publication decision

This checkpoint preserves implementation and evidence for further work. It is not a release, not a main-branch integration approval, and not authorization to replace an existing hosted city. A corrected candidate must pass the directed return/circuit/portal gates, repeat the complete regression and migration/browser checks, and report whole-game performance honestly before any deployment decision.
