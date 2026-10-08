// Verify complete game states across runtimes, without altering any live city.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.env.CITY_SELECTION='.build/baseline-077.json';const before=await import('./run-case.mjs?runtime=077');
process.env.CITY_SELECTION='.build/runtime-083-selection.json';const after=await import('./run-case.mjs?runtime=083');
assert.deepEqual(before.selection.sources,after.selection.sources,'Same-source full game comparison required');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const cases=[];
function invariants(r){const s=r.city.sim,e=r.city.economy;assert.equal(r.conservation,0);assert.equal(s.population,s.born-s.removed);assert.equal(s.population,s.ids.length);assert.equal(new Set(s.ids).size,s.population);assert.equal(s.requested,s.arrived+s.cancelled+r.agents.filter(a=>[1,2,4,5,6].includes(a.state)).length);assert.equal(r.city.cash+e.households+e.businesses,e.opening+e.grants+e.exports+e.salvage-e.construction-e.operating-e.withdrawn);for(const[,line]of s.transit.lines){assert(line.passengers.length<=line.capacity);assert.equal(new Set(line.passengers).size,line.passengers.length)}}
function pair(input,name,target='workload',check=true){const a=before.runCase(input,'upgrade-077-'+name,target),b=after.runCase(input,'upgrade-083-'+name,target);assert.deepEqual(b.result,a.result,name);if(check){invariants(a.result);invariants(b.result)}cases.push({name,target,input_sha256:hash(input),result_sha256:hash(a.result),before_ms:a.wall_ms,after_ms:b.wall_ms});console.log(JSON.stringify(cases.at(-1)));return a.result}
pair({rows:-1,ticks:64,tiles:[],commands:[],after:[]},'starter-64');
pair({rows:8,ticks:64,tiles:[],commands:[],after:[]},'rows8-64');
pair({rows:64,ticks:8,tiles:[],commands:[],after:[]},'rows64-8');
const seed=pair(4,'river-seed','scenario-seed',false);
pair({city:seed,ticks:2,commands:[],after:[]},'river-1024','continuation');
fs.writeFileSync('evidence/runtime-upgrade-comparison.json',JSON.stringify({passed:true,sources_identical:true,before:{compiler_sha256:before.selection.compiler_sha256,artifact_sha256:before.selection.artifact_sha256},after:{compiler_sha256:after.selection.compiler_sha256,artifact_sha256:after.selection.artifact_sha256},method:'Exactly identical authored source; complete native state equality; population, journey, financial and rail capacity conservation. Isolated command runs, never live save data. Wall times are diagnostic, not isolated CPU measurements.',cases},null,2));console.log('PASS five complete native game comparisons, including 1,024 residents');
