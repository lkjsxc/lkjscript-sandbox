import {facilityPort,isFacility} from './geometry.js';
// Display geometry only. Every route, FIFO rank, edge admission and clock tick
// comes from lkjscript. This module neither predicts nor advances the city.
const TAU=Math.PI*2, D=[[1,0],[0,1],[-1,0],[0,-1]];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const point=id=>({x:id%128+.5,y:Math.floor(id/128)+.5});
const plus=(p,d,n)=>({x:p.x+d[0]*n,y:p.y+d[1]*n});
const normal=d=>[-d[1],d[0]];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const laneSide=(a,kind)=>a.mode===2?.12+(kind===2?a.id%2:0)*.15:kind===7?0:kind===2?.38:.34;
const ANCHOR=.42, GAP=.25;
function anchor(a,id,dir,cells){return plus(plus(point(id),D[dir],ANCHOR),normal(D[dir]),laneSide(a,cells.get(id)?.kind))}
function parking(a){const p=point(a.to),rank=a.rank||0,d=D[a.out??a.dir],n=normal(d),lateral=[.12,-.10,-.32,.34][Math.floor(rank/4)%4],position=plus(plus(p,d,.25-(rank%4)*.22),n,lateral);return{...position,angle:Math.atan2(d[1],d[0])}}
function line(a,b){const length=distance(a,b);return{length,at:t=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.y-a.y,b.x-a.x)})}}
function cubic(a,b,c,d){const at=t=>{const s=1-t,x=s*s*s*a.x+3*s*s*t*b.x+3*s*t*t*c.x+t*t*t*d.x,y=s*s*s*a.y+3*s*s*t*b.y+3*s*t*t*c.y+t*t*t*d.y,dx=3*s*s*(b.x-a.x)+6*s*t*(c.x-b.x)+3*t*t*(d.x-c.x),dy=3*s*s*(b.y-a.y)+6*s*t*(c.y-b.y)+3*t*t*(d.y-c.y);return{x,y,angle:Math.atan2(dy,dx)}};const lut=[0];let previous=a;for(let i=1;i<=32;i++){const p=at(i/32);lut.push(lut.at(-1)+distance(p,previous));previous=p}const length=lut.at(-1);return{length,at:f=>{const s=f*length;let i=1;while(i<32&&lut[i]<s)i++;return at((i-1+(s-lut[i-1])/(lut[i]-lut[i-1]||1))/32)}}}
function path(segments){const length=segments.reduce((s,p)=>s+p.length,0);return{length,at:s=>{if(s<0){const p=segments[0].at(0);return{x:p.x+Math.cos(p.angle)*s,y:p.y+Math.sin(p.angle)*s,angle:p.angle}}s=Math.min(s,length);for(const p of segments){if(s<=p.length+1e-9)return p.at(p.length?s/p.length:1);s-=p.length}return segments.at(-1).at(1)}}}
function basePath(a,cells){const fromKind=cells.get(a.from)?.kind,toKind=cells.get(a.to)?.kind,leaving=isFacility(fromKind),entering=isFacility(toKind),start=leaving?facilityPort(a.from,a.dir,fromKind):anchor(a,a.from,a.dir,cells),center=point(a.to),incoming=D[a.dir],out=a.out??a.dir,outgoing=D[out],end=entering?facilityPort(a.to,(a.dir+2)%4,toKind):anchor(a,a.to,out,cells),turn=(out-a.dir+4)%4;
 if(a.from===a.to){const p=entering?facilityPort(a.to,out,toKind):a.mode===2?parking(a):anchor(a,a.to,out,cells);return{length:0,at:()=>p}}
 if(entering){if(leaving)return path([line(start,end)]);return path([cubic(start,plus(start,incoming,.28),plus(end,incoming,-.2),end)])}
 const side=laneSide(a,toKind);
 if(turn===0){const travel=distance(start,end)/3;return path([cubic(start,plus(start,incoming,travel),plus(end,incoming,-travel),end)])}
 const bendStart=plus(plus(center,incoming,-ANCHOR),normal(incoming),side),approach=Math.max(.01,Math.abs((bendStart.x-start.x)*incoming[0]+(bendStart.y-start.y)*incoming[1]))/3;
 if(turn===2){return path([cubic(start,plus(start,incoming,.3),plus(end,outgoing,-.3),end)])}
 const sign=turn===1?1:-1,radius=ANCHOR-sign*side,arcCenter=plus(bendStart,normal(incoming),sign*radius),angle=Math.atan2(bendStart.y-arcCenter.y,bendStart.x-arcCenter.x);
 return path([cubic(start,plus(start,incoming,approach),plus(bendStart,incoming,-approach),bendStart),{length:Math.PI/2*radius,at:t=>{const theta=angle+sign*t*Math.PI/2;return{x:arcCenter.x+Math.cos(theta)*radius,y:arcCenter.y+Math.sin(theta)*radius,angle:theta+sign*Math.PI/2}}}])
}
export function actorPath(a,cells){const p=basePath(a,cells);return{length:p.length,at:s=>{if(s<0&&a.trail){const previous=actorPath(a.trail,cells);return previous.at(previous.length+s)}return p.at(s)}}}
function trailCopy(a,depth=2){if(!a)return undefined;const {trail,...copy}=a;return depth?{...copy,trail:trailCopy(trail,depth-1)}:copy}
function station(a,p,cells){const lead=a.mode===2&&!isFacility(cells?.get(a.from)?.kind)?1:0,progress=a.duration?clamp((a.elapsed+lead)/(a.duration+lead),0,1):1;const s=progress*p.length-(a.mode===2?(a.rank||0)*GAP:0);return isFacility(cells?.get(a.from)?.kind)?Math.max(0,s):s}
function blend(a,b,t){let delta=Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle));return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:a.angle+delta*t}}
export function actorPose(a,cells){const p=actorPath(a,cells);return p.at(station(a,p,cells))}
export function transitionPose(a,b,t,cells){const p=actorPath(a,cells),q=actorPath(b,cells),s=station(a,p,cells),e=station(b,q,cells);
 if(a.from===b.from&&a.to===b.to&&a.out===b.out){if(a.from===a.to)return blend(p.at(0),q.at(0),t);return p.at(s+(e-s)*t)}
 if(a.to===b.from&&a.mode===b.mode){
  if(a.from===a.to){const parked=p.at(0),start=q.at(0),dir=D[b.dir],advance=Math.max(.01,(start.x-parked.x)*dir[0]+(start.y-parked.y)*dir[1])/3,connector=cubic(parked,plus(parked,dir,advance),plus(start,dir,-advance),start),length=connector.length+e,pos=t*length;return pos<connector.length?connector.at(pos/connector.length):q.at(pos-connector.length)}
  const remaining=p.length-s,length=remaining+e,pos=t*length;
  return pos<remaining?p.at(s+pos):q.at(pos-remaining)
 }
 // An authoritative re-route/reset can break adjacency. Never extrapolate an
 // invented journey: settle the newly committed pose without a diagonal trip.
 return actorPose(b,cells)
}
export class TrafficMotion{
 constructor(){this.frames=new Map();this.latest=-1;this.time=-1;this.at=0;this.version=-1;this.cells=new Map();this.rendered=[]}
 clock(now,reduced=false){if(this.latest<0)return 0;this.time=reduced?this.latest:Math.min(this.latest,this.time+Math.max(0,now-this.at)/500);this.at=now;return this.time}
 receive(frame,now,cells){this.cells=cells;const tick=frame.stats.tick;
  if(this.latest<0||tick<this.latest||frame.stats.version!==this.version){this.frames.clear();this.latest=tick;this.time=tick;this.at=now;this.version=frame.stats.version}
  this.clock(now);this.latest=tick;
  if(frame.mapChanged){this.visible=false;this.rendered=[];return}
  this.visible=true;
  const current=this.time>=tick?new Map():this.frames.get(tick)||new Map();
  // Same-tick view/inspect/save replies revise this snapshot without changing
  // the timeline or the preceding snapshot used by interpolation.
  for(const a of frame.actors){const old=current.get(a.id)||this.frames.get(tick-1)?.get(a.id);const trail=old?.from===a.from&&old?.to===a.to?old.trail:old?.to===a.from?trailCopy(old):undefined;current.set(a.id,{...a,trail})}
  this.frames.set(tick,current);this.active=new Set(frame.actors.map(a=>a.id));
  for(const k of this.frames.keys())if(k<tick-3)this.frames.delete(k);
  if(this.time<tick-2)this.time=tick-1;
 }
 sample(now,reduced=false){const time=this.clock(now,reduced);if(!this.visible)return this.rendered=[];
  const ticks=[...this.frames.keys()].sort((a,b)=>a-b),lo=ticks.filter(t=>t<=time).at(-1)??ticks[0],hi=ticks.find(t=>t>time)??lo;
  const a=this.frames.get(lo)||new Map(),b=this.frames.get(hi)||a,t=hi===lo?1:clamp((time-lo)/(hi-lo),0,1),ids=new Set([...a.keys(),...b.keys()]);
  const poses=[];
  for(const id of ids){const previous=a.get(id),next=b.get(id);if(!this.active?.has(id)&&time>=this.latest)continue;
   const current=next||previous;let pose;
   if(previous&&next)pose=transitionPose(previous,next,t,this.cells);
   else if(previous){const p=actorPath(previous,this.cells),s=station(previous,p,this.cells);pose=p.at(s+(p.length-s)*t)}
   else {if(hi!==lo&&t<1)continue;pose=actorPose(next,this.cells)}
   poses.push({...current,...pose})
  }
  return this.rendered=poses;
 }
}

// Schematic screen-space minimum; positions and time remain native-authoritative.
export function pedestrianSize(scale){
 if(!Number.isFinite(scale)||scale<=0)throw new RangeError('Positive camera scale required');
 return {radius:Math.max(1.5,scale*.06)/scale,outline:.7/scale,detailed:scale>=16};
}
export function streetCaption(frame){
 if(frame.mapChanged)return {counts:'Updating street view…',sample:''};
 const walking=frame.streetWalkers||0,driving=frame.streetDrivers||0,shown=frame.actors?.length||0,total=walking+driving;
 return {counts:`In view · ${walking.toLocaleString('en-US')} on foot · ${driving.toLocaleString('en-US')} in cars`,sample:shown<total?`${shown} of ${total.toLocaleString('en-US')} shown · zoom for detail`:`${shown} street travellers shown`};
}
