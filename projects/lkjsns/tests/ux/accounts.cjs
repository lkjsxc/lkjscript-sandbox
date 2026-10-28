const {resourceId,isResource,isEditor,chromium,base,fixture,output,fs,path,assert,form,click,goto,pass,save,crypto}=require('./support.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const owner=await browser.newContext({locale:'en-US',viewport:{width:1280,height:1000}});
  const p=await owner.newPage(); p.setDefaultTimeout(20000);
  for(const route of ['/','/login','/join','/about','/search','/more','/privacy','/terms','/guidelines','/contact']) {
   await goto(p,route); assert.equal(await p.locator('html').getAttribute('lang'),'en');
  }
  pass('English guest pages and query-only Search');
  const creds={owner:{handle:'testowner',password:crypto.randomBytes(24).toString('hex')}};
  await goto(p,'/join');
  for(const [name,value] of Object.entries({handle:creds.owner.handle,password:creds.owner.password,confirm:creds.owner.password,
   invite:fs.readFileSync(path.join(fixture,'bootstrap.secret'),'utf8').trim()})) await p.locator(`[name=${name}]`).fill(value);
  await click(p,form(p,'join').locator('button')); assert.equal(new URL(p.url()).pathname,'/');
  pass('Real browser bootstrap registration');
  assert.deepEqual(await p.locator('.nav a').allTextContents(),['Home','Search','Notifications','Bookmarks','Drive','Settings','More']);
  assert.equal(await p.locator('.account-identity').getAttribute('href'),'/@testowner');
  assert((await p.locator('h1').getAttribute('class')).includes('sr-only')); assert.equal(await p.getByRole('link',{name:'Refresh',exact:true}).count(),0);
  pass('Primary navigation and account identity destinations');
  await goto(p,'/settings'); assert.equal(await p.locator('h1').innerText(),'Settings');
  assert.equal(await p.locator('input[name=password]').count(),0);
  assert.deepEqual(await p.locator('a.settings-row').evaluateAll(es=>es.map(e=>e.getAttribute('href'))),['/settings/profile','/settings/security']);
  await goto(p,'/more');for(const route of ['/search','/saved','/drive','/people','/settings','/admin','/about','/privacy','/terms','/guidelines','/contact']) assert.equal(await p.locator(`main .settings-row[href="${route}"]`).count(),1,route);
  assert.equal(await p.locator('a[href="/drafts"]').count(),0);
  pass('More contains navigation and service information; Settings contains only settings');
  await goto(p,'/settings/profile'); await p.locator('[name=display]').fill('Alex Morgan'); await p.locator('[name=bio]').fill('A quiet place to share things.');
  await click(p,form(p,'profile').locator('button')); assert.equal(new URL(p.url()).pathname,'/@testowner');
  assert.equal(await p.locator('.profile>h2').innerText(),'Alex Morgan');assert.equal(await form(p,'profile').count(),0);
  await goto(p,'/@testowner'); assert((await p.locator('h1').getAttribute('class')).includes('sr-only'));
  pass('Profile settings child and nonredundant public profile heading');
  await goto(p,'/settings/security'); assert.equal(await p.locator('[name=old]').count(),1);
  await goto(p,'/admin'); assert.equal(await p.locator('h1').innerText(),'Admin');
  assert.equal(await form(p,'invite').count(),0); assert(await p.locator('a[href="/admin/invitations"]').count());
  await goto(p,'/admin/invitations'); const issue=form(p,'invite');
  for(const [name,value] of Object.entries({label:'Synthetic acceptance',uses:'3',days:'1'})) await issue.locator(`[name=${name}]`).fill(value);
  await click(p,issue.locator('button')); const link=await p.locator('.copy-value').innerText();
  const invite=new URL(link,base).searchParams.get('invite'); assert(invite);
  pass('Admin overview and Invitations child');
  for(const role of ['member','other']) {
   const context=await browser.newContext({locale:'en-US'});const member=await context.newPage();
   creds[role]={handle:'test'+role,password:crypto.randomBytes(24).toString('hex')};
   await goto(member,'/join');
   for(const [name,value] of Object.entries({handle:creds[role].handle,password:creds[role].password,confirm:creds[role].password,invite})) await member.locator(`[name=${name}]`).fill(value);
   await click(member,form(member,'join').locator('button'));assert.equal(new URL(member.url()).pathname,'/');
   for(const route of ['/admin','/admin/invitations']) {const r=await context.request.get(base+route);assert.equal(r.status(),403);assert((await r.text()).includes('lkjsns'));}
   await context.storageState({path:path.join(fixture,role+'.session.json')});await context.close();
  }
  save('accounts',creds);await owner.storageState({path:path.join(fixture,'owner.session.json')});
  pass('Member registration and admin authorization');
  for(const route of ['/does-not-exist','/settings/not-a-page','/one/two/three/four']) {
   const r=await p.goto(base+route);assert.equal(r.status(),404);assert((await p.locator('body').innerText()).includes('lkjsns'));
  }
  pass('Native branded unavailable-page routes');
  await goto(p,'/settings');await p.screenshot({path:path.join(output,'settings-desktop.png'),fullPage:true});
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
