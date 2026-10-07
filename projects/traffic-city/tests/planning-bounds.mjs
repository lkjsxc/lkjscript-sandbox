// Compare complete modal choices at identical native snapshots, not just totals.
// The command-only oracle has ten searches for two surface + four rail pairs;
// this does not alter the simulation's two-search production budget.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {runCase,selection} from './run-case.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const cases=[];let queries=0,referenceSearches=0,boundedSearches=0,railChoices=0;
function compare(city,requests,name){
 for(let i=0;i<requests.length;i+=8){
  const input={city,queries:requests.slice(i,i+8)},r=runCase(input,'planning-bound-'+name+'-'+i,'planning-proof');
  assert.equal(r.result.length,input.queries.length);
  for(const [j,p]of r.result.entries()){
   const label=name+' '+JSON.stringify(input.queries[j]);
   assert(p.referenceComplete,'Reference incomplete: '+label);assert(p.boundedComplete,'Candidate incomplete: '+label);
   assert.deepEqual(p.actual,p.expected,label);assert(p.boundedSearches<=p.referenceSearches,label);
   assert(p.referenceSearches<=10);assert(p.boundedSearches>=0);
   queries++;referenceSearches+=p.referenceSearches;boundedSearches+=p.boundedSearches;if(p.actual.mode===3)railChoices++;
  }
  cases.push({name:name+'-'+i,input_sha256:hash(input),result_sha256:hash(r.result),queries:r.result.length,referenceSearches:r.result.reduce((n,p)=>n+p.referenceSearches,0),boundedSearches:r.result.reduce((n,p)=>n+p.boundedSearches,0)});
 }
}
for(const scenario of [1,2,3,4]){
 const city=runCase(scenario,'planning-bound-seed-'+scenario,'scenario-seed').result;
 const people=[...new Map(city.sim.agents.map(([,a])=>[a.home,a])).values()];
 const selected=Array.from({length:Math.min(16,people.length)},(_,i)=>people[Math.floor(i*people.length/Math.min(16,people.length))]);
 const requests=selected.filter(a=>a.job>=0).flatMap(a=>[
  {origin:a.home,dest:a.job,mode:0,rail:true},
  {origin:a.job,dest:a.home,mode:1,rail:true},
  {origin:a.job,dest:a.home,mode:2,rail:false},
 ]);
 // Direct station-to-station and reversed endpoints exercise clearly useful
 // rail, equal alternatives, multiple stops and zero-length access paths.
 for(const[,line]of city.sim.transit.lines)for(const [origin,dest]of [[line.stops[0],line.stops.at(-1)],[line.stops.at(-1),line.stops[0]]])requests.push({origin,dest,mode:1,rail:true});
 compare(city,requests,'scenario-'+scenario);
 if(scenario===3){
  const mature=runCase({city,ticks:32,commands:[],after:[]},'planning-bound-warm','continuation').result.city;
  compare(mature,requests.slice(0,12),'warm-cache');
  const invalidated=structuredClone(mature);invalidated.world.version++;
  compare(invalidated,requests.slice(0,12),'stale-topology-cache');
 }
 if(scenario===4){
  const crowded=structuredClone(city);crowded.sim.q=crowded.world.tiles.filter(([,kind])=>[1,2].includes(kind)).map(([id])=>[id,12]);
  compare(crowded,requests.filter(q=>q.mode===0).slice(0,8),'congested-roads');
  const unfunded=structuredClone(city);unfunded.cash=0;compare(unfunded,requests.slice(0,8),'unfunded-trains');
  const suspended=structuredClone(city);for(const[,line]of suspended.sim.transit.lines)line.enabled=false;
  compare(suspended,requests.slice(0,8),'suspended-trains');
  // Full platforms increase the exact predecessor waiting estimate. Synthetic
  // queue IDs are only estimator inputs, not added to any running simulation.
  const queued=structuredClone(city);for(const[,line]of queued.sim.transit.lines){line.queueA=Array.from({length:32},(_,i)=>i+1);line.queueB=line.queueA.slice();line.queues=line.stops.flatMap(stop=>[[stop*2,Array.from({length:32},(_,i)=>i+1)],[stop*2+1,Array.from({length:32},(_,i)=>i+1)]]);}
  compare(queued,requests.filter(q=>q.mode!==2).slice(0,8),'full-platforms');
 }
}
assert(queries>=200);assert(referenceSearches>boundedSearches,'Pruning must remove actual route work');assert(railChoices>0,'Useful rail must still win');
const report={passed:true,artifact_sha256:selection.artifact_sha256,compiler_sha256:selection.compiler_sha256,queries,railChoices,referenceSearches,boundedSearches,cases,method:'Identical frozen cities; independent unpruned ETA arithmetic; full selected mode, stations, access/egress paths and ETA equality. Production budget unchanged.'};
fs.writeFileSync('evidence/planning-bounds.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,queries,railChoices,referenceSearches,boundedSearches},null,2));
