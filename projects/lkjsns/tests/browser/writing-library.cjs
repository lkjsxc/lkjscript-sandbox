// Writing and library acceptance through real, isolated native HTTP workflows.
const {chromium,base,fixture,output,fs,path,assert,form,click,goto,fields}=require('./support.cjs');
const checks=[];
function pass(name){checks.push(name);console.log('PASS',name);fs.writeFileSync(path.join(output,'writing-library.json'),JSON.stringify({passed:checks.length,checks},null,2));}
const mode=(p,value)=>p.locator(`button[name="mode"][value="${value}"]`);
const text='A field journal, still in progress.\n\n<b>Literal text</b> & "quotation marks" stay as written.';
async function rawUpload(context,name,bytes){
 const page=await context.request.get(base+'/upload');assert.equal(page.status(),200);
 const html=await page.text(),match=html.match(/class="stack upload-form"[^>]*action="([^"]+)"/);assert(match,'Native upload form');
 const action=match[1].replace(/&amp;/g,'&');assert(action.startsWith('/upload?'));
 const response=await context.request.post(base+action,{headers:{Origin:base},multipart:{file:{name,mimeType:'image/png',buffer:bytes}},maxRedirects:0});
 assert.equal(response.status(),303,await response.text());return new URL(response.headers().location,base).searchParams.get('id');
}
(async()=>{const browser=await chromium.launch({headless:true});try{
 const owner=await browser.newContext({locale:'en-US',viewport:{width:1440,height:1000},storageState:path.join(fixture,'owner.session.json')});
 const member=await browser.newContext({locale:'en-US',storageState:path.join(fixture,'member.session.json')});
 const guest=await browser.newContext({locale:'en-US'}),p=await owner.newPage();owner.setDefaultTimeout(20000);
 const bytes=fs.readFileSync(path.join(output,'media/landscape-2.png'));
 await goto(p,'/compose');await p.locator('[name=body]').fill(text);await p.locator('details').filter({has:p.locator('[name=cw]')}).locator('summary').click();
 await p.locator('[name=cw]').fill('Field notes');await p.locator('[name=audience]').selectOption('public');
 await Promise.all([p.waitForNavigation({waitUntil:'domcontentloaded'}),p.locator('[name=cw]').press('Enter')]);
 assert.equal(new URL(p.url()).pathname,'/compose');assert.equal(new URL(p.url()).searchParams.get('saved'),'1');
 const keyboardDraft=new URL(p.url()).searchParams.get('id');assert(keyboardDraft);
 assert.equal(await p.locator('[name=body]').inputValue(),text);assert.equal(await p.locator('[name=cw]').inputValue(),'Field notes');
 assert.equal((await guest.request.get(base+'/note?id='+keyboardDraft)).status(),404);
 pass('Enter in a single-line composer field saves a private draft rather than opening Drive or publishing');
 await click(p,mode(p,'upload'));
 assert.equal(new URL(p.url()).pathname,'/upload');const draft=new URL(p.url()).searchParams.get('draft');assert(draft);
 const saved=await owner.newPage();await goto(saved,'/compose?id='+draft);assert.equal(await saved.locator('[name=body]').inputValue(),text);assert.equal(await saved.locator('[name=cw]').inputValue(),'Field notes');assert.equal(await saved.locator('[name=audience]').inputValue(),'public');await saved.close();
 pass('Save and upload preserves the full body, content warning, and audience before navigation');
 await p.locator('input[type=file]').setInputFiles({name:'FieldNotes.PNG',mimeType:'image/png',buffer:bytes});await click(p,p.locator('.upload-form button'));
 const file=new URL(p.url()).searchParams.get('id');assert(file);await click(p,form(p,'attach').locator('button'));
 assert.equal(await p.locator('.writing-attachment').count(),1);assert((await p.locator('.attachment-edit').innerText()).includes('No media description yet'));
 const revised=text+'\n\nWritten immediately before editing the image.';await p.locator('[name=body]').fill(revised);await click(p,mode(p,'details:'+file));
 assert.equal(new URL(p.url()).pathname,'/file');assert.equal(new URL(p.url()).searchParams.get('draft'),draft);
 await p.locator('[name=alt]').fill('Blue hills and a pale, open sky.');await click(p,form(p,'file').locator('button'));await p.locator('.attachment-next a').filter({hasText:'Back to writing'}).click();
 assert.equal(await p.locator('[name=body]').inputValue(),revised);assert((await p.locator('.attachment-edit').innerText()).includes('Media description added'));
 pass('Editing attachment details saves the current writing and returns to the same draft');
 await click(p,mode(p,'preview'));assert.equal(await p.locator('h1').innerText(),'Preview');assert.equal(new URL(p.url()).searchParams.get('preview'),'1');
 assert((await p.locator('[role=status]').innerText()).includes('only visible to you'));assert((await p.locator('.preview-summary').innerText()).includes('not signed in'));
 assert.equal(await p.locator('.cw').getAttribute('open'),null);await p.locator('.cw summary').click();assert.equal(await p.locator('.note-body').innerText(),revised);assert.equal(await p.locator('.note-body b').count(),0);
 assert.equal(await p.locator('.preview-card img').getAttribute('alt'),'Blue hills and a pale, open sky.');assert.equal(await p.locator('.description-reminder').count(),0);
 for(const context of [guest,member]){assert.equal((await context.request.get(base+'/note?id='+draft)).status(),404);assert.equal((await context.request.get(base+'/media?id='+file+'&note='+draft)).status(),404);}
 assert.equal((await member.request.get(base+'/compose?id='+draft+'&preview=1',{maxRedirects:0})).status(),404);
 const guestPreview=await guest.request.get(base+'/compose?id='+draft+'&preview=1',{maxRedirects:0});assert.equal(guestPreview.status(),303);assert.equal(guestPreview.headers().location,'/login');
 pass('Owner-only preview uses the real post renderer, escaped text, media description, warning, and audience');
 const other=await owner.newPage();await goto(other,'/compose?id='+draft);await other.locator('[name=body]').fill('A newer edit from another tab.');await click(other,mode(other,'draft'));await other.close();
 let response=await click(p,mode(p,'publish'));assert.equal(response.status(),409);assert.equal(await p.locator('[name=body]').inputValue(),revised);assert((await p.locator('.conflict').innerText()).includes('A newer edit from another tab.'));
 assert.equal((await guest.request.get(base+'/note?id='+draft)).status(),404);await click(p,mode(p,'draft'));
 pass('A stale preview cannot publish over a newer edit; both versions remain available for review');
 const afterRemoval=revised+'\n\nThis line must survive removing the attachment.';await p.locator('[name=body]').fill(afterRemoval);await click(p,mode(p,'detach:'+file));
 assert.equal(await p.locator('[name=body]').inputValue(),afterRemoval);assert.equal(await p.locator('.writing-attachment').count(),0);
 assert.equal((await owner.request.get(base+'/media?id='+file)).status(),200);await goto(p,'/file?id='+file);assert((await p.locator('main').innerText()).includes('Not attached to a post. Only you can access this file.'));
 pass('Removing an attachment saves pending text, removes its reverse reference, and keeps the original in Drive');
 // More than one bounded window, using real uploads rather than forged datastore rows.
 const started=Date.now();let archive='';for(let i=0;i<125;i++)archive=await rawUpload(owner,'Archive-'+String(i).padStart(3,'0')+'.PNG',bytes);
 console.log('Created 125 private library files in',Date.now()-started,'ms');
 await goto(p,'/pick?draft='+draft+'&q=FIELDNOTES&kind=image&folder=root');assert.equal(await p.locator('.file-card').count(),0);assert((await p.locator('.empty').innerText()).includes('Older files may match'));
 assert.equal(await p.locator('.pager a').count(),1);await click(p,p.locator('.pager a'));
 assert.equal(await p.locator('.file-card').count(),1);const filtered=new URL(p.url()),cursor=filtered.searchParams.get('cursor');assert(cursor!==null);
 const card=()=>p.locator('.file-card').filter({has:p.locator(`.file-link[href*="id=${file}"]`)});
 await click(p,card().locator('form button'));for(const key of ['draft','q','kind','folder','cursor'])assert.equal(new URL(p.url()).searchParams.get(key),filtered.searchParams.get(key),key);
 assert.equal(new URL(p.url()).hash,'#file-'+file);assert.equal(await card().locator('button').getAttribute('aria-pressed'),'true');
 pass('Bounded search advances after 120 nonmatching rows, finds an older file case-insensitively, and retains the exact page and filters on attach');
 await goto(p,'/pick?draft='+draft+'&q=no-such-file&kind=audio&folder=root&cursor='+cursor);
 assert.equal(await p.locator('.file-card').count(),0);assert.equal(await p.locator('.selected-item').count(),1);assert((await p.locator('.selected-tray').innerText()).includes('FieldNotes.PNG'));
 await click(p,p.locator('.selected-item button'));assert.equal(new URL(p.url()).searchParams.get('q'),'no-such-file');assert.equal(new URL(p.url()).searchParams.get('kind'),'audio');assert.equal(new URL(p.url()).searchParams.get('cursor'),cursor);assert.equal(await p.locator('.selected-item').count(),0);
 await goto(p,filtered.pathname+filtered.search);await click(p,card().locator('button'));
 pass('The selected-file tray remains visible across filters and removes files without resetting the search');
 const action=await card().locator('form').evaluate(el=>Object.fromEntries(new FormData(el).entries()));
 for(const extra of [{q:'x',cursor:'-1'},{folder:'root&folder=other'},{kind:'document'}]){
  response=await owner.request.post(base+'/action',{headers:{Origin:base},form:{...action,...extra,enabled:'0'},maxRedirects:0});assert.equal(response.status(),422);
 }
 const duplicate=new URLSearchParams({...action,enabled:'0'});duplicate.append('q','duplicate');response=await owner.request.post(base+'/action',{headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},data:duplicate.toString(),maxRedirects:0});assert.equal(response.status(),422);
 await goto(p,'/compose?id='+draft);assert.equal(await p.locator('.writing-attachment').count(),1);const noteFields=await fields(p,'note');
 response=await owner.request.post(base+'/action',{headers:{Origin:base},form:{...noteFields,mode:'detach:'+archive},maxRedirects:0});assert.equal(response.status(),422);
 await goto(p,'/compose?id='+draft);assert.equal(await p.locator('[name=body]').inputValue(),afterRemoval);assert.equal(await p.locator('.writing-attachment').count(),1);
 pass('Duplicate and invalid selection context, and removal of an unattached file, cannot mutate the draft');
 const previewRoute='/compose?id='+draft+'&preview=1',pickerRoute=filtered.pathname+filtered.search;
 for(const colorScheme of ['light','dark'])for(const width of [320,390,768,1440]){
  await p.emulateMedia({colorScheme,reducedMotion:'reduce'});await p.setViewportSize({width,height:960});
  for(const route of ['/compose?id='+draft,previewRoute,pickerRoute]){
   await goto(p,route);assert.equal(await p.locator('html').getAttribute('lang'),'en');assert.equal(await p.locator('h1').count(),1);
   assert(!/[\u3040-\u30ff\u3400-\u9fff]/u.test(await p.locator('body').innerText()));
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' overflow at '+width);
   const duplicateIds=await p.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.filter((v,i)=>ids.indexOf(v)!==i);});assert.deepEqual(duplicateIds,[]);
   if(width===390||width===1440)await p.screenshot({path:path.join(output,`writing-${new URL(p.url()).pathname.slice(1)}-${new URL(p.url()).searchParams.has('preview')?'preview':'edit'}-${colorScheme}-${width}.png`),fullPage:true});
  }
 }
 pass('Writing, preview, and filtered selection remain English, unique-ID, and overflow-free in 24 responsive configurations');
 await p.setViewportSize({width:1440,height:1000});await p.emulateMedia({colorScheme:'light'});await goto(p,previewRoute);
 await click(p,mode(p,'publish'));assert.equal(new URL(p.url()).pathname,'/note');const guestPage=await guest.newPage();await goto(guestPage,'/note?id='+draft);await guestPage.locator('.note-detail .cw summary').click();assert.equal(await guestPage.locator('.note-detail .note-body').innerText(),afterRemoval);assert.deepEqual(await (await guest.request.get(base+'/media?id='+file+'&note='+draft)).body(),bytes);await guestPage.close();
 await goto(p,'/compose?id='+draft);
 if(!await p.locator('[name=cw]').isVisible())await p.locator('details').filter({has:p.locator('[name=cw]')}).locator('summary').click();
 await Promise.all([p.waitForNavigation({waitUntil:'domcontentloaded'}),p.locator('[name=cw]').press('Enter')]);
 assert.equal(new URL(p.url()).pathname,'/note');assert.equal(new URL(p.url()).searchParams.get('id'),draft);
 await goto(p,'/compose?id='+draft);assert.equal(await mode(p,'preview').count(),0);assert.equal(await mode(p,'upload').count(),0);assert.equal(await p.locator('.attachment-edit').count(),0);
 response=await owner.request.post(base+'/action',{headers:{Origin:base},form:{...await fields(p,'note'),mode:'detach:'+file},maxRedirects:0});assert.equal(response.status(),422);
 pass('Posting from preview grants the chosen audience access; published attachment immutability remains enforced');
 // Retain an unpublished populated workspace for independent accessibility and restart checks.
 await goto(p,'/compose');await p.locator('[name=body]').fill('A quiet place for unfinished thoughts.\n\nThe draft is saved; the photograph can be used again.');await click(p,mode(p,'picker'));
 const inspection=new URL(p.url()).searchParams.get('draft');const inspectionPicker='/pick?draft='+inspection+'&q=FieldNotes&kind=image&folder=root&cursor='+cursor;
 await goto(p,inspectionPicker);await click(p,card().locator('button'));await goto(p,'/compose?id='+inspection);await click(p,mode(p,'preview'));
 const noScript=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844},hasTouch:true,isMobile:true,storageState:path.join(fixture,'owner.session.json')});const plain=await noScript.newPage();
 await goto(plain,'/compose?id='+inspection);await plain.locator('[name=body]').fill('This writing and preview workflow works with JavaScript disabled.');await click(plain,mode(plain,'preview'));assert.equal(await plain.locator('h1').innerText(),'Preview');assert((await plain.locator('.note-body').innerText()).includes('JavaScript disabled'));await noScript.close();
 fs.writeFileSync(path.join(fixture,'writing-state.json'),JSON.stringify({draft:inspection,published:draft,file,picker:inspectionPicker,preview:'/compose?id='+inspection+'&preview=1',body:'This writing and preview workflow works with JavaScript disabled.',publishedBody:afterRemoval}),{mode:0o600});
 pass('Saving and previewing a populated draft works on a touch-sized viewport with browser JavaScript disabled');
 await owner.close();await member.close();await guest.close();console.log(JSON.stringify({passed:checks.length}));
}finally{await browser.close();}})().catch(error=>{console.error(error.stack);process.exitCode=1});
