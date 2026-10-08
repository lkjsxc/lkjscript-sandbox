# Directed roads and tunnels

The integrated implementation passes the local correctness, migration, browser,
large-city and live-session gates recorded in
[DIRECTED-TUNNELS-RESULTS.json](DIRECTED-TUNNELS-RESULTS.json). That receipt binds
one local native artifact to its exact selected source hashes. GitHub's checks
and merge status belong to the containing commit and PR; local validation is
not a claim that a different commit has passed CI. Deployment is a separate
operation: this work does not change an existing hosted game or player store.

## Model and controls

Ground cell identities are 0 through 16383. Underground cells use the same
coordinate plus 16384. One-way road kinds 9 through 12 point east, south, west
and north; kind 13 is an explicit ground portal. Walking ignores one-way arrows.
Driving checks them at planning and at actual edge admission. Only an explicit
portal connects the layers. Separate physical lanes retain finite capacity;
a portal uses one shared all-way-stop conflict domain.

`build-tunnel` creates a straight underground stroke and both dry-land entrances
atomically. It requires at least three tiles. `build-underground` extends only
the lower network, without creating entrances. `build-portal` adds an entrance
above existing underground infrastructure. Strokes are limited to 64 tiles.
Underground local roads, avenues, footpaths and one-way roads cost 48, 72, 24
and 60 per changed tile respectively; each new entrance costs 60. Whole-command
funding and occupancy are validated before publication. Buildings and stations
are protected. Changing an occupied road's direction is refused.

The browser provides Ground / Underground selection, a complete-tunnel toggle,
one-way direction selection and a portal tool. U changes layers; R rotates the
one-way direction when the map, rather than a form field, has keyboard focus.
Walkers remain single filled circles. Positions and interpolation preserve the
128 by 128 map footprint across both layers; entering a portal does not animate
a person across 128 rows of ground.

The simulation, construction validation, routing, movement, money, views and
persistence execute in ordinary lkjscript. Browser JavaScript owns input,
projection, drawing and material-cost previews only. Python is optional source
regeneration tooling, not a server or simulation dependency.

## Returning with the car

Before committing a flexible outbound car choice on a directed network, the
planner also needs a known car path back to the origin. The return check uses
the same shared, versioned route cache and the unchanged two-search-per-cycle
budget. Missing budget produces a planning wait, not disconnection or a
premature departure. A known negative return path rules out the car; walking
and useful rail remain available. The return check establishes connectivity,
not a guarantee about future congestion or later construction.

A derived `world.junctions[-259]` value distinguishes a certified bidirectional
network (1) from one containing directional roads (2). Absence is unknown,
never evidence of symmetry. A fresh topology build resets and reconstructs the
certificate, including after removing the last one-way restriction. Certified
bidirectional worlds keep their original two-search admission without an extra
reverse search. This metadata is neither a new persisted field nor a reason to
rebuild the whole world on each save.

Fixed-mode travellers and returning drivers keep their car. Editing a return
path after departure may legitimately leave a driver waiting for a car route.
The driver, vehicle location and outstanding journey remain represented; no
car is discarded or teleported home. Reconnecting the route resumes travel.
Confirmed demolition has its existing explicit cancellation/relocation policy.

## Layered editing, presentation and saves

Removal quotes capture both their layer and topology version. Underground
removal cannot select overlapping surface buildings or railway infrastructure.
Deleting a surface portal disconnects, but does not demolish, the underground
tile. Confirmed removal accounts for cancelled trips without creating arrival
income or losing residents. City Lab uses the same commands: applying a plan
imports construction at the original cycle, not its experimental time or
income. Saving or reconnecting during an experiment retains only the real city.

Presentation FIFO keys are also layer-safe. All road lane keys are below
262144; facility queues begin at 262144. The old `200000 + cell` facility key
could alias an underground road lane and insert an invisible surface car into
its displayed queue. A regression reproduces that collision on the predecessor
and proves the corrected ranks, without changing authoritative lane occupancy.

Format 9 fences layered saves from older readers. Format-8 migration preserves
all non-derived city, resident, railway and monetary state, rebuilds prepared
static topology and clears the obsolete route lookup. Existing typed predecessor
readers remain in place. Current-format round trips preserve state exactly.
Tests use real predecessor artifacts for historical store migration and verify
that an older reader refuses a layered save without replacing it. Current
records, previous-city backups and reset/restore follow the same typed policy.

## Resolved integration failures

The original one-way fixture sent eight cars to work without a possible car
return. The new gate chooses walking before departure. The completed 600-cycle
fixture records zero car choices, 56 walking choices and 50 completed trips.
A separated directed circuit records 32 car choices and 56 completed trips.

The earlier adjacent-corridor test's expectation of car use was incorrect:
closely spaced parallel roads create many junctions, making walking preferable.
That layout is now checked for completed journeys and its actual walking
choice. A separated return corridor independently proves outward and homeward
driving. The portal observer accepts both explicit portals in its fixture,
while preserving direction, finite capacity, conflict and completion checks
under both resident-priority orders.

The previous CI run also failed because its generic continuation result emitted
complete routes and residents twice: once in City and again in extra observation
fields. At 1,024 residents this exceeded the typed JSON output item budget.
The waterfront test now uses the existing compact native observer, retains the
complete City and every cached route, and checks conservation every two cycles
instead of eight. It proves exact complete-state equality with the ordinary
runner at cycle eight, then completes all 128 cycles. No native JSON, storage,
execution, planning or simulation limit is raised, and no route is trimmed.

Two older browser expectations were corrected: current bridge upgrades cost
72 each, and a mobile City Lab construction gesture must target an exposed map
cell rather than a fixed point behind an overlay. The test uses actual hit
geometry and visible pointer/keyboard input, then verifies the exact tile and
construction cost. The historical traffic-repair test excludes only the new
symmetry marker when comparing empty templates; its full executed historical
fixture states still require exact predecessor equality.

## Verification

The selected sources were built from a fresh graph with checksum-verified
lkjscript 0.1.83. Native checking completed **572 tests, zero failures, equal
production/reference results**. All 102 selected source files match the local
artifact; all 104 native proposal files reproduce twice from a source-only
archive. The local artifact SHA-256 is
`15efe04181ac026cde80e72b178d9ce25eda572ade404ea3f9c674dc9806dccd`.
The compiler SHA-256 is
`8a92ff982e06c2ce1efafd90bf824242edfe782359ecf849036772befc261cf7`.
Fresh authoring creates new opaque graph identities, so separate CI artifacts
need not have the same bytes; the checked source set is the reproducible input.

| Gate | Completed coverage |
| --- | --- |
| Existing `npm test` | Geometry, accounting, movement, 22 independent weighted paths, 12 whole-game correctness cases and sockets |
| Return planning | Nine checks covering the shared budget, negative/unknown returns, walking, rail, symmetry reconstruction and post-departure repair |
| Tunnel movement | 22 checks; 180 consecutive native ticks, 38 portal-transition snapshots, 703 underground resident snapshots and all eight resident IDs |
| Atomic editing and portals | 13 edit/migration checks and three adversarial portal/stale-path checks |
| Persistence | Real process restart, historical-reader refusal without overwrite, durable removal and reset/restore |
| Layered City Lab | Three transactional tests for comparison/apply, temporary-plan persistence and layer-specific demolition/discard |
| Ground replay and historical jams | Eight full-state cases excluding only derived symmetry metadata; five historical traffic fixtures, with exact predecessor execution-state equality |
| Street and viewport | Eleven presentation cases including the cross-layer queue collision; 8,192 static tiles, 1,024 detail cells, 128 actors and bounded frames |
| Railway, City Lab and atlas | Full railway suite, actual native City Lab, 512-resident metro comparison and independent journey-atlas checks |
| Waterfront and planning | All 1,024 residents retained for 128 cycles; 260 modal comparisons, 462 unpruned versus 412 bounded route searches |
| Browsers | Nine suites covering smoke, tunnels, City Lab, atlas, waterfront, planning, pedestrians, gestures and WebKit |
| Historical saves | Actual predecessor migration and a 512-resident travelling railway city's typed save compatibility |
| Kernel oracle | 180 independent shortest paths and 17,664 packed-cache comparisons / 35,328 assertions, with core/kernel source hashes matching the integrated game |

All local stores and browser profiles were disposable. Mobile checks use desktop
Chromium/WebKit with mobile viewports and touchscreen input, not physical-phone
certification. The 1,024-person city remains a traffic challenge: at cycle 128
it has 590 completed trips, 358 destination visits, 24 rail boardings, 16 completed
rail trips and no disconnected residents, but substantial waiting remains.
Correctness is not a claim that all congestion or route-planning delay is solved.

The project CI keeps its existing checks and adds the directed-trip, layered
City Lab, tunnel UI and WebKit gates. Its outer job timeout is 90 minutes to
accommodate the expanded build/test workload; game and runtime admission limits
are unchanged. `npm run test:tunnels` works on a fresh build. Supplying
`OLD_CITY_SELECTION` enables the additional actual historical-binary migration
and downgrade probes; without it, reports distinguish synthetic-format migration
and explicitly identify the historical-reader check that was not run.

## Performance and live sessions

[The machine-readable receipt](DIRECTED-TUNNELS-RESULTS.json) retains all 18
counterbalanced serial whole-game measurements on the same 0.1.83 runtime.
The baseline for this table is the pre-directed game. Fresh-grid measurements
include preparation; River Boroughs uses each implementation's own prepared
but otherwise equal seed. Each implementation's results were deterministic
across repetitions. Equal selected traffic outcomes do not imply complete
state identity across different representations.

| Workload | Baseline median native invocation | Candidate | Instruction change |
| --- | ---: | ---: | ---: |
| Starter, 32 residents / 64 cycles | 717.789 ms | 700.675 ms | +5.91% |
| Grid, 64 residents / 32 cycles | 2,135.690 ms | 2,140.474 ms | +7.46% |
| River Boroughs, 1,024 residents / first 4 cycles | 942.218 ms | 875.600 ms | +0.33% |

Common-path cleanup reduces the prior draft's +9.21%, +11.79% and +1.37%
instruction overhead, but does not establish an overall speedup over the
pre-directed game. Cumulative modeled allocation still rises by approximately
3.06%, 2.88% and 0.07%; that metric is not peak resident memory. These shared-host
samples are not isolated hardware benchmarks, statistically established gains,
or browser frame rates. This integration accepts a measured representation
cost for new functionality and correct return admission, rather than presenting
kernel-only speedups as game-wide improvements.

A separate serial live comparison against the preceding integrated draft ran
Garden City (384 people), Crossing Challenge (256) and Willow Metro (512) for
64 cycles each in both versions. Every gameplay frame matched at the same
cycle, excluding transport scheduling/command metadata. Native autosave and
manual checkpoints passed. With the unchanged 500 ms timer, candidate rates
were about 1.98 to 1.99 cycles/second; 95th-percentile frame intervals were
537.3, 538.6 and 555.9 ms. The maximum payload was 33,603 bytes. This is a
real-session regression check, not a guarantee for arbitrary concurrent loads.

## Reproduction and deployment boundary

Run the project's ordinary setup/build/test tasks, then `npm run test:tunnels`,
`npm run test:tunnel-ui` and the existing browser/system suites. Install the
pinned Playwright Chromium and WebKit engines before running browser checks.
The fresh source-only generation check remains optional development tooling.
Retained predecessor selections are required for exact cross-version replay,
performance and historical-binary store tests; never use real player data as a
fixture. Source files, test code and sanitized results are publication inputs.
Runtime graphs, artifacts, stores, recovery keys, logs and screenshots are not.

Source integration does not deploy the game. Existing hosted processes, domain
routing, player stores and browser recovery keys are preserved. Any deployment
needs its own source/artifact verification, backup and cutover checks.
