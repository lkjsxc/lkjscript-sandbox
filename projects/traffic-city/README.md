# Traffic City

A browser city-building experiment using **lkjscript 0.1.77**. Native lkjscript owns simulation, travel, rail, money, persistence, HTTP, and interactive sessions. Browser JavaScript handles input, drawing, and interpolation. There is no Node, Python, or Rust game server.

This is one independent project in [lkjscript-sandbox](../../README.md). It starts with a fresh local store; it does not connect to or replace an existing hosted city.

## Build and run

Supported build/run environment: Linux x86-64, Node 22+, npm, Bash, curl, tar, sha256sum, and flock (util-linux). The pinned executable is a Linux musl build; other operating systems need a Linux VM or container. Python 3 is only needed for optional source regeneration and memory profiling.

From the repository root:

```sh
./sandbox traffic-city setup
./sandbox traffic-city build
./sandbox traffic-city run
```

Open **http://127.0.0.1:19140/?session_port=19141**. Ctrl-C stops the foreground supervisor and its native processes. Setup verifies both the downloaded archive and executable hashes. Builds replay the checked-in declaration proposals into a fresh graph and write the selected artifact identity to `.build/selection.json`.

To avoid conflicting with another local project, select unused ports at build time:

```sh
HTTP_PORT=19240 SESSION_PORT=19241 ./sandbox traffic-city build
./sandbox traffic-city run
# Open http://127.0.0.1:19240/?session_port=19241
```

Listeners default to loopback. For a separately authorized reverse-proxy deployment, route HTTP and `/live` to the respective native listeners and set `BIND_HOST`, `DIRECT_ORIGIN`, and `LOCAL_ORIGIN` explicitly during build. The browser uses same-origin `/live` unless a validated `session_port` query is supplied. It contains no personal preview-host exception. Origin validation remains native; do not weaken it to make a proxy work. Generated deployment descriptors and real data stay under ignored `runtime/`.

## Play

Explore is selected initially. Drag to pan, pinch or scroll to zoom, and use Fit to return to your built city. Two fingers always cancel construction and navigate. At low zoom, the server sends an overview. Tap a tile to inspect a resident, junction or rail service. Roads and Places open their own small palettes; Rail and Remove have dedicated tools.

Roads cost $8 per tile; avenues $24; footpaths $4. A home costs $70 and a permit and adds eight permanent residents. Workplaces cost $140 and offer sixteen jobs; shops cost $110 and parks $90. Junction controls cost $40. Place buildings individually on empty land. Roads and paths support straight strokes of up to 64 tiles.

Rail has three separate tools: **Track → Station → Service**. Drag straight or bent track; the bend-order control and preview show its shape. New track costs $12 per tile, or $36 over water. A $90 station needs empty dry track beside a road or footpath. Select two connected stations to create a $120, 16-seat service. Its inspector opens with the service suspended: add stops, then enable departures.

Pause traffic and suspend an empty train at a station before adding stops. Add intermediate stations on the existing path or extend beyond the last stop along connected track. Each service supports eight stops and a 256-tile route; the city supports four services and 2,048 track tiles. Track strokes are limited to 128 tiles. Residents walk to their chosen station, queue for capacity, alight at their own stop and finish on foot. Shared moving sections wait until clear. There is one train per service and no transfers between services.

Remove selects a real rectangle of up to 256 cells. The review states the salvage, households moving out and journeys explicitly cancelled before anything changes. Selecting track used by a service reviews cancellation of that service; inspect the affected stations, selected tiles, journeys and salvage before confirming. Cancel leaves the city intact. Confirmed affected journeys return home without earning income; removed homes return their permits. Ordinary traffic recovery never deletes or teleports trips.

The starting district has a long commute across a constrained crossing. Observe both the crossing and the western junctions. Nearby connected workplaces and services shorten journeys; walking shortcuts or a useful river-crossing shuttle can remove car trips. Junction priority and signals affect conflicting movements. More road capacity alone cannot fix every delay. New cities start in the center of the 128 × 128 map.

Completed work brings explicit outside business revenue, pays wages and transfers payroll tax to the city. Slow work trips earn less. Shopping and leisure spend available household savings at destinations, with sales tax to the city. Boarding transfers $1 to the city; an empty wallet receives a recorded concession. Business tax and infrastructure upkeep settle every 64 cycles; trains pay per departure. Construction, salvage, arriving household capital and departing balances are accounted for separately. Click **Funds** for balances, period taxes, fares, costs and unpaid upkeep. This is a small monetary model, not a complete goods or labour market. To expand the first district, serve 32 visits, maintain 32 residents, save $240 and sustain 24 cycles with no disconnected residents and at most a quarter enduring long waits. Expansion spends its cost, grants home permits and doubles the next requirements. Trips and residents remain in the city when routes fail.

## Saving

Each browser receives a random private city key in local storage. Reopening the page resumes its committed city; there is no login. Edits commit before acknowledgement, travel autosaves every ten simulation cycles, and graceful disconnect/shutdown attempts a final save. At 25 minutes the browser saves and waits for acknowledgement before renewing its connection. The HUD shows the acknowledged cycle. A hard process failure, suspended browser or operational runtime timeout may recover only from the last successful checkpoint.

Only the latest tab to resume a city may save it. Earlier tabs become inactive and can explicitly take control through **Resume here** in Menu. Other browser keys have separate cities. Clearing browser storage loses the recovery key; the UI warns about this and refuses to silently switch to an unsaved mode if storage is unavailable.

**Menu → Example cities** offers Garden City (384 residents), Crossing Challenge (256), and Willow Metro (512, two bent three-stop services). Each has a different traffic challenge. These are authored layouts with native-generated residents, never player saves. Loading requires confirmation and makes the current city the one recoverable backup; loading another example replaces the older backup. Cancel leaves the city unchanged.

Menu also contains Save, Guide, Preferences and Manage city. Reset requires a review and keeps one native backup of the previous city under the same private key. Restore previous city recovers that backup once; resetting does not consume another city slot. Format 7 explicitly reads published format-4, format-5 and format-6 saves, retaining coordinates and resident state. Legacy rail services gain explicit geometry and stops; the monetary ledger records opening balances without rewriting earlier income.

This development preview has **eight saved-city slots**, four simultaneous sessions, a 4 MiB value limit, and no automatic city eviction. Each slot can also hold one previous-city backup. Native backup/restore compacts physical history at the greater of 64 MiB or twice its last compacted size. This is a maintenance threshold, not a hard OS quota; in-flight writes can exceed it temporarily. Old checkpoint directories remain untouched.


## Source layout

`src/*.lkjc` contains the native declaration proposals. `web/` is browser presentation; `examples/` holds three authored city layouts. `scripts/author.mjs` replays proposals through `change plan`, `change apply`, `check`, and `build`. `scripts/serve-native.sh` and `scripts/maintain-saves.sh` only supervise processes and maintain the native data store. Optional Python expression builders under `scripts/journeys/` regenerate proposals; they never execute the simulation.

All local saves, test stores, downloaded tools, accepted graphs, and evidence are ignored. Do not delete `runtime/` to clean a project with a city you need to keep. Browser city keys and native stores must be preserved together.

## Tests

```sh
./sandbox traffic-city check
./sandbox traffic-city test
cd projects/traffic-city
npm run test:rail
npm run test:expansion
npx playwright install chromium
npm run test:smoke
npm run test:browser
npm run test:ui-expansion
```

The build performs native graph checks and embedded tests. The core suite checks motion geometry, independent routing comparisons, conservation, deterministic replay, and WebSocket persistence/ownership. Browser wrappers start isolated loopback listeners on automatically assigned ports with fresh stores. `CHROMIUM` can select an existing browser executable; otherwise Playwright's installed Chromium is used. Never set `PREVIEW_URL` to a real preview unless testing that actual deployment and consuming city slots is explicitly intended.

The native throughput changes, exact predecessor comparisons and save-compatibility reproduction are documented in [docs/THROUGHPUT.md](docs/THROUGHPUT.md).

Additional workloads are listed in package.json. Some advanced tests deliberately require a prior test-generated city (for example rail-player before rail-removal) or a separately supplied historical selection (migration/upgrade/planner comparison/hotpath equivalence). Migration and upgrade tests require OLD_CITY_SELECTION pointing at a separately built predecessor; they are not part of the fresh-clone command sequence above. Historical binaries and operational test inputs are not included. Do not treat these optional comparisons as self-contained fresh-clone tests.

The map limits are 128 × 128, 8,192 occupied tiles, and 2,048 residents. They are admission limits, not a promise of real-time performance for maximum-size cities. CI's smoke test does not establish large-city scalability. See [docs/IMPORT.md](../../docs/IMPORT.md) for source provenance and the publication boundary.
