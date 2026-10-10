// Presentation-only differential checks; no alternative simulation or actor sampling.
import assert from 'node:assert/strict';
import {TileIndex,railPresentation,railGeometry,railPath} from '../web/motion.js';
import {layerOf,gridY} from '../web/geometry.js';
const index=new TileIndex(),cells=new Map();
for(let id=0;id<32768;id+=7)cells.set(id,{id,kind:1+id%13,q:id%24});
function verify(layer,x0,y0,x1,y1){
 const expected=[...cells.values()].filter(c=>layerOf(c.id)===layer&&c.id%128>=x0&&c.id%128<=x1&&gridY(c.id)>=y0&&gridY(c.id)<=y1).sort((a,b)=>a.id-b.id);
 const actual=index.query(layer,x0,y0,x1,y1);assert.deepEqual(actual,expected);
 for(let i=0;i<actual.length;i++)assert.equal(actual[i],expected[i],'Use the latest native cell object');
 const visits=index.visits;assert.equal(index.query(layer,x0,y0,x1,y1),actual);assert.equal(index.visits,visits);
}
index.rebuild(cells);
for(let layer=0;layer<2;layer++)for(let x=0;x<128;x+=9)for(let y=0;y<128;y+=11)verify(layer,x,y,Math.min(127,x+19),Math.min(127,y+23));
for(const layer of [0,1])assert.deepEqual(index.hot[layer],[...cells.values()].filter(c=>layerOf(c.id)===layer&&c.q>(c.kind===1?5:c.kind===2?20:8)).sort((a,b)=>b.q-a.q));
const id=7;cells.set(id,{id,kind:8,q:32});index.rebuild(cells);verify(0,0,0,31,31);assert(index.stations.includes(id));
cells.delete(id);index.rebuild(cells);verify(0,0,0,31,31);assert(!index.stations.includes(id));
cells.clear();cells.set(16385,{id:16385,kind:13,q:2});index.rebuild(cells);verify(0,0,0,127,127);verify(1,0,0,127,127);
const lines=[{id:1,a:1,b:257,path:[1,129,257],stops:[1,257],platforms:[{station:1,forward:3,reverse:4}]},{id:2,a:1,b:3,path:[1,2,3],stops:[1,3],platforms:[{station:1,forward:5,reverse:2}]}];
let paint=railPresentation([1,3,257,500],lines);assert.deepEqual([...paint.assigned],[1,129,257,2,3]);assert.equal(paint.stations[0].waiting,14);assert.equal(paint.stations[0].line,lines[0]);assert.equal(paint.stations[1].label,'2');assert.equal(paint.stations[3].label,'S');
const updated=structuredClone(lines);updated[0].platforms[0].forward=9;updated[0].stops=[1,129,257];paint=railPresentation([1,129,257],updated);assert.equal(paint.stations[0].waiting,20);assert.equal(paint.stations[1].label,'2');assert.equal(paint.stations[2].label,'3');assert.deepEqual(railPresentation([],[]),{assigned:new Set(),stations:[]});
for(const line of lines){const geometry=railGeometry(line);assert.equal(railGeometry(line),geometry);assert.equal(railGeometry({...line}),geometry);assert.equal(geometry[0].x,railPath(line)[0]%128+.5)}
console.log('render projection passed: 360 differential layer/rectangle cases, object replacement, removal, map replacement, cache reuse, fresh station queues and shared rail geometry');
