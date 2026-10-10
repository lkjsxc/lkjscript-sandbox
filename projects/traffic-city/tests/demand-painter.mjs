// Deterministic scheduler tests: no browser timers, game simulation or store.
import assert from 'node:assert/strict';
import {DemandPainter,PresentationClock,SnapshotGate} from '../web/motion.js';
const checks=[];
function harness(draw=()=>{},active=()=>false){
 const pending=new Map(),cancelled=[];let serial=0;
 const painter=new DemandPainter(draw,active,{request:callback=>{const id=serial++;pending.set(id,callback);return id},cancel:id=>{cancelled.push(id);pending.delete(id)}});
 const frame=now=>{const callbacks=[...pending.values()];pending.clear();for(const callback of callbacks)callback(now);assert(pending.size<=1,'At most one pending paint')};
 return{painter,pending,cancelled,frame};
}
let paints=0,active=false;
const h=harness(()=>paints++,()=>active);
for(let i=0;i<100;i++)h.painter.invalidate();
assert.equal(h.pending.size,1);assert.equal(h.painter.requests,1);h.frame(0);
assert.equal(paints,1);assert.equal(h.pending.size,0);h.frame(1000);assert.equal(paints,1);
checks.push('Burst invalidations coalesce; unchanged scenes retain no frame callback');
active=true;h.painter.invalidate();for(let i=1;i<=60;i++)h.frame(i*16);
assert.equal(paints,61);assert.equal(h.pending.size,1);active=false;h.frame(1000);
assert.equal(paints,62);assert.equal(h.pending.size,0);
checks.push('Active movement paints every requested frame and includes its final settled frame');
const hidden=harness(()=>paints++);hidden.painter.invalidate();hidden.painter.setVisible(false);
assert.deepEqual(hidden.cancelled,[0],'Frame id zero is cancellable');
for(let i=0;i<100;i++)hidden.painter.invalidate();hidden.frame(2000);assert.equal(paints,62);
hidden.painter.setVisible(true);hidden.painter.setVisible(true);assert.equal(hidden.pending.size,1);
hidden.frame(2100);assert.equal(paints,63);assert.equal(hidden.pending.size,0);
checks.push('Hidden updates do not accumulate work; visibility restoration requests one latest-state frame');
let reentrant;reentrant=harness(()=>{reentrant.painter.invalidate();reentrant.painter.invalidate()},()=>true);
reentrant.painter.invalidate();reentrant.frame(0);assert.equal(reentrant.pending.size,1);
reentrant.painter.dispose();reentrant.painter.invalidate();reentrant.painter.setVisible(false);reentrant.painter.setVisible(true);
assert.equal(reentrant.pending.size,0);assert.equal(reentrant.painter.pending,false);
checks.push('Reentrant invalidation cannot double-schedule; disposal cancels and prevents future work');
const clock=new PresentationClock();let reduced=false;
const playback=harness(now=>clock.sample(now,reduced),()=>!reduced&&clock.time<clock.latest);
clock.receive(0,0);clock.receive(1,500);playback.painter.invalidate();
for(let now=500;now<=3000;now+=16)playback.frame(now);
assert.equal(clock.time,1);assert.equal(playback.pending.size,0);
clock.receive(2,3100);playback.painter.invalidate();playback.frame(3100);
clock.receive(2,3110,true);playback.painter.invalidate();
for(let now=3120;now<=3600;now+=16)playback.frame(now);
assert.equal(clock.time,2);assert.equal(playback.pending.size,0);
reduced=true;clock.receive(3,4000,false);playback.painter.invalidate();playback.frame(4000);
assert.equal(clock.time,3);assert.equal(playback.pending.size,0);
checks.push('Shared native playback reaches its received endpoint, pauses continuously, and snaps exactly under reduced motion');
const gate=new SnapshotGate(),snapshot={seq:1,ack:0,saved:0,notice:'',stats:{tick:0},actors:[],rails:[],cells:[]};
assert(gate.accept(Object.freeze(snapshot)));
assert.equal(gate.accept({...snapshot,seq:2,ack:1,saved:10,notice:'City saved.'}),false);
for(const change of [{stats:{tick:1}},{actors:[{id:1,elapsed:1}]},{rails:[{id:1,elapsed:1}]},{cells:[{id:1,q:2}]},{view:{layer:1}},{futureOverlay:{selected:1}}]){
 assert(gate.accept({...snapshot,...change}));assert.equal(gate.accept({...snapshot,...change,seq:99}),false);gate.accept(snapshot);
}
gate.clear();assert(gate.accept(snapshot));
checks.push('Exact scene comparison ignores delivery-only fields, preserves actor/rail/view/future overlays, and resets on reconnection');
console.log({passed:true,checks});
