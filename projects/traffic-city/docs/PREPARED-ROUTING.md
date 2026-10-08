# Prepared directed-routing kernel (experimental)

This document records the earlier command-only routing-kernel experiments.
The kernel is now wired into the ordinary game pipeline together with layered
construction, removal, migration, and browser controls. The integrated candidate
is **not release-approved**: directed-trip gates remain unresolved, and paired
whole-game measurements do not establish an overall performance improvement.
See [the integration checkpoint](DIRECTED-TUNNELS-STATUS.md) for the exact tested
artifact and outstanding failures. Do not infer game speedups from the kernel
measurements below.

## Native representation

Ground nodes are 0..16383; underground nodes are ground ID + 16384. Kinds 9..12
are east/south/west/north one-way roads; kind 13 is a ground portal. Cars obey
direction, while walking remains bidirectional. Only explicit portals join
layers. Facilities may be endpoints, never intermediate shortcuts.

`roads` retains the uncached rule. `roadcache` prepares a pure immutable I64 per
node: five base-4 walking slots, five driving slots, static driving entry cost
and receiving capacity. A slot is blocked, transit, or endpoint-only. Dynamic
queue cost is deliberately excluded. An admitted offset needs no repeated
coordinate or direction check inside A*. The frontier packs node/link pairs
into a persistent list; equal-f candidates use deterministic LIFO traversal.
There is no weighted-A* approximation, hidden route truncation or host simulator.

In this prototype, derived metadata uses `World.junctions` keys -1024-node;
-258=2 identifies the layout, while -1..-257 retain the axis-prefix contract.
These ranges do not overlap positive junction IDs. This is an experimental
compatibility carrier, not a commitment to a permanent save schema. Game
integration must retain a prepared world once, rather than re-preparing an old
world for every query. Saved-city compatibility has **not** been certified.

The driving axis bound now includes every occupied endpoint kind, including
paths and stations, so a cheaper final entry cannot make the heuristic
overestimate the route cost.

## Reproduction (Linux x86-64, Node 22+, lkjscript 0.1.83)

Use a separately installed, checksum-verified v0.1.83 executable. No Python is
needed to replay the checked-in literal declarations or run these tests.

```sh
cd projects/traffic-city
mkdir -p .build runtime evidence
export LKJSCRIPT="$PWD/tools/lkjscript/lkjscript"
ROUTE_LABEL=verified-cache083 \
ROUTE_PRELUDE=src/roads.lkjc,src/roadtests.lkjc,src/roadcache.lkjc \
ROUTE_POSTLUDE=src/cacheprobe.lkjc \
node scripts/author-routebench.mjs
CITY_SELECTION=.build/routing-verified-cache083.json \
DIRECTED_REPORT=evidence/verified-cache-routing.json \
node tests/directed-routing.mjs
node tests/cache-contract.mjs
node tests/cache-lifecycle.mjs
```

The harness creates only isolated command artifacts. `route-world` prepares a
synthetic world; `route-warm` queries that prepared world. `route-probe` includes
world construction. None is an HTTP route or persistent-city write operation.

`tests/cache-performance.mjs` additionally requires retained control selections
`.build/routing-base-warm083.json` and `.build/routing-control-warm083.json`.
These must contain the same warm probe with respectively the original surface
A* and the earlier uncached directed/LIFO kernel. Do not substitute current code
for a control. Full control source hashes are retained in the private evidence.
This historical comparison is not a self-contained fresh-clone test.

## Completed verification

The selected kernel passed 164 embedded native checks. The packed representation
matched the uncached native edge rule and entry cost in 17,664 cases (35,328
assertions), covering all kinds, modes, endpoint policies, portals and boundaries.
An independent JavaScript Dijkstra oracle verified 180 complete routes, including
18 layer transitions. Thirteen synthetic lifecycle cases covered obsolete masks,
missing prefix/adjacency data, changed queues, invalid queries and rebuilt road
direction. Lifecycle tests are not save-store migration tests.

All measurements used the same v0.1.83 compiler. Each warm condition was repeated
three times with rotating serial execution order, giving 72 samples across two
layouts. Times include process startup, JSON admission and result output, but
exclude the separately reported topology preparation. Shared-host timing is not
isolated hardware measurement, a game-tick rate or FPS.

| Prepared 6,400-tile grid | Original surface A* | Uncached directed/LIFO | Packed directed/LIFO |
| --- | ---: | ---: | ---: |
| Walking, 8 routes | 9.808 s | 0.567 s | 0.442 s |
| Driving, 4 routes | 7.959 s | 12.422 s | 6.773 s |
| Mixed, 6 routes | 9.397 s | 9.422 s | 4.962 s |

Mixed-workload instructions decreased from 56,790,928 to 30,110,224 relative to
the original surface kernel. For a 128-tile straight road, median mixed time was
0.320 s versus 0.312 s: essentially unchanged despite reduced instruction work.

There is an important tradeoff. Single measured preparation of the 6,400-tile
world took 0.664 s originally, 0.872 s for uncached directed rules and 1.909 s for
the packed representation. Prepared-world JSON grew from 188,545 to 298,140
bytes. These are representation/diagnostic sizes, not live RAM. Reuse is essential;
frequent global rebuilding would weaken or eliminate the benefit. A first mask
prototype was slower on cold workloads and was not selected.

## Exact selected identity

Compiler SHA-256:
`8a92ff982e06c2ce1efafd90bf824242edfe782359ecf849036772befc261cf7`

Kernel artifact SHA-256:
`5a45ae58938fcb006299ab975c04ab3d223cc8ea6df912b70fd2fd77ec4022c2`

Core proposal SHA-256:
`b8a13ba9b74eb4964da22f820f97fcef915381e495a99200ee3d1ba1d6a2161c`

Prepared-table proposal SHA-256:
`24c79514c87ba5ce5238b826eba67b6242a0bb0924f609997dd06ece395f84b0`

The proposal, executable and artifact hashes were re-read after all tests and
matched the selected build. Re-authoring allocates fresh owner identities, so a
fresh artifact may have a different hash; retain its own exact selection.
