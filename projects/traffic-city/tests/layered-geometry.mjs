import fs from 'node:fs';
import assert from 'node:assert/strict';
import {layerOf,gridY,center,neighborId,connections,isRoad,roadTool,roadKind,undergroundQuote} from '../web/geometry.js';
import {actorPose,TrafficMotion} from '../web/motion.js';
const checks=[];
for(let depth=0;depth<2;depth++)for(const ground of [0,127,128,16383,129,8051]){
 const id=ground+depth*16384;assert.equal(layerOf(id),depth);assert.equal(gridY(id),Math.floor(ground/128));assert.deepEqual(center(id),center(ground));
 for(let dir=0;dir<4;dir++){const n=neighborId(id,dir);if(n>=0){assert.equal(layerOf(n),depth);assert.equal(Math.abs(n%128-id%128)+Math.abs(gridY(n)-gridY(id)),1)}}
}
assert.equal(neighborId(16383,1),-1);assert.equal(neighborId(16384,3),-1);checks.push('all layer and row boundaries retain native cell identity');
for(const kind of [1,2,9,10,11,12,13])assert(isRoad(kind));for(const kind of [0,3,4,5,6,7,8,14])assert(!isRoad(kind));
assert(roadTool(20));assert(!roadTool(9));assert(!roadTool(22));for(let d=0;d<4;d++)assert.equal(roadKind(20,d),9+d);checks.push('UI tool identifiers do not alias tile kinds or railway tools');
const g=40+40*128,cells=new Map([[g,{id:g,kind:13}],[g+16384,{id:g+16384,kind:1}],[g+16385,{id:g+16385,kind:1}],[g+1,{id:g+1,kind:4}]]);
assert.deepEqual(connections(cells.get(g+16384),cells).map(c=>c.id),[g+16385]);checks.push('underground road paint never joins an overlapping ground building');
for(const mode of [1,2,3])for(let dir=0;dir<4;dir++)for(let elapsed=0;elapsed<=4;elapsed++)for(const reverse of [false,true]){
 const from=reverse?g+16384:g,to=reverse?g:g+16384,p=actorPose({id:2,mode,from,to,dir,out:dir,rank:0,elapsed,duration:4},cells);
 assert(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.angle));assert(Math.hypot(p.x-40.5,p.y-40.5)<.75);
}
checks.push('portal transitions stay at the portal for every mode and direction');
const actor={id:2,mode:2,from:g,to:g,dir:0,out:0,rank:0,elapsed:1,duration:2},motion=new TrafficMotion();
motion.receive({stats:{tick:10,version:1},view:{layer:0},actors:[actor]},0,cells);assert.equal(motion.sample(0).length,1);
motion.receive({stats:{tick:10,version:1},view:{layer:1},actors:[]},1,cells);assert.deepEqual(motion.sample(1),[]);assert.equal(motion.frames.size,1);checks.push('same-cycle layer switch cannot leave a ghost actor');
const a={x:40,y:40},b={x:44,y:40};
assert.deepEqual(undergroundQuote(cells,a,b,1,true),{tiles:5,cost:204,water:0,invalid:false});
assert.equal(undergroundQuote(cells,b,a,9,true).cost,360);assert.equal(undergroundQuote(cells,a,b,7,false).cost,120);checks.push('material previews include only changed tiles and missing portals in either drag direction');
const report={passed:true,checks};fs.writeFileSync('evidence/layered-geometry.json',JSON.stringify(report,null,2));console.log(report);
