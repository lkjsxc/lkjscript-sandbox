// Reopen a predecessor's real native store; never use a player store or key.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes, createHash} from 'node:crypto';
import {startNative, connect} from './native.mjs';

const old = process.env.OLD_CITY_SELECTION;
const latest = process.env.CITY_SELECTION || '.build/selection.json';
const originalSelection = process.env.CITY_SELECTION;
assert(old, 'Set OLD_CITY_SELECTION to the published predecessor selection.');
const selections = [old, latest].map(p => JSON.parse(fs.readFileSync(p)));
assert.notEqual(selections[0].artifact_sha256, selections[1].artifact_sha256);
assert.equal(selections[0].compiler_sha256, selections[1].compiler_sha256);
const key = randomBytes(32).toString('hex');
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
let native, client, sequence = 0, owner;
const checks = [];

async function command(op, fields = {}) {
  const id = ++sequence;
  client.socket.send(JSON.stringify({id, token: op === 'resume' ? key : '', owner: op === 'resume' ? owner : '', action: {op, x: 0, y: 0, x2: 0, y2: 0, kind: 0, ...fields}}));
  const frame = await client.wait(f => f.ack === id, 120000);
  assert.equal(frame.status, 1, op + ': ' + frame.notice);
  return frame;
}
async function start(selection, directory) {
  process.env.CITY_SELECTION = selection;
  native = await startNative({name: 'save-compatibility', tick: 100, directory});
  client = connect(native.address);
  sequence = 0; owner = randomBytes(16).toString('hex');
  await client.wait(f => f.seq === 1);
  return command('resume');
}
async function stop() {
  if (client) { await client.close(); client = null; }
  if (native) { const instance = native; native = null; await instance.stop(); }
}
// These two frame-only observations were absent in the predecessor. Exclude
// exactly those additions, and still compare every pre-existing statistic.
function state(frame) { const {planning, planningLong, ...stats} = frame.stats; return {stats, rails: frame.rails}; }
async function people(population) {
  await command('view', {x: 0, y: 0, x2: 128, y2: 128});
  const residents = [];
  for (let id = 1; id <= population; id++) {
    const frame = await command('inspect', {kind: id});
    assert.equal(frame.inspect.id, id);
    residents.push({resident: frame.inspect, wallet: frame.inspectFunds, railPlan: frame.inspectRail});
  }
  return residents;
}

try {
  await start(old);
  const review = await command('review-scenario', {kind: 3});
  await command('load-scenario', {kind: 3, x: review.confirmation});
  await command('view', {x: 0, y: 0, x2: 128, y2: 128});
  await command('set-running', {kind: 1});
  await client.wait(f => f.stats.tick >= 64 && f.stats.railBoardings > 0 && f.stats.railCompleted > 0, 240000);
  await command('set-running', {kind: 0});
  const saved = await command('save');
  assert.equal(saved.saved, saved.stats.tick);
  assert.equal(saved.stats.population, 512);
  assert.equal(saved.stats.wealthError, 0);
  const before = {state: state(saved), people: await people(512)};
  const directory = native.dir;
  await stop();

  const resumed = await start(latest, directory);
  assert.deepEqual(state(resumed), before.state);
  const restoredPeople = await people(512);
  assert.deepEqual(restoredPeople, before.people);
  const pending = restoredPeople.filter(p => p.resident.state === 1 && p.resident.reason === 8);
  assert.equal(resumed.stats.planning, pending.length);
  assert.equal(resumed.stats.planningLong, pending.filter(p => p.resident.wait >= 8).length);
  checks.push('Published predecessor store reopens with every pre-existing statistic, both three-stop trains, all 512 resident records, individual wallets and rail journey plans.');

  const resetReview = await command('review-reset');
  const fresh = await command('reset-city', {x: resetReview.confirmation});
  assert.equal(fresh.stats.population, 32);
  assert(fresh.undo);
  const restoreReview = await command('review-restore');
  const restored = await command('restore-city', {x: restoreReview.confirmation});
  assert.deepEqual(state(restored), before.state);
  assert(!restored.undo);
  for (const id of [1, 64, 128, 256, 384, 512]) {
    const f = await command('inspect', {kind: id});
    assert.deepEqual({resident: f.inspect, wallet: f.inspectFunds, railPlan: f.inspectRail}, before.people[id - 1]);
  }
  checks.push('Reviewed reset and one-use restore preserve exact stats, trains and six sampled complete resident/wallet/rail-plan records.');

  const startTick = restored.stats.tick;
  await command('set-running', {kind: 1});
  await client.wait(f => f.stats.tick >= startTick + 32, 180000);
  await command('set-running', {kind: 0});
  const continued = await command('save');
  assert.equal(continued.saved, continued.stats.tick);
  assert.equal(continued.stats.population, 512);
  assert.equal(continued.stats.wealthError, 0);
  assert(continued.stats.arrived > saved.stats.arrived);
  await stop();
  assert.deepEqual(state(await start(latest, directory)), state(continued));
  checks.push('The restored residents continue travelling, checkpoint and survive a second native process restart without reset.');
  const report = {passed: true, old_artifact_sha256: selections[0].artifact_sha256, candidate_artifact_sha256: selections[1].artifact_sha256, compiler_sha256: selections[1].compiler_sha256, checks, resident_records_compared: 512, derived_planning_counts_checked: true, resident_wallet_rail_plan_sha256: digest(before.people), saved_stats: saved.stats, continued_stats: continued.stats};
  fs.writeFileSync('evidence/save-compatibility.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await stop();
  if (originalSelection === undefined) delete process.env.CITY_SELECTION;
  else process.env.CITY_SELECTION = originalSelection;
}
