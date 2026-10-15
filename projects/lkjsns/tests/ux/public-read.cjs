const {iconPaths,iconRevision}=require('./icon-paths.cjs');
const {checkPageBrand,checkPublicAssets}=require('./brand-contract.cjs');
// Read-only public verification. Never creates an account, draft, or upload.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.LKJSNS_PLAYWRIGHT||'playwright');
const origin=process.env.LKJSNS_PUBLIC_ORIGIN;
assert(origin,'Set the exact public HTTPS origin.');const url=new URL(origin);
assert.equal(url.protocol,'https:');assert(!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname==='/');
const root=path.resolve(__dirname,'../..');const output=path.resolve(process.env.LKJSNS_PUBLIC_OUTPUT||path.join(root,'.build/public-ux'));
assert(output.startsWith(path.join(root,'.build')+path.sep));fs.mkdirSync(output,{recursive:true,mode:0o700});
(async()=>{
 const browser=await chromium.launch({headless:true});const checks=[];
 try {
  const context=await browser.newContext({locale:'en-US'});const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  for(const scheme of ['light','dark'])for(const width of [390,1280]) {
   await p.emulateMedia({colorScheme:scheme,reducedMotion:'reduce'});await p.setViewportSize({width,height:900});
   for(const route of ['/','/login','/join','/about','/search','/more','/privacy','/terms','/guidelines','/contact']) {
    const response=await p.goto(origin+route);assert.equal(response.status(),200,route);assert.equal(await p.locator('html').getAttribute('lang'),'en');
    assert.equal(await p.locator('.page-header').count(),0,route);assert((await p.locator('main h1').getAttribute('class')).includes('sr-only'),route);
    assert.equal(await p.locator('head link[rel=icon][type="image/svg+xml"]').getAttribute('href'),iconPaths.svg);
    await checkPageBrand(p);
    const geometry=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert(geometry.scroll<=geometry.width+1,route);
    assert(response.headers()['content-security-policy'].includes("script-src 'self'"));checks.push(`${scheme} ${width}px ${route}`);
   }
  }
  for(const route of ['/settings','/settings/profile','/settings/security','/settings/avatar','/drive','/drafts','/saved','/notifications','/admin','/admin/invitations','/compose']) {
   const r=await context.request.get(origin+route,{maxRedirects:0});assert.equal(r.status(),303,route);assert.equal(r.headers().location,'/login',route);
  }checks.push('Eleven private routes require native sign-in');
  for(const [route,file] of [['/style.css','style.css'],['/ui.js','ui.js'],['/transfer.js','transfer.js']]) {
   const r=await context.request.get(origin+route);assert.equal(r.status(),200);assert.deepEqual(await r.body(),fs.readFileSync(path.join(root,'web',file)));
  }checks.push('Public CSS and both scripts exactly match the selected source');
  for(const route of ['/unavailable-page','/settings/unavailable-page']) {
   const response=await p.goto(origin+route);assert.equal(response.status(),404);assert.equal(await p.locator('main h1').innerText(),'This page is unavailable');
   assert.equal(await p.getByRole('link',{name:'Sign in',exact:true}).count(),0);await checkPageBrand(p);
  }checks.push('Unknown public paths render the branded unavailable page');
  const absent='f'.repeat(64);const legacy=await context.request.get(origin+'/note?id='+absent,{maxRedirects:0});assert.equal(legacy.status(),303);assert.equal(legacy.headers().location,'/'+absent);
  const duplicate=await context.request.get(origin+'/'+absent+'?id='+absent);assert.equal(duplicate.status(),400);checks.push('Root-ID redirects and path-authoritative query validation');
  for(const [route,file] of [['/favicon.svg','favicon.svg'],['/favicon.ico','favicon.ico'],['/favicon-32.png','favicon-32.png'],['/apple-touch-icon.png','apple-touch-icon.png']]) {const r=await context.request.get(origin+route);assert.equal(r.status(),200);assert.deepEqual(await r.body(),fs.readFileSync(path.join(root,'web',file)));}checks.push('Public favicon/touch assets exactly match the selected source');
  for(const [key,file]of [['svg','favicon.svg'],['ico','favicon.ico'],['png','favicon-32.png'],['touch','apple-touch-icon.png']]){const r=await context.request.get(origin+iconPaths[key]);assert.equal(r.status(),200);assert.deepEqual(await r.body(),fs.readFileSync(path.join(root,'web',file)));}checks.push('Content-versioned personal favicon aliases match the outlined lkjsns artwork');
  await checkPublicAssets(context.request,origin,fs,path,root);checks.push('All six shared brand assets, previous URLs, Apple fallback and application manifest match reviewed source bytes');
  const unknown=await p.goto(origin+'/'+'f'.repeat(64));assert.equal(unknown.status(),404);await checkPageBrand(p);checks.push('Standalone error shell uses the same new brand image');
  assert.equal((await context.request.get(origin+'/healthz')).status(),200);assert.deepEqual(errors,[]);checks.push('Public health and browser scripts');
  const report={at:new Date().toISOString(),origin,checks,passed:checks.length,authenticatedWrites:false};
  fs.writeFileSync(path.join(output,'public-read.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
