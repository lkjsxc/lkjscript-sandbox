// Infrastructure edits must not silently move jobs. Fixture adjustments only
// author a starting assignment; all construction runs in native lkjscript.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {runCase, selection} from './run-case.mjs';

const id = (x, y) => x + y * 128;
const tiles = [];
for (let x = 1; x <= 18; x++) tiles.push({id: id(x, 5), kind: 1, q: 0});
for (const [x, y, kind] of [[1, 4, 3], [18, 4, 3], [3, 4, 4], [16, 4, 4]]) tiles.push({id: id(x, y), kind, q: 0});
const seed = runCase({rows: 0, ticks: 0, tiles, commands: [], after: []}, 'employment-preservation-seed').result.city;
const city = structuredClone(seed);
for (const [, r] of city.sim.agents) r.job = r.home === id(1, 4) ? id(16, 4) : id(3, 4);
city.sim.employment = [[id(3, 4), 8], [id(16, 4), 8]];
const command = (op, x, y, kind, x2 = x, y2 = y) => ({op, x, y, x2, y2, kind});
const edit = (base, action, name) => runCase({city: base, command: action}, name, 'construction-probe').result;
const checkCounts = c => {
  const counts = new Map();
  for (const [, r] of c.sim.agents) if (r.job >= 0) counts.set(r.job, (counts.get(r.job) || 0) + 1);
  assert.deepEqual([...new Map(c.sim.employment)].sort((a, b) => a[0] - b[0]), [...counts].sort((a, b) => a[0] - b[0]));
  assert([...counts.values()].every(n => n <= 16));
};
const road = edit(city, command('build', 9, 5, 2), 'employment-preservation-road').city;
assert.equal(new Map(road.world.tiles).get(id(9, 5)), 2);
assert.deepEqual(road.sim.agents, city.sim.agents, 'A road upgrade cannot change any resident or job');
assert(road.world.version > city.world.version, 'Routes still receive a new topology version');
assert.deepEqual(road.sim.lookup, [], 'Old route lookups remain invalidated');
checkCounts(road);

// Actual workplace changes retain the established reassignment behavior.
const added = edit(city, command('build', 2, 4, 4), 'employment-preservation-new-workplace').city;
assert.equal(new Map(added.world.tiles).get(id(2, 4)), 4);
assert(added.sim.agents.some(([, r]) => r.job === id(2, 4)), 'A new nearby workplace must remain usable');
assert.notDeepEqual(added.sim.agents.map(([, r]) => r.job), city.sim.agents.map(([, r]) => r.job));
checkCounts(added);
const report = {passed: true, artifact_sha256: selection.artifact_sha256, checks: ['Road-only edits preserve complete resident records and invalidate routes.', 'Adding workplaces still reassigns jobs and respects sixteen-worker capacity.']};
fs.writeFileSync('evidence/employment-preservation.json', JSON.stringify(report, null, 2) + '\n');
console.log(report);
