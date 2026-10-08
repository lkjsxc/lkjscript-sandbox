// Native read-only projection; all synthetic IDs are fixture data, not players.
import fs from 'node:fs';import assert from 'node:assert/strict';import{createHash}from'node:crypto';import{runCase,selection}from'./run-case.mjs';
const checks=[],hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const template=runCase({rows:0,ticks:0,tiles:[{id:0,kind:3,q:0},{id:1,kind:1,q:0},{id:2,kind:4,q:0}],commands:[],after:[]},'street-template').result.city;
const example=template.sim.agents[0][1],all={x:0,y:0,w:128,h:128,layer:0};
function fixture(walk,cars){const c=structuredClone(template);c.sim.ids=[];c.sim.agents=[];const tiles=new Map(c.world.tiles);
 for(let i=0;i<walk+cars;i++){const id=i+1,from=10+i%40+128*(10+Math.floor(i/40)),to=from+1;tiles.set(from,2);tiles.set(to,2);c.sim.ids.push(id);c.sim.agents.push([id,{...example,id,mode:i<cars?2:(i%2?1:3),state:2,from,to,cell:to,route:0,step:0,dir:0,prior:0,ready:i%7,duration:4,elapsed:1}]);}
 c.world.tiles=[...tiles];return c;
}
function eligible(c,v){const tiles=new Map(c.world.tiles),inside=id=>Math.floor(id/16384)===v.layer&&id%128>=v.x&&id%128<v.x+v.w&&Math.floor(id/128)%128>=v.y&&Math.floor(id/128)%128<v.y+v.h;return c.sim.agents.map(([,a])=>a).filter(a=>a.state===2&&[1,2,3].includes(a.mode)&&(a.from!==a.to||![3,4,5,6,8].includes(tiles.get(a.to)))&&(inside(a.from)||inside(a.to)))}
function check(c,view,name){const input={city:c,view},before=hash(input),r=runCase(input,'street-'+name,'street-probe').result;assert.equal(hash(input),before,'The probe cannot edit its fixture');
 const full=eligible(c,view),walk=full.filter(a=>a.mode!==2),cars=full.filter(a=>a.mode===2),W=walk.length,C=cars.length;
 assert.equal(r.walking,W);assert.equal(r.driving,C);assert.equal(r.actors.length,Math.min(128,W+C));assert.equal(new Set(r.actors.map(a=>a.id)).size,r.actors.length);
 const seenWalk=r.actors.filter(a=>a.mode!==2),seenCars=r.actors.filter(a=>a.mode===2);
 assert(seenWalk.length>=Math.min(W,64));assert(seenCars.length>=Math.min(C,64));
 for(const a of r.actors){const original=full.find(x=>x.id===a.id);assert(original);for(const key of Object.keys(a))if(!['out','rank'].includes(key))assert.equal(a[key],original[key],key);assert(a.rank>=0)}
 if(W<=64)assert.deepEqual(new Set(seenWalk.map(a=>a.id)),new Set(walk.map(a=>a.id)));
 if(C<=64)assert.deepEqual(new Set(seenCars.map(a=>a.id)),new Set(cars.map(a=>a.id)));
 if(W+C>128&&W>128)assert(seenWalk.some(a=>a.id>walk[Math.floor(W/2)].id),'Sampling must include later walkers');
 assert.deepEqual(runCase(input,'street-replay-'+name,'street-probe').result,r,'Same snapshot and view must be deterministic');
 checks.push({name,walking:W,driving:C,shownWalking:seenWalk.length,shownDriving:seenCars.length,input_sha256:before,result_sha256:hash(r)});return r;
}
for(const[w,c]of[[0,0],[1,200],[200,1],[160,160],[17,8],[512,512]])check(fixture(w,c),all,`${w}-${c}`);
const mixed=fixture(120,180);check(mixed,{x:15,y:10,w:8,h:4,layer:0},'cropped');
for(let i=0;i<7;i++){const a=mixed.sim.agents[i][1];a.state=i;}
Object.assign(mixed.sim.agents[8][1],{state:2,from:0,to:0,cell:0});
check(mixed,all,'resting-planning-platform-riders-and-facility-occupants');
const layered=fixture(80,80);for(let i=0;i<layered.sim.agents.length;i+=2){const a=layered.sim.agents[i][1];for(const k of ['from','to','cell'])a[k]+=16384;}check(layered,all,'ground-only');check(layered,{...all,layer:1},'underground-only');
// Former namespace collision: facility 0 was key 200000, equal to lane
// (underground node 25000, east, lane 0). Invisible pickup cars must not rank it.
const namespaceCity=structuredClone(template),resident=namespaceCity.sim.agents[0][1];
namespaceCity.world.tiles=[[0,3],[24999,1],[25000,1]];namespaceCity.sim.ids=[1,2,3];namespaceCity.sim.agents=[1,2,3].map(id=>[id,{...resident,id,state:2,mode:2,home:0,from:id===1?0:24999,to:id===1?0:25000,cell:id===1?0:25000,dir:0,prior:0,lane:0,route:0,step:0,ready:id===1?0:10+id,elapsed:1,duration:2}]);
const separated=runCase({city:namespaceCity,view:{...all,layer:1}},'street-layer-queue-namespace','street-probe').result;
assert.equal(separated.driving,2);assert.deepEqual(separated.actors.map(a=>[a.id,a.rank]),[[2,0],[3,1]],'Ground pickup and underground lane namespaces must be disjoint');
checks.push({name:'layer-queue-namespace',walking:0,driving:2,ranks:separated.actors.map(a=>a.rank)});
fs.writeFileSync('evidence/street-presentation.json',JSON.stringify({passed:true,artifact_sha256:selection.artifact_sha256,checks},null,2));console.log(JSON.stringify({passed:true,checks},null,2));
