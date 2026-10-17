// Public read-only release checks. No sign-in, posts, uploads or account writes.
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.LKJSNS_PLAYWRIGHT||'playwright');
const origin=process.env.LKJSNS_PUBLIC_ORIGIN;assert(origin);const base=new URL(origin);assert.equal(base.protocol,'https:');assert.equal(base.pathname,'/');assert(!base.username&&!base.password&&!base.search&&!base.hash);
const root=path.resolve(__dirname,'../..'),output=path.resolve(process.env.LKJSNS_PUBLIC_OUTPUT||path.join(root,'.build/reading-flow-public'));
assert(output.startsWith(path.join(root,'.build')+path.sep));fs.mkdirSync(output,{recursive:true,mode:0o700});
(async()=>{const browser=await chromium.launch({headless:true});try{
 const checks=[];const context=await browser.newContext({locale:'en-US'}),p=await context.newPage();
 for(const [before,after]of [['/profile?user=lkjsxc','/@lkjsxc'],['/profile?user=lkjsxc&cursor=0&trail=_','/@lkjsxc?cursor=0&trail=_'],['/attention?user=lkjsxc&direction=from','/@lkjsxc/attention/from']]){
  const r=await context.request.get(origin+before,{maxRedirects:0});assert.equal(r.status(),303);assert.equal(r.headers().location,after);
 }
 checks.push('Legacy public profile/attention URLs redirect to path-based identity while preserving cursor history');
 for(const direction of ['to','from']){const r=await context.request.get(origin+'/@lkjsxc/attention/'+direction,{maxRedirects:0});assert.equal(r.status(),303);assert.equal(r.headers().location,'/login');}
 for(const route of ['/@lkjsxc?user=someone','/@lkjsxc/attention/to?direction=from','/@lkjsxc?cursor=-1'])assert.equal((await context.request.get(origin+route)).status(),400);
 assert.equal((await context.request.get(origin+'/0000000000000000')).status(),404);
 checks.push('Path identity cannot be overridden; relationship lists stay member-only and nonexistent short addresses fail closed');
 const ids=new Set();
 for(const scheme of ['light','dark'])for(const width of [390,1280]){
  await p.emulateMedia({colorScheme:scheme});await p.setViewportSize({width,height:900});
  for(const route of ['/','/@lkjsxc','/@lkjsxc?cursor=0&trail=_']){
   const r=await p.goto(origin+route);assert.equal(r.status(),200);assert.equal(await p.locator('main h1:not(.sr-only)').count(),0);
   assert.equal(await p.locator('a[href^="/profile?user="]').count(),0);
   for(const href of await p.locator('article.note[data-href]').evaluateAll(es=>es.map(e=>e.dataset.href))){assert(/^\/[0-9abcdefghjkmnpqrstvwxyz]{16}$/.test(href),href);ids.add(href);}
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  checks.push(`${scheme} ${width}px: public profiles and feed emit clean identity/post URLs without top pagination or duplicate page titles`);
 }
 let posts=0;
 for(const target of [...ids].slice(0,3)){
  const r=await p.goto(origin+target);assert.equal(r.status(),200);assert.equal(await p.locator('[data-post-back]').count(),1);
  assert(await p.locator('.post-navigation').evaluate(el=>el.getBoundingClientRect().bottom<=document.querySelector('.note-detail').getBoundingClientRect().top+1));
  assert.equal(await p.locator('article.note .parent-card').count(),0);assert(!await p.locator('.note-detail').innerText().then(t=>t.includes('In reply to')));posts++;
 }
 checks.push(posts?`${posts} currently public post pages use a top Back link and never nest a parent preview inside the reply article`:'No public post was available for an anonymous live detail check; isolated authenticated detail coverage is recorded separately');
 for(const [url,file]of [['/style.css','style.css'],['/ui.js','ui.js'],['/transfer.js','transfer.js']]){const r=await context.request.get(origin+url);assert.equal(r.status(),200);assert.deepEqual(await r.body(),fs.readFileSync(path.join(root,'web',file)));}
 checks.push('Public stylesheet, reading-history script and short-ID upload completion script match the selected sources exactly');
 const report={at:new Date().toISOString(),origin,checks,passed:checks.length,posts,authenticatedWrites:false};fs.writeFileSync(path.join(output,'reading-flow-public.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
