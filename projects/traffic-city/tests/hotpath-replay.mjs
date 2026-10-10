// Physical state remains identical to the route-only candidate. Only diagnostic
// walking/driving ETAs may stay stale while a route calculation is deferred.
import fs from 'node:fs';import assert from 'node:assert/strict';
const latest=process.env.CITY_SELECTION||'.build/selection.json';
process.env.CITY_SELECTION=process.env.BASELINE_SELECTION||'.build/route-only.json';const before=await import('./run-case.mjs?hotpath-before');
process.env.CITY_SELECTION=latest;const after=await import('./run-case.mjs?hotpath-after');
const normalize=x=>{const c=structuredClone(x);for(const [,r]of c.sim.agents){delete r.etaWalk;delete r.etaCar}return c};
const checks=[];
let city=process.env.REPLAY_SEED?JSON.parse(fs.readFileSync(process.env.REPLAY_SEED)):before.runCase(3,'hotpath-replay-seed','scenario-seed').result;
for(const [name,ticks,commands]of [
 ['startup',16,[]],['warm',16,[]],
 ['suspended',4,[{op:'rail-service',x:1,y:0,x2:0,y2:0,kind:0}]],
 ['resumed',4,[{op:'rail-service',x:1,y:0,x2:0,y2:0,kind:1}]],
 ['edited',4,[{op:'build',x:10,y:10,x2:10,y2:10,kind:1}]],
 ['settled',64,[]],
]){
 const input={city,ticks,commands,after:[]};const a=before.runCase(input,'hotpath-replay-before-'+name,'continuation').result;
 const b=after.runCase(input,'hotpath-replay-after-'+name,'continuation').result;
 assert.deepEqual(normalize(b.city),normalize(a.city),name);assert.equal(b.conservation,0);city=b.city;
 checks.push({name,tick:city.sim.tick,arrived:city.sim.arrived,walkTrips:city.sim.walkTrips,carTrips:city.sim.carTrips,boardings:city.sim.transit.boardings});console.log(checks.at(-1));
}
assert(checks.at(-1).boardings>0);
fs.writeFileSync('evidence/hotpath-replay.json',JSON.stringify({passed:true,before:before.selection.artifact_sha256,after:after.selection.artifact_sha256,checks},null,2)+'\n');
