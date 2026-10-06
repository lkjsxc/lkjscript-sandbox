import fs from 'node:fs';import assert from 'node:assert/strict';
import {startNative,connect,memory,root} from './native.mjs';
const label=process.env.PROFILE_LABEL||'baseline';
const samples=Number(process.env.PROFILE_SAMPLES||40);
const modes=(process.env.PROFILE_MODES||'empty,retain,picture,encode,simulate,routes,live').split(',');
const rowsList=(process.env.PROFILE_ROWS||'32,64').split(',').map(Number);
const report=[];
for(const rows of rowsList)for(const mode of modes){
 const n=await startNative({target:'benchmark-live',tick:1,name:`profile-${label}-${rows}-${mode}`});
 const start=performance.now(),c=connect(n.address,`/${mode}?${rows}`);
 try{
  await c.wait(f=>f.seq>=samples+6,240000);
  const frames=c.frames.filter(f=>f.seq>=6&&f.seq<=samples+6);
  const gaps=frames.slice(1).map((f,i)=>f.at-frames[i].at),sorted=[...gaps].sort((a,b)=>a-b);
  const q=p=>sorted[Math.ceil(sorted.length*p)-1];
  for(const f of frames){const s=f.stats||f;assert.equal(s.requested,s.arrived+s.backlog);}
  const entry={mode,tiles:mode==='empty'?0:rows*128,rows,samples:gaps.length,open_ms:c.frames[0].at-start,median_ms:q(.5),p95_ms:q(.95),p99_ms:q(.99),maximum_ms:q(1),mean_bytes:frames.reduce((a,f)=>a+f.bytes,0)/frames.length,...memory(n.child.pid),gaps_ms:gaps};
  report.push(entry);console.log(JSON.stringify({...entry,gaps_ms:undefined}));
 }finally{await c.close();await n.stop();}
 fs.writeFileSync(root+`/evidence/profile-${label}.json`,JSON.stringify({artifact_sha256:n.selection.artifact_sha256,samples,method:'Sequential isolated native sessions. 1 ms requested timer, five warmup transitions. Nearest-rank percentiles. Retain includes callback/heartbeat/socket/timer plus exact State admission; empty is its small-State control. Picture and encode are separate fixed-city diagnostics, not a subtractive CPU profile. Encode uses 600-cell Seen map JSON. Simulate returns small counters without viewport. Routes rebuilds BFS and next-hop cache every diagnostic transition. Live includes the complete production loop and 120-cycle saves.',report},null,2));
}
