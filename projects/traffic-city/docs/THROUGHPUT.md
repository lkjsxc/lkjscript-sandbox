# Native traffic throughput

## Implementation boundary

The simulation continues to use pinned lkjscript 0.1.77. City format 7, every resident field, monetary rules, finite road storage, junction exit reservations, train capacity, route search budgets, the requested session interval and browser presentation are unchanged.

Previously both the movement admission pass and the final statistics refresh computed the full `Facts` record. Movement needs lane occupancy, FIFO heads, head readiness, crossing reservations and occupied buildings. The refresh needs traffic counts, walking counts, occupied buildings, employment and resident statistics. The new `facts` module computes each projection separately. Drivers waiting to replan on a road still occupy that road. A vehicle's next-road reservation remains separate from its present position. Walking and building occupancy retain the original rules.

The original `people::facts` and `facts-agent` implementations remain available as independent regression oracles. Cycle resolution also continues to use the original full facts. No snapshot is reused after movement, no route or trip is skipped, and there is no saved-state cache to invalidate or migrate.

Actor presentation now derives route and lane bucket keys only for moving drivers. It retains the same resident order, FIFO ranking, 128-actor limit and server-owned view semantics. Browser files are unchanged.

## Bounded native authoring

The implementation and its test fixtures are separate ordinary declaration proposals. This keeps each change within the released compiler's existing witness budget; the budget is not raised. The generator also qualifies zero-argument calls when a fixture lives in another module.

The optional generator previously read session Origin helpers from a standalone repository Git path. It now preserves them from the checked-in native declaration input. `npm run test:source-reproduction` regenerates all declaration files twice from an archive without Git history and requires byte identity, including Origin policy. Only this optional authoring test needs Python; native build and runtime requirements are unchanged.

Eighteen native projection checks compare complete facts against the original implementation. Empty and mixed populations and all seven resident states across three surface/rail modes cover occupancy, waiting thresholds, disconnected reasons, jobs, exit reservations, lingering junction occupancy and FIFO ties. Native fixture functions construct structural records once rather than repeating full records in every proposal literal.

## Reproduction

From this project directory, preserve the predecessor selection before building the updated source:

```sh
mkdir -p runtime/throughput-baseline
cp .build/selection.json runtime/throughput-baseline/selection.json
npm run build
npm run check
npm test

BASELINE_SELECTION=runtime/throughput-baseline/selection.json \
  npm run test:hotpath-equivalence
BASELINE_SELECTION=runtime/throughput-baseline/selection.json \
  npm run test:throughput-live
OLD_CITY_SELECTION=runtime/throughput-baseline/selection.json \
  npm run test:save-compatibility
```

The first comparison checks two consecutive 64-cycle windows in all three authored cities. It compares every resident, route, rail service, account and city field, including a paid road intervention and the 128-cycle route-cache boundary. Native instruction counts and invocation times are recorded separately from artifact loading and result serialization.

The live comparison starts six independent native sessions serially: predecessor and candidate for each authored city. It uses the unchanged 500 ms requested interval, a 1,024-cell detailed viewport, native autosaves and explicit checkpoints. Every delivered gameplay frame is compared, excluding sequence/command metadata and measurement timestamps. Timing is a shared-host observation, not rendering FPS or an isolated hardware benchmark.

The compatibility test creates a 512-resident, two-service city with the predecessor, commits it through native persistence, and reopens its actual test store with the candidate. It compares all 512 complete resident records, individual wallets and rail plans, plus city statistics and train views. It then exercises reviewed reset/restore, further travel, saving and another process restart. It never reads an existing player's store or recovery key.

Browser tests can optionally verify a separately pinned HTTP presentation artifact with the selected native session artifact:

```sh
HTTP_CITY_SELECTION=runtime/throughput-baseline/selection.json \
  npm run test:ui-expansion
```

Without that variable both native listeners use the selected build. All listeners and stores created by these test commands are isolated from any existing preview.

## Verified candidate — 7 October 2026

The selected artifact SHA-256 is `f319a4ff500f66a073626914dc17f4101bc97a162b372de9427e078c424232e3`; the pinned executable SHA-256 is `5eaadae4df214f4c5eaa2d4407acab58574b56447307b5a77261b2b9ff7adb37`. All 43 proposal sources are bound to the selection. The native build passes **180 tests, zero failures, production/reference equality**. All three seeds and six 64-cycle complete-state comparisons are exactly equal. The live comparison matches every gameplay frame across all 192 sampled cycles.

The following combines both 64-cycle windows per city. Native invocation time excludes artifact loading, output serialization, session timers, saves and browser transport. Instruction counts are runtime instructions, not CPU hardware instructions.

| Authored city | Residents | Native time before | Native time after | Instruction reduction |
| --- | ---: | ---: | ---: | ---: |
| Garden City | 384 | 20.13 s | 17.38 s | 13.11% |
| Crossing Challenge | 256 | 17.16 s | 15.05 s | 9.55% |
| Willow Metro | 512 | 64.74 s | 60.96 s | 5.39% |

Shared-host timing is variable: one Garden City startup run was slightly slower despite fewer instructions. This is not a guarantee that every city or every run is faster. Cumulative charged allocations also fell; they are not measurements of peak memory.

### Real-session observation

| Authored city | Previous cycles/s | Candidate cycles/s | Previous p95 interval | Candidate p95 interval |
| --- | ---: | ---: | ---: | ---: |
| Garden City | 1.987 | 1.987 | 552.7 ms | 553.5 ms |
| Crossing Challenge | 1.989 | 1.990 | 543.9 ms | 539.0 ms |
| Willow Metro | 1.380 | 1.406 | 890.0 ms | 895.4 ms |

The 256/384-resident cities remain approximately timer-limited at two cycles per second. The 512-resident metro remains below that goal; its measured rate changes from 1.380 to 1.406 cycles/s, and its p95 interval is not improved in this sample. Fewer native instructions must not be presented as a large live-rate improvement. Autosave and the same 1,024-cell detailed viewport are enabled in both arms. The measured intervals are simulation delivery, not rendering FPS.

Raw machine-readable records remain in ignored `evidence/hotpath-equivalence.json`, `evidence/throughput-live.json`, and `evidence/throughput-candidate-build.json`. They identify both artifacts, compiler, inputs/results and measurements. Runtime binaries, stores and browser keys are not published.

## Regression coverage repaired

An older rail assertion assumed no municipal income whenever no destination journey completed. Both predecessor and candidate fail that obsolete assertion at cycle 39: sixteen boardings transfer $16 from household wallets, and a $6 departure produces a net municipal increase of $10. Their complete native outputs are equal. The test now checks exact new-rider fares and concessions, the actual payer, taxes, operating costs and total monetary conservation; boarding cannot earn exports, wages or destination sales. Funding-starvation fixtures explicitly account for withdrawn capital. The small accounting-oracle self-check deliberately rejects minted money, fictitious arrival revenue, the wrong payer, missing concessions and double charging.

The historical road-jam JSON fixtures also lacked the current empty rail/accounting fields. Their test adapter obtains those shapes from a native-generated empty city and preserves every original resident, identifier and map field. The native engine initializes the opening accounts. These are synthetic pre-rail test fixtures, not player-save migration: production continues to use the unchanged typed native readers. All five repair cases match the predecessor exactly, including full-lane cycles, adjacent junctions, sustained jams, replay and identities shifted beyond 5,000. The original fixture files remain unchanged.

## Final local verification

The selected artifact passes the final `npm test`, 100-step rail regression, five repair comparisons, viewport limits, backpressure, source reproduction, predecessor save compatibility, management and persistence suites. Persistence covers all eight saved-city slots and their one-use backups, compaction, forced process death, and refusal to replace corrupt storage.

Native browser smoke, integrated construction/three-stop rail/all examples/finances/save/reload/reset/restore, the full player construction-and-expansion journey with the previously published HTTP artifact, and touch demolition pass without browser errors. Touch testing is Chromium emulation, not physical-device certification.

The 144-interval scaling workload passes at 256, 1,024, 4,096 and 8,192 tiles (8, 32, 128 and 256 residents). It includes the route-cache refresh boundary and excludes native persistence. Its 8,192-tile run has a 330.0 ms p95 delivered interval and a 393.5 ms maximum on this shared host. Those sparse-trip synthetic results must not be substituted for the authored 512-resident metro measurement or treated as mature-city capacity.

A publication-safe summary is retained in [THROUGHPUT-RESULTS.json](THROUGHPUT-RESULTS.json). GitHub CI now also runs the rail and repair regressions, while source regeneration remains optional development tooling. A local pass does not by itself assert a GitHub CI result or a deployed service identity.
