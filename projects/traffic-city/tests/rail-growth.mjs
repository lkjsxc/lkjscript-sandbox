// Extend a genuinely played city using legal commands and earned income only.
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {randomBytes} from 'node:crypto';
import {startNative,connect,root} from './native.mjs';import {conserveRail} from './rail-helpers.mjs';
const source=process.env.PLAYER_CITY_DIR;assert(source?.startsWith(root+'/runtime/rail-player-'));
const key=JSON.parse(fs.readFileSync(source+'/test-recovery.json')).key,selected=JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||root+'/.build/selection.json'));
const directory=fs.mkdtempSync(root+'/runtime/rail-growth-'),events=[],checks=[];let n,c,seq=0,current;
for(const args of [['data','backup','--root',source+'/data','--output',directory+'/seed.backup'],['data','restore','--backup',directory+'/seed.backup','--root',directory+'/data']]){const r=spawnSync(selected.bin,args,{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr)}
async function command(op,fields={}){const id=++seq;c.socket.send(JSON.stringify({id,token:op==='resume'?key:'',owner:op==='resume'?randomBytes(16).toString('hex'):'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));current=await c.wait(f=>f.ack===id,60000);assert.equal(current.status,1);if(op!=='inspect'){events.push({op,...fields,stats:current.stats,notice:current.notice});console.log(op,current.stats.tick,current.stats.cash,current.stats.population,current.stats.waiting,current.notice)}return current}
async function edit(op,x,y,x2,y2,kind=0){const s=current.stats;await command(op,{x:x+s.originX,y:y+s.originY,x2:x2+s.originX,y2:y2+s.originY,kind});assert.equal(current.stats.version,s.version+1,current.notice)}
const build=(x,y,x2,y2,kind)=>edit('build',x,y,x2,y2,kind),place=(x,y,kind)=>build(x,y,x,y,kind);
async function runUntil(predicate,limit=1200){const start=current.stats.tick;await command('set-running',{kind:1});await c.wait(f=>f.stats.tick>start&&(predicate(f)||f.stats.tick>=start+limit),300000);await command('set-running',{kind:0})}
async function people(){const out=[];for(let id=1;id<=current.stats.population;id++)out.push((await command('inspect',{kind:id})).inspect);return out}
async function grow(){if(!current.stats.growth)await runUntil(f=>f.stats.growth);assert(current.stats.growth,'goal remains unavailable: '+JSON.stringify(current.stats));const before=current.stats;await command('grow');assert.equal(current.stats.level,before.level+1);assert.equal(current.stats.cash,before.cash-before.growthCost)}
try{
 n=await startNative({name:'rail-growth',directory,tick:1});c=connect(n.address);await c.wait(f=>f.seq===1);await command('resume');fs.writeFileSync(directory+'/test-recovery.json',JSON.stringify({key,address:n.address}));
 assert.equal(current.stats.population,32);assert.equal(current.rails.length,1);await grow();
 await place(24,8,4);await place(24,12,4);
 for(const[x,y]of [[4,7],[7,9],[4,13],[7,13]])await place(x,y,3);
 await place(22,12,7);await edit('build-rail',9,13,22,13);
 await build(14,10,15,10,2);for(const x of [5,8])await command('signal',{x:x+current.stats.originX,y:10+current.stats.originY,kind:3});await build(6,11,7,11,7);
 await grow();assert.equal(current.stats.population,64);assert.equal(current.rails.length,2);conserveRail(current,await people());
 checks.push('earned funds, two employment destinations, four homes, a second useful rail line and paid junction/bridge improvements reach district3 with 64 residents');
 await runUntil(f=>f.stats.cash>=1900);assert(current.stats.cash>=1900,'64 residents must earn the next expansion budget');
 for(const[x,y]of [[24,9],[24,10],[24,11],[22,9]])await place(x,y,4);
 for(const[x,y]of [[4,9],[4,10],[4,11],[4,12],[6,8],[6,9],[6,12],[6,13]])await place(x,y,3);
 await grow();assert.equal(current.stats.population,128);conserveRail(current,await people());
 checks.push('the two operating rail lines remain integrated while earned income funds four further workplaces and eight homes, reaching district4 with 128 residents');
 await command('save');const before={stats:current.stats,rails:current.rails};await c.close();c=connect(n.address);seq=0;await c.wait(f=>f.seq===1);await command('resume');assert.deepEqual({stats:current.stats,rails:current.rails},before);
 const report={passed:true,artifact_sha256:n.selection.artifact_sha256,source_directory:directory,method:'Legal continuation of $900 rail-player city; native persistent session, original funds plus completed-visit income, no injected state.',checks,stats:current.stats,rails:current.rails,events};fs.writeFileSync(root+'/evidence/rail-growth.json',JSON.stringify(report,null,2));console.log({...report,events:undefined});
}catch(error){const residents=c&&current?await people().catch(()=>[]):[];fs.writeFileSync(root+'/evidence/rail-growth-attempt.json',JSON.stringify({passed:false,error:String(error),source_directory:directory,stats:current?.stats,rails:current?.rails,residents,events},null,2));throw error}finally{if(c)await c.close().catch(()=>{});if(n)await n.stop().catch(()=>{})}
