// Fresh city, isolated native HTTP/WebSocket processes via with-preview.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const url=process.env.PREVIEW_URL;
if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw Error('Smoke tests require an isolated loopback preview.');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM||undefined,headless:true});
const context=await browser.newContext({viewport:{width:1280,height:800}});
const page=await context.newPage();page.setDefaultTimeout(30000);
const errors=[],sockets=[];page.on('pageerror',e=>errors.push(e.message));page.on('websocket',s=>sockets.push(s.url()));
try{
 await page.goto(url);assert.equal(await page.title(),'Traffic City');
 await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);
 const state=()=>page.evaluate(()=>window.__flowgarden.stats);
 if(!(await state()).paused){await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.paused);}
 assert.equal((await state()).population,32);
 await page.locator('#menu-open').click();await page.locator('#save').click();
 await page.waitForFunction(()=>document.querySelector('#notice').textContent==='City saved.');
 const saved=await state();await page.reload();
 await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);assert.deepEqual(await state(),saved);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);assert(sockets.length>=2);assert(sockets.every(s=>new URL(s).hostname==='127.0.0.1'));
 await page.screenshot({path:'evidence/smoke-mobile.png'});
 fs.writeFileSync('evidence/smoke.json',JSON.stringify({passed:true,artifact_sha256:JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||'.build/selection.json')).artifact_sha256,checks:['native page and session','fresh 32-resident city','explicit save','exact saved-state reload','mobile layout','no browser errors','local WebSocket endpoints']},null,2)+'\n');
 console.log('PASS browser smoke: native page/session, persistence, reload, mobile layout');
}finally{await browser.close();}
