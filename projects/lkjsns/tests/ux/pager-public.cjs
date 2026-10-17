// Read-only live verification; never create accounts or use a real-user session.
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.LKJSNS_PLAYWRIGHT||'playwright');const {assertPager}=require('./pager-contract.cjs');
const origin=process.env.LKJSNS_PUBLIC_ORIGIN;assert(origin&&origin.startsWith('https://'));
const root=path.resolve(__dirname,'../..'),output=path.resolve(process.env.LKJSNS_PUBLIC_OUTPUT||path.join(root,'.build/pager-public'));
assert(output.startsWith(path.join(root,'.build')+path.sep));fs.mkdirSync(output,{recursive:true,mode:0o700});
(async()=>{const browser=await chromium.launch();try{let checks=0;
 for(const javaScriptEnabled of [true,false]){const context=await browser.newContext({javaScriptEnabled,locale:'en-US'}),p=await context.newPage();
  for(const width of [390,1280])for(const colorScheme of ['light','dark']){
   await p.setViewportSize({width,height:900});await p.emulateMedia({colorScheme});
   for(const route of ['/?cursor=0&trail=_','/@lkjsxc?cursor=0&trail=_']){
    const r=await p.goto(origin+route);assert.equal(r.status(),200);await assertPager(p,{content:'main .feed',previous:true,next:false});
    assert.equal(await p.locator('main>nav.pager').count(),1);await p.locator('a[rel=prev]').click();assert.equal(new URL(p.url()).searchParams.get('cursor'),null);checks++;
   }
  }
  await context.close();
 }
 const report={checkedAt:new Date().toISOString(),checks,authenticatedWrites:false,origin,bottomNavigation:true};fs.writeFileSync(path.join(output,'pager-public.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
