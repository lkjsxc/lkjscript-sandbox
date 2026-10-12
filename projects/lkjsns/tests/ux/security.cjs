const {chromium,base,root,fixture,fs,path,assert,form,fields,click,goto,pass,session,load,save,crypto}=require('./support.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const owner=await session(browser),member=await session(browser,'member'),guest=await browser.newContext();const p=await owner.newPage();
  await goto(p,'/settings/profile');const profile=await fields(p,'profile');
  for(const origin of ['https://example.invalid','null','']) {
   const headers=origin?{Origin:origin}:{};
   const response=await owner.request.post(base+'/action',{headers,form:{...profile,display:'Must not be saved'},maxRedirects:0});assert.equal(response.status(),403);
  }
  let response=await owner.request.post(base+'/action',{headers:{Origin:base},form:{...profile,csrf:'wrong',display:'Must not be saved'},maxRedirects:0});assert.equal(response.status(),403);
  for(const [field,value] of [['display','Overwrite'],['admin','true']]) {
   const params=new URLSearchParams(profile);params.append(field,value);
   response=await owner.request.post(base+'/action',{headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},data:params.toString(),maxRedirects:0});assert.equal(response.status(),422);
  }
  await goto(p,'/settings/profile');assert.equal(await p.locator('[name=display]').inputValue(),profile.display);
  pass('Origin, CSRF and exact duplicate/unknown-field admission protect profile writes');
  assert.equal((await owner.request.get(base+'/',{headers:{Host:'example.invalid'}})).status(),400);
  assert.equal((await owner.request.get(base+'/note?id=a&id=b')).status(),400);
  const media=load('media'),posts=load('posts');
  for(const route of ['/file?id='+media.textId,'/media?id='+media.textId,'/compose?id='+posts.protectedDraft,'/delete?kind=post&id='+posts.protectedDraft]) {
   assert.equal((await member.request.get(base+route,{maxRedirects:0})).status(),404,route);
  }
  assert.equal((await guest.request.get(base+'/media?id='+media.textId)).status(),404);
  assert.equal((await member.request.get(base+'/delete?kind=file&id='+media.textId)).status(),404);
  pass('Direct file, draft, edit and delete URLs enforce ownership independently of the UI');
  await goto(p,'/upload');const action=new URL(await p.locator('form[enctype="multipart/form-data"]').getAttribute('action'),base);
  const params=action.searchParams;params.delete('folder');const start=new URL('/upload/start',base);start.search=params.toString();
  response=await member.request.post(start.href,{headers:{Origin:base},form:{name:'foreign.bin',size:'1'},maxRedirects:0});assert.equal(response.status(),403);
  const bad=new URL(start);bad.searchParams.set('proof','wrong');
  response=await owner.request.post(bad.href,{headers:{Origin:base},form:{name:'wrong.bin',size:'1'},maxRedirects:0});assert.equal(response.status(),403);
  response=await owner.request.post(start.href,{headers:{Origin:'https://example.invalid'},form:{name:'cross-origin.bin',size:'1'},maxRedirects:0});assert.equal(response.status(),403);
  pass('Chunk upload capability is bound to owner, unpredictable file ID, CSRF-derived proof and same origin');
  const page=await goto(p,'/settings');const headers=page.headers();
  assert(headers['content-security-policy'].includes("script-src 'self'"));assert(headers['content-security-policy'].includes("connect-src 'self'"));
  assert(headers['cache-control'].includes('no-store'));assert.equal(headers['x-content-type-options'],'nosniff');assert.equal(headers['referrer-policy'],'same-origin');
  for(const [url,file] of [['/style.css','style.css'],['/ui.js','ui.js'],['/transfer.js','transfer.js']]) {
   response=await owner.request.get(base+url);assert.deepEqual(await response.body(),fs.readFileSync(path.join(root,'web',file)));
  }
  pass('Native CSS and JavaScript assets match the authored bytes and retain privacy/security headers');
  // A duplicate version causes a branded error without irrelevant navigation buttons.
  await goto(p,'/settings/profile');const current=await fields(p,'profile');
  response=await owner.request.post(base+'/action',{headers:{Origin:base},form:{...current,version:'0'},maxRedirects:0});assert.equal(response.status(),409);
  const body=await response.text();
  const controls=body.match(/<a[^>]*class="button[^"]*"[^>]*>(?:Home|Sign in)<\/a>/g)||[];assert.deepEqual(controls,[]);
  pass('Conflict pages preserve the application appearance without Home or Sign-in buttons');
  // Password rotation is exercised last; keep fresh cookie state for subsequent suites.
  const accounts=load('accounts');await goto(p,'/settings/security');const pwd=form(p,'password');const replacement=crypto.randomBytes(24).toString('hex');
  await pwd.locator('[name=old]').fill(accounts.owner.password);await pwd.locator('[name=password]').fill(replacement);await pwd.locator('[name=confirm]').fill(replacement);
  const old=await session(browser);await click(p,pwd.locator('button'));
  response=await old.request.get(base+'/settings',{maxRedirects:0});assert.equal(response.status(),303);assert.equal(response.headers().location,'/login');
  await goto(p,'/login');await p.locator('[name=handle]').fill(accounts.owner.handle);await p.locator('[name=password]').fill(replacement);await click(p,form(p,'login').locator('button'));
  await goto(p,'/settings');accounts.owner.password=replacement;save('accounts',accounts);await owner.storageState({path:path.join(fixture,'owner.session.json')});
  pass('Password child rotates credentials and invalidates previous sessions');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
