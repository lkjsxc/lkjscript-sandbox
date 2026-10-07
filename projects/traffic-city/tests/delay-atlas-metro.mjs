import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
import {startNative,connect,memory,root} from './native.mjs';
import {runCase,selection} from './run-case.mjs';
import {expectedAtlas} from './atlas-oracle.mjs';
import {decodeAtlas} from '../web/atlas.js';
const origin=runCase(3,'atlas-metro-origin','scenario-seed').result;
const intervention={op:'rail-service',x:origin.sim.transit.ids[0],y:0,x2:0,y2:0,kind:0};
const plan=runCase({city:origin,ticks:0,commands:[intervention],after:[]},'atlas-metro-plan','continuation').result.city;
// Keep raw observation output within the unchanged typed JSON item limit.
// Each continuation carries the entire native city, including routes and trains.
function timeline(city,name){
 const frames=[];let current=city;
 for(let tick=0;tick<64;tick+=8){
  const next=runCase({city:current,ticks:8},name+'-'+tick,'atlas-probe').result;
  assert.equal(next.frames.length,8);assert.equal(next.frames[0].tick,current.sim.tick+1);
  frames.push(...next.frames);current=next.city;
 }return {city:current,frames};
}
const a=timeline(origin,'atlas-metro-a');
const b=timeline(plan,'atlas-metro-b');
const expected=expectedAtlas(origin.sim,plan.sim,a.frames,b.frames);
const native=await startNative({name:'delay-atlas-metro',tick:25}),c=connect(native.address),key=randomBytes(32).toString('hex'),owner=randomBytes(16).toString('hex');let id=0;
async function send(op,fields={}){const next=++id;c.socket.send(JSON.stringify({id:next,token:op==='resume'?key:'',owner:op==='resume'?owner:'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));const f=await c.wait(f=>f.ack===next,120000);assert.equal(f.status,1);return f}
try{
 await c.wait(f=>f.seq===1);await send('resume');let f=await send('review-scenario',{kind:3});f=await send('load-scenario',{kind:3,x:f.confirmation});const original=f.stats;
 await send('lab-start');await send('rail-service',intervention);const start=await send('lab-run',{kind:64}),wall=performance.now();
 const done=await c.wait(f=>f.seq>start.seq&&f.lab.phase===4,300000),frames=c.frames.filter(f=>f.seq>=start.seq&&f.seq<=done.seq);
 assert.deepEqual(decodeAtlas(done.lab.atlas),expected);assert.equal(expected.same,512);assert.equal(expected.homes.length,64);
 assert.equal(expected.baseLost,done.lab.control.disconnectedCycles);assert.equal(expected.planLost,done.lab.changed.disconnectedCycles);
 assert.equal(expected.baseWait,a.frames.reduce((sum,f)=>sum+f.residents.filter(r=>r.wait>=8).length,0));
 for(const frame of frames){assert.equal(frame.stats.wealthError,0);assert.equal(frame.saved,original.tick);assert.equal(frame.lab.realTick,original.tick);for(const l of frame.rails)assert(l.occupancy<=l.capacity);assert(frame.bytes<131072)}
 for(const [result,stats]of [[a,done.lab.control],[b,done.lab.changed]]){assert.equal(result.city.sim.visits-origin.sim.visits,stats.visits);assert.equal(result.city.sim.arrived-origin.sim.arrived,stats.arrived)}
 const result={passed:true,artifact_sha256:selection.artifact_sha256,population:512,homes:64,horizon:64,comparison:expected,maximum_frame_bytes:Math.max(...frames.map(f=>f.bytes)),paired_wall_ms:performance.now()-wall,memory:memory(native.child.pid),checks:['65,536 resident observations independently reduced against every native per-home and cohort field','Paid trains remain within capacity; original saves and accounts unchanged','Disconnected and long-wait exposure match independent frame totals']};
 f=await send('lab-discard');assert.deepEqual(f.stats,original);result.checks.push('Discard restores both original enabled rail services and exact city statistics');
 fs.writeFileSync(root+'/evidence/delay-atlas-metro.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await c.close();await native.stop()}
