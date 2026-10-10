// Exercise real native edits and actual canvas pixels after the rendering cache.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {selectTool,districtPoint,waitTile} from './ui-driver.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM||undefined,headless:true,args:['--no-sandbox']});
const prefix=process.env.CACHE_EVIDENCE||'evidence/render-cache-ui',checks=[],errors=[];
try{
 for(const dpr of [1,2]){
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:dpr});
  await context.addInitScript(()=>{window.__layoutReads=0;const read=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(){if(this.classList.contains('bottom-ui'))window.__layoutReads++;return read.call(this)}});
  const page=await context.newPage();
  page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.PREVIEW_URL);await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);
  await page.locator('#fit').click();await page.waitForFunction(()=>window.__flowgarden.detail);
  const state=()=>page.evaluate(()=>window.__flowgarden.stats);
  await page.waitForTimeout(700);
  await page.waitForFunction(()=>window.__flowgarden.stats.paused&&!window.__flowgarden.renderMetrics.pendingFrame);
  const first=await page.evaluate(()=>({...window.__flowgarden.renderMetrics,layoutReads:window.__layoutReads}));
  await page.waitForTimeout(600);
  const next=await page.evaluate(()=>({...window.__flowgarden.renderMetrics,layoutReads:window.__layoutReads}));
  assert(next.layoutReads-first.layoutReads<=next.draws-first.draws+20,'Each paint should read layout only once; allow native view replies outside paint');
  assert.equal(next.draws-first.draws,0,'A settled paused view must sleep until an invalidation');
  assert(next.queries-first.queries<=next.indexRebuilds-first.indexRebuilds+1,'Stable views must reuse the tile query between native frames');
  async function pixel(){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));return page.evaluate(()=>{const g=window.__flowgarden,c=document.querySelector('#map'),p=g.worldToScreen(g.stats.originX+7.5,g.stats.originY+11.5),r=c.getBoundingClientRect(),scale=c.width/r.width;return [...c.getContext('2d').getImageData(Math.floor(p.x*scale),Math.floor(p.y*scale),1,1).data]});}
  const empty=await pixel(),before=await state();await selectTool(page,6);let p=await districtPoint(page,7,11);await page.mouse.click(p.x,p.y);await waitTile(page,7,11,6);await selectTool(page,-2);
  const planted=await pixel();assert.notDeepEqual(planted,empty);assert.equal((await state()).cash,before.cash-90);
  await page.screenshot({path:prefix+'-dpr'+dpr+'-park.png'});
  // Pan then resize/rotate; the same native park must remain visibly painted.
  await page.mouse.move(740,430);await page.mouse.down();await page.mouse.move(860,460,{steps:10});await page.mouse.up();assert.deepEqual(await pixel(),planted);
  await page.setViewportSize({width:390,height:844});await page.locator('#fit').click();for(let i=0;i<4&&!await page.evaluate(()=>window.__flowgarden.detail);i++)await page.locator('#zoom-in').click();await page.waitForFunction(()=>window.__flowgarden.detail);assert.deepEqual(await pixel(),planted);
  await page.screenshot({path:prefix+'-dpr'+dpr+'-mobile.png'});
  await page.setViewportSize({width:1440,height:1000});await page.locator('#fit').click();await selectTool(page,0);p=await districtPoint(page,7,11);await page.mouse.click(p.x,p.y);await page.waitForFunction(()=>document.querySelector('#removal').open);await page.locator('#remove-confirm').click();await waitTile(page,7,11,0);await selectTool(page,-2);assert.deepEqual(await pixel(),empty);assert.equal((await state()).cash,before.cash-45);
  checks.push({dpr,passed:true,projection:{draws:next.draws-first.draws,queries:next.queries-first.queries,layoutReads:next.layoutReads-first.layoutReads},checks:['native construction changes actual canvas pixels and charges funds','camera pan and portrait rotation preserve the rendered native tile','confirmed demolition removes cached building paint and returns exact salvage'],empty_pixel:empty,park_pixel:planted});
  await context.close();
 }
 assert.deepEqual(errors,[]);const result={passed:true,artifact_sha256:JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||'.build/selection.json')).artifact_sha256,method:'Actual native HTTP/session servers and mouse commands. Canvas pixel reads are observations, not injected state. DPR1 andDPR2 exercise physical backing-store dimensions.',checks,errors};fs.writeFileSync(prefix+'.json',JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close();}
