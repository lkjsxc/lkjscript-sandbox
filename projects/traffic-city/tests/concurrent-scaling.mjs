// Four independent cities share one native interactive process and its configured
// concurrency/queue limits. This synthetic target deliberately excludes persistence.
import fs from 'node:fs';import os from 'node:os';import assert from 'node:assert/strict';
import {startNative,connect,memory,root} from './native.mjs';
const samples=Number(process.env.CONCURRENT_SAMPLES||144),rows=Number(process.env.CONCURRENT_ROWS||32);
assert([8,32,64].includes(rows));assert(samples>=144&&samples<=1200);
const n=await startNative({target:'benchmark-live',tick:500,name:'concurrent-scale-'+rows}),clients=[];
try {
 for(let i=0;i<4;i++){const c=connect(n.address,'/live?'+rows);clients.push(c);await c.wait(f=>f.stats.tick>=1)}
 await Promise.all(clients.map(c=>c.wait(f=>f.stats.tick>=samples+5,300000)));
 const cities=clients.map((c,index)=>{
  const frames=c.frames.filter(f=>f.stats.tick>=5&&f.stats.tick<=samples+5),intervals=frames.slice(1).map((f,i)=>f.at-frames[i].at);
  assert.equal(intervals.length,samples);assert.equal(frames.at(-1).stats.population,rows*4);assert(frames.every(f=>f.bytes<131072));
  const sorted=intervals.slice().sort((a,b)=>a-b),q=p=>sorted[Math.ceil(sorted.length*p)-1];
  return {city:index+1,tiles:rows*128,population:rows*4,samples,median_tick_ms:q(.5),p95_tick_ms:q(.95),maximum_tick_ms:q(1),over_750_ms:intervals.filter(t=>t>750).length,effective_ticks_per_second:1000*intervals.length/intervals.reduce((a,b)=>a+b,0),mean_frame_bytes:frames.reduce((a,f)=>a+f.bytes,0)/frames.length,max_frame_bytes:Math.max(...frames.map(f=>f.bytes)),stats:frames.at(-1).stats,intervals};
 });
 const report={passed:true,artifact_sha256:n.selection.artifact_sha256,workload:'Four dense cities in one native process. Configured maximum_concurrent_tasks=2 and maximum_queued_tasks=4 unchanged. 500ms requested timer, 144 measured intervals after warmup, including cache pruning. Native simulation, retained state, bounded views, encoding and socket output included; persistence excluded. This observes supported session contention, not a claim that the maximum resident admission runs at 2Hz.',environment:{cpu:os.cpus()[0].model,kernel:os.release()},...memory(n.child.pid),cities};
 fs.writeFileSync(root+'/evidence/concurrent-scaling-'+rows+'.json',JSON.stringify(report,null,2));console.log({...report,cities:cities.map(({intervals,...r})=>r)});
} finally {await Promise.all(clients.map(c=>c.close().catch(()=>{})));await n.stop()}
