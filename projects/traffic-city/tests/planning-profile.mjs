// Compact native timeline: two cycles avoid duplicate full-state JSON output.
// This test does not change production runtime limits or the search budget.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {runCase,selection} from './run-case.mjs';
const label=process.env.PROFILE_LABEL||'candidate';
assert(/^[a-z][a-z0-9-]*$/.test(label),'Use a simple evidence label.');
let city=process.env.PROFILE_START?JSON.parse(fs.readFileSync(process.env.PROFILE_START)):runCase(4,label+'-seed','scenario-seed').result;
const samples=[];let planningExposure=0;const stop=Number(process.env.PROFILE_STOP||512);
assert(Number.isInteger(stop)&&stop>=city.sim.tick&&stop<=512);
assert.equal(city.sim.population,1024);
for(let i=0;city.sim.tick<stop;i++){
 const r=runCase({city,ticks:Math.min(2,stop-city.sim.tick)},label+'-compact-'+i,'atlas-probe');city=r.result.city;
 const people=city.sim.agents.map(([,a])=>a),s=city.sim,e=city.economy;
 assert.equal(s.population,1024);assert.equal(s.population,s.born-s.removed);assert.equal(s.cancelled,0);
 assert.equal(s.requested,s.arrived+s.cancelled+people.filter(a=>[1,2,4,5,6].includes(a.state)).length);
 assert.equal(city.cash+e.households+e.businesses,e.opening+e.grants+e.exports+e.salvage-e.construction-e.operating-e.withdrawn);
 assert.equal(new Set(s.ids).size,1024);for(const[,l]of s.transit.lines){assert(l.passengers.length<=l.capacity);assert.equal(new Set(l.passengers).size,l.passengers.length)}
 for(const f of r.result.frames)planningExposure+=f.residents.filter(a=>a.state===1&&a.reason===8).length;
 const match=r.observation.match(/production-observation=("(?:[^"\\]|\\.)*")/);const obs=match?JSON.parse(JSON.parse(match[1])):{};
 const row={tick:s.tick,arrived:s.arrived,visits:s.visits,waiting:s.waiting,planning:people.filter(a=>a.state===1&&a.reason===8).length,neverMoved:people.filter(a=>a.journeys===0&&a.state===1&&a.cell===a.home).length,neverArrived:people.filter(a=>a.journeys===0).length,boardings:s.transit.boardings,completed:s.transit.completed,planningExposure,instructions:obs.instructions,allocated_bytes:obs.allocated_bytes,wall_ms:r.wall_ms};samples.push(row);
 if(s.tick%64===0){fs.writeFileSync('runtime/'+label+'-'+s.tick+'.json',JSON.stringify(city));console.log(JSON.stringify(row));}
 fs.writeFileSync('evidence/'+label+'-compact-profile.json',JSON.stringify({passed:s.tick===stop,artifact_sha256:selection.artifact_sha256,compiler_sha256:selection.compiler_sha256,startTick:process.env.PROFILE_START?JSON.parse(fs.readFileSync(process.env.PROFILE_START)).sim.tick:0,samples},null,2));
}
