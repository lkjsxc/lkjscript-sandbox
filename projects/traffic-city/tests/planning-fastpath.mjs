// Compare complete native states from two immutable artifacts. The candidate
// may skip work, never a resident's wait, a route choice, or a money transfer.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const candidatePath=process.env.CITY_SELECTION||'.build/selection.json';
const baselinePath=process.env.BASELINE_SELECTION;
assert(baselinePath,'Set BASELINE_SELECTION to the retained ungated waterfront artifact.');
process.env.CITY_SELECTION=baselinePath;
const baseline=await import('./run-case.mjs?planning-original');
process.env.CITY_SELECTION=candidatePath;
const candidate=await import('./run-case.mjs?planning-candidate');
assert.notEqual(candidate.selection.artifact_sha256,baseline.selection.artifact_sha256);
assert.equal(candidate.selection.compiler_sha256,baseline.selection.compiler_sha256);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const cases=[];
function observe(r){const match=r.observation.match(/production-observation=("(?:[^"\\]|\\.)*")/);assert(match);const o=JSON.parse(JSON.parse(match[1]));for(const key of ['live_call_frames_after','live_handles_after','live_transactions_after'])assert.equal(o[key],0,key);return{wall_ms:r.wall_ms,instructions:o.instructions,allocated_bytes:o.allocated_bytes,calls:o.calls}}
function invariant(r){const s=r.city.sim,e=r.city.economy;assert.equal(r.conservation,0);assert.equal(s.population,r.agents.length);assert.equal(s.population,s.born-s.removed);assert.equal(s.requested,s.arrived+s.cancelled+r.agents.filter(a=>[1,2,4,5,6].includes(a.state)).length);assert.equal(r.city.cash+e.households+e.businesses,e.opening+e.grants+e.exports+e.salvage-e.construction-e.operating-e.withdrawn);for(const[,l]of s.transit.lines)assert(l.passengers.length<=l.capacity)}
function pair(city,ticks,commands,name){const input={city,ticks,commands,after:[]},a=baseline.runCase(input,'planning-before-'+name,'continuation'),b=candidate.runCase(input,'planning-after-'+name,'continuation');assert.deepEqual(b.result,a.result,name);invariant(a.result);invariant(b.result);const row={name,population:city.sim.population,start_tick:city.sim.tick,ticks,commands,input_sha256:hash(input),result_sha256:hash(b.result),exact_state_equal:true,before:observe(a),after:observe(b)};cases.push(row);console.log(JSON.stringify(row));return a.result.city}
for(const [scenario,name]of [[1,'garden'],[3,'metro'],[4,'boroughs']]){
 let city=baseline.runCase(scenario,'planning-seed-'+name,'scenario-seed').result;
 assert.deepEqual(candidate.runCase(scenario,'planning-new-seed-'+name,'scenario-seed').result,city,'same seed '+name);
 const windows=scenario===4?[8,8,8]:[16,16];
 for(const [i,ticks]of windows.entries())city=pair(city,ticks,[],name+'-startup-'+i);
 if(city.sim.transit.ids.length){
  const id=city.sim.transit.ids[0];
  city=pair(city,4,[{op:'rail-service',x:id,y:0,x2:0,y2:0,kind:0}],name+'-suspend');
  city=pair(city,4,[{op:'rail-service',x:id,y:0,x2:0,y2:0,kind:1}],name+'-resume');
 }
}
// Warm snapshots are independently generated native examples, not player saves.
const maturePath=process.env.MATURE_CITY_FIXTURE;
if(maturePath){let city=JSON.parse(fs.readFileSync(maturePath));assert.equal(city.sim.population,1024);assert(city.sim.tick>=128);city=pair(city,4,[],'boroughs-cache-boundary');city=pair(city,4,[{op:'build',x:61,y:62,x2:68,y2:62,kind:1}],'boroughs-topology-edit')}
const report={passed:true,baseline_artifact_sha256:baseline.selection.artifact_sha256,candidate_artifact_sha256:candidate.selection.artifact_sha256,compiler_sha256:candidate.selection.compiler_sha256,method:'Paired serial native runs with full state equality, including every resident, cached route, train and account. Shared-host timings are not isolated hardware benchmarks.',cases};
fs.writeFileSync('evidence/planning-fastpath.json',JSON.stringify(report,null,2));console.log('PASS all paired planner states');
