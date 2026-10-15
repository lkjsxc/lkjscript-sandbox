// Same native 2,048-person save, complete wire-scene comparison, and real delivery costs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {startNative,connect,root,memory} from './native.mjs';
const candidate=process.env.CITY_SELECTION||'.build/selection.json',baseline=process.env.BASELINE_SELECTION||'.build/baseline.json';
const token=randomBytes(32).toString('hex'),owner=randomBytes(16).toString('hex');
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const clockTicks=Number(spawnSync('getconf',['CLK_TCK'],{encoding:'utf8'}).stdout);assert(clockTicks>0);
const cpu=pid=>{const s=fs.readFileSync(`/proc/${pid}/stat`,'utf8').split(') ').at(-1).split(' ');return (Number(s[11])+Number(s[12]))/clockTicks;};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const scene=f=>{const copy=structuredClone(f);for(const key of ['seq','ack','saved','notice','bytes','at'])delete copy[key];return copy;};
let host,client,seq=0;
async function command(op,fields={}){
 const id=++seq;client.socket.send(JSON.stringify({id,token:op==='resume'?token:'',owner:op==='resume'?owner:'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));
 const f=await client.wait(f=>f.ack===id,180000);assert.equal(f.status,1,f.notice);return f;
}
async function open(options){host=await startNative(options);client=connect(host.address);seq=0;await client.wait(f=>f.seq===1);return command('resume');}
async function stop(){if(client){await client.close();client=null;}if(host){await host.stop();host=null;}}
function cli(bin,args){const r=spawnSync(bin,args,{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);}
const report={passed:false,method:'Serial isolated native hosts restore one baseline-created, warmed Commuter Boroughs backup. Compare every wire-scene field except transport sequence/ack/save/notice metadata. Measure paused view acknowledgements, native CPU over a three-second idle window, and 32 delivered cycles including ordinary autosave. Times are shared-host observations, not browser FPS or guarantees.',results:[]};
const persist=()=>fs.writeFileSync('evidence/view-scan-live.json',JSON.stringify(report,null,2)+'\n');
try{
 process.env.CITY_SELECTION=baseline;await open({name:'view-scan-seed',tick:500});
 const review=await command('review-scenario',{kind:6});const seedStart=performance.now();const loaded=await command('load-scenario',{kind:6,x:review.confirmation});
 assert.equal(loaded.stats.population,2048);await command('set-running',{kind:1});await client.wait(f=>f.stats.tick>=32,240000);
 const pausedSeed=await command('set-running',{kind:0});await command('save');const seedStats=pausedSeed.stats,seedDir=host.dir,bin=host.selection.bin;
 report.seed_tick=seedStats.tick;report.seed_generation_and_warmup_ms=performance.now()-seedStart;await stop();
 const backup=seedDir+'/seed.backup';cli(bin,['data','backup','--root',seedDir+'/data','--output',backup]);
 const allFrames=[],allInspections=[];
 for(const [name,selection]of [['before',baseline],['after',candidate]]){
  process.env.CITY_SELECTION=selection;const directory=fs.mkdtempSync(root+'/runtime/view-scan-'+name+'-');cli(bin,['data','restore','--backup',backup,'--root',directory+'/data']);
  const restored=await open({name:'view-scan-'+name,directory,tick:500});assert.deepEqual(restored.stats,seedStats,'Identical restored City');
  const latencies=[],projections=[];
  for(let i=0;i<12;i++){const start=performance.now();const frame=await command('view',{x:0,y:0,x2:128,y2:128});latencies.push(performance.now()-start);projections.push(scene(frame));}
  for(const projection of projections)assert.deepEqual(projection,projections[0],'Paused view is deterministic');
  const idleStart=performance.now(),cpuStart=cpu(host.child.pid),framesStart=client.frames.length;await sleep(3000);
  const idleWallMs=performance.now()-idleStart,idleCpuMs=(cpu(host.child.pid)-cpuStart)*1000,idleFrames=client.frames.length-framesStart;
  const inspections=[];
  for(const fields of [{x:0,y:0},{x:64,y:64},{kind:1},{kind:2048},{kind:99999},{x:64,y:64,x2:1}])inspections.push(scene(await command('inspect',fields)));
  // End with the same empty inspected identity and all-city view in both arms.
  await command('inspect',{kind:99999});const started=await command('set-running',{kind:1}),begin=performance.now(),lastTick=seedStats.tick+32;
  await client.wait(f=>f.seq>started.seq&&f.stats.tick>=lastTick,240000);const pauseStart=performance.now();const paused=await command('set-running',{kind:0});const pauseMs=performance.now()-pauseStart;
  const byTick=new Map();for(const frame of client.frames)if(frame.seq>started.seq&&!frame.stats.paused&&frame.stats.tick>seedStats.tick&&frame.stats.tick<=lastTick&&!byTick.has(frame.stats.tick))byTick.set(frame.stats.tick,frame);
  const frames=[...byTick.values()].sort((a,b)=>a.stats.tick-b.stats.tick);assert.equal(frames.length,32);
  for(const f of frames){assert.equal(f.stats.population,2048);assert.equal(f.stats.wealthError,0);assert.equal(f.stats.cancelled,0);assert(f.rails.every(l=>l.occupancy<=l.capacity));}
  assert(frames.some(f=>f.saved>=seedStats.tick+20),'Normal autosave continues');
  const simulationWallMs=performance.now()-begin,saveStart=performance.now(),saved=await command('save');const saveMs=performance.now()-saveStart;
  assert.equal(saved.saved,saved.stats.tick);assert.deepEqual(saved.stats,paused.stats);
  const intervals=frames.slice(1).map((f,i)=>f.at-frames[i].at);
  const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length,p95=xs=>[...xs].sort((a,b)=>a-b)[Math.floor((xs.length-1)*.95)];
  const scenes=frames.map(scene);allFrames.push(scenes);allInspections.push({projections,inspections});
  const row={name,artifact_sha256:host.selection.artifact_sha256,population:2048,requested_tick_ms:500,view_ack_mean_ms:mean(latencies),view_ack_p95_ms:p95(latencies),view_ack_samples_ms:latencies,idle_wall_ms:idleWallMs,idle_cpu_ms:idleCpuMs,idle_frames:idleFrames,cycles:32,simulation_wall_ms:simulationWallMs,mean_delivered_ms:mean(intervals),p95_delivered_ms:p95(intervals),pause_ack_ms:pauseMs,save_ack_ms:saveMs,memory:memory(host.child.pid),frames_sha256:digest(scenes),inspections_sha256:digest(allInspections.at(-1)),first_cycle:frames[0].stats.tick,last_cycle:frames.at(-1).stats.tick,visible_walkers:frames.at(-1).streetWalkers,visible_drivers:frames.at(-1).streetDrivers,rendered_actors:frames.at(-1).actors.length};
  report.results.push(row);persist();console.log(row);await stop();
 }
 assert.deepEqual(allFrames[1],allFrames[0],'Every moving wire-scene field must match on all 32 identical native cycles');
 assert.deepEqual(allInspections[1],allInspections[0],'All paused projections and inspections must match');
 report.passed=true;report.exact_scene_comparisons=32+12+6;persist();console.log('Exact native scenes and inspections:',report.exact_scene_comparisons);
}finally{await stop();}
