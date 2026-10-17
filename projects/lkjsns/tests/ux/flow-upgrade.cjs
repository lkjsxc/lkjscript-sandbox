// Exact preceding live bundle -> short post addresses. Isolated loopback only.
'use strict';
const {chromium,base,fixture,output,fs,path,assert,form,fields,click,goto,session,submit,createPost,save,load,crypto,shortPostId,resourceId,pass}=require('./support.cjs');
const phase=process.argv[2];assert(['before','after'].includes(phase));
const action=async(context,data,status=303)=>{const r=await context.request.post(base+'/action',{form:data,headers:{Origin:base},maxRedirects:0});assert.equal(r.status(),status,(await r.text()).slice(0,600));return r;};
(async()=>{const browser=await chromium.launch({headless:true});try{
 if(phase==='before'){
  const owner=await browser.newContext({javaScriptEnabled:false}),p=await owner.newPage();
  const accounts={owner:{handle:'testowner',password:crypto.randomBytes(24).toString('hex')},member:{handle:'testmember',password:crypto.randomBytes(24).toString('hex')}};
  await goto(p,'/join');await action(owner,{...await fields(p,'join'),...accounts.owner,confirm:accounts.owner.password,invite:fs.readFileSync(path.join(fixture,'bootstrap.secret'),'utf8').trim()});
  await goto(p,'/settings/profile');await submit(p,'profile',{display:'Before short addresses',bio:'This account and its password must survive the URL change.'});
  await goto(p,'/admin/invitations');for(const [name,value]of Object.entries({label:'Private reading-flow upgrade',uses:'2',days:'1'}))await form(p,'invite').locator(`[name=${name}]`).fill(value);await click(p,form(p,'invite').locator('button'));
  const invite=new URL(await p.locator('.copy-value').innerText(),base).searchParams.get('invite');
  const member=await browser.newContext({javaScriptEnabled:false}),m=await member.newPage();await goto(m,'/join');await action(member,{...await fields(m,'join'),...accounts.member,confirm:accounts.member.password,invite});
  const original=await createPost(p,'Legacy parent message retained through short-address migration.','public');
  const privatePost=await createPost(p,'Legacy member-only post stays member-only.','members');
  const unpublished=await createPost(p,'Legacy unpublished text stays private.','members','draft');
  await goto(m,'/compose?reply='+original);await m.locator('[name=body]').fill('Legacy child remains linked to its original parent.');await click(m,m.getByRole('button',{name:'Post',exact:true}));const child=resourceId(m.url());
  await goto(p,'/'+child);await click(p,form(p,'bookmark').locator('button'));
  await goto(p,'/upload');const image=path.join(output,'media','landscape-1.png');await p.locator('input[type=file]').setInputFiles(image);await click(p,p.getByRole('button',{name:'Upload',exact:true}));const media=resourceId(p.url());
  await goto(p,'/compose');const seed=await fields(p,'note'),ids=[];
  for(let i=0;i<34;i++){const id=crypto.randomBytes(32).toString('hex');await action(owner,{...seed,id,version:'0',reply:'',body:'Legacy indexed post '+String(i).padStart(2,'0'),cw:'',audience:'public',mode:'publish'});ids.push(id);}
  await goto(p,'/compose');const data=await fields(p,'note');await action(owner,{...data,body:'Legacy media post.',audience:'public',mode:'picker'});
  await action(owner,{intent:'attach',csrf:data.csrf,draft:data.id,id:media,version:'1',enabled:'1',destination:'compose'});await action(owner,{...data,version:'2',body:'Legacy media post.',audience:'public',mode:'publish'});
  await owner.storageState({path:path.join(fixture,'owner.session.json')});await member.storageState({path:path.join(fixture,'member.session.json')});
  const avatar=await owner.request.get(base+'/avatar?user=testowner');
  save('flow-upgrade',{accounts,original,privatePost,unpublished,child,ids,media,mediaPost:data.id,mediaSha:crypto.createHash('sha256').update(fs.readFileSync(image)).digest('hex'),avatar:(await avatar.body()).toString('base64')});
  assert([original,privatePost,unpublished,child,data.id,...ids].every(id=>/^[a-f0-9]{64}$/.test(id)));
  pass('Preceding live artifact creates legacy posts, replies, private working copies, bookmarks and referenced media through actual native forms');
 }else{
  const state=load('flow-upgrade'),owner=await session(browser),member=await session(browser,'member'),guest=await browser.newContext({javaScriptEnabled:false});const p=await owner.newPage(),m=await member.newPage(),g=await guest.newPage();
  await goto(p,'/@testowner');assert.equal(await p.locator('.profile>h2').innerText(),'Before short addresses');
  for(const id of [state.original,state.privatePost,state.unpublished,state.child,state.mediaPost,...state.ids]){
   const short=shortPostId(id);assert.equal(short.length,16);
   const r=await owner.request.get(base+'/'+id,{maxRedirects:0});assert.equal(r.status(),303);assert.equal(r.headers().location,'/'+short);
   const direct=await owner.request.get(base+'/'+short);assert.equal(direct.status(),200);
  }
  await goto(p,'/'+shortPostId(state.child));assert.equal(await p.locator('.note-detail .parent-card').getAttribute('href'),'/'+shortPostId(state.original));
  await goto(p,'/'+shortPostId(state.original));assert.equal(await p.locator('.reply-list #post-'+shortPostId(state.child)).count(),1);
  await goto(p,'/saved');assert.equal(await p.locator('#post-'+shortPostId(state.child)).count(),1);
  await goto(p,'/'+shortPostId(state.unpublished)+'/edit');assert.equal(await p.locator('[name=body]').inputValue(),'Legacy unpublished text stays private.');
  for(const id of [state.privatePost,state.unpublished])assert.equal((await guest.request.get(base+'/'+shortPostId(id))).status(),404);
  assert.equal((await member.request.get(base+'/'+shortPostId(state.unpublished)+'/edit')).status(),404);
  for(const note of [state.mediaPost,shortPostId(state.mediaPost)]){const r=await guest.request.get(base+'/'+state.media+'/raw?note='+note);assert.equal(r.status(),200);assert.equal(crypto.createHash('sha256').update(await r.body()).digest('hex'),state.mediaSha);}
  assert.equal((await guest.request.get(base+'/'+state.media+'/raw')).status(),404); // A guest still needs an explicitly readable post-reference context.
  pass('All old addresses redirect to 16-character URLs; indexed replies, bookmarks, working-copy ownership and media references keep their original state');
  await goto(m,'/compose?reply='+shortPostId(state.original));await m.locator('[name=body]').fill('New short-ID reply to a legacy parent.');await click(m,m.getByRole('button',{name:'Post',exact:true}));const child=resourceId(m.url());assert(/^[0-9abcdefghjkmnpqrstvwxyz]{16}$/.test(child));
  await goto(p,'/'+shortPostId(state.original));assert.equal(await p.locator('.reply-list #post-'+child).count(),1);
  await goto(p,'/'+shortPostId(state.original)+'/edit');await p.locator('[name=body]').fill('Edited legacy parent keeps its short public URL.');await click(p,p.getByRole('button',{name:'Save changes',exact:true}));assert.equal(new URL(p.url()).pathname,'/'+shortPostId(state.original));
  const avatar=await owner.request.get(base+'/avatar?user=testowner');assert.equal((await avatar.body()).toString('base64'),state.avatar);
  const fresh=await browser.newContext(),login=await fresh.newPage();await goto(login,'/login');await action(fresh,{...await fields(login,'login'),...state.accounts.owner});await goto(login,'/@testowner');
  pass('New short-ID replies target legacy parents, editing retains the same public address, and prior session/password/avatar remain usable');
  // Force the otherwise improbable 80-bit alias collision in synthetic records.
  await goto(p,'/compose');const seed=await fields(p,'note');const prefix=crypto.randomBytes(10).toString('hex'),left=prefix+'1'.repeat(44),right=prefix+'2'.repeat(44);
  await action(owner,{...seed,id:left,body:'Collision owner remains unchanged.',mode:'publish'});
  await action(owner,{...seed,id:right,body:'Colliding record must not replace the owner.',mode:'publish'},409);
  await goto(p,'/'+shortPostId(left));assert((await p.locator('.note-body').innerText()).includes('Collision owner remains unchanged.'));
  assert.equal((await owner.request.get(base+'/'+right)).status(),404);
  assert.equal((await owner.request.get(base+'/note?id='+right,{maxRedirects:0})).status(),404);
  assert.equal((await owner.request.get(base+'/compose?id='+right,{maxRedirects:0})).status(),404);
  pass('A forced 80-bit address collision is rejected without overwriting or exposing a different post');
  save('flow-upgrade-after',{newReply:child,shortParent:shortPostId(state.original)});
 }
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
