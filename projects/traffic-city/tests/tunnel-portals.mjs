// Adversarial native movement states test reservation conflicts at both depths.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {runCase,selection} from './run-case.mjs';
const g=10+20*128,U=16384,checks=[],samples=[];
const tiles=[[g-2,3],[g-1,1],[g,13],[U+g,1],[U+g+1,1],[U+g+2,1],[g+2,13],[g+3,4]].map(([id,kind])=>({id,kind,q:0}));
const seed=runCase({rows:0,ticks:1,tiles,commands:[],after:[]},'portal-base').result.city;
function stage(reverseOrder=false){
 const c=structuredClone(seed),paths=[[g-1,g,U+g,U+g+1,U+g+2,g+2,g+3],[U+g+1,U+g,g,g-1,g-2]];
 Object.assign(c.sim,{tick:16,requested:2,arrived:0,cancelled:0,lookup:[],routes:[],nextRoute:3});
 for(const [id,a]of c.sim.agents){Object.assign(a,{state:0,ready:10000,cell:a.home,from:a.home,to:a.home,route:0,zone:0,mask:0,exitKey:0,elapsed:0,duration:0,mode:0,wait:0});if(id>2)continue;const which=reverseOrder?2-id:id-1,path=paths[which],dir=which===0?0:2;Object.assign(a,{state:2,ready:0,departed:0,cell:path[0],from:path[0],to:path[0],route:id,step:0,dest:path.at(-1),purpose:which===0?1:4,mode:2,dir,prior:dir,lane:0,slot:0,elapsed:2,duration:2,wait:4,eta:80});c.sim.routes.push([id,{path,cost:80,version:c.world.version,origin:path[0],dest:path.at(-1),mode:2}])}
 return c;
}
for(const reverse of [false,true]){
 let city=stage(reverse),r=runCase({city,ticks:1,commands:[],after:[]},'portal-conflict-'+reverse,'continuation').result;
 const entrants=r.agents.filter(a=>a.id<=2&&[g,U+g].includes(a.cell));assert.equal(entrants.length,1,'Both layers admitted a conflicting portal movement in one cycle');assert(r.agents.some(a=>a.id<=2&&a.reason===5));assert.equal(new Map(r.busy).get(g),15);assert(!new Map(r.busy).has(U+g));
 for(let i=0;i<48;i++){
  assert.equal(r.conservation,0);for(const [,count]of r.lanes)assert(count>=0&&count<=3);for(const [,mask]of r.busy)assert(mask>=0&&mask<=15,'Conflicting masks overlapped');
  for(const a of r.agents.filter(a=>a.id<=2&&a.from!==a.to&&a.from%U===a.to%U)){assert.equal(a.dir,a.prior,'Vertical movement rotated a driver arbitrarily');assert([g,g+2].includes(a.from%U));assert.equal(new Map(r.city.world.tiles).get(a.from%U),13);}
  samples.push({reverse,tick:r.city.sim.tick,people:r.agents.filter(a=>a.id<=2).map(a=>({id:a.id,cell:a.cell,from:a.from,dir:a.dir,zone:a.zone,reason:a.reason,journeys:a.journeys}))});city=r.city;r=runCase({city,ticks:1,commands:[],after:[]},'portal-step-'+reverse+'-'+i,'continuation').result;
 }
 assert(r.agents.filter(a=>a.id<=2).every(a=>a.journeys>0),'Portal reservation deadlocked one of the opposing drivers');checks.push(`Opposing surface/underground arrivals (${reverse?'reversed':'ordinary'} resident priority) serialize at one conflict domain and both complete`);
}
// A previously cached path must not bypass a changed one-way edge.
let invalid=stage();const m=new Map(invalid.world.tiles);m.set(g-1,11);invalid.world.tiles=[...m];invalid.sim.agents=invalid.sim.agents.map(([id,a])=>[id,id===2?{...a,state:0,ready:10000,cell:a.home,from:a.home,to:a.home,route:0,mode:0}:a]);invalid.sim.requested=1;
const rejected=runCase({city:invalid,ticks:1,commands:[],after:[]},'portal-stale-oneway','continuation').result;
const first=rejected.agents.find(a=>a.id===1);assert.equal(first.cell,g-1);assert.equal(first.state,1);assert.equal(first.route,0);assert.equal(rejected.conservation,0);checks.push('Actual movement rechecks the live one-way edge even when handed a stale cached path');
const report={passed:true,artifact_sha256:selection.artifact_sha256,checks,samples};fs.writeFileSync('evidence/tunnel-portals.json',JSON.stringify(report,null,2));console.log({passed:true,checks});
