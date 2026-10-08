// Compare the sparse event journal with the preserved full-population scan.
// Deliberately dropping arrivals must fail exact state comparison even though
// the total-money conservation equation can still hold: a missing wage is not
// discovered merely by checking that no money was created from nowhere.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {runCase,selection} from './run-case.mjs';
import {assertMoney,withoutTreasury} from './rail-accounting.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const report={passed:false,artifact_sha256:selection.artifact_sha256,compiler_sha256:selection.compiler_sha256,method:'Two distinct native settlement algorithms receive identical full City snapshots. Compare the complete resulting City, every account and route. The reference scans all resident identities and is retained from the predecessor. No host simulation or sampled result equality.',samples:[],negative_control:null};
const save=()=>fs.writeFileSync('evidence/money-events.json',JSON.stringify(report,null,2)+'\n');
const metrics=r=>{const m=r.observation.match(/production-observation=("(?:[^"\\]|\\.)*")/);assert(m);const o=JSON.parse(JSON.parse(m[1]));for(const k of ['live_call_frames_after','live_handles_after','live_transactions_after'])assert.equal(o[k],0,k);return{wall_ms:r.wall_ms,invocation_ms:Number(r.observation.match(/invocation-nanoseconds=(\d+)/)[1])/1e6,instructions:o.instructions,allocated_bytes:o.allocated_bytes,calls:o.calls};};
function invariant(city){assertMoney(city);const s=city.sim,a=s.agents.map(([,v])=>v);assert.equal(s.population,a.length);assert.equal(s.population,s.born-s.removed);assert.equal(new Set(a.map(r=>r.id)).size,a.length);assert.equal(s.requested,s.arrived+s.cancelled+a.filter(r=>[1,2,4,5,6].includes(r.state)).length);for(const[,l]of s.transit.lines){assert(l.passengers.length<=l.capacity);assert.equal(new Set(l.passengers).size,l.passengers.length);}}
let faultVerified=false;
function pair(city,ticks,name){invariant(city);const input={city,ticks},a=runCase(input,'money-reference-'+name,'money-reference'),b=runCase(input,'money-actual-'+name,'money-actual');invariant(a.result);invariant(b.result);assert.deepEqual(b.result,a.result,name+' full City');
 const r=a.result,e=r.economy,before=city.economy,row={name,population:r.sim.population,from:city.sim.tick,to:r.sim.tick,exact_state_equal:true,input_sha256:hash(input),result_sha256:hash(r),reference:metrics(a),actual:metrics(b),events:{arrived:r.sim.arrived-city.sim.arrived,boardings:r.sim.transit.boardings-city.sim.transit.boardings,wages:e.wages-before.wages,exports:e.exports-before.exports,sales:e.sales-before.sales,fares:e.fares-before.fares,concessions:e.concessions-before.concessions}};
 report.samples.push(row);save();console.log(JSON.stringify(row));
 if(!faultVerified&&row.events.wages>0){const missing=runCase(input,'money-negative-control-'+name,'money-missing-arrivals');invariant(missing.result);assert.notDeepEqual(missing.result,r,'Omitted arrival journal must be detected');assert(missing.result.economy.wages<e.wages,'Missing arrivals really omit earned wages');report.negative_control={name,conservation_still_holds:true,full_state_equality_rejected:true,reference_wages:e.wages,missing_wages:missing.result.economy.wages,result_sha256:hash(missing.result)};faultVerified=true;save();}
 return r;
}
const starter=runCase({rows:-1,ticks:0,tiles:[],commands:[],after:[]},'money-starter-seed').result.city;
let city=pair(starter,64,'starter-0-64');city=pair(city,64,'starter-64-128');
for(const scenario of [1,3]){const seed=runCase(scenario,'money-seed-'+scenario,'scenario-seed').result;city=pair(seed,32,'scenario-'+scenario+'-0-32');city=pair(city,32,'scenario-'+scenario+'-32-64');city=pair(city,64,'scenario-'+scenario+'-64-128');
 if(scenario===3){
  const reversed=structuredClone(city);reversed.sim.ids.reverse();pair(reversed,8,'reverse-resident-scan-order');
  const empty=structuredClone(city);empty.economy.withdrawn+=empty.economy.households;empty.economy.households=0;empty.economy.wallets=empty.economy.wallets.map(([id])=>[id,0]);pair(empty,32,'zero-household-wallets');
  pair(withoutTreasury(city),16,'no-treasury');
 }
}
assert(faultVerified,'Need at least one wage-paying interval for the omission negative control');assert(report.samples.some(s=>s.events.boardings>0),'Ordinary rail boarding must occur in this proof');assert(report.samples.some(s=>s.events.sales>0),'Purchases must occur in this proof');report.passed=true;save();console.log('PASS sparse native settlement equals full scan; omitted events are rejected');
