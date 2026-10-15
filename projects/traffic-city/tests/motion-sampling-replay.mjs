// Replay the exact same recorded native wire scenes through both renderers.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {TrafficMotion as Candidate} from '../web/motion.js';
assert(process.env.BASELINE_MOTION,'Select a separately retained baseline motion.js');
const {TrafficMotion:Baseline}=await import(pathToFileURL(path.resolve(process.env.BASELINE_MOTION)));
const capture=JSON.parse(fs.readFileSync(process.env.ORDER_CAPTURE||'evidence/queue-order-before-4.json'));
const before=new Baseline(),after=new Candidate(),cells=new Map();
const reports=[{label:'before',unknownMoving:0,crossings:new Set()},{label:'after',unknownMoving:0,crossings:new Set()}];
let samples=0,unknown=0,unchanged=0,realOmissions=0;
const direction=[[1,0],[0,1],[-1,0],[0,-1]];
function inspect(motion,report,poses){
 const p=motion.prepared;if(!p||p.lo===p.hi)return;
 const previous=motion.frames.get(p.lo),next=motion.frames.get(p.hi),lookup=new Map(poses.map(a=>[a.id,a]));
 for(const a of previous?.values()||[]){
  if(next.has(a.id))continue;
  const pose=lookup.get(a.id);if(!pose)continue;
  const item=p.items.find(i=>i.id===a.id),origin=item.pose(0);
  if(Math.hypot(pose.x-origin.x,pose.y-origin.y)>1e-7)report.unknownMoving++;
  if(a.dir!==a.out||a.from===a.to)continue;
  const [dx,dy]=direction[a.dir],along=v=>v.x*dx+v.y*dy;
  for(const b of previous.values()){
   if(!next.has(b.id)||!lookup.has(b.id)||b.id===a.id||b.from!==a.from||b.to!==a.to||b.dir!==a.dir||b.out!==a.out||(a.mode===2)!==(b.mode===2)||a.mode===2&&a.lane!==b.lane)continue;
   const other=p.items.find(i=>i.id===b.id),old=other.pose(0);
   if(along(origin)<along(old)-1e-7&&along(pose)>along(lookup.get(b.id))+1e-7)report.crossings.add(`${p.lo}:${p.hi}:${a.id}:${b.id}`);
  }
 }
}
let previousNative;
for(let i=0;i<capture.frames.length;i++){
 const {at,frame:f}=capture.frames[i];
 if(f.mapChanged){cells.clear();for(const v of f.overview||[]){const id=Math.floor(v/16);cells.set(id,{id,kind:v%16});}}
 for(const c of f.cells||[])if(c.kind)cells.set(c.id,c);else cells.delete(c.id);
 if(previousNative&&!f.mapChanged&&f.stats.tick>previousNative.stats.tick){const ids=new Set(f.actors.map(a=>a.id));realOmissions+=previousNative.actors.filter(a=>!ids.has(a.id)).length;}
 previousNative=f;before.receive(f,at,cells);after.receive(f,at,cells);
 const until=capture.frames[i+1]?.at??at+1000;
 for(let now=at;now<until;now+=1000/60){
  const b=before.sample(now),a=after.sample(now);assert.equal(after.time,before.time);assert.deepEqual(a.map(x=>x.id),b.map(x=>x.id),'No changed actor sampling/count');
  const pp=after.prepared,next=after.frames.get(pp?.hi),prior=after.frames.get(pp?.lo);
  for(let j=0;j<a.length;j++){
   if(prior?.has(a[j].id)&&!next?.has(a[j].id)){unknown++;const expected=pp.items.find(x=>x.id===a[j].id).pose(0);assert(Math.hypot(a[j].x-expected.x,a[j].y-expected.y)<1e-10);}
   else{unchanged++;assert(Math.hypot(a[j].x-b[j].x,a[j].y-b[j].y)<1e-10,'Observed movement geometry must remain identical');}
  }
  inspect(before,reports[0],b);inspect(after,reports[1],a);samples++;
 }
}
assert(realOmissions>0);assert(unknown>100);assert(reports[0].unknownMoving>0);assert.equal(reports[1].unknownMoving,0);assert.equal(reports[1].crossings.size,0);
const result={passed:true,scenario:capture.scenario,nativeMessages:capture.frames.length,sampledFrames:samples,realOmissions,unknownPoseSamples:unknown,identicalObservedPoses:unchanged,results:reports.map(r=>({...r,crossings:r.crossings.size})),method:'Identical captured native messages and arrival schedule; only unobserved identities change position behavior. Crossings require two previously ordered, same-segment straight travellers, one omitted and the other observed, in the same lane for cars. No native simulation or player store mutation.'};
fs.writeFileSync('evidence/motion-sampling-replay.json',JSON.stringify(result,null,2)+'\n');console.log(result);
