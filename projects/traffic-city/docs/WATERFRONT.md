# Waterfront cities

Traffic City now has a broad, bending river and roads or footpaths that can cross it anywhere. River Boroughs is a new native example: 1,024 residents in sixteen mixed neighbourhoods, 1,024 jobs, four four-stop railway services and two cross-river walking links. Western districts retain local employers, while the larger eastern employment centres create cross-river commutes rather than four decorative empty trains.

## Building a crossing

Choose Local road, Avenue or Footpath and draw a straight line from dry land to dry land. A water tile costs $32, $72 or $16 respectively; the usual land prices remain $8, $24 and $4. The preview shows the complete stroke's price, including any bridge tiles. Existing matching tiles cost nothing. Individual existing bridge tiles can be upgraded; a new crossing must reach both banks. Insufficient funds, an occupied building or an unfinished crossing reject the entire edit. Houses, workplaces, shops, parks and stations still require dry land.

The native `terrain` projection provides the centerline used by the browser and the `terrain::water` predicate used by construction, railway surcharges and station admission. Both use exact half-tile arithmetic and reserve every tile whose footprint intersects a bank; a building cannot overhang water merely because its centre is dry. Six-tile-wide channels follow long straight reaches and 45-degree bends, rather than a thin straight painted stripe. The browser receives 129 packed boundary vertices only when the map changes. It does not choose which terrain is buildable. Bridge decks appear only where a constructed surface crosses water, not at decorative preset locations.

New starter cities and River Boroughs use this landscape. Older saves and the three classic examples retain their own terrain identity so existing facilities are not unexpectedly placed in water. There is no automatic demolition or movement of a resident's home during loading.

## Facility thresholds and traffic paint

The facility painter and the resident interpolator share explicit cardinal entrance coordinates. A journey leaves the near door rather than a road-lane anchor inside the plot; arrival stops at the facing door instead of continuing to the far side of a building. Native residents waiting inside a facility are not drawn as cars parked on its roof. Adjacent facilities connect facing doors, and walking paths use their centerline rather than an offset intended for a road's pavement.

Congestion follows a tile's connected road arms. Vertical streets, corners and junctions receive corresponding connected strokes; the overview uses the same geometry as the detailed view. Queue values and thresholds are still native observations. The new geometry is not a prediction of traffic or an invented simulation.

## Save capacity and terrain identity

The host's saved-city limit is now configurable through the `saved_city_limit` text configuration value. The supplied descriptor sets it to **1024**, instead of the previous hard-coded eight-city ceiling. Valid configured values are 1 through 4096. Invalid configuration or a malformed stored registry does not silently create an empty registry. An existing owner can still resume a city when the host has reached or lowered its limit.

This is a saved-city admission limit, not the number of simultaneous simulations. The four-session process limit, four-megabyte limit per saved value, one recoverable previous city per city key, autosave, ownership checks and adaptive history compaction are unchanged. Larger capacity does not reserve storage in advance or promise that every allowed city can run concurrently. A host must provision its disk for the saves actually retained.

Save format 8 adds a scalar landscape identity. The exact format-7 reader preserves the old city's fields and assigns its existing terrain. The existing older readers remain available. Browser city keys and the native store namespace do not change. Never reset a player store to test an upgrade.

## Verification

Build the native artifact first, then run the relevant checks with the selected artifact:

```sh
./sandbox traffic-city build
cd projects/traffic-city
node tests/waterfront-geometry.mjs
node tests/waterfront.mjs
node tests/save-capacity.mjs
node tests/with-preview.mjs tests/waterfront-ui.mjs
node tests/source-reproduction.mjs
npm test
```

The geometry test covers facility types, four directions and both walking and driving. The native workload checks the actual terrain classifier against its browser projection at bend boundaries, atomic bridge construction, full prices, insufficient funding, the new seed and ongoing people/money/train conservation. The browser workload exercises actual construction gestures, example loading, live traffic, save/reload and a narrow touch viewport. The capacity workload opens and reopens sixteen independent cities in a newly created disposable native store; it never consumes a player store's slots.

These tests are not a claim that arbitrary 2,048-resident cities keep a particular frame rate. Large-city performance depends on topology, journey length and traffic history. Evidence belongs under ignored `evidence/`, and test cities under ignored `runtime/`; neither belongs in the public repository.

## Native bootstrap work

Home occupancy is counted once before spawning rather than rescanned across the full population for every home. The counter is updated after each home, preserving the behavior of duplicate home IDs in a synthetic input. Job search receives the jobs list instead of an otherwise unused complete World on every recursive step. Resident identity, nearest-available job selection and stable tie order are unchanged by design; a paired predecessor-artifact regression compares complete native results, not only totals. Stations in the new authored example are part of its initial geography, just like roads and homes; tracks and services are still constructed through native rules.

The save-count setting is an admission ceiling, not a storage guarantee. Pinned runtime 0.1.77 also bounds a native backup to 1 GiB. Very large aggregate stores require a host storage/migration plan before approaching that bound; raising the city-count setting alone does not remove it. Automatic maintenance must never evict a city to make a snapshot fit.

## Large-city performance scope

The 1,024-person example is a large simulation workload, not a promise of real-time playback. On the shared development host, its initial 128-cycle workload completes real rail journeys but runs below the two-cycles-per-second goal; many residents initially wait for the bounded route planner. The browser test checks eight or more real live cycles, start/pause and exact save/reload, while the separate native integration test requires 128 cycles, actual boardings and completed rail journeys. Integration uses eight-cycle segments to remain within the same per-request deadline on slower hosts. Unverified further planner optimizations are not included in this change.

## Planning work reduction

The [guarded planner fast path](PLANNING.md) removes railway enumeration when the already exhausted surface-search budget makes a wait unavoidable. It preserves exact resident, route, train and monetary state. This improves the responsiveness of large examples without increasing the native search budget or promising that every large city runs in real time.
