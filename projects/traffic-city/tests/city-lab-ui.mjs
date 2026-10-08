// Only visible controls/pointer input against isolated native HTTP and WebSocket listeners.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {selectTool,districtPoint,waitTile} from './ui-driver.mjs';
const url=process.env.PREVIEW_URL;
assert(url&&['127.0.0.1','localhost'].includes(new URL(url).hostname));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM||undefined});
const errors=[],checks=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);
 const stats=()=>page.evaluate(()=>window.__flowgarden.stats);
 async function visibleEmptyLand(){
  for(let attempt=0;attempt<8;attempt++){
   const p=await page.evaluate(async()=>{const g=window.__flowgarden,{waterAt}=await import('/geometry.js'),used=new Set(g.cells.map(c=>c.id));
    for(let y=0;y<128;y++)for(let x=0;x<128;x++){const id=x+y*128;if(used.has(id)||waterAt(g.river,g.riverWidth,id))continue;const p=g.worldToScreen(x+.5,y+.5);if(p.x<12||p.x>innerWidth-12||p.y<12||p.y>innerHeight-12)continue;if(document.elementFromPoint(p.x,p.y)?.id==='map')return{...p,tileX:x,tileY:y};}return null;});
   if(p)return p;await page.locator('#map').focus();await page.keyboard.press('ArrowUp');await page.waitForTimeout(200);
  }throw Error('No exposed dry map cell found for the mobile construction gesture');
 }

 const original=await stats();
 async function openLab(){await page.locator('#menu-open').click();await page.locator('#lab-open').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'lab-intro-cancel');await page.locator('#lab-start').click();await page.waitForFunction(()=>window.__flowgarden.lab.phase===1);assert(!await page.locator('#menu').isVisible())}
 await openLab();assert(await page.locator('#play').isDisabled());assert.deepEqual(await stats(),original);
 await selectTool(page,4);let p=await districtPoint(page,6,9);await page.mouse.click(p.x,p.y);await waitTile(page,6,9,4);
 await page.waitForFunction(()=>window.__flowgarden.lab.planCost===140);const plan=await stats();await selectTool(page,-2);
 await page.screenshot({path:'evidence/city-lab-plan-desktop.png'});
 await page.locator('#lab-compare').click();await page.waitForFunction(()=>window.__flowgarden.lab.phase===2);assert.equal(await page.locator('#lab-compare').isVisible(),false);assert(await page.locator('button[data-palette=places]').isDisabled());assert(await page.locator('.dock [data-tool="8"]').isDisabled());
 await page.waitForFunction(()=>window.__flowgarden.lab.phase===4,undefined,{timeout:240000});await page.waitForFunction(()=>document.querySelector('#lab-results').open);
 assert.equal(await page.locator('#lab-comparison tr').count(),9);assert.match(await page.locator('#lab-result-context').textContent(),/140/);
 assert.equal(await page.evaluate(()=>window.__flowgarden.lab.realTick),original.tick);
 await page.screenshot({path:'evidence/city-lab-results-desktop.png'});
 await page.locator('#lab-apply').click();await page.waitForFunction(()=>document.querySelector('#lab-confirm').open&&!document.querySelector('#lab-confirm-apply').disabled);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'lab-confirm-cancel');await page.keyboard.press('Enter');await page.waitForFunction(()=>window.__flowgarden.lab.confirmation===0);
 await page.locator('#lab-details').click();await page.locator('#lab-apply').click();await page.waitForFunction(()=>!document.querySelector('#lab-confirm-apply').disabled);
 await page.locator('#lab-confirm-apply').click();await page.waitForFunction(()=>window.__flowgarden.lab.phase===0);
 assert.deepEqual(await stats(),plan);await page.reload();await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);assert.deepEqual(await stats(),plan);
 checks.push('Desktop real map construction, equal-window comparison, accessible review/cancel/apply, exact original-cycle persistence and reload.');
 await page.setViewportSize({width:390,height:844});await openLab();
 await page.screenshot({path:'evidence/city-lab-plan-mobile.png'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 for(const id of ['lab-bar','lab-compare','lab-exit']){const r=await page.locator('#'+id).boundingBox();assert(r&&r.x>=0&&r.y>=0&&r.x+r.width<=390&&r.y+r.height<=844,id)}
 await page.locator('#lab-compare').click();await page.waitForFunction(()=>window.__flowgarden.lab.phase===2);
 await page.locator('#lab-edit').click();await page.waitForFunction(()=>window.__flowgarden.lab.phase===1);assert.deepEqual(await stats(),plan);
 await page.locator('#lab-exit').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'lab-discard-no');await page.locator('#lab-discard-no').click();assert.equal(await page.evaluate(()=>window.__flowgarden.lab.phase),1);
 await page.locator('#lab-exit').click();await page.locator('#lab-discard-yes').click();await page.waitForFunction(()=>window.__flowgarden.lab.phase===0);assert.deepEqual(await stats(),plan);
 checks.push('390×844 layout, stop comparison, protected discard dialog and exact city restoration.');
 await openLab();await selectTool(page,1);await page.waitForTimeout(250);p=await visibleEmptyLand();await page.mouse.click(p.x,p.y);await page.waitForFunction(()=>window.__flowgarden.lab.planCost===8);assert.equal(await page.evaluate(({tileX,tileY})=>window.__flowgarden.cells.find(c=>c.id===tileX+tileY*128)?.kind,p),1);
 await page.reload();await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);assert.equal(await page.evaluate(()=>window.__flowgarden.lab.phase),0);assert.deepEqual(await stats(),plan);
 assert.deepEqual(errors,[]);checks.push('Reload drops unsaved experimental edits without replacing real city; no browser errors.');
 fs.writeFileSync('evidence/city-lab-ui.json',JSON.stringify({passed:true,artifact_sha256:JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||'.build/selection.json')).artifact_sha256,checks,errors},null,2));console.log(checks.join('\n'));
}finally{await browser.close()}
