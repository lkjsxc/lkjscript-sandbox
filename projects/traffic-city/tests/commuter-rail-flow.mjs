// Independent assertions over native train samples at every complete city tick.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {runCase,selection} from './run-case.mjs';
const ticks=128,measured=runCase(ticks,'commuter-rail-trace','commuter-rail-probe'),r=measured.result;
assert.equal(r.paths.length,8);assert.equal(r.frames.length,ticks+1);
const paths=new Map(r.paths.map(l=>[l.id,l.path])),directions=new Map(r.paths.map(l=>[l.id,new Set()])),movingTicks=new Map(r.paths.map(l=>[l.id,0]));
let sharedWaitFrames=0;
for(const [tick,frame] of r.frames.entries()){
 assert.equal(frame.tick,tick);assert.equal(frame.requested,frame.arrived+frame.cancelled+frame.active);assert.equal(frame.cancelled,0);assert.equal(frame.wealth,frame.expected);
 assert.equal(frame.trains.length,8);
 const occupied=new Map();
 for(const train of frame.trains){
  assert(train.enabled);assert(train.elapsed>=0&&train.elapsed<=train.duration);assert(train.occupancy>=0&&train.occupancy<=64);assert(train.waiting>=0);
  if(train.status===4)sharedWaitFrames++;
  if(train.duration>train.elapsed){
   assert.equal(train.status,1);
   const path=paths.get(train.id),a=path.indexOf(train.from),b=path.indexOf(train.to);assert(a>=0&&b>=0&&a!==b);
   directions.get(train.id).add(Math.sign(b-a));movingTicks.set(train.id,movingTicks.get(train.id)+1);
   for(const cell of path.slice(Math.min(a,b),Math.max(a,b)+1)){
    assert(!occupied.has(cell),`Tick ${tick}: services ${occupied.get(cell)} and ${train.id} own shared rail cell ${cell}`);occupied.set(cell,train.id);
   }
   if(train.id>=5)assert.equal(train.from%128,train.to%128,'Added services travel vertically');
  }
 }
}
const last=r.frames.at(-1),lines=last.trains.map(train=>({id:train.id,axis:train.id<=4?'east-west':'north-south',departures:train.departures,moving_ticks:movingTicks.get(train.id),directions:[...directions.get(train.id)].sort(),boardings:train.boardings}));
for(const line of lines){assert(line.departures>=4,`Line ${line.id} must keep departing`);assert(line.moving_ticks>0);assert.deepEqual(line.directions,[-1,1],`Line ${line.id} must move in both directions`);}
assert(sharedWaitFrames>0,'Crossing contention must actually be exercised');
fs.writeFileSync('evidence/commuter-grid/rail-flow.json',JSON.stringify({passed:true,artifact_sha256:selection.artifact_sha256,ticks,wall_ms:measured.wall_ms,shared_wait_frames:sharedWaitFrames,lines,final:{requested:last.requested,arrived:last.arrived,active:last.active}},null,2)+'\n');
console.log(JSON.stringify({passed:true,ticks,wall_ms:measured.wall_ms,shared_wait_frames:sharedWaitFrames,lines},null,2));
