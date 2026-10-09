import fs from 'node:fs';
import assert from 'node:assert/strict';
const layout=JSON.parse(fs.readFileSync(new URL('../examples/commuter-layout.json',import.meta.url)));
const tiles=new Map(layout.map(t=>[t.id,t.kind])),facility=k=>k>=3&&k<=6;
assert.equal(tiles.size,layout.length);
assert.equal(layout.filter(t=>t.kind===3).length,256);
assert.equal(layout.filter(t=>t.kind===4).length,128);
assert.equal(layout.filter(t=>t.kind===8).length,16);
for(const {id,kind} of layout){
 assert(id>=0&&id<16384);
 if(facility(kind))assert([1,-1,128,-128].some(d=>[1,2,7].includes(tiles.get(id+d))),'Facility needs a real street or path: '+id);
 if(kind===3)assert(id%128<64,'Homes remain on the residential side');
 if(kind===4)assert(id%128>64,'Workplaces remain on the employment side');
}
for(const y of [20,48,76,104])for(let x=22;x<=106;x++)assert(!facility(tiles.get(x+y*128)),'Clear horizontal corridor');
for(const x of [22,44,84,106])for(let y=20;y<=104;y++)assert(!facility(tiles.get(x+y*128)),'Clear vertical corridor');
for(const y of [20,48,76,104])for(const x of [22,44,84,106]){
 assert.equal(tiles.get(x+y*128),8);
 for(const [dx,dy]of [[-4,0],[4,0],[0,-4],[0,4]])assert.equal(tiles.get(x+dx+(y+dy)*128),7,'Four explicit district gates');
 const houses=layout.filter(t=>t.kind===3&&Math.abs(t.id%128-x)<=4&&Math.abs(Math.floor(t.id/128)-y)<=4).length;
 assert.equal(houses,x<64?32:0,'Preserve every residential district population');
}
console.log('PASS 2,048 residents/jobs, 16 stations, both clear rail axes and explicit facility access');
