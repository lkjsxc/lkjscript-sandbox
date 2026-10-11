// Real browser journeys and byte-level assertions against the isolated native app.
const {chromium,root,fixture,base,output}=require('./support.cjs');
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const checks=[],state={};
function pass(name){checks.push(name);fs.writeFileSync(path.join(output,'flows-report.json'),JSON.stringify({passed:checks.length,checks,state},null,2));console.log('PASS',name);}
const form=(p,intent)=>p.locator('form').filter({has:p.locator(`input[name="intent"][value="${intent}"]`)});
async function click(p,button){const [response]=await Promise.all([p.waitForNavigation({waitUntil:'load'}),button.click()]);return response;}
async function goto(p,route){const r=await p.goto(base+route);assert.equal(r.status(),200,route);return r;}
async function english(p){assert.equal(await p.locator('html').getAttribute('lang'),'en');assert(!/[\u3040-\u30ff\u3400-\u9fff]/u.test(await p.locator('body').innerText()),p.url());}
async function fields(p,intent){return form(p,intent).evaluate(f=>Object.fromEntries(new FormData(f).entries()));}
async function upload(p,name,route='/upload'){
 await goto(p,route);await p.locator('input[type=file]').setInputFiles(path.join(output,'media',name));
 const r=await click(p,p.locator('.upload-form button'));assert.equal(r.status(),200,await p.locator('main').innerText());
 assert.equal(new URL(p.url()).pathname,'/file');assert((await p.locator('[role=status]').innerText()).includes('Saved to Drive'));
 return new URL(p.url()).searchParams.get('id');
}
(async()=>{const b=await chromium.launch({headless:true});try{
 const owner=await b.newContext({locale:'en-US',viewport:{width:1440,height:1000},storageState:path.join(fixture,'owner.session.json')});
 const member=await b.newContext({locale:'en-US',viewport:{width:1440,height:1000},storageState:path.join(fixture,'member.session.json')});
 const guest=await b.newContext({locale:'en-US'});const p=await owner.newPage(),m=await member.newPage(),g=await guest.newPage();
 for(const c of [owner,member,guest])c.setDefaultTimeout(20000);
 await goto(p,'/drive');await p.locator('details').filter({has:form(p,'folder')}).locator('summary').click();await form(p,'folder').locator('[name=name]').fill('Sketchbook');
 await click(p,form(p,'folder').locator('button'));await goto(p,'/drive');
 const folder=await p.locator('select[name=folder] option').filter({hasText:'Sketchbook'}).last().getAttribute('value');assert(folder);pass('Create and select a Drive folder');
 await goto(p,'/compose');const body='The blue hour, saved for later.\n\nA small collection of things worth noticing. No rush to post everything at once.';
 await p.locator('textarea[name=body]').fill(body);await p.locator('select[name=audience]').selectOption('public');
 await click(p,p.locator('button[name=mode][value=picker]'));assert.equal(new URL(p.url()).pathname,'/pick');const draft=new URL(p.url()).searchParams.get('draft');state.publicPost=draft;
 assert.equal(await p.locator('h1').innerText(),'Choose attachments');
 await goto(p,'/compose?id='+draft);assert.equal(await p.locator('[name=body]').inputValue(),body);assert.equal(await p.locator('[name=audience]').inputValue(),'public');
 pass('Save text and audience before opening attachment picker');
 const file=await upload(p,'landscape-1.png','/upload?draft='+draft);state.image=file;await english(p);
 const bytes=fs.readFileSync(path.join(output,'media/landscape-1.png'));
 let r=await owner.request.get(base+'/media?id='+file);assert.equal(r.status(),200);assert.deepEqual(await r.body(),bytes);
 for(const ctx of [guest,member])for(const method of ['get','head']){r=await ctx.request[method](base+'/media?id='+file);assert.equal(r.status(),404,'Private file '+method);}
 r=await guest.request.get(base+'/media?id='+file,{headers:{Range:'bytes=0-7'}});assert.equal(r.status(),404);
 pass('Unposted image: exact owner bytes; guest and other-member GET/HEAD/Range denied');
 await p.locator('[name=alt]').fill('Layered blue hills under a clear evening sky.');await p.locator('[name=folder]').selectOption(folder);
 await click(p,form(p,'file').locator('button'));assert.equal(await p.locator('[name=alt]').inputValue(),'Layered blue hills under a clear evening sky.');assert.equal(new URL(p.url()).searchParams.get('draft'),draft);
 pass('File description and folder save preserve draft context');
 await click(p,form(p,'attach').locator('button'));assert.equal(new URL(p.url()).pathname,'/compose');assert.equal(await p.locator('[name=body]').inputValue(),body);
 assert.equal(await p.locator('.composer-attachments img').count(),1);assert(await p.locator('.composer-attachments img').evaluate(e=>e.complete&&e.naturalWidth===640));
 pass('Attach and continue returns to the intact draft with decoded preview');
 await click(p,p.locator('button[name=mode][value=publish]'));assert.equal(new URL(p.url()).pathname,'/note');await english(p);
 await goto(g,'/note?id='+draft);assert((await g.locator('.note-body').first().innerText()).includes('The blue hour'));
 const url=base+'/media?id='+file+'&note='+draft;
 r=await guest.request.get(url);assert.equal(r.status(),200);assert.deepEqual(await r.body(),bytes);
 const head=await guest.request.head(url);assert.equal(head.status(),405);assert.equal(head.headers().allow,'GET');assert.equal((await head.body()).length,0);
 pass('Public posting grants exact guest GET bytes; unsupported HEAD is explicit, not false metadata');
 for(const [range,start,end] of [['bytes=0-7',0,8],['bytes=-16',bytes.length-16,bytes.length],['bytes=8-',8,bytes.length],['bytes=8-99999999',8,bytes.length]]){
  r=await guest.request.get(url,{headers:{Range:range}});assert.equal(r.status(),206,range);assert.deepEqual(await r.body(),bytes.subarray(start,end),range);assert.equal(r.headers()['content-range'],`bytes ${start}-${end-1}/${bytes.length}`);
 }
 for(const range of ['bytes=0-1,5-6','bytes=99999999-','bytes=-0','bytes=8-2']){r=await guest.request.get(url,{headers:{Range:range}});assert.equal(r.status(),416,range);}
 r=await guest.request.get(url,{headers:{Range:'bytes=0-7','If-Range':'"unmatched"'}});assert.equal(r.status(),200);assert.deepEqual(await r.body(),bytes);
 r=await guest.request.head(url,{headers:{Range:'bytes=0-7'}});assert.equal(r.status(),405);assert.equal(r.headers().allow,'GET');
 pass('Whole, open, suffix, clamped and invalid ranges; If-Range and HEAD behavior');
 await goto(p,'/file?id='+file);const details=await fields(p,'file');
 r=await owner.request.post(base+'/action',{headers:{Origin:base},form:{intent:'delete-file',csrf:details.csrf,id:file,version:details.version,confirm:'delete',draft:''},maxRedirects:0});assert([409,422].includes(r.status()));assert((await r.text()).includes('Files in use cannot be deleted'));assert.equal((await owner.request.get(base+'/media?id='+file)).status(),200);pass('Referenced file deletion rejected by server, not only hidden in UI');
 await goto(m,'/note?id='+draft);await click(m,form(m,'bookmark').locator('button'));assert.equal(await form(m,'bookmark').locator('button').getAttribute('aria-pressed'),'true');await goto(m,'/saved');assert((await m.locator('main').innerText()).includes('The blue hour'));
 await goto(m,'/note?id='+draft);await click(m,form(m,'eyes').locator('button'));assert.equal(await form(m,'eyes').locator('button').getAttribute('aria-pressed'),'true');pass('Bookmark and Like persist');
 await goto(m,'/profile?user=testowner');await click(m,form(m,'follow').locator('button'));assert.equal(await form(m,'follow').locator('button').getAttribute('aria-pressed'),'true');
 await goto(m,'/?feed=following');assert((await m.locator('main').innerText()).includes('The blue hour'));pass('Following feed includes followed author');
 await goto(m,'/compose?reply='+draft);await m.locator('[name=body]').fill('The quiet details are the ones that stay with me.');await m.locator('[name=audience]').selectOption('public');
 await click(m,m.locator('button[name=mode][value=publish]'));assert.equal(new URL(m.url()).pathname,'/note');state.reply=new URL(m.url()).searchParams.get('id');
 await goto(p,'/note?id='+draft);assert((await p.locator('main').innerText()).includes('The quiet details'));await goto(p,'/notifications');assert((await p.locator('main').innerText()).includes('replied to your post'));pass('Reply appears in the conversation and native notification list');
 const other=await owner.newPage();await goto(p,'/compose?id='+draft);await goto(other,'/compose?id='+draft);
 await p.locator('[name=body]').fill(body+'\n\nAn edit from the first tab.');await click(p,p.locator('button[name=mode][value=publish]'));
 const pending='Text from the second tab must not disappear.';await other.locator('[name=body]').fill(pending);r=await click(other,other.locator('button[name=mode][value=publish]'));assert.equal(r.status(),409);
 assert.equal(await other.locator('[name=body]').inputValue(),pending);assert((await other.locator('.conflict').innerText()).includes('An edit from the first tab'));
 pass('Stale edit returns 409 with submitted and current text preserved');await other.close();
 await goto(p,'/compose');await p.locator('[name=body]').fill('A private update for members.');await click(p,p.locator('button[name=mode][value=picker]'));const privateDraft=new URL(p.url()).searchParams.get('draft');state.membersPost=privateDraft;
 const card=p.locator('.file-card').filter({has:p.locator(`a[href*="id=${file}"]`)});await click(p,card.locator('form button'));await goto(p,'/compose?id='+privateDraft);await click(p,p.locator('button[name=mode][value=publish]'));
 r=await guest.request.get(base+'/note?id='+privateDraft);assert.equal(r.status(),404);r=await member.request.get(base+'/media?id='+file+'&note='+privateDraft);assert.equal(r.status(),200);r=await guest.request.get(base+'/media?id='+file+'&note='+privateDraft);assert.equal(r.status(),404);pass('Members post and reused attachment enforce audience independently');
 await goto(p,'/compose?id='+draft);await p.locator('.destructive summary').click();await form(p,'delete-note').locator('[name=confirm]').check();await click(p,form(p,'delete-note').locator('button'));
 for(const method of ['get','head']){r=await guest.request[method](url);assert.equal(r.status(),404);}
 r=await guest.request.get(url,{headers:{Range:'bytes=0-7'}});assert.equal(r.status(),404);r=await owner.request.get(base+'/media?id='+file);assert.equal(r.status(),200);
 pass('Deleting final public reference revokes guest GET/HEAD/Range while retaining private original');
 for(const [name,type] of [['motion.webm','video'],['tone.wav','audio']]){
  const media=await upload(p,name);state[type]=media;const element=p.locator(type);assert.equal(await element.count(),1);assert.equal(await element.getAttribute('autoplay'),null);
  await element.evaluate(async e=>{await e.play();});await p.waitForTimeout(200);assert((await element.evaluate(e=>e.currentTime))>0);await element.evaluate(e=>e.pause());
  pass(type+' upload decodes and plays on explicit action, without autoplay');
 }
 for(const name of ['not-an-image.png','vector.svg']){
  await goto(p,'/upload');await p.locator('input[type=file]').setInputFiles(path.join(output,'media',name));r=await click(p,p.locator('.upload-form button'));assert([415,422].includes(r.status()),name+' '+r.status());await english(p);
 }
 pass('HTML disguised as PNG and SVG are rejected through real multipart forms');
 await goto(p,'/');await p.screenshot({path:path.join(output,'home-populated-desktop.png'),fullPage:true});
 await goto(p,'/drive');await p.screenshot({path:path.join(output,'drive-desktop.png'),fullPage:true});
 await owner.storageState({path:path.join(fixture,'owner.session.json')});await member.storageState({path:path.join(fixture,'member.session.json')});
 fs.writeFileSync(path.join(fixture,'flow-state.json'),JSON.stringify(state),{mode:0o600});
 console.log(JSON.stringify({passed:checks.length}));
 }finally{await b.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1});
