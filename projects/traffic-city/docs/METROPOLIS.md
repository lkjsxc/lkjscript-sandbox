# Metropolis: a playable aggregate Traffic City

## Delivery status — 2026-10-10

Metropolis is an implemented and locally verified native game, not merely the earlier `meso-benchmark` command or prerecorded canvas preview. It has live native sessions, editable roads and railway corridors, population growth, funds, private saves and a browser interface. Its normal starting population is **100,000**; the scenario menu also offers 250,000 and a 1,000,000-person stress case.

**It is a separate mode, not a transparent acceleration of the classic City type.** Classic residents, saved cities, tunnels, directed roads and station-by-station rail remain separate; the classic processes and save store are retained. Those detailed mechanics have not all been ported into Metropolis. No old save is implicitly converted or overwritten.

The native experiment, dedicated hosting supervisor and native history-compaction lifecycle passed validation. Metropolis is available explicitly at `/metropolis`. The published default `/` has been restored to classic Traffic City, with `/classic` retained as an alias and both save spaces preserved. The historical Metropolis measurements below describe a different ruleset, not an equivalent optimization of classic.

## What scales

Population is integer mass in 256 bidirectional district cohorts, not a list of individual people. Each cohort tracks people at home, queued outbound, travelling outbound, at work, queued back and travelling home. Queue transfers, mode capacity, completed visits and the monetary balance are calculated by native lkjscript. The tests check each cohort's mass and journey accounting, not just the displayed population total.

A 16 × 16 district lattice has fixed mirrored east–west or north–south commute corridors. Road capacity is the minimum district road level on a corridor, multiplied by three. Railway service supplies additional corridor capacity. Infrastructure edits recompute these cached capacities once; normal ticks do not find 100,000 paths. Population growth changes mass in an existing cohort without allocating more cohorts.

These are deliberate approximations. There are no individual identities, microscopic collision checks, exact vehicle occupancy, cell-by-cell intersection reservations, train timetables or optimal path searches in this mode. Two cohorts that share a district do not compete for one exact physical intersection resource. Travel/residence use leaky compartments, not per-person exact arrival timestamps. Closing a road blocks future receiving capacity; already-travelling population can finish. Cosmetic walkers, cars and trains are visual representatives, not a claimed count of individually simulated vehicles or people.

## Play

Explore pans, wheel/pinch zooms, and Fit returns to the whole city. Tap a district to inspect its population, queues, destination and native road/rail capacity. Roads draws a straight row or column, with levels from closed to four lanes. Upgrades cost $600 per added lane per district. Railway service is managed for a whole row or column; each level costs $2,400. Homes adds 1,000 people to a district for $1,500, up to the one-million-person model bound. Completed native visits bring $2 each into city funds. These are simplified aggregate game finances, not the classic household ledger.

Construction does not pause the city. Pointer release adds a durable in-tab command to a bounded queue, keeps its outline visible, and waits for native acknowledgement. A changed edit is acknowledged only after its native save transaction commits. Invalid geometry and insufficient funds reject the whole stroke. On transport loss an unacknowledged edit is not blindly replayed: reconnect reads the committed saved city, and the UI reports the uncertainty. This avoids duplicate charges when only the response was lost.

A second finger cancels a pending construction gesture and navigates. The inspector stays open across updates. Pause stops simulation and continuous animation. Hidden-page handling asks the native session to sleep and stops drawing; visibility resumes it. A back/forward-cache page return re-establishes its connection.

## Drawing and network budgets

| Layer | Bound or policy |
| --- | --- |
| Native population state | 256 cohorts for all supported populations |
| Global statistics | Cached once per simulation update |
| Road/rail routing metadata | Rebound on infrastructure changes, not per resident/tick |
| Network projection | Only districts/corridors crossing the requested viewport; at most 256 short integer rows |
| Static infrastructure | Sent when its version changes; omitted from ordinary repeated frames |
| Overview motion | At most 256 representatives |
| Middle motion | At most 640 representatives |
| Near motion | At most 1,536 representatives |
| Static raster cache | LRU: 24 MiB and 384 tile entries maximum |
| Main canvas | Device-pixel ratio at most two, also capped at four million pixels |
| Adaptive LOD | Sustained paint cost reduces detail; recovery has hysteresis |
| Inactive rendering | No continuous requestAnimationFrame loop while paused, hidden, disconnected or stale |

Crossing corridors are retained even when their origin district is offscreen, so zooming into an arterial does not remove its through traffic. Representative identities and phases are deterministic within the drawing model, so changing LOD adds detail rather than allocating a new person model. Buildings, river, bridges, roads and station marks are cached separately from moving traffic. The queue overlay follows the corridor axis instead of stretching a solid tile patch.

## Native persistence

Metropolis uses the `traffic-city-metropolis-v1` DataStore space and its own browser recovery key. Classic keys/stores are not read. Browser storage failure or an invalid existing recovery key does not silently create an unsaved city or discard that key.

Native transactions enforce one writable owner per private city. The latest resume claims ownership; a stale tab cannot charge an edit or overwrite the current owner. Only a transaction reported as explicitly aborted is retried, at most twice. Committed edits are never replayed as a retry policy. Concurrent claims and stale-owner writes are covered by the socket tests.

Ordinary travel checkpoints every 20 cycles; a 250 ms host tick means about five seconds between checkpoints. An edit, explicit save and graceful close attempt a checkpoint. A crash can recover only the most recent successful checkpoint, not every animation frame. Scenario changes retain one previous city; restore consumes that backup once. Admission limits refuse new keys without evicting existing cities.

## Reproduce the native game checks

The pinned runtime is lkjscript 0.1.83, Linux x86-64. Its executable SHA-256 is `8a92ff982e06c2ce1efafd90bf824242edfe782359ecf849036772befc261cf7`. Build tooling uses Node and optional Python; running simulation, persistence, HTTP and WebSocket handlers are native lkjscript, not a JavaScript/Python server.

From `projects/traffic-city`, after the normal project setup:

```sh
# Optional regeneration of checked-in native declarations:
python3 scripts/journeys/metro_session.py

npm run build:metropolis
npm run test:metropolis
npm run test:metropolis-browser
npm run test:metropolis-soak
npm run test:metropolis-host
```

`LKJSCRIPT=/absolute/path/to/lkjscript` selects the pinned executable for building. Tests read `.build/metropolis-selection.json` and verify the selected source/artifact identities. They create isolated loopback listeners and fresh private stores under ignored `runtime/`; they never point at a public city. Browser tests require Playwright's installed Chromium. When the operating-system temporary filesystem is full, use a writable task-specific `TMPDIR`; do not delete someone else's build or store.

Evidence is written under ignored `evidence/metropolis-*.json`, with corresponding logs and the far/middle/near/mobile screenshots. Runtime bundles and browser recovery keys are not committed.

## Measured result

Final tested artifact SHA-256:

`ec462c8ca6e52aab2e0bb7e6ad382a0ef3d533679568bf27959b6a17b3f4e354`

All four final model, socket, soak and browser reports identify this artifact. Results were collected on a shared Linux development host, not a dedicated benchmark machine or a physical phone. They are evidence for this workload, not a universal hardware guarantee.

| Workload | Result |
| --- | --- |
| Native source check | 144 passed, zero failed; production/reference differential equal |
| Command-model workloads | Nine cases, 20,826 assertions passed |
| 100,000 people, 128 updates | 2,959.45 ms native invocation; 23.12 ms per update amortized |
| 1,000,000 people, 128 updates | 2,876.90 ms native invocation; 22.48 ms per update amortized |
| Repeated one-million case | Identical final aggregate state |
| Native 100 ms live delivery, 100,000 people | Median 100.87 ms; p95 119.67 ms; maximum 309.71 ms |
| Four one-million-person cities together | 240 updates per city in 60.27 seconds; all population/journey invariants held |
| Four-city native process memory | 38,932 → 38,940 KiB resident; 44,636 KiB high-water mark |
| Four-city native process CPU | 36.06 CPU seconds / 60.27 elapsed seconds, approximately 0.60 of one CPU core total |
| Four-city live delivery | Per-city medians approximately 251 ms; p95 265.45–273.36 ms for a 250 ms schedule |
| Largest measured million-person JSON frame | 10,469 bytes, excluding WebSocket/TLS overhead |

The command timing divides a native invocation, **including initial construction and totals**, by 128. It is not a direct per-tick timer and does not include browser rendering. The slightly lower million-person timing is not a claim that increasing population speeds up the game; both workloads retain the same bounded cohort structure. This is not a same-semantics speedup comparison against the classic engine.

The final live Chromium test at 1440 × 960 measured:

| View | Representative count in sample | Paint callback p95 | requestAnimationFrame interval p95 |
| --- | ---: | ---: | ---: |
| Overview | 256 | 1.20 ms | 16.80 ms |
| Middle | 262 | 0.70 ms | 16.70 ms |
| Near | 206 | 0.40 ms | 16.80 ms |

Paint timing covers this canvas callback, not every browser/compositor/GPU operation. The samples used about 1–3 MiB of raster cache, below the 24 MiB bound. Counts below a LOD cap are expected because camera culling and native travelling mass reduce visible representatives. Browser checks also cover a 390 px touch viewport, pinch cancellation without charging, rapid drag releases without pausing, vertical rail editing, exact paused-city reload and a synthetic visibility fixture. Browser errors were empty. A real physical mobile-device performance test has not been performed.

## Verified hosting and public cutover

`scripts/serve-metropolis.sh` and `scripts/prepare-metropolis.mjs` provide a dedicated, opt-in host, separate from classic Traffic City. They are not called by build or ordinary tests. The defaults are HTTP `127.0.0.1:19146`, native sessions `127.0.0.1:19147`, and a fresh `runtime/metropolis-host` store. `METRO_DIR`, `METRO_HTTP_LISTEN`, `METRO_SESSION_LISTEN`, `METRO_ORIGIN` and `METRO_LOCAL_ORIGIN` configure that separate host; use an absolute deployment directory.

The supervisor verifies bundle/compiler digests, holds its own lock, supervises only its own two native children, bounds its diagnostic logs and compacts its own DataStore with the session stopped. It uses the pinned runtime's `data backup --root … --output …` and `data restore --backup … --root …` commands. Restore goes to a fresh staging directory and native verification must succeed before a recoverable directory exchange. Startup recovers an interrupted exchange; a missing initialized store is rejected instead of reset. Two native checkpoint files are retained. The session briefly disconnects during compaction and the browser reconnects to its committed city.

Operational validation found and fixed two issues in the initial hosting scripts: unsupported backup/restore arguments, and a 4 KiB message setting that also constrained outbound city frames. The profile now permits 32 KiB messages and transitions while native input parsing retains its independent 4 KiB bound. The original 16 MiB per-session state and 96 MiB process-buffer admission limits are retained; these are configured limits, not measured resident memory.

`npm run test:metropolis-host` passes eight operational checks: production-profile admission, exclusive supervisor ownership, exact save recovery after automatic compaction, HTTP availability and checkpoint retention, recovery between exchange renames, recovery after exchange before cleanup, four simultaneous million-person cities under the production limits, and refusal to initialize over a missing saved store. Evidence is in ignored `evidence/metropolis-host.json`. The four-city operational check covers short live progression and invariants; the separate 60-second soak measurements above are unchanged.

The public entrypoint has been restored to classic Traffic City. Metropolis remains opt-in at `/metropolis`, with `/metropolis/live` and its separate save space retained. Classic `/live`, assets and `/classic` serve the original game. The proxy normalizes legacy root `session_port` bookmarks using a relative redirect back to classic; local development still supports separate session ports. See [classic restoration](ATMOSPHERE.md). Private release bundles and rollback configuration are not repository content.

During the earlier Metropolis deployment, a fresh public browser passed population growth, road widening, vertical railway editing, exact saved population/finances/infrastructure on reload, a 390 px viewport without horizontal overflow, and classic HTML availability. Browser errors and failed HTTP responses were empty. These checks use a separate test city; existing player keys and classic saves were not modified. The deployed artifact remains the measured `ec462c8c…f4e354` bundle above; these changes concern hosting and validation, not simulation declarations.

The browser supports ordinary same-origin `/metropolis/live`, validated `session_port` routing, and the generic numeric-port hostname form used by workspace gateways. It preserves the workspace/account/domain suffix. An optional `classic_port` builds a link to the separate classic app; no arbitrary remote endpoint or wildcard Origin is accepted. The URL routing helper has 14 passing unit checks. The public same-origin route was additionally verified by the browser checks above.

## CI scope

Automatic pushes and pull requests run the lightweight repository structure/syntax/documentation checks. The existing full native/browser job is retained, but now requires an explicit manual workflow dispatch with `native_checks` enabled. No large Metropolis benchmark or hosting operation was added to CI. Native workload measurements came from the local development environment. Public cutover and browser verification were performed separately; GitHub CI does not deploy the game.
