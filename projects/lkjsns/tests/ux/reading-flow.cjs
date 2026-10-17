// Focused reading/editing workflow acceptance on the native loopback fixture.
'use strict';
const {chromium,base,output,fs,path,assert,form,fields,click,goto,pass,session,submit,createPost,resourceId,newPostId,load,save,shortPostId}=require('./support.cjs');
const short=/^[0-9abcdefghjkmnpqrstvwxyz]{16}$/;
const rootPath=p=>new URL(p.url()).pathname+new URL(p.url()).search;
async function post(context,data,status=303){const r=await context.request.post(base+'/action',{form:data,headers:{Origin:base},maxRedirects:0});assert.equal(r.status(),status,(await r.text()).slice(0,700));return r;}
(async()=>{const browser=await chromium.launch({headless:true});try{
 const owner=await session(browser),member=await session(browser,'member'),guest=await browser.newContext({locale:'en-US'});
 const p=await owner.newPage(),m=await member.newPage(),g=await guest.newPage();p.setDefaultTimeout(20000);
 // Completing a profile task lands on the resulting profile, not the editor.
 await goto(p,'/settings/profile');const before=await fields(p,'profile');
 await p.locator('[name=display]').fill('Reading flow test');await p.locator('[name=bio]').fill('A profile with a finished edit.');
 await click(p,p.getByRole('button',{name:'Save profile',exact:true}));assert.equal(new URL(p.url()).pathname,'/@testowner');
 assert.equal(await form(p,'profile').count(),0);assert.equal(await p.locator('.profile>h2').innerText(),'Reading flow test');assert.equal(await p.locator('.profile>.relation-badge').count(),0);
 const conflict=await owner.request.post(base+'/action',{form:{...before,display:'Conflicting attempted name'},headers:{Origin:base},maxRedirects:0});assert.equal(conflict.status(),409);assert((await conflict.text()).includes('Conflicting attempted name'));
 await goto(p,'/settings/profile');await p.locator('[name=display]').fill('');const invalid=await submit(p,'profile',{display:''},422);assert((await invalid.text()).includes('<form'));
 await goto(p,'/settings/profile');await submit(p,'profile',{display:before.display,bio:before.bio});
 pass('Save profile exits to the canonical profile; rejected/conflicting input stays recoverable and the redundant self label remains absent');
 for(const [legacy,canonical]of [['/profile?user=testowner','/@testowner'],['/profile?user=testowner&cursor=0&trail=_','/@testowner?cursor=0&trail=_'],['/attention?user=testowner&direction=to','/@testowner/attention/to'],['/attention?user=testowner&direction=from&cursor=0&trail=_','/@testowner/attention/from?cursor=0&trail=_']]){
  const r=await owner.request.get(base+legacy,{maxRedirects:0});assert.equal(r.status(),303);assert.equal(r.headers().location,canonical);
 }
 await goto(p,'/@testowner');assert.deepEqual(await p.locator('.profile-relations a').evaluateAll(es=>es.map(e=>e.getAttribute('href'))),['/@testowner/attention/to','/@testowner/attention/from']);
 for(const route of ['/@testowner?user=testmember','/@testowner/attention/to?direction=from','/@testowner?cursor=-1','/@testowner?cursor=0&cursor=1','/@testowner?trail=_.-1'])assert.equal((await owner.request.get(base+route)).status(),400,route);
 assert.equal((await owner.request.get(base+'/@nobody-exists')).status(),404);assert.equal((await owner.request.get(base+'/@testowner/edit')).status(),404);
 const hidden=await guest.request.get(base+'/@testowner/attention/from',{maxRedirects:0});assert.equal(hidden.status(),303);assert.equal(hidden.headers().location,'/login');
 pass('User and attention URLs are path-based; old links retain pagination while path/query identity overrides and malformed paths are rejected');
 await goto(p,'/compose');const originalAudience=await p.locator('[name=audience]').inputValue();
 const parent=await createPost(p,'A parent above the reply, not boxed inside it.','public');assert(short.test(parent),parent);
 await goto(m,'/compose?reply='+parent);await m.locator('[name=body]').fill('A reply beneath the parent.');await click(m,m.getByRole('button',{name:'Post',exact:true}));const child=resourceId(m.url());assert(short.test(child));
 await goto(p,'/'+child);const back=p.locator('[data-post-back]');assert.equal(await back.count(),1);assert.equal(await back.innerText(),'Back');
 const dom=await p.locator('.note-detail').evaluate(el=>{const pair=el.querySelector('.conversation-pair'),parent=pair?.querySelector(':scope > .parent-card'),reply=pair?.querySelector(':scope > article.note');return {pair:!!pair,parent:!!parent,reply:!!reply,parentInside:!!reply?.querySelector('.parent-card'),preceding:!!(parent?.compareDocumentPosition(reply)&Node.DOCUMENT_POSITION_FOLLOWING),parentBottom:parent?.getBoundingClientRect().bottom,replyTop:reply?.getBoundingClientRect().top,background:parent?getComputedStyle(parent).backgroundColor:'missing',border:parent?getComputedStyle(parent).borderLeftWidth:'missing',text:el.textContent}});
 assert(dom.pair&&dom.parent&&dom.reply&&dom.preceding&&!dom.parentInside);assert(dom.parentBottom<=dom.replyTop+1);assert.equal(dom.background,'rgba(0, 0, 0, 0)');assert.equal(dom.border,'0px');assert(!dom.text.includes('In reply to'));
 assert(await back.evaluate(el=>el.getBoundingClientRect().bottom<=document.querySelector('.note-detail').getBoundingClientRect().top));
 assert.equal(await p.locator('.note-detail .parent-card').getAttribute('href'),'/'+parent);
 await goto(p,'/'+parent);assert.equal(await p.locator('.reply-list #post-'+child).count(),1);assert.equal(await p.locator('.reply-list .parent-card').count(),0);
 pass('New posts use 16-character IDs; parent and reply are separate vertical siblings with a neutral connector, and thread rows do not repeat their own parent');
 const media=load('media');assert(/^[a-f0-9]{64}$/.test(media.textId));
 await goto(p,'/'+parent+'/edit');const privateFields=await fields(p,'note');assert.equal(privateFields.id,parent);assert(/^[a-f0-9]{64}$/.test(privateFields.csrf));
 await p.locator('[name=body]').fill('Saved post edits finish on the short-ID post page.');await click(p,p.getByRole('button',{name:'Save changes',exact:true}));assert.equal(new URL(p.url()).pathname,'/'+parent);assert.equal(await p.locator('textarea[name=body]').count(),0);
 await goto(p,'/'+media.textId);const fileBefore=await fields(p,'file');await p.locator('[name=tags]').fill('readingflow');await click(p,form(p,'file').locator('button'));assert.equal(new URL(p.url()).pathname,'/drive');assert.equal(new URL(p.url()).hash,'#file-'+media.textId);
 await goto(p,'/'+media.textId);assert.equal(await p.locator('[name=tags]').inputValue(),'readingflow');await submit(p,'file',{tags:fileBefore.tags});
 await goto(p,'/compose');await p.locator('[name=body]').fill('Keep this writing context through file settings.');await click(p,p.getByRole('button',{name:'Attach file',exact:true}));const draft=new URL(p.url()).searchParams.get('draft');assert(short.test(draft));
 // Use real ownership-bound attachment submission, then open its settings from writing.
 await post(owner,{intent:'attach',csrf:privateFields.csrf,draft,id:media.textId,version:'1',enabled:'1',destination:'compose'});
 await goto(p,'/'+draft+'/edit');await click(p,p.getByRole('button',{name:'File options',exact:true}));assert.equal(new URL(p.url()).pathname,'/'+media.textId);
 await click(p,form(p,'file').locator('button'));assert.equal(new URL(p.url()).pathname,'/'+draft+'/edit');assert.equal(await p.locator('[name=body]').inputValue(),'Keep this writing context through file settings.');
 pass('Post and file saves complete their editing task; contextual file settings return to the same short-ID draft without losing text, and authentication/media identifiers keep full length');
 // Generate an actual second page so back must restore filter, trail and scroll.
 await goto(p,'/compose');const seed=await fields(p,'note');for(let i=0;i<36;i++)await post(owner,{...seed,id:newPostId(),version:'0',reply:'',body:'Reading navigation position '+i,cw:'',audience:'public',mode:'publish'});
 for(const route of ['/?feed=attention','/@testowner','/search?q=Reading%20navigation']){
  await goto(p,route);await click(p,p.getByRole('link',{name:/^(Older|Next)$/}).first());const from=rootPath(p);const card=p.locator('main article.note').nth(1);await card.locator('.note-body').scrollIntoViewIfNeeded();const y=await p.evaluate(()=>scrollY);
  await click(p,card.locator('.note-body'));assert(short.test(resourceId(p.url())));assert.equal(await p.locator('[data-post-back]').getAttribute('href'),from);
  await click(p,p.locator('[data-post-back]'));assert.equal(rootPath(p),from);await p.waitForTimeout(150);assert(Math.abs(await p.evaluate(()=>scrollY)-y)<70,`${route}: scroll position`);
 }
 // A reaction POST adds browser history but Back still means the reading list.
 await goto(p,'/?feed=attention');const start=rootPath(p);await click(p,p.locator('main article.note').first().locator('.note-body'));const target=resourceId(p.url());
 await click(p,form(p,'eyes').filter({has:p.locator(`input[name=id][value="${target}"]`)}).locator('button'));assert.equal(new URL(p.url()).pathname,'/'+target);
 await click(p,p.locator('[data-post-back]'));assert.equal(rootPath(p),start);
 const direct=await owner.newPage();await goto(direct,'/'+parent);assert.equal(await direct.locator('[data-post-back]').getAttribute('href'),'/');await direct.close();
 for(const referer of ['https://evil.test/@alice',base+'.evil.test/@alice',base+'/'+parent+'/edit']){const r=await owner.request.get(base+'/'+parent,{headers:{Referer:referer}});assert.equal(r.status(),200);const html=await r.text();assert(html.includes('data-post-back href="/"'));}
 pass('Back restores the original reading filter, page and scroll position, bypasses reaction/edit loops, and uses a safe Home fallback for direct or foreign entries');
 const cold=await session(browser,'owner',{javaScriptEnabled:false}),n=await cold.newPage();await goto(n,'/@testowner');const parentLink=n.locator('main article.note').first().locator('.meta>a').first();await click(n,parentLink);assert.equal(await n.locator('[data-post-back]').getAttribute('href'),'/@testowner');await click(n,n.locator('[data-post-back]'));assert.equal(new URL(n.url()).pathname,'/@testowner');await cold.close();
 const reports=[];
 for(const scheme of ['light','dark'])for(const width of [320,390,768,1280]){
  await p.emulateMedia({colorScheme:scheme});await p.setViewportSize({width,height:900});
  for(const route of ['/'+child,'/'+parent,'/@testowner','/@testowner/attention/to']){await goto(p,route);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route);assert.equal(await p.locator('main h1:not(.sr-only)').count(),0);}
  await goto(p,'/'+child);await p.screenshot({path:path.join(output,`reading-flow-${scheme}-${width}.png`),fullPage:true});
  if(process.env.LKJSNS_AXE&&(width===390||width===1280)){await p.evaluate(fs.readFileSync(process.env.LKJSNS_AXE,'utf8'));const r=await p.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));reports.push({scheme,width,violations:r.violations});assert.deepEqual(r.violations,[]);}
 }
 await post(owner,{intent:'audience',csrf:privateFields.csrf,audience:originalAudience},204);
 fs.writeFileSync(path.join(output,'reading-flow-accessibility.json'),JSON.stringify(reports,null,2));save('reading-flow',{parent,child,draft});
 pass('Native Back works without JavaScript; new profile and conversation layouts fit four widths in both themes and pass the selected accessibility checks');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
