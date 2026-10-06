// Real native idle/lifetime closures with shortened isolated test descriptors.
// The deployed limits, browser reconnect code and simulation are unchanged.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {selectTool,districtPoint,waitTile} from './ui-driver.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const prefix=process.env.RECONNECT_EVIDENCE||'evidence/reconnect-ui';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM||undefined,headless:true,args:['--no-sandbox']});
const errors=[],connections=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(90000);if(process.env.RECONNECT_SOURCE==='working-tree')await page.route('**/app.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('web/app.js','utf8')}));if(process.env.RECONNECT_ACCELERATE==='1')await page.addInitScript(()=>{const interval=window.setInterval.bind(window),timeout=window.setTimeout.bind(window);window.setInterval=(fn,delay,...args)=>interval(fn,delay===60000?500:delay,...args);window.setTimeout=(fn,delay,...args)=>timeout(fn,delay===25*60*1000?2200:delay,...args)});page.on('pageerror',e=>errors.push(e.message));
 page.on('websocket',socket=>{const entry={open_ms:performance.now(),frames:[]};connections.push(entry);socket.on('framereceived',event=>{try{const f=JSON.parse(String(event.payload));if(f.status===1)entry.frames.push({tick:f.stats.tick,cash:f.stats.cash,population:f.stats.population,paused:f.stats.paused,version:f.stats.version});}catch{}});socket.on('close',()=>entry.closed_ms=performance.now());});
 await page.goto(process.env.PREVIEW_URL);await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);
 await selectTool(page,6);const p=await districtPoint(page,12,11);await page.mouse.click(p.x,p.y);await waitTile(page,12,11,6);await selectTool(page,-2);await page.locator('#play').click();await page.waitForFunction(()=>!window.__flowgarden.stats.paused);
 const started=await page.evaluate(()=>window.__flowgarden.stats);
 await page.waitForFunction(t=>window.__flowgarden?.sessionStatus===1&&window.__flowgarden.stats.tick>=t+18,started.tick,{timeout:Number(process.env.RECONNECT_WAIT_MS||90000)});
 assert(connections.length>=3,'The native bounds must force at least two real reconnects');
 await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.paused);await waitTile(page,12,11,6);
 const current=await page.evaluate(()=>window.__flowgarden.stats);assert.equal(current.population,32);assert.equal(current.version,started.version);assert(current.cash>=started.cash);
 const all=connections.flatMap(c=>c.frames).filter(f=>f.version===started.version);
 for(let i=1;i<all.length;i++){assert(all[i].tick>=all[i-1].tick,'Graceful bound/reconnect must not rewind delivered simulation');assert.equal(all[i].population,32);assert(all[i].cash>=all[i-1].cash);}
 for(let i=1;i<connections.length;i++){const before=connections[i-1].frames.at(-1),after=connections[i].frames[0];if(before&&after){assert(after.tick>=before.tick);assert.equal(after.version,before.version);assert.equal(after.paused,before.paused);}}
 await page.screenshot({path:prefix+'.png'});assert.deepEqual(errors,[]);
 const report={passed:true,renderer:process.env.RECONNECT_SOURCE==='working-tree'?'working-tree JS override':'native-embedded browser JS',test_only_browser_timers_accelerated:process.env.RECONNECT_ACCELERATE==='1',artifact_sha256:JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||'.build/selection.json')).artifact_sha256,isolated_limits:{idle_ms:Number(process.env.PREVIEW_IDLE_MS||300000),lifetime_ms:Number(process.env.PREVIEW_LIFETIME_MS||1800000)},checks:['native WebSockets are renewed at least twice under shortened isolated bounds','browser automatically reconnects and continues the same running city','delivered ticks and funds never rewind, population and paid construction persist','each new session restores the running or paused state seen before its predecessor closed'],started,after:current,connections:connections.map(c=>({open_ms:c.open_ms,closed_ms:c.closed_ms,first:c.frames[0],last:c.frames.at(-1),frames:c.frames.length})),errors};fs.writeFileSync(prefix+'.json',JSON.stringify(report,null,2));console.log(report);
}catch(error){fs.writeFileSync(prefix+'-attempt.json',JSON.stringify({passed:false,error:String(error),connections},null,2));throw error;}finally{await browser.close();}
