// This test creates its own fresh, isolated native store through startNative.
// It never opens an existing directory, resets a city, or deletes any save.
import assert from 'node:assert/strict';import fs from 'node:fs';import {randomBytes} from 'node:crypto';
import {startNative,connect} from './native.mjs';
const host=await startNative({name:'waterfront-new-save-capacity',tick:250}),keys=[],expected=[];let client;
async function open(key){if(client)await client.close();client=connect(host.address);await client.wait(f=>f.seq===1);let seq=0;const owner=randomBytes(16).toString('hex');client.command=async(op,fields={})=>{const id=++seq;client.socket.send(JSON.stringify({id,token:op==='resume'?key:'',owner:op==='resume'?owner:'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));return client.wait(f=>f.ack===id,120000)};return client.command('resume')}
try{
 assert.equal(host.config.configuration.saved_city_limit.value,'1024');
 for(let i=0;i<16;i++){keys.push(randomBytes(32).toString('hex'));assert.equal((await open(keys[i])).status,1);const f=await client.command('build',{x:20+i,y:18,x2:20+i,y2:18,kind:1});assert.equal(f.status,1);assert.equal(f.saved,f.stats.tick);expected.push(f.stats)}
 for(let i=0;i<16;i++)assert.deepEqual((await open(keys[i])).stats,expected[i]);
 const result={passed:true,artifact_sha256:host.selection.artifact_sha256,configured_default:1024,independent_saved_cities:16,checks:['New disposable host creates sixteen independent cities, exceeding the former eight-city limit.','Every acknowledged save reopens with exact native statistics; no prior city was reset or evicted.','The test used only its newly allocated isolated store.']};fs.writeFileSync('evidence/save-capacity.json',JSON.stringify(result,null,2));console.log(result);
}finally{if(client)await client.close();await host.stop()}
