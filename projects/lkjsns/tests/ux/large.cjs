const {chromium,base,fixture,output,fs,path,assert,goto,pass,session,save,crypto}=require('./support.cjs');
const MAX=256*1024*1024,CHUNK=4*1024*1024,RANGE=8*1024*1024;
async function digestFile(file){const hash=crypto.createHash('sha256');for await(const part of fs.createReadStream(file))hash.update(part);return hash.digest('hex');}
async function uploadURL(page){await goto(page,'/upload');const url=new URL(await page.locator('form[enctype="multipart/form-data"]').getAttribute('action'),base);url.searchParams.delete('folder');return url;}
const endpoint=(url,kind,part)=>{const target=new URL(url);target.pathname='/upload/'+kind;if(part!==undefined)target.searchParams.set('part',part);return target.href;};
(async()=>{
 const browser=await chromium.launch({headless:true});let sampler;
 try {
  const context=await session(browser);const p=await context.newPage();p.setDefaultTimeout(120000);
  const dir=path.join(fixture,'large');fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'boundary-256MiB.bin'),fd=fs.openSync(file,'w');fs.ftruncateSync(fd,MAX);
  for(let i=0;i<64;i++){const marker=Buffer.from('lkjsns-part-'+i+'-');fs.writeSync(fd,marker,0,marker.length,i*CHUNK);fs.writeSync(fd,Buffer.from([i,255-i,128,0]),0,4,(i+1)*CHUNK-4);}fs.closeSync(fd);
  const expected=await digestFile(file);const tooLarge=path.join(dir,'over-limit.bin');fs.closeSync(fs.openSync(tooLarge,'w'));fs.truncateSync(tooLarge,MAX+1);
  await uploadURL(p);await p.locator('input[type=file]').setInputFiles(tooLarge);
  assert(!(await p.locator('input[type=file]').evaluate(e=>e.checkValidity())));
  assert((await p.locator('input[type=file]').evaluate(e=>e.validationMessage)).includes('256'));
  pass('256 MiB plus one byte is rejected in the browser before transfer');
  const startURL=await uploadURL(p);
  const denied=await context.request.post(endpoint(startURL,'start'),{headers:{Origin:base},form:{name:'too-big.bin',size:String(MAX+1)},maxRedirects:0});assert.equal(denied.status(),422);
  pass('The native server independently rejects files larger than 256 MiB');
  const url=await uploadURL(p);let peakRssKiB=0;const started=Date.now();const statuses=[];
  const readRSS=()=>{try {const data=fs.readFileSync('/proc/'+process.env.LKJSNS_TEST_SERVER_PID+'/status','utf8');peakRssKiB=Math.max(peakRssKiB,Number(data.match(/^VmRSS:\s+(\d+)/m)?.[1]||0));}catch{}};
  sampler=setInterval(readRSS,100);readRSS();
  p.on('response',r=>{if(new URL(r.url()).pathname==='/upload/part')statuses.push(r.status());});
  await p.locator('input[type=file]').setInputFiles(file);
  await Promise.all([p.waitForURL(u=>u.pathname==='/file',{timeout:300000}),p.getByRole('button',{name:'Upload',exact:true}).click()]);
  const id=new URL(p.url()).searchParams.get('id');assert.equal(id,url.searchParams.get('id'));assert.equal(statuses.length,64);assert(statuses.every(s=>s===204));
  const uploadMilliseconds=Date.now()-started;pass('A real 256 MiB file uploads through 64 native 4 MiB parts');
  const range=await context.request.get(base+'/media?id='+id,{headers:{Range:`bytes=${CHUNK-7}-${CHUNK+19}`}});assert.equal(range.status(),206);
  const original=Buffer.alloc(27),input=fs.openSync(file,'r');fs.readSync(input,original,0,27,CHUNK-7);fs.closeSync(input);
  assert.deepEqual(await range.body(),original);pass('A range spanning two stored parts returns exactly the requested bytes');
  const hash=crypto.createHash('sha256');let returned=0;
  for(let start=0;start<MAX;start+=RANGE){const end=Math.min(start+RANGE,MAX)-1;
   const r=await context.request.get(base+'/media?id='+id,{headers:{Range:`bytes=${start}-${end}`}});
   assert.equal(r.status(),206);assert.equal(r.headers()['content-range'],`bytes ${start}-${end}/${MAX}`);
   const bytes=await r.body();assert.equal(bytes.length,end-start+1);hash.update(bytes);returned+=bytes.length;await r.dispose();
  }
  assert.equal(returned,MAX);assert.equal(hash.digest('hex'),expected);pass('All 256 MiB download with exact range metadata and matching SHA-256');
  const naked=await context.request.get(base+'/media?id='+id,{maxRedirects:0});assert.equal(naked.status(),303);assert(naked.headers().location.startsWith('/download?'));
  // Exercise the portable Blob fallback, not only direct HTTP range requests.
  await p.addInitScript(()=>{Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true});});
  await goto(p,naked.headers().location);const downloadPromise=p.waitForEvent('download',{timeout:300000});
  await p.getByRole('link',{name:'Download file',exact:true}).click();const download=await downloadPromise;
  const saved=path.join(dir,'browser-download.bin');await download.saveAs(saved);assert.equal(await digestFile(saved),expected);
  pass('The browser download control assembles an exact 256 MiB portable download');
  // Native retries are idempotent; wrong ordering and early finish never publish.
  const retryURL=await uploadURL(p);let response=await context.request.post(endpoint(retryURL,'start'),{headers:{Origin:base},form:{name:'retry.bin',size:String(CHUNK+13)},maxRedirects:0});assert.equal(response.status(),200);assert.equal(await response.text(),'0');
  response=await context.request.post(endpoint(retryURL,'part','1'),{headers:{Origin:base,'Content-Type':'application/octet-stream'},data:Buffer.alloc(13),maxRedirects:0});assert.equal(response.status(),409);
  response=await context.request.post(endpoint(retryURL,'finish'),{headers:{Origin:base},maxRedirects:0});assert.equal(response.status(),409);
  const part=Buffer.alloc(CHUNK,97);part[0]=0;part[1]=255;
  for(let attempt=0;attempt<2;attempt++){response=await context.request.post(endpoint(retryURL,'part','0'),{headers:{Origin:base,'Content-Type':'application/octet-stream'},data:part,maxRedirects:0});assert.equal(response.status(),204);}
  response=await context.request.post(endpoint(retryURL,'start'),{headers:{Origin:base},form:{name:'retry.bin',size:String(CHUNK+13)},maxRedirects:0});assert.equal(await response.text(),'1');
  response=await context.request.post(endpoint(retryURL,'part','1'),{headers:{Origin:base,'Content-Type':'application/octet-stream'},data:Buffer.alloc(12),maxRedirects:0});assert.equal(response.status(),409);
  response=await context.request.post(endpoint(retryURL,'part','1'),{headers:{Origin:base,'Content-Type':'application/octet-stream'},data:Buffer.alloc(13,98),maxRedirects:0});assert.equal(response.status(),204);
  for(let attempt=0;attempt<2;attempt++){response=await context.request.post(endpoint(retryURL,'finish'),{headers:{Origin:base},maxRedirects:0});assert.equal(response.status(),303);}
  const retryId=retryURL.searchParams.get('id');response=await context.request.get(base+'/media?id='+retryId);assert.deepEqual(await response.body(),Buffer.concat([part,Buffer.alloc(13,98)]));
  pass('Out-of-order, incomplete and wrong-size parts are rejected; retry and finish are idempotent');
  clearInterval(sampler);sampler=null;readRSS();
  const result={size:MAX,parts:64,sha256:expected,uploadMilliseconds,totalMilliseconds:Date.now()-started,peakServerRssKiB:peakRssKiB,id,retryId};
  save('large',result);fs.writeFileSync(path.join(output,'large-transfer.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 } finally {if(sampler)clearInterval(sampler);await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
