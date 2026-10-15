// Missing projection identities are not evidence of completed movement.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TrafficMotion,actorPose,actorPath} from '../web/motion.js';
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
// A retiring leader must not become a stationary obstacle that others pass.
for(const mode of [1,2,3])for(const [dir,dx,dy]of [[0,1,0],[1,0,1],[2,-1,0],[3,0,-1]]){
 const map=new Map([[center,{kind:1}],[center+dx+dy*128,{kind:1}]]),m=new TrafficMotion();
 const lead={id:2,mode,from:center,to:center+dx+dy*128,dir,out:dir,lane:0,rank:0,elapsed:mode===2?0:1,duration:mode===2?2:4};
 const tail={...lead,id:4,rank:mode===2?1:0,elapsed:0};
 m.receive(frame(20,[lead,tail]),0,map);m.receive(frame(21,[{...tail,rank:0,elapsed:1}]),500,map);
 let retired=false;
 for(let now=500;now<1000;now+=10){const poses=m.sample(now),a=poses.find(x=>x.id===2),b=poses.find(x=>x.id===4);assert(b,'Keep the observed follower');if(a)assert(a.x*dx+a.y*dy>=b.x*dx+b.y*dy,'Retire the omitted stand-in before a reverse crossing');else retired=true;}
 assert(retired);checks.push('Retiring leader cannot be passed by its observed follower, mode '+mode+', direction '+dir);
}
// Use arc distance, not an x/y sort, on turns and curved facility entrances.
for(const mode of [1,2,3])for(let dir=0;dir<4;dir++)for(const kind of [2,4])for(const turn of kind===4?[0]:[0,1,3]){
 const [dx,dy]=[[1,0],[0,1],[-1,0],[0,-1]][dir],from=center-dx-dy*128;
 const map=new Map([[from,{kind:2}],[center,{kind}]]),m=new TrafficMotion();
 const lead={id:2,mode,from,to:center,dir,out:(dir+turn)%4,lane:0,rank:0,elapsed:2,duration:4};
 const tail={...lead,id:4,rank:mode===2?1:0,elapsed:0},next={...tail,rank:0,elapsed:3};
 const p=actorPath(lead,map),extra=mode===2?1:0;
 const station=a=>(a.elapsed+extra)/(a.duration+extra)*p.length-(mode===2?a.rank*.25:0);
 const stop=station(lead),start=station(tail),end=station(next);
 m.receive(frame(20,[lead,tail]),0,map);m.receive(frame(22,[next]),1000,map);
 let retired=false;
 for(let now=1000;now<2300;now+=10){
  const poses=m.sample(now),a=poses.find(x=>x.id===2),b=poses.find(x=>x.id===4),fraction=Math.min(1,(m.time-20)/2),along=start+(end-start)*fraction;
  assert(b);const expected=p.at(along);assert(Math.hypot(b.x-expected.x,b.y-expected.y)<1e-9,'Observed curved motion remains exact');
  if(a)assert(along<stop+1e-9,'An observed follower never passes a visible omitted leader in arc order');else retired=true;
 }
 assert(retired);checks.push('Curved-path order, mode '+mode+', direction '+dir+', turn '+turn+', destination kind '+kind);
}
fs.mkdirSync('evidence',{recursive:true});fs.writeFileSync('evidence/motion-sampling.json',JSON.stringify({passed:true,checks},null,2)+'\n');
console.log({passed:true,checks});
