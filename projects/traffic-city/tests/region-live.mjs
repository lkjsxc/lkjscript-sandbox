// Actual native session, real native store, bounded browser protocol. Never
// touches the published service, its descriptor, or a player's recovery key.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {startNative,connect,memory} from './native.mjs';
const key=randomBytes(32).toString('hex'),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const cycles=Number(process.env.REGION_LIVE_CYCLES||64);assert(Number.isInteger(cycles)&&cycles>=16&&cycles<=256);
let native,client,sequence=0,owner;
const commandTimes=[],checks=[],sampled=Array.from({length:32},(_,i)=>1+i*64).concat([2048]);
async function command(op,fields={}){const id=++sequence,start=performance.now();client.socket.send(JSON.stringify({id,token:op==='resume'?key:'',owner:op==='resume'?owner:'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));const f=await client.wait(f=>f.ack===id,120000);commandTimes.push({op,milliseconds:performance.now()-start});assert.equal(f.status,1,op+': '+f.notice);return f;}
async function start(directory){native=await startNative({name:'region-roundtrip',directory});client=connect(native.address);sequence=0;owner=randomBytes(16).toString('hex');await client.wait(f=>f.seq===1);return command('resume');}
async function stop(){if(client){await client.close();client=null;}if(native){const n=native;native=null;await n.stop();}}
const state=f=>({stats:f.stats,rails:f.rails});
async function inspect(){const people=[];for(const id of sampled){const f=await command('inspect',{kind:id});assert.equal(f.inspect.id,id);people.push({resident:f.inspect,wallet:f.inspectFunds,railPlan:f.inspectRail});}return people;}
try{
 await start();const initial=await command('save');
 const review=await command('review-scenario',{kind:5});assert(review.confirmation>0);
 const loaded=await command('load-scenario',{kind:5,x:review.confirmation});
 console.log(JSON.stringify({phase:'loaded-region',notice:loaded.notice,stats:loaded.stats,railStops:loaded.rails.map(l=>l.stops.length)}));assert.equal(loaded.stats.population,2048,loaded.notice);assert.equal(loaded.stats.tick,0);assert(loaded.stats.paused);assert(loaded.undo);assert.equal(loaded.rails.length,4);assert(loaded.rails.every(l=>l.stops.length===8));
 checks.push('Reviewed fifth example creates all 2,048 residents and 32 served stations while retaining the previous city as a recoverable backup.');
 await command('view',{x:0,y:0,x2:128,y2:128});const startTick=(await command('set-running',{kind:1})).stats.tick;
 await client.wait(f=>f.stats.tick>=startTick+cycles,360000);await command('set-running',{kind:0});
 const saved=await command('save');assert(saved.stats.paused);assert.equal(saved.saved,saved.stats.tick);assert.equal(saved.stats.population,2048);assert.equal(saved.stats.wealthError,0);assert(saved.stats.arrived>0);
 const running=client.frames.filter(f=>f.stats.population===2048&&!f.stats.paused&&f.stats.tick>0),byTick=[...new Map(running.map(f=>[f.stats.tick,f])).values()].sort((a,b)=>a.stats.tick-b.stats.tick);
 assert(byTick.length>=cycles);for(const f of byTick){assert.equal(f.stats.population,2048);assert.equal(f.stats.wealthError,0);assert(f.actors.length<=128);assert.equal(new Set(f.actors.map(a=>a.id)).size,f.actors.length);assert(f.rails.every(l=>l.occupancy<=l.capacity));assert(f.bytes<=131072);}
 const intervals=byTick.slice(1).map((f,i)=>f.at-byTick[i].at),sorted=[...intervals].sort((a,b)=>a-b),observed=await inspect(),directory=native.dir,resource=memory(native.child.pid),selected=native.selection;
 checks.push('Real-time native cycles retain population and monetary conservation; ordinary frames remain below the unchanged 128 KiB limit with distinct real resident identities.');
 await stop();const resumed=await start(directory);assert.deepEqual(state(resumed),state(saved));assert.deepEqual(await inspect(),observed);
 checks.push('A fresh native process reopens the real 2,048-resident store with exact stats, all train projections and 33 complete inspect/wallet/rail-plan samples spanning the population.');
 const restoreReview=await command('review-restore');const restored=await command('restore-city',{x:restoreReview.confirmation});assert.deepEqual(state(restored),state(initial));assert(!restored.undo);
 checks.push('The large example does not consume or corrupt the existing one-use recovery of the previous city.');
 const report={passed:true,artifact_sha256:selected.artifact_sha256,compiler_sha256:selected.compiler_sha256,checks,cycles_observed:byTick.length,maximum_frame_bytes:Math.max(...client.frames.map(f=>f.bytes||0),...byTick.map(f=>f.bytes)),median_interval_ms:sorted[Math.floor(sorted.length/2)],p95_interval_ms:sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)],maximum_interval_ms:sorted.at(-1),cycles_per_second:intervals.length/((byTick.at(-1).at-byTick[0].at)/1000),...resource,sampled_residents:sampled.length,samples_sha256:hash(observed),saved_stats:saved.stats,commandTimes};
 fs.writeFileSync('evidence/region-live.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await stop();}
