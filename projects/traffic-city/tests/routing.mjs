// Independent small-fixture oracle for the production commute policy. Driving
// minimizes legal hops; its reported estimate still sums actual edge costs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runCase, selection} from './run-case.mjs';
const road = kind => kind === 1 || kind === 2;
function neighbors(id) {
  const x=id%128,y=Math.floor(id/128);
  return [x<127?id+1:-1,y<127?id+128:-1,x>0?id-1:-1,y>0?id-128:-1].filter(n=>n>=0);
}
function edgeCost(tiles, id, mode) {
  if (mode===1) return 4;
  const kind=tiles.get(id)||0, degree=neighbors(id).filter(n=>road(tiles.get(n))).length;
  return (kind===1?2:1)+(road(kind)&&degree>=3?2:0);
}
function shortest(tiles, origin, dest, mode) {
  const distance=new Map([[origin,0]]),todo=[[0,origin]];
  while (todo.length) {
    todo.sort((a,b)=>b[0]-a[0]);const [cost,id]=todo.pop();
    if (distance.get(id)!==cost) continue;
    if (id===dest) return cost;
    for (const next of neighbors(id)) {
      const kind=tiles.get(next)||0;
      if (next!==origin&&next!==dest&&!road(kind)&&!(mode===1&&kind===7)) continue;
      const candidate=cost+(mode===2?1:4);
      if (candidate<(distance.get(next)??Infinity)) {distance.set(next,candidate);todo.push([candidate,next]);}
    }
  }
  return -1;
}
let seed=4819;
const rand=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
const cases=[['straight',new Map([[0,3],[1,1],[2,4]]),0,2],['path-only',new Map([[0,3],[1,7],[2,4]]),0,2],['boundary',new Map([[127,3],[128,4]]),127,128]];
for (let i=0;i<8;i++) {
  const tiles=new Map();
  for (let y=0;y<12;y++) for (let x=0;x<18;x++) {
    const value=rand();if (value%9!==0) tiles.set(x+y*128,value%7===0?7:value%3===0?1:2);
  }
  tiles.set(0,3);tiles.set(17+11*128,4);cases.push(['seeded-'+i,tiles,0,17+11*128]);
}
const report=[];
for (const [name,tiles,origin,dest] of cases) {
  const result=runCase({rows:0,ticks:2,tiles:[...tiles].map(([id,kind])=>({id,kind,q:0})),commands:[],after:[]},'routes-'+name).result;
  const routes=result.routes.map(entry=>entry.value||entry[1]);
  for (const mode of [1,2]) {
    const route=routes.find(r=>r.mode===mode&&r.origin===origin&&r.dest===dest);
    assert(route,`${name} mode ${mode} missing`);
    const expected=shortest(tiles,origin,dest,mode);
    if (expected<0) {assert.equal(route.cost,-1);assert.equal(route.path.length,0);}
    else {
      assert.equal(route.path[0],origin);assert.equal(route.path.at(-1),dest);
      assert.equal((route.path.length-1)*(mode===1?4:1),expected,`${name}: selected path objective`);
      let actual=0;
      for (let i=1;i<route.path.length;i++) {
        const id=route.path[i],kind=tiles.get(id)||0;
        assert(neighbors(route.path[i-1]).includes(id));
        assert(id===dest||road(kind)||(mode===1&&kind===7),'Car path cannot use pedestrian-only intermediates');
        actual+=edgeCost(tiles,id,mode);
      }
      assert.equal(route.cost,actual,`${name}: returned estimate is time, not hop count`);
    }
    report.push({name,mode,objective:expected,path_time:route.cost,path_length:route.path.length});
  }
  assert.equal(result.conservation,0);
}
fs.writeFileSync('evidence/routing.json',JSON.stringify({passed:true,artifact_sha256:selection.artifact_sha256,algorithm:'Production topology-first driving and exact walking compared with independent uniform-cost oracle; actual route-time sums, permitted surfaces and disconnected paths checked separately.',report},null,2)+'\n');
console.log('PASS',report.length,'independent production route-policy comparisons');
