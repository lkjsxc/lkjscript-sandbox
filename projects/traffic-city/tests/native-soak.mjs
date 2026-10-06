// Long-running native verification of an untouched copy of a legally grown city.
// Node observes and issues ordinary player commands; all simulation remains native.
import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import {startNative,connect,memory,root} from './native.mjs';
import {conserveRail} from './rail-helpers.mjs';

const source=process.env.PLAYER_CITY_DIR;
assert(source&&['rail-growth-','rail-large-','rail-next-'].some(prefix=>source.startsWith(root+'/runtime/'+prefix)),'Use an isolated city grown through normal player commands');
const cycles=Number(process.env.SOAK_CYCLES||12000),chunk=Number(process.env.SOAK_CHUNK||250),restartEvery=Number(process.env.SOAK_RESTART_EVERY||1000);
assert(Number.isInteger(cycles)&&cycles>=250&&cycles<=100000);
assert(Number.isInteger(chunk)&&chunk>=50&&cycles%chunk===0);
assert(Number.isInteger(restartEvery)&&restartEvery>=chunk&&restartEvery%chunk===0);
const selection=JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||root+'/.build/selection.json'));
const key=JSON.parse(fs.readFileSync(source+'/test-recovery.json')).key;
const directory=fs.mkdtempSync(root+'/runtime/native-soak-');
const evidence=root+'/'+(process.env.SOAK_EVIDENCE||'evidence/native-soak.json');
fs.writeFileSync(directory+'/selection.json',JSON.stringify(selection));
process.env.CITY_SELECTION=directory+'/selection.json';
const started=performance.now(),checkpoints=[],restarts=[],frameBytes=[],tickTimes=[];
let n,c,current,seq=0,initial,previousPeople,previousStats,restartCount=0;

function native(...args){const r=spawnSync(selection.bin,args,{encoding:'utf8',timeout:120000});assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout;}
function disk(path){let files=0,bytes=0;for(const ent of fs.readdirSync(path,{withFileTypes:true})){const name=path+'/'+ent.name;if(ent.isDirectory()){const child=disk(name);files+=child.files;bytes+=child.bytes;}else if(ent.isFile()){files++;bytes+=fs.statSync(name).size;}}return {files,bytes};}
function digest(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function quantiles(values){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);return {samples:values.length,median:sorted[Math.ceil(sorted.length*.5)-1],p95:sorted[Math.ceil(sorted.length*.95)-1],maximum:sorted.at(-1)};}
function report(passed,error){const result={passed,complete:passed,status:passed?'completed':error?'failed':'running',artifact_sha256:selection.artifact_sha256,source_directory:source,working_directory:directory,requested_cycles:cycles,completed_cycles:current&&initial?current.stats.tick-initial.stats.tick:0,wall_seconds:(performance.now()-started)/1000,environment:{cpu:os.cpus()[0].model,kernel:os.release()},method:'Copy of a legally grown native city. Ordinary running, pause, inspect and save commands only. Every checkpoint checks all resident identities, journey conservation, finite train capacity and continued completions. Every restart checks all resident/train/statistic fields, including after native backup/restore compaction. No population, money, routes or state injection.',before:initial?.stats,after:current?.stats,frame_bytes:quantiles(frameBytes),cycle_interval_ms:quantiles(tickTimes),checkpoints,restarts,...(error?{error:String(error)}:{})};fs.writeFileSync(evidence+'.next',JSON.stringify(result,null,2));fs.renameSync(evidence+'.next',evidence);return result;}
async function command(op,fields={}){const id=++seq;c.socket.send(JSON.stringify({id,token:op==='resume'?key:'',owner:op==='resume'?randomBytes(16).toString('hex'):'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));current=await c.wait(f=>f.ack===id,60000);assert.equal(current.status,1);return current;}
async function people(){const result=[];for(let id=1;id<=current.stats.population;id++)result.push((await command('inspect',{kind:id})).inspect);return result;}
async function start(){n=await startNative({directory,tick:1,name:'native-soak-'+restartCount});c=connect(n.address);seq=0;await c.wait(f=>f.seq===1);await command('resume');await command('view',{x:current.stats.originX+18,y:current.stats.originY+11,x2:26,y2:18});}
async function stop(){if(c){await c.close();c=null;}if(n){await n.stop();n=null;}}

native('data','backup','--root',source+'/data','--output',directory+'/seed.backup');
native('data','restore','--backup',directory+'/seed.backup','--root',directory+'/data');
fs.writeFileSync(directory+'/test-recovery.json',JSON.stringify({key}));
try{
 await start();assert(current.stats.paused);assert([128,256,512].includes(current.stats.population));initial=current;
 previousPeople=await people();previousStats=current.stats;conserveRail(current,previousPeople);console.log(JSON.stringify({stage:"initial resident snapshot verified",population:current.stats.population,tick:current.stats.tick}));
 for(let elapsed=0;elapsed<cycles;elapsed+=chunk){
  const from=current.stats.tick;await command('set-running',{kind:1});const index=c.frames.length;
  await c.wait(f=>f.stats.tick>=from+chunk,900000);await command('set-running',{kind:0});console.log(JSON.stringify({stage:'native interval complete; checking every resident',cycles:elapsed+chunk,tick:current.stats.tick,waiting:current.stats.waiting,arrivals:current.stats.arrived}));
  const frames=c.frames.slice(index).filter(f=>f.stats.tick>from&&f.stats.tick<=from+chunk);
  for(let i=0;i<frames.length;i++){frameBytes.push(frames[i].bytes);if(i&&frames[i].stats.tick===frames[i-1].stats.tick+1&&frames[i].ack===frames[i-1].ack)tickTimes.push(frames[i].at-frames[i-1].at);}
  const residents=await people();conserveRail(current,residents);
  assert.deepEqual(residents.map(r=>r.id),previousPeople.map(r=>r.id));
  assert.equal(current.stats.population,initial.stats.population);
  assert.equal(current.stats.cancelled,initial.stats.cancelled);
  assert.equal(current.stats.disconnected,0);
  assert(current.stats.cash>=0);assert(current.stats.arrived>previousStats.arrived,'Every checkpoint must include real completed journeys');
  assert(current.stats.railBoardings>previousStats.railBoardings,'Rail must keep carrying real passengers');
  for(let i=0;i<residents.length;i++){assert(residents[i].journeys>=previousPeople[i].journeys);}
  const sameJourney=residents.filter((r,i)=>[1,2,4,5,6].includes(r.state)&&r.departed===previousPeople[i].departed&&r.journeys===previousPeople[i].journeys);
  checkpoints.push({cycles:elapsed+chunk,stats:current.stats,rails:current.rails,resident_sha256:digest(residents),minimum_completed_journeys:Math.min(...residents.map(r=>r.journeys)),maximum_active_journey_cycles:Math.max(0,...residents.filter(r=>[1,2,4,5,6].includes(r.state)).map(r=>current.stats.tick-r.departed)),continuing_from_previous_checkpoint:sameJourney.length,maximum_wait:Math.max(...residents.map(r=>r.wait)),...memory(n.child.pid),store:disk(directory+'/data')});
  fs.writeFileSync(directory+'/residents-'+(elapsed+chunk)+'.json',JSON.stringify(residents));
  previousPeople=residents;previousStats=current.stats;
  if((elapsed+chunk)%restartEvery===0||elapsed+chunk===cycles){
   await command('save');const saved={stats:current.stats,rails:current.rails,people:residents};
   const before=disk(directory+'/data');await stop();native('data','verify','--root',directory+'/data');
   const backup=directory+'/checkpoint-'+(elapsed+chunk)+'.backup',staged=directory+'/restored-'+(elapsed+chunk);
   native('data','backup','--root',directory+'/data','--output',backup);
   native('data','restore','--backup',backup,'--root',staged);native('data','verify','--root',staged);
   fs.renameSync(directory+'/data',directory+'/history-'+(elapsed+chunk));fs.renameSync(staged,directory+'/data');
   restartCount++;await start();assert.deepEqual({stats:current.stats,rails:current.rails,people:await people()},saved);
   restarts.push({cycles:elapsed+chunk,exact_state_sha256:digest(saved),before,after:disk(directory+'/data'),backup_bytes:fs.statSync(backup).size});
  }
  report(false);console.log(JSON.stringify({cycles:elapsed+chunk,tick:current.stats.tick,arrivals:current.stats.arrived,boardings:current.stats.railBoardings,waiting:current.stats.waiting,restarts:restartCount}));
  // Keep the observer's memory bounded without changing the native workload.
  c.frames.splice(0,Math.max(0,c.frames.length-1));
 }
 const result=report(true);console.log(JSON.stringify({passed:true,completed_cycles:result.completed_cycles,wall_seconds:result.wall_seconds,restarts:restarts.length,evidence}));
}catch(error){report(false,error);throw error;}finally{await stop().catch(()=>{});}
