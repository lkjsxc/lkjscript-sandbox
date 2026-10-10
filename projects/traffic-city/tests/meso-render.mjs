// Display-only preview of a real native aggregate snapshot. No city rules run in
// this browser, and paint timings must not be reported as live-game/network FPS.
import fs from 'node:fs';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const snapshot=JSON.parse(fs.readFileSync('evidence/meso-snapshot.json','utf8'));assert.equal(snapshot.stats.population,100000);
const template=fs.readFileSync('experiments/meso-preview.html','utf8');const html=template.replace('__NATIVE_SNAPSHOT__',JSON.stringify(snapshot).replaceAll('<','\\u003c'));fs.writeFileSync('evidence/meso-preview.html',html);
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const errors=[],samples=[];let page;
const quantile=(a,p)=>[...a].sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(a.length*p))];
try{
 page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));await page.setContent(html);await page.waitForFunction(()=>window.__mesoPreview?.metrics.drawCalls>30);assert.equal(await page.locator('#population').textContent(),'100,000');
 for(const [name,scale]of[['region',5],['districts',12],['street',28]]){
  await page.evaluate(scale=>{const p=window.__mesoPreview;p.camera.scale=scale;p.request()},scale);await page.waitForTimeout(1000);
  const measurement=await page.evaluate(()=>{const p=window.__mesoPreview;p.setActive(false);const original=window.requestAnimationFrame;window.requestAnimationFrame=()=>0;const times=[];try{for(let i=0;i<180;i++){const start=performance.now();p.draw(performance.now());times.push(performance.now()-start)}}finally{window.requestAnimationFrame=original}return{metrics:p.metrics,times}});
  assert(measurement.metrics.shown<=[256,640,1536][measurement.metrics.level]);assert(measurement.times.every(x=>Number.isFinite(x)&&x>=0));
  const before=measurement.metrics.rasterBuilds;await page.evaluate(()=>{window.__mesoPreview.camera.x+=2;window.__mesoPreview.request()});await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>window.__mesoPreview.metrics)).rasterBuilds,before);
  samples.push({name,level:measurement.metrics.level,markers:measurement.metrics.shown,median_paint_ms:quantile(measurement.times,.5),p95_paint_ms:quantile(measurement.times,.95),raster_bytes:measurement.metrics.rasterBytes,pan_cache_reused:true});
  await page.screenshot({path:'evidence/meso-'+name+'.png'});await page.evaluate(()=>window.__mesoPreview.setActive(true));
 }
 await page.evaluate(()=>window.__mesoPreview.setActive(false));await page.waitForTimeout(100);const before=await page.evaluate(()=>window.__mesoPreview.metrics.drawCalls);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>window.__mesoPreview.metrics.drawCalls),before);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'evidence/meso-mobile.png'});assert.deepEqual(errors,[]);
 const report={passed:true,population:snapshot.stats.population,cohorts:snapshot.stats.groups,snapshot_tick:snapshot.stats.tick,method:'Headless Chromium software/browser paint of a precomputed native snapshot, 180 warmed draws per zoom. Not a live game or physical-device FPS claim.',samples,paused_animation_stopped:true,mobile_emulation_no_horizontal_overflow:true,errors};fs.writeFileSync('evidence/meso-render.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
