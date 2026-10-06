// Serial old/new real sessions, fresh synthetic cities, native saving and frames.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes, createHash} from 'node:crypto';
import {startNative, connect, memory} from './native.mjs';

const baseline = process.env.BASELINE_SELECTION;
const candidate = process.env.CITY_SELECTION || '.build/selection.json';
const cycles = Number(process.env.THROUGHPUT_CYCLES || 64);
assert(baseline, 'Set BASELINE_SELECTION to a retained predecessor selection.');
assert(Number.isInteger(cycles) && cycles >= 16 && cycles <= 256);
const selections = [baseline, candidate].map(p => JSON.parse(fs.readFileSync(p)));
assert.notEqual(selections[0].artifact_sha256, selections[1].artifact_sha256);
assert.equal(selections[0].compiler_sha256, selections[1].compiler_sha256);
const originalSelection = process.env.CITY_SELECTION;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const results = [];

function gameplay(frame) {
  // Scheduling can insert a paused heartbeat before the first command. Sequence
  // numbers are therefore not gameplay. Everything drawn and every statistic is.
  const {seq, ack, notice, confirmation, bytes, at, ...value} = frame;
  return value;
}

async function measure(selection, scenario, label) {
  process.env.CITY_SELECTION = selection;
  const native = await startNative({name: 'throughput-' + scenario + '-' + label});
  const client = connect(native.address);
  const commands = [];
  let id = 0;
  try {
    await client.wait(f => f.seq === 1);
    async function send(op, fields = {}, identity = {}) {
      const number = ++id, start = performance.now();
      client.socket.send(JSON.stringify({id: number, action: {op, x: 0, y: 0, x2: 0, y2: 0, kind: 0, ...fields}, token: '', owner: '', ...identity}));
      const frame = await client.wait(f => f.ack === number, 120000);
      assert.equal(frame.status, 1, op + ': ' + frame.notice);
      commands.push({op, milliseconds: performance.now() - start});
      return frame;
    }
    await send('resume', {}, {token: randomBytes(32).toString('hex'), owner: randomBytes(16).toString('hex')});
    const review = await send('review-scenario', {kind: scenario});
    assert(review.confirmation > 0);
    const loaded = await send('load-scenario', {x: review.confirmation, kind: scenario});
    assert.equal(loaded.stats.population, [0, 384, 256, 512][scenario]);
    assert.equal(loaded.stats.tick, 0);
    assert(loaded.stats.paused);
    await send('view', {x: 48, y: 48, x2: 32, y2: 32});
    await send('set-running', {kind: 1});
    await client.wait(f => f.stats.tick >= cycles, 360000);
    await send('set-running', {kind: 0});
    const frames = [];
    for (let tick = 1; tick <= cycles; tick++) {
      const frame = client.frames.find(f => f.stats.tick === tick && !f.stats.paused);
      assert(frame, 'No delivered cycle ' + tick);
      assert.equal(frame.stats.wealthError, 0);
      assert(frame.actors.length <= 128);
      assert(frame.cells.length <= 1024);
      assert(frame.rails.every(line => line.occupancy <= line.capacity));
      frames.push(frame);
    }
    const gaps = frames.slice(1).map((f, i) => f.at - frames[i].at);
    const sorted = [...gaps].sort((a, b) => a - b);
    const last = frames.at(-1);
    const checkpoint = await send('save');
    assert.equal(checkpoint.saved, checkpoint.stats.tick);
    const report = {
      artifact_sha256: native.selection.artifact_sha256,
      cycles, population: loaded.stats.population, viewport: [48, 48, 32, 32],
      cycle_intervals: gaps.length,
      cycles_per_second: gaps.length / ((last.at - frames[0].at) / 1000),
      median_interval_ms: sorted[Math.ceil(sorted.length * .5) - 1],
      p95_interval_ms: sorted[Math.ceil(sorted.length * .95) - 1],
      maximum_interval_ms: sorted.at(-1),
      payload_bytes: frames.reduce((n, f) => n + f.bytes, 0),
      maximum_payload_bytes: Math.max(...frames.map(f => f.bytes)),
      ...memory(native.child.pid),
      manual_save_ms: commands.at(-1).milliseconds,
      frame_hashes: frames.map(f => hash(gameplay(f))),
      final_stats: last.stats,
    };
    return report;
  } finally {
    await client.close();
    await native.stop();
  }
}

try {
  for (const scenario of [1, 2, 3]) {
    const before = await measure(baseline, scenario, 'before');
    const after = await measure(candidate, scenario, 'after');
    assert.deepEqual(after.frame_hashes, before.frame_hashes, 'Every native gameplay frame must match for scenario ' + scenario);
    const entry = {scenario, exact_gameplay_frames_equal: true, before, after};
    results.push(entry);
    console.log(JSON.stringify({scenario, exact_gameplay_frames_equal: true, before_cycles_per_second: before.cycles_per_second, after_cycles_per_second: after.cycles_per_second, before_p95_ms: before.p95_interval_ms, after_p95_ms: after.p95_interval_ms}));
    fs.writeFileSync('evidence/throughput-live.json', JSON.stringify({passed: results.length === 3, method: 'Serial predecessor/candidate sessions on a shared host; 500 ms requested native timer, 1024-cell detail view, per-browser native save path and autosave enabled. Exact per-cycle gameplay frames, excluding scheduling/command metadata. Not rendering FPS or an isolated hardware benchmark.', results}, null, 2) + '\n');
  }
  console.log('PASS all three cities: exact native gameplay frames, autosave, capacity and explicit checkpoints');
} finally {
  if (originalSelection === undefined) delete process.env.CITY_SELECTION;
  else process.env.CITY_SELECTION = originalSelection;
}
