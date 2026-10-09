# City flow

Construction commands retain the released stroke and enter a bounded FIFO. Only one command awaits native acknowledgement. Pending edits are shown on the map; disconnect clears unsent work and explicitly reports uncertain actions without replaying them.

Lines exposes service intent, ordered stops, waiting platforms, paid departures, funds waits and shared-track waits. An empty stopped train with empty platforms can receive stops while other city traffic runs. Menu and removal reviews preserve the running setting; demolition revalidates topology and computes cancellations at confirmation time. Reset/load backups capture the current city, including time elapsed after the review.

Crossing reservations retain exact movement ownership in ephemeral busy facts. Same-movement cars may follow at lane headway; conflicting movements and portals remain exclusive. Older usable conflicting lane heads drain a platoon. Finite receiving capacity and exit reservations remain enforced.

Facilities no longer connect directly to one another. Cached adjacency epoch 3 causes predecessor saves to rebuild derived topology and clear route lookup; city, resident and save record layouts remain format 9. Existing in-flight hops retain continuous presentation.

Commuter Boroughs is an independent static layout with 256 homes, 128 workplaces, 2,048 residents/jobs, sixteen stations, and eight four-stop lines (four east-west and four north-south). Each station serves both axes; sixteen homes have moved within their original districts to keep both rail corridors clear. Native declarations build all services and execute all journeys. Its 64-seat capacity is an authored scenario parameter, not a new upgrade control.

## Verification

Run the native build/check, `npm test`, `npm run test:junction-flow`, `npm run test:continuous-management`, `npm run test:city-flow-ui`, `npm run test:ui-management`, `npm run test:commuter` and `npm run test:commuter-ui`. Browser suites start isolated native HTTP and session processes with disposable stores. `test:save-compatibility` additionally needs `OLD_CITY_SELECTION` selecting the published predecessor. Evidence is generated under ignored `evidence/`.

The commuter observer keeps the complete City within native execution and returns per-cycle conservation and monetary totals plus all residents as compact scalar rows. This avoids the command JSON item limit without changing the simulation or its admission limits.

## Optional research comparisons

`test:region-generation` needs `REGION_BASELINE_SELECTION` and `CITY_SELECTION`: independently built, different artifacts using the identical executable. It compares the regional diagnostic projection at construction, not complete saves or gameplay throughput.

`test:runtime-map-execution` preserves the separate 0.1.88 versus 0.1.89 runtime experiment. It needs `CITY_SELECTION` built for the 0.1.88 executor and `MAP_RUNTIME` selecting the independently built 0.1.89 executable. It runs the identical artifact and full command results in both executors without touching player stores. It is not a release gate for this project's pinned 0.1.83 runtime and does not authorize a runtime upgrade or establish browser performance.

See [the north-south grid and verification](COMMUTER-GRID.md) for the eight-line layout.
