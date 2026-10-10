# Aggregate traffic: population-independent work

## Status

The `meso-benchmark` and `meso-view` native command targets are working experiments. They are **not connected to the legacy Traffic City session, its saved cities, or the public game**. The self-contained preview generated in `evidence/meso-preview.html` paints a native simulated snapshot; its animation is representative presentation, not a live simulation.

The current public game still uses the previous individual-resident engine and its population limit. No 100,000-person production-readiness claim is made here. In particular, region-wide pathfinding, interconnected junctions, legacy train management, editing, persistent saves, and a live aggregate session have not been integrated.

## Design direction

Traffic City is an experimental game. Low processing cost, responsive editing and convincing visual motion take priority over microscopic fidelity. Large populations must not allocate, pathfind, update, serialize or paint one object per resident.

The new model represents integer population mass in at most 512 corridor cohorts, normally 256. Each cohort has six compartments: home, outbound queue, outbound travel, work, return queue and return travel. The two directions share receiving capacity. Roads and transit supply capacity; full corridors accumulate queues. Closing a corridor prevents new admissions without deleting its people. Population is divided exactly, including remainder people.

This is an intentionally simple, independent-corridor model. Home/work residence and travel use approximate compartment outflow instead of exact individual clocks. Corridors are not yet coupled by a city-wide routing graph. Mode counters represent admitted aggregate mass, not individual vehicle objects. These simplifications are deliberate, rather than concealed behind a larger population label.

Work is proportional to the number of cohorts, not their population. Basic integer-mass and requested/arrived/outstanding accounting guards remain useful even though detailed physical realism is not a goal.

## Native measurements

Measured locally on the shared development host with pinned lkjscript 0.1.83. All traffic calculation executed inside the native runtime. Node supplied command arguments and checked returned values; Python authored ordinary declarations and optionally sampled process memory. Neither ran the game simulation.

The initial engine artifact was `a0b0d42e9005413582d546f9eb68cc421e7d474f6550203ee4665d81d55ed76c`. Its exact measurements are retained in `evidence/mesoscopic.json`; rerunning the test replaces this local report with the newly selected artifact binding.

| Population | Cohorts | Cycles | Mean native invocation / cycle | Peak process RSS | Final state JSON |
| --- | ---: | ---: | ---: | ---: | ---: |
| 100,000 | 256 | 128 | 16.26 ms | 20,452 KiB | 62,804 bytes |
| 1,000,000 | 256 | 128 | 15.37 ms | 20,068 KiB | 64,922 bytes |

These are whole-invocation time divided by cycle count, including seed and final totals work, but excluding artifact loading and result-file serialization. They are not p95 tick latency, live-session throughput, GPU time or overall game FPS. The host is shared and these figures are not a hardware-isolated benchmark. A separate repeat of the million-person workload produced identical aggregate state and 15.29 ms per cycle.

For a fixed 256-cohort workload, both population sizes allocated 752,277,397 bytes cumulatively over 128 cycles. Peak live process memory was about 20 MiB, but allocation churn remains a useful future optimization target; cumulative allocated bytes must not be confused with retained memory.

Nine native workloads covered zero population, 100,003 people split across 31 cohorts, complete closure, closure and recovery, saturated roads, capacity upgrades, 100,000 people and a deterministic million-person repeat. The harness checked 8,476 assertions, including nonnegative compartments and conservation in each individual cohort. Capacity upgrades increased actual completed visits and reduced queues.

## Native display LOD

`mesoview` projects only viewport-intersecting cohorts. Global totals remain independent of the camera. It emits eleven integers per visible cohort rather than individual resident records, and selects budgets of 256 / 640 / 1,536 representative markers for far / middle / near views.

For the same native 100,000-person snapshot:

| View | Visible cohorts | Frame JSON bytes | Marker budget |
| --- | ---: | ---: | ---: |
| Entire region | 256 | 9,245 | 256 |
| 8 by 8 districts | 64 | 2,605 | 640 |
| 4 by 4 districts | 16 | 937 | 1,536 |
| Outside occupied districts | 0 | 378 | 256 |

These are serialized native projection sizes, not measured WebSocket throughput. Viewport clamping, exact row membership, population totals and camera-independent simulation totals are tested locally.

## Browser preview and reusable renderer pieces

The preview has a world-anchored static raster, three detail levels, fixed marker budgets, viewport culling, quality hysteresis, pointer/pinch/scroll navigation, and no continuous animation while paused or hidden. Pedestrian-like representative markers retain a single-circle shape. The native snapshot and the number of displayed representatives are explicitly distinguished in the UI.

A headless Chromium test painted 180 warmed frames at each zoom. Median JavaScript paint-call durations were approximately 0.1 / 0.2 / 0.3 ms, with p95 values approximately 0.3 / 0.3 / 0.9 ms. These do not include a full GPU/compositor frame and must not be relabeled as game FPS. Panning reused the raster at all three zoom levels. Pausing stopped repeated draws, and a 390 by 844 browser viewport had no horizontal overflow; a physical mobile device was not tested.

`web/motion.js` also contains reusable `RenderBudget`, `TileIndex`, `stableVisualRank` and bounded-heap `sampleVisualActors` helpers, covered by `tests/render-lod.mjs`. The unfinished legacy renderer integration is retained as `experiments/legacy-renderer-lod.patch`, **not applied to `web/app.js`**. The attempted integration exceeded the existing per-module 65,536-byte literal budget, and subsequent repair/build operations were blocked. The original app and its recording-context tests were restored, rather than publishing a known unbuildable application. The patch is a continuation aid, not a tested release patch.

## Reproduce locally

From `projects/traffic-city`, with the pinned executable installed or `LKJSCRIPT` set to its path:

```sh
python3 scripts/journeys/mesoscopic_view.py
node scripts/author-meso.mjs
RUN_CASE_MEMORY=1 node tests/mesoscopic.mjs
node tests/meso-view.mjs
node tests/meso-render.mjs
node tests/render-lod.mjs
```

The native build writes `.build/meso-selection.json` and never changes the legacy selection, public deployment, or saved cities. The rendering test creates `evidence/meso-preview.html` from the real native `meso-view` result. The template alone deliberately shows a missing-snapshot warning.

Keep validation local and proportional to the change. No GitHub CI workflow, mandatory full-game replay gate, paid API, or Codex task is required for this experiment.
