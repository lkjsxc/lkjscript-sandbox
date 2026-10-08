// The cache is a compiled projection, not a second authority for road rules.
// Compare all kind pairs, four directions, endpoint policies and modes, plus
// portal/layer/boundary cases against uncached native rules and entry costs.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.env.CITY_SELECTION ||= '.build/routing-verified-cache083.json';
const {runCase,selection}=await import('./run-case.mjs?cache-contract');
const specs=[];
for(let a=0;a<=13;a++)for(let b=0;b<=13;b++)for(let direction=0;direction<4;direction++)for(let endpoint=0;endpoint<3;endpoint++)for(const mode of [1,2])specs.push({id:129,direction,a,b,portal:0,endpoint,mode,queue:(a*3+b*7)%40});
for(const id of [0,127,16256,16383,16384,16511,32640,32767])for(let direction=0;direction<5;direction++)for(const a of [0,1,2,7,9,10,11,12,13])for(const b of [0,1,2,7,9,13])for(let endpoint=0;endpoint<3;endpoint++)for(const mode of [1,2])specs.push({id,direction,a,b,portal:13,endpoint,mode,queue:19});
const cases=[];let pass=0;
for(let i=0;i<specs.length;i+=96){const input=specs.slice(i,i+96),r=runCase(input,'cache-contract-'+i,'cache-proof');assert.equal(r.result.length,input.length);for(let j=0;j<input.length;j++){const proof=r.result[j];assert.equal(proof.actual,proof.expected,JSON.stringify(input[j]));assert.equal(proof.actualCost,proof.expectedCost,JSON.stringify(input[j]));pass++}cases.push({start:i,count:input.length,input_sha256:createHash('sha256').update(JSON.stringify(input)).digest('hex')});if(i%1536===0)console.log('verified',pass,'edge and cost contracts');}
const report={passed:true,comparisons:pass,assertions:pass*2,scope:'Packed adjacency/endpoint bits versus the uncached native edge rule and entry cost. All tile kinds, both modes, all planar directions, portals and layer boundaries; does not certify construction or gameplay integration.',artifact_sha256:selection.artifact_sha256,compiler_sha256:selection.compiler_sha256,cases};fs.writeFileSync('evidence/cache-contract.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,cases:undefined},null,2));
