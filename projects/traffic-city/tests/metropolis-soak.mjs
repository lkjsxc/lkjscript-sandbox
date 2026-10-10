// Four independent million-person native sessions, not a population-label demo.
import assert from 'node:assert/strict';import fs from 'node:fs';import {spawnSync} from 'node:child_process';
import {startMetro,client,selection,memory,root} from './metropolis-native.mjs';
const cycles=Number(process.env.METRO_SOAK_CYCLES||240);if(!Number.isInteger(cycles)||cycles<80||cycles>2000)throw Error('Choose 80..2000 soak cycles.');
const host=await startMetro({name:'metropolis-soak',tick:250});const clients=[],samples=[];
const hz=Number(spawnSync('getconf',['CLK_TCK'],{encoding:'utf8'}).stdout);
function cpu(){const text=fs.readFileSync('/proc/'+host.child.pid+'/stat','utf8'),fields=text.slice(text.lastIndexOf(')')+2).split(' ');return (Number(fields[11])+Number(fields[12]))/hz;}
const percentile=(xs,q)=>{const a=[...xs].sort((x,y)=>x-y);return a[Math.floor((a.length-1)*q)]??0;};
try{
 for(let i=0;i<4;i++){const c=await client(host);clients.push(c);const f=await c.command('scenario',{kind:1000000});assert.equal(f.stats.population,1000000);}
 await Promise.all(clients.map(c=>c.wait(f=>f.stats.population===1000000&&f.stats.tick>=20)));
 const initial=clients.map(c=>c.frames.at(-1).stats.tick),started=performance.now(),startCpu=cpu(),startMemory=memory(host.child.pid);
 const timer=setInterval(()=>samples.push({at_ms:performance.now()-started,...memory(host.child.pid),ticks:clients.map(c=>c.frames.at(-1).stats.tick)}),2000);
 try{await Promise.all(clients.map((c,i)=>c.wait(f=>f.stats.tick>=initial[i]+cycles,cycles*650+30000)));}finally{clearInterval(timer);}
 const elapsed=performance.now()-started,cpuSeconds=cpu()-startCpu,finalMemory=memory(host.child.pid);
 const streams=clients.map((c,i)=>{const frames=c.frames.filter(f=>f.stats.population===1000000&&f.stats.tick>initial[i]).filter((f,j,a)=>j===0||f.stats.tick!==a[j-1].stats.tick),deltas=frames.slice(1).map((f,j)=>f.at-frames[j].at);for(const f of frames){assert.equal(f.stats.population,1000000);assert.equal(f.stats.groups,256);assert.equal(f.stats.massError,0);assert.equal(f.stats.journeyError,0);assert(f.bytes<20000);}assert(frames.length>=cycles);assert(percentile(deltas,.95)<750);return{frames:frames.length,median_delivery_ms:percentile(deltas,.5),p95_delivery_ms:percentile(deltas,.95),maximum_delivery_ms:Math.max(...deltas),maximum_frame_bytes:Math.max(...frames.map(f=>f.bytes)),final:frames.at(-1).stats};});
 assert(finalMemory.peak_rss_kib<131072);assert(finalMemory.rss_kib-startMemory.rss_kib<32768);
 const report={passed:true,artifact_sha256:selection.artifact_sha256,cycles,concurrent_cities:4,people_per_city:1000000,elapsed_ms:elapsed,native_cpu_seconds:cpuSeconds,native_one_core_percent:cpuSeconds/(elapsed/1000)*100,initial_memory:startMemory,final_memory:finalMemory,streams,samples};
 fs.writeFileSync(root+'/evidence/metropolis-soak.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,samples:undefined},null,2));
}finally{for(const c of clients)await c.close().catch(()=>{});await host.stop();}
const quota=await startMetro({name:'metropolis-quota',savedCityLimit:1});const a=await client(quota),b=await client(quota);
try{assert.equal(a.resumed.status,1);assert.equal(b.resumed.status,4);assert.equal(b.resumed.stats.population,0);const f=await a.command('save');assert.equal(f.status,1);console.log('PASS: quota refusal does not modify or evict an existing city');}finally{await a.close();await b.close();await quota.stop();}
