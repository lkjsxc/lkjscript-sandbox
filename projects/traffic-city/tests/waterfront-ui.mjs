// Visible browser controls only, against with-preview's disposable native host.
import {createRequire} from 'node:module';import assert from 'node:assert/strict';import fs from 'node:fs';
import {selectTool,districtPoint} from './ui-driver.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--no-sandbox']}),checks=[],errors=[];let page;
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.PREVIEW_URL);await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);
 const state=()=>page.evaluate(()=>({stats:window.__flowgarden.stats,rails:window.__flowgarden.rails,river:window.__flowgarden.river,width:window.__flowgarden.riverWidth}));
 let s=await state();assert.equal(s.width,6);assert.equal(s.river.length,129);
 await selectTool(page,1);const a=await districtPoint(page,11,8),b=await districtPoint(page,18,8);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:10});
 const quote=await page.evaluate(()=>window.__flowgarden.surfaceQuote({x:61,y:62},{x:68,y:62},1));assert.equal(quote.cost,208);assert.equal(quote.water,6);assert.equal(Boolean(quote.invalid),false);
 await page.screenshot({path:'evidence/waterfront-bridge-preview.png'});await page.mouse.up();await page.waitForFunction(v=>window.__flowgarden.stats.version>v,s.stats.version);let next=await state();assert.equal(s.stats.cash-next.stats.cash,208);
 const partialA=await districtPoint(page,11,9),partialB=await districtPoint(page,15,9);await page.mouse.move(partialA.x,partialA.y);await page.mouse.down();await page.mouse.move(partialB.x,partialB.y,{steps:10});await page.mouse.up();await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('both ends'));
 assert.deepEqual(await state(),next);checks.push('Visible bridge preview quotes six water tiles; pointer release builds the complete bridge; an unfinished crossing changes nothing.');
 await selectTool(page,-2);await page.screenshot({path:'evidence/waterfront-initial.png'});
 await page.locator('#menu-open').click();await page.locator('#examples-open').click();assert.equal(await page.locator('[data-scenario]').count(),5);await page.locator('[data-scenario="4"]').click();await page.waitForFunction(()=>!document.querySelector('#city-confirm').disabled);await page.locator('#city-confirm').click();
 await page.waitForFunction(()=>window.__flowgarden.stats.population===1024&&window.__flowgarden.menuPage==='home',null,{timeout:120000});await page.locator('#continue').click();await page.locator('#fit').click();
 s=await state();assert.equal(s.width,6);assert.equal(s.rails.length,4);assert(s.rails.every(l=>l.stops.length===4));await page.screenshot({path:'evidence/waterfront-boroughs-overview.png'});
 checks.push('The fourth example opens through the menu with 1,024 residents and four four-stop services.');
 const began=performance.now();await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.tick>=8,null,{timeout:240000});await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.paused);const moving=await state();assert.equal(moving.stats.wealthError,0);assert(moving.stats.requested>0);
 const timing={tick:moving.stats.tick,wall_ms:performance.now()-began};await page.screenshot({path:'evidence/waterfront-boroughs-traffic.png'});
 // Zoom into a real neighbourhood. Arrow-key movement and pointer-anchored zoom
 // remain normal UI input, not camera state writes from the test harness.
 const p=await page.evaluate(()=>window.__flowgarden.worldToScreen(52,51));await page.mouse.move(p.x,p.y);await page.mouse.wheel(0,-650);await page.waitForTimeout(1000);await page.screenshot({path:'evidence/waterfront-boroughs-detail.png'});
 await page.locator('#menu-open').click();await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent==='City saved.');const saved=await state();await page.reload();await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);assert.deepEqual(await state(),saved);
 checks.push('Large-city live start/pause executes eight or more native cycles with balanced accounts; explicit save and browser reload preserve exact native stats, trains and river geometry.');
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),phone=await mobile.newPage();phone.setDefaultTimeout(90000);phone.on('pageerror',e=>errors.push(e.message));await phone.goto(process.env.PREVIEW_URL);await phone.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);
 await phone.locator('#menu-open').tap();await phone.locator('#examples-open').tap();await phone.locator('[data-scenario="4"]').tap();await phone.waitForFunction(()=>!document.querySelector('#city-confirm').disabled);await phone.locator('#city-confirm').tap();await phone.waitForFunction(()=>window.__flowgarden.stats.population===1024);await phone.locator('#continue').tap();await phone.locator('#fit').tap();assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await phone.screenshot({path:'evidence/waterfront-mobile-overview.png'});
 checks.push('390×844 touch emulation loads and frames the new city without horizontal document overflow.');assert.deepEqual(errors,[]);
 fs.writeFileSync('evidence/waterfront-ui.json',JSON.stringify({passed:true,artifact_sha256:JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||'.build/selection.json')).artifact_sha256,checks,errors,timing,long_run_rail_coverage:"tests/waterfront.mjs separately executes 128 native cycles and requires boardings and completed rail journeys.",stats:moving.stats,physical_device:false},null,2));console.log({passed:true,checks,timing});
}catch(error){if(page){await page.screenshot({path:'evidence/waterfront-ui-failure.png'}).catch(()=>{});console.error(await page.evaluate(()=>({stats:window.__flowgarden?.stats,notice:document.querySelector('#notice')?.textContent})).catch(()=>null))}throw error}finally{await browser.close()}
