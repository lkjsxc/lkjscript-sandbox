// The authored 512-resident, two-line metro, with native command-runner oracles.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {startNative,connect,memory,root} from './native.mjs';
const execute=promisify(execFile),selection=JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||root+'/.build/selection.json'));
async function oracle(input,name,target='continuation'){
 const dir=fs.mkdtempSync(root+'/runtime/lab-oracle-'),file=dir+'/input.json';fs.writeFileSync(file,JSON.stringify({input,name,target}));
 const code="import fs from 'node:fs';import{runCase}from'./tests/run-case.mjs';const p=JSON.parse(fs.readFileSync(process.argv[1]));process.stdout.write(JSON.stringify(runCase(p.input,p.name,p.target).result));";
 const {stdout}=await execute(process.execPath,['--input-type=module','-e',code,file],{cwd:root,maxBuffer:64*1024*1024});return JSON.parse(stdout);
}
const seed=await oracle(3,'city-lab-metro-seed','scenario-seed');assert.equal(seed.sim.population,512);
const command={op:'rail-service',x:seed.sim.transit.ids[0],y:0,x2:0,y2:0,kind:0};
const [control,planned]=await Promise.all([oracle({city:seed,ticks:64,commands:[],after:[]},'city-lab-metro-control'),oracle({city:seed,ticks:64,commands:[command],after:[]},'city-lab-metro-plan')]);
const native=await startNative({name:'city-lab-metro',tick:25});const c=connect(native.address);let id=0;
async function send(op,fields={}){const next=++id;c.socket.send(JSON.stringify({id:next,token:op==='resume'?token:'',owner:op==='resume'?owner:'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));return c.wait(f=>f.ack===next,90000)}
const token=randomBytes(32).toString('hex'),owner=randomBytes(16).toString('hex');
try{
 await c.wait(f=>f.seq===1);await send('resume');let f=await send('review-scenario',{kind:3});f=await send('load-scenario',{kind:3,x:f.confirmation});assert.equal(f.stats.population,512);const original=f.stats;
 await send('lab-start');f=await send('rail-service',command);assert.equal(f.rails.filter(l=>l.enabled).length,1);assert.equal(f.lab.planCost,0);
 const startedAt=performance.now(),started=await send('lab-run',{kind:64});const done=await c.wait(f=>f.seq>started.seq&&f.lab.phase===4,240000);const pairedWall=performance.now()-startedAt;assert(Number.isFinite(pairedWall)&&pairedWall>0);
 const frames=c.frames.filter(f=>f.seq>=started.seq&&f.seq<=done.seq);
 for(const f of frames){assert.equal(f.lab.realTick,original.tick);assert.equal(f.saved,original.tick);assert.equal(f.stats.wealthError,0);for(const line of f.rails)assert(line.occupancy<=line.capacity);assert(f.bytes<131072)}
 for(const [key,result]of [['control',control],['changed',planned]]){
  const s=result.city.sim,m=done.lab[key];assert.equal(result.conservation,0);
  assert.equal(m.visits,s.visits-seed.sim.visits);assert.equal(m.arrived,s.arrived-seed.sim.arrived);assert.equal(m.waitCycles,s.waitTicks-seed.sim.waitTicks);assert.equal(m.cancelled,s.cancelled-seed.sim.cancelled);assert.equal(m.population,s.population);assert.equal(m.netFunds,result.city.cash-seed.cash);assert.equal(m.boardings,s.transit.boardings-seed.sim.transit.boardings);assert.equal(m.outstanding,s.requested-s.arrived-s.cancelled);assert.equal(m.wealthError,0);
  const phase=key==='control'?2:3,steps=new Map(frames.filter(f=>f.lab.phase===phase&&f.lab.step>0).map(f=>[f.lab.step,f.stats.disconnected]));assert.equal(steps.size,63);assert.equal(m.disconnectedCycles,[...steps.values()].reduce((a,b)=>a+b,0)+s.disconnected);
 }
 for(let i=1;i<frames.length;i++){const a=frames[i-1].lab,b=frames[i].lab;if(a.phase===b.phase)assert(b.step-a.step>=0&&b.step-a.step<=1,'At most one cycle per callback')}
 for(const who of [1,128,256,512]){f=await send('inspect',{kind:who});assert.deepEqual(f.inspect,planned.agents.find(p=>p.id===who))}
 const report={passed:true,artifact_sha256:selection.artifact_sha256,population:512,horizon:64,intervention:'Suspend the first metro service before the paired run.',comparison:done.lab,maximum_frame_bytes:Math.max(...frames.map(f=>f.bytes)),paired_wall_ms:pairedWall,memory:memory(native.child.pid),checks:['Exact independent native-counter agreement for both futures','Unfinished journeys, rail seats and money conserved throughout','Disconnected person-cycles reconstructed from all 64 frames per branch','One tick maximum per callback and unchanged real save cycle','Four complete resident records match the ordinary simulation']};
 f=await send('lab-discard');assert.deepEqual(f.stats,original);assert(f.rails.every(l=>l.enabled));report.checks.push('Discard restores both original paid services, population, funds and time.');fs.writeFileSync(root+'/evidence/city-lab-metro.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await c.close();await native.stop()}
