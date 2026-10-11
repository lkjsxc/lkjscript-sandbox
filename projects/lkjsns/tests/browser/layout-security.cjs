// Responsive and security regressions. This is not a claim of full WCAG conformance.
const {chromium,root,base,fixture,output,fs,path,assert,form,click,goto,fields}=require('./support.cjs');
const crypto=require('node:crypto');const checks=[];
function pass(name){checks.push(name);console.log('PASS',name);fs.writeFileSync(path.join(output,'layout-security.json'),JSON.stringify({passed:checks.length,checks},null,2));}
(async()=>{const browser=await chromium.launch({headless:true});try{
 const state=JSON.parse(fs.readFileSync(path.join(fixture,'flow-state.json')));
 const context=await browser.newContext({locale:'en-US',storageState:path.join(fixture,'owner.session.json')});
 const p=await context.newPage();
 for(const colorScheme of ['light','dark'])for(const width of [320,390,768,1440]){
  await p.emulateMedia({colorScheme,reducedMotion:'reduce'});await p.setViewportSize({width,height:900});
  for(const route of ['/','/drive','/compose','/settings','/notifications','/file?id='+state.image]){
   await goto(p,route);assert.equal(await p.locator('html').getAttribute('lang'),'en');assert.equal(await p.locator('h1').count(),1);
   assert(!/[\u3040-\u30ff\u3400-\u9fff]/u.test(await p.locator('body').innerText()),route);
   const geometry=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert(geometry.scroll<=geometry.width+1,JSON.stringify({colorScheme,route,...geometry}));
   if(width<=390){const small=await p.locator('input:not([type=hidden]):not([type=checkbox]),textarea,select').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width>0&&parseFloat(getComputedStyle(e).fontSize)<16).map(e=>e.name));assert.deepEqual(small,[],route);}
  }
  pass(colorScheme+' layout: six authenticated pages at '+width+'px, English and no horizontal overflow');
 }
 await p.emulateMedia({colorScheme:'light'});await p.setViewportSize({width:1366,height:900});await goto(p,'/drive');await p.screenshot({path:path.join(output,'drive-final-desktop.png'),fullPage:true});
 await p.setViewportSize({width:390,height:844});await goto(p,'/');await p.screenshot({path:path.join(output,'home-final-mobile.png')});
 await goto(p,'/drive');await p.screenshot({path:path.join(output,'drive-final-mobile.png'),fullPage:true});
 await p.emulateMedia({colorScheme:'dark'});await p.screenshot({path:path.join(output,'drive-final-mobile-dark.png'),fullPage:true});
 await goto(p,'/compose');await p.keyboard.press('Tab');
 // Explicitly start from document navigation, not the autofocus editor.
 await p.locator('a.skip').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>document.activeElement.id),'main');pass('Keyboard skip link moves focus into the main content');
 const response=await goto(p,'/settings');const headers=response.headers();assert.equal(headers['referrer-policy'],'same-origin');assert(headers['content-security-policy'].includes("script-src 'none'"));assert(headers['cache-control'].includes('no-store'));
 assert.deepEqual(await (await context.request.get(base+'/style.css')).body(),fs.readFileSync(path.join(root,'web/style.css')));pass('Native CSS matches authored bytes; security and privacy headers are present');
 const profile=await fields(p,'profile');
 for(const origin of ['https://example.invalid','null','']){
  const h=origin?{Origin:origin}:{};const result=await context.request.post(base+'/action',{headers:h,form:{...profile,display:'Must not be saved'},maxRedirects:0});assert.equal(result.status(),403);
 }
 let result=await context.request.post(base+'/action',{headers:{Origin:base},form:{...profile,csrf:'wrong',display:'Must not be saved'},maxRedirects:0});assert.equal(result.status(),403);
 const duplicate=new URLSearchParams(profile);duplicate.append('display','Must not be saved');
 result=await context.request.post(base+'/action',{headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},data:duplicate.toString(),maxRedirects:0});assert.equal(result.status(),422);
 await goto(p,'/settings');assert.equal(await p.locator('[name=display]').inputValue(),profile.display);pass('Cross-origin, missing-origin, invalid-CSRF and duplicate-field writes leave the profile unchanged');
 result=await context.request.get(base+'/note?id=a&id=b');assert.equal(result.status(),400);result=await context.request.get(base+'/',{headers:{Host:'example.invalid'}});assert.equal(result.status(),400);pass('Duplicate query fields and foreign Host headers are rejected');
 const credentials=JSON.parse(fs.readFileSync(path.join(fixture,'test-accounts.json')));
 const oldContext=await browser.newContext({storageState:path.join(fixture,'owner.session.json')});
 const replacement=crypto.randomBytes(24).toString('hex');await goto(p,'/settings');const password=form(p,'password');
 await p.locator('details').filter({has:password}).locator('summary').click();
 await password.locator('[name=old]').fill(credentials.owner.password);await password.locator('[name=password]').fill(replacement);await password.locator('[name=confirm]').fill(replacement);
 await click(p,password.locator('button'));result=await oldContext.request.get(base+'/settings',{maxRedirects:0});assert.equal(result.status(),303);assert.equal(result.headers().location,'/login');
 await goto(p,'/login');await p.locator('[name=handle]').fill(credentials.owner.handle);await p.locator('[name=password]').fill(replacement);await click(p,form(p,'login').locator('button'));await goto(p,'/settings');
 credentials.owner.password=replacement;fs.writeFileSync(path.join(fixture,'test-accounts.json'),JSON.stringify(credentials),{mode:0o600});await context.storageState({path:path.join(fixture,'owner.session.json')});pass('Password change invalidates the previous session and the new password signs in');
 console.log(JSON.stringify({passed:checks.length}));
}finally{await browser.close();}})().catch(error=>{console.error(error.stack);process.exitCode=1});
