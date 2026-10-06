import fs from 'node:fs';import assert from 'node:assert/strict';
import {startNative,connect,memory,root} from './native.mjs';
const report=[],viewWidth=Number(process.env.VIEW_WIDTH||30),viewHeight=Number(process.env.VIEW_HEIGHT||20);assert(viewWidth>0&&viewHeight>0&&viewWidth*viewHeight<=1024);
for(const rows of [32,64]){
 const n=await startNative({target:'benchmark-live',tick:500,name:'responsiveness-'+rows});
 const c=connect(n.address,'/live?'+rows);let id=0;
 try{
  await c.wait(f=>f.stats.tick>=3,30000);
  const commands=[];
  async function send(op,fields={}){const number=++id,start=performance.now();c.socket.send(JSON.stringify({id:number,action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));const f=await c.wait(f=>f.ack===number);const frame=c.frames.find(v=>v.seq===f.seq);const result={op,elapsed_ms:performance.now()-start,bytes:frame.bytes,notice:f.notice,tick:f.stats.tick};commands.push(result);assert.equal(f.stats.requested,f.stats.arrived+f.stats.backlog);return f;}
  for(let i=0;i<12;i++)await send('view',{x:i%2?0:64,x2:viewWidth,y2:viewHeight});
  await send('pause');
  const edit=await send('build',{x:20,y:0,x2:20,y2:0,kind:1});assert.match(edit.notice,/updated/);
  const saved=await send('save');assert.equal(saved.saved,saved.stats.tick);
  const gaps=commands.filter(x=>x.op==='view').map(x=>x.elapsed_ms).sort((a,b)=>a-b);
  report.push({tiles:rows*128,artifact_sha256:n.selection.artifact_sha256,view_width:viewWidth,view_height:viewHeight,view_samples:gaps.length,memory:memory(n.child.pid),view_median_ms:gaps[5],view_p95_ms:gaps[11],view_p99_ms:gaps[11],commands});
  console.log(JSON.stringify(report.at(-1)));
 }finally{await c.close();await n.stop();}
}
fs.writeFileSync(process.env.RESPONSIVENESS_EVIDENCE||root+'/evidence/responsiveness.json',JSON.stringify({method:'500 ms requested production timer; 12 sequential viewport commands while running, pause, one admitted downgrade/topology rebuild, manual checkpoint. p95/p99 are sample maxima at n=12, not population estimates.',report},null,2));
