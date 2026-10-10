// The native runtime performs all demand, queue and flow calculations. JavaScript
// only supplies workloads, checks returned integer mass and records observations.
import assert from 'node:assert/strict';
import fs from 'node:fs';
process.env.CITY_SELECTION=process.env.MESO_SELECTION||'.build/meso-selection.json';
const {runCase,selection}=await import('./run-case.mjs?mesoscopic');
const defaults={population:100000,groups:256,ticks:128,capacity:4,rail:16,closedFrom:0,closedUntil:0};
const cases=[['zero',{population:0,groups:8,ticks:24}],['remainder',{population:100003,groups:31,ticks:64}],['closed',{groups:32,ticks:64,capacity:0,rail:0}],['closure-recovery',{groups:32,ticks:192,closedFrom:32,closedUntil:128}],['saturated',{groups:32,ticks:128,capacity:1,rail:0}],['upgraded',{groups:32,ticks:128,capacity:40,rail:40}],['hundred-thousand',{}],['million',{population:1000000}],['million-repeat',{population:1000000}]];
const report={passed:false,model:'Integer-mass bidirectional corridor cohorts; approximate residence/travel compartments, not individual agents',artifact_sha256:selection.artifact_sha256,compiler_sha256:selection.compiler_sha256,samples:[]};let checks=0;
for(const [name,patch] of cases){
 const input={...defaults,...patch};const r=runCase(input,'meso-'+name,'meso-benchmark');const result=r.result;
 assert.equal(result.state.cohorts.length,input.groups);assert.equal(result.state.population,input.population);assert.equal(result.final.tick,input.ticks);checks+=3;
 for(const c of result.state.cohorts){const parts=['home','queuedOut','outbound','work','queuedBack','inbound'];for(const key of parts){assert(Number.isSafeInteger(c[key])&&c[key]>=0);checks++;}assert.equal(parts.reduce((n,k)=>n+c[k],0),c.population);assert.equal(c.requested-c.arrived,c.queuedOut+c.outbound+c.queuedBack+c.inbound);assert.equal(c.roadTrips+c.railTrips,c.arrived+c.outbound+c.inbound);checks+=3;}
 assert.equal(result.final.population,input.population);assert.equal(result.final.massError,0);assert.equal(result.final.journeyError,0);checks+=3;
 const encoded=r.observation.match(/production-observation=("(?:[^"\\]|\\.)*")/);assert(encoded);const observation=JSON.parse(JSON.parse(encoded[1]));
 const invocationMs=Number(r.observation.match(/invocation-nanoseconds=(\d+)/)?.[1])/1e6;assert(Number.isFinite(invocationMs));
 const sample={name,input,final:result.final,wall_ms:r.wall_ms,invocation_ms:invocationMs,average_ms_per_cycle:invocationMs/input.ticks,instructions:observation.instructions,allocated_bytes:observation.allocated_bytes,state_json_bytes:Buffer.byteLength(JSON.stringify(result.state)),peak_rss_kib:r.peak_rss_kib};report.samples.push(sample);
 fs.writeFileSync('evidence/mesoscopic.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(sample));
}
const closed=report.samples.find(s=>s.name==='closed'),recovery=report.samples.find(s=>s.name==='closure-recovery'),slow=report.samples.find(s=>s.name==='saturated'),fast=report.samples.find(s=>s.name==='upgraded');
assert.equal(closed.final.arrived,0);assert.equal(closed.final.roadTrips+closed.final.railTrips,0);assert(closed.final.queued>0);assert(recovery.final.arrived>0);assert(fast.final.visits>slow.final.visits);assert(fast.final.queued<slow.final.queued);checks+=6;
assert.deepEqual(report.samples.at(-1).final,report.samples.at(-2).final);checks++;
report.checks=checks;report.passed=true;fs.writeFileSync('evidence/mesoscopic.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,checks,samples:report.samples.length}));
