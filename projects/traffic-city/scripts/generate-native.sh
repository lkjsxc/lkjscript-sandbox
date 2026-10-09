#!/bin/bash
# Optional development step; Python emits proposals and never runs the simulation.
set -eu
cd "$(dirname "$0")/.."
python3 scripts/journeys/roads.py
python3 scripts/journeys/roadcache.py
python3 scripts/journeys/roadbuild.py
python3 scripts/journeys/planning_gate.py
python3 scripts/journeys/returnplan.py
python3 scripts/journeys/simulation.py
python3 scripts/journeys/employment.py
python3 scripts/journeys/money_probe.py
python3 scripts/journeys/scale_tests.py
python3 scripts/journeys/terrain.py
python3 scripts/journeys/rail.py
python3 scripts/journeys/economy.py
python3 scripts/journeys/economy_changes.py
python3 scripts/journeys/removal.py
python3 scripts/journeys/city.py
python3 scripts/journeys/waterfront.py
python3 scripts/journeys/region.py
python3 scripts/journeys/commuter.py
python3 scripts/journeys/region_probe.py
python3 scripts/journeys/commuter_rail_probe.py
python3 scripts/journeys/scenarios.py
python3 scripts/journeys/migration.py
python3 scripts/journeys/actorpool.py
python3 scripts/journeys/actorview.py
python3 scripts/journeys/lab_atlas.py
python3 scripts/journeys/lab_atlas_tests.py
python3 scripts/journeys/lab_atlas_probe.py
python3 scripts/journeys/lab.py
python3 scripts/journeys/lab_tests.py
python3 scripts/journeys/views.py
python3 scripts/journeys/session.py
python3 scripts/journeys/tests.py
python3 scripts/journeys/benchmark.py
python3 scripts/journeys/planning_proof.py
python3 scripts/journeys/planning_checks.py
python3 scripts/journeys/street_tests.py
python3 scripts/journeys/walk_trace.py

python3 scripts/journeys/roadintegration.py
