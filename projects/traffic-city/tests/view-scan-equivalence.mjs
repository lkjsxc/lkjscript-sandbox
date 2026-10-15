// Differential native projection checks. Fixtures are synthetic, never player saves.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const candidate=process.env.CITY_SELECTION||'.build/selection.json';
process.env.CITY_SELECTION=process.env.BASELINE_SELECTION||'.build/baseline.json';
const before=await import('./run-case.mjs?view-scan-before');
process.env.CITY_SELECTION=candidate;
const after=await import('./run-case.mjs?view-scan-after');
assert.equal(before.selection.compiler_sha256,after.selection.compiler_sha256);
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function metrics(r){
 const match=r.observation.match(/production-observation=("(?:[^"\\]|\\.)*")/);assert(match,r.observation);
 const o=JSON.parse(JSON.parse(match[1]));
 for(const key of ['live_call_frames_after','live_handles_after','live_transactions_after'])assert.equal(o[key],0,key);
 return {invocation_ms:Number(r.observation.match(/invocation-nanoseconds=(\d+)/)[1])/1e6,instructions:o.instructions,allocated_bytes:o.allocated_bytes};
}
const template=before.runCase({rows:0,ticks:0,tiles:[{id:0,kind:3,q:0},{id:1,kind:1,q:0},{id:2,kind:4,q:0}],commands:[],after:[]},'view-scan-template').result.city;
const resident=template.sim.agents[0][1],all={x:0,y:0,w:128,h:128,layer:0};
function fixture(count){
 const city=structuredClone(template),tiles=new Map(city.world.tiles);city.sim.ids=[];city.sim.agents=[];
 for(let i=0;i<count;i++){
  const id=i+1,from=10+i%40+128*(10+Math.floor(i/40)),to=from+1;tiles.set(from,1);tiles.set(to,1);
  city.sim.ids.push(id);city.sim.agents.push([id,{...resident,id,state:2,mode:i%3===0?2:i%3===1?1:3,cell:to,from,to,route:0,step:0,dir:0,prior:0,lane:0,ready:i%5,duration:4,elapsed:1}]);
 }
 city.world.tiles=[...tiles];return city;
}
const cases=[];
for(const count of [0,1,17,128,512,1024])cases.push({name:'mixed-'+count,city:fixture(count),view:all});
const queues=fixture(256);
for(const [,r]of queues.sim.agents)Object.assign(r,{mode:2,from:129,to:130,cell:130,ready:r.id%11});
queues.world.tiles.push([129,1],[130,1]);cases.push({name:'shared-fifo-queues',city:queues,view:all});
const missing=fixture(80);missing.sim.ids.splice(4,0,-1,99999);missing.sim.ids.reverse();
cases.push({name:'missing-ids-and-reversed-order',city:missing,view:all});
const layered=fixture(256);
for(let i=0;i<layered.sim.agents.length;i++){
 const r=layered.sim.agents[i][1];if(i%2===0)for(const k of ['from','to','cell'])r[k]+=16384;
 if(i<7)r.state=i;
}
for(const view of [all,{...all,layer:1},{x:15,y:10,w:8,h:4,layer:0},{x:110,y:110,w:4,h:4,layer:0}])cases.push({name:'layer-'+view.layer+'-x-'+view.x,city:layered,view});
const report={passed:false,compiler_sha256:after.selection.compiler_sha256,before:before.selection.artifact_sha256,after:after.selection.artifact_sha256,method:'Serial native street-probe calls on identical synthetic City and View values. Exact complete StreetSample comparison includes identities, order, all actor fields, queue ranks, and full-viewport counts. Instruction/allocation counters are deterministic modeled costs, not RSS or total-game speed.',checks:[]};
for(const {name,city,view}of cases){
 const input={city,view},a=before.runCase(input,'view-scan-before-'+name,'street-probe'),b=after.runCase(input,'view-scan-after-'+name,'street-probe');
 assert.deepEqual(b.result,a.result,name);
 const row={name,population:city.sim.ids.length,result_sha256:digest(a.result),shown:a.result.actors.length,before:metrics(a),after:metrics(b)};
 if(name==='mixed-1024')assert(row.after.instructions<row.before.instructions,'The large projection must perform less native work');
 report.checks.push(row);console.log(row);
}
report.passed=true;fs.writeFileSync('evidence/view-scan-equivalence.json',JSON.stringify(report,null,2)+'\n');
