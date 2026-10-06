// Development-only fixtures. Every movement/queue update executes in lkjscript.
import fs from 'node:fs';import assert from 'node:assert/strict';import {runCase} from './run-case.mjs';
const id=(x,y)=>x+y*128,blankResident=Object.fromEntries('id home job dest purpose cycle state cell from to step route mode prior dir lane slot elapsed duration wait ready departed etaWalk etaCar eta journeys lastTime reason exitKey zone mask'.split(' ').map(k=>[k,0]));
const a=[id(40,40),id(41,40),id(41,41),id(40,41)],dest=[id(41,39),id(42,41),id(40,42),id(39,40)];
const base=runCase({rows:0,ticks:0,tiles:[...a.map(id=>({id,kind:1,q:0})),...dest.map(id=>({id,kind:4,q:0}))],commands:[],after:[]},'ring-base').result.city;
base.sim.agents=[];base.sim.ids=[];base.sim.routes=[];base.sim.nextId=13;base.sim.population=12;base.sim.born=12;base.sim.requested=12;base.sim.nextRoute=5;
for(let i=0;i<4;i++){base.sim.routes.push([i+1,{path:[a[i],a[(i+1)%4],dest[i]],cost:4,version:1,origin:a[i],dest:dest[i],mode:2}]);for(let j=0;j<3;j++){const n=i*3+j+1,r={...blankResident,id:n,home:a[i],job:dest[i],dest:dest[i],purpose:1,state:2,cell:a[i],from:a[i],to:a[i],route:i+1,mode:2,dir:[3,0,1,2][i],duration:1,elapsed:1};base.sim.agents.push([n,r]);base.sim.ids.push(n)}}
for(const ticks of [40,400]){const r=runCase({city:base,ticks,commands:[],after:[]},'full-ring-'+ticks,'continuation').result;assert.equal(r.conservation,0);console.log(JSON.stringify({scenario:'fully occupied circulating lanes',ticks,arrived:r.city.sim.arrived,moved:r.agents.filter(x=>x.cell!==base.sim.agents.find(([k])=>k===x.id)[1].cell).length,longestWait:Math.max(...r.agents.map(x=>x.wait)),reasons:r.agents.map(x=>x.reason)}));fs.writeFileSync('runtime/full-ring-'+ticks+'.json',JSON.stringify(r.city));}
fs.writeFileSync('runtime/full-ring-initial.json',JSON.stringify(base));
// Adjacent intersection queues have already completed their crossing motion.
const jobs=[id(41,38),id(43,41),id(40,43),id(38,40)];
const junction=runCase({rows:0,ticks:0,tiles:[...a.map(id=>({id,kind:1,q:0})),...dest.map(id=>({id,kind:1,q:0})),...jobs.map(id=>({id,kind:4,q:0}))],commands:[],after:[]},'junction-base').result.city;
junction.sim=structuredClone(base.sim);junction.sim.agents=junction.sim.agents.filter(([k])=>(k-1)%3===0);junction.sim.ids=junction.sim.agents.map(([k])=>k);junction.sim.population=4;junction.sim.born=4;junction.sim.requested=4;
for(const [k,r] of junction.sim.agents){const i=a.indexOf(r.cell);r.zone=r.cell+1;r.mask=15;r.exitKey=(a[(i+1)%4]*8+i*2)+1;r.dest=jobs[i];r.job=jobs[i];junction.sim.routes[i][1].path.push(jobs[i]);junction.sim.routes[i][1].dest=jobs[i]}
for(const ticks of [40,400]){const r=runCase({city:junction,ticks,commands:[],after:[]},'junction-ring-'+ticks,'continuation').result;assert.equal(r.conservation,0);console.log(JSON.stringify({scenario:'adjacent occupied junction cycle',ticks,arrived:r.city.sim.arrived,longestWait:Math.max(...r.agents.map(x=>x.wait)),reasons:r.agents.map(x=>x.reason)}));}
fs.writeFileSync('runtime/junction-ring-initial.json',JSON.stringify(junction));
