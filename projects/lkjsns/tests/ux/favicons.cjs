// First-party icon payload, decoding and document coverage; no user data changes.
const {chromium,base,root,output,fs,path,assert,goto,pass,session}=require('./support.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const guest=await browser.newContext({locale:'en-US'}),owner=await session(browser);const p=await guest.newPage();
 const assets=[['/favicon.svg','image/svg+xml'],['/favicon.ico','image/x-icon'],['/favicon-32.png','image/png'],['/apple-touch-icon.png','image/png']];
 for(const [route,type]of assets){const r=await guest.request.get(base+route);assert.equal(r.status(),200);assert(r.headers()['content-type'].startsWith(type));assert.deepEqual(await r.body(),fs.readFileSync(path.join(root,'web',route.slice(1))));assert.equal(r.headers()['x-content-type-options'],'nosniff');assert(!r.headers()['set-cookie']);}
 const ico=fs.readFileSync(path.join(root,'web/favicon.ico'));assert.equal(ico.readUInt16LE(0),0);assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),2);
 for(let i=0;i<2;i++){const at=6+i*16,size=ico.readUInt32LE(at+8),offset=ico.readUInt32LE(at+12);assert.equal(ico[at],i===0?16:32);assert.equal(ico[at+1],ico[at]);assert(offset+size<=ico.length);assert.equal(ico.subarray(offset,offset+8).toString('hex'),'89504e470d0a1a0a');}
 pass('SVG, multi-size ICO, PNG and touch icon are public, source-bound native assets with correct MIME types');
 for(const route of ['/','/login','/join','/search','/not-a-real-page','/'+'f'.repeat(64)]){await p.goto(base+route);assert.equal(await p.locator('head link[rel=icon]').count(),3);assert.equal(await p.locator('head link[rel=apple-touch-icon]').getAttribute('href'),'/apple-touch-icon.png');assert.equal(await p.locator('head link[rel=icon][type="image/svg+xml"]').getAttribute('href'),'/favicon.svg');}
 const a=await owner.newPage();for(const route of ['/settings','/drive','/compose','/notifications','/saved']){await goto(a,route);assert.equal(await a.locator('head link[rel=icon]').count(),3);}
 pass('Guest, signed-in, nested-resource and unavailable pages all advertise the same icons');
 await goto(p,'/');const decoded=await p.evaluate(async()=>{const out=[];for(const [src,expected]of [['/favicon.svg',64],['/favicon.ico',32],['/favicon-32.png',32],['/apple-touch-icon.png',180]]){const image=new Image();image.src=src;await image.decode();out.push({src,width:image.naturalWidth,height:image.naturalHeight,expected});}return out;});
 assert(decoded.every(i=>i.width===i.expected&&i.height===i.expected));fs.writeFileSync(path.join(output,'favicon-decode.json'),JSON.stringify(decoded,null,2));
 pass('Chromium decodes every favicon and touch representation at its declared dimensions');
 for(const route of ['/favicon.svg?x=1','/favicon.ico?id='+'f'.repeat(64)])assert.equal((await guest.request.get(base+route)).status(),400);
 assert.equal((await guest.request.get(base+'/favicon.svg',{headers:{Host:'example.invalid'}})).status(),400);
 pass('Icon delivery does not bypass exact Host or query admission');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
