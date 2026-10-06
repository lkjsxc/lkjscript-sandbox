import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {randomBytes} from 'node:crypto';
import {startNative,connect,root} from './native.mjs';import {conserveRail} from './rail-helpers.mjs';
const source=process.env.PLAYER_CITY_DIR;assert(source?.startsWith(root+'/runtime/rail-player-'));
const key=JSON.parse(fs.readFileSync(source+'/test-recovery.json')).key,selected=JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||root+'/.build/selection.json'));
const checks=[];let n,c,seq=0,current;
async function command(op,fields={}){const id=++seq;c.socket.send(JSON.stringify({id,token:op==='resume'?key:'',owner:op==='resume'?randomBytes(16).toString('hex'):'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));current=await c.wait(f=>f.ack===id,60000);assert.equal(current.status,1);return current}
async function start(name){const dir=fs.mkdtempSync(root+'/runtime/rail-removal-');for(const args of [['data','backup','--root',source+'/data','--output',dir+'/seed.backup'],['data','restore','--backup',dir+'/seed.backup','--root',dir+'/data']]){const r=spawnSync(selected.bin,args,{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr)}n=await startNative({name,directory:dir,tick:10});seq=0;c=connect(n.address);await c.wait(f=>f.seq===1);await command('resume')}
async function stop(){await c.close();c=null;await n.stop();n=null}
async function people(){const residents=[],plans=[];for(let id=1;id<=32;id++){await command('inspect',{kind:id});if(current.inspect.id>0){residents.push(current.inspect);plans.push({id,plan:current.inspectRail})}}conserveRail(current,residents);return {residents,plans}}
const snapshot=()=>({stats:current.stats,rails:current.rails});
try {
 await start('rail-removal-line');const before=snapshot(),records=await people();assert(before.rails[0].occupancy>0);assert(before.stats.railWaiting>0);
 const coordinates={x:before.stats.originX+16,y:before.stats.originY+7,x2:before.stats.originX+16,y2:before.stats.originY+7};
 let q=(await command('review-remove',coordinates)).quote;assert.equal(q.rails,1);assert.equal(q.tiles,2);
 await command('rail-service',{x:1,kind:0});const suspended=snapshot();await command('apply-remove',{x:q.id});assert.deepEqual(snapshot(),suspended);
 await command('rail-service',{x:1,kind:1});q=(await command('review-remove',coordinates)).quote;await command('cancel-review');await command('apply-remove',{x:q.id});assert.deepEqual(snapshot(),before);
 checks.push('a service edit invalidates the pending rail-removal review; cancellation also prevents later replay');
 q=(await command('review-remove',coordinates)).quote;
 const affected=records.plans.filter(p=>p.plan.line===1).map(p=>p.id);assert.equal(q.cancelled,affected.length);assert.equal(q.relocated,affected.length);assert.equal(q.moveouts,0);
 await command('apply-remove',{x:q.id});const removed=snapshot();const after=await people();
 assert.equal(removed.rails.length,0);assert.equal(removed.stats.cancelled,before.stats.cancelled+affected.length);assert.equal(removed.stats.arrived,before.stats.arrived);assert.equal(removed.stats.railCompleted,before.stats.railCompleted);assert.equal(removed.stats.cash,before.stats.cash+198);
 for(const r of after.residents){assert.equal(after.plans.find(p=>p.id===r.id).plan.line,0);if(affected.includes(r.id)){assert.equal(r.state,0);assert.equal(r.cell,r.home)}else assert.deepEqual(r,records.residents.find(p=>p.id===r.id))}
 await command('apply-remove',{x:q.id});assert.deepEqual(snapshot(),removed);checks.push('occupied whole-line removal returns exactly the reviewed access/wait/ride/egress travellers home, preserves unaffected people, conserves requests and refuses duplicate salvage');
 await command('save');await c.close();c=connect(n.address);seq=0;await c.wait(f=>f.seq===1);await command('resume');assert.deepEqual(snapshot(),removed);assert.deepEqual(await people(),after);checks.push('all removed-line accounting and resident fields survive native save/reload');await stop();
 await start('rail-removal-home');const homeBefore=snapshot(),homeRecords=await people(),rider=homeRecords.residents.find(r=>r.state===6);assert(rider);
 const household=homeRecords.residents.filter(r=>r.home===rider.home).map(r=>r.id);assert.equal(household.length,8);
 q=(await command('review-remove',{x:rider.home%128,y:Math.floor(rider.home/128),x2:rider.home%128,y2:Math.floor(rider.home/128)})).quote;
 assert.equal(q.rails,0);assert.equal(q.moveouts,8);await command('apply-remove',{x:q.id});const homeAfter=snapshot(),homeRemaining=await people();
 assert.equal(homeAfter.rails.length,1);assert.equal(homeAfter.stats.population,24);assert.equal(homeAfter.stats.railSpent,homeBefore.stats.railSpent);assert.equal(homeAfter.stats.railBoardings,homeBefore.stats.railBoardings);assert.equal(homeAfter.stats.arrived,homeBefore.stats.arrived);
 assert(homeRemaining.residents.every(r=>!household.includes(r.id)));assert.equal(homeAfter.rails[0].occupancy,homeRemaining.residents.filter(r=>r.state===6).length);assert.equal(homeAfter.stats.railWaiting,homeRemaining.residents.filter(r=>r.state===5).length);
 await command('set-running',{kind:1});await c.wait(f=>f.stats.tick>=homeAfter.stats.tick+100,120000);await command('set-running',{kind:0});await people();assert(current.stats.arrived>homeAfter.stats.arrived);
 checks.push('demolishing a rider household removes exactly eight residents and their seats/platform entries, retains the paid train leg and lets remaining residents continue');
 const report={passed:true,artifact_sha256:selected.artifact_sha256,source:'Native copy of a legally played city with simultaneous walkers, platform queues and riders',checks,line:{before,quote:affected,removed},household:{before:homeBefore,removedIds:household,after:homeAfter,continued:snapshot()}};fs.writeFileSync(root+'/evidence/rail-removal.json',JSON.stringify(report,null,2));console.log(report);
} finally {if(c)await c.close().catch(()=>{});if(n)await n.stop().catch(()=>{})}
