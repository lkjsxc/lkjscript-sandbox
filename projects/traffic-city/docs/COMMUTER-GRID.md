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
