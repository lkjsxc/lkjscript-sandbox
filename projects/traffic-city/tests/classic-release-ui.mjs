// Use a disposable browser context. PREVIEW_URL may select an explicitly
// authorized public deployment; no existing browser keys are read or exported.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {selectTool,districtPoint,waitTile} from './ui-driver.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--no-sandbox']});
const errors=[],httpFailures=[],socketErrors=[],checks=[];
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(180000);
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)httpFailures.push({path:new URL(r.url()).pathname,status:r.status()})});page.on('websocket',s=>s.on('socketerror',e=>socketErrors.push(String(e))));
 const response=await page.goto(process.env.PREVIEW_URL);assert.equal(response.status(),200);assert(!new URL(page.url()).pathname.startsWith('/metropolis'));
 await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1&&window.__flowgarden.renderMetrics.draws>0);
 assert.equal(await page.evaluate(()=>!!window.__metropolis),false);
 await page.locator('#fit').click();await selectTool(page,6);let p=await districtPoint(page,7,11);await page.mouse.click(p.x,p.y);await waitTile(page,7,11,6);
 await page.locator('#menu-open').click();await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent==='City saved.');
 const saved=await page.evaluate(()=>window.__flowgarden.stats);await page.waitForTimeout(700);await page.reload();await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);await waitTile(page,7,11,6);assert.deepEqual(await page.evaluate(()=>window.__flowgarden.stats),saved);checks.push('Classic canvas, real park construction, native save acknowledgement and exact saved-city reload.');
 await page.locator('#menu-open').click();await page.locator('#examples-open').click();await page.locator('[data-scenario="4"]').click();await page.waitForFunction(()=>!document.querySelector('#city-confirm').disabled);await page.locator('#city-confirm').click();await page.waitForFunction(()=>window.__flowgarden.stats.population===1024&&window.__flowgarden.menuPage==='home');await page.locator('#continue').click();await page.locator('#fit').click();await page.locator('#play').click();
 await page.waitForFunction(()=>{const g=window.__flowgarden;return g.stats.tick>=32&&g.renderedActors.some(a=>a.mode===2)&&g.renderedActors.some(a=>a.mode!==2)&&g.rails.some(l=>l.status===1)},null,{timeout:240000});
 const first=await page.evaluate(()=>({actors:window.__flowgarden.renderedActors,rails:window.__flowgarden.rails}));
 await page.waitForFunction(first=>{const g=window.__flowgarden;return [true,false].every(car=>g.renderedActors.some(a=>(a.mode===2)===car&&first.actors.some(b=>b.id===a.id&&Math.hypot(a.x-b.x,a.y-b.y)>.01)))&&g.rails.some(l=>first.rails.some(b=>b.id===l.id&&(b.elapsed!==l.elapsed||b.from!==l.from)))},first);
 await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.paused);await page.waitForTimeout(800);
 const glyph=await page.evaluate(()=>{const g=window.__flowgarden,c=document.querySelector('#map'),ctx=c.getContext('2d'),ratio=c.width/innerWidth;let dots=0;for(const a of g.renderedActors.filter(a=>a.mode!==2)){const p=g.worldToScreen(a.x,a.y);if(p.x<5||p.y<180||p.x>innerWidth-5||p.y>innerHeight-240)continue;const bytes=ctx.getImageData(Math.floor(p.x*ratio)-4,Math.floor(p.y*ratio)-4,9,9).data;for(let i=0;i<bytes.length;i+=4)if([[70,105,87],[190,126,88],[130,111,153]].some(color=>color.every((v,k)=>Math.abs(v-bytes[i+k])<5))){dots++;break}}return dots});assert(glyph>0);checks.push('Real native walkers and cars change rendered positions; trains progress on their routes; pedestrian colors reach actual canvas pixels.');
 await page.screenshot({path:'evidence/classic-release-desktop.png'});await page.setViewportSize({width:390,height:844});await page.locator('#fit').click();await page.waitForTimeout(800);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#zoom-in').click();await selectTool(page,-2);await page.mouse.move(190,350);await page.mouse.down();await page.mouse.move(225,410,{steps:10});await page.mouse.up();await page.screenshot({path:'evidence/classic-release-mobile.png'});checks.push('Portrait layout, zoom and pan remain usable.');
 assert.deepEqual(errors,[]);assert.deepEqual(httpFailures,[]);assert.deepEqual(socketErrors,[]);
 const result={passed:true,path:new URL(page.url()).pathname,normalizedQuery:new URL(page.url()).search,checks,visiblePedestrianPixels:glyph,errors,httpFailures,socketErrors};fs.writeFileSync('evidence/classic-release-ui.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{await browser.close()}
