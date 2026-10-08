// Counterbalanced serial repetitions, keeping version and algorithm comparisons
// separate. Native instructions are deterministic work, not wall-clock speed.
import fs from 'node:fs';import assert from 'node:assert/strict';
const labels=['base077','base083','frontier083'],runners=[];
for(const label of labels){process.env.CITY_SELECTION=`.build/routing-${label}.json`;runners.push({label,...await import(`./run-case.mjs?repeat=${label}`)})}
assert.deepEqual(runners[0].selection.sources,runners[1].selection.sources,'The version comparison must have identical authored source');
const grid=new Map();for(let y=0;y<80;y++)for(let x=0;x<80;x++)grid.set(x+y*128,2);const end=79+79*128;grid.set(0,3);grid.set(end,4);
const queries=[{origin:0,dest:end,mode:1},{origin:end,dest:0,mode:1},{origin:0,dest:end,mode:2}];
const fixtures=[{name:'prepare-only',queries:[],costs:[]},{name:'walking-two',queries:queries.slice(0,2),costs:[632,632]},{name:'driving-one',queries:queries.slice(2),costs:[466]},{name:'combined-three',queries,costs:[632,632,466]}];
const report=[],exact=new Map();
function obs(text){const m=text.match(/production-observation=("(?:[^"\\]|\\.)*")/);assert(m);return JSON.parse(JSON.parse(m[1]))}
for(const fixture of fixtures)for(let rep=0;rep<3;rep++){
 const input={tiles:[...grid],q:[],queries:fixture.queries};
 for(let k=0;k<runners.length;k++){
  const runner=runners[(rep+k)%runners.length],r=runner.runCase(input,`repeated-${fixture.name}-${runner.label}-${rep}`,'route-probe'),o=obs(r.observation);
  assert.deepEqual(r.result.map(x=>x.cost),fixture.costs);
  if(runner.label==='base077')exact.set(fixture.name,r.result);
  else if(runner.label==='base083'&&exact.has(fixture.name))assert.deepEqual(r.result,exact.get(fixture.name));
  const sample={case:fixture.name,label:runner.label,repetition:rep,position:k,wall_ms:r.wall_ms,instructions:o.instructions,allocated_bytes:o.allocated_bytes};report.push(sample);console.log(JSON.stringify(sample));
  fs.writeFileSync('evidence/runtime-frontier-repeat.json',JSON.stringify({passed:report.length===36,method:'80x80 grid; independent Dijkstra costs were checked in frontier-performance. Three serial repetitions per compiler/algorithm/scenario, Latin-square execution order. Startup, input admission, world preparation and output are included. Shared host; no CPU isolation. Modelled cumulative allocation is NOT resident memory.',artifacts:runners.map(x=>({label:x.label,compiler_sha256:x.selection.compiler_sha256,artifact_sha256:x.selection.artifact_sha256,sources:x.selection.sources})),samples:report},null,2));
 }
}
console.log('PASS 36 counterbalanced native measurements; exact same-source version results');
