// Native-observed wait categories, ordinary visible controls and a fresh profile.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined,args:['--no-sandbox']});
const errors=[],checks=[];let page;
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.PREVIEW_URL);await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);
 await page.locator('#menu-open').click();await page.locator('#examples-open').click();await page.locator('[data-scenario="4"]').click();
 await page.waitForFunction(()=>!document.querySelector('#city-confirm').disabled);await page.locator('#city-confirm').click();
 await page.waitForFunction(()=>window.__flowgarden.stats.population===1024&&window.__flowgarden.menuPage==='home');await page.locator('#continue').click();
 await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.tick>=16,null,{timeout:180000});await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.paused);
 const stats=await page.evaluate(()=>window.__flowgarden.stats);
 assert(Number.isInteger(stats.planning));assert(Number.isInteger(stats.planningLong));assert(stats.planning>0);assert(stats.planningLong>0);assert(stats.planningLong<=stats.planning);assert(stats.planningLong<=stats.waiting);
 await page.locator('#queue-stat').click();await page.waitForFunction(()=>document.querySelector('#goal').open);
 for(const [id,n]of [['wait-total',stats.waiting],['wait-planning',stats.planningLong],['wait-other',stats.waiting-stats.planningLong],['planning-total',stats.planning]])assert.equal(await page.locator('#'+id).textContent(),n.toLocaleString('en-US'));
 assert.match(await page.locator('#goal').textContent(),/not a road queue/);assert.match(await page.locator('#queue-stat').getAttribute('title'),/computing routes/);
 await page.screenshot({path:'evidence/planning-desktop.png'});
 checks.push('The visible long-wait breakdown exactly matches native total, long-planning, other-long and all-planning counts.');
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const box=await page.locator('#goal').boundingBox();assert(box.x>=0&&box.x+box.width<=390);assert(box.height<=844);
 await page.locator('[data-close="goal"]').click();await page.locator('#queue-stat').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#goal').open);await page.screenshot({path:'evidence/planning-mobile.png'});
 checks.push('The breakdown fits a 390×844 viewport and opens with keyboard activation; all counts are text, not color-only.');
 await page.locator('[data-close="goal"]').click();await page.locator('#menu-open').click();await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent==='City saved.');
 const saved=await page.evaluate(()=>window.__flowgarden.stats);await page.reload();await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);assert.deepEqual(await page.evaluate(()=>window.__flowgarden.stats),saved);
 checks.push('A native save and browser reload preserve the city and reproduce the same derived wait counts without a save-format change.');
 assert.deepEqual(errors,[]);
 const report={passed:true,artifact_sha256:JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||'.build/selection.json')).artifact_sha256,checks,stats,errors,physical_device:false};
 fs.writeFileSync('evidence/planning-ui.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} catch(error){if(page)await page.screenshot({path:'evidence/planning-ui-failure.png'}).catch(()=>{});throw error}finally{await browser.close()}
