// Exercise real native sessions with disposable keys/stores. No browser or JS simulation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
import {startNative,connect,memory,root} from './native.mjs';
import {runCase,selection} from './run-case.mjs';
let native=await startNative({name:'city-lab',tick:25});
const clients=[],checks=[],token=randomBytes(32).toString('hex');
async function client(key=token,expect=1){
 const c=connect(native.address);clients.push(c);await c.wait(f=>f.seq===1);let id=0;
 const owner=randomBytes(16).toString('hex');
 c.command=async(op,fields={})=>{const next=++id;c.socket.send(JSON.stringify({id:next,token:op==='resume'?key:'',owner:op==='resume'?owner:'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));return c.wait(f=>f.ack===next,90000)};
 c.resumed=await c.command('resume');assert.equal(c.resumed.status,expect);return c;
}
const build=(x,y,kind=1)=>({x,y,x2:x,y2:y,kind});
const nativeCommand=(op,fields={})=>({op,x:0,y:0,x2:0,y2:0,kind:0,...fields});
function equalSim(frame,city){
 for(const k of 'tick requested arrived population visits workVisits shopVisits leisureVisits moving waiting disconnected walkTrips carTrips healthy cancelled'.split(' '))assert.equal(frame.stats[k],city.sim[k],k);
 assert.equal(frame.stats.cash,city.cash);assert.equal(frame.stats.wealthError,0);
 assert.equal(frame.stats.version,city.world.version);
}
async function residents(c,n){const out=[];for(let id=1;id<=n;id++){const f=await c.command('inspect',{kind:id});out.push(f.inspect)}return out}
async function comparison(c,horizon=64){const start=await c.command('lab-run',{kind:horizon});assert.equal(start.lab.phase,2);return c.wait(f=>f.seq>start.seq&&f.lab.phase===4,240000)}
try{
 const a=await client();
 // Put an identifiable city into the existing backup, then experiment on a fresh city.
 await a.command('build',build(2,2));let f=await a.command('review-reset');
 f=await a.command('reset-city',{x:f.confirmation});assert.equal(f.undo,true);const original=f.stats;
 f=await a.command('lab-start');assert.equal(f.lab.phase,1);assert.deepEqual(f.stats,original);assert.equal(f.saved,original.tick);
 for(const n of [-1,0,63,4096]){f=await a.command('lab-run',{kind:n});assert.equal(f.lab.phase,1);assert.equal(f.stats.cash,original.cash)}
 f=await a.command('lab-apply',{x:999});assert.equal(f.lab.phase,1);assert.equal(f.stats.cash,original.cash);
 f=await a.command('reset-city');assert.equal(f.lab.phase,1);assert.equal(f.undo,true);
 const unchanged=await comparison(a);assert.deepEqual(unchanged.lab.control,unchanged.lab.changed);assert.equal(unchanged.saved,original.tick);
 assert.equal(unchanged.lab.realTick,original.tick);assert.equal(unchanged.stats.tick,original.tick+64);
 const oracle=runCase({rows:-1,ticks:64,tiles:[],commands:[],after:[]},'city-lab-oracle-control').result;
 equalSim(unchanged,oracle.city);assert.deepEqual(await residents(a,32),oracle.agents);
 checks.push('Unchanged paired 64-cycle branches match exactly; complete residents and native counters equal an independent ordinary simulation.');
 f=await a.command('lab-review');const expired=f.lab.confirmation;assert.equal(expired,f.ack);
 f=await a.command('lab-edit');assert.deepEqual(f.stats,original);assert.equal(f.lab.confirmation,0);
 f=await a.command('lab-apply',{x:expired});assert.equal(f.lab.phase,1);
 const edit=build(original.originX+6,original.originY+9,4);
 f=await a.command('build',edit);assert.equal(f.lab.planCost,140);assert.equal(f.stats.cash,original.cash-140);
 const plan=f.stats;const plannedResidents=await residents(a,32);
 const planOracle=runCase({rows:-1,ticks:64,tiles:[],commands:[nativeCommand('build',edit)],after:[]},'city-lab-oracle-plan').result;
 const changed=await comparison(a);equalSim(changed,planOracle.city);assert.deepEqual(await residents(a,32),planOracle.agents);
 assert.deepEqual(changed.lab.control,unchanged.lab.control);assert.equal(changed.lab.changed.netFunds,planOracle.city.cash-original.cash);
 assert.equal(changed.lab.changed.visits,planOracle.city.sim.visits-original.visits);
 assert.equal(changed.lab.changed.waitCycles,planOracle.city.sim.waitTicks);
 assert.equal(changed.lab.changed.outstanding,planOracle.city.sim.requested-planOracle.city.sim.arrived-planOracle.city.sim.cancelled);
 const review=await a.command('lab-review');f=await a.command('cancel-review');assert.equal(f.lab.confirmation,0);
 f=await a.command('lab-apply',{x:review.lab.confirmation});assert.equal(f.lab.phase,4);
 f=await a.command('lab-review');f=await a.command('lab-apply',{x:f.lab.confirmation});assert.equal(f.lab.phase,0);
 assert.deepEqual(f.stats,plan);assert.equal(f.saved,original.tick);assert.deepEqual(await residents(a,32),plannedResidents);assert.equal(f.undo,true);
 checks.push('Paid workplace plan matches ordinary native simulation; expired confirmations reject; apply imports only the original-cycle plan, never future income, arrivals or time.');
 const committed=f.stats;await a.command('lab-start');f=await a.command('build',build(3,3));assert.equal(f.lab.planCost,8);
 f=await a.command('lab-run',{kind:256});const seq=f.seq;f=await a.wait(f=>f.seq>seq&&f.lab.step>=2);f=await a.command('lab-edit');assert.equal(f.lab.phase,1);assert.equal(f.stats.tick,committed.tick);
 f=await a.command('lab-discard');assert.deepEqual(f.stats,committed);assert.equal(f.lab.phase,0);
 checks.push('A running comparison can be stopped and a plan discarded without changing the original city.');
 // Closing, restarting and ownership loss must never checkpoint the displayed trial.
 await a.command('lab-start');await a.command('build',build(3,3));await a.command('lab-run',{kind:128});await a.wait(f=>f.lab.phase===2&&f.lab.step>=3);
 f=await a.command('save');assert.equal(f.saved,committed.tick);await a.close();
 const directory=native.dir;await native.stop();native=await startNative({directory,name:'city-lab-restart',tick:25});
 const b=await client();assert.equal(b.resumed.lab.phase,0);assert.deepEqual(b.resumed.stats,committed);assert.equal(b.resumed.undo,true);
 await b.command('lab-start');await b.command('build',build(3,3));await comparison(b);const stale=await b.command('lab-review');
 const owner=await client();assert.deepEqual(owner.resumed.stats,committed);
 f=await b.command('lab-apply',{x:stale.lab.confirmation});assert.equal(f.status,2);f=await owner.command('save');assert.deepEqual(f.stats,committed);await b.close();
 checks.push('Saving, disconnecting, process restart and another-tab takeover preserve only the original/committed city and its existing backup.');
 f=await owner.command('review-restore');f=await owner.command('restore-city',{x:f.confirmation});assert.equal(f.undo,false);assert.equal(f.stats.cash,892);assert.equal(f.stats.tick,0);
 assert(f.overview.some(v=>Math.floor(v/16)===2+2*128&&v%16===1));
 checks.push('An existing previous-city backup survives experiments and applies, then restores once.');
 // Demolition cancels in the plan only, including resident moveouts.
 await owner.command('set-running',{kind:1});await owner.wait(f=>f.stats.tick>=15);f=await owner.command('set-running',{kind:0});const occupied=f.stats;
 f=await owner.command('lab-start');const home=(f.overview||[]).find(v=>v%16===3);assert(home!==undefined);const cell=Math.floor(home/16);
 f=await owner.command('review-remove',build(cell%128,Math.floor(cell/128),0));assert(f.quote.valid);const quote=f.quote;
 f=await owner.command('apply-remove',{x:quote.id});assert.equal(f.lab.moveouts,8);assert.equal(f.lab.cancelled,quote.cancelled);assert.equal(f.stats.population,occupied.population-8);
 f=await owner.command('lab-discard');assert.deepEqual(f.stats,occupied);
 checks.push('Reviewed demolition exposes exact moveouts and journey cancellations; discard retains every original resident and trip.');
 await owner.close();
 for(let i=0;i<7;i++){const c=await client(randomBytes(32).toString('hex'));await c.close()}
 const full=await client(randomBytes(32).toString('hex'),4);await full.close();
 checks.push('Many experiments consume no extra saved-city slots: all seven remaining slots are available and the ninth city still rejects.');
 const maxFrame=Math.max(...clients.flatMap(c=>c.frames.map(f=>f.bytes)));assert(maxFrame<131072);
 const result={passed:true,artifact_sha256:selection.artifact_sha256,checks,comparison:{unchanged:unchanged.lab,plan:changed.lab},maximum_frame_bytes:maxFrame,memory:memory(native.child.pid)};
 fs.writeFileSync(root+'/evidence/city-lab.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{for(const c of clients)await c.close().catch(()=>{});await native.stop()}
