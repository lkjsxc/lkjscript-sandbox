const {iconPaths,iconRevision}=require('./icon-paths.cjs');
const {resourceId,isResource,isEditor,chromium,base,assert,click,goto,pass,session,load}=require('./support.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const context=await session(browser);const state=await context.storageState();await context.close();
  const clean=await browser.newContext({storageState:{cookies:state.cookies,origins:[]}});const p=await clean.newPage();
  await goto(p,'/settings/profile');assert.equal(await p.locator('[name=display]').inputValue(),'Alex Morgan');
  const media=load('media');await goto(p,'/file?id='+media.textId);assert.equal(await p.locator('[name=tags]').inputValue(),'travel, work, 日本語');
  const avatar=await clean.request.get(base+'/avatar?user=testowner');assert.equal(avatar.status(),200);assert(avatar.headers()['content-type'].startsWith('image/'));
  await goto(p,'/search?q='+encodeURIComponent('日本語の検索'));
  // Later suites add more than one bounded search window. Use the real Next
  // links rather than assuming this early specimen remains on the first page.
  const target=p.locator('#post-'+load('search').japanese);let pages=0;
  while(await target.count()===0 && await p.getByRole('link',{name:/^(Older|Next)$/}).count()) {
   assert(++pages<=8,'Search must find the retained specimen within this bounded fixture');
   await click(p,p.getByRole('link',{name:/^(Older|Next)$/}).last());
  }
  assert.equal(await target.count(),1);assert((await target.innerText()).includes('日本語の検索'));

  await goto(p,'/compose');assert.equal(await p.locator('[name=audience]').inputValue(),load('expected-audience').value);
  pass('Native restart preserves profile, private tags, avatar, search and signed-in access');
  const large=load('large');const r=await clean.request.get(base+'/media?id='+large.id,{headers:{Range:'bytes=0-13'}});assert.equal(r.status(),206);assert((await r.body()).toString().startsWith('lkjsns-part-0-'));
  pass('Chunked media remains readable after a native server restart');
  const pending=load('pending-transfer');const url=new URL(pending.url);
  const endpoint=kind=>{const target=new URL(url);target.pathname='/upload/'+kind;return target;};
  let response=await clean.request.post(endpoint('start').href,{headers:{Origin:base},form:{name:'restart-pending.bin',size:String(pending.size)},maxRedirects:0});
  assert.equal(response.status(),200);assert.equal(await response.text(),'1');
  const part=endpoint('part');part.searchParams.set('part','1');
  response=await clean.request.post(part.href,{headers:{Origin:base,'Content-Type':'application/octet-stream'},data:Buffer.alloc(9,44),maxRedirects:0});assert.equal(response.status(),204);
  response=await clean.request.post(endpoint('finish').href,{headers:{Origin:base},maxRedirects:0});assert.equal(response.status(),303);
  response=await clean.request.get(base+'/media?id='+resourceId(url));assert.deepEqual(await response.body(),Buffer.concat([Buffer.alloc(4*1024*1024,33),Buffer.alloc(9,44)]));
  pass('A pending upload resumes from its durable part acknowledgement after native restart');
  const replies=load('reply-regressions');await goto(p,'/'+replies.child);assert.equal(await p.locator('.note-detail .parent-card').getAttribute('href'),'/'+replies.parent);assert.equal(await p.locator('.reply-list #post-'+replies.nested).count(),1);assert.equal(await p.locator('head link[rel=icon][type="image/svg+xml"]').getAttribute('href'),iconPaths.svg);
  assert.equal((await clean.request.get(base+'/favicon.ico')).status(),200);pass('Reply context, nested thread membership and favicon delivery survive a native restart');

  const attention=load('attention');await goto(p,'/@testowner/attention/from');
  const readPeople=()=>p.locator('.attention-person').evaluateAll(es=>es.map(e=>new URL(e.href).pathname.split('/')[1].slice(1)));
  const first=await readPeople();assert.deepEqual(first,attention.firstPage);
  await click(p,p.getByRole('link',{name:/^(Older|Next)$/}).last());const second=await readPeople();
  assert.equal(new Set([...first,...second]).size,attention.expectedIncoming);
  await goto(p,'/@testowner/attention/to');assert.deepEqual(await readPeople(),['testmember']);
  pass('Both attention indexes, relation state and paginated member lists survive a native server restart');

  const flow=load('reading-flow');await goto(p,'/'+flow.child);assert.equal(await p.locator('.note-detail .parent-card').getAttribute('href'),'/'+flow.parent);assert.equal(await p.locator('[data-post-back]').count(),1);
  await goto(p,'/'+flow.draft+'/edit');assert.equal(await p.locator('[name=body]').inputValue(),'Keep this writing context through file settings.');
  pass('Short post IDs, stacked reply identity, Back links and unpublished working copies survive native restart');

 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
