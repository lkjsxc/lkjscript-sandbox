// Legal 256-to-512 expansion with two compact mixed-use neighborhoods.
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {randomBytes} from 'node:crypto';
import {startNative,connect,root} from './native.mjs';import {conserveRail} from './rail-helpers.mjs';
const source=process.env.PLAYER_CITY_DIR;assert(source?.startsWith(root+'/runtime/rail-large-'));
const key=JSON.parse(fs.readFileSync(source+'/test-recovery.json')).key,selected=JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||root+'/.build/selection.json'));
const directory=fs.mkdtempSync(root+'/runtime/rail-next-'),events=[],checks=[];let n,c,seq=0,current;
for(const args of [['data','backup','--root',source+'/data','--output',directory+'/seed.backup'],['data','restore','--backup',directory+'/seed.backup','--root',directory+'/data']]){const r=spawnSync(selected.bin,args,{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr)}
async function command(op,fields={}){const id=++seq;c.socket.send(JSON.stringify({id,token:op==='resume'?key:'',owner:op==='resume'?randomBytes(16).toString('hex'):'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));current=await c.wait(f=>f.ack===id,60000);assert.equal(current.status,1);if(op!=='inspect'){events.push({op,...fields,stats:current.stats,notice:current.notice});console.log(op,current.stats.tick,current.stats.cash,current.stats.population,current.stats.waiting,current.notice)}return current}
async function build(x,y,x2,y2,kind){const before=current.stats;await command('build',{x:x+before.originX,y:y+before.originY,x2:x2+before.originX,y2:y2+before.originY,kind});assert.equal(current.stats.version,before.version+1,current.notice)}
const place=(x,y,kind)=>build(x,y,x,y,kind);
async function runUntil(predicate,limit=2400){const start=current.stats.tick;await command('set-running',{kind:1});while(current.stats.tick<start+limit){const boundary=Math.min(start+limit,current.stats.tick+200);current=await c.wait(f=>f.stats.tick>start&&(predicate(f)||f.stats.tick>=boundary),180000);if(predicate(current)||current.stats.tick>=start+limit)break;await command('view',{x:current.stats.originX+18,y:current.stats.originY+11,x2:26,y2:18});c.frames.splice(0,Math.max(0,c.frames.length-1))}await command('set-running',{kind:0})}
async function people(){const out=[];for(let id=1;id<=current.stats.population;id++)out.push((await command('inspect',{kind:id})).inspect);return out}
try {
 n=await startNative({name:'rail-grow-next',directory,tick:1});c=connect(n.address);await c.wait(f=>f.seq===1);await command('resume');fs.writeFileSync(directory+'/test-recovery.json',JSON.stringify({key,address:n.address}));
 assert.equal(current.stats.population,256);assert.equal(current.stats.level,5);const before=current.stats;
 await runUntil(f=>f.stats.cash>=12500,5000);assert(current.stats.cash>=12500,'existing residents must earn the expansion funds');
 checks.push('actual existing visits earn all further construction and district funds');
 // Both neighborhoods join the existing eastern streets. Short walk links cross
 // each block, while jobs and services are placed before their new households.
 for(const base of [30,40]){
  for(const x of [base,base+4])await build(x,-20,x,3,1);
  for(const y of [-18,-14,-10,-6,-2,2])await build(base+1,y,base+3,y,1);
  for(const x of [base+3,base+5])for(const y of [-19,-15,-11,-7])await place(x,y,4);
  for(const y of [-19,-15,-11,-7])await place(base+2,y,7);
  for(const[x,y,kind]of [[base-1,-18,5],[base+5,-18,6],[base-1,-14,5],[base+5,-14,6],[base-1,-10,6],[base+5,-10,5]])await place(x,y,kind);
 }
 await build(30,2,44,2,1);
 for(const base of [30,40])for(const x of [base-1,base+1])for(const y of [-19,-17,-15,-13,-11,-9,-7,-5])await place(x,y,3);
 assert.equal(current.stats.population,512);const populated=current.stats;
 await runUntil(f=>f.stats.growth,2400);
 const goal=current.stats;
 if(goal.growth){await command('grow');assert.equal(current.stats.level,6);assert.equal(current.stats.cash,goal.cash-goal.growthCost);}
 assert.equal(current.stats.cancelled,0);
 checks.push('32 homes,16 workplaces,12 nearby services and walking links reach512 people using earned funds; growth readiness is recorded without inventing success');
 const residents=await people();conserveRail(current,residents);assert(current.stats.railBoardings>before.railBoardings);assert(current.stats.arrived>before.arrived);
 checks.push('all512 residents and original rail services conserve every requested journey while the new districts operate');
 await command('save');const saved={stats:current.stats,rails:current.rails};await c.close();c=connect(n.address);seq=0;await c.wait(f=>f.seq===1);await command('resume');assert.deepEqual({stats:current.stats,rails:current.rails},saved);assert.deepEqual(await people(),residents);
 checks.push('all 512 resident fields, train states and city statistics restore exactly from the native save');
 const report={passed:true,artifact_sha256:n.selection.artifact_sha256,source_directory:directory,expanded:goal.growth,populated,goal,method:'Legal continuation of the original $900 city; all growth funded by completed native journeys, no injected population, money, routes or train state.',checks,before,after:current.stats,rails:current.rails,events};fs.writeFileSync(root+'/evidence/rail-grow-next.json',JSON.stringify(report,null,2));console.log({...report,events:undefined});
}catch(error){const residents=c&&current?await people().catch(()=>[]):[];fs.writeFileSync(root+'/evidence/rail-grow-next-attempt.json',JSON.stringify({passed:false,error:String(error),source_directory:directory,stats:current?.stats,rails:current?.rails,residents,events},null,2));throw error}finally{if(c)await c.close().catch(()=>{});if(n)await n.stop().catch(()=>{})}
