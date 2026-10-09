import assert from 'node:assert/strict';
import fs from 'node:fs';
import {actorPath,actorPose} from '../web/motion.js';
import {DIRECTIONS,facilityPort,entranceLinks,neighborId,roadHeatSegments,riverPoints,waterAt} from '../web/geometry.js';
const close=(a,b)=>assert(Math.hypot(a.x-b.x,a.y-b.y)<1e-8,JSON.stringify({a,b}));
const base=60+60*128;let entries=0,exits=0;
for(const kind of [3,4,5,6,8])for(const mode of [1,2])for(let dir=0;dir<4;dir++)for(const roadKind of mode===1?[1,2,7]:[1,2]){
 const from=neighborId(base,(dir+2)%4),to=neighborId(base,dir),cells=new Map([[base,{id:base,kind}],[from,{id:from,kind:roadKind}],[to,{id:to,kind:roadKind}]]);
 const arrival={id:2,mode,from,to:base,dir,out:dir,rank:0,duration:4,elapsed:4};
 const path=actorPath(arrival,cells),door=facilityPort(base,(dir+2)%4,kind);
 close(path.at(path.length),door);close(actorPose(arrival,cells),door);
 const painted=entranceLinks(cells.get(base),cells).find(p=>p.dir===(dir+2)%4);close(painted.door,door);
 // Arrival never crosses the near wall or continues through the roof.
 for(let i=0;i<=32;i++){const p=path.at(path.length*i/32),d=DIRECTIONS[dir];assert((p.x-door.x)*d[0]+(p.y-door.y)*d[1]<=1e-8)}entries++;
 const departure={...arrival,from:base,to,elapsed:0},out=actorPath(departure,cells),exit=facilityPort(base,dir,kind);
 close(out.at(0),exit);close(actorPose(departure,cells),exit);
 close(entranceLinks(cells.get(base),cells).find(p=>p.dir===dir).door,exit);exits++;
}
// Legacy in-flight facility hops retain continuous drawing after save migration.
// New topology never paints a direct facility-to-facility entrance.
for(let dir=0;dir<4;dir++){const next=neighborId(base,dir),cells=new Map([[base,{kind:3,id:base}],[next,{kind:4,id:next}]]),p=actorPath({id:2,mode:1,from:base,to:next,dir,out:dir,elapsed:0,duration:4},cells);close(p.at(0),facilityPort(base,dir,3));close(p.at(p.length),facilityPort(next,(dir+2)%4,4));assert.deepEqual(entranceLinks(cells.get(base),cells),[]);assert.deepEqual(entranceLinks(cells.get(next),cells),[])}
for(const dirs of [[0,2],[1,3],[0,1],[0,1,2],[0,1,2,3],[]]){const c={id:base,kind:1},cells=new Map([[base,c],...dirs.map(d=>[neighborId(base,d),{id:neighborId(base,d),kind:1}])]);const arms=roadHeatSegments(c,cells);assert.equal(arms.length,dirs.length);arms.forEach(([a,b],i)=>{const d=DIRECTIONS[dirs[i]];assert.equal(b.x-a.x,d[0]*.5);assert.equal(b.y-a.y,d[1]*.5)})}
// Walking turns must remain positive-length arcs on avenues as well as paths.
for(const mode of [1,2])for(const kind of mode===1?[1,2,7]:[1,2])for(let dir=0;dir<4;dir++)for(let out=0;out<4;out++){
 const from=neighborId(base,(dir+2)%4),cells=new Map([[base,{id:base,kind}],[from,{id:from,kind}]]),a={id:2,mode,from,to:base,dir,out,rank:0,elapsed:4,duration:4},p=actorPath(a,cells),last=p.at(p.length);
 assert(p.length>0&&Number.isFinite(p.length));assert(Number.isFinite(last.x)&&Number.isFinite(last.y));const c={...a,from:base,to:neighborId(base,out),dir:out,out};cells.set(c.to,{id:c.to,kind});close(last,actorPath(c,cells).at(0));
}
for(const kind of [3,4,5,6,8])for(let dir=0;dir<4;dir++)for(const rank of [0,1,2]){
 const to=neighborId(base,dir),cells=new Map([[base,{id:base,kind}],[to,{id:to,kind:1}]]),a={id:2,mode:2,from:base,to,dir,out:dir,rank,elapsed:0,duration:4};close(actorPose(a,cells),facilityPort(base,dir,kind));
}
assert.equal(neighborId(127,0),-1);assert.equal(neighborId(0,2),-1);assert.equal(neighborId(0,3),-1);assert.equal(neighborId(16383,1),-1);
const spine=riverPoints(Array.from({length:129},(_,y)=>130+y*512));for(let x=0;x<128;x++)assert.equal(Boolean(waterAt(spine,6,x+64*128)),x>=62&&x<=67);
const report={passed:true,entries,exits,checks:['all cardinal facility entrances and exits share painter coordinates','no travel through building roofs','pedestrian and car starts are at thresholds','no painted links between facilities; legacy in-flight geometry remains continuous','heat follows straight, corner, T and cross topology','no row wrap','projected river occupancy']};fs.writeFileSync('evidence/waterfront-geometry.json',JSON.stringify(report,null,2));console.log(report);
