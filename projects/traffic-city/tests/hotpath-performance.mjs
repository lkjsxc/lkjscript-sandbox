// Serial whole-game measurements. The 2,048-person city exceeds the command
// decoder's item limit, so its retained native observer measures 0/16 cycles;
// their instruction and invocation differences isolate continuation plus tracing.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const latest=process.env.CITY_SELECTION||'.build/selection.json';
process.env.CITY_SELECTION=process.env.BASELINE_SELECTION||'.build/baseline.json';
const before=await import('./run-case.mjs?whole-before');
process.env.CITY_SELECTION=latest;
const after=await import('./run-case.mjs?whole-after');
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function metrics(r){const o=JSON.parse(JSON.parse(r.observation.match(/production-observation=("(?:[^"\\]|\\.)*")/)[1]));for(const k of ['live_call_frames_after','live_handles_after','live_transactions_after'])assert.equal(o[k],0);return{wall_ms:r.wall_ms,invocation_ms:Number(r.observation.match(/invocation-nanoseconds=(\d+)/)[1])/1e6,instructions:o.instructions,allocated_bytes:o.allocated_bytes}}
function validate(r){for(const f of r.frames){assert.equal(f.population,f.born-f.removed);assert.equal(f.requested,f.arrived+f.cancelled+f.active);assert.equal(f.wealth,f.expected);assert.equal(f.cancelled,0)}assert.equal(r.residents.length,2048);assert.equal(r.rails.length,8)}
const report={passed:false,compiler_sha256:after.selection.compiler_sha256,before:before.selection.artifact_sha256,after:after.selection.artifact_sha256,method:'Serial alternating arm order, three repetitions. Native 0-cycle observer includes generation and output; 16 minus 0 isolates simulation plus per-cycle observation. Shared-host wall time is not FPS. No player saves. Modeled allocation is cumulative, not RSS.',samples:[]};
assert.equal(before.selection.compiler_sha256,after.selection.compiler_sha256);
const save=()=>fs.writeFileSync('evidence/hotpath-performance.json',JSON.stringify(report,null,2)+'\n');save();
for(let repetition=0;repetition<3;repetition++)for(const arm of repetition%2?['after','before']:['before','after']){
 const runner=arm==='before'?before:after;
 for(const ticks of [0,16]){
  const r=runner.runCase(ticks,`whole-${arm}-${repetition}-${ticks}`,'commuter-probe');validate(r.result);
  const people=r.result.residents.map(row=>Object.fromEntries(r.result.columns.map((k,i)=>[k,row[i]])));
  const walking=people.filter(p=>p.state===2&&p.mode!==2&&p.from!==p.to).length,planning=people.filter(p=>p.state===1&&p.reason===8).length;
  if(ticks){assert(walking>=256);assert(planning<=1536)}
  const sample={arm,repetition,ticks,...metrics(r),walking,planning,final:r.result.frames.at(-1),result_sha256:digest(r.result)};
  report.samples.push(sample);save();console.log(JSON.stringify(sample));
 }
}
assert.equal(new Set(report.samples.filter(s=>s.ticks===0).map(s=>s.result_sha256)).size,1,'Identical generated city');
report.passed=true;save();
