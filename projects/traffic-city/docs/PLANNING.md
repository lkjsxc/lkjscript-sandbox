# Avoiding unnecessary journey-planning work

The waterfront candidate introduces a guarded fast path for residents waiting at a facility. The normal planner's per-cycle route-search budget is unchanged. If that budget is already exhausted and a surface route required for the resident's decision is missing, the original planner must leave the resident waiting for planning. Enumerating every railway service cannot change that result, and cannot add a route without budget.

The fast path computes the same destination and available surface travel estimates, preserves all existing route maps and transit state, and records the same planning wait. It does not advance or skip a simulation cycle. It does not hide a resident, cancel a trip, change a train's capacity, change which job a resident has, or grant additional search budget.

A fully cached decision still uses the complete planner, including railway candidates. Returning drivers still take their cars home. Mid-route replanning, missing destinations and active railway legs retain their established paths. The predicate has all 128 combinations of its Boolean inputs checked by the ordinary native test runner.

## Verification

`tests/planning-fastpath.mjs` runs a retained ungated waterfront artifact and the candidate serially with the same inputs. It compares complete native results, including every resident record, route cache, railway service, account and conservation counter. Thirteen cases cover 384-, 512- and 1,024-resident cities, initial planning, railway suspension and resumption, a mature-city cache boundary and a new bridge intervention. Neither comparison arm reads a player store.

`tests/planning-live.mjs` separately measures delivery of 32 cycles with the usual 500 ms requested timer, a 1,024-cell detailed view, autosave and two fresh native stores. It compares statistics at each common cycle. These are server delivery measurements, not browser rendering FPS.

Both optional comparisons require `BASELINE_SELECTION` pointing at a retained predecessor artifact. `CITY_SELECTION` chooses the candidate. The mature-city extension uses `MATURE_CITY_FIXTURE`, which must be a separately generated native example fixture. Historical executables and stores are not shipped in the public repository.

The runtime remains pinned to lkjscript 0.1.77. No compiler, session, storage, traffic-capacity or planning-budget limit was raised for this optimization. Deterministic instruction counts are the primary work measure; wall-clock timings come from a shared development host and are not an isolated hardware benchmark.

## Observed results

The source-bound candidate passed 406 native tests with production/reference equality. All thirteen predecessor/candidate cases matched in full. In the 1,024-resident startup windows, native instruction counts fell by 83.5–92.8%; the road-edit case fell by 70.3%. These figures measure work eliminated, not fewer simulated residents or trips.

With a 500 ms requested timer, ordinary autosave and a 32×32 detailed viewport, the measured 9–32 cycle interval changed from 5,451.0 ms on average to 575.8 ms. This is approximately 0.183 to 1.737 delivered cycles per second on the shared host. The candidate's p95 interval was 701.9 ms, so it does not establish a strict two-cycle-per-second guarantee. Peak observed RSS was approximately 106 MiB for the candidate versus 105 MiB for the predecessor. Every one of the 32 cycle statistics matched.

Publication-safe observations and exact artifact identities are in [PLANNING-RESULTS.json](PLANNING-RESULTS.json). Full transient test states stay outside Git.
