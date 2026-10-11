// Reading-first journeys on synthetic loopback data. No public accounts or writes.
const {chromium,base,fixture,output,fs,path,assert,form,click,goto,fields}=require('./support.cjs');
const checks=[];
function pass(name){checks.push(name);console.log('PASS',name);fs.writeFileSync(path.join(output,'conversation-activity.json'),JSON.stringify({passed:checks.length,checks},null,2));}
async function post(page,body,cw='',reply=''){
 await goto(page,'/compose'+(reply?'?reply='+reply:''));await page.locator('[name=body]').fill(body);
 if(cw){await page.locator('details').filter({has:page.locator('[name=cw]')}).locator('summary').click();await page.locator('[name=cw]').fill(cw);}
 await click(page,page.locator('button[name=mode][value=publish]'));assert.equal(new URL(page.url()).pathname,'/note');return new URL(page.url()).searchParams.get('id');
}
(async()=>{const browser=await chromium.launch({headless:true});try{
 const owner=await browser.newContext({locale:'en-US',storageState:path.join(fixture,'owner.session.json')});
 const member=await browser.newContext({locale:'en-US',storageState:path.join(fixture,'member.session.json')});
 const p=await owner.newPage(),m=await member.newPage();const creds=JSON.parse(fs.readFileSync(path.join(fixture,'test-accounts.json')));
 const hidden='Details deliberately behind a warning. <script>not executable</script> 🌍';
 const warning='Mountain notes <em>not markup</em>';const parent=await post(p,hidden,warning);
 await goto(m,'/');await click(m,m.locator('#post-'+parent).getByRole('link',{name:'Reply',exact:true}));
 assert.equal(new URL(m.url()).pathname,'/note');assert.equal(new URL(m.url()).searchParams.get('id'),parent);assert.equal(new URL(m.url()).hash,'');
 assert.equal(await m.getByRole('heading',{name:'Replies',exact:true}).count(),1);pass('Feed Reply opens the conversation before the editor');
 await click(m,m.getByRole('link',{name:'Reply to this post',exact:true}));assert.equal(new URL(m.url()).pathname,'/compose');
 assert.equal(await m.locator('.reply-preview .context-copy').innerText(),'Content warning: '+warning);assert(!(await m.locator('.reply-preview').innerText()).includes(hidden));
 assert.equal(await m.locator('.reply-preview a').getAttribute('target'),'_blank');assert.equal(await m.locator('.reply-preview script,.reply-preview em').count(),0);
 await m.locator('[name=body]').fill('I saved the quieter route for the next visit.');await click(m,m.locator('button[name=mode][value=publish]'));const reply=new URL(m.url()).searchParams.get('id');
 pass('Reply editor shows original context without revealing content-warning text');
 await goto(m,'/note?id='+parent);const reaction=await m.locator('#post-'+parent+' form').filter({has:m.locator('input[name=intent][value=eyes]')}).evaluate(f=>Object.fromEntries(new FormData(f).entries()));
 let response=await member.request.post(base+'/action',{headers:{Origin:base},form:reaction,maxRedirects:0});assert.equal(response.status(),303);
 await goto(p,'/notifications?kind=likes');const matching=p.locator(`.activity-row[href*="id=${parent}"]`);assert.equal(await matching.count(),1);assert((await matching.innerText()).includes('Content warning: '+warning));assert(!(await matching.innerText()).includes(hidden));
 for(let i=0;i<3;i++){response=await member.request.post(base+'/action',{headers:{Origin:base},form:reaction,maxRedirects:0});assert.equal(response.status(),303);}
 await p.reload();assert.equal(await matching.count(),1);pass('Repeated Like submission does not duplicate its activity');
 for(const [kind,label] of [['replies','replied to your post'],['likes','liked your post'],['follows','followed you']]){
  await goto(p,'/notifications?kind='+kind);const rows=await p.locator('.activity-row').allTextContents();assert(rows.length>0,kind);assert(rows.every(row=>row.includes(label)),kind);
  assert.equal(await p.locator('.activity-tabs [aria-current=page]').innerText(),kind[0].toUpperCase()+kind.slice(1));
 }
 await goto(p,'/notifications?kind=replies');assert.equal(await p.locator(`.activity-row[href*="id=${reply}"]`).count(),1);pass('Activity filters distinguish replies, likes, and follows');
 await goto(p,'/notifications');assert.equal(await p.locator('.activity-tabs a').count(),4);
 for(const colorScheme of ['light','dark'])for(const width of [320,390,768,1440]){
  await p.emulateMedia({colorScheme});await p.setViewportSize({width,height:844});await p.reload();
  assert((await p.evaluate(()=>document.documentElement.scrollWidth))<=width+1);
  if(width<=390){assert.equal(await p.locator('.mobile-nav a').count(),5);assert.equal(await p.locator('.mobile-nav [aria-current=page]').innerText(),'Activity');
   const rect=await p.locator('.mobile-nav a[href="/notifications"]').boundingBox();assert(rect.width>=44&&rect.height>=44);}
 }
 pass('Activity has a direct mobile destination and fits all four widths in both themes');
 for(const query of ['kind=unknown','kind=likes&kind=replies','kind=likes%26admin%3D1']){assert.equal((await owner.request.get(base+'/notifications?'+query)).status(),400);}
 pass('Activity rejects unknown, duplicate, and injected filter values');
 // Force a real second page using admitted desired-state actions, not storage edits.
 for(let i=0;i<31;i++)for(const enabled of ['0','1']){
  response=await member.request.post(base+'/action',{headers:{Origin:base},form:{...reaction,enabled},maxRedirects:0});assert.equal(response.status(),303);
 }
 await goto(p,'/notifications?kind=replies');assert.equal(await p.locator(`.activity-row[href*="id=${reply}"]`).count(),1);assert.equal(new URL(p.url()).searchParams.has('cursor'),false);pass('Reply filter skips unrelated activity windows within its bounded scan');
 // A much longer irrelevant run must stop after four windows, not scan forever.
 for(let i=0;i<100;i++)for(const enabled of ['0','1']){
  response=await member.request.post(base+'/action',{headers:{Origin:base},form:{...reaction,enabled},maxRedirects:0});assert.equal(response.status(),303);
 }
 await goto(p,'/notifications?kind=likes');const oneWindow=new URL(await p.locator('.pager a').getAttribute('href'),base);
 await goto(p,'/notifications?kind=replies');assert.equal(await p.locator('.activity-row').count(),0);
 const older=await p.locator('.pager a').getAttribute('href'),fourWindows=new URL(older,base);
 assert.equal(Math.abs(Number(oneWindow.searchParams.get('cursor'))-Number(fourWindows.searchParams.get('cursor'))),90);
 assert.equal(await p.locator('.activity-list').getByRole('link',{name:'Back to Home',exact:true}).count(),0);
 pass('Sparse activity stops after four 30-entry windows and prioritizes the next-page action');
 await click(p,p.locator('.pager a'));assert.equal(await p.locator(`.activity-row[href*="id=${reply}"]`).count(),1);
 assert.equal(new URL(p.url()).searchParams.get('kind'),'replies');pass('Continuing after the scan budget finds older matching activity without losing the filter');
 await goto(p,'/notifications?kind=likes');const next=await p.locator('.pager a').getAttribute('href');assert(next.includes('kind=likes&cursor='));await goto(p,next);
 assert.equal(new URL(p.url()).searchParams.get('kind'),'likes');assert((await p.locator('.activity-row').count())>0);
 assert((await p.locator('.activity-row').allTextContents()).every(t=>t.includes('liked your post')));pass('Activity pagination retains the selected filter');
 await goto(p,'/profile?user='+creds.member.handle);await click(p,form(p,'mute').locator('button'));
 await goto(p,'/notifications');assert.equal(await p.locator('.activity-row').count(),0);assert(!(await p.locator('main').innerText()).includes(creds.member.handle));
 await goto(p,'/profile?user='+creds.member.handle);await click(p,form(p,'mute').locator('button'));pass('Muting an actor removes their activity without leaking a preview');
 for(const name of ['Home','Drive','Write','Notifications','Account']){
  await goto(p,'/settings');await p.locator('[name=display]').fill(name);await click(p,form(p,'profile').locator('button'));await goto(p,'/profile?user='+creds.owner.handle);
  assert.equal(await p.locator('h1').innerText(),name);assert.equal(await p.locator('nav [aria-current]').count(),0);assert.equal(await p.locator('[aria-label="Refresh this feed"]').count(),0);
 }
 await goto(p,'/settings');await p.locator('[name=display]').fill('Alex Morgan');await click(p,form(p,'profile').locator('button'));pass('User display names never select an unrelated navigation destination');
 // Final privacy revocation uses the exact same confirmation form as the UI.
 await goto(p,'/compose?id='+parent);await p.locator('.destructive summary').click();await form(p,'delete-note').locator('[name=confirm]').check();await click(p,form(p,'delete-note').locator('button'));
 assert.equal(new URL(p.url()).pathname,'/');assert.equal(await p.locator('[role=status]').innerText(),'Post deleted. Files remain in Drive.');pass('Deleting a published post returns Home with explicit confirmation');
 await goto(p,'/notifications?kind=likes');assert.equal(await p.locator(`.activity-row[href*="id=${parent}"]`).count(),0);
 await goto(m,'/compose?reply='+parent);assert((await m.locator('.reply-preview').innerText()).includes('unavailable or muted'));assert(!(await m.locator('.reply-preview').innerText()).includes(hidden));
 pass('Deleted originals disappear from activity and cannot leak through reply previews');
 await goto(p,'/compose');await p.locator('[name=body]').fill('A private working draft.');await click(p,p.locator('button[name=mode][value=draft]'));
 await p.locator('.destructive summary').click();await form(p,'delete-note').locator('[name=confirm]').check();await click(p,form(p,'delete-note').locator('button'));
 assert.equal(new URL(p.url()).pathname,'/drafts');assert.equal(await p.locator('[role=status]').innerText(),'Draft deleted. Files remain in Drive.');pass('Deleting a draft returns Drafts with explicit confirmation');
 const visible=await post(p,'A long walk, a sketchbook, and enough time to notice the small things.');
 await goto(m,'/compose?reply='+visible);assert((await m.locator('.context-copy').innerText()).includes('A long walk'));await m.locator('[name=body]').fill('One more place worth coming back to.');
 await m.setViewportSize({width:390,height:844});await m.screenshot({path:path.join(output,'reply-context-mobile.png'),fullPage:true});
 await click(m,m.locator('button[name=mode][value=publish]'));assert.equal(new URL(m.url()).pathname,'/note');
 await p.setViewportSize({width:1440,height:960});await p.emulateMedia({colorScheme:'light'});await goto(p,'/notifications?kind=replies');await p.screenshot({path:path.join(output,'activity-desktop.png'),fullPage:true});
 await p.setViewportSize({width:390,height:844});await p.emulateMedia({colorScheme:'dark'});await p.screenshot({path:path.join(output,'activity-mobile-dark.png'),fullPage:true});
 fs.writeFileSync(path.join(fixture,'reading-state.json'),JSON.stringify({visible,reply,parent}),{mode:0o600});
 console.log(JSON.stringify({passed:checks.length}));
}finally{await browser.close();}})().catch(error=>{console.error(error.stack);process.exitCode=1});
