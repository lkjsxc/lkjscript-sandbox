# Commuter resident verification — 2026-10-10

This record concerns real native departures, not an increased population counter
or decorative pedestrian sprites. The city retains 2,048 residents, sixteen
stations, eight services and sixty-four seats per train. Browser artwork is
unchanged.

## Implementation and artifact identity

Native implementation: `7f0d95772c2ca9aa2477268066fc85b43375d4e8`.
The subsequent test-only change creates missing evidence directories; it does not
change native sources, assertions, capacities or the selected artifact.

Tested artifact SHA-256:
`f45907341c9dd4d8c040f904d4c2739f433a5ebcb4ec1385a8479de109c82767`.

Compiler: lkjscript 0.1.83, SHA-256
`8a92ff982e06c2ce1efafd90bf824242edfe782359ecf849036772befc261cf7`.

All 139 selected native source hashes were checked against the working source
before the local verification matrix and again before selecting the final build.
The complete native check compiled 1,485 units with zero reused units and reported
709 tests passed, zero failed, with production/reference differential equality.
The artifact hash identifies this tested build, not a promise that independently
authored native projects have identical internal owner identities or file bytes.

The search allowance is now `min(16, max(2, ceil(population / 128)))` exact new
searches per cycle. Cache hits remain free. This is an admission bound, not an
expanded-node or wall-clock bound. The initial example assigns each corridor's
512 residents to its 512 reachable job slots. Infrastructure-only edits preserve
existing jobs and recount employment from surviving residents; actual workplace
changes retain the general reassignment behavior. See [the design and save
behavior](COMMUTER-GRID.md#residents-leaving-home).

## Observed behavior

At cycle 16, the command-only native probe observed **472 residents on actual
adjacent walking hops**, 1,504 still planning and zero disconnected residents.
Every resident had a real workplace on the same direct east-west corridor as
their home. Population, journey and money conservation held.

At cycle 17, the real browser observed **544 street pedestrians**, with **128
native pedestrians present in the rendered actor sample**. Saving and reloading
that exact city preserved its statistics and rail state. No page errors occurred.
The screenshot and actor assertions use a disposable native store, not a player's
public city or recovery key.

At cycle 144, the native city had **256 boardings and 240 completed work arrivals**,
zero cancellations and zero disconnected residents. Total wealth was 109,538,
exactly equal to the accounting expectation. There were still 1,792 waiting
residents: this repair does not remove finite-capacity rail queues or implement
passenger transfers.

## Selected local acceptance matrix

All fourteen suites passed on the same artifact:

| Suite | Coverage |
| --- | --- |
| employment-preservation | Road upgrades preserve residents and jobs; new workplaces still trigger reassignment. |
| commuter-residents | Early actual walking hops, reachable authored jobs and conservation. |
| commuter-edit-residents | A real road construction command does not reintroduce the startup problem. |
| commuter-residents-ui | Rendered pedestrians and exact-city save/reload in a browser. |
| commuter | Initial city and 144-cycle commuting, finite seats and accounting. |
| default (`npm test`) | Existing input, presentation, routing, correctness and session tests. |
| commuter-layout | Four-gate districts and the existing static layout. |
| rail-service-capacity | Native eighth-service admission and atomic ninth-service rejection. |
| commuter-rail-flow | Both directions on all eight services and exclusive shared-rail occupancy. |
| commuter-ui | Existing example selection, presentation and browser persistence checks. |
| continuous-management | Editing while native time continues. |
| save-compatibility | Saves written by the accepted predecessor remain readable. |
| planning-bounds | Bounded candidate planning agrees with its exact oracle. |
| repair | Existing repair regressions. |

The initial rail-service-capacity attempt passed its native assertions but failed
when writing `evidence/commuter-grid/service-capacity.json` because its parent did
not exist. Both affected rail tests now create their own evidence directory.
The failed attempt and its log are retained separately; the corrected suite was
rerun successfully. No assertion was removed or weakened.

Detailed local reports are retained under
`evidence/commuter-residents-final/` in the repair workspace. They are ignored
execution evidence rather than tracked game content. The seven completed,
unchanged suites were retained, and the seven-suite remainder was verified after
the report-path repair. At most two independent test hosts ran concurrently in
that remainder. These timings are not a controlled performance comparison.

## Deployment boundary

This is a local verification record, not a claim that GitHub's complete workflow
or a public deployment has succeeded. The existing public preview and player
save store were not changed by this repair at this checkpoint. Public cutover
preparation was blocked by the execution layer and was not retried through an
alternate route. The validated candidate remains distinct from the hosted build.

Existing saves retain their assignments. Once this candidate is deployed, they
will use its larger planning allowance; obtaining the repaired initial employment
requires loading the example again. That replaces the current city, retains it
as the one recoverable previous-city backup and replaces any older backup.
