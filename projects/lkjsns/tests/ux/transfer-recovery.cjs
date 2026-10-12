// Transfer/recovery checks only ever touch the isolated synthetic store.
const {resourceId,isResource,isEditor,chromium,base,fixture,output,fs,path,assert,form,fields,click,goto,pass,session,save,load}=require('./support.cjs');
const CHUNK=4*1024*1024;
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const context=await session(browser);const p=await context.newPage();p.setDefaultTimeout(60000);
  const dir=path.join(fixture,'recovery');fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'resumable.bin');const content=Buffer.alloc(CHUNK*2+37,71);content[0]=0;content[CHUNK]=255;content[CHUNK*2]=128;fs.writeFileSync(file,content);
  let lost=false;const seen=[];
  await p.route('**/upload/part?**',async route=>{
   const url=new URL(route.request().url());const part=Number(url.searchParams.get('part'));seen.push(part);
   if(part===1&&!lost){lost=true;const response=await route.fetch();assert.equal(response.status(),204);await response.dispose();await route.abort('connectionreset');}
   else await route.continue();
  });
  await goto(p,'/upload');await p.locator('input[type=file]').setInputFiles(file);await p.getByRole('button',{name:'Upload',exact:true}).click();
  await p.getByRole('button',{name:'Resume upload',exact:true}).waitFor({state:'visible'});assert(lost);
  await Promise.all([p.waitForURL(url=>isResource(url)),p.getByRole('button',{name:'Resume upload',exact:true}).click()]);
  const id=resourceId(p.url());const downloaded=await context.request.get(base+'/'+id+'/raw');assert.deepEqual(await downloaded.body(),content);
  assert.deepEqual(seen,[0,1,2]);await p.unroute('**/upload/part?**');
  pass('Browser resume recovers a lost acknowledgement without resending saved parts');
  const guest=await browser.newContext();assert.equal((await guest.request.get(base+'/'+id+'/raw')).status(),404);
  await goto(p,'/file?id='+id);const before=await fields(p,'file');await p.locator('[name=tags]').fill('first');await click(p,form(p,'file').locator('button'));
  const conflict=await context.request.post(base+'/action',{headers:{Origin:base},form:{...before,tags:'submitted, retry'},maxRedirects:0});assert.equal(conflict.status(),409);
  const html=await conflict.text();assert(html.includes('submitted, retry'));await goto(p,'/file?id='+id);assert.equal(await p.locator('[name=tags]').inputValue(),'first');
  pass('A file metadata conflict preserves submitted tags while keeping the newest saved version');
  // Transfer pending state survives a native restart; complete it in persistence.cjs.
  await goto(p,'/upload');const url=new URL(await p.locator('form[enctype="multipart/form-data"]').getAttribute('action'),base);url.searchParams.delete('folder');
  const endpoint=kind=>{const target=new URL(url);target.pathname='/upload/'+kind;return target;};
  let response=await context.request.post(endpoint('start').href,{headers:{Origin:base},form:{name:'restart-pending.bin',size:String(CHUNK+9)},maxRedirects:0});assert.equal(response.status(),200);
  const part=endpoint('part');part.searchParams.set('part','0');
  response=await context.request.post(part.href,{headers:{Origin:base,'Content-Type':'application/octet-stream'},data:Buffer.alloc(CHUNK,33),maxRedirects:0});assert.equal(response.status(),204);
  save('pending-transfer',{url:url.href,size:CHUNK+9});
  pass('A pending native upload has a durable acknowledged part ready for restart testing');
  // Existing browser codecs still work on chunk-backed originals.
  for(const [name,kind] of [['tone.wav','audio'],['motion.webm','video']]) {
   await goto(p,'/upload');await p.locator('input[type=file]').setInputFiles(path.join(output,'media',name));
   await Promise.all([p.waitForURL(url=>isResource(url)),p.getByRole('button',{name:'Upload',exact:true}).click()]);
   assert.equal(await p.locator(kind).count(),1);await p.locator(kind).evaluate(el=>el.load());
   await p.waitForFunction(kind=>{const e=document.querySelector(kind);return e&&e.readyState>=1;},kind);
   const metadata=await p.locator(kind).evaluate(e=>({duration:e.duration,error:e.error?.code}));assert(!metadata.error);assert(metadata.duration>0);
  }
  pass('Uploaded WAV and WebM originals retain browser audio/video metadata and controls');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
