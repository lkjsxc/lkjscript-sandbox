// Counterbalanced same-runtime comparisons. Separately retain cold preparation
// and warm batches; do not describe modeled allocation as live RAM or time as FPS.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const labels=['base-warm083','control-warm083','verified-cache083'],runners=[];
for(const label of labels){process.env.CITY_SELECTION=`.build/routing-${label}.json`;runners.push({label,...await import(`./run-case.mjs?cache-perf=${label}`)})}
assert.equal(new Set(runners.map(x=>x.selection.compiler_sha256)).size,1);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const obs=text=>{const m=text.match(/production-observation=("(?:[^"\\]|\\.)*")/);assert(m);return JSON.parse(JSON.parse(m[1]))};
const grid=new Map();for(let y=0;y<80;y++)for(let x=0;x<80;x++)grid.set(x+y*128,2);const end=79+79*128;grid.set(0,3);grid.set(end,4);
const straight=new Map(Array.from({length:128},(_,id)=>[id,id===0?3:id===127?4:id%3?2:1]));
const layouts=[{name:'grid6400',tiles:[...grid],end,costs:{1:632,2:466}},{name:'straight128',tiles:[...straight],end:127,costs:{1:508,2:169}}];
const preparations=[],samples=[];let expectedSamples=0;
for(const layout of layouts){
 const prepared=new Map();for(const r of runners){const result=r.runCase(layout.tiles,'cache-prepare-'+layout.name+'-'+r.label,'route-world'),o=obs(result.observation);prepared.set(r.label,result.result);preparations.push({layout:layout.name,label:r.label,wall_ms:result.wall_ms,instructions:o.instructions,allocated_bytes:o.allocated_bytes,world_json_bytes:Buffer.byteLength(JSON.stringify(result.result)),world_sha256:hash(result.result)})}
 const fixtures=[{name:'empty',modes:[]},{name:'walk8',modes:Array(8).fill(1)},{name:'drive4',modes:Array(4).fill(2)},{name:'mixed6',modes:[1,2,1,2,1,2]}];expectedSamples+=fixtures.length*3*runners.length;
 for(const f of fixtures)for(let rep=0;rep<3;rep++)for(let k=0;k<runners.length;k++){
  const r=runners[(rep+k)%runners.length],queries=f.modes.map((mode,i)=>({origin:i%2?layout.end:0,dest:i%2?0:layout.end,mode}));
  const input={world:prepared.get(r.label),q:[],queries},result=r.runCase(input,`cache-perf-${layout.name}-${f.name}-${r.label}-${rep}`,'route-warm'),o=obs(result.observation);
  result.result.forEach((p,i)=>{assert.equal(p.cost,layout.costs[queries[i].mode]);assert.equal(p.path[0],queries[i].origin);assert.equal(p.path.at(-1),queries[i].dest);assert.equal(new Set(p.path).size,p.path.length)});
  const sample={layout:layout.name,case:f.name,label:r.label,repetition:rep,position:k,queries:queries.length,wall_ms:result.wall_ms,instructions:o.instructions,allocated_bytes:o.allocated_bytes,input_sha256:hash(input),result_sha256:hash(result.result)};
  samples.push(sample);console.log(JSON.stringify(sample));
  fs.writeFileSync('evidence/cache-performance.json',JSON.stringify({passed:false,method:'Two native layouts. Three serial repetitions per scenario and implementation, rotating execution order; one compiler. Warm timings include process startup, prepared-World JSON admission, routing and output, but exclude the separately reported topology compilation. Queue inputs are empty in these performance fixtures; correctness tests exercise nonzero queues. Not a game FPS benchmark or isolated hardware test. Allocation is modeled cumulative admission, not resident memory.',artifacts:runners.map(r=>({label:r.label,compiler_sha256:r.selection.compiler_sha256,artifact_sha256:r.selection.artifact_sha256,sources:r.selection.sources})),preparations,samples},null,2));
 }
}
assert.equal(samples.length,expectedSamples);const file='evidence/cache-performance.json',report=JSON.parse(fs.readFileSync(file));report.passed=true;fs.writeFileSync(file,JSON.stringify(report,null,2));console.log('PASS',samples.length,'counterbalanced native performance samples');
