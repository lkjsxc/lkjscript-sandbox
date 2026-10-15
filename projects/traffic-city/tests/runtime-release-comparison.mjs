// Execute one immutable game artifact in pinned and released runtimes.
// No player data, production listeners, or compiler graph writes are involved.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const original=process.env.CITY_SELECTION||'.build/selection.json';
const nextBin=process.env.RELEASE_RUNTIME;assert(nextBin,'Set RELEASE_RUNTIME to a verified released executable');
const hash=b=>createHash('sha256').update(b).digest('hex');
const selected=JSON.parse(fs.readFileSync(original));
assert.equal(hash(fs.readFileSync(selected.artifact)),selected.artifact_sha256);
const version=bin=>{const r=spawnSync(bin,['--version'],{encoding:'utf8'});assert.equal(r.status,0);return r.stdout.trim();};
const versions={pinned:version(selected.bin),released:version(nextBin)};
const next={...selected,bin:nextBin,compiler_sha256:hash(fs.readFileSync(nextBin)),scope:'Isolated execution experiment; artifact was compiled by '+selected.compiler_sha256};
fs.writeFileSync('.build/released-execution.json',JSON.stringify(next,null,2)+'\n');
process.env.CITY_SELECTION=original;const pinned=await import('./run-case.mjs?release-pinned');
process.env.CITY_SELECTION='.build/released-execution.json';const released=await import('./run-case.mjs?release-new');
const report={passed:false,versions,artifact:selected.artifact_sha256,executors:{pinned:selected.compiler_sha256,released:next.compiler_sha256},method:'Three serial alternating-order executions of the exact same native commuter-probe artifact with 0 and 16 cycles. Complete results must agree across versions. Invocation excludes loading/JSON I/O; 16 minus 0 includes simulation and native observer work. Shared-host sample, not browser FPS.',samples:[]};
const save=()=>fs.writeFileSync('evidence/runtime-release-comparison.json',JSON.stringify(report,null,2)+'\n');
const expected=new Map();save();
try{
 for(let repetition=0;repetition<3;repetition++)for(const name of repetition%2?['released','pinned']:['pinned','released'])for(const ticks of [0,16]){
  const r=(name==='pinned'?pinned:released).runCase(ticks,`runtime-release-${name}-${repetition}-${ticks}`,'commuter-probe');
  const o=JSON.parse(JSON.parse(r.observation.match(/production-observation=("(?:[^"\\]|\\.)*")/)[1]));
  for(const k of ['live_call_frames_after','live_handles_after','live_transactions_after'])assert.equal(o[k],0,k);
  if(expected.has(ticks))assert.deepEqual(r.result,expected.get(ticks),'Every observed native result');else expected.set(ticks,r.result);
  assert.equal(r.result.residents.length,2048);assert.equal(r.result.rails.length,8);
  for(const f of r.result.frames){assert.equal(f.population,f.born-f.removed);assert.equal(f.requested,f.arrived+f.cancelled+f.active);assert.equal(f.wealth,f.expected);}
  const row={name,repetition,ticks,wallMs:r.wall_ms,invocationMs:Number(r.observation.match(/invocation-nanoseconds=(\d+)/)[1])/1e6,instructions:o.instructions,resultSha256:hash(JSON.stringify(r.result))};
  report.samples.push(row);save();console.log(JSON.stringify(row));
 }
 report.passed=true;save();console.log('PASS complete native results match across '+versions.pinned+' and '+versions.released);
}catch(error){report.error=error.message;save();throw error;}
