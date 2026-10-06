// Legal district expansion from the earned 128-person, two-line city.
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {randomBytes} from 'node:crypto';
import {startNative,connect,root} from './native.mjs';import {conserveRail} from './rail-helpers.mjs';
const source=process.env.PLAYER_CITY_DIR;assert(source?.startsWith(root+'/runtime/rail-growth-'));
const key=JSON.parse(fs.readFileSync(source+'/test-recovery.json')).key,selected=JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||root+'/.build/selection.json'));
const directory=fs.mkdtempSync(root+'/runtime/rail-large-'),events=[],checks=[];let n,c,seq=0,current;
for(const args of [['data','backup','--root',source+'/data','--output',directory+'/seed.backup'],['data','restore','--backup',directory+'/seed.backup','--root',directory+'/data']]){const r=spawnSync(selected.bin,args,{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr)}
async function command(op,fields={}){const id=++seq;c.socket.send(JSON.stringify({id,token:op==='resume'?key:'',owner:op==='resume'?randomBytes(16).toString('hex'):'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));current=await c.wait(f=>f.ack===id,60000);assert.equal(current.status,1);if(op!=='inspect'){events.push({op,...fields,stats:current.stats,notice:current.notice});console.log(op,current.stats.tick,current.stats.cash,current.stats.population,current.stats.waiting,current.notice)}return current}
async function build(x,y,x2,y2,kind){const before=current.stats;await command('build',{x:x+before.originX,y:y+before.originY,x2:x2+before.originX,y2:y2+before.originY,kind});assert.equal(current.stats.version,before.version+1,current.notice)}
const place=(x,y,kind)=>build(x,y,x,y,kind);
async function runUntil(predicate,limit=2400){const start=current.stats.tick;await command('set-running',{kind:1});await c.wait(f=>f.stats.tick>start&&(predicate(f)||f.stats.tick>=start+limit),600000);await command('set-running',{kind:0})}
async function people(){const out=[];for(let id=1;id<=current.stats.population;id++)out.push((await command('inspect',{kind:id})).inspect);return out}
try {
 n=await startNative({name:'rail-grow-large',directory,tick:1});c=connect(n.address);await c.wait(f=>f.seq===1);await command('resume');fs.writeFileSync(directory+'/test-recovery.json',JSON.stringify({key,address:n.address}));
 assert.equal(current.stats.population,128);assert.equal(current.stats.level,4);const before=current.stats;
 await place(9,11,5);await place(9,9,6);await runUntil(f=>f.stats.cash>=6100);assert(current.stats.cash>=6100,'128 residents must earn the expansion funds');
 checks.push('two additional nearby services are built while actual completed visits fund the next district');
 await build(21,12,23,12,2);await build(21,13,21,14,2);await build(22,14,30,14,1);
 for(const x of [30,34])await build(x,4,x,22,1);
 for(const y of [6,10,14,18,22])await build(31,y,33,y,1);
 for(const x of [33,35])for(const y of [5,9,13,17])await place(x,y,4);
 for(const y of [5,9,13,17])await place(32,y,7);
 for(const[x,y,kind]of [[29,6,5],[35,6,6],[29,10,5],[35,10,6],[29,18,6],[35,14,5]])await place(x,y,kind);
 for(const x of [29,31])for(const y of [5,7,9,11,13,15,17,19])await place(x,y,3);
 assert.equal(current.stats.population,256);await runUntil(f=>f.stats.growth);assert(current.stats.growth,'district goal remains unavailable: '+JSON.stringify(current.stats));
 const goal=current.stats;await command('grow');assert.equal(current.stats.level,5);assert.equal(current.stats.cash,goal.cash-goal.growthCost);assert.equal(current.stats.cancelled,0);
 const residents=await people();conserveRail(current,residents);assert(current.stats.railBoardings>before.railBoardings);assert(current.stats.arrived>before.arrived);
 checks.push('a connected street district, eight jobs, six services, walking links and sixteen homes reach 256 residents/district5 using earned funds; original rail journeys continue');
 await command('save');const saved={stats:current.stats,rails:current.rails};await c.close();c=connect(n.address);seq=0;await c.wait(f=>f.seq===1);await command('resume');assert.deepEqual({stats:current.stats,rails:current.rails},saved);assert.deepEqual(await people(),residents);
 checks.push('all 256 resident fields, train states and city statistics restore exactly from the native save');
 const report={passed:true,artifact_sha256:n.selection.artifact_sha256,source_directory:directory,method:'Legal continuation of the original $900 city; all growth funded by completed native journeys, no injected population, money, routes or train state.',checks,before,after:current.stats,rails:current.rails,events};fs.writeFileSync(root+'/evidence/rail-grow-large.json',JSON.stringify(report,null,2));console.log({...report,events:undefined});
}catch(error){const residents=c&&current?await people().catch(()=>[]):[];fs.writeFileSync(root+'/evidence/rail-grow-large-attempt.json',JSON.stringify({passed:false,error:String(error),source_directory:directory,stats:current?.stats,rails:current?.rails,residents,events},null,2));throw error}finally{if(c)await c.close().catch(()=>{});if(n)await n.stop().catch(()=>{})}
