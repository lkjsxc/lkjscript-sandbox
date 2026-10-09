// A population counter is insufficient: the native city must put real people
// on actual street hops soon after play starts. No host-side simulation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {runCase, selection} from './run-case.mjs';

const ticks = 16;
const edited = process.env.COMMUTER_EDIT === '1';
const name = edited ? 'commuter-edit-residents' : 'commuter-residents';
const measured = runCase(ticks, name, edited ? 'commuter-edit-probe' : 'commuter-probe');
const result = measured.result;
const residents = result.residents.map(row => {
  assert.equal(row.length, result.columns.length);
  return Object.fromEntries(result.columns.map((key, i) => [key, row[i]]));
});
const tiles = new Map(result.tiles);
const walking = residents.filter(r => r.state === 2 && r.mode !== 2 && r.from !== r.to);
const planning = residents.filter(r => r.state === 1 && r.reason === 8);
const final = result.frames.at(-1);
const report = {
  passed: false,
  artifact_sha256: selection.artifact_sha256,
  ticks,
  wall_ms: measured.wall_ms,
  population: residents.length,
  edited,
  walking_on_actual_hops: walking.length,
  planning: planning.length,
  final,
};
fs.writeFileSync('evidence/' + name + '.json', JSON.stringify(report, null, 2) + '\n');
console.log(report);
assert.equal(residents.length, 2048);
assert.equal(new Set(residents.map(r => r.id)).size, 2048);
assert.equal(result.rails.length, 8);
for (const r of residents) {
  assert.equal(tiles.get(r.job), 4);
  assert.equal(Math.floor(Math.floor(r.home / 128) / 28), Math.floor(Math.floor(r.job / 128) / 28), 'Every job must be on the same no-transfer rail corridor as its home');
}
if (edited) assert.equal(tiles.get(10 + 10 * 128), 1, 'The infrastructure edit must actually apply');
assert.equal(final.disconnected, 0);
for (const r of walking) {
  assert(tiles.has(r.from) && tiles.has(r.to));
  assert.equal(Math.abs(r.from % 128 - r.to % 128) + Math.abs(Math.floor(r.from / 128) - Math.floor(r.to / 128)), 1);
  assert(r.duration > 0 && r.elapsed <= r.duration);
}
for (const frame of result.frames) {
  assert.equal(frame.population, frame.born - frame.removed);
  assert.equal(frame.requested, frame.arrived + frame.cancelled + frame.active);
  assert.equal(frame.wealth, frame.expected);
  assert.equal(frame.cancelled, 0);
}
assert(walking.length >= 256, 'At least an eighth of the population must be on real outdoor walking hops by cycle 16');
assert(planning.length <= 1536, 'Route calculation must not trap almost the whole city indoors');
report.passed = true;
fs.writeFileSync('evidence/' + name + '.json', JSON.stringify(report, null, 2) + '\n');
console.log('PASS actual Commuter Boroughs pedestrians, bounded startup and conservation');
