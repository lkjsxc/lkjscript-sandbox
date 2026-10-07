// Serial native-session delivery with ordinary autosave, not browser FPS.
// Route-work scheduling changes deliberately; do not require old/new histories
// to be identical. Snapshot decision equivalence is tested separately.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {startNative,connect,memory} from './native.mjs';
const baseline=process.env.BASELINE_SELECTION,candidate=process.env.CITY_SELECTION||'.build/selection.json';
assert(baseline,'Set BASELINE_SELECTION to the retained published predecessor.');
const cycles=Number(process.env.PLANNING_CYCLES||64);
assert(Number.isInteger(cycles)&&cycles>=32&&cycles<=512);
const selections=[baseline,candidate].map(f=>JSON.parse(fs.readFileSync(f)));
assert.equal(selections[0].compiler_sha256,selections[1].compiler_sha256);assert.notEqual(selections[0].artifact_sha256,selections[1].artifact_sha256);
const results=[];
const quantile=(a,q)=>[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.ceil(a.length*q)-1)];
try{
 for(const [name,selection]of [['before',baseline],['after',candidate]]){
  process.env.CITY_SELECTION=selection;
  let host,client,id=0;const token=randomBytes(32).toString('hex'),owner=randomBytes(16).toString('hex');
  try{
   host=await startNative({name:'planning-delivery-'+name,tick:500});client=connect(host.address);await client.wait(f=>f.seq===1);
   async function command(op,fields={}){const seq=++id;client.socket.send(JSON.stringify({id:seq,token:op==='resume'?token:'',owner:op==='resume'?owner:'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));const f=await client.wait(f=>f.ack===seq,120000);assert.equal(f.status,1,op+': '+f.notice);return f}
   await command('resume');const review=await command('review-scenario',{kind:4});const initial=await command('load-scenario',{kind:4,x:review.confirmation});assert.equal(initial.stats.population,1024);assert.equal(initial.stats.tick,0);assert.equal(initial.rails.length,4);
   await command('view',{x:40,y:44,x2:32,y2:32});const start=await command('set-running',{kind:1});await client.wait(f=>f.seq>start.seq&&f.stats.tick>=cycles,cycles*10000);await command('set-running',{kind:0});
   const frames=[];for(let tick=1;tick<=cycles;tick++){const f=client.frames.find(f=>f.seq>start.seq&&f.stats.tick===tick&&!f.stats.paused);assert(f,'Missing actual native cycle '+tick);assert.equal(f.stats.population,1024);assert.equal(f.stats.wealthError,0);assert.equal(f.stats.cancelled,0);assert(f.rails.every(l=>l.occupancy<=l.capacity));assert(f.actors.length<=128);assert(f.cells.length<=1024);frames.push(f)}
   assert(frames.some(f=>f.saved>=20),'Normal autosave must be observed');const saved=await command('save');assert.equal(saved.saved,saved.stats.tick);
   const intervals=frames.slice(8).map((f,i)=>f.at-frames[i+7].at),mean=intervals.reduce((a,b)=>a+b,0)/intervals.length;
   const result={name,artifact_sha256:host.selection.artifact_sha256,cycles,measured_ticks:[9,cycles],population:1024,requested_tick_ms:500,viewport:[40,44,32,32],mean_delivered_ms:mean,p95_delivered_ms:quantile(intervals,.95),maximum_delivered_ms:Math.max(...intervals),cycles_per_second:1000/mean,memory:memory(host.child.pid),maximum_frame_bytes:Math.max(...frames.map(f=>f.bytes)),final_stats:frames.at(-1).stats};results.push(result);console.log(JSON.stringify(result,null,2));
  }finally{if(client)await client.close();if(host)await host.stop()}
 }
 const report={passed:true,compiler_sha256:selections[0].compiler_sha256,method:'Serial disposable 1,024-resident native sessions, normal 500 ms requested timer and autosave, 1,024-cell view. Shared host; not rendering FPS or a hard real-time guarantee. Histories may differ because useful route requests receive budget sooner.',results};
 fs.writeFileSync('evidence/planning-delivery.json',JSON.stringify(report,null,2));
}finally{process.env.CITY_SELECTION=candidate}
