// Construction-only, same executable, complete regional diagnostic projection.
// Both arms build the same ordinary native region; no game work is done here.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const candidatePath=process.env.CITY_SELECTION||'.build/selection.json',baselinePath=process.env.REGION_BASELINE_SELECTION;
assert(baselinePath,'Supply an independently retained region-capable predecessor.');
process.env.CITY_SELECTION=baselinePath;const baseline=await import('./run-case.mjs?region-generation-before');
process.env.CITY_SELECTION=candidatePath;const candidate=await import('./run-case.mjs?region-generation-after');
assert.equal(candidate.selection.compiler_sha256,baseline.selection.compiler_sha256,'Isolate game construction using identical executable bytes');
assert.notEqual(candidate.selection.artifact_sha256,baseline.selection.artifact_sha256);
const repetitions=Number(process.env.REGION_GENERATION_REPETITIONS||3);assert(Number.isInteger(repetitions)&&repetitions>=2&&repetitions<=7);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const report={passed:false,compiler_sha256:candidate.selection.compiler_sha256,baseline_artifact_sha256:baseline.selection.artifact_sha256,candidate_artifact_sha256:candidate.selection.artifact_sha256,method:'Serial counterbalanced native construction of the same 2,048-resident region, zero simulation cycles. Same executable; all projected resident columns, every wallet and business balance, all trains, tracks, terrain, tiles and initial counters must match. This compact diagnostic is not a complete City/save, simulation throughput, browser loading or rendering FPS. Native invocation excludes artifact loading and result serialization. Shared host, not isolated hardware.',samples:[]};
const save=()=>fs.writeFileSync('evidence/region-generation.json',JSON.stringify(report,null,2)+'\n');
let expected;
for(let repetition=0;repetition<repetitions;repetition++)for(const [label,runner]of (repetition%2? [['candidate',candidate],['baseline',baseline]]:[['baseline',baseline],['candidate',candidate]])){
 const r=runner.runCase(0,'region-generation-'+label+'-'+repetition,'region-probe'),value=r.result;
 assert.equal(value.residents.length,2048);assert.equal(value.frames.length,1);assert.equal(value.frames[0].population,2048);assert.equal(value.frames[0].tick,0);assert.equal(value.frames[0].wealth,value.frames[0].expected);
 if(expected)assert.deepEqual(value,expected,'All diagnostic values at construction must agree');else expected=value;
 const match=r.observation.match(/production-observation=("(?:[^"\\]|\\.)*")/);assert(match);const o=JSON.parse(JSON.parse(match[1]));for(const key of ['live_call_frames_after','live_handles_after','live_transactions_after'])assert.equal(o[key],0,key);
 const row={label,repetition,wall_ms:r.wall_ms,invocation_ms:Number(r.observation.match(/invocation-nanoseconds=(\d+)/)[1])/1e6,instructions:o.instructions,allocated_bytes:o.allocated_bytes,calls:o.calls,result_sha256:hash(value),exact_projected_result_equal:true};report.samples.push(row);save();console.log(JSON.stringify(row));
}
const median=v=>[...v].sort((a,b)=>a-b)[Math.floor(v.length/2)],medians={};
for(const label of ['baseline','candidate'])medians[label]=Object.fromEntries(['wall_ms','invocation_ms','instructions','allocated_bytes'].map(k=>[k,median(report.samples.filter(s=>s.label===label).map(s=>s[k]))]));
report.medians=medians;report.native_invocation_speedup=medians.baseline.invocation_ms/medians.candidate.invocation_ms;report.passed=true;save();console.log(JSON.stringify({passed:true,medians,native_invocation_speedup:report.native_invocation_speedup}));
