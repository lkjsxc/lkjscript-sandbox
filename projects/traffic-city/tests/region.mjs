// An independent JS oracle over compact observations from the complete native
// city. No residents, routes or financial events are simulated in this harness.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {runCase,selection} from './run-case.mjs';
import {riverPoints,waterAt} from '../web/geometry.js';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const road=k=>k===1||k===2||(k>=9&&k<=13),id=(x,y)=>x+128*y;
const report={passed:false,artifact_sha256:selection.artifact_sha256,compiler_sha256:selection.compiler_sha256,method:'Complete native seed and ticks, with every resident projected once into named scalar columns. Full City is neither duplicated into JSON nor substituted with host simulation. Conservation is observed at every cycle and independently reconstructed from all end-state resident rows and balances.',cases:[]};
for(const ticks of [0,32,128]){
 const result=runCase(ticks,'region-'+ticks,'region-probe'),r=result.result;
 const people=r.residents.map(row=>{assert.equal(row.length,r.columns.length);return Object.fromEntries(r.columns.map((key,i)=>[key,row[i]]))});
 const tiles=new Map(r.tiles),wallets=new Map(r.economy.wallets),firms=new Map(r.economy.firms),employment=new Map(),lanes=new Map(),points=riverPoints(r.spine);
 assert.equal(people.length,2048);assert.equal(new Set(people.map(a=>a.id)).size,2048);
 assert.deepEqual(people.map(a=>a.id).sort((a,b)=>a-b),Array.from({length:2048},(_,i)=>i+1));
 assert.equal([...tiles.values()].filter(k=>k===3).length,256);
 assert.equal([...tiles.values()].filter(k=>k===4).length*16,2048);
 assert.equal([...tiles.values()].filter(k=>k===8).length,32);
 assert.equal(r.rails.length,4);assert.equal(r.riverWidth,6);assert.equal(points.length,129);
 for(const [cell,kind]of tiles)if(cell<16384&&(kind>=3&&kind<=6||kind===8))assert(!waterAt(points,6,cell),'Facility on water '+cell);
 for(const y of [27,87])for(let x=49;x<=85;x++){assert.equal(tiles.get(id(x,y)+16384),2,'Underground avenue');if(x===49||x===85)assert.equal(tiles.get(id(x,y)),13,'Explicit portal');}
 assert.equal([...tiles.keys()].filter(cell=>cell>=16384).length,74);
 for(const[,l]of r.rails){assert(l.enabled);assert.equal(l.stops.length,8);assert.equal(new Set(l.stops).size,8);assert(l.passengers.length<=l.capacity);assert.equal(new Set(l.passengers).size,l.passengers.length);for(const station of l.stops)assert.equal(tiles.get(station),8);}
 const add=(m,key,n)=>m.set(key,(m.get(key)||0)+n);
 for(const a of people){assert.equal(tiles.get(a.home),3);assert.equal(tiles.get(a.job),4);add(employment,a.job,1);assert(a.state>=0&&a.state<=6);assert(a.wait>=0);assert(a.elapsed<=a.duration);assert(wallets.has(a.id));assert(wallets.get(a.id)>=0);assert(tiles.has(a.cell));
  if(a.mode===2&&(a.state===2||a.state===1&&road(tiles.get(a.cell)))){add(lanes,a.cell*8+a.dir*2+a.lane,1);if(a.exitKey>0)add(lanes,a.exitKey-1,1);}
  if(a.state===2&&a.from!==a.to){const groundA=a.from%16384,groundB=a.to%16384,step=Math.abs(groundA%128-groundB%128)+Math.abs(Math.floor(groundA/128)-Math.floor(groundB/128));if(Math.floor(a.from/16384)!==Math.floor(a.to/16384)){assert.equal(groundA,groundB);assert.equal(tiles.get(groundA),13);}else assert.equal(step,1);}
 }
 assert([...employment.values()].every(n=>n<=16));for(const [lane,count]of lanes)if(road(tiles.get(Math.floor(lane/8))))assert(count<=3,'Finite lane capacity '+lane+' = '+count);
 assert.equal([...wallets.values()].reduce((a,b)=>a+b,0),r.economy.households);assert.equal([...firms.values()].reduce((a,b)=>a+b,0),r.economy.businesses);
 assert.equal(r.frames.length,ticks+1);for(let i=0;i<r.frames.length;i++){const f=r.frames[i];assert.equal(f.tick,i);assert.equal(f.population,2048);assert.equal(f.population,f.born-f.removed);assert.equal(f.requested,f.arrived+f.cancelled+f.active);assert.equal(f.wealth,f.expected);assert.equal(f.cancelled,0);}
 const final=r.frames.at(-1);assert.equal(final.active,people.filter(a=>[1,2,4,5,6].includes(a.state)).length);assert.equal(final.arrived,people.reduce((n,a)=>n+a.journeys,0));
 if(ticks>=32){assert(final.arrived>0);assert(final.walking>0);}
 const sample={ticks,wall_ms:result.wall_ms,result_sha256:hash(r),tiles:tiles.size,people:people.length,underground:74,stations:32,rail_services:4,stops_per_service:8,route_count:r.routeCount,final};report.cases.push(sample);fs.writeFileSync('evidence/region.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(sample));
}
report.passed=true;fs.writeFileSync('evidence/region.json',JSON.stringify(report,null,2)+'\n');console.log('PASS 2,048 residents, both layers, 32 stations and per-cycle conservation');
