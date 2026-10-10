// Same saved 2,048-person city in two isolated stores, normal native autosave.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';import {spawnSync} from 'node:child_process';
import {startNative,connect,root,memory} from './native.mjs';
const candidate=process.env.CITY_SELECTION||'.build/selection.json',baseline=process.env.BASELINE_SELECTION||'.build/baseline.json';
const token=randomBytes(32).toString('hex'),owner=randomBytes(16).toString('hex');
let host,client,seq=0;
async function command(op,fields={}){const id=++seq;client.socket.send(JSON.stringify({id,token:op==='resume'?token:'',owner:op==='resume'?owner:'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));const f=await client.wait(f=>f.ack===id,180000);assert.equal(f.status,1,f.notice);return f}
async function open(options){host=await startNative(options);client=connect(host.address);seq=0;await client.wait(f=>f.seq===1);return command('resume')}
async function stop(){if(client){await client.close();client=null}if(host){await host.stop();host=null}}
function cli(bin,args){const r=spawnSync(bin,args,{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr)}
const results=[];let generationMs,seedStats;
try{
 process.env.CITY_SELECTION=baseline;await open({name:'hotpath-live-seed',tick:500});const review=await command('review-scenario',{kind:6});
 const began=performance.now();const seed=await command('load-scenario',{kind:6,x:review.confirmation});generationMs=performance.now()-began;assert.equal(seed.stats.population,2048);assert.equal(seed.stats.tick,0);await command('save');seedStats=seed.stats;
 const seedDir=host.dir,bin=host.selection.bin;await stop();const backup=seedDir+'/seed.backup';cli(bin,['data','backup','--root',seedDir+'/data','--output',backup]);
 for(const [name,selection]of [['before',baseline],['after',candidate]]){
  process.env.CITY_SELECTION=selection;const directory=fs.mkdtempSync(root+'/runtime/hotpath-live-'+name+'-');cli(bin,['data','restore','--backup',backup,'--root',directory+'/data']);
  const restored=await open({name:'hotpath-live-'+name,directory,tick:500});assert.deepEqual(restored.stats,seedStats,'Identical saved city at cycle zero');
  const start=await command('set-running',{kind:1});const begin=performance.now();await client.wait(f=>f.seq>start.seq&&f.stats.tick>=32,240000);const pauseStart=performance.now();const paused=await command('set-running',{kind:0});const pauseMs=performance.now()-pauseStart;const simMs=performance.now()-begin;
  const byTick=new Map();for(const f of client.frames)if(f.seq>start.seq&&!f.stats.paused&&f.stats.tick>=1&&f.stats.tick<=32&&!byTick.has(f.stats.tick))byTick.set(f.stats.tick,f);
  const frames=[...byTick.values()].sort((a,b)=>a.stats.tick-b.stats.tick);assert.equal(frames.length,32);
  for(const f of frames){assert.equal(f.stats.population,2048);assert.equal(f.stats.wealthError,0);assert.equal(f.stats.cancelled,0);assert(f.rails.every(l=>l.occupancy<=l.capacity))}
  assert(frames.some(f=>f.saved>=20),'Normal autosaves remain active');
  const saveStart=performance.now();const saved=await command('save');const saveMs=performance.now()-saveStart;assert.equal(saved.saved,saved.stats.tick);assert.deepEqual(saved.stats,paused.stats);
  const intervals=frames.slice(8).map((f,i)=>f.at-frames[i+7].at),mean=intervals.reduce((a,b)=>a+b,0)/intervals.length;
  const row={name,artifact_sha256:host.selection.artifact_sha256,population:2048,requested_tick_ms:500,ticks:32,simulation_wall_ms:simMs,mean_delivered_ms:mean,p95_delivered_ms:[...intervals].sort((a,b)=>a-b)[Math.floor((intervals.length-1)*.95)],pause_ack_ms:pauseMs,save_ack_ms:saveMs,memory:memory(host.child.pid),stats:paused.stats};results.push(row);console.log(row);await stop();
 }
 fs.writeFileSync('evidence/hotpath-live.json',JSON.stringify({passed:true,method:'Serial isolated sessions restored from the identical native seed backup. Generation measured separately; simulation includes native views, transport and ordinary autosave. Shared host; one run per arm.',baseline_generation_ack_ms:generationMs,results},null,2)+'\n');
}finally{await stop()}
