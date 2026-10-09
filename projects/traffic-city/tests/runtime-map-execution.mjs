// Isolated command-only runtime experiment. Execute the SAME already compiled
// artifact and literal arguments in both products; never install or publish the
// held source successor, and never open or migrate a player store.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const selection=JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||'.build/selection.json','utf8'));
const successor=process.env.MAP_RUNTIME;assert(successor,'Supply the independently selected isolated Map runtime.');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const executors=[{name:'preceding-main',bin:selection.bin,version:'lkjscript 0.1.88'},{name:'integrated-source',bin:successor,version:'lkjscript 0.1.89'}];
for(const e of executors){const r=spawnSync(e.bin,['--version'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.equal(r.stdout.trim(),e.version);e.sha256=digest(fs.readFileSync(e.bin));}
const artifactSha=digest(fs.readFileSync(selection.artifact));assert.equal(artifactSha,selection.artifact_sha256);
const report={passed:false,artifact_sha256:artifactSha,artifact_built_by:selection.compiler_sha256,executors:executors.map(({bin,...e})=>e),method:'Two actual executables run one identical precompiled native game artifact with identical literal command arguments. Compare each complete result, not a sample or selected counters. No authoring-speed claim or final distributable acceptance. Command-only descriptors have no storage/network grants or live sessions. Shared host. Invocation time excludes artifact loading and JSON I/O. Different source-matched executable builds are not an isolated causal estimate of only Map traversal.',publication:'Integrated 0.1.89 source is held upstream; this isolated application experiment cannot clear its final-byte publication obligation.',samples:[]};
const save=()=>fs.writeFileSync('evidence/runtime-map-execution.json',JSON.stringify(report,null,2)+'\n');
function run(executor,target,input,name,repetition){
 const dir=fs.mkdtempSync(root+'/runtime/map-runtime-'),d=JSON.parse(fs.readFileSync(root+'/deployment.json','utf8'));
 try{fs.linkSync(selection.artifact,dir+'/app.lkja');}catch{fs.copyFileSync(selection.artifact,dir+'/app.lkja');}
 Object.assign(d,{artifact:'app.lkja',target,listen:null,http:null,session:null,grants:[]});d.runtime.request_deadline_milliseconds=240000;
 fs.writeFileSync(dir+'/deployment.json',JSON.stringify(d));fs.writeFileSync(dir+'/input.json',JSON.stringify([input]));
 const start=performance.now(),r=spawnSync(executor.bin,['run','--deployment',dir+'/deployment.json','--arguments-file',dir+'/input.json','--result-file',dir+'/result.json'],{encoding:'utf8',maxBuffer:64*1024*1024});
 if(r.error)throw r.error;assert.equal(r.status,0,r.stdout+'\n'+r.stderr);const wall=performance.now()-start;
 fs.writeFileSync(dir+'/stdout.log',r.stdout);const value=JSON.parse(fs.readFileSync(dir+'/result.json','utf8')),match=r.stdout.match(/production-observation=("(?:[^"\\]|\\.)*")/);assert(match);const o=JSON.parse(JSON.parse(match[1]));for(const k of ['live_call_frames_after','live_handles_after','live_transactions_after'])assert.equal(o[k],0,k);
 const sample={name,repetition,executor:executor.name,target,input_sha256:digest(JSON.stringify(input)),result_sha256:digest(JSON.stringify(value)),wall_ms:wall,invocation_ms:Number(r.stdout.match(/invocation-nanoseconds=(\d+)/)[1])/1e6,instructions:o.instructions,allocated_bytes:o.allocated_bytes};report.samples.push(sample);save();console.log(JSON.stringify(sample));return value;
}
const seeds=new Map();
for(const scenario of [3,4]){const a=run(executors[0],'scenario-seed',scenario,'seed-'+scenario,0),b=run(executors[1],'scenario-seed',scenario,'seed-'+scenario,0);assert.deepEqual(b,a,'Every seed value');seeds.set(scenario,a);}
for(const scenario of [3,4])for(let repetition=0;repetition<2;repetition++){
 const input={city:seeds.get(scenario),ticks:scenario===3?32:8,commands:[],after:[]};let expected;
 for(const executor of repetition%2?[executors[1],executors[0]]:executors){const value=run(executor,'continuation',input,'complete-city-'+scenario,repetition);if(expected)assert.deepEqual(value,expected,'Complete native City/result across runtimes');else expected=value;
 const c=value.city,s=c.sim,e=c.economy,a=s.agents.map(([,r])=>r);assert.equal(s.population,a.length);assert.equal(s.population,s.born-s.removed);assert.equal(s.requested,s.arrived+s.cancelled+a.filter(r=>[1,2,4,5,6].includes(r.state)).length);assert.equal(c.cash+e.households+e.businesses,e.opening+e.grants+e.exports+e.salvage-e.construction-e.operating-e.withdrawn);
 }
}
report.passed=true;report.complete_results_compared=report.samples.length;save();console.log('PASS identical game artifact and complete results across 0.1.88 and isolated 0.1.89 source runtime.');
