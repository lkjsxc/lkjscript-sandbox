// Compare the old embedded renderer and current source against one saved native
// city. The browser override changes presentation only, never city state.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--no-sandbox']});
const errors=[],reports=[];
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(180000);page.on('pageerror',e=>errors.push(e.message));
 let changed=false;
 for(const file of ['app.js','motion.js'])await page.route('**/'+file,r=>changed?r.fulfill({contentType:'text/javascript',body:fs.readFileSync('web/'+file)}):r.continue());
 await page.goto(process.env.PREVIEW_URL);await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);
 await page.locator('#menu-open').click();await page.locator('#examples-open').click();await page.locator('[data-scenario="3"]').click();await page.waitForFunction(()=>!document.querySelector('#city-confirm').disabled);await page.locator('#city-confirm').click();await page.waitForFunction(()=>window.__flowgarden.stats.population===512&&window.__flowgarden.menuPage==='home');await page.locator('#continue').click();await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.tick>=20);await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.paused);await page.locator('#menu-open').click();await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent==='City saved.');await page.locator('#continue').click();await page.waitForTimeout(800);
 const saved=await page.evaluate(()=>window.__flowgarden.stats),baseline=new Map();
 async function capture(name){
  await page.waitForTimeout(1000);
  const value=await page.evaluate(()=>{const c=document.querySelector('#map'),bytes=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return {pixels:btoa(text),camera:window.__flowgarden.camera,stats:window.__flowgarden.stats}});
  await page.screenshot({path:`evidence/atmosphere-${changed?'after':'before'}-${name}.png`});
  assert.deepEqual(value.stats,saved);
  const pixels=Buffer.from(value.pixels,'base64');
  if(!changed)baseline.set(name,{pixels,camera:value.camera});else{
   const old=baseline.get(name);assert.deepEqual(value.camera,old.camera);assert.equal(pixels.length,old.pixels.length);let changedPixels=0,maxDifference=0;
   for(let i=0;i<pixels.length;i+=4){let d=0;for(let k=0;k<4;k++)d=Math.max(d,Math.abs(pixels[i+k]-old.pixels[i+k]));if(d>0)changedPixels++;maxDifference=Math.max(maxDifference,d)}
   const fraction=changedPixels/(pixels.length/4);reports.push({name,changedPixels,fraction,maxDifference});assert(fraction<.002,'Static raster compositing must preserve the scene');
  }
 }
 for(const after of [false,true]){
  changed=after;if(after){await page.reload();await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1)}
  await page.setViewportSize({width:1440,height:1000});await page.locator('#fit').click();await capture('fit');
  for(let i=0;i<4;i++)await page.locator('#zoom-in').click();await capture('detail');
  await page.setViewportSize({width:390,height:844});await page.locator('#fit').click();await capture('portrait');
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('evidence/render-equivalence.json',JSON.stringify({passed:true,method:'Old native-embedded assets versus explicit working-tree app/motion overrides, same paused saved Willow Metro, full canvas RGBA comparison',reports,errors},null,2));console.log(reports);
}finally{await browser.close()}
