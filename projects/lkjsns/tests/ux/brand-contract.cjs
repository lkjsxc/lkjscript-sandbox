// Read-only browser assertions shared by isolated and public identity checks.
'use strict';
const assert=require('node:assert/strict');
const {iconPaths,manifest,specs,previousPaths}=require('./icon-catalog.cjs');
async function checkPageBrand(page){
 assert.equal(await page.locator('head link[rel="icon"]').count(),3);
 assert.equal(await page.locator('head link[rel="icon"][type="image/svg+xml"]').getAttribute('href'),iconPaths.svg);
 assert.equal(await page.locator('head link[rel="apple-touch-icon"]').getAttribute('href'),iconPaths.touch);
 assert.equal(await page.locator('head link[rel="manifest"]').getAttribute('href'),'/manifest.webmanifest');
 assert.equal(await page.locator('meta[name="application-name"]').getAttribute('content'),'lkjsns');
 assert.equal(await page.locator('meta[name="apple-mobile-web-app-title"]').getAttribute('content'),'lkjsns');
 const brands=page.locator('a.brand');assert(await brands.count()>0,page.url());
 for(const brand of await brands.all()){
  assert.equal(await brand.getAttribute('href'),'/');assert.equal(await brand.getAttribute('aria-label'),'lkjsns home');
  assert.equal(await brand.innerText(),'lkjsns');assert.equal(await brand.locator('img.brand-mark').count(),1);
  const image=brand.locator('img.brand-mark');assert.equal(await image.getAttribute('src'),iconPaths.svg);
  assert.equal(await image.getAttribute('alt'),'');assert.equal(await image.getAttribute('width'),'32');assert.equal(await image.getAttribute('height'),'32');
  await image.evaluate(async el=>{await el.decode();});
  const view=await image.evaluate(el=>({naturalWidth:el.naturalWidth,naturalHeight:el.naturalHeight,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,background:getComputedStyle(el).backgroundColor}));
  assert.equal(view.naturalWidth,64);assert.equal(view.naturalHeight,64);
  if(await brand.isVisible()){assert.equal(view.width,32);assert.equal(view.height,32);assert.equal(view.background,'rgba(0, 0, 0, 0)');}
 }
 assert.equal(await page.locator('span.brand-mark').count(),0);
 assert(!await page.locator('body').evaluate(el=>Array.from(el.querySelectorAll('.brand')).some(b=>b.textContent.includes('lk/'))));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),page.url());
}
async function checkPublicAssets(request,origin,fs,path,root){
 for(const [name,file,mime]of specs){
  for(const route of ['/'+file,iconPaths[name],...(previousPaths[name]?[previousPaths[name]]:[])]){
   const response=await request.get(origin+route);assert.equal(response.status(),200,route);
   assert(response.headers()['content-type'].startsWith(mime),route);assert.equal(response.headers()['x-content-type-options'],'nosniff');
   assert.equal(response.headers()['set-cookie'],undefined);assert.deepEqual(await response.body(),fs.readFileSync(path.join(root,'web',file)),route);
  }
 }
 for(const route of ['/manifest.webmanifest','/site.webmanifest']){
  const response=await request.get(origin+route);assert.equal(response.status(),200);
  assert(response.headers()['content-type'].startsWith('application/manifest+json'));
  assert.deepEqual(await response.json(),manifest);assert.deepEqual(await response.body(),fs.readFileSync(path.join(root,'web/manifest.webmanifest')));
 }
 const apple=await request.get(origin+'/apple-touch-icon-precomposed.png');assert.equal(apple.status(),200);
 assert.deepEqual(await apple.body(),fs.readFileSync(path.join(root,'web/apple-touch-icon.png')));
}
module.exports={checkPageBrand,checkPublicAssets};
