// Shared application identity across every shell. Synthetic loopback accounts only.
const {chromium,base,root,output,fs,path,assert,goto,pass,session,load}=require('./support.cjs');
const {checkPageBrand,checkPublicAssets}=require('./brand-contract.cjs');
const {iconPaths,manifest}=require('./icon-catalog.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const owner=await session(browser),member=await session(browser,'member'),guest=await browser.newContext({locale:'en-US'});
 const a=await owner.newPage(),m=await member.newPage(),g=await guest.newPage();
 const posts=load('posts'),media=load('media');const profileBefore=await owner.request.get(base+'/avatar?user=testowner');const originalAvatar=await profileBefore.body();
 const privateRoutes=['/','/compose','/saved','/notifications','/settings','/settings/profile','/settings/security','/settings/avatar','/drive','/upload','/people','/profile?user=testowner','/search','/admin','/admin/invitations','/more','/about','/privacy','/terms','/guidelines','/contact','/'+posts.publicId,'/'+posts.protectedDraft+'/edit','/'+media.textId,'/pick?draft='+posts.protectedDraft];
 const guestRoutes=['/','/login','/join','/search','/more','/about','/privacy','/terms','/guidelines','/contact'];
 let rendered=0;
 for(const scheme of ['light','dark'])for(const width of [320,390,768,1280]){
  for(const p of [a,g]){await p.emulateMedia({colorScheme:scheme});await p.setViewportSize({width,height:900});}
  for(const route of privateRoutes){await goto(a,route);await checkPageBrand(a);rendered++;}
  for(const route of guestRoutes){await goto(g,route);await checkPageBrand(g);rendered++;}
  for(const route of ['/not-an-existing-page','/settings/not-an-existing-page','/'+'f'.repeat(64),'/favicon.svg?unsupported=1']){
   const response=await g.goto(base+route);assert([400,404].includes(response.status()));await checkPageBrand(g);rendered++;
  }
  pass(`New brand image on desktop/mobile, authenticated/guest and error shells: ${scheme} at ${width}px`);
 }
 await m.setViewportSize({width:390,height:844});const denied=await m.goto(base+'/admin');assert.equal(denied.status(),403);await checkPageBrand(m);
 await goto(a,'/');await checkPublicAssets(guest.request,base,fs,path,root);
 const cdp=await owner.newCDPSession(a);const result=await cdp.send('Page.getAppManifest');
 assert.equal(new URL(result.url).pathname,'/manifest.webmanifest');assert.deepEqual(JSON.parse(result.data),manifest);
 assert(!(result.errors||[]).some(e=>e.critical));await cdp.detach();
 pass('Browser recognizes the same-origin manifest and all current, legacy, home-screen and application assets match source bytes');
 // Test high-resolution source pixels; OS-specific masks are not claimed here.
 const decoded=await a.evaluate(async paths=>{const out=[];for(const [name,src,size]of [['app192',paths.app192,192],['app512',paths.app512,512]]){
  const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
  const pixel=(x,y)=>Array.from(ctx.getImageData(x,y,1,1).data);
  out.push({name,size,width:img.naturalWidth,height:img.naturalHeight,corners:[pixel(1,1),pixel(size-2,1),pixel(1,size-2),pixel(size-2,size-2)],white:pixel(size/2,Math.floor(size*.2)),panels:[pixel(Math.floor(size*.25),Math.floor(size*.125)),pixel(Math.floor(size*.75),Math.floor(size*.125)),pixel(Math.floor(size*.25),Math.floor(size*.875)),pixel(Math.floor(size*.75),Math.floor(size*.875))]});
 }return out;},iconPaths);
 for(const im of decoded){assert.equal(im.width,im.size);assert.equal(im.height,im.size);assert.deepEqual(im.corners,Array.from({length:4},()=>[0,0,0,0]));assert.deepEqual(im.white,[255,255,255,255]);assert.deepEqual(im.panels,[[37,137,202,255],[81,170,215,255],[82,111,213,255],[131,136,224,255]]);}
 const finalAvatar=await owner.request.get(base+'/avatar?user=testowner');assert.deepEqual(await finalAvatar.body(),originalAvatar);
 pass('192/512px application icons retain the four-panel artwork with transparent circular edges; the user profile image is independent and unchanged');
 for(const route of ['/manifest.webmanifest?x=1','/site.webmanifest?x=1',iconPaths.app512+'?id=x'])assert.equal((await guest.request.get(base+route)).status(),400,route);
 for(const route of ['/manifest.webmanifest',iconPaths.app192])assert.equal((await guest.request.get(base+route,{headers:{Host:'invalid.example'}})).status(),400,route);
 const cold=await session(browser,'owner',{javaScriptEnabled:false,viewport:{width:390,height:844}});const n=await cold.newPage();await goto(n,'/more');await checkPageBrand(n);await cold.close();
 pass('Icon and manifest delivery retain exact Host/query checks and brand markup works without application JavaScript');
 // The first browser painted old defaults; a revisited page must advertise only
 // the new revision, without requiring an application-side cache-clearing action.
 for(const width of [390,1280]){await a.emulateMedia({colorScheme:'light'});await a.setViewportSize({width,height:844});await goto(a,'/more');await checkPageBrand(a);
  await a.screenshot({path:path.join(output,`brand-more-${width}.png`),fullPage:true});
  await a.locator(width===390?'.mobile-brand':'.sidebar .brand').screenshot({path:path.join(output,`brand-mark-${width}.png`)});
 }
 await g.setViewportSize({width:390,height:844});await g.goto(base+'/'+'f'.repeat(64));await g.screenshot({path:path.join(output,'brand-error-mobile.png'),fullPage:true});
 fs.writeFileSync(path.join(output,'brand-coverage.json'),JSON.stringify({rendered,privateRoutes:privateRoutes.length,guestRoutes:guestRoutes.length,decoded,manifestErrors:result.errors||[],profileImageUnchanged:true},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
