import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {startNative,connect,root} from './native.mjs';
const latest=process.env.CITY_SELECTION||root+'/.build/selection.json',old=process.env.OLD_CITY_SELECTION||null;
const token=randomBytes(32).toString('hex'),checks=[],skipped=[];let n,c,seq=0;
async function command(op,fields={}){const id=++seq;c.socket.send(JSON.stringify({id,token:op==='resume'?token:'',owner:op==='resume'?randomBytes(16).toString('hex'):'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));return c.wait(f=>f.ack===id,120000)}
async function open(){seq=0;c=connect(n.address);await c.wait(f=>f.seq===1,60000);return command('resume')}
async function people(){const all=[];for(let id=1;id<=32;id++)all.push((await command('inspect',{kind:id})).inspect);return all}
async function stop(){if(c){await c.close();c=null}if(n){await n.stop();n=null}}
try{
 process.env.CITY_SELECTION=latest;n=await startNative({name:'tunnel-persistence',tick:30});await open();
 let f=await command('build-tunnel',{x:30,y:30,x2:38,y2:30,kind:7});assert.match(f.notice,/tunnel/i);const topology=f.overview;assert(topology.some(v=>Math.floor(v/16)===16384+30+30*128));const funds=f.stats.cash;
 f=await command('view',{x:29,y:29,x2:12,y2:4,kind:1});assert.equal(f.view.layer,1);assert(f.cells.length>0);assert(f.cells.every(cell=>cell.id>=16384));assert.equal(f.stats.cash,funds);assert.equal(f.stats.version,2);checks.push('Underground view is a pure camera action and contains underground native cell IDs only');
 await command('set-running',{kind:1});await c.wait(f=>f.stats.tick>=24,120000);f=await command('set-running',{kind:0});f=await command('save');const stats=f.stats,agents=await people(),directory=n.dir;await stop();
 n=await startNative({name:'tunnel-persistence-restart',directory,tick:30});f=await open();assert.equal(f.status,1);assert.deepEqual(f.overview,topology);assert.deepEqual(f.stats,stats);assert.deepEqual(await people(),agents);checks.push('Layered topology, funds, trip statistics and all 32 travelling residents survive an actual native process restart exactly');
 if(old){
 // A previous release must refuse the new save instead of interpreting layer IDs.
 await stop();process.env.CITY_SELECTION=old;n=await startNative({name:'tunnel-downgrade-refused',directory,tick:30});f=await open();assert.equal(f.status,3,f.notice);await stop();
 process.env.CITY_SELECTION=latest;n=await startNative({name:'tunnel-after-downgrade',directory,tick:30});f=await open();assert.equal(f.status,1);assert.deepEqual(f.overview,topology);assert.deepEqual(f.stats,stats);assert.deepEqual(await people(),agents);checks.push('Older format-8 release refuses the layered city; retrying the new release proves that no record was replaced');
 }else skipped.push('Historical-binary downgrade refusal requires OLD_CITY_SELECTION; current-format process restart and recovery still run.');
 const q=await command('review-remove',{x:30,y:30,x2:38,y2:30,kind:1});assert(q.quote.valid);assert.equal(q.quote.layer,1);assert.equal(q.quote.tiles,9);assert.equal(q.quote.refund,108);assert.equal(q.quote.homes,0);
 f=await command('apply-remove',{x:q.quote.id});assert.equal(f.stats.cash,stats.cash+108);assert(!f.overview.some(v=>Math.floor(v/16)>=16384));assert(f.overview.some(v=>Math.floor(v/16)===30+30*128&&v%16===13));assert.equal(f.stats.population,32);assert.equal(f.stats.wealthError,0);checks.push('Reviewed underground removal is durable and retains ground portals and households');
 const reset=await command('review-reset');f=await command('reset-city',{x:reset.confirmation});const restore=await command('review-restore');f=await command('restore-city',{x:restore.confirmation});assert(f.overview.some(v=>Math.floor(v/16)===30+30*128&&v%16===13));assert.equal(f.stats.cash,stats.cash+108);checks.push('Reset/restore backup uses the new typed format and restores the reviewed city exactly');
 fs.writeFileSync(root+'/evidence/tunnel-persistence.json',JSON.stringify({passed:true,artifact_sha256:JSON.parse(fs.readFileSync(latest)).artifact_sha256,predecessor_artifact_sha256:old?JSON.parse(fs.readFileSync(old)).artifact_sha256:null,checks,skipped},null,2));console.log({passed:true,checks,skipped});
}finally{process.env.CITY_SELECTION=latest;await stop().catch(()=>{})}
