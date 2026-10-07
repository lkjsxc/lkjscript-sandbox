import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
import {startNative,connect,memory,root} from './native.mjs';
import {runCase,selection} from './run-case.mjs';
import {decodeAtlas} from '../web/atlas.js';
import {expectedAtlas} from './atlas-oracle.mjs';
// All ordinary native oracle timelines finish before a live socket is opened.
const base=runCase({rows:-1,ticks:0,tiles:[],commands:[],after:[]},'atlas-origin').result.city;
const command={op:'build',x:base.originX+6,y:base.originY+9,x2:base.originX+6,y2:base.originY+9,kind:4};
const plan=runCase({city:base,ticks:0,commands:[command],after:[]},'atlas-plan','continuation').result.city;
const control=runCase({city:base,ticks:64},'atlas-timeline-control','atlas-probe').result;
const changed=runCase({city:plan,ticks:64},'atlas-timeline-plan','atlas-probe').result;
assert.equal(control.frames.length,64);assert.equal(changed.frames.length,64);
const expected=expectedAtlas(base.sim,plan.sim,control.frames,changed.frames);
const longest=runCase({city:base,ticks:256},'atlas-timeline-longest','atlas-probe').result;
const expectedLongest=expectedAtlas(base.sim,base.sim,longest.frames,longest.frames);
const native=await startNative({name:'delay-atlas',tick:25}),c=connect(native.address),key=randomBytes(32).toString('hex'),owner=randomBytes(16).toString('hex');let id=0;const checks=[];
async function send(op,fields={}){const next=++id;c.socket.send(JSON.stringify({id:next,token:op==='resume'?key:'',owner:op==='resume'?owner:'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));const f=await c.wait(f=>f.ack===next,90000);assert.equal(f.status,1,f.notice);return f}
async function compare(horizon=64){const start=await send('lab-run',{kind:horizon});const done=await c.wait(f=>f.seq>start.seq&&f.lab.phase===4,240000);assert(done.lab.atlasChanged);return {start,done,atlas:decodeAtlas(done.lab.atlas)}}
try{
 await c.wait(f=>f.seq===1);const original=(await send('resume')).stats;await send('lab-start');await send('build',command);
 const first=await compare();assert.deepEqual(first.atlas,expected);assert.equal(first.done.stats.tick,base.sim.tick+64);assert.equal(first.done.stats.wealthError,0);
 assert.equal(first.atlas.same,32);assert.equal(first.atlas.less+first.atlas.more+first.atlas.equal,32);
 assert.equal(first.atlas.baseLost,first.done.lab.control.disconnectedCycles);assert.equal(first.atlas.planLost,first.done.lab.changed.disconnectedCycles);
 const seen=c.frames.filter(f=>f.seq>=first.start.seq&&f.seq<=first.done.seq);
 assert.equal(seen.filter(f=>f.lab.atlasChanged).length,1);assert(seen.filter(f=>f.lab.phase!==4).every(f=>!f.lab.atlas.homes.length));
 const follow=await send('inspect',{kind:1});assert.equal(follow.lab.atlasChanged,false);assert.deepEqual(follow.lab.atlas.homes,[]);assert.equal(follow.lab.atlas.same,32);
 checks.push('Every per-home and cohort field equals an independent reduction of all 64 native resident observations per future; unfinished and long-wait exposure are included.');
 checks.push('A compact full atlas is emitted only on the result transition; heartbeat/inspect frames retain totals without repeating home rows.');
 const repeat=await compare();assert.deepEqual(repeat.atlas,first.atlas);checks.push('Repeating the same experiment clears both ledgers instead of doubling counts.');
 let f=await send('lab-edit');assert.equal(f.lab.phase,1);assert.equal(f.lab.atlas.same,0);assert.deepEqual(f.lab.atlas.homes,[]);
 await send('lab-run',{kind:256});const after=f.seq;await c.wait(f=>f.seq>after&&f.lab.phase===2&&f.lab.step>=2);f=await send('lab-edit');assert.equal(f.lab.phase,1);assert.equal(f.lab.atlas.same,0);
 f=await send('lab-discard');assert.deepEqual(f.stats,original);
 checks.push('Stopping, returning to edit and discarding clear the experiment without changing the original city.');
 // Replace a home at the exact same location. Population alone must not match it.
 await send('lab-start');const home=base.world.homes[0],x=home%128,y=Math.floor(home/128);
 f=await send('review-remove',{x,y,x2:x,y2:y});assert.equal(f.quote.moveouts,8);await send('apply-remove',{x:f.quote.id});f=await send('build',{x,y,x2:x,y2:y,kind:3});assert.equal(f.stats.population,32);
 const replaced=await compare();const row=replaced.atlas.homes.find(r=>r.home===home);assert.equal(row.before,8);assert.equal(row.after,8);assert.equal(row.same,0);assert.equal(row.less,0);assert.equal(row.baseTime,0);assert.equal(row.planTime,0);
 assert.equal(replaced.atlas.same,24);assert.equal(replaced.atlas.removed,8);assert.equal(replaced.atlas.added,8);assert.equal(replaced.atlas.less+replaced.atlas.more+replaced.atlas.equal,24);
 checks.push('Demolish and rebuild at the same coordinates keeps 32 residents but correctly compares only the 24 identical residents; eight replacements cannot be counted as improvements.');
 f=await send('lab-discard');assert.deepEqual(f.stats,original);assert.equal(f.saved,original.tick);
 await send('lab-start');const maximum=await compare(256);assert.deepEqual(maximum.atlas,expectedLongest);assert.equal(maximum.atlas.equal,32);assert.equal(maximum.atlas.less,0);assert.equal(maximum.atlas.more,0);await send('lab-discard');
 checks.push('An unchanged 256-cycle maximum-horizon comparison matches an independent full observation timeline for all 32 residents and clears every previous ledger.');
 const result={passed:true,maximum_horizon:256,artifact_sha256:selection.artifact_sha256,checks,comparison:expected,replacement:replaced.atlas,maximum_frame_bytes:Math.max(...c.frames.map(f=>f.bytes)),memory:memory(native.child.pid)};
 assert(result.maximum_frame_bytes<131072);fs.writeFileSync(root+'/evidence/delay-atlas.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await c.close();await native.stop()}
