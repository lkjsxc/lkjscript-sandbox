// Dense demand is an explicit synthetic workload, separate from legal player tests.
import fs from 'node:fs';import os from 'node:os';import assert from 'node:assert/strict';
import {runCase,selection} from './run-case.mjs';
const tiles=new Map(),id=(x,y)=>x+128*y;
const population=Number(process.env.RAIL_LOAD_POPULATION||256);assert([256,512].includes(population));
const prefix=population===256?'rail-load':'rail-load-'+population;
function tile(x,y,kind){tiles.set(id(x,y),{id:id(x,y),kind,q:0})}
for(let y=2;y<=37;y++){tile(8,y,2);tile(61,y,2)}
for(let x=8;x<=61;x++){tile(x,2,2);tile(x,37,2)}
for(let y=4;y<36;y++)tile(7,y,3);
for(let y=4;y<20;y++)tile(62,y,4);
tile(7,3,5);tile(62,20,6);
if(population===512){
 for(let y=38;y<=41;y++){tile(8,y,2);tile(61,y,2)}
 const homeRows=Array.from({length:38},(_,i)=>i+4).filter(y=>![18,22,26,30,37].includes(y)).slice(0,32);
 const jobRows=Array.from({length:22},(_,i)=>i+4).filter(y=>![18,22,26,30].includes(y)).slice(0,16);
 for(const y of homeRows)tile(9,y,3);for(const y of jobRows)tile(60,y,4);
}
const commands=[18,22,26,30].map(y=>({op:'build-rail',x:9,y,x2:60,y2:y,kind:0}));
let result=runCase({rows:0,ticks:0,tiles:[...tiles.values()],commands,after:[]},prefix+'-start').result;
assert.equal(result.city.sim.population,population);assert.equal(result.city.sim.transit.ids.length,4);
const samples=[],wall=[];
for(let i=0;i<8;i++) {
 const measured=runCase({city:result.city,ticks:128,commands:[],after:[]},prefix+'-chunk-'+i,'continuation');
 result=measured.result;const s=result.city.sim;assert.equal(result.conservation,0);assert.equal(s.cancelled,0);assert.equal(result.agents.length,population);
 for(const[,l]of s.transit.lines)assert(l.passengers.length<=16);
 const planning=result.agents.filter(a=>a.state===1&&a.reason===8);
 samples.push({tick:s.tick,arrived:s.arrived,carTrips:s.carTrips,boardings:s.transit.boardings,railCompleted:s.transit.completed,spent:s.transit.spent,cash:result.city.cash,waiting:s.waiting,disconnected:s.disconnected,planning:planning.length,maxPlanningWait:Math.max(0,...planning.map(a=>a.wait)),neverArrived:result.agents.filter(a=>a.journeys===0).length,routes:s.routes.length,lookup:s.lookup.length,perLine:s.transit.lines.map(([,l])=>({id:l.id,boardings:l.boardings,waitingA:l.queueA.length,waitingB:l.queueB.length,occupancy:l.passengers.length}))});
 wall.push({wall_ms:measured.wall_ms,native_invocation_ms:Number(measured.observation.match(/invocation-nanoseconds=(\d+)/)?.[1])/1e6,peak_rss_kib:measured.peak_rss_kib});console.log(samples.at(-1));
}
const report={passed:true,artifact_sha256:selection.artifact_sha256,population,environment:{cpu:os.cpus()[0].model,kernel:os.release(),node:process.version},workload:`Synthetic ${population}-resident city, ${population/16} workplaces, 4 overlapping catchments on distinct parallel shuttles. Eight ordinary native 128-cycle continuations include cache pruning. $10,000 fixture budget, no injected agents/routes. Wall time includes cold executable and bundle loading; native invocation excludes loading. Optional getrusage(RUSAGE_CHILDREN) measures peak RSS of the single native child. Python only launches and measures that child. This is not an interactive latency benchmark.`,tiles:tiles.size+8,samples,chunks:wall};
fs.writeFileSync('evidence/'+prefix+'.json',JSON.stringify(report,null,2));fs.writeFileSync('runtime/'+prefix+'-fixture.json',JSON.stringify(result.city));
