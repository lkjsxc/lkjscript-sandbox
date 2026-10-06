// Legal player operations only, in a fresh native save store; no injected money or residents.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {startNative,connect,root} from './native.mjs';
const key=randomBytes(32).toString('hex'),checks=[],events=[];
let native,client,seq=0,current;
async function command(op,fields={}){
 const id=++seq;client.socket.send(JSON.stringify({id,token:op==='resume'?key:'',owner:op==='resume'?randomBytes(16).toString('hex'):'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));
 current=await client.wait(f=>f.ack===id,60000);assert.equal(current.status,1,current.notice);assert.equal(current.stats.wealthError,0,'ledger after '+op);
 events.push({op,fields,stats:current.stats,notice:current.notice});return current;
}
async function open(){seq=0;client=connect(native.address);await client.wait(f=>f.seq===1);return command('resume');}
async function build(x,y,x2,y2,kind){const v=current.stats.version;await command('build',{x:x+50,y:y+54,x2:x2+50,y2:y2+54,kind});assert.equal(current.stats.version,v+1,current.notice);}
try{
 native=await startNative({name:'expansion-life-cycle',tick:1});await open();assert.equal(current.stats.cash,900);
 await build(14,10,15,10,2);await build(6,9,6,9,4);await build(9,9,9,9,4);
 const start=current.stats.tick;await command('set-running',{kind:1});await client.wait(f=>f.stats.growth||f.stats.tick>=start+640,180000);await command('set-running',{kind:0});
 assert(current.stats.growth,'Growth prerequisites not met: '+JSON.stringify(current.stats));
 const earned={...current.stats};await command('grow');assert.equal(current.stats.level,2);assert.equal(current.stats.cash,earned.cash-earned.growthCost);
 await build(4,7,4,7,3);assert.equal(current.stats.population,40);assert(current.stats.ecoGrants>=8*24);
 checks.push('Connected nearby jobs and an improved crossing earn a real district expansion; a permitted home adds eight residents and explicitly accounted capital.');
 const bridge={x:64,y:64,x2:65,y2:64},before={...current.stats};
 let q=(await command('review-remove',bridge)).quote;assert(q.valid);await command('cancel-review');assert.deepEqual(current.stats,before);
 q=(await command('review-remove',bridge)).quote;assert(q.valid);await command('apply-remove',{x:q.id});assert.equal(current.stats.population,before.population);assert(current.stats.version>before.version);assert.equal(current.stats.cash,before.cash+q.refund);
 await build(14,10,15,10,2);const arrived=current.stats.arrived,tick=current.stats.tick;await command('set-running',{kind:1});await client.wait(f=>f.stats.arrived>=arrived+8||f.stats.tick>=tick+256,120000);await command('set-running',{kind:0});assert(current.stats.arrived>=arrived+8);
 checks.push('Bridge removal is reviewed, cancellable and explicit; rebuilding restores completed journeys without losing residents or money.');
 const saved=(await command('save')).stats;await client.close();client=null;await native.stop();const dir=native.dir;native=null;
 native=await startNative({name:'expansion-life-cycle-restart',tick:1,directory:dir});await open();assert.deepEqual(current.stats,saved);
 const review=await command('review-reset');await command('reset-city',{x:review.confirmation});assert.equal(current.stats.population,32);
 const restore=await command('review-restore');await command('restore-city',{x:restore.confirmation});assert.deepEqual(current.stats,saved);
 checks.push('A legally grown city survives native process restart, reviewed reset and exact one-level restore.');
 const report={passed:true,artifact_sha256:native.selection.artifact_sha256,method:'Dedicated store, legal native commands, accelerated requested timer; not a performance benchmark.',checks,earned,final:current.stats,events};
 fs.writeFileSync(root+'/evidence/expansion-life-cycle.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,checks,earned,final:current.stats},null,2));
}catch(error){fs.writeFileSync(root+'/evidence/expansion-life-cycle-failure.json',JSON.stringify({error:String(error),stats:client?.frames.at(-1)?.stats||current?.stats,events},null,2));throw error;}
finally{if(client)await client.close().catch(()=>{});if(native)await native.stop().catch(()=>{});}
