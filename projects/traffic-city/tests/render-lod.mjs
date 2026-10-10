import assert from 'node:assert/strict';
import {RenderBudget,TileIndex,sampleVisualActors,stableVisualRank} from '../web/motion.js';
let checks=0;const equal=(a,b)=>{assert.deepEqual(a,b);checks++};
const budget=new RenderBudget();for(let i=0;i<29;i++)budget.observe(20);equal(budget.quality,2);budget.observe(20);equal(budget.quality,1);for(let i=0;i<30;i++)budget.observe(20);equal(budget.quality,0);for(let i=0;i<400;i++)budget.observe(1);equal(budget.quality,2);for(const value of [-1,NaN,Infinity])budget.observe(value);equal(budget.quality,2);
equal([budget.level(4),budget.level(12),budget.level(40),budget.level(40,true)],[0,1,2,1]);
const cells=new Map();for(let layer=0;layer<2;layer++)for(let y=0;y<128;y++)for(let x=0;x<128;x++)if((x*7+y*11)%5===0){const id=x+y*128+layer*16384;cells.set(id,{id,kind:1+(id%8),q:id%25})}
const index=new TileIndex();index.rebuild(cells);
for(let n=0;n<160;n++){const layer=n%2,x0=n*17%140-6,y0=n*29%140-6,x1=x0+n%36,y1=y0+n%29;const actual=index.query(layer,x0,y0,x1,y1).map(c=>c.id).sort((a,b)=>a-b);const expected=[...cells.values()].filter(c=>Math.floor(c.id/16384)===layer&&c.id%128>=Math.max(0,x0)&&c.id%128<=Math.min(127,x1)&&Math.floor(c.id%16384/128)>=Math.max(0,y0)&&Math.floor(c.id%16384/128)<=Math.min(127,y1)).map(c=>c.id).sort((a,b)=>a-b);equal(actual,expected)}
const cached=index.query(0,30,30,45,45),queries=index.queryCount;equal(index.query(0,30,30,45,45),cached);equal(index.queryCount,queries);
const c=cached[0];cells.set(c.id,{...c,q:999});index.rebuild(cells);equal(index.query(0,30,30,45,45).find(x=>x.id===c.id).q,999);
const actors=Array.from({length:100000},(_,id)=>({id,mode:1+id%2}));const start=performance.now(),sample=sampleVisualActors(actors,640),elapsed=performance.now()-start;equal(sample.length,640);equal(new Set(sample.map(a=>a.id)).size,640);equal(sampleVisualActors([...actors].reverse(),640),sample);equal(sampleVisualActors(actors,0),[]);equal(sampleVisualActors(sample,1000),sample);equal(sampleVisualActors(actors,256),sample.slice(0,256));assert.throws(()=>sampleVisualActors(actors,-1));checks++;
for(const id of [0,1,100000,2147483647])assert.ok(Number.isInteger(stableVisualRank(id)));checks++;
console.log(JSON.stringify({checks,sample_input:actors.length,sample_output:sample.length,sampling_ms:elapsed,tile_queries:index.queryCount,visited_tiles:index.visits,quality:budget.diagnostics},null,2));
