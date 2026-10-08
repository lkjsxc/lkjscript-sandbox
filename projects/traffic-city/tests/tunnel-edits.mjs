// Native quotes, atomic construction and typed migration; no real player stores.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {runCase,selection} from './run-case.mjs';
const base=20*128,U=16384,checks=[],command=(op,x,y,x2=x,y2=y,kind=0)=>({op,x,y,x2,y2,kind});
const query=(name,input,target)=>runCase(input,'tunnel-edit-'+name,target).result;
const seed=query('seed',{rows:0,ticks:1,tiles:[{id:base,kind:3,q:0},{id:base+40,kind:4,q:0},{id:base+20,kind:6,q:0}],commands:[],after:[]},'workload').city;
function build(city,c,name){return query(name,{city,command:c},'construction-probe')}
const blankQuote={id:0,version:0,x:0,y:0,x2:0,y2:0,tiles:0,homes:0,moveouts:0,relocated:0,cancelled:0,refund:0,rails:0,layer:0,valid:false};
function review(city,c,name){return query(name,{city,command:c,quote:blankQuote,apply:false},'removal-probe').quote}
function apply(city,quote,name){return query(name,{city,command:command('apply-remove',0,0),quote,apply:true},'removal-probe').outcome}
function balances(c){const e=c.economy;assert.equal(c.cash+e.households+e.businesses,e.opening+e.grants+e.exports+e.salvage-e.construction-e.operating-e.withdrawn)}
let city=build(seed,command('build-tunnel',1,20,39,20,1),'complete').city;balances(city);assert.equal(city.cash,seed.cash-39*48-120);
assert.deepEqual(build(city,command('build-tunnel',39,20,1,20,1),'same-reversed').city,city);checks.push('Reversed drag over identical tunnel costs nothing and preserves the complete city');
for(const c of [command('build-tunnel',0,20,39,20,1),command('build-tunnel',1,20,40,20,1),command('build-portal',20,20),command('build',1,20,1,20,2)]){
 const o=build(city,c,'protected-'+checks.length);assert.deepEqual(o.city,city);assert(o.notice);checks.push('Protected endpoint/portal edit rejected without touching residents, tiles, money or routes');
}
let low=structuredClone(seed);low.cash=1;low.economy.opening-=seed.cash-1;assert.deepEqual(build(low,command('build-tunnel',1,20,39,20,1),'budget').city,low);checks.push('Insufficient total budget cannot create a partial tunnel or one paid entrance');
// Editing the lower layer cannot select the park or an overlapping surface rail.
city=build(city,command('build-track',1,21,39,21),'overhead-track').city;const before=structuredClone(city),q=review(city,command('review-remove',19,20,21,21,1),'under-quote');
assert(q.valid);assert.equal(q.layer,1);assert.equal(q.tiles,3);assert.equal(q.refund,72);assert.equal(q.homes,0);assert.equal(q.rails,0);assert.deepEqual(city,before);
const removed=apply({...city,paused:true},q,'under-apply').city;balances(removed);const t=new Map(removed.world.tiles);assert.equal(t.get(base+20),6);for(let x=19;x<=21;x++)assert(!t.has(U+base+x));assert.deepEqual(removed.sim.transit.tracks,city.sim.transit.tracks);assert.deepEqual(removed.world.tiles.filter(([id])=>id<U),city.world.tiles.filter(([id])=>id<U));assert.equal(removed.cash,city.cash+72);checks.push('Underground review/refund/removal leaves every surface tile, park, track and household intact');
const stale=build(city,command('build-underground',10,22,13,22,7),'intervening-edit').city;assert.deepEqual(apply({...stale,paused:true},q,'stale-review').city,{...stale,paused:true});checks.push('Captured demolition review expires after any intervening topology change');
const groundQuote=review({...city,paused:true},command('review-remove',1,20,1,20,0),'ground-quote');assert.equal(groundQuote.tiles,1);assert.equal(groundQuote.refund,30);const groundRemoved=apply({...city,paused:true},groundQuote,'ground-apply').city;assert.equal(new Map(groundRemoved.world.tiles).get(base+1),undefined);assert.equal(new Map(groundRemoved.world.tiles).get(U+base+1),1);checks.push('Removing a ground portal disconnects but does not demolish its underground counterpart');
for(const layer of [-1,2])assert.equal(review(city,command('review-remove',1,20,3,20,layer),'invalid-layer-'+layer).valid,false);
// Point at a real traveller to test occupancy rejection, then preserve its state.
let busy=query('busy',{city,ticks:45,commands:[],after:[]},'continuation').city;
const moving=busy.sim.agents.map(([,a])=>a).find(a=>a.state===2&&a.cell>=U&&new Map(busy.world.tiles).get(a.cell)===1);assert(moving,'Fixture must contain a real underground traveller');
const changed=build(busy,command('build-underground',moving.cell%128,20,moving.cell%128,20,9),'occupied-change');assert.deepEqual(changed.city,busy);checks.push('Changing an occupied underground road direction is rejected, including the native traveller and its reservations');
const activeQuote=review({...busy,paused:true},command('review-remove',moving.cell%128,20,moving.cell%128,20,1),'occupied-remove');assert(activeQuote.cancelled>0);const activeRemoved=apply({...busy,paused:true},activeQuote,'occupied-remove-apply').city;assert.equal(activeRemoved.sim.arrived,busy.sim.arrived);assert.equal(activeRemoved.sim.cancelled,busy.sim.cancelled+activeQuote.cancelled);assert.equal(activeRemoved.sim.population,busy.sim.population);balances(activeRemoved);checks.push('Confirmed underground demolition cancels affected journeys without inventing arrivals, income or lost residents');
// The new schema version is an explicit fence; all legacy state stays exact
// except rebuilt static metadata and the obsolete coordinate-keyed route cache.
let old;const predecessor=process.env.OLD_CITY_SELECTION?'actual-artifact':'synthetic-format8-record';
if(process.env.OLD_CITY_SELECTION){const currentSelection=process.env.CITY_SELECTION;try{process.env.CITY_SELECTION=process.env.OLD_CITY_SELECTION;const oldRunner=await import('./run-case.mjs?old-infrastructure');old=oldRunner.runCase({rows:-1,ticks:48,tiles:[],commands:[],after:[]},'tunnel-edit-old-active').result.city;}finally{if(currentSelection===undefined)delete process.env.CITY_SELECTION;else process.env.CITY_SELECTION=currentSelection;}}
else {old=query('synthetic-v8-city',{rows:-1,ticks:48,tiles:[],commands:[],after:[]},'workload').city;old.world.junctions=old.world.junctions.filter(([key])=>key>=-257);}

const saved={format:8,owner:'synthetic-migration-owner',serial:71,city:old},migrated=query('migrate-eight',saved,'migration-probe');
assert.equal(migrated.format,9);assert.equal(migrated.owner,saved.owner);assert.equal(migrated.serial,saved.serial);const canonical=structuredClone(migrated.city);canonical.world.junctions=old.world.junctions;canonical.sim.lookup=old.sim.lookup;assert.deepEqual(canonical,old);assert.deepEqual(migrated.city.sim.lookup,[]);assert.equal(new Map(migrated.city.world.junctions).get(-258),2);assert.deepEqual(query('migration-idempotent',migrated,'migration-probe'),migrated);checks.push('The selected format-8 city migrates with every non-derived city/resident/rail/money field exact; only static metadata and obsolete lookup keys change');
const current={format:9,owner:'synthetic-current-owner',serial:72,city:busy};assert.deepEqual(query('current-roundtrip',current,'migration-probe'),current);assert.equal(query('future-refused',{...current,format:10},'migration-probe').format,-1);checks.push('Layered moving city is an exact current-format roundtrip, migration is idempotent, and future formats are refused');
const report={passed:true,predecessor,artifact_sha256:selection.artifact_sha256,checks};fs.writeFileSync('evidence/tunnel-edits.json',JSON.stringify(report,null,2));console.log(report);
