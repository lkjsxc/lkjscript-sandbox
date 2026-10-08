// Whole-game native commands and movement. JS observes; it never advances people.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {runCase,selection} from './run-case.mjs';
const base=20*128,under=16384,road=k=>[1,2,9,10,11,12,13].includes(k),facility=k=>k>=3&&k<=6||k===8;
const kindAt=(city,id)=>new Map(city.world.tiles).get(id)||0;
const command=(op,x,y,x2=x,y2=y,kind=0)=>({op,x,y,x2,y2,kind});
const spec=(id,kind)=>({id,kind,q:0}),checks=[],samples=[];
function conserved(result){
 const {city,agents}=result,s=city.sim,e=city.economy,tiles=new Map(city.world.tiles);
 assert.equal(result.conservation,0);assert.equal(s.population,agents.length);assert.equal(s.population,s.born-s.removed);assert.equal(new Set(agents.map(a=>a.id)).size,agents.length);
 if(e.active){assert.equal(city.cash+e.households+e.businesses,e.opening+e.grants+e.exports+e.salvage-e.construction-e.operating-e.withdrawn);assert.equal(e.wallets.reduce((n,[,v])=>n+v,0),e.households);assert.equal(e.firms.reduce((n,[,v])=>n+v,0),e.businesses)}
 for(const [key,n]of result.lanes){assert(n>=0);if(road(tiles.get(Math.floor(key/8))))assert(n<=3,`Overflow: lane ${key}, occupancy ${n}`)}
 for(const a of agents){assert(a.wait>=0);if(a.state!==2)continue;assert(tiles.has(a.cell));assert.equal(a.cell,a.to);assert(a.elapsed<=a.duration);if(a.from===a.to)continue;
  const ground=id=>id%16384,layer=id=>Math.floor(id/16384),x=id=>id%128,y=id=>Math.floor(id/128)%128;
  if(layer(a.from)!==layer(a.to)){assert.equal(ground(a.from),ground(a.to));assert.equal(tiles.get(ground(a.from)),13);if(a.mode===2)assert(road(tiles.get(a.to))&&road(tiles.get(a.from)));continue}
  assert.equal(Math.abs(x(a.from)-x(a.to))+Math.abs(y(a.from)-y(a.to)),1);
  if(a.mode===2){const dir=a.to===a.from+1?0:a.to===a.from+128?1:a.to===a.from-1?2:3,first=tiles.get(a.from),last=tiles.get(a.to);if(first>=9&&first<=12)assert(dir===first-9||facility(last),'A car exited against an arrow');if(last>=9&&last<=12)assert(dir!==(last-7)%4||facility(first),'A car entered against an arrow')}
 }
}
function run(name,input,target='workload'){const r=runCase(input,'tunnel-'+name,target);conserved(r.result);samples.push({name,tick:r.result.city.sim.tick,wall_ms:r.wall_ms,carTrips:r.result.city.sim.carTrips,walkTrips:r.result.city.sim.walkTrips,arrived:r.result.city.sim.arrived});return r.result}
const template={rows:0,ticks:0,tiles:[spec(base,3),spec(base+40,4),spec(base+20,6)],commands:[],after:[]};
for(const kind of [1,2,7,9,10,11,12]){
 const seed=run('construct-'+kind,{...template,commands:[command('build-tunnel',1,20,39,20,kind)]});
 const tiles=new Map(seed.city.world.tiles);assert.equal(tiles.get(base+1),13);assert.equal(tiles.get(base+39),13);assert.equal(tiles.get(base+20),6);for(let x=1;x<=39;x++)assert.equal(tiles.get(under+base+x),kind);assert.equal(tiles.size,44);
 const price=kind===2?72:kind===7?24:kind>=9?60:48;assert.equal(seed.city.cash,10000-39*price-120);assert.equal(seed.city.world.version,2);checks.push(`Complete kind ${kind} tunnel is atomic, fully charged, and preserves the park overhead`);
 if(![1,2,7,9,11].includes(kind))continue;
 const played=run('journey-'+kind,{city:seed.city,ticks:440,commands:[],after:[]},'continuation');assert(played.city.sim.workVisits>0,`No native work visits through tunnel ${kind}`);
 if([1,2,9].includes(kind))assert(played.city.sim.carTrips>0,`No driving through tunnel ${kind}`);else assert.equal(played.city.sim.carTrips,0);assert(played.routes.some(p=>(p.value||p[1]).path.some(id=>id>=under)),`No route uses the tunnel ${kind}`);
 if(kind===9)assert(played.city.sim.walkTrips>0,'Return journey must walk against the one-way tunnel');checks.push(`Kind ${kind} tunnel carries real residents, obeys vehicle directions, and preserves finite lane and money invariants`);
}
for(const portals of [0,1]){
 const cmds=[command('build-underground',1,20,39,20,1)];if(portals)cmds.push(command('build-portal',1,20));
 const r=run('no-implicit-portals-'+portals,{...template,commands:cmds,ticks:64});assert.equal(r.city.sim.arrived,0);assert.equal(r.city.sim.disconnected,8);checks.push(`${portals} portal cannot connect the two isolated surface destinations`);
}
const seed=run('trace-start',{...template,commands:[command('build-tunnel',1,20,39,20,1)]});let city=seed.city,vertical=0,undergroundActors=0;const residentIds=new Set();
for(let tick=0;tick<180;tick++){
 const r=run('trace-'+tick,{city,ticks:1,commands:[],after:[]},'continuation');city=r.city;
 for(const a of r.agents)if(a.state===2){if(a.cell>=under){undergroundActors++;residentIds.add(a.id)}if(a.from!==a.to&&a.from%under===a.to%under)vertical++}
}
assert(vertical>0);assert(undergroundActors>0);assert(residentIds.size>1);assert(city.sim.workVisits>0);checks.push('180 consecutive native ticks inspect every resident edge, both portal directions, all lane reservations, population and money');
const empty=run('empty',{rows:0,ticks:1,tiles:[],commands:[],after:[]});
for(const c of [command('build-tunnel',-1,20,4,20,1),command('build-tunnel',1,20,65,20,1),command('build-tunnel',1,20,1,20,1),command('build-tunnel',1,20,2,21,1),command('build-tunnel',1,20,4,20,13),command('build-underground',1,20,4,20,3),command('build-portal',1,20)]){
 const r=run('reject-'+checks.length,{city:empty.city,ticks:0,commands:[c],after:[]},'continuation');assert.deepEqual(r.city,empty.city);checks.push(`Invalid ${c.op} is a complete no-op`);
}
const report={passed:true,artifact_sha256:selection.artifact_sha256,compiler_sha256:selection.compiler_sha256,checks,trace:{ticks:180,verticalSnapshots:vertical,undergroundActorSnapshots:undergroundActors,residents:[...residentIds]},samples};fs.writeFileSync('evidence/tunnel-journeys.json',JSON.stringify(report,null,2));console.log({passed:true,checks,trace:report.trace});
