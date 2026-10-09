// Presentation geometry only. Native topology and actor directions choose every
// actual connection; these helpers give the painter and interpolator one origin.
export const DIRECTIONS=[[1,0],[0,1],[-1,0],[0,-1]];
export const isFacility=kind=>kind>=3&&kind<=6||kind===8;
export const isRoad=kind=>kind===1||kind===2||kind>=9&&kind<=13;
export const layerOf=id=>Math.floor(id/16384);
export const gridY=id=>Math.floor(id/128)%128;
export const center=id=>({x:id%128+.5,y:gridY(id)+.5});
export function neighborId(id,dir){const [dx,dy]=DIRECTIONS[dir],x=id%128+dx,y=gridY(id)+dy;return x<0||x>=128||y<0||y>=128?-1:layerOf(id)*16384+x+y*128}
export function connections(c,cells){return DIRECTIONS.flatMap((d,dir)=>{const id=neighborId(c.id,dir),next=cells.get(id);return next?.kind>0&&!(isFacility(c.kind)&&isFacility(next.kind))?[{dir,id,next,d}]:[]})}
export function facilityPort(id,dir,kind){const p=center(id),d=DIRECTIONS[dir],radius=kind===3?.31:kind===4?.36:kind===5?.35:kind===8?.36:.32;return{x:p.x+d[0]*radius,y:p.y+d[1]*radius,angle:Math.atan2(d[1],d[0])}}
export function entranceLinks(c,cells){return connections(c,cells).map(({dir,id,d})=>({dir,id,door:facilityPort(c.id,dir,c.kind),edge:{x:c.id%128+.5+d[0]*.5,y:gridY(c.id)+.5+d[1]*.5}}))}
export function roadHeatSegments(c,cells){const p=center(c.id);return connections(c,cells).map(({d})=>[p,{x:p.x+d[0]*.5,y:p.y+d[1]*.5}])}
export function riverPoints(packed){return packed.map(v=>({x:(v%512)/2,y:Math.floor(v/512)}))}
// Both values below are authoritative native terrain projections. Cover every
// tile whose footprint intersects the river, including a fractional bend edge.
export function waterAt(points,width,id){const y=Math.floor(id/128),a=points[y],b=points[y+1];return id>=0&&id<16384&&a&&b&&id%128<Math.max(a.x,b.x)+width/2&&Math.min(a.x,b.x)-width/2<id%128+1}
export function drawRiver(ctx,points,width){if(points.length!==129)return;ctx.save();ctx.lineJoin='round';ctx.beginPath();for(let i=0;i<points.length;i++){const p=points[i];i?ctx.lineTo(p.x-width/2,p.y):ctx.moveTo(p.x-width/2,p.y)}for(let i=points.length-1;i>=0;i--)ctx.lineTo(points[i].x+width/2,points[i].y);ctx.closePath();ctx.fillStyle='#a7d2dc';ctx.fill();ctx.strokeStyle='#d6e5dc';ctx.lineWidth=.22;ctx.stroke();ctx.restore()}

// Construction estimates and gesture mapping only. The native command validates
// occupancy, bank access, budget and atomicity before publishing any change.
export const roadTool=tool=>[1,2,7,20].includes(tool);
export const roadKind=(tool,direction)=>tool===20?9+direction:tool;
export const undergroundPrice=kind=>kind===2?72:kind===7?24:kind>=9&&kind<=12?60:48;
export function undergroundQuote(cells,a,b,kind,portals=false){
 let cost=0,count=0;for(let y=Math.min(a.y,b.y);y<=Math.max(a.y,b.y);y++)for(let x=Math.min(a.x,b.x);x<=Math.max(a.x,b.x);x++){count++;if(cells.get(16384+x+y*128)?.kind!==kind)cost+=undergroundPrice(kind)}
 if(portals)for(const p of [a,b])if(cells.get(p.x+p.y*128)?.kind!==13)cost+=60;
 return {tiles:count,cost,water:0,invalid:portals&&count<3};
}
