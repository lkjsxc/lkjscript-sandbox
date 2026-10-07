#!/bin/bash
# Optional development step; Python emits proposals and never runs the simulation.
set -eu
cd "$(dirname "$0")/.."
python3 scripts/journeys/simulation.py
python3 scripts/journeys/terrain.py
python3 scripts/journeys/rail.py
python3 scripts/journeys/economy.py
python3 scripts/journeys/removal.py
python3 scripts/journeys/city.py
python3 scripts/journeys/waterfront.py
python3 scripts/journeys/scenarios.py
python3 scripts/journeys/migration.py
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
