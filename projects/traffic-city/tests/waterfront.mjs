import assert from 'node:assert/strict';import fs from 'node:fs';
import {runCase,selection} from './run-case.mjs';
import {assertMoney} from './rail-accounting.mjs';
import {riverPoints,waterAt} from '../web/geometry.js';
const checks=[],id=(x,y)=>x+128*y,command=(op,x=0,y=0,x2=x,y2=y,kind=0)=>({op,x,y,x2,y2,kind});
function invariants(r){assert.equal(r.conservation,0);assertMoney(r.city);const s=r.city.sim;assert.equal(s.population,1024);assert.equal(s.population,s.born-s.removed);assert.equal(s.requested,s.arrived+s.cancelled+r.agents.filter(a=>[1,2,4,5,6].includes(a.state)).length);for(const[,line]of s.transit.lines){assert(line.passengers.length<=line.capacity);assert.equal(new Set(line.passengers).size,line.passengers.length)}}
const initial=runCase({rows:-1,tiles:[],ticks:0,commands:[],after:[]},'waterfront-initial').result.city;
const apply=(city,commands,name)=>runCase({city,ticks:0,commands,after:[]},name,'continuation').result;
assert.equal(initial.landscape,1);
const p=runCase({landscape:1,originX:50,originY:54,row:64},'waterfront-terrain','terrain-probe').result;const points=riverPoints(p.spine);assert.equal(p.width,6);assert.equal(points.length,129);assert.deepEqual(p.wet,[62,63,64,65,66,67]);
for(const row of [0,19,20,21,35,36,37,45,46,50,51,52,64,70,71,72,80,81,82,92,93,94,101,102,103,127]){const n=runCase({landscape:1,originX:50,originY:54,row},'waterfront-bank-'+row,'terrain-probe').result;assert.deepEqual(Array.from({length:128},(_,x)=>x).filter(x=>waterAt(points,6,id(x,row))),n.wet)}
checks.push('Native water classification and projected banks agree at every bend boundary and map edge.');
for(const [kind,cost]of [[1,208],[2,480],[7,104]]){const r=apply(initial,[command('build',61,62,68,62,kind)],'waterfront-bridge-'+kind);assert.equal(initial.cash-r.city.cash,cost);for(let x=61;x<=68;x++)assert.equal(new Map(r.city.world.tiles).get(id(x,62)),kind);assert.equal(r.city.world.version,initial.world.version+1);assert.equal(r.conservation,0);assertMoney(r.city);const repeated=apply(r.city,[command('build',61,62,68,62,kind)],'waterfront-repeat-'+kind);assert.deepEqual(repeated.city,r.city)}
for(const c of [command('build',61,62,65,62,1),command('build',64,62,68,62,7),command('build',64,62,64,62,3),command('build',64,62,64,62,6)]){const r=apply(initial,[c],'waterfront-rejection');assert.deepEqual(r.city,initial)}
const noFunds=structuredClone(initial);noFunds.cash=100;noFunds.economy.active=false;const poor=apply(noFunds,[command('build',61,62,68,62,2)],'waterfront-poor');assert.deepEqual(poor.city.world,noFunds.world);assert.equal(poor.city.cash,noFunds.cash);
const upgrade=apply(initial,[command('build',64,64,64,64,2)],'waterfront-bridge-upgrade');assert.equal(upgrade.city.cash,initial.cash-72);assert.equal(new Map(upgrade.city.world.tiles).get(id(64,64)),2);
checks.push('Road, avenue and footbridge construction is atomic, priced by water tiles, idempotent, bank-to-bank, funded and upgradeable.');
const seeded=runCase(4,'waterfront-seed','scenario-seed');let city=seeded.result;
assert.equal(city.landscape,1);assert.equal(city.sim.population,1024);assert.equal(city.world.homes.length,128);assert.equal(city.world.jobs.length,64);assert.equal(city.sim.transit.ids.length,4);assert(city.sim.transit.lines.every(([,l])=>l.stops.length===4&&l.enabled));
const tiles=new Map(city.world.tiles),stations=[...tiles].filter(([,k])=>k===8);assert.equal(stations.length,16);
for(const[cell,kind]of tiles)if(kind>=3&&kind<=6||kind===8)assert(!waterAt(points,6,cell),'Facility on water '+cell);
checks.push('Native seed creates 1,024 residents, 1,024 jobs, sixteen dry stations and four enabled four-stop services.');
const samples=[];let maxWait=0;for(let i=0;i<16;i++){const run=runCase({city,ticks:8,commands:[],after:[]},'waterfront-advance-'+i,'continuation');invariants(run.result);city=run.result.city;maxWait=Math.max(maxWait,city.sim.waiting);samples.push({tick:city.sim.tick,visits:city.sim.visits,arrived:city.sim.arrived,waiting:city.sim.waiting,disconnected:city.sim.disconnected,boardings:city.sim.transit.boardings,completed:city.sim.transit.completed,wall_ms:run.wall_ms});console.log("Native city",samples.at(-1))}
assert(city.sim.visits>0);assert(city.sim.transit.boardings>0);assert(city.sim.transit.completed>0);
checks.push('128 native cycles preserve residents, requests, money and train capacity while producing actual visits and completed rail journeys.');
fs.writeFileSync('runtime/waterfront-20261007/mature-city.json',JSON.stringify(city));const report={passed:true,artifact_sha256:selection.artifact_sha256,checks,seed_ms:seeded.wall_ms,tiles:tiles.size,population:city.sim.population,samples,maxWait};fs.writeFileSync('evidence/waterfront.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
