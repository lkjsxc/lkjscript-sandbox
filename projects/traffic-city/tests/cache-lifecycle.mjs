// Exercise preparation/upgrade paths and queue changes, never a real saved city.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.env.CITY_SELECTION ||= '.build/routing-verified-cache083.json';
const {runCase,selection}=await import('./run-case.mjs?cache-lifecycle');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fixtures=[{name:'oneway',tiles:[[129,3],[130,9],[131,9],[132,4]],origin:129,dest:132,costs:[12,5,12,-1]}];
const t=[[2560,3],[2561,13],[2569,13],[2570,4],[2565,6]];for(let i=1;i<=9;i++)t.push([16384+2560+i,1]);
fixtures.push({name:'tunnel',tiles:t,origin:2560,dest:2570});
const results=[];
for(const fixture of fixtures){
 const world=runCase(fixture.tiles,'cache-lifecycle-prepare-'+fixture.name,'route-world').result;
 const queries=[{origin:fixture.origin,dest:fixture.dest,mode:1},{origin:fixture.origin,dest:fixture.dest,mode:2},{origin:fixture.dest,dest:fixture.origin,mode:1},{origin:fixture.dest,dest:fixture.origin,mode:2}];
 const baseline=runCase({world,q:[],queries},'cache-lifecycle-fresh-'+fixture.name,'route-warm').result;
 if(fixture.costs)assert.deepEqual(baseline.map(r=>r.cost),fixture.costs);
 const variants={
  'legacy-axis-only':world.junctions.filter(([key])=>key>=-257),
  'obsolete-mask-format':world.junctions.map(([key,value])=>[key,key===-258?1:key<=-1024?999999:value]),
  'missing-prefix':world.junctions.filter(([key])=>key>=0||key<=-258),
  'missing-adjacency':world.junctions.filter(([key])=>key>-1024),
 };
 for(const [name,junctions]of Object.entries(variants)){
  const candidate={...world,junctions},input={world:candidate,q:[],queries};
  const r=runCase(input,'cache-lifecycle-'+fixture.name+'-'+name,'route-warm');assert.deepEqual(r.result,baseline);
  results.push({fixture:fixture.name,name,result_sha256:hash(r.result)});
 }
 // Queues change edge weights while the prepared topology remains immutable.
 const q=world.tiles.filter(([,kind])=>[1,2,9,10,11,12,13].includes(kind)).map(([id])=>[id,48]);
 const congested=runCase({world,q,queries},'cache-lifecycle-queues-'+fixture.name,'route-warm').result;
 for(let i=0;i<queries.length;i++){if(queries[i].mode===1)assert.deepEqual(congested[i],baseline[i]);else if(baseline[i].cost>=0)assert(congested[i].cost>baseline[i].cost)}
 results.push({fixture:fixture.name,name:'dynamic-queues-not-cached',result_sha256:hash(congested)});
 const invalid=[{origin:-1,dest:fixture.dest,mode:1},{origin:32768,dest:fixture.dest,mode:1},{origin:fixture.origin,dest:32768,mode:1},{origin:fixture.origin,dest:fixture.dest,mode:0},{origin:fixture.origin,dest:fixture.dest,mode:3},{origin:fixture.origin,dest:15000,mode:1}];
 const refused=runCase({world,q:[],queries:invalid},'cache-lifecycle-invalid-'+fixture.name,'route-warm').result;for(const route of refused){assert.equal(route.cost,-1);assert.deepEqual(route.path,[])}
 results.push({fixture:fixture.name,name:'invalid-endpoints-or-modes',result_sha256:hash(refused)});
}
const reverseTiles=[[129,3],[130,11],[131,11],[132,4]],reverseWorld=runCase(reverseTiles,'cache-lifecycle-reverse-prepare','route-world').result;
const reversed=runCase({world:reverseWorld,q:[],queries:[{origin:129,dest:132,mode:2},{origin:132,dest:129,mode:2}]},'cache-lifecycle-reversed-direction','route-warm').result;assert.deepEqual(reversed.map(r=>r.cost),[-1,5]);results.push({fixture:'oneway',name:'native-rebuild-changes-direction',result_sha256:hash(reversed)});
const report={passed:true,checks:results.length,scope:'Synthetic prepared-world compatibility and dynamic weights. This is not a data-store migration, game edit or deployment test.',artifact_sha256:selection.artifact_sha256,compiler_sha256:selection.compiler_sha256,results};fs.writeFileSync('evidence/cache-lifecycle.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
