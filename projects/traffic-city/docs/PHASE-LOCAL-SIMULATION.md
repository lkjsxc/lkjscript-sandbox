# Phase-local simulation and Twinbank Region

This change separates an immutable cycle snapshot, transient computation, and the next persistent city. It does not replace real residents with aggregate traffic, change the fixed two-search admission budget, or increase the population/storage limits.

## Computational changes

**Conditional predicates.** The optional proposal author now emits native conditional expressions for conjunction/disjunction. Boolean library calls are ordinary eager calls, so they previously evaluated rejected alternatives. Static typechecking still covers both branches. Native witnesses exercise all truth-table cases and unreachable arithmetic; the game inputs continue to use the same ordinary native declarations.

**Persistent resident snapshots.** Movement begins from the current resident map, after train movement. Only residents that change are inserted into that persistent map. Sleeping, dwelling and parking residents remain in the snapshot. A rider's travel-time counter still advances even when the movement phase does not need to write the rider again. Traversal order and rotated admission priority are unchanged. Default missing-resident records are constructed once per movement/admission/summary traversal instead of once per lookup; missing-ID semantics are preserved.

**Packed exact A*.** A discovered cell has one distance/predecessor entry rather than two separate maps. The representation is `(distance + 1) * 65536 + parent + 1`; the origin has no parent. Zero means undiscovered. Both layers' maximum cell identity is 32767, and legal edge costs fit within the established bound. Path extraction recovers cell zero without confusing it with an absent predecessor. The queue order, strict distance comparisons, selected paths, one-way edges and explicit portal edges remain unchanged. No approximate pathfinding is introduced.

**Snapshot-scoped cost memo.** Car route estimates are indexed by immutable route identity only while the world and queue snapshot remain fixed. The value is `ETA + 2`, distinguishing unknown from a cached unreachable result. This memo is discarded at the next cycle, and it is absent from City, Sim and saved data. Train queues, train waiting times and topology changes are not memoized across snapshots.

**Sparse monetary settlement.** Successful arrivals emit a cycle-local identity journal. When the boarding counter advances, the identities on the bounded trains are added. A set unifies those sources, and the existing per-person accounting function processes each candidate once. The predecessor's full-population monetary scan remains available for independent tests. Business taxation, operating costs, debt, concessions and period boundaries retain their original arithmetic. The candidate journal is transient: it is not a new event-sourced save format.

Residents have separate wallets. Destination income depends on that resident's actual completed trip, not on another resident's wallet. Shared firm balances receive additions before the separate tax phase. Thus candidate deduplication and ordered map enumeration must agree with the full scan, including a reversed resident-ID traversal; the full-state comparison test checks this rather than relying only on total-money conservation.

**Monotone vacancy queries.** During a single initial assignment pass, employment only increases. For a particular home, the most recently chosen closest job remains optimal until its capacity is exhausted: no closer vacancy can appear in that pass. The constructor reuses that candidate within a household, and reassignment uses a phase-local candidate per home. A full candidate is immediately invalidated. Facility order, strict tie behavior, resident order and capacity sixteen are retained. The cache is never carried across a construction/removal command.

## Larger authored example

Twinbank Region is the fifth ordinary example, constructed by native commands. Its checked-in layout describes geography, not a player save or host-side simulation.

- 2,048 residents in 256 homes, 2,048 jobs, and 32 neighbourhoods.
- Four horizontal rail services with eight stops each, and 32 distinct stations.
- Paired north/south one-way arterial roads, with two-way alternatives.
- Two 37-cell underground crossings and four explicit portals.

The region occupies 2,766 cells including its 74 underground cells. Its unequal distribution of jobs creates both local and cross-region travel demand. The example starts paused, and loading it uses the normal reviewed replacement and recovery path. The existing 2,048-resident hard limit is reached, not raised. This is not a claim that every supported map, host or browser can sustain a particular real-time rate.

## Verification boundaries

`test:scale-comparison` separates the predecessor on the released executable, the identical predecessor source on an accepted-main executable, and the optimized source on that same accepted-main executable. Complete City results must match, not just selected traffic counters. The runtime executables also differ in build/link configuration; their comparison is a deployment comparison, not a causal measurement of only the language version.

`test:money-events` compares the complete next City with the preserved full-scan settlement. Its deliberate missing-arrival variant must be rejected by the full-state check even if the money-conservation equation still holds. The suite includes real boarding, purchases, reversed identity order, empty household wallets, exhausted municipal funds and period boundaries.

`test:region` executes the complete native city and projects every resident into explicitly named scalar columns. It checks all resident identities, job capacities, physical cell transitions, lane capacity, both layers, every wallet and business balance, and per-cycle trip/money conservation. This compact diagnostic is not a full save or a replacement simulator.

`test:region-live` exercises real isolated native storage, ordinary WebSocket frames, explicit save, process restart and the previous-city recovery action. Its post-restart inspections sample 33 residents; that live check is not described as comparing all 2,048 complete resident records. `test:region-ui` exercises the normal menu, reviewed loading, running, saving, browser reload and a 390 × 844 emulated viewport.

Source-only regeneration remains optional development tooling. Native gameplay and hosting do not acquire a Python or Node server dependency. The synthetic interactive benchmark is split into seed, message, tick and transition proposals to respect ordinary native declaration admission; its sole ByteStream requirement remains limited to one call.

## Acceptance

The design above describes implemented source, not a blanket assertion that every gate has passed. Measured results, exact artifacts, remaining limitations and publication status belong in `SCALE-RESULTS.json` and `SCALE-STATUS.md` when those records are written. Runtime inputs, private stores, session keys and deployment descriptors must not be published.
