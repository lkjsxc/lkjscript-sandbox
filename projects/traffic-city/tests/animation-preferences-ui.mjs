// Real native scene and rendered coordinates; fresh browser storage only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[],samples=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
 const ready=()=>page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);
 const open=async()=>{await page.locator('#menu-open').click();await page.locator('#preferences-open').click()};
 const close=async()=>{await page.locator('#menu-preferences [data-menu-back]').click();await page.locator('#continue').click()};
 await page.goto(process.env.PREVIEW_URL);await ready();
 for(const [raw,expected]of [['{"motion":true,"grid":true}','reduced'],['{"motion":false}','smooth'],['invalid','smooth'],['null','smooth']]){
  await page.evaluate(raw=>localStorage.setItem('traffic-city-preferences',raw),raw);await page.reload();await ready();await open();assert.equal(await page.locator('#animation-setting').inputValue(),expected);
  if(raw.includes('"grid":true'))assert(await page.locator('#grid-setting').isChecked());await close();
 }
 await open();assert.equal(await page.locator('#animation-setting').inputValue(),'smooth');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const bounds=await page.locator('#animation-setting').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=390);
 await page.screenshot({path:'evidence/animation-preferences-portrait.png'});await close();
 await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.tick>=12&&window.__flowgarden.renderedActors.length>10);
 async function measure(mode,system,select=true){
  await page.emulateMedia({reducedMotion:system});if(select){await open();await page.locator('#animation-setting').selectOption(mode);await close()}await page.waitForTimeout(1200);
  const sample=await page.evaluate(()=>new Promise(resolve=>{const g=window.__flowgarden,start={draws:g.renderMetrics.draws,seq:g.sequence,tick:g.stats.tick};let previous=g.renderedActors,moved=0,frames=0;const stop=performance.now()+2000;function frame(now){const poses=g.renderedActors;if(poses.some(a=>previous.some(b=>a.id===b.id&&Math.hypot(a.x-b.x,a.y-b.y)>1e-7)))moved++;frames++;previous=poses;if(now<stop)requestAnimationFrame(frame);else resolve({frames,moved,draws:g.renderMetrics.draws-start.draws,received:g.sequence-start.seq,cycles:g.stats.tick-start.tick,time:g.motionTime,tick:g.stats.tick})}requestAnimationFrame(frame)}));
  const reduced=mode==='reduced'||mode==='system'&&system==='reduce';assert(sample.cycles>0);
  if(reduced){assert(sample.draws<=sample.received+1);assert.equal(sample.time,sample.tick);assert(sample.moved<sample.frames*.2)}else{assert(sample.draws>sample.frames*.8);assert(sample.moved>sample.frames*.8)}
  samples.push({mode,system,...sample});
 }
 for(const pair of [['smooth','reduce'],['reduced','no-preference'],['reduced','reduce'],['system','reduce'],['system','no-preference'],['smooth','no-preference']])await measure(...pair);
 await measure('system','reduce');await measure('system','no-preference',false);await measure('system','reduce',false);
 await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.paused);
 for(const mode of ['smooth','reduced','system']){
  await open();await page.locator('#animation-setting').selectOption(mode);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('traffic-city-preferences')).animation),mode);await close();await page.reload();await ready();await open();assert.equal(await page.locator('#animation-setting').inputValue(),mode);await close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('evidence/animation-preferences-ui.json',JSON.stringify({passed:true,samples,errors},null,2));console.log(samples);
}finally{await browser.close()}
