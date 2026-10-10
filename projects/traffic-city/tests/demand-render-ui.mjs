// Real native HTTP/session and disposable browser storage. The visibility case
// injects a document visibility signal explicitly; it does not freeze Chromium
// or stop server timers, and is not a claim about physical-device suspension.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {selectTool,districtPoint} from './ui-driver.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--no-sandbox']});
const errors=[],checks=[],samples={};
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.PREVIEW_URL);await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);
 const state=()=>page.evaluate(()=>{const g=window.__flowgarden;return {...g.renderMetrics,tick:g.stats.tick,paused:g.stats.paused,sequence:g.sequence,motionTime:g.motionTime}});
 const settle=async()=>{await page.waitForTimeout(700);await page.waitForFunction(()=>!window.__flowgarden.renderMetrics.pendingFrame)};
 await settle();const first=await state();assert(first.paused);await page.waitForTimeout(1000);const idle=await state();
 assert.equal(idle.draws,first.draws);assert.equal(idle.queries,first.queries);samples.initialIdle={milliseconds:1000,draws:idle.draws-first.draws};
 checks.push('The paused native city has zero redraws and tile queries over a settled one-second interval');
 await selectTool(page,1);await settle();const beforeHover=await page.locator('#map').evaluate(c=>c.toDataURL());
 const point=await districtPoint(page,7,11);await page.mouse.move(point.x,point.y);await page.waitForTimeout(100);
 assert.notEqual(await page.locator('#map').evaluate(c=>c.toDataURL()),beforeHover,'Hover preview must wake a sleeping canvas');
 await page.keyboard.press('Escape');await settle();assert.equal(await page.evaluate(()=>window.__flowgarden.tool),-2);
 checks.push('Actual pointer hover wakes construction preview, and Escape clears it without waiting for a native cycle');
 await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.tick>=12&&window.__flowgarden.renderedActors.length>0);
 const movement=await page.evaluate(async()=>{
  const g=window.__flowgarden,start=g.renderMetrics.draws,initial=new Map(g.renderedActors.map(a=>[a.id,a]));let moved=false;
  for(let i=0;i<90;i++){await new Promise(requestAnimationFrame);moved ||= g.renderedActors.some(a=>{const b=initial.get(a.id);return b&&Math.hypot(a.x-b.x,a.y-b.y)>.01})}
  return {browserFrames:90,draws:g.renderMetrics.draws-start,moved,bufferTicks:g.motionMetrics.bufferTicks};
 });assert(movement.moved);assert(movement.draws>30);samples.movement=movement;
 checks.push('Normal native playback keeps repainting and changes actual interpolated resident positions');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(700);
 const reducedStart=await state();await page.waitForTimeout(2000);const reducedEnd=await state();
 assert(reducedEnd.tick>reducedStart.tick);assert.equal(reducedEnd.motionTime,reducedEnd.tick);
 const reducedDraws=reducedEnd.draws-reducedStart.draws,received=reducedEnd.sequence-reducedStart.sequence;
 assert(reducedDraws<=received+1,{reducedDraws,received});samples.reducedMotion={milliseconds:2000,draws:reducedDraws,receivedFrames:received,cycles:reducedEnd.tick-reducedStart.tick};
 checks.push('Reduced-motion paints received snapshots rather than a continuous animation loop while the native city advances');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});
 const hiddenStart=await state();assert.equal(hiddenStart.visible,false);assert.equal(hiddenStart.pendingFrame,false);
 await page.waitForTimeout(2000);const hiddenEnd=await state();assert.equal(hiddenEnd.draws,hiddenStart.draws);assert(hiddenEnd.tick>hiddenStart.tick);
 samples.visibilitySignal={milliseconds:2000,draws:hiddenEnd.draws-hiddenStart.draws,cycles:hiddenEnd.tick-hiddenStart.tick};
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});
 await page.waitForFunction(n=>window.__flowgarden.renderMetrics.visible&&window.__flowgarden.renderMetrics.draws>n,hiddenEnd.draws);
 checks.push('A synthetic hidden signal suppresses paint, not native progression; restoring visibility paints the latest received state');
 await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.paused);await settle();
 const pausedStart=await state();assert.equal(pausedStart.motionTime,pausedStart.tick);await page.waitForTimeout(1000);assert.equal((await state()).draws,pausedStart.draws);
 checks.push('Pausing reaches the exact native endpoint before the canvas sleeps');
 await page.locator('#menu-open').click();await page.locator('#examples-open').click();await page.locator('[data-scenario="6"]').click();
 await page.waitForFunction(()=>!document.querySelector('#city-confirm').disabled);await page.locator('#city-confirm').click();
 await page.waitForFunction(()=>window.__flowgarden.stats.population===2048&&window.__flowgarden.menuPage==='home');await page.locator('#continue').click();await page.locator('#fit').click();await settle();
 const largeStart=await state();await page.waitForTimeout(1000);const largeEnd=await state();assert.equal(largeEnd.draws,largeStart.draws);
 samples.commuterIdle={population:2048,milliseconds:1000,draws:largeEnd.draws-largeStart.draws};
 await page.screenshot({path:'evidence/demand-render-commuter.png'});
 await page.setViewportSize({width:390,height:844});await page.locator('#fit').click();await settle();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'evidence/demand-render-portrait.png'});
 checks.push('The 2,048-resident example also sleeps when paused and repaints for a portrait resize');
 assert.deepEqual(errors,[]);
 const result={passed:true,session_artifact:JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||'.build/selection.json')).artifact_sha256,http_artifact:JSON.parse(fs.readFileSync(process.env.HTTP_CITY_SELECTION||'.build/web-selection.json')).artifact_sha256,checks,samples,errors};
 fs.writeFileSync('evidence/demand-render-ui.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{await browser.close()}
