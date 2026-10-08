// Actual native City Lab sessions: layered plans are temporary until explicitly
// applied, and applying never imports simulated time or experimental income.
import fs from 'node:fs';import assert from 'node:assert/strict';import{randomBytes}from'node:crypto';import{startNative,connect,root}from'./native.mjs';
const token=randomBytes(32).toString('hex'),checks=[];let native,client,sequence=0,owner;
async function send(op,fields={}){const id=++sequence;client.socket.send(JSON.stringify({id,token:op==='resume'?token:'',owner:op==='resume'?owner:'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));return client.wait(f=>f.ack===id,90000)}
async function open(directory){native=await startNative({name:'tunnel-lab',directory:directory||null,tick:25});client=connect(native.address);sequence=0;owner=randomBytes(16).toString('hex');await client.wait(f=>f.seq===1);return send('resume')}
async function stop(){if(client){await client.close();client=null}if(native){await native.stop();native=null}}
try{
 let f=await open();const original=f.stats;f=await send('lab-start');assert.equal(f.lab.phase,1);
 f=await send('build-tunnel',{x:30,y:30,x2:34,y2:30,kind:7});assert.equal(f.lab.planCost,240);assert.equal(f.stats.cash,original.cash-240);assert.equal(f.stats.tick,original.tick);assert(f.overview.some(v=>Math.floor(v/16)>=16384));
 f=await send('view',{x:29,y:29,x2:8,y2:4,kind:1});assert.equal(f.view.layer,1);assert(f.cells.some(c=>c.id>=16384));const plan=f.stats;
 f=await send('lab-run',{kind:64});const begin=f.seq;f=await client.wait(x=>x.seq>begin&&x.lab.phase===4,240000);assert.equal(f.lab.realTick,original.tick);assert.equal(f.saved,original.tick);assert.equal(f.lab.control.wealthError,0);assert.equal(f.lab.changed.wealthError,0);
 f=await send('lab-review');assert(f.lab.confirmation>0);f=await send('lab-apply',{x:f.lab.confirmation});assert.equal(f.lab.phase,0);assert.deepEqual(f.stats,plan);assert.equal(f.saved,original.tick);checks.push('An underground tunnel plan is compared through both native futures and commits at the original cycle with only its construction cost');
 const committed=f.stats,directory=native.dir;await stop();f=await open(directory);assert.deepEqual(f.stats,committed);const topology=f.overview;
 await send('lab-start');f=await send('build-underground',{x:30,y:31,x2:34,y2:31,kind:9});assert.equal(f.lab.planCost,300);f=await send('save');assert.equal(f.saved,committed.tick);await stop();
 f=await open(directory);assert.deepEqual(f.stats,committed);assert.deepEqual(f.overview,topology);assert(!f.overview.some(v=>Math.floor(v/16)===16384+30+31*128));checks.push('Saving and restarting during an experiment retain the committed tunnel but discard the uncommitted directed extension');
 await send('lab-start');f=await send('review-remove',{x:30,y:30,x2:34,y2:30,kind:1});assert.equal(f.quote.layer,1);assert.equal(f.quote.tiles,5);assert.equal(f.quote.refund,60);f=await send('apply-remove',{x:f.quote.id});assert.equal(f.lab.planCost,-60);assert(f.overview.some(v=>Math.floor(v/16)===30+30*128&&v%16===13));assert(!f.overview.some(v=>Math.floor(v/16)>=16384));
 f=await send('lab-discard');assert.deepEqual(f.stats,committed);assert.deepEqual(f.overview,topology);checks.push('Layer-specific experimental demolition preserves surface portals and discarding restores the exact committed topology and accounts');
 fs.writeFileSync(root+'/evidence/tunnel-lab.json',JSON.stringify({passed:true,artifact_sha256:native.selection.artifact_sha256,checks},null,2));console.log({passed:true,checks});
}finally{await stop().catch(()=>{})}
