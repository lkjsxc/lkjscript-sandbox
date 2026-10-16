// Historical-artifact upgrade proof. Runs only in a fresh loopback fixture.
'use strict';
const {chromium,base,fixture,output,fs,path,assert,form,fields,click,goto,pass,session,submit,createPost,save,load,crypto}=require('./support.cjs');
const phase=process.argv[2];assert(['before','after'].includes(phase));
const action=async(context,data)=>{const r=await context.request.post(base+'/action',{form:data,headers:{Origin:base},maxRedirects:0});assert.equal(r.status(),303,(await r.text()).slice(0,700));return r;};
(async()=>{const browser=await chromium.launch({headless:true});try{
 if(phase==='before'){
  const accounts=[];let invite=fs.readFileSync(path.join(fixture,'bootstrap.secret'),'utf8').trim();
  for(let i=0;i<8;i++){
   const handle=i===0?'testowner':`legacy-person${i}`,password=crypto.randomBytes(24).toString('hex');
   const context=await browser.newContext(),p=await context.newPage();await goto(p,'/join');
   await action(context,{...await fields(p,'join'),handle,password,confirm:password,invite});await goto(p,'/settings/profile');
   await submit(p,'profile',{display:i===0?'Legacy owner':'Legacy person '+i,bio:'Preserved before attention indexing.'});
   if(i===0){await goto(p,'/admin/invitations');for(const [name,value]of Object.entries({label:'Private upgrade fixture',uses:'8',days:'1'}))await form(p,'invite').locator(`[name=${name}]`).fill(value);await click(p,form(p,'invite').locator('button'));invite=new URL(await p.locator('.copy-value').innerText(),base).searchParams.get('invite');}
   await context.storageState({path:path.join(fixture,i===0?'owner.session.json':`legacy-${i}.session.json`)});
   accounts.push({handle,password});await context.close();
  }
  const owner=await session(browser),p=await owner.newPage();const postId=await createPost(p,'Legacy post remains readable after attention upgrade.','public');
  for(let i=0;i<8;i++){
   const context=i===0?owner:await browser.newContext({storageState:path.join(fixture,`legacy-${i}.session.json`)}),page=await context.newPage();
   // A 56-edge graph exceeds a native migration batch. Every relationship is a real form.
   for(let j=0;j<8;j++)if(i!==j){await goto(page,'/profile?user='+accounts[j].handle);await action(context,await fields(page,'follow'));}
   await page.close();if(i!==0)await context.close();
  }
  await goto(p,'/notifications?kind=follows');assert.equal(await p.locator('.activity-row').count(),7);
  await goto(p,'/settings/profile');const profile=await fields(p,'profile');
  const avatar=await owner.request.get(base+'/avatar?user=testowner');save('attention-upgrade',{accounts,postId,profile,avatar:(await avatar.body()).toString('base64')});
  pass('Old published artifact created eight accounts, 56 directed relationships, existing notifications, profile, session and post through real forms');
 }else{
  const evidence=load('attention-upgrade'),owner=await session(browser),p=await owner.newPage();
  await goto(p,'/settings/profile');assert.equal(await p.locator('[name=display]').inputValue(),evidence.profile.display);assert.equal(await p.locator('[name=bio]').inputValue(),evidence.profile.bio);
  assert.equal(await p.locator('[name=version]').inputValue(),evidence.profile.version);
  await goto(p,'/'+evidence.postId);assert((await p.locator('article').first().innerText()).includes('Legacy post remains readable'));
  const avatar=await owner.request.get(base+'/avatar?user=testowner');assert.equal((await avatar.body()).toString('base64'),evidence.avatar);
  for(const account of evidence.accounts){
   for(const direction of ['to','from']){await goto(p,`/attention?user=${account.handle}&direction=${direction}`);const actual=await p.locator('.attention-person').evaluateAll(es=>es.map(e=>new URL(e.href).searchParams.get('user')).sort());assert.deepEqual(actual,evidence.accounts.map(a=>a.handle).filter(h=>h!==account.handle).sort());}
  }
  await goto(p,'/notifications?kind=people-attention');assert.equal(await p.locator('.activity-row').count(),7);assert((await p.locator('.activity-row').allTextContents()).every(t=>t.includes('started paying attention to you')));
  pass('All 56 legacy relationships are available in both indexed directions; prior sessions, profile version, avatar, posts and old notification meaning are preserved');
  // A normal mutation emits the new account format without losing credentials or relations.
  await goto(p,'/settings/profile');await submit(p,'profile',{bio:'Changed after native attention migration.'});
  const fresh=await browser.newContext(),login=await fresh.newPage();await goto(login,'/login');await action(fresh,{...await fields(login,'login'),handle:evidence.accounts[0].handle,password:evidence.accounts[0].password});
  await goto(login,'/attention?user=testowner&direction=to');assert.equal(await login.locator('.attention-person').count(),7);
  await goto(login,'/settings/profile');assert.equal(await login.locator('[name=bio]').inputValue(),'Changed after native attention migration.');
  pass('A lazily converted account retains the original password, attention graph and fresh sign-in after its first native write');
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
