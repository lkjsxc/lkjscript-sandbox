import fs from 'node:fs';import assert from 'node:assert/strict';import {runCase,selection} from './run-case.mjs';
const checks=[];
for(const name of ['full-ring','junction-ring']){
 let city=JSON.parse(fs.readFileSync(`tests/fixtures/${name}-v4.json`));city.originX=0;city.originY=0;city.sim.cancelled=0;city.sim.transit={lines:[],ids:[],nextId:0,plans:[],choices:[],boardings:0,completed:0,spent:0};const ids=city.sim.ids.slice(),samples=[];
 for(let tick=0;tick<80;tick++){
  const previous=new Map(city.sim.agents),r=runCase({city,ticks:1,commands:[],after:[]},`${name}-tick-${tick}`,'continuation').result;
  assert.equal(r.conservation,0);assert.deepEqual(r.city.sim.ids,ids);assert.equal(r.city.sim.population,ids.length);assert.equal(r.city.sim.cancelled,0);const tiles=new Map(r.city.world.tiles);
  for(const [key,count]of r.lanes){if([1,2].includes(tiles.get(Math.floor(key/8))))assert(count>=0&&count<=3,`${name} tick ${tick} lane ${key} capacity ${count}`)}
  for(const a of r.agents){const b=previous.get(a.id);assert(Math.abs(a.cell%128-b.cell%128)+Math.abs(Math.floor(a.cell/128)-Math.floor(b.cell/128))<=1,`resident ${a.id} moved farther than one edge`);assert(a.elapsed<=a.duration);assert.equal(a.journeys-b.journeys,[3,0].includes(a.state)&&[2,4].includes(b.state)?1:0)}
  samples.push({tick:r.city.sim.tick,arrived:r.city.sim.arrived,moving:r.city.sim.moving,maxWait:Math.max(...r.agents.map(a=>a.wait))});city=r.city;
 }
 assert(city.sim.arrived>=ids.length);checks.push({name,passed:true,ticks:80,arrived:city.sim.arrived,samples});console.log(name,city.sim.arrived);
}
fs.writeFileSync('evidence/repair-every-tick.json',JSON.stringify({passed:true,artifact_sha256:selection.artifact_sha256,checks,independent_assertions:['conservation and unchanged resident identities at every tick','every road lane including reservations stays within three places','each resident advances at most one adjacent tile per tick','completed-journey counters change only on arrival completion','no normal traffic recovery uses cancellation']},null,2));
