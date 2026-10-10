# Traffic City

This project is a lkjscript capability experiment inside the public lkjscript-sandbox monorepo. Follow the root publication and preservation rules.

Authoritative simulation, validation, routing, traffic conservation, economics, demand, views, and persistence belong to ordinary lkjscript declarations. Browser JavaScript owns input, drawing, and interpolation only. Native HTTP and interactive targets serve the game; no Node or Python game server or relay.

Use pinned lkjscript 0.1.83. src/*.lkjc are literal proposals replayed into a fresh accepted graph by scripts/author.mjs through change plan/apply, check, and build. Never edit accepted graph internals. .build/selection.json binds the selected source, executable, and artifact. Python proposal generators are optional development tooling, not runtime code.

Preserve requested = arrived + explicitly cancelled + outstanding journeys. Road storage and receiving reservations are finite. Invalid edits must reject atomically. Reviewed removal must explicitly count cancelled journeys and moveouts and cannot earn arrival income. Invalidate routes on topology changes. Preserve save formats and typed predecessor readers, browser-owned city keys, autosave, single-tab ownership, and bounded storage.

Run the native build/check and npm test; run relevant browser, migration, rail, and scaling workloads when their behavior changes. Tests must use isolated runtime/ data. Never use an existing public preview or real browser profile by default. Downloads belong to tools/, built graphs to .build/, stores and artifacts to runtime/, reports to evidence/; all are private/generated and ignored.

## Atmosphere and performance policy

Classic Traffic City is the product foundation and default public entrypoint.
Preserve the small homes, workplaces, shops and parks, freely placed roads,
footpaths, bridges, tunnels and one-way streets, tracks, stations and services,
small cars turning along real roads, single-circle pedestrians, natural facility
entrances, soft colors and the river. Watching this particular city is part of
play. Player placement must continue to determine where people and trains move.

Optimize reuse, off-screen work and snapshot-derived summaries before changing
the picture or mechanics. Aggregation and approximation are allowed when they
preserve these relationships. Do not remove street life through excessive actor
sampling. A population of 100,000 is a long-term goal, not a release gate or an
excuse to replace the game with fixed districts or inflate a displayed number.

Metropolis is an explicit separate experiment at its own URL and in its own save
space. Never make it the default instead of classic or describe its different
rules as an equivalent speedup. Preserve both stores and browser keys. Keep
validation local and targeted and CI lightweight.

For presentation-only releases, verify every unchanged native source against the
selected session artifact, check that selected graph, build the HTTP-only artifact
with `npm run build:web`, and test both selections together using
`HTTP_CITY_SELECTION`. Do not rebuild or restart a public session just to replace
browser assets. Record exactly which source and artifact each result covers.
