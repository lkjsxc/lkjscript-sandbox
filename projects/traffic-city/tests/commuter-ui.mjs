// Normal visible controls in an isolated native HTTP + WebSocket preview.
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--no-sandbox']});
const errors=[],checks=[];let page;
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.PREVIEW_URL);await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);
 await page.locator('#menu-open').click();await page.locator('#examples-open').click();assert.equal(await page.locator('[data-scenario]').count(),6);
 await page.locator('[data-scenario="6"]').click();await page.waitForFunction(()=>!document.querySelector('#city-confirm').disabled);assert((await page.locator('#confirm-title').textContent()).includes('Commuter Boroughs'));await page.locator('#city-confirm').click();
 await page.waitForFunction(()=>window.__flowgarden.stats.population===2048&&window.__flowgarden.menuPage==='home');await page.locator('#continue').click();await page.locator('#fit').click();
 const snapshot=()=>page.evaluate(()=>({stats:window.__flowgarden.stats,rails:window.__flowgarden.rails,river:window.__flowgarden.river,width:window.__flowgarden.riverWidth}));
 let before=await snapshot();assert.equal(before.rails.length,4);assert(before.rails.every(l=>l.stops.length===4));assert.equal(before.stats.wealthError,0);await page.screenshot({path:'evidence/commuter-overview.png'});
 checks.push('Six-choice menu and explicit review load the 2,048-person region, frame all 16 districts, and show four four-stop services.');
 await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.tick>=16,null,{timeout:240000});await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.paused);before=await snapshot();assert.equal(before.stats.wealthError,0);assert(before.stats.requested>0);await page.screenshot({path:'evidence/commuter-running.png'});
 await page.locator('#menu-open').click();await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent==='City saved.');const saved=await snapshot();await page.reload();await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);assert.deepEqual(await snapshot(),saved);
 checks.push('Visible start, pause, explicit save and browser reload preserve the large native city and its actual traffic state.');
 await page.setViewportSize({width:390,height:844});await page.locator('#menu-open').click();await page.locator('#examples-open').click();await page.locator('[data-scenario="6"]').scrollIntoViewIfNeeded();assert(await page.locator('[data-scenario="6"]').isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'evidence/commuter-mobile-menu.png'});
 checks.push('The sixth example remains reachable in a 390×844 viewport without horizontal overflow; this is browser emulation, not a physical-device claim.');assert.deepEqual(errors,[]);
 fs.writeFileSync('evidence/commuter-ui.json',JSON.stringify({passed:true,artifact_sha256:JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||'.build/selection.json')).artifact_sha256,checks,errors,stats:before.stats,physical_device:false},null,2)+'\n');console.log({passed:true,checks,stats:before.stats});
}catch(error){if(page){await page.screenshot({path:'evidence/commuter-ui-failure.png'}).catch(()=>{});console.error(await page.evaluate(()=>({stats:window.__flowgarden?.stats,notice:document.querySelector('#notice')?.textContent})).catch(()=>null));}throw error;}finally{await browser.close();}
