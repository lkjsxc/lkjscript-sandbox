import assert from 'node:assert/strict';
import fs from 'node:fs';
process.env.CITY_SELECTION=process.env.MESO_SELECTION||'.build/meso-selection.json';
const {runCase,selection}=await import('./run-case.mjs?meso-view');
const model={population:100000,groups:256,ticks:128,capacity:4,rail:16,closedFrom:0,closedUntil:0};
const samples=[];let checks=0,expectedStats;
for(const [name,view,level,count]of[['region',{x:0,y:0,w:16,h:16},0,256],['districts',{x:4,y:4,w:8,h:8},1,64],['street',{x:6,y:6,w:4,h:4},2,16],['outside',{x:0,y:24,w:16,h:8},0,0],['clamped',{x:-9,y:-6,w:999,h:999},0,256]]){
 const r=runCase({model,view},'meso-view-'+name,'meso-view');const f=r.result.frame;assert.equal(f.stats.population,100000);assert.equal(f.level,level);assert.equal(f.rows.length,count);assert(f.rows.every(row=>row.length===11));checks+=4;
 if(expectedStats)assert.deepEqual(f.stats,expectedStats);else expectedStats=f.stats;checks++;
 const ids=new Set();for(const row of f.rows){assert(!ids.has(row[0]));ids.add(row[0]);const x=row[0]%16,y=Math.floor(row[0]/16);assert(x>=f.view.x&&x<f.view.x+f.view.w&&y>=f.view.y&&y<f.view.y+f.view.h);assert.deepEqual(row,[...['id','population','home','queuedOut','outbound','work','queuedBack','inbound','road','rail','travel'].map(k=>r.result.city.cohorts[row[0]][k])]);checks+=3;}
 const bytes=Buffer.byteLength(JSON.stringify(f));assert(bytes<20000);checks++;samples.push({name,view:f.view,level,count,drawLimit:f.drawLimit,frame_bytes:bytes});if(name==='region')fs.writeFileSync('evidence/meso-snapshot.json',JSON.stringify(f));
}
const report={passed:true,checks,artifact_sha256:selection.artifact_sha256,compiler_sha256:selection.compiler_sha256,samples,scope:'Native projection only; no WebSocket/network/browser timing is implied'};fs.writeFileSync('evidence/meso-view.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
