// A deterministic native workload with two returning residents and two shared
// searches per cycle. The observer creates only the explicit test fixture.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {runCase,selection} from './run-case.mjs';
const id=(x,y)=>x+128*y,tiles=[];for(let x=1;x<=18;x++)tiles.push({id:id(x,5),kind:1,q:0});
for(const [x,y,kind]of [[1,4,3],[18,4,3],[3,4,4],[16,4,4]])tiles.push({id:id(x,y),kind,q:0});
const seed=runCase({rows:0,ticks:0,tiles,commands:[],after:[]},'fixed-mode-seed').result.city;
const checks=[];let failed=null;
function fixture(mode,purpose,midroute=false){const city=structuredClone(seed),agents=city.sim.agents.slice(0,2);for(let i=0;i<2;i++){const r=agents[i][1];Object.assign(r,{id:i+1,home:id(i?18:1,4),job:id(i?16:3,4),dest:purpose===4?id(i?18:1,4):id(i?16:3,4),purpose,state:1,cell:midroute?id(i?17:2,5):id(i?16:3,4),mode,reason:8,ready:0,departed:0,route:0,step:0,wait:0,elapsed:0,duration:0});r.from=r.to=r.cell;}city.sim.agents=agents;city.sim.ids=[1,2];Object.assign(city.sim,{population:2,born:2,nextId:3,requested:2,arrived:0,cancelled:0,routes:[],lookup:[],nextRoute:1,employment:[],q:[],walkq:[],inside:[]});return city;}
for(const [label,mode,purpose,midroute]of [['return-driver',2,4,false],['return-walker',1,4,false],['midroute-driver',2,1,true],['midroute-walker',1,1,true]]){
 const city=fixture(mode,purpose,midroute),input={city,ticks:1,commands:[],after:[]};
 const result=runCase(input,'fixed-mode-'+label,'continuation').result;
 const check={name:label,states:result.agents.map(a=>a.state),modes:result.agents.map(a=>a.mode),reasons:result.agents.map(a=>a.reason),routes:result.routes.map(r=>({mode:r.value.mode,origin:r.value.origin,dest:r.value.dest})),conservation:result.conservation};
 check.passed=check.states.every(x=>x===2)&&check.modes.every(x=>x===mode)&&check.routes.length===2&&check.routes.every(r=>r.mode===mode)&&check.conservation===0;checks.push(check);
 if(!check.passed)failed='Both fixed-mode residents should begin with two total searches: '+label;
 if(process.env.EXPECT_BASELINE!=='1'){assert(check.passed,failed);const replay=runCase(input,'fixed-mode-replay-'+label,'continuation').result;assert.deepEqual(replay,result);}
}
const report={passed:!failed,expected_baseline_limitation:process.env.EXPECT_BASELINE==='1',artifact_sha256:selection.artifact_sha256,checks};fs.writeFileSync(process.env.FIXED_MODE_EVIDENCE||'evidence/fixed-mode-routing.json',JSON.stringify(report,null,2));console.log(report);if(process.env.EXPECT_BASELINE==='1')assert(failed,'The pre-change artifact must reproduce unnecessary route searches');
