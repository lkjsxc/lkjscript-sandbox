// Actual native/browser cadence diagnostics using a disposable test city.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const label=process.env.PROFILE_LABEL||'baseline',scenario=Number(process.env.PROFILE_SCENARIO||6);
const system=process.env.PROFILE_SYSTEM||'no-preference',errors=[],arrivals=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:system});
const page=await context.newPage();page.setDefaultTimeout(120000);
const quantile=(xs,q)=>[...xs].sort((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*q))]||0;
try{
 page.on('pageerror',e=>errors.push(e.message));
 page.on('websocket',s=>s.on('framereceived',e=>{try{const f=JSON.parse(e.payload);if(f.stats)arrivals.push({at:performance.now(),tick:f.stats.tick,version:f.stats.version,paused:f.stats.paused,mapChanged:f.mapChanged,actors:f.actors?.length});}catch{}}));
 await page.goto(process.env.PREVIEW_URL);await page.waitForFunction(()=>window.__flowgarden?.sessionStatus===1);
 await page.locator('#menu-open').click();await page.locator('#examples-open').click();await page.locator(`[data-scenario="${scenario}"]`).click();
 await page.waitForFunction(()=>!document.querySelector('#city-confirm').disabled);await page.locator('#city-confirm').click();
 await page.waitForFunction(n=>window.__flowgarden.stats.population===[0,384,256,512,1024,2048,2048][n],scenario);
 await page.locator('#continue').click();await page.locator('#fit').click();
 if(await page.evaluate(()=>window.__flowgarden.stats.paused))await page.locator('#play').click();
 await page.waitForFunction(()=>window.__flowgarden.stats.tick>=18&&window.__flowgarden.renderedActors.length>10);
 const samples=await page.evaluate(()=>new Promise(resolve=>{
  const result=[],until=performance.now()+16000;
  function step(now){const g=window.__flowgarden;result.push({at:now,tick:g.stats.tick,time:g.motionTime,draws:g.renderMetrics.draws,draw:g.frameTimes.at(-1),poses:g.renderedActors.map(a=>({id:a.id,x:a.x,y:a.y}))});if(now>=until)resolve(result);else requestAnimationFrame(step)}requestAnimationFrame(step);
 }));
 const frames=samples.slice(1).map((f,i)=>{const prev=samples[i],old=new Map(prev.poses.map(a=>[a.id,a]));let common=0,moving=0;for(const a of f.poses){const p=old.get(a.id);if(p){common++;if(Math.hypot(a.x-p.x,a.y-p.y)>1e-7)moving++;}}return{dt:f.at-prev.at,common,moving,draw:f.draw,painted:f.draws-prev.draws,timeDelta:f.time-prev.time};}).filter(f=>f.dt>5&&f.common>10);
 const distinct=arrivals.filter((f,i)=>!f.paused&&!f.mapChanged&&(!i||f.tick!==arrivals[i-1].tick));
 const gaps=distinct.slice(1).map((f,i)=>f.at-distinct[i].at).filter(x=>x>0&&x<10000);
 const state=await page.evaluate(()=>({stats:window.__flowgarden.stats,motion:window.__flowgarden.motionMetrics,render:window.__flowgarden.renderMetrics,systemReduced:matchMedia('(prefers-reduced-motion: reduce)').matches,motionChecked:document.querySelector('#motion-setting')?.checked,animationSetting:document.querySelector('#animation-setting')?.value}));
 let maxHold=0,hold=0;for(const f of frames){hold=f.moving===0?hold+f.dt:0;maxHold=Math.max(maxHold,hold)}
 const report={label,scenario,system,frames:frames.length,stationaryFraction:frames.filter(f=>!f.moving).length/frames.length,maxHoldMs:maxHold,paintedFraction:frames.filter(f=>f.painted>0).length/frames.length,fps:1000/quantile(frames.map(f=>f.dt),.5),nativeMedianMs:quantile(gaps,.5),nativeP95Ms:quantile(gaps,.95),drawP95Ms:quantile(frames.map(f=>f.draw),.95),state,errors};
 await page.locator('#play').click();await page.waitForFunction(()=>window.__flowgarden.stats.paused);await page.waitForTimeout(600);
 await page.screenshot({path:`evidence/motion-profile-${label}.png`});
 fs.writeFileSync(`evidence/motion-profile-${label}.json`,JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(`evidence/motion-profile-${label}-arrivals.json`,JSON.stringify(arrivals));
 assert.deepEqual(errors,[]);assert(frames.length>200);
 if(process.env.PROFILE_ASSERT_SMOOTH==='1'){assert(report.stationaryFraction<.05,JSON.stringify(report));assert(report.maxHoldMs<250,JSON.stringify(report));}
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
