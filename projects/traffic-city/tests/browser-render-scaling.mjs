// Renderer-only workload. A test-only adapter translates the development native
// benchmark's plain Command protocol to browser envelopes/acks. City state,
// viewport detail and all tiles come unchanged from the native benchmark target.
// This adapter is never part of the playable server or a simulation benchmark.
import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {startNative,connect,root} from './native.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const prefix=process.env.RENDER_EVIDENCE||'evidence/browser-render-scaling';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM||undefined,headless:true,args:['--no-sandbox']});
const rendererBytes=process.env.RENDER_SOURCE==='working-tree'?fs.readFileSync(root+'/web/app.js'):Buffer.from(await (await fetch(new URL('/app.js',process.env.PREVIEW_URL))).arrayBuffer());
const rendererSha256=createHash('sha256').update(rendererBytes).digest('hex');
const reports=[],errors=[];let n;
function summary(values){const sorted=[...values].sort((a,b)=>a-b);return {samples:values.length,median:sorted[Math.ceil(sorted.length*.5)-1],p95:sorted[Math.ceil(sorted.length*.95)-1],maximum:sorted.at(-1)};}
async function measure(page,name){
 await page.waitForTimeout(700);
 const data=await page.evaluate(async()=>{
  const intervals=[];let last=performance.now();
  for(let i=0;i<240;i++){await new Promise(requestAnimationFrame);const now=performance.now();if(i>5)intervals.push(now-last);last=now;}
  const g=window.__flowgarden;return {draw:g.frameTimes.slice(),intervals,tiles:g.cells.length,actors:g.actors.length,detail:g.detail,view:g.view,camera:g.camera};
 });
 await page.screenshot({path:prefix+'-'+name+'.png'});
 return {name,...data,draw:summary(data.draw),intervals:summary(data.intervals)};
}
async function measurePan(page,name){
 const sampling=page.evaluate(()=>new Promise(resolve=>{const intervals=[],draw=[],until=performance.now()+3500;let last=performance.now();function sample(){const now=performance.now();intervals.push(now-last);draw.push(window.__flowgarden.frameTimes.at(-1));last=now;if(now>=until)resolve({intervals,draw});else requestAnimationFrame(sample)}requestAnimationFrame(sample)}));
 await page.mouse.move(720,440);await page.mouse.down();for(let i=1;i<=60;i++){await page.mouse.move(720+120*Math.sin(i/9),440+40*Math.cos(i/9));await page.waitForTimeout(16)}await page.mouse.up();const data=await sampling;return {name,interaction:'mouse pan while native detail is selected',draw:summary(data.draw),intervals:summary(data.intervals)};
}
try{
 n=await startNative({target:'benchmark-live',tick:60000,name:'browser-render-scaling'});
 for(const rows of [8,64]){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
  if(process.env.RENDER_SOURCE==='working-tree')await page.route('**/app.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(root+'/web/app.js','utf8')}));
  let native,serial=0,latest,chain=Promise.resolve();
  await page.routeWebSocket(/\/live(?:\?|$)/,async socket=>{
   native=connect(n.address,'/live?'+rows);latest=await native.wait(f=>f.seq===1);
   const emit=(frame,ack)=>{const {at,bytes,...wire}=frame;socket.send(JSON.stringify({...wire,seq:++serial,ack}));};
   socket.onMessage(message=>{chain=chain.then(async()=>{
    const envelope=JSON.parse(String(message));
    if(envelope.action.op==='view'){
     const seq=latest.seq;native.socket.send(JSON.stringify(envelope.action));
     latest=await native.wait(f=>f.seq>seq);
    }
    emit(latest,envelope.id);
   }).catch(error=>{errors.push(String(error));socket.close();});});
   emit(latest,0);
  });
  try{
   await page.goto(process.env.PREVIEW_URL);await page.waitForFunction(n=>window.__flowgarden?.sessionStatus===1&&window.__flowgarden.cells.length===n,rows*128);
   await page.locator('#fit').click();await page.waitForFunction(()=>!window.__flowgarden.detail);
   reports.push(await measure(page,'tiles-'+rows*128+'-overview'));
   for(let i=0;i<12;i++){if(await page.evaluate(()=>window.__flowgarden.detail))break;await page.locator('#zoom-in').click();await page.waitForTimeout(300);}
   await page.waitForFunction(()=>window.__flowgarden.detail);reports.push(await measure(page,'tiles-'+rows*128+'-detail'));if(rows===64)reports.push(await measurePan(page,'tiles-8192-pan'));
  }finally{await chain;if(native)await native.close();await context.close();}
 }
 assert.deepEqual(errors,[]);assert(reports.every(r=>r.draw.samples>10));
 const result={passed:true,renderer_sha256:rendererSha256,artifact_sha256:n.selection.artifact_sha256,renderer:process.env.RENDER_SOURCE==='working-tree'?'working-tree browser JS override; native state remains selected artifact':'native-embedded browser JS',environment:{cpu:os.cpus()[0].model,kernel:os.release(),browser:browser.version()},method:'Rendering-only Chromium measurement of unchanged native dense 1,024/8,192-tile fixtures in overview and detail. Native benchmark uses a 60-second timer; no simulation throughput claim. A test-only adapter translates Command envelopes and acknowledgement numbers because the development benchmark target has a different protocol. It never creates tiles, residents, routes or traffic. Stationary views use234 requestAnimationFrame intervals after warmup and up to180 measured draw calls. The dense detail view also records3.5seconds of actual mouse panning. Native HTTP serves the page; optional working-tree JS override is explicit.',reports,errors};
 fs.writeFileSync(root+'/'+prefix+'.json',JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close();if(n)await n.stop();}
