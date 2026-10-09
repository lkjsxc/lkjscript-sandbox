// All construction and simulation stay in the selected native executable.
// Inspect compact observations instead of serializing a City twice.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {runCase,selection} from './run-case.mjs';
const report={passed:false,artifact_sha256:selection.artifact_sha256,cases:[]};
for(const ticks of [0,128]) {
 const measured=runCase(ticks,'commuter-'+ticks,'commuter-probe'),r=measured.result;
 const people=r.residents.map(row=>Object.fromEntries(r.columns.map((key,i)=>[key,row[i]]))),tiles=new Map(r.tiles);
 assert.equal(people.length,2048);assert.equal(new Set(people.map(a=>a.id)).size,2048);
 assert.equal([...tiles.values()].filter(k=>k===3).length,256);
 assert.equal([...tiles.values()].filter(k=>k===4).length,128);
 assert.equal([...tiles.values()].filter(k=>k===8).length,16);
 assert.equal(r.rails.length,4);
 for(const [lineId,line] of r.rails) {
  assert(line.enabled);assert.equal(line.capacity,64);
  assert.deepEqual(line.stops,[22,44,84,106].map(x=>x+[20,48,76,104][lineId-1]*128));
  assert(line.passengers.length<=64);assert.equal(new Set(line.passengers).size,line.passengers.length);
 }
 const lanes=new Map(),employment=new Map();
 const add=(m,k)=>m.set(k,(m.get(k)||0)+1),road=k=>k===1||k===2||(k>=9&&k<=13);
 for(const a of people){assert.equal(tiles.get(a.home),3);assert.equal(tiles.get(a.job),4);add(employment,a.job);assert(a.elapsed<=a.duration);assert(a.wait>=0);
  if(a.mode===2&&(a.state===2||a.state===1&&road(tiles.get(a.cell)))){add(lanes,a.cell*8+a.dir*2+a.lane);if(a.exitKey>0)add(lanes,a.exitKey-1)}
 }
 assert([...employment.values()].every(n=>n<=16));
 for(const [lane,n]of lanes)if(road(tiles.get(Math.floor(lane/8))))assert(n<=3,'Finite receiving lane '+lane);
 assert.equal(r.frames.length,ticks+1);
 for(const [i,f]of r.frames.entries()){assert.equal(f.tick,i);assert.equal(f.population,2048);assert.equal(f.population,f.born-f.removed);assert.equal(f.requested,f.arrived+f.cancelled+f.active);assert.equal(f.cancelled,0);assert.equal(f.wealth,f.expected)}
 const last=r.frames.at(-1);assert.equal(last.active,people.filter(a=>[1,2,4,5,6].includes(a.state)).length);
 assert.equal(last.arrived,people.reduce((n,a)=>n+a.journeys,0));
 assert.equal(r.economy.wallets.reduce((n,[,v])=>n+v,0),r.economy.households);
 assert.equal(r.economy.firms.reduce((n,[,v])=>n+v,0),r.economy.businesses);
 if(ticks===128){assert(last.boardings>0,'Native rail boardings');assert(last.completed>0,'Completed rail journeys');assert(last.workVisits>0,'Real work arrivals')}
 report.cases.push({ticks,wall_ms:measured.wall_ms,final:last});console.log(report.cases.at(-1));
}
report.passed=true;fs.writeFileSync('evidence/commuter-example.json',JSON.stringify(report,null,2)+'\n');
console.log('PASS independent commuter city: 2,048 residents, four lines, conserved journeys and balanced money');
