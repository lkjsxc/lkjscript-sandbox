// Presentation only. Every population, queue and capacity comes from a native frame.
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function districtAt(x,y){return x>=0&&y>=0&&x<128&&y<128?Math.floor(y/8)*16+Math.floor(x/8):-1;}
export function corridor(id){const x=id%16,y=Math.floor(id/16),vertical=(x+y)%2===1;return {x,y,vertical,toX:vertical?x:15-x,toY:vertical?15-y:y};}
const river=y=>64+5*Math.sin(y/20)+2*Math.sin(y/8);
const water=(x,y)=>Math.abs(x-river(y))<2.3;
const rank=(id,i)=>(Math.imul(id+1,2654435761)+Math.imul(i+1,2246822519))>>>0;
const palette={ground:'#dfe7d5',water:'#99c0ba',bank:'#c5d9bd',road:'#809383',closed:'#c3ceb9',rail:'#887b9b',ink:'#345747'};
export class MetroRenderer{
 constructor(canvas,onView=()=>{}){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.onView=onView;
  this.camera={x:64,y:64,scale:5};this.width=1;this.height=1;this.dpr=1;
  this.frame=null;this.roads=[];this.rails=[];this.rows=new Map();this.visibleRows=[];
  this.tiles=new Map();this.cacheBytes=0;this.cacheLimit=24*1024*1024;
  this.selected=-1;this.pending=[];this.preview=null;this.handle=0;this.time=0;this.lastDraw=0;this.receivedAt=0;
  this.quality=2;this.averageCost=0;this.slow=0;this.fast=0;
  this.metrics={drawCalls:0,tileBuilds:0,shown:0,trains:0,level:0,times:[],intervals:[],cacheBytes:0};
  this.resize(true);
 }
 resize(fit=false){
  const b=this.canvas.getBoundingClientRect();this.width=Math.max(1,b.width);this.height=Math.max(1,b.height);
  this.dpr=Math.min(devicePixelRatio||1,2,Math.sqrt(4e6/(this.width*this.height)));
  this.canvas.width=Math.ceil(this.width*this.dpr);this.canvas.height=Math.ceil(this.height*this.dpr);
  if(fit)this.fit();else this.changed();
 }
 fit(){this.camera.x=64;this.camera.y=64;this.camera.scale=Math.max(.6,Math.min((this.width-50)/128,(this.height-(this.width<720?300:190))/128));this.changed();}
 unproject(x,y){return{x:(x-this.width/2)/this.camera.scale+this.camera.x,y:(y-this.height*.49)/this.camera.scale+this.camera.y};}
 project(x,y){return{x:(x-this.camera.x)*this.camera.scale+this.width/2,y:(y-this.camera.y)*this.camera.scale+this.height*.49};}
 zoom(factor,x=this.width/2,y=this.height*.49){const a=this.unproject(x,y);this.camera.scale=clamp(this.camera.scale*factor,.6,90);const b=this.unproject(x,y);this.camera.x+=a.x-b.x;this.camera.y+=a.y-b.y;this.changed();}
 pan(dx,dy){this.camera.x-=dx/this.camera.scale;this.camera.y-=dy/this.camera.scale;this.changed();}
 bounds(){const a=this.unproject(0,0),b=this.unproject(this.width,this.height);return{x:a.x,y:a.y,x2:b.x,y2:b.y};}
 viewport(){const b=this.bounds(),x=clamp(Math.floor(b.x/8)-1,0,15),y=clamp(Math.floor(b.y/8)-1,0,15);return{x,y,x2:clamp(Math.ceil(b.x2/8)+1,x+1,16)-x,y2:clamp(Math.ceil(b.y2/8)+1,y+1,16)-y};}
 changed(){this.camera.x=clamp(this.camera.x,-8,136);this.camera.y=clamp(this.camera.y,-8,136);this.onView(this.viewport());this.request();}
 setFrame(frame){
  const moving=frame.stats.tick!==this.frame?.stats.tick;
  if(moving||!this.frame||frame.paused!==this.frame.paused)this.receivedAt=performance.now();
  this.frame=frame;if(frame.infraChanged){this.roads=frame.roads;this.rails=frame.rails;}
  this.visibleRows=frame.rows.map(r=>({id:r[0],population:r[1],home:r[2],queue:r[3]+r[6],out:r[4],work:r[5],back:r[7],road:r[8],rail:r[9],travel:r[10]}));
  for(const r of this.visibleRows)this.rows.set(r.id,r);
  this.request();
 }
 request(){if(!document.hidden&&!this.handle)this.handle=requestAnimationFrame(t=>this.draw(t));}
 stop(){if(this.handle)cancelAnimationFrame(this.handle);this.handle=0;this.lastDraw=0;}
 level(){return Math.min(this.quality,this.camera.scale<8?0:this.camera.scale<20?1:2,this.frame?.level??0);}
 tile(id,lod){
  const r=this.rows.get(id),population=r?.population??Math.floor((this.frame?.stats.population||100000)/256);
  const density=clamp(Math.floor(population/300),1,8),road=this.roads[id]??1,h=this.rails[Math.floor(id/16)]??0,v=this.rails[16+id%16]??0;
  const key=[id,lod,road,h,v,density].join(':');
  if(this.tiles.has(key)){const entry=this.tiles.get(key);this.tiles.delete(key);this.tiles.set(key,entry);return entry.canvas;}
  const res=[4,10,24][lod],tile=document.createElement('canvas');tile.width=tile.height=8*res;
  const p=tile.getContext('2d',{alpha:false}),x=id%16*8,y=Math.floor(id/16)*8;p.setTransform(res,0,0,res,-x*res,-y*res);
  p.fillStyle=palette.ground;p.fillRect(x,y,8,8);
  p.fillStyle=id%3===0?'#d6e2c9':'#e7eadb';p.fillRect(x+.65,y+.65,6.7,6.7);
  if(x<75&&x+8>54){for(const[width,color]of[[2.75,palette.bank],[2.3,palette.water]]){p.fillStyle=color;p.beginPath();for(let j=0;j<=8;j++){const yy=y+j;p[j?'lineTo':'moveTo'](river(yy)-width,yy);}for(let j=8;j>=0;j--){const yy=y+j;p.lineTo(river(yy)+width,yy);}p.closePath();p.fill();}}
  // Connected north/south and east/west streets; bridges follow the same lattice.
  p.fillStyle=road?palette.road:palette.closed;const rw=road?.48+road*.11:.24;
  p.fillRect(x+4-rw/2,y,rw,8);p.fillRect(x,y+4-rw/2,8,rw);
  if(road&&lod>0){p.strokeStyle='#b8c4ae';p.lineWidth=.035;p.setLineDash([.25,.18]);p.beginPath();p.moveTo(x+4,y);p.lineTo(x+4,y+8);p.moveTo(x,y+4);p.lineTo(x+8,y+4);p.stroke();p.setLineDash([]);}
  const colors=['#ccab8e','#8fafaa','#d9bf84','#baa789','#a0b28f'];
  for(let j=0;j<16;j++){
   const col=j%4,row=Math.floor(j/4),bx=x+(col<2?.8+col*1.18:4.8+(col-2)*1.18),by=y+(row<2?.75+row*1.2:4.75+(row-2)*1.2);
   if(water(bx+.4,by+.45)||h&&Math.abs(by-y-2)<.6||v&&Math.abs(bx-x-2)<.6)continue;
   if((rank(id,j)%13)>9&&density<3){p.fillStyle='#9bb88c';p.beginPath();p.arc(bx+.4,by+.5,.38,0,Math.PI*2);p.fill();continue;}
   const w=.7+(rank(id,j)%3)*.07,hh=.68+(density>3?.2:0);p.fillStyle='#526b5522';p.fillRect(bx+.1,by+.13,w,hh);
   p.fillStyle=colors[rank(id,j)%colors.length];p.fillRect(bx,by,w,hh);
   if(lod>0){p.fillStyle='#f8eed7';p.fillRect(bx+.12,by+.12,w-.24,.13);if(lod===2){p.fillStyle='#ffffff88';p.fillRect(bx+.12,by+.38,.15,.17);p.fillRect(bx+.4,by+.38,.15,.17);}}
  }
  for(const [active,vertical]of[[h,false],[v,true]])if(active){
   p.strokeStyle=palette.rail;p.lineWidth=active===2?.16:.12;p.beginPath();p.moveTo(x+(vertical?2:0),y+(vertical?0:2));p.lineTo(x+(vertical?2:8),y+(vertical?8:2));p.stroke();
   p.fillStyle='#fbf5e4';p.strokeStyle=palette.rail;p.lineWidth=.09;p.beginPath();p.arc(x+(vertical?2:4),y+(vertical?4:2),.23,0,Math.PI*2);p.fill();p.stroke();
  }
  const bytes=tile.width*tile.height*4;while(this.tiles.size&&(this.cacheBytes+bytes>this.cacheLimit||this.tiles.size>=384)){const first=this.tiles.keys().next().value;this.cacheBytes-=this.tiles.get(first).bytes;this.tiles.delete(first);}
  this.tiles.set(key,{canvas:tile,bytes});this.cacheBytes+=bytes;this.metrics.tileBuilds++;return tile;
 }
 outline(c,color,dashed=false){if(!c)return;const p=this.ctx;p.strokeStyle=color;p.lineWidth=2/this.camera.scale;p.setLineDash(dashed?[.4,.25]:[]);const x=Math.min(c.x,c.x2)*8,y=Math.min(c.y,c.y2)*8;p.strokeRect(x+.1,y+.1,(Math.abs(c.x2-c.x)+1)*8-.2,(Math.abs(c.y2-c.y)+1)*8-.2);p.setLineDash([]);}
 draw(now){
  this.handle=0;if(document.hidden)return;const start=performance.now(),m=this.metrics;
  const active=this.frame?.status===1&&!this.frame.paused&&now-this.receivedAt<1500;
  if(this.lastDraw){const dt=now-this.lastDraw;if(active)this.time+=Math.min(dt,80);if(dt<200){m.intervals.push(dt);if(m.intervals.length>360)m.intervals.shift();}}
  this.lastDraw=now;m.drawCalls++;
  const p=this.ctx,lod=this.level(),b=this.bounds(),s=this.camera.scale;
  p.setTransform(this.dpr,0,0,this.dpr,0,0);p.fillStyle='#edf0e5';p.fillRect(0,0,this.width,this.height);
  p.save();p.translate(this.width/2,this.height*.49);p.scale(s,s);p.translate(-this.camera.x,-this.camera.y);
  const x1=clamp(Math.floor(b.x/8),0,15),x2=clamp(Math.floor(b.x2/8),0,15),y1=clamp(Math.floor(b.y/8),0,15),y2=clamp(Math.floor(b.y2/8),0,15);
  if(this.roads.length)for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)p.drawImage(this.tile(y*16+x,lod),x*8,y*8,8,8);
  // Heat follows the actual corridor axis, instead of stretching a tile overlay.
  for(const r of this.visibleRows){const c=corridor(r.id),q=r.queue/Math.max(1,r.population);if(q<.07)continue;
   const x=c.x*8+4,y=c.y*8+4;p.globalAlpha=Math.min(.8,.3+q);p.strokeStyle=q>.3?'#c47750':'#d1b26d';p.lineWidth=.18+Math.min(.18,q);p.beginPath();p.moveTo(x+(c.vertical?.26:-3.6),y+(c.vertical?-3.6:.26));p.lineTo(x+(c.vertical?.26:3.6),y+(c.vertical?3.6:.26));p.stroke();p.globalAlpha=1;
  }
  const budget=Math.min(this.frame?.drawLimit||256,[256,640,1536][lod]),entries=this.visibleRows.filter(r=>r.out+r.back>0);
  const totalWeight=entries.reduce((n,r)=>n+Math.sqrt(r.out+r.back),0);let available=budget,shown=0;
  for(let k=0;k<entries.length&&available>0;k++){
   const r=entries[k],c=corridor(r.id),moving=r.out+r.back,quota=Math.min(available,moving,Math.max(1,Math.floor(budget*Math.sqrt(moving)/Math.max(1,totalWeight))));available-=quota;
   const x0=c.x*8+4,y0=c.y*8+4,x9=c.toX*8+4,y9=c.toY*8+4;
   for(let i=0;i<quota;i++){
    const hash=rank(r.id,i),reverse=i%2===1,phase=(hash%10007)/10007,progress=(this.time/(3500+r.travel*160)+phase)%1,t=reverse?1-progress:progress;
    const pedestrian=hash%5===0,offset=(pedestrian?.61:.16)*(reverse?-1:1);
    const x=x0+(x9-x0)*t+(c.vertical?offset:0),y=y0+(y9-y0)*t+(c.vertical?0:offset);
    if(x<b.x-.4||x>b.x2+.4||y<b.y-.4||y>b.y2+.4)continue;
    if(pedestrian){p.fillStyle='#385f4e';p.beginPath();p.arc(x,y,Math.max(.042,1.1/s),0,Math.PI*2);p.fill();}
    else{p.fillStyle=['#f5e2b5','#c87753','#47777a','#f2eee0'][hash%4];const len=Math.max(.21,2/s),wide=Math.max(.085,1.1/s);p.fillRect(x-(c.vertical?wide:len)/2,y-(c.vertical?len:wide)/2,c.vertical?wide:len,c.vertical?len:wide);}
    shown++;
   }
  }
  let trains=0;
  for(let i=0;i<this.rails.length;i++)if(this.rails[i]){
   const vertical=i>=16,line=i%16,t=(this.time/(this.rails[i]===2?20000:32000)+i*.173)%1,along=4+120*(i%2?1-t:t),x=vertical?line*8+2:along,y=vertical?along:line*8+2;
   if(x<b.x-2||x>b.x2+2||y<b.y-2||y>b.y2+2)continue;
   p.fillStyle='#817293';const len=Math.max(1.1,5/s),wide=Math.max(.21,2.2/s);p.fillRect(x-(vertical?wide:len)/2,y-(vertical?len:wide)/2,vertical?wide:len,vertical?len:wide);
   if(lod>0){p.fillStyle='#f4e8c7';for(let j=0;j<3;j++)p.fillRect(x+(vertical?-.055:-.36+j*.3),y+(vertical?-.36+j*.3:-.055),vertical?.11:.18,vertical?.18:.11);}
   trains++;
  }
  if(this.selected>=0){const c=corridor(this.selected);this.outline({x:c.x,y:c.y,x2:c.x,y2:c.y},'#2a8064');p.strokeStyle='#39846699';p.lineWidth=.12;p.setLineDash([.35,.25]);p.beginPath();p.moveTo(c.x*8+4,c.y*8+4);p.lineTo(c.toX*8+4,c.toY*8+4);p.stroke();p.setLineDash([]);}
  for(const c of this.pending)this.outline(c,'#b78647',true);this.outline(this.preview,'#b78647',true);p.restore();
  const elapsed=performance.now()-start;m.times.push(elapsed);if(m.times.length>360)m.times.shift();m.shown=shown;m.trains=trains;m.level=lod;m.cacheBytes=this.cacheBytes;
  this.averageCost=this.averageCost*.92+elapsed*.08;this.slow=this.averageCost>11?this.slow+1:0;this.fast=this.averageCost<4?this.fast+1:0;
  if(this.slow>30&&this.quality>0){this.quality--;this.slow=this.fast=0;}else if(this.fast>180&&this.quality<2){this.quality++;this.slow=this.fast=0;}
  if(active)this.request();
 }
}
