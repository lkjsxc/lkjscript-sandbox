// Measure delivered native cycles with the normal autosave and session policy.
// Both hosts create disposable stores; no browser profile or player key is used.
import fs from 'node:fs';import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';
import {startNative,connect,memory} from './native.mjs';
const candidate=process.env.CITY_SELECTION||'.build/selection.json',baseline=process.env.BASELINE_SELECTION;
assert(baseline,'Set BASELINE_SELECTION to a retained ungated waterfront selection.');
const results=[];
const quantile=(v,q)=>[...v].sort((a,b)=>a-b)[Math.min(v.length-1,Math.floor((v.length-1)*q))];
for(const [name,selection]of [['before',baseline],['after',candidate]]){
 process.env.CITY_SELECTION=selection;let host,client,seq=0;const token=randomBytes(32).toString('hex'),owner=randomBytes(16).toString('hex');
 try{
  host=await startNative({name:'planning-live-'+name,tick:500});client=connect(host.address);await client.wait(f=>f.seq===1);
  async function command(op,fields={}){const id=++seq;client.socket.send(JSON.stringify({id,token:op==='resume'?token:'',owner:op==='resume'?owner:'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));const f=await client.wait(f=>f.ack===id,120000);assert.equal(f.status,1,f.notice);return f}
  await command('resume');const review=await command('review-scenario',{kind:4});const city=await command('load-scenario',{kind:4,x:review.confirmation});assert.equal(city.stats.population,1024);assert.equal(city.rails.length,4);
  await command('view',{x:40,y:44,x2:32,y2:32});const start=await command('set-running',{kind:1});const begin=performance.now();await client.wait(f=>f.seq>start.seq&&f.stats.tick>=32,240000);await command('set-running',{kind:0});
  const byTick=new Map();for(const f of client.frames)if(f.seq>start.seq&&!f.stats.paused&&f.stats.tick>=1&&f.stats.tick<=32&&!byTick.has(f.stats.tick))byTick.set(f.stats.tick,f);
  const frames=[...byTick.values()].sort((a,b)=>a.stats.tick-b.stats.tick);assert.equal(frames.length,32);for(const f of frames){assert.equal(f.stats.wealthError,0);assert.equal(f.stats.population,1024);assert(f.stats.requested>=f.stats.arrived+f.stats.cancelled);assert(f.rails.every(l=>l.occupancy<=l.capacity))}
  assert(frames.some(f=>f.saved>=20),'Normal autosaves are enabled');const intervals=frames.slice(8).map((f,i)=>f.at-frames[i+7].at);const mean=intervals.reduce((a,b)=>a+b,0)/intervals.length;
  const result={name,artifact_sha256:host.selection.artifact_sha256,population:1024,viewport:[40,44,32,32],requested_tick_ms:500,ticks:frames.length,measured_ticks:[9,32],wall_ms:performance.now()-begin,mean_delivered_ms:mean,p95_delivered_ms:quantile(intervals,.95),maximum_delivered_ms:Math.max(...intervals),cycles_per_second:1000/mean,memory:memory(host.child.pid),maximum_frame_bytes:Math.max(...frames.map(f=>f.bytes)),stats:frames.map(f=>f.stats)};results.push(result);console.log(JSON.stringify({...result,stats:undefined}));
 }finally{if(client)await client.close();if(host)await host.stop()}
}
assert.deepEqual(results[1].stats,results[0].stats,'Same native statistics at all 32 cycles with ordinary autosave.');
const report={passed:true,full_tick_statistics_equal:true,method:'Serial disposable native sessions; usual 500ms requested tick, 1,024-cell detail and autosave. Shared development host, not an isolated hardware benchmark or browser FPS measurement.',results};fs.writeFileSync('evidence/planning-live.json',JSON.stringify(report,null,2));console.log('PASS live native statistics and delivery measurements');
