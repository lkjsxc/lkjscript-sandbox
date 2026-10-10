// Exercise the actual native production profile and its own offline compaction.
import assert from 'node:assert/strict';import fs from 'node:fs';import net from 'node:net';import {spawn,spawnSync} from 'node:child_process';import {once} from 'node:events';
import {client,selection,root} from './metropolis-native.mjs';
async function port(){const s=net.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(r=>s.close(r));return p;}
const http=await port(),ws=await port(),dir=fs.mkdtempSync(root+'/runtime/metropolis-host-test-');
const env={...process.env,METRO_DIR:dir,METRO_HTTP_LISTEN:'127.0.0.1:'+http,METRO_SESSION_LISTEN:'127.0.0.1:'+ws,METRO_HISTORY_KIB:'1024'};
const child=spawn('bash',['scripts/serve-metropolis.sh'],{cwd:root,env});let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);const exited=once(child,'exit');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(test){for(let i=0;i<300;i++){if(child.exitCode!==null)throw Error('Supervisor exited: '+output);if(await test())return;await sleep(100);}throw Error('Host timeout: '+output);}
let a,b;const checks=[];
try{
 await until(async()=>{try{return(await fetch('http://127.0.0.1:'+http+'/metropolis')).ok;}catch{return false;}});
 a=await client({address:'127.0.0.1:'+ws});assert.equal(a.resumed.stats.population,100000);assert.equal(a.resumed.status,1);checks.push('bounded production session profile accepts a private 100,000-person city');
 await a.command('pause');await a.command('grow',{x:8,y:8});const saved=await a.command('save');
 const duplicate=spawnSync('bash',['scripts/serve-metropolis.sh'],{cwd:root,env,encoding:'utf8'});assert.notEqual(duplicate.status,0);assert((duplicate.stdout+duplicate.stderr).includes('already supervised'));checks.push('a second supervisor cannot modify a running deployment');
 const count=()=>output.split('\n').filter(s=>s.includes(' supervisor=')).length;const before=count();
 for(let i=0;i<36&&count()===before;i++){try{await a.command('save');}catch{break;}await sleep(70);}
 await until(()=>count()>before);await sleep(200);
 b=await client({address:'127.0.0.1:'+ws},a.token);assert.deepEqual(b.resumed.stats,saved.stats);assert.equal(b.resumed.cash,saved.cash);assert.equal(b.resumed.paused,true);checks.push('history compaction restarts only the owned session and preserves exact acknowledged state');
 const httpBody=await(await fetch('http://127.0.0.1:'+http+'/metropolis')).text();assert(httpBody.includes('METROPOLIS'));assert(fs.readdirSync(dir+'/checkpoints').length<=2);checks.push('native HTTP remains available during store maintenance and backup retention is bounded');
 const actual=JSON.parse(fs.readFileSync(dir+'/selection.json'));assert.equal(actual.artifact_sha256,selection.artifact_sha256);const report={passed:true,artifact_sha256:actual.artifact_sha256,checks,session_starts:count(),compacted_kib:Number(fs.readFileSync(dir+'/compacted-kib','utf8'))};fs.writeFileSync(root+'/evidence/metropolis-host.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await a?.close().catch(()=>{});await b?.close().catch(()=>{});child.kill('SIGTERM');await exited;fs.writeFileSync(root+'/evidence/metropolis-host-test.log',output);}
