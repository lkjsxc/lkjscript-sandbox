// Exact-state regression against the integrated draft. Exclude exactly the new
// derived symmetry marker, never agents, routes, counters, money or other fields.
import fs from 'node:fs';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
const candidate=process.env.CITY_SELECTION||'.build/selection.json',baseline=process.env.BASELINE_SELECTION;
assert(baseline,'Set BASELINE_SELECTION to the preceding integrated game selection.');
process.env.CITY_SELECTION=baseline;const before=await import('./run-case.mjs?ground-before');process.env.CITY_SELECTION=candidate;const after=await import('./run-case.mjs?ground-after');
assert.equal(before.selection.compiler_sha256,after.selection.compiler_sha256);assert.notEqual(before.selection.artifact_sha256,after.selection.artifact_sha256);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),checks=[];
function strip(result){const r=structuredClone(result);const world=(r.city||r).world;world.junctions=world.junctions.filter(([key])=>key!==-259);return r}
function pair(input,name,target='workload'){
 const a=before.runCase(input,'ground-before-'+name,target),b=after.runCase(input,'ground-after-'+name,target);
 assert.deepEqual(strip(b.result),strip(a.result),name+' changed a non-marker field');
 if(target!=='scenario-seed'){assert.equal(a.result.conservation,0);assert.equal(b.result.conservation,0)}
 checks.push({name,target,excluded:'world.junctions[-259] only',result_sha256:hash(strip(b.result)),baseline_full_sha256:hash(a.result),candidate_full_sha256:hash(b.result)});console.log('PASS',name);return[a.result,b.result];
}
pair({rows:-1,ticks:160,tiles:[],commands:[],after:[]},'starter-through-route-cache-expiry');
pair({rows:16,ticks:32,tiles:[],commands:[],after:[]},'grid');
for(const scenario of [1,3,4]){
 const [a,b]=pair(scenario,'scenario-'+scenario,'scenario-seed'),ticks=scenario===4?8:32;
 const beforeState=before.runCase({city:a,ticks,commands:[],after:[]},'ground-before-life-'+scenario,'continuation').result;
 const afterState=after.runCase({city:b,ticks,commands:[],after:[]},'ground-after-life-'+scenario,'continuation').result;
 assert.deepEqual(strip(afterState),strip(beforeState),'Scenario '+scenario+' life changed');assert.equal(afterState.conservation,0);checks.push({name:'scenario-life-'+scenario,excluded:'world.junctions[-259] only',result_sha256:hash(strip(afterState))});console.log('PASS scenario life',scenario);
}
fs.writeFileSync('evidence/ground-replay.json',JSON.stringify({passed:true,baseline_artifact_sha256:before.selection.artifact_sha256,candidate_artifact_sha256:after.selection.artifact_sha256,compiler_sha256:after.selection.compiler_sha256,checks},null,2));
