import assert from 'node:assert/strict';
import fs from 'node:fs';
import {actorPath,actorPose,transitionPose,TrafficMotion,pedestrianSize,streetCaption} from '../web/motion.js';
const directions=[[1,0],[0,1],[-1,0],[0,-1]], center=50+50*128, cells=new Map();
for(let y=46;y<55;y++)for(let x=46;x<55;x++)cells.set(x+y*128,{kind:2});
const error=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y), angle=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
let cases=0,maxStep=0,maxHeading=0;
for(const id of[2,3])for(let dir=0;dir<4;dir++)for(const turn of[0,1,3]){
 const d=directions[dir],out=(dir+turn)%4,o=directions[out],a={id,mode:2,from:center-d[0]-d[1]*128,to:center,dir,out,lane:id%2,rank:0,elapsed:0,duration:2},p=actorPath(a,cells),end=p.at(p.length),next={...a,from:center,to:center+o[0]+o[1]*128,dir:out,out,elapsed:0},q=actorPath(next,cells);
 assert(error(end,q.at(0))<1e-9);assert(angle(end.angle,q.at(0).angle)<1e-9);
 let prev=p.at(0);
 for(let i=1;i<=100;i++){const value=p.at(p.length*i/100),step=error(prev,value),heading=angle(prev.angle,value.angle);assert(step<.03);assert(heading<.15);maxStep=Math.max(maxStep,step);maxHeading=Math.max(maxHeading,heading);prev=value}
 const before={...a,elapsed:1};assert(error(transitionPose(before,next,0,cells),actorPose(before,cells))<1e-9);assert(error(transitionPose(before,next,1,cells),actorPose(next,cells))<1e-9);cases++;
}
// Three distinct waiting cars, including deliberately duplicated persisted slots.
const queued=[0,1,2].map(rank=>actorPose({id:2,mode:2,from:center-1,to:center,dir:0,out:0,slot:2,rank,elapsed:2,duration:2},cells));
assert(error(queued[0],queued[1])>=.249);assert(error(queued[1],queued[2])>=.249);
// Opposing lanes remain on their own side of the road.
const east=actorPose({id:2,mode:2,from:center-1,to:center,dir:0,out:0,rank:0,elapsed:1,duration:2},cells),west=actorPose({id:2,mode:2,from:center+1,to:center,dir:2,out:2,rank:0,elapsed:1,duration:2},cells);assert(Math.abs(east.y-west.y)>.23);
const a={id:2,mode:2,from:center-1,to:center,dir:0,out:0,rank:0,elapsed:0,duration:2};
const frame=(tick,actor,extras={})=>({stats:{tick,version:1,paused:false},detail:true,mapChanged:false,actors:[actor],...extras});
const m=new TrafficMotion();m.receive(frame(10,a),0,cells);m.receive(frame(11,{...a,elapsed:1}),500,cells);
const x=m.sample(700)[0];m.receive(frame(11,{...a,elapsed:1}),700,cells);const y=m.sample(700)[0];assert(error(x,y)<1e-12);
const z=m.sample(750)[0];assert(z.x>x.x);m.receive(frame(11,{...a,elapsed:1},{stats:{tick:11,version:1,paused:true}}),750,cells);assert(error(z,m.sample(750)[0])<1e-12);assert(m.sample(1000)[0].x>z.x);
m.receive(frame(11,a,{detail:false,actors:[]}),1100,cells);assert.deepEqual(m.sample(1200),[]);
m.receive(frame(11,{...a,elapsed:1}),1250,cells);assert.equal(m.sample(1300).length,1);
m.receive(frame(3,a,{stats:{tick:3,version:2,paused:true}}),1400,cells);assert.equal(m.time,3);assert.equal(m.frames.size,1);
const birth=new TrafficMotion();birth.receive(frame(1,a),0,cells);birth.receive({...frame(2,a),actors:[a,{...a,id:4}]},500,cells);assert.equal(birth.sample(700).length,1);assert.equal(birth.sample(1000).length,2);
// Overview packets carrying real people are drawn, not thrown away.
const overviewMotion=new TrafficMotion();overviewMotion.receive(frame(4,a,{detail:false}),0,cells);assert.equal(overviewMotion.sample(0).length,1);
overviewMotion.receive(frame(5,a,{detail:false,mapChanged:true}),500,cells);assert.deepEqual(overviewMotion.sample(500),[]);
for(const scale of[.5,2,5,12,20,48,96,240]){const g=pedestrianSize(scale);assert(g.radius*scale>=1.5);assert(Math.abs(g.outline*scale-.7)<1e-9);assert.equal(g.detailed,scale>=16)}
for(const scale of[0,-1,NaN,Infinity])assert.throws(()=>pedestrianSize(scale),RangeError);
assert.deepEqual(streetCaption({streetWalkers:81,streetDrivers:200,actors:Array(128)}),{counts:'In view · 81 on foot · 200 in cars',sample:'128 of 281 shown · zoom for detail'});
assert.equal(streetCaption({mapChanged:true}).counts,'Updating street view…');
assert.equal(streetCaption({streetWalkers:2,streetDrivers:0,actors:[{},{}]}).sample,'2 street travellers shown');
const report={passed:true,geometries:cases,maxStepPerHundredth:maxStep,maxHeadingPerHundredth:maxHeading,checks:['C1 adjacent edge joins','arc length movement','opposite lanes','three FIFO ranks despite duplicate stored slots','same-tick view/save reply continuity','pause settles without teleport','overview/detail return','authoritative reset']};fs.writeFileSync('evidence/motion-geometry.json',JSON.stringify(report,null,2));console.log(report);
