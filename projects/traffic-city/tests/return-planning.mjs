// Regression for bounded, round-trip-aware native car choice. These inputs are
// synthetic fixture state; all planning, movement and accounting runs natively.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {runCase,selection} from './run-case.mjs';
const U=16384,base=20*128,checks=[];
const cmd=(op,x,y,x2=x,y2=y,kind=0)=>({op,x,y,x2,y2,kind});
// Shops and parks need actual path access; facilities are not through-links.
const cells=[[base,3],[base+40,4],[base-128,5],[base-128+1,7],[base-128+2,6]].map(([id,kind])=>({id,kind,q:0}));
function run(name,input,target='continuation'){
 const measured=runCase(input,'return-'+name,target),r=measured.result,s=r.city.sim,e=r.city.economy;
 assert.equal(r.conservation,0,name);assert.equal(s.population,r.agents.length);
 assert.equal(s.requested,s.arrived+s.cancelled+r.agents.filter(a=>[1,2,4,5,6].includes(a.state)).length);
 assert.equal(r.city.cash+e.households+e.businesses,e.opening+e.grants+e.exports+e.salvage-e.construction-e.operating-e.withdrawn);
 for(const[key,count]of r.lanes){const kind=new Map(r.city.world.tiles).get(Math.floor(key/8));if([1,2,9,10,11,12,13].includes(kind))assert(count>=0&&count<=3)}
 fs.writeFileSync('evidence/return-last-case.json',JSON.stringify({name,input,result:r},null,2));return r;
}
function seed(name,commands){return run(name,{rows:0,ticks:0,tiles:cells,commands,after:[]},'workload').city}
function advance(city,ticks,commands=[]){return {city,ticks,commands,after:[]}}
function pending(city){const c=structuredClone(city);for(const[,r]of c.sim.agents)Object.assign(r,{state:1,mode:0,purpose:1,dest:r.job,cell:r.home,from:r.home,to:r.home,wait:0,route:0,step:0,reason:8,departed:0,ready:0});Object.assign(c.sim,{requested:c.sim.population,arrived:0,cancelled:0});return c}
const one=seed('one-way-seed',[cmd('build-tunnel',1,20,39,20,9)]);
let first=run('budget-first',advance(pending(one),1));
assert.equal(first.city.sim.nextRoute-one.sim.nextRoute,2,'Only the two shared searches fit in the first tick');
assert(first.agents.every(a=>a.state===1&&a.reason===8),'Missing return-search budget is planning, not departure or disconnection');
assert.equal(first.city.sim.disconnected,0);assert.equal(first.city.sim.carTrips,0);
const second=run('budget-second',advance(first.city,1));assert.equal(second.city.sim.nextRoute-first.city.sim.nextRoute,1,'All residents share the same return-path result');
assert(second.agents.every(a=>a.state===2&&a.mode===1));assert.equal(second.city.sim.carTrips,0);checks.push('Two-search budget defers departure; the next tick shares one negative return result and chooses walking for all eight people');
const walked=run('one-way-whole-life',advance(one,600));assert(walked.agents.every(a=>a.journeys>=2));assert.equal(walked.city.sim.carTrips,0);assert(walked.city.sim.walkTrips>0);checks.push('One-way-only route never strands a departing driver; real pedestrians finish outward and return trips');
const old=structuredClone(pending(one));old.world.junctions=old.world.junctions.filter(([key])=>key!==-259);const oldFirst=run('unknown-cache-first',advance(old,1));assert(oldFirst.agents.every(a=>a.state===1&&a.reason===8));checks.push('Missing predecessor symmetry metadata is unknown, never evidence that a car can return');
const two=seed('two-way-seed',[cmd('build-tunnel',1,20,39,20,1)]);const symmetric=run('two-way-budget',advance(pending(two),1));assert(symmetric.agents.every(a=>a.state===2&&a.mode===2));assert.equal(symmetric.city.sim.nextRoute-two.sim.nextRoute,2);checks.push('Certified bidirectional topology uses the original two searches and does not add a return search');
// Separate corridors by three empty rows: adjacent parallel roads form many
// junctions, correctly making walking faster; that is not a driving regression.
const circuitCommands=[cmd('build-tunnel',1,20,39,20,9),cmd('build-underground',1,20,1,24,1),cmd('build-underground',39,20,39,24,1),cmd('build-underground',2,24,38,24,11)];
const circuit=seed('directed-circuit',circuitCommands),driven=run('circuit-600',advance(circuit,600));
assert(driven.city.sim.carTrips>=16,'A complete separated return corridor should support outward and homeward driving');
assert(driven.agents.every(a=>a.journeys>=2));assert.equal(driven.city.sim.disconnected,0);const routes=driven.routes.map(p=>p.value||p[1]);
assert(routes.some(r=>r.mode===2&&r.origin===base+40&&r.dest===base&&r.path.some(id=>id>=U&&Math.floor(id/128)%128===24)));
checks.push('A valid directed circuit carries all eight cars out and home on the separate westbound return path');
// The old adjacent-corridor expectation was invalid: its intersections make
// walking the rational choice. Assert actual journey completion, not car use.
const adjacent=seed('adjacent-circuit',[cmd('build-tunnel',1,20,39,20,9),cmd('build-underground',1,20,1,21,1),cmd('build-underground',39,20,39,21,1),cmd('build-underground',2,21,38,21,11)]),adjacentLife=run('adjacent-life',advance(adjacent,600));
assert(adjacentLife.agents.every(a=>a.journeys>=2));assert.equal(adjacentLife.city.sim.carTrips,0);assert(adjacentLife.city.sim.walkTrips>0);checks.push('The dense adjacent-corridor fixture correctly chooses walking and completes journeys');
// Rail remains a valid choice after a failed car-return proof; bounded access
// and egress searches must progress through the same shared planning budget.
const rail=seed('one-way-with-rail',[cmd('build-tunnel',1,20,39,20,9),cmd('build-rail',1,21,39,21)]),railLife=run('one-way-rail-life',advance(rail,240));
assert.equal(rail.sim.transit.ids.length,1);assert(railLife.city.sim.transit.boardings>0);assert(railLife.city.sim.transit.completed>0);assert.equal(railLife.city.sim.carTrips,0);assert(railLife.agents.every(a=>a.journeys>=1));checks.push('One-way car-return admission preserves usable rail access, boarding, egress and completed journeys under the ordinary planning budget');
const converted=run('convert-to-bidirectional',advance(one,0,[cmd('build-underground',1,20,39,20,1)])).city;
assert.equal(new Map(converted.world.junctions).get(-259),1);const convertedLife=run('converted-budget',advance(pending(converted),1));assert(convertedLife.agents.every(a=>a.state===2&&a.mode===2));assert.equal(convertedLife.city.sim.nextRoute-converted.sim.nextRoute,2);checks.push('Removing the last one-way restriction rebuilds the symmetry certificate and restores the original two-search admission');
// An edit AFTER departure cannot change the physical mode or move a car home.
let travelling=run('edit-seed-travel',advance(circuit,105)).city;
const beforeIds=travelling.sim.ids.slice();const interrupted=run('break-return-after-departure',advance(travelling,100,[cmd('build-underground',20,24,20,24,9)]));
assert.equal(new Map(interrupted.city.world.tiles).get(U+20+24*128),9,'The empty return segment must actually change');
assert.deepEqual(interrupted.city.sim.ids,beforeIds);assert.equal(interrupted.city.sim.cancelled,0);
const waiting=interrupted.agents.filter(a=>a.mode===2&&a.purpose===4&&a.state===1&&a.reason===1);assert(waiting.length>0,'The interrupted driver must wait for an actual car route');assert(waiting.every(a=>a.cell!==a.home));
const recovered=run('restore-return',advance(interrupted.city,400,[cmd('build-underground',20,24,20,24,11)]));assert(recovered.agents.every(a=>a.journeys>=2));assert.equal(recovered.city.sim.cancelled,0);checks.push('Breaking a return after departure retains the driver and vehicle; reconnecting the route restores travel without teleportation or cancellation');
const report={passed:true,artifact_sha256:selection.artifact_sha256,checks,outcomes:{oneway:{cars:walked.city.sim.carTrips,walk:walked.city.sim.walkTrips,arrived:walked.city.sim.arrived},circuit:{cars:driven.city.sim.carTrips,walk:driven.city.sim.walkTrips,arrived:driven.city.sim.arrived},adjacent:{cars:adjacentLife.city.sim.carTrips,walk:adjacentLife.city.sim.walkTrips,arrived:adjacentLife.city.sim.arrived},recovered:recovered.city.sim.arrived}};
fs.writeFileSync('evidence/return-planning.json',JSON.stringify(report,null,2));console.log(report);
