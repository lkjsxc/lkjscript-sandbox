# Commuter Boroughs: north-south rail

Commuter Boroughs has eight four-stop services. IDs 1–4 keep their east-west
corridors on rows 20, 48, 76 and 104. IDs 5–8 run north-south on columns 22,
44, 84 and 106. Every one of the sixteen existing stations serves both axes.
Each service has one 64-seat train; there are no passenger transfers between
services. The eight routes share 664 unique track tiles.

Sixteen homes move within their original districts to clear the north-south
corridors. The example retains 256 homes, 128 workplaces and capacity for
2,048 residents and jobs. Every facility has real road or footpath access.
`scripts/author-commuter.mjs` regenerates the static layout; ordinary native
commands construct the lines and execute simulation, including the existing
shared-section reservations. Both native service builders now allow eight
services and reject a ninth atomically. The map and Lines panel share eight
colours.

Existing saves keep their layouts. To play the new layout, choose
**Menu → Example cities → Commuter Boroughs** and confirm. The current city
becomes the recoverable previous-city backup, replacing any older backup.
The save schema and native movement rules are unchanged.

## Verification

After `npm run build`, run:

```sh
npm run test:commuter-layout
npm run test:rail-service-capacity
npm run test:commuter
npm run test:commuter-rail-flow
npm run test:commuter-ui
```

The static test checks both clear corridors and facility access. Native tests
check admission through both builders, exact routes and station membership,
conservation and balanced money for 144 cycles (including completed work trips). The command-only rail observer
samples every train for 128 cycles. Its independent assertions require every
train to travel both ways and shared-track waits to occur, with no two moving
trains reserving the same cell. It does not change the simulation or saved types.
The browser test checks all eight services and their stop lists, distinct map
and panel colours, actual start/pause, save/reload, and the mobile example menu.

For predecessor compatibility, set `OLD_CITY_SELECTION` to a separately built
previous release and run `npm run test:save-compatibility`. All these runtime
checks use isolated stores; they never load a real player's key or city.

## Residents leaving home

The initial commute is an actual native journey, including walking to and from
stations. A correct population counter or an empty moving train is not evidence
that residents can travel. The previous city could leave almost everyone waiting
for route calculation and could assign workplaces on another horizontal corridor,
which is unreachable without a transfer.

The simulation now allows `min(16, max(2, ceil(population / 128)))` exact new route
searches per cycle: two through 256 residents, eight at 1,024 and sixteen at 2,048.
Cached routes remain free. This is a bounded admission increase, not a new routing
algorithm, a time guarantee, a passenger-capacity increase or a fake crowd. A
single exact search can still be expensive. Decisions, finite seats, real walking
hops, fares, queues and journey conservation remain native.

The authored example assigns each of its 512 residents per horizontal corridor
to that corridor's 512 job slots. Capacity remains sixteen workers per workplace.
This rule is specific to the example's existing four row bands; it is not used as
a general reachability rule for arbitrary player cities. Existing resident jobs
survive road, signal and other edits that do not change the set of workplaces.
Employment counts are rebuilt from surviving residents, so removing homes releases
job capacity. Adding, removing or replacing workplaces retains the general job
reassignment behavior.

Existing saves keep their residents and employment assignments. They immediately
use the new planning allowance, but obtaining the repaired authored employment
requires loading Commuter Boroughs again through the example menu and confirming.
That action preserves the current city as the one recoverable previous-city
backup and replaces any older backup. It does not merge a new layout into a save.

Additional regression commands:

```sh
npm run test:employment-preservation
npm run test:commuter-residents
npm run test:commuter-edit-residents
npm run test:commuter-residents-ui
```

The resident probes require at least 256 people on actual adjacent walking hops
by cycle sixteen, no disconnected resident and no cross-corridor work assignment.
The edited probe first applies a real road construction command. Browser checks
require native pedestrians in the overview sample and rendered actor stream,
then save and reload that same city. These tests use disposable stores and never
read a player's private recovery key.
