// Exercise the actual native production profile and its own offline compaction.
import assert from 'node:assert/strict';import fs from 'node:fs';import net from 'node:net';import {spawn,spawnSync} from 'node:child_process';import {once} from 'node:events';
import {client,selection,root} from './metropolis-native.mjs';
async function port(){const s=net.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(r=>s.close(r));return p;}
const http=await port(),ws=await port(),dir=fs.mkdtempSync(root+'/runtime/metropolis-host-test-');
const env={...process.env,METRO_DIR:dir,METRO_HTTP_LISTEN:'127.0.0.1:'+http,METRO_SESSION_LISTEN:'127.0.0.1:'+ws,METRO_HISTORY_KIB:'1024'};
let child,exited,output='';
function start(){child=spawn('bash',['scripts/serve-metropolis.sh'],{cwd:root,env});child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);exited=once(child,'exit');}
async function stop(){if(child.exitCode===null)child.kill('SIGTERM');await exited;}
start();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(test){for(let i=0;i<300;i++){if(child.exitCode!==null)throw Error('Supervisor exited: '+output);if(await test())return;await sleep(100);}throw Error('Host timeout: '+output);}
let a,b;const extra=[];const checks=[];
async function ready(){await until(async()=>{try{return(await fetch('http://127.0.0.1:'+http+'/metropolis')).ok&&fs.readFileSync(dir+'/session.log','utf8').trim().split('\n').at(-1).includes('"event":"ready"');}catch{return false;}});}
try{
 await ready();
 a=await client({address:'127.0.0.1:'+ws});assert.equal(a.resumed.stats.population,100000);assert.equal(a.resumed.status,1);checks.push('bounded production session profile accepts a private 100,000-person city');
 await a.command('pause');await a.command('grow',{x:8,y:8});const saved=await a.command('save');
 const duplicate=spawnSync('bash',['scripts/serve-metropolis.sh'],{cwd:root,env,encoding:'utf8'});assert.notEqual(duplicate.status,0);assert((duplicate.stdout+duplicate.stderr).includes('already supervised'));checks.push('a second supervisor cannot modify a running deployment');
 const count=()=>output.split('\n').filter(s=>s.includes(' supervisor=')).length;const before=count();
 for(let i=0;i<36&&count()===before;i++){try{await a.command('save');}catch{break;}await sleep(70);}
 await until(()=>count()>before);await ready();
 b=await client({address:'127.0.0.1:'+ws},a.token);assert.deepEqual(b.resumed.stats,saved.stats);assert.equal(b.resumed.cash,saved.cash);assert.equal(b.resumed.paused,true);checks.push('history compaction restarts only the owned session and preserves exact acknowledged state');
 const httpBody=await(await fetch('http://127.0.0.1:'+http+'/metropolis')).text();assert(httpBody.includes('METROPOLIS'));assert(fs.readdirSync(dir+'/checkpoints').length<=2);checks.push('native HTTP remains available during store maintenance and backup retention is bounded');
 await b.close();await stop();
 // Emulate interruption between the two directory renames, with the real save.
 fs.renameSync(dir+'/data',dir+'/data.retired');env.METRO_HISTORY_KIB='16384';start();await ready();
 b=await client({address:'127.0.0.1:'+ws},a.token);assert.deepEqual(b.resumed.stats,saved.stats);assert.equal(b.resumed.cash,saved.cash);assert.equal(b.resumed.paused,true);
 checks.push('restart recovers an interrupted store exchange without resetting the saved city');
 await b.close();await stop();
 // A successful exchange interrupted before removing the old directory.
 fs.cpSync(dir+'/data',dir+'/data.retired',{recursive:true});start();await ready();
 b=await client({address:'127.0.0.1:'+ws},a.token);assert.deepEqual(b.resumed.stats,saved.stats);assert(!fs.existsSync(dir+'/data.retired'));
 checks.push('restart verifies the replacement store before retiring the old copy');
 for(let i=0;i<3;i++)extra.push(await client({address:'127.0.0.1:'+ws}));
 for(const c of [b,...extra]){const f=await c.command('scenario',{kind:1000000});assert.equal(f.stats.population,1000000);if(f.paused)await c.command('pause');}
 for(const c of [b,...extra]){const initial=c.frames.at(-1).stats.tick;const f=await c.wait(f=>f.stats.population===1000000&&f.stats.tick>=initial+8);assert.equal(f.stats.massError,0);assert.equal(f.stats.journeyError,0);assert(c.frames.every(f=>f.bytes<=32768));}
 checks.push('production limits support four simultaneous million-person cities and bounded frames');
 for(const c of [b,...extra])await c.close();await stop();
 fs.renameSync(dir+'/data',dir+'/retained-test-data');
 const missing=spawnSync('node',['scripts/prepare-metropolis.mjs'],{cwd:root,env,encoding:'utf8'});assert.notEqual(missing.status,0);assert(missing.stderr.includes('recovery is required'));assert(!fs.existsSync(dir+'/data'));fs.renameSync(dir+'/retained-test-data',dir+'/data');
 checks.push('a missing initialized store is rejected instead of silently creating an empty city store');
 const actual=JSON.parse(fs.readFileSync(dir+'/selection.json'));assert.equal(actual.artifact_sha256,selection.artifact_sha256);const report={passed:true,artifact_sha256:actual.artifact_sha256,checks,session_starts:count(),compacted_kib:Number(fs.readFileSync(dir+'/compacted-kib','utf8'))};fs.writeFileSync(root+'/evidence/metropolis-host.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await a?.close().catch(()=>{});await b?.close().catch(()=>{});for(const c of extra)await c.close().catch(()=>{});await stop();fs.writeFileSync(root+'/evidence/metropolis-host-test.log',output);}
