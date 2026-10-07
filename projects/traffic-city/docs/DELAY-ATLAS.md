# Journey burden atlas

> The original implementation record below predates the waterfront update. Current terrain identity, save format 8 and configurable saved-city capacity are described in [Waterfront cities](WATERFRONT.md).
City Lab can now answer **which residents spend more time tied up in journeys**, not only whether a citywide total changes. Complete a comparison, then choose **Show on map** in its results or **Journey atlas** in the experiment tray. Select a signed home marker or use the keyboard-accessible home selector for the exact measurements.

The underlying map is the planned future. Markers belong to residents' **homes**, not the road tiles where they queued. Their signs describe the same residents across the two futures: less journey time (−), more (+), unchanged (=), or mixed effects within one home (±). A dashed × means the original and planned home have different residents. A mixed home remains mixed even when opposing effects cancel to an unchanged total.

## Measurements, not a score

After each ordinary native simulation tick, the experiment observes every resident. Journey exposure counts one person-cycle while planning a journey, travelling on a road or footpath, parking at the destination, waiting for a train, or riding it. Resting at home and activity at the destination do not count. In-progress journeys are counted even if they never finish during the comparison. This is the discrete **post-tick occupancy integral**, not mean completed-trip duration or a prediction of eventual arrival time.

The home inspector also shows long-wait exposure (one person-cycle when the resident's current continuous wait is at least eight cycles) and disconnected exposure (a planning resident with no route or no destination). Long-wait exposure is deliberately distinct from the existing City Lab **Waiting** counter, which records individual waiting events including the first seven cycles. Values are shown as **no change → your plan** over the same comparison window.

Only residents with the same identifier **and the same home** in the original and unadvanced plan contribute to the comparison. Removed residents are excluded and new/relocated residents are counted separately. Demolishing and rebuilding a home at the same coordinates does not make its new residents comparable, even if the city's population is unchanged. Excluded homes show no false improvement from zero matched exposure. Both original-only and plan-only home locations remain discoverable.

Less exposure does not, by itself, establish an improvement: residents can spend less time in journeys because they made fewer trips, reached fewer destinations, or had travel cancelled by an edit. Read destination visits, unfinished journeys, cancellations and population alongside the atlas. There is no automatic winner, monetary valuation of a person's time, average-only success score or policy recommendation.

## Isolation and bounded work

All observation, identity matching, per-person classification and home aggregation run in ordinary native lkjscript declarations. The browser decodes the native report and draws it; it does not simulate a second city or infer routes. Sampling happens only inside a running comparison, once per native tick. Normal play does not collect an atlas. Both private ledgers reset on every comparison and disappear on edit/discard/apply or reconnect. No extra city slot or previous-city backup is used.

`City`, `Saved`, format 7, typed predecessor readers, traffic admission, train capacity and money rules retain their shapes and behavior. Only transient session state and the outward experimental report change. The native runtime remains pinned to **0.1.77**. Existing optional source generators remain development tooling; building and running the game do not acquire a Python dependency.

The final report groups at most 2,048 original and 2,048 planned residents. With eight residents per home, completely replacing the population produces at most **512 home rows**. Each wire row is a fixed 13-integer array in the following order:

`home, before, after, same, less, more, equal, baseTime, planTime, baseWait, planWait, baseLost, planLost`

`lab.atlasChanged` marks the full result frame. Later reliable WebSocket frames retain cohort totals but omit home rows; the browser retains the acknowledged result until the experiment changes. This avoids attaching the whole spatial report to every viewport or inspector update. The full report is packed only on that result transition. No session, mailbox, frame, storage, lifetime or compiler budget has been raised. Additional experimental observations cost CPU and memory; this feature does not claim higher simulation throughput or mature-city capacity.

## Reproduce verification

```sh
./sandbox traffic-city build
cd projects/traffic-city
npm run check
npm test
npm run test:atlas-presentation
npm run test:delay-atlas
npm run test:delay-atlas-ui
npm run test:delay-atlas-metro
npm run test:city-lab
npm run test:city-lab-ui
npm run test:source-reproduction
```

Embedded native tests cover all seven resident states, the eight-cycle waiting threshold, disconnected reasons, exact-identity matching, replacement at the same home, relocation, mixed effects at a net-zero home, repeated unfinished observations, empty cities and the 512-home union. The `atlas-probe` command target independently advances ordinary traffic and returns only raw resident observations: it never calls the atlas sampler, classifier or aggregator. The external test oracle reduces those observations separately and compares every native home row and cohort total, including a 512-resident two-service metro case. The metro observer returns eight ticks per command to respect the existing typed JSON item limit; every native tick is retained and the complete city, routes and trains continue into the next chunk. A separate 256-cycle test exercises the maximum comparison window. Browser tests use actual visible controls, camera input, the home selector and narrow-layout inspection on isolated native listeners. Keyboard home selection focuses its heading; Escape returns to the selector. Completed home measurements retain their DOM nodes and selected text across native heartbeats.

The probe is test instrumentation, not a browser simulation service. Emulated mobile viewports are not physical-device certification. Evidence is generated under ignored `evidence/`; player stores and browser keys are neither test fixtures nor publication inputs.
