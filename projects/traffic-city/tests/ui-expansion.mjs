// Real browser input against disposable native HTTP and session processes.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectTool,districtPoint} from './ui-driver.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
let metroTiming;
const prefix=process.env.UI_EVIDENCE||'evidence/expansion-ui',checks=[],errors=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--no-sandbox']});
let activePage;
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 activePage=page;page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.PREVIEW_URL);await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);
 const state=()=>page.evaluate(()=>({stats:window.__flowgarden.stats,rails:window.__flowgarden.rails}));
 const initial=await state();assert(initial.stats.paused);
 async function drag(x,y,x2,y2,release=true){const a=await districtPoint(page,x,y),b=await districtPoint(page,x2,y2);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:12});if(release)await page.mouse.up();}
 async function tap(x,y){const p=await districtPoint(page,x,y);await page.mouse.click(p.x,p.y);}
 await selectTool(page,8);await drag(6,11,10,13,false);
 const across=await page.evaluate(()=>window.__flowgarden.trackPreview);assert.equal(across.length,7);
 assert(across.slice(0,5).every(p=>p.y===initial.stats.originY+11));assert(across.slice(4).every(p=>p.x===initial.stats.originX+10));
 await page.screenshot({path:prefix+'-track-preview.png'});await page.keyboard.press('Escape');await page.mouse.up();assert.deepEqual(await state(),initial);
 await selectTool(page,8);await page.locator('#rail-bend').click();await drag(6,11,10,13,false);
 const down=await page.evaluate(()=>window.__flowgarden.trackPreview);assert(down.slice(0,3).every(p=>p.x===initial.stats.originX+6));assert(down.slice(2).every(p=>p.y===initial.stats.originY+13));
 await page.keyboard.press('Escape');await page.mouse.up();
 checks.push('Both bend previews follow the orthogonal stroke; Escape spends no money and builds nothing.');
 await selectTool(page,8);await drag(6,11,22,11);await page.waitForFunction(v=>window.__flowgarden.stats.version>v,initial.stats.version);assert.equal((await state()).rails.length,0);
 await selectTool(page,9);for(const x of [6,7,22]){const v=(await state()).stats.version;await tap(x,11);await page.waitForFunction(v=>window.__flowgarden.stats.version>v,v);}
 await selectTool(page,10);await tap(6,11);assert(await page.evaluate(()=>!!window.__flowgarden.serviceStart));assert.match(await page.locator('#hint').textContent(),/tap the last station/);
 await page.screenshot({path:prefix+'-service-start.png'});await tap(22,11);await page.waitForFunction(()=>window.__flowgarden.rails.length===1&&!document.querySelector('#inspector').hidden);assert.equal((await state()).rails[0].enabled,false);
 await page.locator('[data-rail-stop="1"]').click();await tap(7,11);await page.waitForFunction(()=>window.__flowgarden.rails[0].stops.length===3);
 await selectTool(page,-2);await tap(6,11);await page.locator('[data-rail-service="1"]').click();await page.waitForFunction(()=>window.__flowgarden.rails[0].enabled);
 await page.locator('#inspect-close').click();await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.rails[0].departures>=3);
 await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.paused);assert.equal((await state()).stats.wealthError,0);
 await page.screenshot({path:prefix+'-three-stop-service.png'});checks.push('Track, three stations, service creation, intermediate-stop insertion and paid departures work through mouse input.');
 const custom=await state();
 async function examples(){await page.locator('#menu-open').click();await page.locator('#examples-open').click();}
 async function reviewSample(id){await page.locator(`[data-scenario="${id}"]`).click();await page.waitForFunction(()=>!document.querySelector('#city-confirm').disabled);}
 async function confirmPopulation(n){await page.locator('#city-confirm').click();await page.waitForFunction(n=>window.__flowgarden.stats.population===n&&window.__flowgarden.menuPage==='home',n);}
 await examples();await page.screenshot({path:prefix+'-examples.png'});await reviewSample(3);assert.equal(await page.evaluate(()=>document.activeElement.id),'city-cancel');
 await page.locator('#city-cancel').click();assert.equal(await page.evaluate(()=>window.__flowgarden.menuPage),'examples');assert.deepEqual(await state(),custom);
 await reviewSample(3);await confirmPopulation(512);await page.locator('#continue').click();await page.locator('#fit').click();assert.equal((await state()).rails.length,2);assert((await state()).rails.every(l=>l.stops.length===3&&l.path.length>20));
 await page.screenshot({path:prefix+'-metro-overview.png'});const liveStarted=performance.now();await page.locator('#play').click();
 await page.waitForFunction(()=>window.__flowgarden.stats.tick>=80&&window.__flowgarden.stats.railBoardings>0&&window.__flowgarden.stats.railCompleted>0,undefined,{timeout:240000});
 const moving=await state();await page.waitForFunction(t=>window.__flowgarden.stats.tick>t,moving.stats.tick,{timeout:10000});const later=await state();metroTiming={ticks:later.stats.tick,wall_ms:performance.now()-liveStarted};metroTiming.cycles_per_second=metroTiming.ticks/(metroTiming.wall_ms/1000);assert(later.stats.tick>moving.stats.tick);assert(later.stats.ecoWages>0);assert.equal(later.stats.wealthError,0);assert(later.rails.every(l=>l.occupancy<=l.capacity));
 await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.paused);await page.locator('#finance-open').click();assert.match(await page.locator('#finance-details').textContent(),/Municipal balance/);
 await page.screenshot({path:prefix+'-finances.png'});await page.locator('[data-close="finance"]').click();checks.push('512 residents run live with finite trains, completed rail journeys, wages and visible balanced finances.');
 await page.locator('#menu-open').click();await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent==='City saved.');
 const saved=await state();await page.reload();await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);assert.deepEqual(await state(),saved);
 for(const [id,n] of [[1,384],[2,256]]){await examples();await reviewSample(id);await confirmPopulation(n);assert.equal((await state()).stats.wealthError,0);await page.locator('#manage-open').click();await page.locator('#restore-city').click();await page.waitForFunction(()=>!document.querySelector('#city-confirm').disabled);await page.locator('#city-confirm').click();await page.waitForFunction(()=>window.__flowgarden.stats.population===512&&window.__flowgarden.menuPage==='home');assert.deepEqual(await state(),saved);await page.locator('#continue').click();}
 await page.locator('#menu-open').click();await page.locator('#manage-open').click();await page.locator('#new-city').click();await page.waitForFunction(()=>!document.querySelector('#city-confirm').disabled);await confirmPopulation(32);
 await page.locator('#manage-open').click();await page.locator('#restore-city').click();await page.waitForFunction(()=>!document.querySelector('#city-confirm').disabled);await page.locator('#city-confirm').click();await page.waitForFunction(()=>window.__flowgarden.stats.population===512);assert.deepEqual(await state(),saved);
 checks.push('Sample cancel, all sample loads, save, reload, reset and one-level restore retain exact paused city and train state.');
 const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),phone=await mobile.newPage();phone.setDefaultTimeout(60000);phone.on('pageerror',e=>errors.push(e.message));
 await phone.goto(process.env.PREVIEW_URL);await phone.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);await phone.locator('#menu-open').tap();await phone.locator('#examples-open').tap();assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await phone.screenshot({path:prefix+'-mobile-examples.png'});
 await phone.locator('[data-scenario="2"]').tap();await phone.waitForFunction(()=>!document.querySelector('#city-confirm').disabled);await phone.locator('#city-confirm').tap();await phone.waitForFunction(()=>window.__flowgarden.stats.population===256);await phone.locator('#continue').tap();await phone.locator('#fit').tap();await phone.screenshot({path:prefix+'-mobile-city.png'});await phone.locator('#finance-open').tap();assert(await phone.locator('#finance-title').isVisible());
 checks.push('390×844 touch emulation: samples, confirmation, map and finances work without horizontal overflow; no physical-device claim.');assert.deepEqual(errors,[]);
 const report={passed:true,artifact_sha256:JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||'.build/selection.json')).artifact_sha256,checks,errors,metroTiming,metro:saved.stats,emulation:{browser:'Chromium',viewport:[390,844],touch:true,physical_device:false}};
 fs.writeFileSync(prefix+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){if(activePage){await activePage.screenshot({path:prefix+'-failure.png'}).catch(()=>{});const state=await activePage.evaluate(()=>({stats:window.__flowgarden?.stats,rails:window.__flowgarden?.rails,status:window.__flowgarden?.sessionStatus,notice:document.querySelector('#notice')?.textContent})).catch(()=>null);fs.writeFileSync(prefix+'-failure.json',JSON.stringify({error:String(error),state,errors},null,2));console.error(JSON.stringify(state,null,2));}throw error;}finally{await browser.close();}
