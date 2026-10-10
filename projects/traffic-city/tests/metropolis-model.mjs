// Native workloads only: JavaScript verifies returned results, never simulates.
import assert from 'node:assert/strict';import fs from 'node:fs';
process.env.CITY_SELECTION=process.env.METRO_SELECTION||'.build/metropolis-selection.json';
const {runCase,selection}=await import('./run-case.mjs?metropolis');
const cmd=(op,fields={})=>({op,x:0,y:0,x2:0,y2:0,kind:0,...fields});
const closed=[...Array.from({length:16},(_,y)=>cmd('road',{x:0,y,x2:15,y2:y,kind:0})),...Array.from({length:16},(_,y)=>cmd('rail-h',{y,kind:0})),...Array.from({length:16},(_,x)=>cmd('rail-v',{x,kind:0}))];
const cases=[['zero',{population:0,ticks:32,commands:[]}],['remainder',{population:100003,ticks:64,commands:[]}],['hundred-thousand',{population:100000,ticks:128,commands:[]}],['million',{population:1000000,ticks:128,commands:[]}],['million-repeat',{population:1000000,ticks:128,commands:[]}],['upgraded',{population:100000,ticks:128,commands:[cmd('road',{x2:15,kind:2}),cmd('rail-h',{kind:1})]}],['growth',{population:100000,ticks:64,commands:[cmd('grow',{x:8,y:8})]}],['closed',{population:100000,ticks:64,commands:closed}],['invalid-edit',{population:100000,ticks:0,commands:[cmd('road',{x:-1,x2:3,kind:4}),cmd('road',{x2:15,y2:15,kind:4}),cmd('rail-v',{x:16,kind:1}),cmd('grow',{x:16})]}]];
const report={passed:false,artifact_sha256:selection.artifact_sha256,compiler_sha256:selection.compiler_sha256,samples:[],checks:0};
for(const[name,input]of cases){
 const result=runCase(input,'metropolis-'+name,'metropolis-probe'),city=result.result,s=city.stats;
 const population=input.population+(name==='growth'?1000:0);assert.equal(city.model.population,population);assert.equal(s.population,population);assert.equal(s.tick,input.ticks);assert.equal(city.model.cohorts.length,256);assert.equal(city.roads.length,256);assert.equal(city.rails.length,32);assert.equal(city.cash,50000+city.revenue-city.spent);assert.equal(s.massError,0);assert.equal(s.journeyError,0);report.checks+=9;
 for(const c of city.model.cohorts){const parts=['home','queuedOut','outbound','work','queuedBack','inbound'];for(const k of parts){assert(Number.isSafeInteger(c[k])&&c[k]>=0);report.checks++;}assert.equal(parts.reduce((n,k)=>n+c[k],0),c.population);assert.equal(c.requested-c.arrived,c.queuedOut+c.outbound+c.queuedBack+c.inbound);assert.equal(c.roadTrips+c.railTrips,c.arrived+c.outbound+c.inbound);report.checks+=3;}
 if(name==='closed'){assert.equal(s.arrived,0);assert.equal(s.roadTrips+s.railTrips,0);assert(s.queued>0);assert(city.model.cohorts.every(c=>c.road===0&&c.rail===0));report.checks+=4;}
 if(name==='invalid-edit'){assert.equal(city.spent,0);assert.equal(city.version,1);report.checks+=2;}
 const invocationMs=Number(result.observation.match(/invocation-nanoseconds=(\d+)/)?.[1])/1e6;
 const observation=JSON.parse(JSON.parse(result.observation.match(/production-observation=("(?:[^"\\]|\\.)*")/)[1]));
 const sample={name,input:{population:input.population,ticks:input.ticks,commands:input.commands.length},stats:s,wall_ms:result.wall_ms,invocation_ms:invocationMs,average_ms_per_cycle:input.ticks?invocationMs/input.ticks:null,allocated_bytes:observation.allocated_bytes,instructions:observation.instructions,peak_rss_kib:result.peak_rss_kib,state_json_bytes:Buffer.byteLength(JSON.stringify(city))};
 report.samples.push(sample);fs.writeFileSync('evidence/metropolis-model.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(sample));
}
const byName=Object.fromEntries(report.samples.map(s=>[s.name,s]));assert.deepEqual(byName.million.stats,byName['million-repeat'].stats);assert(byName.upgraded.stats.visits>byName['hundred-thousand'].stats.visits);assert(byName.upgraded.stats.queued<byName['hundred-thousand'].stats.queued);report.checks+=3;
report.passed=true;fs.writeFileSync('evidence/metropolis-model.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,checks:report.checks,cases:cases.length}));
