import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {runCase, selection} from './run-case.mjs';
import {assertMoney} from './rail-accounting.mjs';

const checks = [], originalSelection = process.env.CITY_SELECTION;
let baseline;
if (process.env.BASELINE_SELECTION) {
  process.env.CITY_SELECTION = process.env.BASELINE_SELECTION;
  baseline = await import('./run-case.mjs?repair-baseline');
  if (originalSelection === undefined) delete process.env.CITY_SELECTION;
  else process.env.CITY_SELECTION = originalSelection;
  assert.equal(baseline.selection.compiler_sha256, selection.compiler_sha256);
  assert.notEqual(baseline.selection.artifact_sha256, selection.artifact_sha256);
}
const emptyInput = {rows: 0, ticks: 0, tiles: [], commands: [], after: []};
const template = runCase(emptyInput, 'repair-fixture-template').result.city;
// The empty native template now carries the derived no-one-way certificate.
// Exclude exactly that metadata key here; full historical fixture executions
// below still require exact predecessor state equality, with nothing stripped.
const comparableTemplate = city => ({...city, world: {...city.world, junctions: city.world.junctions.filter(([key]) => key !== -259)}});
if (baseline) assert.deepEqual(comparableTemplate(baseline.runCase(emptyInput, 'repair-fixture-template-baseline').result.city), comparableTemplate(template));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function fixture(city) {
  // These historical files are hand-authored JSON simulation fixtures, not
  // encoded player saves. Preserve every old field, coordinate and resident;
  // obtain newly required empty structures from the current native schema.
  // Production save migration remains exclusively in native typed readers.
  const old = structuredClone(city);
  assert(!old.sim.transit || old.sim.transit.ids.length === 0, 'This fixture adapter only supports pre-rail traffic fixtures.');
  const prepared = {
    ...template, ...old,
    economy: old.economy ?? {...template.economy, active: false},
    sim: {...template.sim, ...old.sim, transit: {...template.sim.transit, ...old.sim.transit}},
  };
  // An inactive ledger is initialized by native money::open on the first tick,
  // using this fixture's actual residents and cash, never the template's city.
  assert.deepEqual(prepared.world, old.world);
  assert.deepEqual(prepared.sim.agents, old.sim.agents);
  assert.deepEqual(prepared.sim.ids, old.sim.ids);
  return prepared;
}

function verify(name, source, ticks) {
  const city = fixture(source), input = {city, ticks, commands: [], after: []};
  const {result: r, wall_ms} = runCase(input, name, 'continuation');
  assert.equal(r.conservation, 0);
  assertMoney(r.city);
  assert.equal(r.city.sim.population, city.sim.population);
  assert.deepEqual(r.city.sim.ids, city.sim.ids);
  const tiles = new Map(r.city.world.tiles);
  for (const [key, count] of r.lanes) {
    const kind = tiles.get(Math.floor(key / 8));
    if (kind === 1 || kind === 2) assert(count <= 3 && count >= 0);
  }
  for (const resident of r.agents) {
    assert(Math.abs(resident.from % 128 - resident.to % 128) + Math.abs(Math.floor(resident.from / 128) - Math.floor(resident.to / 128)) <= 1);
    assert(resident.elapsed <= resident.duration);
  }
  if (baseline) assert.deepEqual(r, baseline.runCase(input, name + '-baseline', 'continuation').result, name + ': exact predecessor state');
  checks.push({name, ticks, arrived: r.city.sim.arrived, moving: r.city.sim.moving, max_wait: Math.max(...r.agents.map(a => a.wait)), wall_ms, input_sha256: digest(input), result_sha256: digest(r), ...(baseline ? {exact_predecessor_state_equal: true} : {})});
  return r;
}
const ring = JSON.parse(fs.readFileSync('tests/fixtures/full-ring-v4.json'));
const junction = JSON.parse(fs.readFileSync('tests/fixtures/junction-ring-v4.json'));
const a = verify('full-lane-cycle-recovers', ring, 80);
assert(a.city.sim.arrived >= 12, 'All original journeys should complete');
const b = verify('adjacent-junctions-release-crossing', junction, 80);
assert(b.city.sim.arrived >= 4, 'All initial crossing journeys should complete');
const c = verify('old-sustained-jam-resumes', JSON.parse(fs.readFileSync('tests/fixtures/stalled-ring-v4.json')), 100);
assert(c.city.sim.arrived >= 12);
assert.deepEqual(a, verify('cycle-replay', ring, 80));
const largeIds = structuredClone(ring);
for (const [, resident] of largeIds.sim.agents) resident.id += 5000;
largeIds.sim.agents = largeIds.sim.agents.map(([key, resident]) => [key + 5000, resident]);
largeIds.sim.ids = largeIds.sim.ids.map(key => key + 5000);
largeIds.sim.nextId += 5000;
assert(verify('stable-heads-after-lifetime-turnover', largeIds, 80).city.sim.arrived >= 12);
fs.writeFileSync('evidence/repair-regression.json', JSON.stringify({passed: true, artifact_sha256: selection.artifact_sha256, ...(baseline ? {baseline_artifact_sha256: baseline.selection.artifact_sha256} : {}), checks}, null, 2));
console.log(checks);
