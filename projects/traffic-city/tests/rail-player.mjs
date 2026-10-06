// Actual legal play against persistent native sessions. Node sends commands and
// records observations; no money, population, routes or traffic state is injected.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {startNative,connect,root,memory} from './native.mjs';
import {conserveRail} from './rail-helpers.mjs';

const selected=JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||root+'/.build/selection.json'));
const key=randomBytes(32).toString('hex'),events=[],checks=[],phases=[];
const started=performance.now();let n,c,seq=0,current;
async function command(op,fields={}) {
 const id=++seq;
 c.socket.send(JSON.stringify({id,token:op==='resume'?key:'',owner:op==='resume'?randomBytes(16).toString('hex'):'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));
 current=await c.wait(f=>f.ack===id,60000);assert.equal(current.status,1);
 if(op!=='inspect')events.push({op,...fields,tick:current.stats.tick,cash:current.stats.cash,notice:current.notice});
 return current;
}
async function open(directory,name) {
 n=await startNative({name,directory,tick:30});seq=0;c=connect(n.address);
 await c.wait(f=>f.seq===1);await command('resume');
 await command('view',{x:current.stats.originX,y:current.stats.originY,x2:28,y2:18});
 fs.writeFileSync(n.dir+'/test-recovery.json',JSON.stringify({key,address:n.address}));
}
async function close(){await c.close();c=null;await n.stop();n=null}
function clone(source,name) {
 const directory=fs.mkdtempSync(root+'/runtime/'+name+'-');
 for(const args of [['data','backup','--root',source+'/data','--output',directory+'/seed.backup'],['data','restore','--backup',directory+'/seed.backup','--root',directory+'/data']]) {
  const r=spawnSync(selected.bin,args,{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);
 }
 return directory;
}
async function edit(op,x,y,x2,y2,kind=0) {
 const before=current.stats,{originX:ox,originY:oy}=before;
 await command(op,{x:x+ox,y:y+oy,x2:x2+ox,y2:y2+oy,kind});
 assert.equal(current.stats.version,before.version+1,current.notice);assert(current.stats.cash>=0);
}
async function people() {
 const out=[];for(let id=1;id<=current.stats.population;id++)out.push((await command('inspect',{kind:id})).inspect);
 return out;
}
async function horizon(tick) {
 await command('set-running',{kind:1});const observed=await c.wait(f=>f.stats.tick===tick,180000);await command('set-running',{kind:0});
 return {stats:observed.stats,rails:observed.rails};
}
function snapshot(){return {stats:current.stats,rails:current.rails}}
async function persistPhase(name,predicate,personPredicate) {
 const start=current.stats.tick;await command('set-running',{kind:1});
 await c.wait(f=>f.stats.tick>start&&predicate(f),120000);await command('set-running',{kind:0});
 const before=snapshot(),residents=await people();
 assert(residents.some(personPredicate),name+' must be present in the saved native city');
 conserveRail(current,residents);await command('save');
 const directory=n.dir;await close();await open(directory,'rail-player-'+name+'-restart');
 assert.deepEqual(snapshot(),before);assert.deepEqual(await people(),residents);
 phases.push({name,tick:before.stats.tick,stats:before.stats,rails:before.rails,residents});
 checks.push('native binary save and process restart preserve every resident and train during '+name);
}

try {
 await open(null,'rail-player-seed');assert.equal(current.stats.cash,900);assert.equal(current.stats.population,32);
 await edit('build',22,8,22,8,7);await edit('build',6,7,7,7,7);
 assert.equal(current.stats.cash,888);await command('save');const seed=n.dir;await close();
 const baselineDirectory=clone(seed,'rail-player-baseline'),railDirectory=clone(seed,'rail-player');
 await open(baselineDirectory,'rail-player-baseline');const baseline=await horizon(600);
 conserveRail(current,await people());await command('save');await close();
 await open(railDirectory,'rail-player');await edit('build-rail',9,7,22,7);
 assert.equal(current.stats.cash,492);assert.equal(current.rails.length,1);
 checks.push('ordinary $900 starter budget pays $12 for access paths and $396 for a useful river-crossing shuttle');
 const rail=await horizon(600);conserveRail(current,await people());
 assert(rail.stats.railBoardings>0);assert(rail.stats.railCompleted>0);
 assert(rail.stats.carTrips<baseline.stats.carTrips,'useful rail must reduce actual car choices in matched legal play');
 assert(rail.stats.arrived>baseline.stats.arrived,'useful rail must improve completed door-to-door journeys');
 assert.equal(rail.stats.cancelled,0);assert.equal(rail.stats.population,32);
 checks.push('same native checkpoint and exact 600-cycle horizon demonstrate actual passengers, fewer car choices and more completed journeys');
 await persistPhase('access',f=>f.actors.some(p=>p.mode===3&&p.state===2),p=>p.mode===3&&p.state===2);
 await persistPhase('waiting',f=>f.stats.railWaiting>0,p=>p.state===5);
 await persistPhase('riding',f=>f.rails.some(l=>l.occupancy>0),p=>p.state===6);
 await command('save');const final=snapshot();
 const report={passed:true,artifact_sha256:selected.artifact_sha256,method:'Matched native DataStore clones from a legally edited, paused initial city; 30ms requested timer; no fixture-state injection. Rail branch alone spends construction money. Compare the actual delivered frame at exactly cycle 600 in each branch; pausing may finish an additional tick before the command is processed. Subsequent stage-specific restart verification uses exact paused state.',source_directory:railDirectory,wall_ms:performance.now()-started,checks,baseline,rail,final,phases,events,...memory(n.child.pid)};
 fs.writeFileSync(root+'/evidence/rail-player.json',JSON.stringify(report,null,2));
 console.log({...report,phases:phases.map(p=>({name:p.name,tick:p.tick})),events:undefined});
} catch(error) {
 fs.writeFileSync(root+'/evidence/rail-player-attempt.json',JSON.stringify({passed:false,error:String(error),stats:current?.stats,rails:current?.rails,events},null,2));throw error;
} finally {if(c)await c.close().catch(()=>{});if(n)await n.stop().catch(()=>{})}
