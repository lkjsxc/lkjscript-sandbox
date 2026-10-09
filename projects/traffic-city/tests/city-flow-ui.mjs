import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectTool,districtPoint} from './ui-driver.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--no-sandbox']});
const errors=[],checks=[];let page;
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 // Introduce transport latency only. Every acknowledgement still comes from native code.
 await context.addInitScript(()=>{window.__testSockets=[];window.__testTransmitted=[];const original=WebSocket.prototype.send;WebSocket.prototype.send=function(data){if(!window.__testSockets.includes(this))window.__testSockets.push(this);if(window.__testHold)return;setTimeout(()=>{if(this.readyState===WebSocket.OPEN){window.__testTransmitted.push(JSON.parse(data));original.call(this,data)}},150)}});
 page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.PREVIEW_URL);await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);
 const state=()=>page.evaluate(()=>({stats:window.__flowgarden.stats,rails:window.__flowgarden.rails}));
 const initial=await state();assert(initial.stats.paused);
 async function drag(x,y,x2,y2){const a=await districtPoint(page,x,y),b=await districtPoint(page,x2,y2);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:2});await page.mouse.up()}
 async function openLines(){if(!await page.locator('#rail-palette').isVisible())await page.getByRole('button',{name:'Build railway',exact:true}).click();await page.locator('#lines-open').click()}
 async function tap(x,y){const p=await districtPoint(page,x,y);await page.mouse.click(p.x,p.y)}
 await selectTool(page,1);
 for(let y=7;y<=9;y++)await drag(9,y,11,y);
 await page.waitForFunction(v=>window.__flowgarden.stats.version===v+3,initial.stats.version);
 const built=await state();assert.equal(built.stats.cash,initial.stats.cash-72);
 const strokes=await page.evaluate(()=>window.__flowgarden.sentCommands.filter(c=>c.op==='build'));
 assert.equal(strokes.length,3);assert.deepEqual(strokes.map(c=>[c.x,c.y,c.x2,c.y2]),[7,8,9].map(y=>[59,54+y,61,54+y]));
 await page.waitForFunction(()=>window.__flowgarden.pendingCommands.length===0);
 checks.push('Three real pointer strokes under transport latency reach native code once, in order, with their released endpoints intact.');
 await page.locator('#play').click();await page.waitForFunction(()=>!window.__flowgarden.stats.paused);
 await page.locator('#menu-open').click();const tick=(await state()).stats.tick;
 await page.waitForFunction(t=>window.__flowgarden.stats.tick>=t+2,tick);assert.equal((await state()).stats.paused,false);
 await page.locator('#continue').click();
 await selectTool(page,0);await drag(9,7,11,9);await page.waitForFunction(()=>document.querySelector('#removal').open);
 assert.equal((await state()).stats.paused,false);const reviewTick=(await state()).stats.tick;
 await page.waitForFunction(t=>window.__flowgarden.stats.tick>t,reviewTick);
 await page.locator('#remove-confirm').click();await page.waitForFunction(v=>window.__flowgarden.stats.version===v+1,built.stats.version);
 assert.equal((await state()).stats.paused,false);assert.equal((await state()).stats.tiles,initial.stats.tiles);
 checks.push('Menu and demolition review leave traffic running; confirmation removes the reviewed tiles against current native state.');
 await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.paused);
 await selectTool(page,8);const beforeTrack=(await state()).stats.version;await drag(6,11,22,11);await page.waitForFunction(v=>window.__flowgarden.stats.version>v,beforeTrack);
 await selectTool(page,9);for(const x of [6,7,22]){const v=(await state()).stats.version;await tap(x,11);await page.waitForFunction(v=>window.__flowgarden.stats.version>v,v)}
 await selectTool(page,10);await tap(6,11);await tap(22,11);await page.waitForFunction(()=>window.__flowgarden.rails.length===1);
 await page.locator('#inspect-close').click();await page.locator('#play').click();await page.waitForFunction(()=>!window.__flowgarden.stats.paused);
 await openLines();await page.locator('#line-stop-select').selectOption(String(57+65*128));await page.locator('#line-add-existing').click();
 await page.waitForFunction(()=>window.__flowgarden.rails[0].stops.length===3);assert.equal((await state()).stats.paused,false);
 assert.deepEqual((await state()).rails[0].stops,[56,57,72].map(x=>x+65*128));
 await page.locator('#line-toggle').click();await page.waitForFunction(()=>window.__flowgarden.rails[0].enabled&&window.__flowgarden.rails[0].departures>0);
 await page.locator('#line-toggle').click();await page.waitForFunction(()=>!window.__flowgarden.rails[0].enabled);
 assert.equal((await state()).stats.paused,false);await page.screenshot({path:'evidence/city-flow-lines.png'});
 checks.push('The line panel inserts an ordered stop while the city runs, starts native departures, and requests a line-only stop.');
 await page.locator('#lines-close').click();await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.paused);
 await page.locator('#finance-open').click();assert.match(await page.locator('#finance-details').textContent(),/Municipal balance/);await page.locator('[data-close="finance"]').click();
 await page.locator('#menu-open').click();await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent==='City saved.');
 const saved=await state();await page.reload();await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);assert.deepEqual(await state(),saved);
 await page.setViewportSize({width:390,height:844});await openLines();assert(await page.locator('#line-toggle').isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'evidence/city-flow-lines-mobile.png'});
 checks.push('Native city and rail state persist on reload; the line panel remains usable at 390px.');
 await page.locator('#lines-close').click();await page.setViewportSize({width:1440,height:1000});await page.locator('#fit').click();
 await page.waitForFunction(()=>window.__flowgarden.pendingCommands.length===0);const beforeDrop=await state();
 await page.evaluate(()=>{window.__testHold=true});await selectTool(page,1);await drag(9,8,11,8);
 await page.evaluate(()=>{window.__testHold=false;window.__testSockets.at(-1).close(1000,'test disconnect before held transmission')});
 await page.waitForFunction(()=>window.__testSockets.length>=2&&window.__flowgarden.sessionStatus===1&&window.__flowgarden.pendingCommands.length===0);
 assert.deepEqual(await state(),beforeDrop);assert.equal(await page.evaluate(()=>window.__testTransmitted.filter(c=>c.action.op==='build').length),0);
 checks.push('A queued stroke interrupted before transmission is reported and never replayed or charged after reconnection.');assert.deepEqual(errors,[]);
 fs.writeFileSync('evidence/city-flow-ui.json',JSON.stringify({passed:true,artifact_sha256:JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||'.build/selection.json')).artifact_sha256,checks,errors},null,2)+'\n');console.log(checks);
} catch(error){if(page){await page.screenshot({path:'evidence/city-flow-ui-failure.png'}).catch(()=>{});console.error(await page.evaluate(()=>({stats:window.__flowgarden?.stats,notice:document.querySelector('#notice')?.textContent,commands:window.__flowgarden?.pendingCommands})).catch(()=>null))}throw error}finally{await browser.close()}
