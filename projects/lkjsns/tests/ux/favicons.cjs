const {iconPaths,iconRevision}=require('./icon-paths.cjs');
// First-party icon payload, decoding and document coverage; no user data changes.
const {chromium,base,root,output,fs,path,assert,goto,pass,session}=require('./support.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const guest=await browser.newContext({locale:'en-US'}),owner=await session(browser);const p=await guest.newPage();
 const assets=[['/favicon.svg','image/svg+xml'],['/favicon.ico','image/x-icon'],['/favicon-32.png','image/png'],['/apple-touch-icon.png','image/png']];
 for(const [route,type]of assets){const r=await guest.request.get(base+route);assert.equal(r.status(),200);assert(r.headers()['content-type'].startsWith(type));assert.deepEqual(await r.body(),fs.readFileSync(path.join(root,'web',route.slice(1))));assert.equal(r.headers()['x-content-type-options'],'nosniff');assert(!r.headers()['set-cookie']);}
 const ico=fs.readFileSync(path.join(root,'web/favicon.ico'));assert.equal(ico.readUInt16LE(0),0);assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),2);
 for(let i=0;i<2;i++){const at=6+i*16,size=ico.readUInt32LE(at+8),offset=ico.readUInt32LE(at+12);assert.equal(ico[at],i===0?16:32);assert.equal(ico[at+1],ico[at]);assert(offset+size<=ico.length);assert.equal(ico.subarray(offset,offset+8).toString('hex'),'89504e470d0a1a0a');}
 pass('SVG, multi-size ICO, PNG and touch icon are public, source-bound native assets with correct MIME types');
 for(const route of ['/','/login','/join','/search','/not-a-real-page','/'+'f'.repeat(64)]){await p.goto(base+route);assert.equal(await p.locator('head link[rel=icon]').count(),3);assert.equal(await p.locator('head link[rel=apple-touch-icon]').getAttribute('href'),iconPaths.touch);assert.equal(await p.locator('head link[rel=icon][type="image/svg+xml"]').getAttribute('href'),iconPaths.svg);}
 const a=await owner.newPage();for(const route of ['/settings','/drive','/compose','/notifications','/saved']){await goto(a,route);assert.equal(await a.locator('head link[rel=icon]').count(),3);}
 pass('Guest, signed-in, nested-resource and unavailable pages all advertise the same icons');
 await goto(p,'/');const decoded=await p.evaluate(async()=>{const out=[];for(const [src,expected]of [['/favicon.svg',64],['/favicon.ico',32],['/favicon-32.png',32],['/apple-touch-icon.png',180]]){const image=new Image();image.src=src;await image.decode();out.push({src,width:image.naturalWidth,height:image.naturalHeight,expected});}return out;});
 assert(decoded.every(i=>i.width===i.expected&&i.height===i.expected));fs.writeFileSync(path.join(output,'favicon-decode.json'),JSON.stringify(decoded,null,2));
 pass('Chromium decodes every favicon and touch representation at its declared dimensions');
 for(const route of ['/favicon.svg?x=1','/favicon.ico?id='+'f'.repeat(64)])assert.equal((await guest.request.get(base+route)).status(),400);
 assert.equal((await guest.request.get(base+'/favicon.svg',{headers:{Host:'example.invalid'}})).status(),400);
 pass('Icon delivery does not bypass exact Host or query admission');
 for(const [key,legacy,type]of [['svg','favicon.svg','image/svg+xml'],['ico','favicon.ico','image/x-icon'],['png','favicon-32.png','image/png'],['touch','apple-touch-icon.png','image/png']]){
  const r=await guest.request.get(base+iconPaths[key]);assert.equal(r.status(),200);assert(r.headers()['content-type'].startsWith(type));assert.deepEqual(await r.body(),fs.readFileSync(path.join(root,'web',legacy)));
 }
 await goto(p,'/');
 const linked=await p.locator('head link[rel=icon]').evaluateAll(es=>es.map(e=>new URL(e.href).pathname));
 assert.deepEqual(new Set(linked),new Set([iconPaths.svg,iconPaths.ico,iconPaths.png]));assert(linked.every(url=>url.includes(iconRevision)));
 pass('Fresh content-versioned URLs replace cached icons while unversioned bookmarks remain compatible');
 const artwork=fs.readFileSync(path.join(root,'web/favicon.svg'),'utf8');
 assert(artwork.includes('<title id="title">lkjsns</title>'));assert(artwork.includes('id="wordmark-lkjsns"'));assert(!/<text\b|<script\b|@font-face|<image\b/.test(artwork));
 for(const color of ['#2589ca','#51aad7','#526fd5','#8388e0','#0b1020'])assert(artwork.includes(color));
 assert(artwork.includes('<circle cx="128" cy="128" r="100" fill="#fff"/>'));assert(artwork.includes('clip-path="url(#icon-circle)"'));
 pass('The favicon retains the personal icon’s four panels and white disk, with outlined lkjsns lettering and no font dependency');
 const samples=await p.evaluate(async urls=>{const out=[];for(const src of urls){const im=new Image();im.src=src;await im.decode();const c=document.createElement('canvas');c.width=c.height=180;const g=c.getContext('2d');g.drawImage(im,0,0,180,180);const pixel=(x,y)=>Array.from(g.getImageData(x,y,1,1).data);out.push({src,corners:[pixel(4,4),pixel(175,4),pixel(4,175),pixel(175,175)],circle:pixel(90,35),ink:Array.from(g.getImageData(22,65,136,50).data).filter((v,i,a)=>i%4===0&&v<40&&a[i+1]<50&&a[i+2]<70).length});}return out;},[iconPaths.svg,iconPaths.png,iconPaths.touch]);
 for(const sample of samples){assert.deepEqual(sample.corners,Array.from({length:4},()=>[0,0,0,0]));assert.deepEqual(sample.circle,[255,255,255,255]);if(sample.src!==iconPaths.png)assert(sample.ink>500,JSON.stringify(sample));}

 // Compare the tiny PNG at its native resolution. Enlarging 32px to 180px
 // changes antialias coverage and is not a valid dark-pixel-area contract.
 const smallRaster=await p.evaluate(async urls=>{
  const svg=new Image(),png=new Image();svg.src=urls.svg;png.src=urls.png;await Promise.all([svg.decode(),png.decode()]);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const g=canvas.getContext('2d');
  g.drawImage(svg,0,0,32,32);const expected=g.getImageData(0,0,32,32).data;
  g.clearRect(0,0,32,32);g.drawImage(png,0,0);const actual=g.getImageData(0,0,32,32).data;
  let mismatches=0,maxAlphaError=0,maxPremultipliedError=0,totalError=0;
  for(let at=0;at<expected.length;at+=4){
   maxAlphaError=Math.max(maxAlphaError,Math.abs(expected[at+3]-actual[at+3]));
   for(let k=0;k<3;k++){const d=Math.abs(expected[at+k]*expected[at+3]/255-actual[at+k]*actual[at+3]/255);maxPremultipliedError=Math.max(maxPremultipliedError,d);totalError+=d;}
  }
  if(maxAlphaError>4||maxPremultipliedError>12||totalError/(1024*3)>3)mismatches++;
  return {pixels:1024,mismatches,maxAlphaError,maxPremultipliedError,meanPremultipliedError:totalError/(1024*3)};
 },iconPaths);
 assert.equal(smallRaster.mismatches,0,JSON.stringify(smallRaster));
 fs.writeFileSync(path.join(output,'personal-icon-native-raster.json'),JSON.stringify(smallRaster,null,2));
 fs.writeFileSync(path.join(output,'personal-icon-samples.json'),JSON.stringify(samples,null,2));
 pass('SVG, PNG and touch variants preserve transparent corners, the white center, full-word lettering and bounded alpha coverage without opaque corners');

}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
