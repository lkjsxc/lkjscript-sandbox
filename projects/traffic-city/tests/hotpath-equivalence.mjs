// Compare detached artifacts serially, including every resident, route and account.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const originalSelection=process.env.CITY_SELECTION;
const baselinePath=process.env.BASELINE_SELECTION;
assert(baselinePath,'Set BASELINE_SELECTION to a retained predecessor selection.');
const candidatePath=originalSelection||'.build/selection.json';
process.env.CITY_SELECTION=baselinePath;const baseline=await import('./run-case.mjs?hotpath-baseline');
process.env.CITY_SELECTION=candidatePath;const candidate=await import('./run-case.mjs?hotpath-candidate');
assert.notEqual(baseline.selection.artifact_sha256,candidate.selection.artifact_sha256,'Compare different artifacts');
assert.equal(baseline.selection.compiler_sha256,candidate.selection.compiler_sha256,'Keep the runtime fixed');
const hash=x=>createHash('sha256').update(x).digest('hex');
const names=['garden','crossing','metro'],cases=[];
function metrics(r){const match=r.observation.match(/production-observation=("(?:[^"\\]|\\.)*")/);assert(match,'Native observation absent');const o=JSON.parse(JSON.parse(match[1]));for(const key of ['live_call_frames_after','live_handles_after','live_transactions_after'])assert.equal(o[key],0,key);return {wall_ms:r.wall_ms,invocation_ms:Number(r.observation.match(/invocation-nanoseconds=(\d+)/)[1])/1e6,instructions:o.instructions,allocated_bytes:o.allocated_bytes,calls:o.calls};}
function invariant(r){const s=r.city.sim,e=r.city.economy;assert.equal(r.conservation,0);assert.equal(s.population,s.born-s.removed);assert.equal(s.population,r.agents.length);assert.equal(r.city.cash+e.households+e.businesses,e.opening+e.grants+e.exports+e.salvage-e.construction-e.operating-e.withdrawn);assert(e.wallets.every(([,v])=>v>=0));assert(e.firms.every(([,v])=>v>=0));for(const [,line]of s.transit.lines)assert(line.passengers.length<=line.capacity);}
for(let index=0;index<names.length;index++){
 const name=names[index],seed=baseline.runCase(index+1,'hotpath-baseline-seed-'+name,'scenario-seed').result;
 assert.deepEqual(candidate.runCase(index+1,'hotpath-candidate-seed-'+name,'scenario-seed').result,seed,'Seed '+name);
 let city=seed;
 for(const phase of ['startup','continued']){
  const commands=name==='crossing'&&phase==='continued'?[{op:'build',x:63,y:59,x2:67,y2:59,kind:2},{op:'build',x:63,y:42,x2:63,y2:70,kind:2},{op:'build',x:67,y:42,x2:67,y2:70,kind:2}]:[];
  const input={city,ticks:64,commands,after:[]},a=baseline.runCase(input,'hotpath-before-'+name+'-'+phase,'continuation'),b=candidate.runCase(input,'hotpath-after-'+name+'-'+phase,'continuation');
  assert.deepEqual(b.result,a.result,'Exact simulation state: '+name+' '+phase);invariant(a.result);invariant(b.result);
  const before=metrics(a),after=metrics(b);
  const row={name,phase,population:city.sim.population,start_tick:city.sim.tick,ticks:64,commands:commands.length,input_sha256:hash(JSON.stringify(input)),result_sha256:hash(JSON.stringify(b.result)),exact_state_equal:true,before,after,instruction_reduction:1-after.instructions/before.instructions,invocation_speedup:before.invocation_ms/after.invocation_ms};
  cases.push(row);console.log(JSON.stringify(row));city=a.result.city;
 }
}
const report={passed:true,baseline_artifact_sha256:baseline.selection.artifact_sha256,candidate_artifact_sha256:candidate.selection.artifact_sha256,compiler_sha256:candidate.selection.compiler_sha256,method:'Serial old/new detached native artifacts; two 64-cycle windows per authored city; full structural equality, including a topology intervention and the 128-cycle cache boundary. Shared workspace, not an isolated hardware benchmark.',cases};
fs.writeFileSync('evidence/hotpath-equivalence.json',JSON.stringify(report,null,2));
if(originalSelection===undefined)delete process.env.CITY_SELECTION;else process.env.CITY_SELECTION=originalSelection;
console.log('PASS exact old/new city, resident, route, rail, money and travel-state equality');
