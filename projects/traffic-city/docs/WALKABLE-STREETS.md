# Visible pedestrians and door-to-door mode choice

## What changed

Street travellers no longer disappear solely because the viewport exceeds 1,024 tiles. Detailed per-tile traffic still has that bound; individual rendering now has a separate 128-person budget at every zoom level. A topology-change frame retains its existing compact map-only handoff, and subsequent frames include the street sample.

Native projection counts all eligible street travellers in the requested viewport. Walking includes direct walking and the walking legs of a rail journey. Driving includes cars moving or waiting on the street. Residents resting indoors, computing a route, picking up a car inside a facility, parking, waiting on a platform or riding a train are not silently added to the street count. The eligibility rule is the same for the complete count and the sample.

The drawing reserves up to 64 slots for each of walking and driving, lending unused slots to the other mode. If at most 128 street travellers are eligible, all are drawn. Within each mode, deterministic midpoint strata span the complete ordered population rather than taking its first IDs. The sampling has no timer or random reseeding. The same paused snapshot and viewport therefore produce the same identities. As the population in the viewport changes, the chosen sample may change; it is not a permanent selection of favoured residents.

These are mode-separated illustrative samples, **not proportional mode-share charts**. The map explicitly labels the complete on-foot/in-car counts and the number actually drawn. Neither unsampled people nor their travel are deleted from the simulation. A glyph never stands for several people. Zooming and panning request the corresponding viewport, including changes inside a previously loaded rectangle, so the totals do not silently describe an old, wider view.

The browser keeps the native positions, paths and interpolation clock. A pedestrian has a minimum three-CSS-pixel body with a contrasting outline at low zoom and a directional head/jacket shape when close. There is no decorative population and no client-side route simulation. Reduced-motion behavior and authoritative reset handling are retained.

## Walking versus driving

Ordinary walking still has no distance cutoff. Roads and footpaths remain walkable, and the station-pair candidate radius remains twelve Manhattan tiles at either end. This change does not make grass or disconnected buildings into walkable shortcuts.

The old car model allowed six cycles for access and six for parking. Both are now twelve. A shared native constant supplies the new pickup duration, the new parking deadline, and the total 24-cycle addition to the driving estimate. This is an actual non-driving portion of a car journey, not an unexplained preference bonus. Road speeds, walking speed, finite road storage, train capacity, fares and search budget are unchanged.

For an unobstructed straight avenue between two facilities `d` edges apart, walking is `4d` cycles and the car estimate is `24+d`. Walking wins through eight edges, including the tie at eight; a nine-edge trip can still favour driving. Along a straight local road the destination-entry cost makes driving `24+2d-1`, so the boundary is eleven versus twelve edges. Junction delay, queues, footpath shortcuts and rail alternatives can change the answer. These are game-balance cycles, not a claim about real-world seconds or a universal walking radius.

A returning driver still has to take their car home; a returning walker does not invent a car at work. Existing saved resident fields and in-progress durations are not rewritten on load. Newly entered access/parking phases use the updated rule. A car trip completes only after its actual parking phase; no arrival revenue is awarded early.

## Verification

`npm run test:street-presentation` compares native projection against an independent enumeration of the complete synthetic viewport. It checks exact counts, real and unique identities, unchanged resident fields, both mode reservations, borrowed slots, late-ID walkers, cropping, indoor/platform/riding exclusions, and same-snapshot determinism. The command probe never edits its input city.

`npm run test:walkability` exercises avenue and local-road choice boundaries, longer useful drives, a thirty-edge footpath, actual twelve-cycle car access and parking phases, no early arrival credit, car ownership on returns, and population/request/money conservation.

`npm run test:street-ui` loads a fresh River Boroughs through visible controls, advances it, and checks actual native pedestrians in overview, exact count/sample text, real IDs reaching the canvas, minimum glyph size, zoom without simulation mutation, a 390-by-844 viewport, and native save/reload equality. It records screenshots and does not use a player's browser profile or recovery key.

The geometry regression additionally covers overview packets containing actors, map-change handoff, positive scale validation, size floors and honest sample captions. Viewport and slow-reader workloads continue to check the unchanged packet/buffer bounds. A same-state native projection probe is not exposed through the public HTTP or interactive target.

Release measurements should distinguish cumulative modal choices, current street populations, displayed samples, completed journeys, and delivered wall-clock cycles. A larger visible pedestrian count alone is not evidence of a better transport network or a faster runtime.
