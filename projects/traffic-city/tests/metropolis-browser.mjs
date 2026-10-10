import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
import {startMetro,startMetroHttp,selection,memory,root} from './metropolis-native.mjs';
const http=await startMetroHttp();let host,browser;const errors=[],checks=[],samples=[];
const percentile=(xs,q)=>{const a=[...xs].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(a.length*q))]??0;};
try{
 host=await startMetro({name:'metropolis-browser',origin:http.origin,tick:250});
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 const url=http.origin+'/metropolis?session_port='+host.address.split(':').at(-1);
 await page.goto(url);await page.waitForFunction(()=>window.__metropolis?.frame?.stats.population===100000&&window.__metropolis.frame.status===1,{timeout:30000});
 await page.waitForFunction(()=>window.__metropolis.frame.stats.tick>=12,{timeout:30000});checks.push('native HTTP and WebSocket load a moving 100,000-person city');
 for(const[name,scale]of[['far',null],['middle',26],['near',90]]){
  await page.evaluate(scale=>{const r=window.__metropolis.renderer;r.camera.x=64;r.camera.y=64;if(scale===null)r.fit();else{r.camera.scale=scale;r.changed();}},scale);
  await page.waitForTimeout(600);await page.evaluate(()=>{const m=window.__metropolis.renderer.metrics;m.times.length=0;m.intervals.length=0;});
  await page.evaluate(()=>new Promise(resolve=>{let n=0;function next(){if(++n>=180)resolve();else requestAnimationFrame(next);}requestAnimationFrame(next);}));
  const m=await page.evaluate(()=>{const a=window.__metropolis,r=a.renderer;return{...r.metrics,times:[...r.metrics.times],intervals:[...r.metrics.intervals],quality:r.quality,population:a.frame.stats.population,frameBytes:a.metrics.maximumFrameBytes,view:a.frame.view,groups:a.frame.stats.groups};});
  assert.equal(m.population,100000);assert.equal(m.groups,256);assert(m.shown<=[256,640,1536][m.level]);assert(m.cacheBytes<=24*1024*1024);assert(m.times.length>=100);assert(percentile(m.times,.95)<25);
  samples.push({name,level:m.level,representatives:m.shown,paint_median_ms:percentile(m.times,.5),paint_p95_ms:percentile(m.times,.95),raf_median_ms:percentile(m.intervals,.5),raf_p95_ms:percentile(m.intervals,.95),tile_builds:m.tileBuilds,cache_bytes:m.cacheBytes,maximum_frame_bytes:m.frameBytes,view:m.view});
  await page.screenshot({path:root+'/evidence/metropolis-'+name+'.png'});
 }
 checks.push('three live LOD levels stay inside marker, raster and paint budgets');
 await page.evaluate(()=>window.__metropolis.command('pause'));await page.waitForTimeout(350);const stopped=await page.evaluate(()=>window.__metropolis.renderer.metrics.drawCalls);await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>window.__metropolis.renderer.metrics.drawCalls),stopped);checks.push('pausing stops continuous requestAnimationFrame drawing');
 await page.evaluate(()=>{const a=window.__metropolis;a.renderer.camera.scale=26;a.renderer.camera.x=64;a.renderer.camera.y=64;a.renderer.changed();a.showInspector(136);});await page.waitForTimeout(500);
 const before=await page.evaluate(()=>window.__metropolis.frame.stats.population);await page.click('#grow');await page.waitForFunction(n=>window.__metropolis.frame.stats.population===n+1000,before);assert.equal(await page.locator('#inspector').isVisible(),true);checks.push('district inspector edits native population and stays open');
 await page.selectOption('#rail-v','2');await page.waitForFunction(()=>window.__metropolis.renderer.rails[24]===2);checks.push('north–south rail service is editable in the running interface');
 await page.click('#inspect-close');await page.evaluate(()=>window.__metropolis.command('pause'));await page.evaluate(()=>{const r=window.__metropolis.renderer;r.camera.scale=12;r.camera.x=40;r.camera.y=40;r.changed();});await page.waitForTimeout(400);await page.click('[data-tool=road]');
 for(const y of [3,4,5]){
  const points=await page.evaluate(y=>{const r=window.__metropolis.renderer;return[r.project(3*8+4,y*8+4),r.project(5*8+4,y*8+4)];},y);
  await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();await page.mouse.move(points[1].x,points[1].y,{steps:2});await page.mouse.up();
 }
 await page.waitForFunction(()=>window.__metropolis.pending===0);const roads=await page.evaluate(()=>window.__metropolis.renderer.roads);for(const y of [3,4,5])for(const x of [3,4,5])assert.equal(roads[y*16+x],2);
 assert.equal(await page.evaluate(()=>window.__metropolis.frame.paused),false);const editingTick=await page.evaluate(()=>window.__metropolis.frame.stats.tick);await page.waitForFunction(t=>window.__metropolis.frame.stats.tick>t,editingTick);checks.push('rapid drag releases persist in order without pausing the city');
 await page.evaluate(()=>window.__metropolis.command('pause'));const checkpoint=await page.evaluate(async()=>{const a=window.__metropolis;await a.command('save');return{population:a.frame.stats.population,spent:a.frame.spent,tick:a.frame.stats.tick};});
 await page.reload();await page.waitForFunction(()=>window.__metropolis?.frame?.status===1);assert.deepEqual(await page.evaluate(()=>{const f=window.__metropolis.frame;return{population:f.stats.population,spent:f.spent,tick:f.stats.tick};}),checkpoint);checks.push('browser reload recovers the exact acknowledged paused city');
 // A distinct mobile profile creates its own isolated save, never a public city.
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}),phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(String(e)));await phone.goto(url);await phone.waitForFunction(()=>window.__metropolis?.frame?.stats.tick>=8);
 assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const session=await mobile.newCDPSession(phone);await phone.click('[data-tool=road]');const previous=await phone.evaluate(()=>({scale:window.__metropolis.renderer.camera.scale,spent:window.__metropolis.frame.spent}));
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:145,y:390,id:1}]});await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:145,y:390,id:1},{x:245,y:390,id:2}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:95,y:390,id:1},{x:295,y:390,id:2}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await phone.waitForTimeout(500);assert((await phone.evaluate(()=>window.__metropolis.renderer.camera.scale))>previous.scale*1.5);assert.equal(await phone.evaluate(()=>window.__metropolis.frame.spent),previous.spent);checks.push('390px mobile viewport fits and pinch cancels construction without charging');
 await phone.click('[data-tool=explore]');await phone.screenshot({path:root+'/evidence/metropolis-mobile.png'});
 // Visibility event handling, using an explicit browser visibility fixture.
 await phone.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await phone.waitForTimeout(600);const hidden=await phone.evaluate(()=>({draws:window.__metropolis.renderer.metrics.drawCalls,tick:window.__metropolis.frame.stats.tick}));await phone.waitForTimeout(700);assert.deepEqual(await phone.evaluate(()=>({draws:window.__metropolis.renderer.metrics.drawCalls,tick:window.__metropolis.frame.stats.tick})),hidden);
 await phone.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await phone.waitForFunction(t=>window.__metropolis.frame.stats.tick>t,hidden.tick);checks.push('visibility fixture stops drawing and native updates, then resumes');
 assert.deepEqual(errors,[]);const report={passed:true,artifact_sha256:selection.artifact_sha256,checks,samples,native_process:memory(host.child.pid),errors};fs.writeFileSync(root+'/evidence/metropolis-browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();if(host&&host.child.exitCode===null)await host.stop();await http.stop();}
