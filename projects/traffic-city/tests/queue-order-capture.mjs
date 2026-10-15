// Capture native updates from disposable cities; no real player keys or saves.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const scenario=Number(process.env.ORDER_SCENARIO||4),label=process.env.ORDER_LABEL||'before';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
const page=await context.newPage(),frames=[],errors=[];page.setDefaultTimeout(180000);
try{
 page.on('pageerror',e=>errors.push(e.message));
 page.on('websocket',s=>s.on('framereceived',e=>{const f=JSON.parse(e.payload);if(f.stats)frames.push({at:performance.now(),frame:f});}));
 await page.goto(process.env.PREVIEW_URL);await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);
 await page.locator('#menu-open').click();await page.locator('#examples-open').click();await page.locator(`[data-scenario="${scenario}"]`).click();
 await page.waitForFunction(()=>!document.querySelector('#city-confirm').disabled);await page.locator('#city-confirm').click();
 await page.waitForFunction(n=>window.__flowgarden.stats.population===[0,384,256,512,1024,2048,2048][n]&&window.__flowgarden.menuPage==='home',scenario);
 await page.locator('#continue').click();await page.locator('#fit').click();await page.locator('#play').click();
 await page.waitForFunction(()=>window.__flowgarden.stats.tick>=85);
 await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.paused);await page.waitForTimeout(800);
 const state=await page.evaluate(()=>({stats:window.__flowgarden.stats,actors:window.__flowgarden.renderedActors,metrics:window.__flowgarden.motionMetrics}));
 assert.deepEqual(errors,[]);await page.screenshot({path:`evidence/queue-order-${label}-${scenario}.png`});
 fs.writeFileSync(`evidence/queue-order-${label}-${scenario}.json`,JSON.stringify({scenario,frames,state,errors}));
 console.log({scenario,frames:frames.length,state,errors});
}finally{await browser.close()}
