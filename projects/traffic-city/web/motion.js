import {facilityPort,isFacility,layerOf,gridY} from './geometry.js';
// Display geometry only. Every route, FIFO rank, edge admission and clock tick
// comes from lkjscript. This module neither predicts nor advances the city.
const TAU=Math.PI*2, D=[[1,0],[0,1],[-1,0],[0,-1]];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const point=id=>({x:id%128+.5,y:gridY(id)+.5});
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
 if(layerOf(a.from)!==layerOf(a.to)){const p=anchor(a,a.to,a.dir,cells);return{length:0,at:()=>({...p,angle:Math.atan2(D[a.dir][1],D[a.dir][0])})}}
 if(a.from===a.to){const p=entering?facilityPort(a.to,out,toKind):a.mode===2?parking(a):anchor(a,a.to,out,cells);return{length:0,at:()=>p}}
 if(entering){if(leaving)return path([line(start,end)]);return path([cubic(start,plus(start,incoming,.28),plus(end,incoming,-.2),end)])}
 const side=laneSide(a,toKind);
 if(turn===0){const travel=distance(start,end)/3;return path([cubic(start,plus(start,incoming,travel),plus(end,incoming,-travel),end)])}
 const bendStart=plus(plus(center,incoming,-ANCHOR),normal(incoming),side),approach=Math.max(.01,Math.abs((bendStart.x-start.x)*incoming[0]+(bendStart.y-start.y)*incoming[1]))/3;
 if(turn===2){return path([cubic(start,plus(start,incoming,.3),plus(end,outgoing,-.3),end)])}
 const sign=turn===1?1:-1,radius=ANCHOR-sign*side,arcCenter=plus(bendStart,normal(incoming),sign*radius),angle=Math.atan2(bendStart.y-arcCenter.y,bendStart.x-arcCenter.x);
 return path([cubic(start,plus(start,incoming,approach),plus(bendStart,incoming,-approach),bendStart),{length:Math.PI/2*radius,at:t=>{const theta=angle+sign*t*Math.PI/2;return{x:arcCenter.x+Math.cos(theta)*radius,y:arcCenter.y+Math.sin(theta)*radius,angle:theta+sign*Math.PI/2}}}])
}
function compilePath(a,cells,cache){
 if(cache?.has(a))return cache.get(a);
 const p=basePath(a,cells),trail=a.trail?compilePath(a.trail,cells,cache):null;
 const value={length:p.length,at:s=>s<0&&trail?trail.at(trail.length+s):p.at(s)};
 cache?.set(a,value);return value;
}
export function actorPath(a,cells){return compilePath(a,cells)}
function trailCopy(a,depth=2){if(!a)return undefined;const {trail,...copy}=a;return depth?{...copy,trail:trailCopy(trail,depth-1)}:copy}
function station(a,p,cells){const lead=a.mode===2&&!isFacility(cells?.get(a.from)?.kind)?1:0,progress=a.duration?clamp((a.elapsed+lead)/(a.duration+lead),0,1):1;const s=progress*p.length-(a.mode===2?(a.rank||0)*GAP:0);return isFacility(cells?.get(a.from)?.kind)?Math.max(0,s):s}
function blend(a,b,t){const delta=Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle));return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:a.angle+delta*t}}
export function actorPose(a,cells){const p=actorPath(a,cells);return p.at(station(a,p,cells))}
function compileTransition(a,b,cells,paths){
 const p=compilePath(a,cells,paths),q=compilePath(b,cells,paths),s=station(a,p,cells),e=station(b,q,cells);
 if(a.from===b.from&&a.to===b.to&&a.out===b.out){if(a.from===a.to)return t=>blend(p.at(0),q.at(0),t);return t=>p.at(s+(e-s)*t)}
 if(a.to===b.from&&a.mode===b.mode){
  if(a.from===a.to){const parked=p.at(0),start=q.at(0),dir=D[b.dir],advance=Math.max(.01,(start.x-parked.x)*dir[0]+(start.y-parked.y)*dir[1])/3,connector=cubic(parked,plus(parked,dir,advance),plus(start,dir,-advance),start),length=connector.length+e;return t=>{const pos=t*length;return pos<connector.length?connector.at(pos/connector.length):q.at(pos-connector.length)}}
  const remaining=p.length-s,length=remaining+e;return t=>{const pos=t*length;return pos<remaining?p.at(s+pos):q.at(pos-remaining)};
 }
 // Nonadjacent authoritative reroutes/reset are not diagonal invented travel.
 const pose=q.at(e);return()=>pose;
}
export function transitionPose(a,b,t,cells){return compileTransition(a,b,cells)(t)}

// A shared playback clock for already received native snapshots. Extra delay
// absorbs ordinary cadence jitter; it never advances beyond committed state.
// Same-tick inspect/save/view replies do not count as new simulation samples.
export class PresentationClock{
 constructor(){this.reset()}
 reset(tick=-1,now=0,paused=false){this.latest=tick;this.time=tick;this.at=now;this.arrival=now;this.period=500;this.jitter=0;this.intervals=[];this.paused=paused;this.settle=null;this.observations=0}
 receive(tick,now,paused=false){
  if(this.latest<0||tick<this.latest){this.reset(tick,now,paused);return}
  this.sample(now);
  if(tick>this.latest){
   const delta=tick-this.latest,elapsed=now-this.arrival;
   if(!this.paused&&elapsed>0&&elapsed<=5000*delta){
    const interval=clamp(elapsed/delta,80,5000);this.intervals.push(interval);if(this.intervals.length>12)this.intervals.shift();
    // A short burst after a network delay is not a new, faster server cadence.
    const sorted=[...this.intervals].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];
    this.period=this.observations===0?median:this.period+(median-this.period)*.25;
    this.jitter=this.jitter*.8+Math.abs(interval-this.period)*.2;this.observations++;
   }
   this.latest=tick;this.arrival=now;
  }else if(this.paused&&!paused)this.arrival=now;
  if(paused&&!this.paused)this.settle={from:this.time,at:now,duration:Math.min(350,this.period)};
  if(!paused)this.settle=null;
  this.paused=paused;
 }
 sample(now,reduced=false){
  if(this.latest<0)return 0;
  const dt=Math.max(0,now-this.at);this.at=Math.max(now,this.at);
  if(reduced){this.time=this.latest;return this.time}
  if(this.paused){if(this.settle){const t=clamp((now-this.settle.at)/this.settle.duration,0,1);this.time=Math.min(this.latest,this.settle.from+(this.latest-this.settle.from)*t)}return this.time}
  // Integrating a bounded phase correction preserves monotonic motion when a
  // new arrival changes the cadence estimate. No per-packet rewind or snap.
  const extra=clamp(Math.max(80,this.period*.15)+this.jitter*3,80,this.period),delay=1+extra/this.period;
  const desired=this.latest+Math.max(0,now-this.arrival)/this.period-delay;
  const rate=1+clamp((desired-this.time)*.35,-.22,.16);
  this.time=Math.min(this.latest,this.time+dt/this.period*rate);return this.time;
 }
 get diagnostics(){return{periodMs:this.period,jitterMs:this.jitter,bufferTicks:Math.max(0,this.latest-this.time),observations:this.observations}}
}
export class TrafficMotion{
 constructor(){this.frames=new Map();this.railFrames=new Map();this.timeline=new PresentationClock();this.latest=-1;this.time=-1;this.version=-1;this.layer=-1;this.cells=new Map();this.rendered=[];this.revision=0;this.prepared=null;this.preparations=0}
 clock(now,reduced=false){this.time=this.timeline.sample(now,reduced);return this.time}
 receive(frame,now,cells){this.cells=cells;const tick=frame.stats.tick;
  if(this.latest<0||tick<this.latest||frame.stats.version!==this.version||(frame.view?.layer||0)!==this.layer){this.frames.clear();this.railFrames.clear();this.timeline.reset(tick,now,!!frame.stats.paused);this.version=frame.stats.version;this.layer=frame.view?.layer||0}
  this.timeline.receive(tick,now,!!frame.stats.paused);this.latest=tick;this.time=this.timeline.time;this.revision++;
  this.railFrames.set(tick,new Map((frame.rails||[]).map(l=>[l.id,l])));
  if(frame.mapChanged){this.visible=false;this.rendered=[];this.prepared=null;return}
  this.visible=true;
  const current=this.time>=tick?new Map():this.frames.get(tick)||new Map();
  for(const a of frame.actors){const old=current.get(a.id)||this.frames.get(tick-1)?.get(a.id);const trail=old?.from===a.from&&old?.to===a.to?old.trail:old?.to===a.from?trailCopy(old):undefined;current.set(a.id,{...a,trail})}
  this.frames.set(tick,current);this.active=new Set(frame.actors.map(a=>a.id));
  // History and trails are bounded, even across long sessions/viewport commands.
  for(const k of this.frames.keys())if(k<tick-7)this.frames.delete(k);
  for(const k of this.railFrames.keys())if(k<tick-7)this.railFrames.delete(k);
  if(this.time<tick-6){this.timeline.time=tick-1;this.time=tick-1;this.prepared=null}
 }
 pair(frames,time){const ticks=[...frames.keys()].sort((a,b)=>a-b),lo=ticks.filter(t=>t<=time).at(-1)??ticks[0],hi=ticks.find(t=>t>time)??lo;return{lo,hi,t:hi===lo?1:clamp((time-lo)/(hi-lo),0,1)}}
 sample(now,reduced=false){const time=this.clock(now,reduced);if(!this.visible)return this.rendered=[];
  const {lo,hi,t}=this.pair(this.frames,time);
  if(!this.prepared||this.prepared.lo!==lo||this.prepared.hi!==hi||this.prepared.revision!==this.revision){
   const a=this.frames.get(lo)||new Map(),b=this.frames.get(hi)||a,paths=new WeakMap(),items=[];
   for(const id of new Set([...a.keys(),...b.keys()])){
    const previous=a.get(id),next=b.get(id),current=next||previous;let pose;
    if(previous&&next)pose=compileTransition(previous,next,this.cells,paths);
    else if(previous){const p=compilePath(previous,this.cells,paths),s=station(previous,p,this.cells);pose=t=>p.at(s+(p.length-s)*t)}
    else {const p=compilePath(next,this.cells,paths),value=p.at(station(next,p,this.cells));pose=()=>value}
    items.push({id,current,pose,born:!previous});
   }
   this.prepared={lo,hi,revision:this.revision,items};this.preparations++;
  }
  const poses=[];for(const item of this.prepared.items){if(!this.active?.has(item.id)&&time>=this.latest||item.born&&hi!==lo&&t<1)continue;poses.push({...item.current,...item.pose(t)})}
  return this.rendered=poses;
 }
 sampleRails(now,reduced=false){const time=this.clock(now,reduced),{lo,hi,t}=this.pair(this.railFrames,time),a=this.railFrames.get(lo)||new Map(),b=this.railFrames.get(hi)||a;return[...b.values()].map(current=>({current,previous:a.get(current.id),mix:t}))}
 get diagnostics(){return{...this.timeline.diagnostics,geometryPreparations:this.preparations,snapshots:this.frames.size}}
}

// Schematic screen-space minimum; positions and time remain native-authoritative.
export function pedestrianSize(scale){
 if(!Number.isFinite(scale)||scale<=0)throw new RangeError('Positive camera scale required');
 return {radius:Math.max(1.5,scale*.05)/scale};
}
export function streetCaption(frame){
 if(frame.mapChanged)return {counts:'Updating street view…',sample:''};
 const walking=frame.streetWalkers||0,driving=frame.streetDrivers||0,shown=frame.actors?.length||0,total=walking+driving;
 return {counts:`In view · ${walking.toLocaleString('en-US')} on foot · ${driving.toLocaleString('en-US')} in cars`,sample:shown<total?`${shown} of ${total.toLocaleString('en-US')} shown · zoom for detail`:`${shown} street travellers shown`};
}

// Presentation work is bounded by screen coverage, never by total population.
// Hysteresis avoids flipping quality levels in response to one expensive frame.
export class RenderBudget {
 constructor(){this.quality=2;this.cost=0;this.count=0;this.slow=0;this.fast=0;this.changes=0}
 observe(milliseconds){
  if(!Number.isFinite(milliseconds)||milliseconds<0)return;
  this.cost=this.count?this.cost*.9+milliseconds*.1:milliseconds;this.count++;
  this.slow=this.cost>12?this.slow+1:0;this.fast=this.cost<6?this.fast+1:0;
  if(this.slow>=30&&this.quality>0){this.quality--;this.slow=0;this.fast=0;this.changes++}
  else if(this.fast>=180&&this.quality<2){this.quality++;this.slow=0;this.fast=0;this.changes++}
 }
 level(scale,moving=false){return scale<7||this.quality===0?0:scale<22||moving||this.quality===1?1:2}
 limit(level){return [256,640,1536][level]}
 get diagnostics(){return{quality:this.quality,meanDrawMs:this.cost,adjustments:this.changes}}
}

// One coherent projection per native frame/camera rectangle. It holds references
// to the latest cells, not a second mutable city. Query cost is visible chunks.
export class TileIndex {
 constructor(size=8){if(!Number.isInteger(size)||size<1||128%size)throw new RangeError('Chunk size must divide 128');this.size=size;this.layers=[new Map(),new Map()];this.revision=0;this.visits=0;this.queryCount=0;this.cached=null}
 rebuild(cells){
  this.layers=[new Map(),new Map()];this.stations=[];this.hot=[[],[]];
  for(const c of cells.values()){
   const layer=layerOf(c.id);if(layer<0||layer>1)continue;
   const key=Math.floor((c.id%128)/this.size)+Math.floor(gridY(c.id)/this.size)*(128/this.size);
   const bucket=this.layers[layer].get(key)||[];bucket.push(c);this.layers[layer].set(key,bucket);
   if(!layer&&c.kind===8)this.stations.push(c.id);
   if(c.q>(c.kind===1?5:c.kind===2?20:8))this.hot[layer].push(c);
  }
  for(const hot of this.hot)hot.sort((a,b)=>b.q-a.q||a.id-b.id);
  this.revision++;this.cached=null;
 }
 query(layer,x0,y0,x1,y1){
  x0=Math.max(0,Math.floor(x0));y0=Math.max(0,Math.floor(y0));x1=Math.min(127,Math.ceil(x1));y1=Math.min(127,Math.ceil(y1));
  const key=[this.revision,layer,x0,y0,x1,y1].join(':');if(this.cached?.key===key)return this.cached.cells;
  const cells=[];this.queryCount++;const buckets=this.layers[layer];
  if(buckets&&x0<=x1&&y0<=y1)for(let cy=Math.floor(y0/this.size);cy<=Math.floor(y1/this.size);cy++)for(let cx=Math.floor(x0/this.size);cx<=Math.floor(x1/this.size);cx++)for(const c of buckets.get(cx+cy*(128/this.size))||[]){this.visits++;const x=c.id%128,y=gridY(c.id);if(x>=x0&&x<=x1&&y>=y0&&y<=y1)cells.push(c)}
  this.cached={key,cells};return cells;
 }
}

// Stable screen-space sampling: a fixed identity hash is independent of the
// arrival order, camera movement and frame cadence. Never materialize population.
export function stableVisualRank(id){let n=id|0;n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return(n^(n>>>16))>>>0}
export function sampleVisualActors(actors,limit){
 if(!Number.isSafeInteger(limit)||limit<0)throw new RangeError('Nonnegative visual budget required');
 if(!limit)return [];if(actors.length<=limit)return actors;
 const heap=[],worse=(a,b)=>a.rank>b.rank||a.rank===b.rank&&a.actor.id>b.actor.id;
 for(const actor of actors){const rank=stableVisualRank(actor.id);
  if(heap.length<limit){let i=heap.length;const entry={actor,rank};heap.push(entry);while(i){const parent=(i-1)>>1;if(!worse(entry,heap[parent]))break;heap[i]=heap[parent];i=parent}heap[i]=entry}
  else if(rank<heap[0].rank||rank===heap[0].rank&&actor.id<heap[0].actor.id){const entry={actor,rank};let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&worse(heap[child+1],heap[child]))child++;if(!worse(heap[child],entry))break;heap[i]=heap[child];i=child}heap[i]=entry}
 }
 return heap.sort((a,b)=>a.rank-b.rank||a.actor.id-b.actor.id).map(item=>item.actor);
}

// Cached rail presentation shared by the existing native HTTP bundle.
export function railPath(l){if(l.path?.length)return l.path;const out=[],dx=Math.sign(l.b%128-l.a%128),dy=Math.sign(gridY(l.b)-gridY(l.a));let p=l.a;for(let i=0;i<129;i++){out.push(p);if(p===l.b)break;p+=dx+dy*128}return out}
const railGeometryCache=new Map(),railObjectGeometry=new WeakMap();
export function railGeometry(l){if(railObjectGeometry.has(l))return railObjectGeometry.get(l);const path=railPath(l),key=path.join(',');if(railGeometryCache.has(key)){const value=railGeometryCache.get(key);railObjectGeometry.set(l,value);return value}const points=path.map(id=>({x:id%128+.5,y:gridY(id)+.5})),out=[];const push=(p,index)=>out.push({...p,index});if(points.length)push(points[0],0);for(let i=1;i<points.length-1;i++){const a=points[i-1],p=points[i],b=points[i+1],ux=p.x-a.x,uy=p.y-a.y,vx=b.x-p.x,vy=b.y-p.y;if(ux===vx&&uy===vy){push(p,i);continue}const radius=.34,start={x:p.x-ux*radius,y:p.y-uy*radius},end={x:p.x+vx*radius,y:p.y+vy*radius};push(start,i-radius);for(let k=1;k<=12;k++){const t=k/12,u=1-t;push({x:u*u*start.x+2*u*t*p.x+t*t*end.x,y:u*u*start.y+2*u*t*p.y+t*t*end.y},i-radius+2*radius*t)}}if(points.length>1)push(points.at(-1),points.length-1);if(railGeometryCache.size>32)railGeometryCache.clear();railGeometryCache.set(key,out);railObjectGeometry.set(l,out);return out}
export function railProgress(l){const path=railPath(l),a=Math.max(0,path.indexOf(l.from)),b=Math.max(0,path.indexOf(l.to));return a+(b-a)*(l.duration?clamp(l.elapsed/l.duration,0,1):1)}
export function railPose(l,index){const points=railGeometry(l);if(points.length<2)return{x:l.a%128+.5,y:gridY(l.a)+.5,angle:0};let i=1;while(i<points.length-1&&points[i].index<index)i++;const a=points[i-1],b=points[i],t=clamp((index-a.index)/(b.index-a.index||1),0,1);return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.y-a.y,b.x-a.x)+(l.direction<0?Math.PI:0)}}
