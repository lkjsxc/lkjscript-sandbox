# Bounded modal planning and visible engine waits

## Decision

A city should be constrained by its transport network, not by avoidable work in the route planner. The original bounded-planning change retained two searches per cycle. The current allowance is population-scaled: `min(16, max(2, ceil(population / 128)))` exact searches per cycle. Cache hits do not consume it. Candidate pruning spends less of that allowance on railway alternatives which cannot beat an already available option. It does not reduce the population, remove a transport mode, increase road or train capacity, or turn unfinished journeys into arrivals.

The distinction matters in River Boroughs. A resident waiting for a route calculation is not occupying a road queue. Increasing avenue capacity cannot directly resolve that calculation backlog. The interface now reports engine planning separately while continuing to include it in the existing long-wait total and growth requirement.

## Why a candidate may be skipped

The existing planner first obtains the relevant walking and driving paths, then examines the available rail services in their existing order. A service chooses its boarding/alighting pair with the established pair heuristic. That heuristic, its twelve-tile access limits, and its strict tie order are unchanged here.

For that pair, let `a` be Manhattan distance from the origin to the boarding station and `b` distance from the alighting station to the destination. Every walking edge in this simulation costs four cycles. Therefore any connected access/egress paths cost at least `4 * (a + b)`.

The exact existing railway estimate additionally includes the ride and intermediate dwell time, half a service period, and the platform-queue term `floor(queue / capacity) * period`. Adding those same terms to the walking lower bound gives a lower bound on this candidate's entire estimated journey.

A candidate is skipped only when that lower bound is no better than an already known surface estimate or an earlier valid rail choice. Equal estimates may be skipped because the established rule prefers the surface mode on a modal tie and the earlier service on a rail tie. Negative surface estimates mean unreachable, not a cheap alternative, and do not provide a bound.

A skipped candidate does not consume search fuel, add a cache entry, or mark the search incomplete. A candidate that could improve the result still needs actual connected access and egress paths. A necessary path missing after fuel exhaustion still leaves its resident waiting. Previously incomplete work is not silently declared complete by a later candidate.

## What is and is not equivalent

The invariant is the chosen mode, rail service, boarding/alighting stations, access/egress paths and estimated time **at the same decision snapshot with sufficient reference fuel**. It is not whole-simulation state equality with the predecessor. Fewer unnecessary searches deliberately change cache contents and the cycles in which residents can leave. Subsequently observed queues, mode choices and the number of completed visits can therefore diverge.

The proof does not make the existing station-pair heuristic globally optimal. It does not replace predicted train waiting time with a timetable simulation. It does not guarantee starvation freedom, solve road spillback or eliminate all planning delays. Returning drivers still retrieve their cars; active railway legs, finite seats, paid departures and ownership of saved cities retain their existing contracts.

The earlier [exhausted-budget fast path](PLANNING.md) remains in place. Its historical full-state comparisons describe that earlier optimization, not this change's intentionally different scheduling.

## Observations sent to the browser

`Stats.planning` counts residents in state 1 with reason 8. `Stats.planningLong` counts that same group only when `wait >= 8`. These are projections of the authoritative native resident records. They are not new fields in `City`, `Sim` or `Saved`; save format 8 is unchanged.

The long-wait breakdown displays the unchanged total, its planning subset, the remaining long waits, and all pending planning requests including shorter waits. “Other long waits” is deliberately not labelled “cars”: it may include other non-planning reasons. The explanatory text makes clear that engine planning is not a physical road queue and still counts toward journey time and growth.

The browser receives counts only. It neither infers the full city's state from the visible actor sample nor runs a replacement simulation. Text counts and keyboard-accessible controls avoid a color-only diagnostic.

## Verification

`npm run test:planning-bounds` runs an independent native, unpruned reference against the bounded search on identical city snapshots. The reference spells out the predecessor's queue/ride/wait arithmetic rather than calling the new lower-bound helper. It compares complete selected paths and estimates, not just aggregate traffic counts. Cases include the four city examples, useful rail in both directions, fixed walking and driving returns, congested roads, suspended and unfunded services, crowded platforms, warm caches and stale topology versions.

The command-only oracle may use ten searches: at most two surface paths plus access/egress for four services. This diagnostic allowance is independent of the population-scaled production allowance. Native HTTP must return 404 for the probe target. Native boundary assertions cover strict ties, unavailable surface alternatives, zero estimates, state/reason classification and the eight-cycle long-wait threshold.

`npm run test:planning-ui` uses visible browser controls to load a fresh 1,024-resident city, run it, open the wait breakdown, compare its text against native statistics, use keyboard activation at a 390-pixel viewport, and save/reload the city. It uses a disposable browser identity and native store.

`npm run test:planning-profile` advances a synthetic 1,024-resident city with the native timeline probe. `PROFILE_STOP` selects a horizon up to 512 cycles; `PROFILE_START` optionally resumes a synthetic fixture and `PROFILE_LABEL` names its evidence. Two-cycle observations keep the test's full-state JSON output within its existing limit. This is not a change to the running game's session or storage limits. Every observed cycle contributes to the planning person-cycle count, and each output checks resident/request/money conservation and finite train capacity.

For a retained predecessor selection, the optional real-session comparison is:

```sh
BASELINE_SELECTION=/absolute/predecessor/.build/selection.json \
  npm run test:planning-delivery
OLD_CITY_SELECTION=/absolute/predecessor/.build/selection.json \
  npm run test:save-compatibility
```

The delivery comparison runs the two native hosts serially with the ordinary 500 ms requested timer, autosave and a 32-by-32 detailed viewport. It is not browser rendering FPS or a hard real-time guarantee. The save test compares every existing statistic and all 512 residents' records, wallets and rail plans across native process replacement. Only the two newly added derived statistics are excluded from the predecessor's field set; their values are independently checked against the restored residents.

Native declarations are still regenerated reproducibly and built through public change-plan/change-apply commands. Existing simulation and rail-pair assertions have been separated into small modules so that additional planner dependencies fit the same authored-witness limits. No assertion or compiler limit is removed to achieve that split.

## Next architectural boundary

Scaling should follow measured planning exposure, completed travel, cache churn and actual delivered cycles together. Raising population or fuel limits alone can move the bottleneck into request deadlines or make the city less responsive. Population scaling now addresses the pathological cold start in the 2,048-resident example, but the ceiling of sixteen exact searches is not a bound on the number of expanded route nodes. Further structural candidates are fair admission of unresolved requests and reusable destination/access information with explicit invalidation. They should be assessed against fixed-snapshot decision witnesses and native saved-city continuations before any claim of increased capacity.
