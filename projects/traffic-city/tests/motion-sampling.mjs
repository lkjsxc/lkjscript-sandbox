// Missing projection identities are not evidence of completed movement.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TrafficMotion,actorPose} from '../web/motion.js';
const center=50+50*128,cells=new Map([[center,{kind:1}],[center+1,{kind:1}]]);
const frame=(tick,actors)=>({stats:{tick,version:1,paused:false},actors,rails:[],view:{layer:0},mapChanged:false});
const checks=[];
for(const mode of [1,2,3]){
 const motion=new TrafficMotion();
 const leader={id:2,mode,from:center,to:center+1,dir:0,out:0,lane:0,rank:0,elapsed:2,duration:8};
 const follower={...leader,id:4,rank:mode===2?1:0,elapsed:1};
 const expected=actorPose(follower,cells);
 motion.receive(frame(10,[leader,follower]),0,cells);
 motion.receive(frame(11,[{...leader,elapsed:3}]),500,cells);
 let observed=0;
 for(let now=500;now<=1000;now+=10){
  const poses=motion.sample(now),head=poses.find(a=>a.id===2),tail=poses.find(a=>a.id===4);
  if(tail){observed++;assert(Math.hypot(tail.x-expected.x,tail.y-expected.y)<1e-10,'An unobserved traveller must not be accelerated to the end of its path');assert(tail.x<=head.x,'Projection churn must not make a follower pass its leader');}
 }
 assert(observed>0,'History remains visible until its received interval finishes');
 motion.sample(10000);assert.equal(motion.rendered.some(a=>a.id===4),false,'Unobserved identities must not persist indefinitely');
 checks.push('Missing identity retains last observed position without overtaking, mode '+mode);
}
fs.mkdirSync('evidence',{recursive:true});fs.writeFileSync('evidence/motion-sampling.json',JSON.stringify({passed:true,checks},null,2)+'\n');
console.log({passed:true,checks});
