// Real native interactions on an isolated store; no public test writes.
const {chromium,base,fixture,output,fs,path,assert,form,fields,click,goto,pass,session,load,save,createPost,resourceId,shortPostId,crypto}=require('./support.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const owner=await session(browser),member=await session(browser,'member'),guest=await browser.newContext({locale:'en-US'});
  const p=await owner.newPage();p.setDefaultTimeout(25000);const media=load('media'),posts=load('posts');
  for(const route of ['/search','/saved','/settings','/drive','/drafts','/people','/admin','/admin/invitations','/settings/avatar','/settings/profile','/settings/security','/'+posts.publicId,'/'+media.textId]) {
   await goto(p,route);assert.equal(await p.locator('.page-header').count(),0,route);
   assert(await p.locator('main h1').evaluate(e=>e.classList.contains('sr-only')&&e.getBoundingClientRect().width<=1),route);
   assert((await p.title()).includes('lkjsns'),route);
  }
  await goto(p,'/drive');assert.equal(await p.locator('.nav a[href="/drive"]').count(),1);assert.equal(await p.locator('.mobile-nav a[href="/drive"]').count(),0);assert.deepEqual(await p.locator('.mobile-nav a').allTextContents(),['Home','Post','Notifications','More']);
  assert.equal(await p.locator('.nav a[href="/drive"]').getAttribute('aria-current'),'page');
  pass('Every normal page omits its title banner; Drive stays on desktop and mobile uses the four-item dock');
  await goto(p,'/drafts');assert.equal(new URL(p.url()).pathname,'/compose');
  assert.equal(await p.locator('a[href="/drafts"]').count(),0);
  await goto(p,'/'+posts.protectedDraft);assert.equal(await p.locator('[name=body]').inputValue(),'Newest private draft nebula.');
  const noScripts=await session(browser,'owner',{javaScriptEnabled:false});const np=await noScripts.newPage();
  await goto(np,'/'+posts.protectedDraft+'/preview');assert.equal(await np.locator('[name=body]').inputValue(),'Newest private draft nebula.');
  assert.equal(await np.locator('.preview-card,.preview-summary').count(),0);await noScripts.close();
  pass('No draft list is exposed; existing private working copies and old preview URLs remain safely editable without scripts');
  for(const [legacy,canonical] of [['/note?id='+posts.publicId,'/'+posts.publicId],['/file?id='+media.textId,'/'+media.textId],['/compose?id='+posts.protectedDraft,'/'+posts.protectedDraft+'/edit'],['/media?id='+media.textId,'/'+media.textId+'/raw']]) {
   const r=await owner.request.get(base+legacy,{maxRedirects:0});assert.equal(r.status(),303);assert.equal(r.headers().location,canonical);
  }
  await goto(p,'/');const links=await p.locator('main a[href]').evaluateAll(es=>es.map(e=>e.getAttribute('href')));
  assert(!links.some(x=>/^\/(note|file)\?/.test(x)));assert.equal(await p.locator(`article.note[data-href="/${posts.publicId}"]`).count(),1);
  const unchanged=await owner.request.get(base+'/'+media.textId+'/raw');assert.equal(unchanged.status(),200);
  assert.equal((await guest.request.get(base+'/'+media.textId+'/raw')).status(),404);
  assert.equal((await member.request.get(base+'/'+posts.protectedDraft)).status(),404);
  assert.equal((await member.request.get(base+'/'+media.textId)).status(),404);
  assert.equal((await owner.request.get(base+'/'+posts.publicId+'?id='+posts.membersId)).status(),400);
  assert.equal((await owner.request.get(base+'/'+posts.publicId+'?cursor=0&cursor=1')).status(),400);
  assert.equal((await owner.request.get(base+'/'+'f'.repeat(64))).status(),404);
  assert.equal((await owner.request.head(base+'/'+media.textId+'/raw',{maxRedirects:0})).status(),405);
  pass('Canonical root-ID pages and raw paths preserve legacy links, ownership, contextual access and strict query admission');
  await goto(p,'/compose?reply='+posts.publicId);assert.equal(await p.getByText(/View original post|Open original post|View the original post/).count(),0);
  assert.equal(await p.locator('.parent-card').getAttribute('href'),'/'+posts.publicId);
  await p.locator('[name=body]').fill('A reply with direct original context.');const body=await fields(p,'note');
  let response=await owner.request.post(base+'/action',{headers:{Origin:base},form:{...body,mode:'publish'},maxRedirects:0});assert.equal(response.status(),303);
  const reply=shortPostId(body.id);await goto(p,'/'+reply);assert.equal(await p.locator('.parent-card').getAttribute('href'),'/'+posts.publicId);
  assert.equal(await p.getByText(/View original post|Open original post|View the original post/).count(),0);
  pass('Reply context is directly linked without a separate original-post button');
  await goto(p,'/compose');await p.locator('[name=body]').fill('Tap previews to select reusable files.');await click(p,p.getByRole('button',{name:'Attach file',exact:true}));
  const selectedDraft=new URL(p.url()).searchParams.get('draft');const candidates=[media.avatarId,media.textId,...media.unsafeIds.slice(0,3)];
  for(let i=0;i<4;i++){
   const tile=p.locator('#file-'+candidates[i]+' .media-choice');assert.equal(await tile.getAttribute('aria-pressed'),'false');assert.equal(await tile.locator('a,button,input').count(),0);
   if(i===1){await tile.focus();await Promise.all([p.waitForNavigation(),p.keyboard.press('Space')]);}
   else await click(p,tile.locator('.file-thumb'));
   assert.equal(await p.locator('#file-'+candidates[i]+' .media-choice').getAttribute('aria-pressed'),'true');
  }
  assert.equal(await p.locator('#file-'+candidates[4]+' .media-choice').isDisabled(),true);
  assert.equal(await p.getByRole('button',{name:'Attach',exact:true}).count(),0);assert.equal(await p.getByRole('button',{name:'Remove',exact:true}).count(),0);
  await click(p,p.locator('#file-'+candidates[0]+' .media-choice .file-thumb'));assert.equal(await p.locator('#file-'+candidates[0]+' .media-choice').getAttribute('aria-pressed'),'false');
  await click(p,p.locator('.tag-chips a').filter({hasText:/^travel$/}));assert.equal(await p.locator('.selected-tray .media-choice').count(),3);
  await click(p,p.locator('.selected-tray .media-choice').first());assert.equal(await p.locator('.selected-tray .media-choice').count(),2);
  await goto(p,'/'+selectedDraft);assert.equal(await p.locator('[name=body]').inputValue(),'Tap previews to select reusable files.');
  pass('Image tiles select and deselect directly, retain tag-filtered selection, support Space and respect the four-file limit');
  await goto(p,'/file?id='+media.avatarId);assert.equal(await p.getByRole('button',{name:'Use as profile image',exact:true}).count(),0);
  await goto(p,'/settings/profile');assert.equal(await p.getByRole('link',{name:'Change image',exact:true}).count(),0);
  await click(p,p.getByRole('link',{name:'Change profile image',exact:true}));const choice=form(p,'avatar').filter({has:p.locator('input[name=id][value="'+media.avatarId+'"]')}).locator('.media-choice');
  assert.equal(await choice.getAttribute('aria-pressed'),'true');
  for(const width of [320,390,768,1280]){
   await p.setViewportSize({width,height:900});
   const box=await choice.locator('.file-thumb').boundingBox();
   assert(Math.abs(box.width-box.height)<=1,JSON.stringify({width,box}));
   if(width===1280)assert(box.height<=150,JSON.stringify({width,box}));
  }
  await p.setViewportSize({width:1280,height:1000});
  await choice.focus();await Promise.all([p.waitForNavigation(),p.keyboard.press('Enter')]);
  assert.equal(new URL(p.url()).pathname,'/settings/profile');
  pass('Profile image itself opens its picker; the selected preview is the keyboard-accessible action');
  // Invitations have no product cap. Empty is deliberately unlimited/never, not zero.
  async function issue(label,uses,days){await goto(p,'/admin/invitations');const f=form(p,'invite');
   assert.equal(await f.locator('[name=uses]').getAttribute('max'),null);assert.equal(await f.locator('[name=days]').getAttribute('max'),null);
   for(const [n,v]of Object.entries({label,uses,days}))await f.locator('[name='+n+']').fill(v);
   await click(p,f.locator('button'));return new URL(await p.locator('.copy-value').innerText(),base).searchParams.get('invite');}
  await issue('Wide numeric limits','1000000','36500');await issue('Full integer people','9223372036854775807','3650000');
  const unbounded=await issue('Reusable unlimited invitation','','');
  await goto(p,'/admin/invitations');const row=p.locator('.invitation').filter({hasText:'Reusable unlimited invitation'});
  assert((await row.innerText()).includes('Unlimited uses'));assert((await row.innerText()).includes('Never expires'));
  async function joinUser(invite){const c=await browser.newContext();const x=await c.newPage();await goto(x,'/join');const pw=crypto.randomBytes(24).toString('hex');
   for(const [n,v]of Object.entries({handle:'invite_'+crypto.randomBytes(4).toString('hex'),password:pw,confirm:pw,invite}))await x.locator('[name='+n+']').fill(v);
   const r=await click(x,form(x,'join').locator('button'));const result=r.status();await c.close();return result;}
  assert.equal(await joinUser(unbounded),200);assert.equal(await joinUser(unbounded),200);
  await goto(p,'/admin/invitations');assert((await p.locator('.invitation').filter({hasText:'Reusable unlimited invitation'}).innerText()).includes('Unlimited uses'));
  await click(p,p.locator('.invitation').filter({hasText:'Reusable unlimited invitation'}).getByRole('button',{name:'Revoke invitation'}));
  assert.equal(await joinUser(unbounded),403);
  pass('Invitations accept large counts/durations and unlimited reusable nonexpiring links while revocation still works');
  const single=await issue('Single-use forever','1','');assert.equal(await joinUser(single),200);assert.equal(await joinUser(single),403);
  await goto(p,'/admin/invitations');const settings=await fields(p,'invite');
  for(const extra of [{uses:'0'},{uses:'-1'},{uses:'1.5'},{uses:'9223372036854775808'},{days:'9223372036854775807'}]) {
   response=await owner.request.post(base+'/action',{headers:{Origin:base},form:{...settings,label:'Invalid must not be created',uses:'1',days:'7',...extra},maxRedirects:0});assert.equal(response.status(),422);
  }
  response=await member.request.post(base+'/action',{headers:{Origin:base},form:{...settings,csrf:'wrong'},maxRedirects:0});assert.equal(response.status(),403);
  pass('Finite invitation exhaustion and invalid/overflow input remain enforced without arbitrary UI ranges');
  save('direct-interactions',{reply,selectedDraft});await goto(p,'/settings');await p.screenshot({path:path.join(output,'direct-settings.png'),fullPage:true});
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
