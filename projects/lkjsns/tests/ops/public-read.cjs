// Read-only public browser smoke. Never registers, uploads, or reuses test sessions.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.LKJSNS_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'../..'),base=process.env.LKJSNS_PUBLIC_URL;
assert(base&&/^https:\/\/[a-z0-9.-]+$/.test(base),'Supply the canonical HTTPS origin');
assert(!new URL(base).hostname.endsWith('.trycloudflare.com'),'A fixed hostname is required');
const output=fs.mkdtempSync(path.join(root,'.build/public-read-'));fs.chmodSync(output,0o700);
(async()=>{const browser=await chromium.launch({headless:true});try{
 const context=await browser.newContext({locale:'en-US'}),page=await context.newPage();
 context.setDefaultTimeout(15000);
 // An accidental interaction must never turn this read-only inspection into a write.
 await context.route('**/*',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.abort());
 const checks=[];
 for(const colorScheme of ['light','dark'])for(const width of [390,1440]){
  await page.emulateMedia({colorScheme,reducedMotion:'reduce'});await page.setViewportSize({width,height:900});
  for(const route of ['/','/login','/join','/about']){
   const response=await page.goto(base+route,{waitUntil:'load'});assert.equal(response.status(),200,route);
   assert.equal(new URL(page.url()).origin,base);assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.equal(await page.locator('h1').count(),1);
   assert(response.headers()['content-security-policy'].includes("default-src 'none'"));assert(response.headers()['content-security-policy'].includes("script-src 'self'"));assert(response.headers()['cache-control'].includes('no-store'));
   assert.equal(response.headers()['referrer-policy'],'same-origin');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert(!/[\u3040-\u30ff\u3400-\u9fff]/u.test((await page.locator('nav,h1,label,button').allTextContents()).join(' ')),'Product-owned labels must be English');
   checks.push({route,width,colorScheme,status:response.status()});
   if(route==='/login')await page.screenshot({path:path.join(output,`sign-in-${colorScheme}-${width}.png`),fullPage:true});
  }
 }
 const style=await context.request.get(base+'/style.css');assert.equal(style.status(),200);assert.deepEqual(await style.body(),fs.readFileSync(path.join(root,'web/style.css')));
 const privatePage=await context.request.get(base+'/drive',{maxRedirects:0});assert.equal(privatePage.status(),303);assert.equal(privatePage.headers().location,'/login');
 const report={origin:base,pageChecks:checks.length,stylesheetByteEqual:true,privateRouteRedirect:true,readOnly:true,checks};
 fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({origin:base,pageChecks:checks.length,stylesheetByteEqual:true,privateRouteRedirect:true,output}));
}finally{await browser.close();}})().catch(error=>{console.error(error.stack);process.exitCode=1});
