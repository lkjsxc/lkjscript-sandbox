# Reusing native view-scan values

## Scope

Classic Traffic City retains exactly the same browser assets, resident population,
route choices, walking dots, cars, queue ordering, buildings, rail, river, tunnels,
construction rules, ownership and saved City schema. No actor thinning, artificial
population multiplier, fixed-district replacement or reduced animation cadence is
introduced. Native lkjscript still owns the game and both HTTP/session listeners.

The selected change affects three read-only projection modules: `actorpool`,
`actorview` and `viewdata`. Their repeated resident lookups previously constructed
a complete fallback Resident on every iteration, even when the ID was present.
Native function arguments are eager, so that fallback was not free.

Each collection, queue-bucket traversal, FIFO rank traversal, actor-sampling loop,
planning-count scan and selected-resident search now carries one immutable fallback
value through its recursive helper. The public entrypoint signatures, identity
order, missing-ID semantics, inclusive/exclusive bounds and every projected field
remain unchanged. The value exists only within that invocation. It is not a global
cache, does not retain a prior city, and never enters a player save.

This removes work rather than relaxing transport, accounting or simulation rules.
Empty and one-resident projections have a small fixed helper overhead; the claim
is reduced repeated work for populated views, not a speedup for every input.

## Source and build identity

Measurements were obtained on 2026-10-15 using pinned lkjscript 0.1.83.

- Previous native session artifact: `91cb1bcc4cca236c4172b99f45547c53bc6e988f6ff0f6e277b1bcaf0b69658d`.
- Selected native session artifact: `7a11d91c4de42ac23dea569720f0e0f6f134f8926e1531f0aa50e30e6f482af7`.
- Unchanged independent HTTP artifact: `c7bbc634b1aad80290b5451a7a18de334939e922cce74f5eaa697f6e3bb7af6f`.

The author copied the verified baseline graph, verified its rebuilt artifact, and
applied source-bound function edits through public draft/plan/apply operations.
It did not edit accepted graph internals. The complete selected graph passed
709 native checks with zero failures and production/reference evaluator equality.
All 137 selected non-HTTP module hashes, both executable/artifact identities,
and the eleven exact embedded browser assets were verified. Three native modules
changed; the other non-HTTP module hashes are retained.

The normal fresh author can replay the checked-in proposals. The retained-graph
path is `scripts/author-view-scans.mjs`; it requires a separately retained, verified
baseline selection and rejects changes outside the three allowed modules.

## Native projection comparison

Twelve differential fixtures cover empty/small/large populations, mixed walking,
car and station-access modes, queue ties, reversed IDs, missing IDs, both layers,
cropped views, off-screen views, and residents not currently moving. Every complete
StreetSample matched, including actor identity/order, all actor fields, FIFO ranks
and full-viewport counts. The renderer keeps the existing 128-actor ceiling; it is
not lowered by this change.

For the synthetic 1,024-resident mixed-mode view:

| Measurement | Previous | Selected |
| --- | ---: | ---: |
| Native instructions | 495,624 | 282,977 |
| Invocation time | 74.54 ms | 57.03 ms |
| Projected actors | 128 | 128 |

Instruction work falls 42.9%. These are projection costs, not a whole-game
speedup. The deliberately oversized single-queue fixture is an adversarial
read-only projection test, not a claim that a playable road can admit that queue.
Modeled cumulative allocation is not resident memory and is not reported as RSS.

## Actual 2,048-person native session

One baseline-created Commuter Boroughs city was warmed and saved at cycle
33. Its offline native backup was restored into two isolated stores. The
previous and selected hosts then used identical 500 ms requested ticks, normal
ownership, native view projection, transport and autosaving.

All fields in 32 moving wire scenes (cycles 34 through 65) matched exactly, excluding
only sequence, acknowledgement, saved-cycle and notice delivery metadata. Twelve
paused full-map projections and six inspections also matched, for
50 scene comparisons. At the final cycle both hosts reported
536 visible walkers and displayed the same 128 sampled actors. This particular
workload had no visible drivers at that final cycle; mixed-driver/queue behavior
is separately exercised by the projection fixtures and browser release tests.

| Measurement | Previous | Selected |
| --- | ---: | ---: |
| Mean acknowledgement of 12 full-map view commands | 181.4 ms | 120.7 ms |
| Mean delivered cycle interval | 897.4 ms | 765.8 ms |
| p95 delivered cycle interval | 1161.7 ms | 909.5 ms |
| 32 cycles plus pause acknowledgement | 29.66 s | 24.83 s |
| Native CPU during a three-second paused window | 830 ms | 700 ms |
| Messages in that paused window | 6 | 6 |
| Observed process peak RSS | 139.6 MiB | 142.0 MiB |

The view-command mean falls 33.5%, and the delivered-cycle mean falls
14.7% in this serial shared-host sample. These are one run per arm, not timing
guarantees or a causal estimate isolated from all host variation. Deterministic
instruction counts and complete output equality provide the separate work/correctness
checks. The timing includes projection and delivery; the underlying simulation
rules did not become approximate. Peak RSS did not improve in this sample.

The requested 500 ms cycle is still not sustained at this population. This does
not establish 100,000-person Classic support or change the 2,048-person admission
limit. Browser frame rate and physical-phone battery life are not measured here.

## Reproduction

```sh
# Native generation/check and the ordinary local core suite.
npm run build
npm test
node tests/street-presentation.mjs

# Optional differential checks need a separately retained predecessor selection.
BASELINE_SELECTION=.build/baseline.json npm run test:view-scan-equivalence
BASELINE_SELECTION=.build/baseline.json npm run test:view-scan-live

# Pair the selected game with the independently verified current HTTP bundle.
HTTP_CITY_SELECTION=.build/web-selection.json node tests/with-preview.mjs tests/classic-release-ui.mjs
HTTP_CITY_SELECTION=.build/web-selection.json node tests/with-preview.mjs tests/commuter-residents-ui.mjs
HTTP_CITY_SELECTION=.build/web-selection.json node tests/with-preview.mjs tests/demand-render-ui.mjs
```

Historical selections, graphs, binaries, deployment descriptors, native backups,
private city keys and raw evidence are not published. Optional differential tests
are not self-contained fresh-clone commands without their stated predecessor.
CI remains lightweight and unchanged; the release workload runs locally.

## Release status

The complete `npm test` suite, native street-presentation tests, and local
Chromium classic-release, Commuter Boroughs residents, demand-rendering, tunnel
and gesture suites all passed. These cover real construction, save acknowledgement
and exact reload, walkers/cars/trains reaching the canvas, retained idle sleeping,
layer editing, and portrait/pinch/pan interaction. HTTP and native game selections
were paired explicitly.

The native session change was published on **2026-10-15**. The existing session
supervisor was stopped gracefully, and the existing store was verified and backed
up offline. That native backup was restored and verified in a separate directory
before switching only the session artifact. The original save root and browser
recovery scheme were preserved. Previous artifacts, the old descriptor, the
supervisor configuration and the verified native backup remain available privately
for rollback. No competing writer was started.

The independent Classic HTTP and both Metropolis listener process IDs and
configuration hashes remained unchanged across cutover and public verification.
Neither the proxy nor its routing was changed. All eleven public HTTPS assets
matched the current source bytes. The root, direct `/classic` alias, legacy
session-port query normalization and separate `/metropolis` page were verified.
An initial verification-only attempt incorrectly expected `/classic` to redirect;
the existing alias intentionally serves Classic directly. That assertion was
corrected against the unchanged proxy configuration and the checks were rerun.
No game fix or routing change was needed for that failed test assumption.

A disposable public Chromium context passed actual park construction, native
save acknowledgement, exact saved-city reload, moving walkers/cars/trains,
64 pedestrian glyph pixel samples, and portrait zoom/pan. Browser errors, failed
HTTP responses and WebSocket errors were all empty. Those checks used a new
browser profile and its own city, never an existing player's recovery key.

The live store was not reset or migrated. The code change is source commit
`16ed0e16398a58d8745a9ed7fba16b1c41095671`; a subsequent documentation commit only
records deployment verification. No Codex task, model API, or paid external
inference service was launched for this work.
