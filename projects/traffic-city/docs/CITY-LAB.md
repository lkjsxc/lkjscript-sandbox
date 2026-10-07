# City Lab: compare a plan without gambling the city

City Lab is a native, temporary counterfactual experiment. Open **Menu → City Lab**, start an experiment, edit the map with the ordinary construction tools, and choose **Compare**. The unchanged city and the plan run from exactly the same original cycle for 64, 128 or 256 simulation cycles each. They run sequentially, not simultaneously. A timer callback advances at most one experimental city by one ordinary `traffic::tick`.

The real city is checkpointed first and remains frozen. The map shows the plan while editing, then the unchanged future, then the planned future. The tray labels which one is displayed. **Stop comparison** returns to the unadvanced plan, and **Discard** restores the original city. There is no second game engine or approximate browser predictor.

## Read the whole comparison

Results are native measurements, not recommendations or a guaranteed forecast. Destination visits exclude return-home arrivals. Completed journeys include those returns. Waiting is accumulated person-cycles from the simulation's waiting counter. Disconnected person-cycles sum the disconnected population after every experimental tick. Unfinished journeys are requested minus arrived minus cancelled. Cancellations, final population and planned moveouts are shown because deleting homes or cancelling travel must not masquerade as improved transport. Funds change includes the plan's construction costs as well as subsequent income and operation.

A shorter wait is not automatically an improvement when fewer people reached destinations, more journeys were cancelled, or residents were removed. A 64-cycle window can also end before a useful connection's benefits appear. Compare longer windows and different interventions rather than extrapolating one short run indefinitely. New homes legitimately change the population: the interface reports this rather than treating the two populations as identical.

There is deliberately no automatic winner, no opaque composite score, and no average calculated only over successful trips as the primary result. The simulation is deterministic from a given complete city; this comparison establishes an in-game counterfactual, not empirical validity for a real-world transport policy.

## Apply edits, never the simulated future

After a complete comparison, **Review applying plan** describes the exact original-cycle cost/refund, new residents, moveouts and cancelled journeys. A separate confirmation commits the *unadvanced edited plan*. Experimental time, completed trips, wages, fares and growth earned by the future are not imported. Normal budgets, permits, paid rail operation, demolition rules and monetary conservation still apply. The original running/paused setting is restored on apply or discard.

The native confirmation is bound to an acknowledged command. Returning to edit, rerunning, or cancelling the review invalidates it. Construction is rejected during comparison/results until the player returns to edit. Applying is only acknowledged as successful after the existing owner-checked native checkpoint transaction commits. A stale tab cannot replace a city claimed by another tab.

## Lifetime and storage

Only `State` and the outward `Frame` gain experimental fields. `City`, `Saved`, format 7 and typed legacy readers retain their saved-state shapes. The experiment contains an immutable original city in `State.city`, an edited plan and one currently simulated trial. Persistence, close and shutdown continue to write only `State.city`, never the displayed future. Applying changes that real city only through the checkpoint transaction.

Experiments consume no extra saved-city slot and do not replace the previous-city backup. They are **temporary and connection-local**. Reloading, reconnecting, session expiry or a process restart discards the experiment and restores the real saved city. The interface explains this before entry and in the menu. The usual 30-minute native session lifetime still applies; it is not extended by City Lab. A long-session browser renewal is not initiated while an experiment is active.

The same configured session/frame/storage limits remain in force. Sequential simulation avoids two ticks in one callback but does not make experimenting free: paired runs require twice the simulated cycles and retain additional in-memory city state. No mature-city capacity or real-time performance improvement is claimed by this feature.

## Implementation and reproduction

The `lab` modules own the pure state machine and ordinary native edits. `labmetrics` derives the native report. `laboratory` and `labstore` own entry, owner checks and the reviewed durable apply. `view::emit` selects a displayed city without replacing the real one in the returned session state. Browser `lab.js` only sends commands and presents native reports; it never advances residents, predicts routes or calculates a game outcome.

Checked-in `.lkjc` proposals are the build inputs. The existing optional Python authoring helpers emit those declarations and do not run any simulation. A normal native build does not need Python. The compiler stays pinned to 0.1.77.

```sh
./sandbox traffic-city build
cd projects/traffic-city
npm run check
npm test
npm run test:city-lab
npm run test:city-lab-ui
npm run test:city-lab-metro
npm run test:source-reproduction
```

These tests use fresh native listeners and disposable local stores, not the public preview or a player's recovery key. The session regression compares both experimental futures against ordinary native command-runner simulations, including every resident field. It also exercises invalid horizons, confirmation invalidation, plan-only application, interruption, restart, tab ownership, demolition, existing-backup restoration and the unchanged eight-slot admission limit. The browser regression uses actual map input and visible controls on desktop and a narrow mobile viewport. Mobile emulation is not physical-device certification.

## Further experiments enabled by this design

The feature is a foundation for testing counterintuitive interventions: replacing a car connection with a footpath, placing a useful destination closer instead of widening a road, changing signal priorities, or suspending an underperforming service. None is declared beneficial in advance. The [journey burden atlas](DELAY-ATLAS.md) adds identity-matched spatial differences and includes unfinished journeys. Completed-journey duration distributions and multi-stage planning remain future work. A native replayable experiment format would need explicit retention, resource and data-version policies before experiments could safely survive reconnects.

The metro regression additionally uses the authored 512-resident, two-line city. Suspending one service is compared with two independently executed native command-runner futures. It reconstructs disconnected person-cycles from the individual frames, verifies unchanged real time, checked rail seating and finances, and confirms that discarding restores both original services. These are bounded 64-cycle cases, not certification of every mature 2,048-resident city.
