// Door-to-door costs and phases are authoritative native behavior, not UI hints.
import fs from 'node:fs';import assert from 'node:assert/strict';import{runCase,selection}from'./run-case.mjs';import{assertMoney}from'./rail-accounting.mjs';
const cases=[],shape=(distance,kind)=>Array.from({length:distance+1},(_,id)=>({id,kind:id===0?3:id===distance?4:kind,q:0}));
function conserve(c){const s=c.sim,people=s.agents.map(([,a])=>a);assert.equal(s.population,8);assert.equal(s.born-s.removed,8);assert.equal(s.requested,s.arrived+s.cancelled+people.filter(a=>[1,2,4,5,6].includes(a.state)).length);assert.equal(s.cancelled,0);assertMoney(c)}
let driving;
for(const[distance,kind,mode]of[[2,2,1],[5,2,1],[8,2,1],[9,2,2],[24,2,2],[11,1,1],[12,1,2],[30,7,1]]){
 const r=runCase({rows:0,ticks:2,tiles:shape(distance,kind),commands:[],after:[]},'walking-choice-'+distance+'-'+kind).result;conserve(r.city);
 const person=r.agents.find(a=>a.id===1);assert.equal(person.state,2);assert.equal(person.mode,mode);assert.equal(person.etaWalk,4*distance);
 const expectedCar=kind===7?-1:24+(kind===1?2*distance-1:distance);assert.equal(person.etaCar,expectedCar);assert.equal(person.duration,mode===2?12:0);
 cases.push({distance,kind,mode:person.mode,walkEta:person.etaWalk,carEta:person.etaCar,pickupDuration:person.duration});if(distance===9)driving=r.city;
}
const traced=runCase({city:driving,ticks:100,resident:1},'walking-car-timed-phases','walk-trace').result;conserve(traced.city);
const initial=driving.sim.agents.find(([id])=>id===1)[1],left=traced.frames.find(f=>f.resident.cell!==initial.cell);assert(left);assert.equal(left.tick-driving.sim.tick,12,'All twelve actual pickup cycles must elapse');
const parked=traced.frames.find(f=>f.resident.state===4);assert(parked);assert.equal(parked.resident.ready-parked.tick,12,'Parking is a real twelve-cycle phase');
for(const f of traced.frames.filter(f=>f.tick>=parked.tick&&f.tick<parked.tick+12))assert.equal(f.resident.journeys,parked.resident.journeys,'Parking cannot earn early arrival credit');
const completed=traced.frames.find(f=>f.tick>=parked.tick+12&&f.resident.journeys>parked.resident.journeys);assert(completed);assert.equal(completed.tick,parked.tick+12);
assert(traced.frames.some(f=>f.resident.purpose===4&&f.resident.mode===2),'A driver still takes their car home');
const walk=runCase({rows:0,ticks:150,tiles:shape(30,7),commands:[],after:[]},'walking-no-distance-cutoff').result;conserve(walk.city);assert(walk.city.sim.arrived>0);assert.equal(walk.city.sim.carTrips,0);
fs.writeFileSync('evidence/walkability.json',JSON.stringify({passed:true,artifact_sha256:selection.artifact_sha256,cases,actualPickupCycles:12,actualParkingCycles:12,longFootpathArrivals:walk.city.sim.arrived,checks:['short avenues favor walking through eight tiles including ties','long useful drives remain available','local-road boundary is tested independently','thirty-tile footpath remains walkable','pickup and parking have real elapsed duration and no early arrival credit','returning driver keeps their car','people, trips and money conserve']},null,2));console.log({passed:true,cases});
