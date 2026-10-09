// Adversarial native crossing states with an independent per-tick oracle.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {runCase,selection} from './run-case.mjs';
const c=40+40*128,tiles=[[c-2,3],[c-1,1],[c,1],[c+1,1],[c+2,4],[c-256,3],[c-128,1],[c+128,1],[c+256,4]].map(([id,kind])=>({id,kind,q:0}));
const template=runCase({rows:0,ticks:0,tiles,commands:[],after:[]},'junction-flow-template').result.city;
function stage({older=false,parallel=false}={}){
 const city=structuredClone(template),paths=[[c-1,c,c+1,c+2],[c-1,c,c+1,c+2],parallel?[c+1,c,c-1,c-2]:[c-128,c,c+128,c+256]];
 // The next tick is 16: the native rotating scan begins at resident 1.
 Object.assign(city.sim,{tick:15,requested:3,arrived:0,cancelled:0,lookup:[],routes:[],nextRoute:4});
 for(const [id,a]of city.sim.agents){Object.assign(a,{state:0,ready:10000,cell:a.home,from:a.home,to:a.home,route:0,zone:0,mask:0,exitKey:0,elapsed:0,duration:0,mode:0,wait:0});if(id>3)continue;const path=paths[id-1],dir=id===3?(parallel?2:1):0;Object.assign(a,{state:2,ready:id===2?1:0,departed:0,cell:path[0],from:path[0],to:path[0],route:id,step:0,dest:path.at(-1),purpose:1,mode:2,dir,prior:dir,lane:0,slot:id===2?1:0,elapsed:2,duration:2,wait:older&&id===3?8:0,eta:80});city.sim.routes.push([id,{path,cost:80,version:city.world.version,origin:path[0],dest:path.at(-1),mode:2}])}
 return city;
}
const samples=[];
for(const options of [{},{older:true},{parallel:true}]){
 let city=stage(options),previous=new Map(city.sim.agents),overlappingSameMovement=false;
 for(let tick=0;tick<28;tick++){
  const r=runCase({city,ticks:1,commands:[],after:[]},'junction-flow-step','continuation').result;
  assert.equal(r.conservation,0);assert.equal(r.city.sim.cancelled,0);assert.equal(r.city.sim.population,16);
  for(const [key,count]of r.lanes)if(new Map(r.city.world.tiles).get(Math.floor(key/8))===1)assert(count>=0&&count<=3,'Finite lane including exit reservations');
  for(const [,packed]of r.busy){const owners=Array.from({length:15},(_,i)=>i+1).filter(mask=>(Math.floor(packed/16)&2**(mask-1))!==0);assert.equal(owners.reduce((bits,mask)=>bits|mask,0),packed%16);for(let a=0;a<owners.length;a++)for(let b=a+1;b<owners.length;b++)assert.equal(owners[a]&owners[b],0,'Conflicting crossings overlapped')}
  for(const a of r.agents.filter(a=>a.id<=3)){const p=previous.get(a.id);assert(Math.abs(a.cell%128-p.cell%128)+Math.abs(Math.floor(a.cell/128)-Math.floor(p.cell/128))<=1);assert(a.elapsed<=a.duration)}
  if(tick===0){const entered=r.agents.filter(a=>a.id<=3&&a.cell===c).map(a=>a.id);assert.deepEqual(entered,options.older?[3]:options.parallel?[1,3]:[1],'Native admission respects FIFO, conflicts, aging and nonconflicting opposite directions')}
  const first=r.agents.find(a=>a.id===1),second=r.agents.find(a=>a.id===2);
  if(first.cell===c&&second.cell===c)overlappingSameMovement=true;
  city=r.city;previous=new Map(city.sim.agents);
 }
 assert(city.sim.agents.filter(([id])=>id<=3).every(([,a])=>a.journeys>0),'Every admitted demand eventually completes');
 if(!options.older)assert(overlappingSameMovement,'Same-direction platoon enters at lane headway');
 samples.push({options,arrived:city.sim.arrived,overlappingSameMovement});
}
fs.writeFileSync('evidence/junction-flow.json',JSON.stringify({passed:true,artifact_sha256:selection.artifact_sha256,samples},null,2)+'\n');console.log(samples);
