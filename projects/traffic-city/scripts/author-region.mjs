// Static authored geography only. Residents, jobs, traffic, trains and money
// are initialized and simulated by the ordinary native lkjscript program.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const tiles=new Map(),id=(x,y)=>x+128*y;
const put=(x,y,kind)=>{assert(x>=0&&x<128&&y>=0&&y<128);tiles.set(id(x,y),kind)};
const line=(x,y,x2,y2,kind)=>{assert(x===x2||y===y2);for(let a=Math.min(x,x2);a<=Math.max(x,x2);a++)for(let b=Math.min(y,y2);b<=Math.max(y,y2);b++)put(a,b,kind)};
const xs=[8,22,36,49,85,98,111,122],ys=[12,42,72,102];
for(const y of ys)line(4,y,126,y,2);
for(const x of xs)line(x,8,x,106,2);
for(const x of xs)for(const y of ys){
 for(const dy of [-4,4])line(x-4,y+dy,x+4,y+dy,1);
 for(const dx of [-4,4])line(x+dx,y-4,x+dx,y+4,1);
 for(const dx of [-3,-2,2,3])for(const dy of [-3,3])put(x+dx,y+dy,3);
 const jobs=x<64?[[-3,-1],[3,1]]:[[-3,-1],[-3,1],[3,-1],[3,1],[-1,-1],[1,1]];
 for(const [dx,dy]of jobs)put(x+dx,y+dy,4);
 for(const dx of [-1,1]){put(x+dx,y-3,5);put(x+dx,y+3,6)}
 put(x+1,y+5,8);
}
// A paired north/south arterial network, with ordinary two-way alternatives.
// The lower express crossings themselves are built/validated natively.
for(const [x,kind]of [[36,10],[85,12]])line(x,8,x,106,kind);
const data=[...tiles].sort((a,b)=>a[0]-b[0]).map(([id,kind])=>({id,kind}));
assert.equal(data.filter(t=>t.kind===3).length*8,2048);
assert.equal(data.filter(t=>t.kind===4).length*16,2048);
assert.equal(data.filter(t=>t.kind===8).length,32);
assert(data.length<8192);
fs.writeFileSync(new URL('../examples/region-layout.json',import.meta.url),JSON.stringify(data)+'\n');
console.log(JSON.stringify({tiles:data.length,residents:2048,jobs:2048,neighbourhoods:32,stations:32}));
