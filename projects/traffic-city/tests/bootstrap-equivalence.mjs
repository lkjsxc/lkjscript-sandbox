// Exact paired execution through retained native artifacts. This is a bootstrap
// and edit regression, not a claim of hardware-isolated performance improvement.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const candidatePath=process.env.CITY_SELECTION||'.build/selection.json',baselinePath=process.env.BASELINE_SELECTION;
assert(baselinePath,'Set BASELINE_SELECTION to a retained format-7 predecessor.');
process.env.CITY_SELECTION=baselinePath;const baseline=await import('./run-case.mjs?bootstrap-before');
process.env.CITY_SELECTION=candidatePath;const candidate=await import('./run-case.mjs?bootstrap-after');
assert.equal(baseline.selection.compiler_sha256,candidate.selection.compiler_sha256);assert.notEqual(baseline.selection.artifact_sha256,candidate.selection.artifact_sha256);
const canonical=value=>JSON.stringify(value,(key,v)=>key==='landscape'?undefined:v),hash=value=>createHash('sha256').update(canonical(value)).digest('hex'),cases=[];
function metrics(r){const m=r.observation.match(/production-observation=("(?:[^"\\]|\\.)*")/),o=m?JSON.parse(JSON.parse(m[1])):{};return{wall_ms:r.wall_ms,instructions:o.instructions,allocated_bytes:o.allocated_bytes,calls:o.calls}}
function equal(a,b,name){assert.equal(canonical(b.result),canonical(a.result),name);cases.push({name,exact_state_equal:true,state_sha256:hash(b.result),before:metrics(a),after:metrics(b)})}
const id=(x,y)=>x+128*y;
for(const homes of [4,16,32]){
 const tiles=[];for(let x=30;x<94;x++)tiles.push({id:id(x,20),kind:1,q:0});
 for(let i=0;i<homes;i++)tiles.push({id:id(30+i,19),kind:3,q:0});
 for(let x=30;x<30+Math.ceil(homes/2);x++)tiles.push({id:id(x,21),kind:4,q:0});
 tiles.push({id:id(93,19),kind:5,q:0},{id:id(93,21),kind:6,q:0});
 const input={rows:0,ticks:0,tiles,commands:[],after:[]},before=baseline.runCase(input,'bootstrap-before-'+homes),after=candidate.runCase(input,'bootstrap-after-'+homes);equal(before,after,'fresh '+homes*8+' resident city');
 const city=before.result.city,commands=[{op:'build',x:30+homes,y:19,x2:30+homes,y2:19,kind:3}];
 const a=baseline.runCase({city,ticks:0,commands,after:[]},'bootstrap-before-grow-'+homes,'continuation'),b=candidate.runCase({city:{...city,landscape:0},ticks:0,commands,after:[]},'bootstrap-after-grow-'+homes,'continuation');equal(a,b,'existing households plus eight new residents '+homes*8);
 for(const c of [a,b]){assert.equal(c.result.conservation,0);assert.equal(c.result.city.sim.population,(homes+1)*8)}
}
for(let n=1;n<=3;n++){const a=baseline.runCase(n,'bootstrap-before-scenario-'+n,'scenario-seed'),b=candidate.runCase(n,'bootstrap-after-scenario-'+n,'scenario-seed');equal(a,b,'classic native scenario '+n);assert.equal(b.result.landscape,0)}
const report={passed:true,baseline_artifact_sha256:baseline.selection.artifact_sha256,candidate_artifact_sha256:candidate.selection.artifact_sha256,compiler_sha256:candidate.selection.compiler_sha256,only_excluded_field:'New explicit landscape=0 identity, absent from predecessor schema.',cases};fs.writeFileSync('evidence/bootstrap-equivalence.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
