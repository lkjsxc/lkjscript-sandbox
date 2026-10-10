// Compare both native planners in one artifact and one prepared topology.
// These are route-kernel costs, not game ticks, browser FPS, or population scale.
import fs from 'node:fs';
import assert from 'node:assert/strict';
process.env.CITY_SELECTION ||= '.build/routing-relaxed-probes.json';
const {runCase, selection} = await import('./run-case.mjs');
const workloads = [];
for (const size of [32, 80]) {
  const tiles = [];
  for (let y=0; y<size; y++) for (let x=0; x<size; x++) tiles.push([x+y*128, x%8===0||y%8===0 ? 2 : 1]);
  const q = tiles.filter(([id])=>id%7===0).map(([id])=>[id, 7]);
  const queries = [[0,size*128-128+size-1], [size-1,(size-1)*128], [128+1,(size-2)*128+size-2], [(size-2)*128+1,128+size-2]].map(([origin,dest])=>({origin,dest,mode:2}));
  workloads.push({name:'grid-'+size, tiles, q, queries});
}
workloads.push({name:'straight-128', tiles:Array.from({length:128},(_,x)=>[x,x===0?3:x===127?4:1]), q:[], queries:[{origin:0,dest:127,mode:2},{origin:127,dest:0,mode:2}]});
const observation = text => {
  const encoded = text.match(/production-observation=("(?:[^"\\]|\\.)*")/)?.[1];
  assert(encoded, 'Native instruction observation missing');
  return JSON.parse(JSON.parse(encoded));
};
const results = [];
for (const workload of workloads) {
  const prepared = runCase(workload.tiles, 'relaxed-prepare-'+workload.name, 'route-world');
  const input = {world:prepared.result, q:workload.q, queries:workload.queries};
  const samples = [];
  for (let repeat=0;repeat<3;repeat++) for (const policy of repeat%2 ? ['topology-first','weighted'] : ['weighted','topology-first']) {
    const measured = runCase(input, `relaxed-${workload.name}-${repeat}-${policy}`, policy==='weighted'?'route-warm':'commute-route-warm');
    for (let i=0;i<measured.result.length;i++) {
      const route=measured.result[i],query=workload.queries[i];
      assert.equal(route.path[0], query.origin);assert.equal(route.path.at(-1), query.dest);
      assert(route.cost>=0);
    }
    const observed = observation(measured.observation);
    samples.push({policy, repeat, wall_ms:measured.wall_ms, instructions:observed.instructions, allocated_bytes:observed.allocated_bytes, hops:measured.result.map(r=>r.path.length-1), estimated_costs:measured.result.map(r=>r.cost)});
  }
  const median = values => [...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
  const summarize = policy => ({wall_ms:median(samples.filter(s=>s.policy===policy).map(s=>s.wall_ms)), instructions:median(samples.filter(s=>s.policy===policy).map(s=>s.instructions))});
  const before=summarize('weighted'),after=summarize('topology-first');
  const result={name:workload.name, tiles:workload.tiles.length, queries:workload.queries.length, preparation_ms:prepared.wall_ms, before, after, instruction_ratio:after.instructions/before.instructions, samples};results.push(result);
  console.log(JSON.stringify({name:result.name,before,after,instruction_ratio:result.instruction_ratio}));
  fs.writeFileSync('evidence/relaxed-route-performance.json',JSON.stringify({passed:results.length===workloads.length, scope:'Native route kernel only. Three serial repetitions, alternating order, shared host, same native artifact and prepared topology. Not frame rate or whole-game speedup.',artifact_sha256:selection.artifact_sha256,compiler_sha256:selection.compiler_sha256,results},null,2)+'\n');
}
assert(results.find(r=>r.name==='grid-80').instruction_ratio<0.4, 'Dense driving kernel must show a substantial reduction.');
console.log('PASS source-bound route-kernel comparison');
