// Reproducible authored map data only. All population, routes, trains and ticks
// are created by native lkjscript; this is not a simulation or runtime dependency.
import fs from 'node:fs';
const tiles=new Map(), id=(x,y)=>x+y*128;
const put=(x,y,kind)=>{if(x<0||x>127||y<0||y>127)throw Error('Outside map');tiles.set(id(x,y),kind)};
const line=(x,y,x2,y2,kind)=>{if(x!==x2&&y!==y2)throw Error('Non-orthogonal authoring');for(let a=Math.min(x,x2);a<=Math.max(x,x2);a++)for(let b=Math.min(y,y2);b<=Math.max(y,y2);b++)put(a,b,kind)};
const xs=[36,52,84,100],ys=[35,51,67,83];
for(const y of ys)line(30,y,106,y,2);
for(const x of xs)line(x,29,x,89,2);
for(const x of xs)for(const y of ys){
 for(const dy of [-4,4])line(x-4,y+dy,x+4,y+dy,1);
 for(const dx of [-4,4])line(x+dx,y-4,x+dx,y+4,1);
 for(const dx of [-3,-2,2,3])for(const dy of [-3,3])put(x+dx,y+dy,3);
 // Both banks retain local work; the eastern bank has the larger job centres.
 if(x<64)put(x+3,y+1,4);else{for(const dx of [-3,3])for(const dy of [-1,1])put(x+dx,y+dy,4);for(const [dx,dy]of [[-1,-1],[1,-1],[1,1]])put(x+dx,y+dy,4)}
 for(const dx of [-1,1]){put(x+dx,y-3,5);put(x+dx,y+3,6)}
}
// Car-free cross-river links join two local streets without another motorway.
for(const y of [43,75]){line(52,y,84,y,7);for(const x of [52,84])put(x,y,2)}
// Stations are authored infrastructure, like the existing streets and homes.
// Native service creation still verifies their tracks, connectivity and stops.
for(const x of [41,89])for(const y of [36,52,68,84])put(x,y,8);
for(const y of [40,78])for(const x of [37,53,85,101])put(x,y,8);
const data=[...tiles].sort((a,b)=>a[0]-b[0]).map(([id,kind])=>({id,kind}));
fs.writeFileSync(new URL('../examples/waterfront-layout.json',import.meta.url),JSON.stringify(data)+'\n');
console.log({tiles:data.length,residents:data.filter(t=>t.kind===3).length*8,jobs:data.filter(t=>t.kind===4).length*16});
