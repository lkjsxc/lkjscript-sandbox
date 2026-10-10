import fs from 'node:fs';
import assert from 'node:assert/strict';
process.env.CITY_SELECTION ||= '.build/routing-relaxed-probes.json';
const {runCase,selection} = await import('./run-case.mjs');
const id=(x,y)=>x+y*128;
const tiles=new Map();
for(let x=10;x<=16;x++){tiles.set(id(x,10),1);tiles.set(id(x,11),1);}
tiles.set(id(10,10),3);tiles.set(id(16,10),4);
const queries=[1,2].map(mode=>({origin:id(10,10),dest:id(16,10),mode}));
const empty={tiles:[...tiles],q:[],queries};
const crowded={...empty,q:Array.from({length:5},(_,i)=>[id(11+i,10),30])};
const fresh=runCase(empty,'relaxed-policy-empty','commute-route-probe').result;
const jam=runCase(crowded,'relaxed-policy-crowded','commute-route-probe').result;
const reference=runCase(crowded,'relaxed-policy-reference','route-probe').result;
assert.deepEqual(jam[0],reference[0],'Walking keeps the reference policy exactly');
assert.deepEqual(jam[1].path,fresh[1].path,'Changing queues must not change topology-first path selection');
assert.equal(jam[1].path.length,7);
assert(jam[1].cost>fresh[1].cost,'Reported time must still include congestion on the selected path');
assert(reference[1].path.length>jam[1].path.length,'The fixture must demonstrate the deliberate shortest-time tradeoff');
assert(reference[1].cost<jam[1].cost);
assert.deepEqual(runCase(crowded,'relaxed-policy-repeat','commute-route-probe').result,jam);
const edgeQueries=[{origin:id(10,10),dest:id(10,10),mode:2},{origin:-1,dest:id(16,10),mode:2},{origin:32768,dest:id(16,10),mode:2},{origin:id(10,10),dest:32768,mode:2},{origin:id(10,10),dest:id(16,10),mode:0},{origin:id(10,10),dest:id(16,10),mode:3}];
const edge=runCase({...empty,queries:edgeQueries},'relaxed-policy-invalid','commute-route-probe').result;
assert.deepEqual(edge[0].path,[id(10,10)]);assert.equal(edge[0].cost,0);
for(const route of edge.slice(1)){assert.equal(route.cost,-1);assert.deepEqual(route.path,[]);}
const report={passed:true,artifact_sha256:selection.artifact_sha256,checks:['exact walking unchanged','queue-independent driving geometry','congestion still included in returned estimate','explicit shortest-time versus shortest-hop tradeoff','deterministic native replay','singleton and invalid queries'],shortest_hop:{hops:jam[1].path.length-1,cost:jam[1].cost},shortest_time:{hops:reference[1].path.length-1,cost:reference[1].cost}};
fs.writeFileSync('evidence/relaxed-routing-policy.json',JSON.stringify(report,null,2)+'\n');console.log(report);
