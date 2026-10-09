import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {startNative,connect} from './native.mjs';
let native,client,seq=0;const token=randomBytes(32).toString('hex'),owner=randomBytes(16).toString('hex');
async function command(op,fields={}){const id=++seq;client.socket.send(JSON.stringify({id,token:op==='resume'?token:'',owner:op==='resume'?owner:'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));const f=await client.wait(f=>f.ack===id,120000);assert.equal(f.status,1,f.notice);return f}
const checks=[];
try{
 native=await startNative({name:'continuous-management',tick:50});client=connect(native.address);await client.wait(f=>f.seq===1);await command('resume');
 await command('set-running',{kind:1});let review=await command('review-reset');assert.equal(review.stats.paused,false);
 const later=await client.wait(f=>f.stats.tick>=review.stats.tick+12,120000);assert.equal(later.management,1);
 const fresh=await command('reset-city',{x:review.confirmation});assert.equal(fresh.stats.tick,0);assert(fresh.undo);
 review=await command('review-restore');const restored=await command('restore-city',{x:review.confirmation});assert(restored.stats.tick>=later.stats.tick,'Backup includes simulation after review, rather than the older checkpoint');assert.equal(restored.stats.wealthError,0);assert.equal(restored.stats.population,32);
 checks.push('Running reset review advances real ticks; confirmed reset backs up the current city and restore preserves those ticks and money.');
 await command('set-running',{kind:1});review=await command('review-scenario',{kind:1});assert.equal(review.stats.paused,false);
 const continued=await client.wait(f=>f.stats.tick>=review.stats.tick+8,120000);
 const example=await command('load-scenario',{kind:1,x:review.confirmation});assert.equal(example.stats.population,384);
 review=await command('review-restore');const prior=await command('restore-city',{x:review.confirmation});assert.equal(prior.stats.population,32);assert(prior.stats.tick>=continued.stats.tick);assert.equal(prior.stats.wealthError,0);
 checks.push('Example loading backs up the current running city and one-level restore preserves its latest progress.');
 fs.writeFileSync('evidence/continuous-management.json',JSON.stringify({passed:true,artifact_sha256:native.selection.artifact_sha256,checks},null,2)+'\n');console.log(checks);
}finally{if(client)await client.close().catch(()=>{});if(native)await native.stop()}
