// All live pagination surfaces, through native UI on a fresh synthetic store only.
'use strict';
const{newPostId,chromium,base,fixture,output,fs,path,assert,form,fields,click,goto,pass,session,submit,resourceId,load,save,crypto}=require('./support.cjs');
const{assertPager}=require('./pager-contract.cjs');
const controls=(p,name='Pagination')=>p.getByRole('navigation',{name,exact:true}).last();
const nextLink=(p,name='Pagination')=>controls(p,name).locator('a[rel=next]');
const prevLink=(p,name='Pagination')=>controls(p,name).locator('a[rel=prev]');
const localPath=p=>new URL(p.url()).pathname+new URL(p.url()).search;
async function identities(p,selector){return p.locator(selector).evaluateAll(es=>es.map(e=>e.id||e.getAttribute('href')||e.textContent));}
(async()=>{const browser=await chromium.launch({headless:true});try{
 const owner=await session(browser),p=await owner.newPage();p.setDefaultTimeout(25000);
 const media=load('media'),attention=load('attention');
 const action=async(data,status=303)=>{const r=await owner.request.post(base+'/action',{form:data,headers:{Origin:base},maxRedirects:0});assert.equal(r.status(),status,(await r.text()).slice(0,400));return r;};
 // Repeated uploads are genuine, bounded native transfers; no direct DB fixture writes.
 const file=path.join(output,'media','landscape-1.png'),fileIds=[];
 for(let i=0;i<34;i++){
  await goto(p,'/upload');await p.locator('input[type=file]').setInputFiles({name:'pager-image-'+String(i).padStart(2,'0')+'.png',mimeType:'image/png',buffer:fs.readFileSync(file)});
  await click(p,p.getByRole('button',{name:'Upload',exact:true}));fileIds.push(resourceId(p.url()));
  await submit(p,'file',{tags:'pager-target'});
 }
 await goto(p,'/admin/invitations');const invite=await fields(p,'invite');
 for(let i=0;i<31;i++){const r=await owner.request.post(base+'/action',{form:{...invite,label:'Pagination specimen '+i,uses:'1',days:'1'},headers:{Origin:base},maxRedirects:0});assert.equal(r.status(),200);}
 await goto(p,'/compose');const seed=await fields(p,'note'),parent=newPostId();
 await action({...seed,id:parent,body:'Paged conversation sentinel',audience:'public',mode:'publish'});
 for(let i=0;i<35;i++)await action({...seed,id:newPostId(),reply:parent,body:'Pager reply specimen '+String(i).padStart(2,'0'),audience:'public',mode:'publish'});
 // Preserve the initial relationship graph for the later restart assertions.
 await goto(p,'/@'+attention.created[0]);const relation=await fields(p,'attention');
 for(const handle of attention.created)await action({...relation,handle,subject:handle,direction:'profile',enabled:'1'});
 await goto(p,'/compose');const working=newPostId();
 await action({...await fields(p,'note'),id:working,body:'Pager attachment input retained.',mode:'picker'});
 pass('Fresh image, invitation, reply and outgoing-relation fixtures cover every real paginated list without modifying a public store');
 const list=(u,d)=>`/@${u}/attention/${d}`;
 const routes=[
  {id:'home',route:'/',content:'main .feed',items:'main article.note'},
  {id:'attention-feed',route:'/?feed=attention',content:'main .feed',items:'main article.note'},
  {id:'profile',route:'/@testowner',content:'.profile,main .feed',items:'main article.note'},
  {id:'bookmarks',route:'/saved',content:'main .feed',items:'main article.note'},
  {id:'members',route:'/people',content:'.member-list',items:'.member-row'},
  {id:'attention-to',route:list('testowner','to'),content:'.attention-heading,.attention-tabs,.attention-list',items:'.attention-person'},
  {id:'attention-from',route:list('testowner','from'),content:'.attention-heading,.attention-tabs,.attention-list',items:'.attention-person'},
  {id:'notifications',route:'/notifications?kind=people-attention',content:'.activity-tabs,.activity-list',items:'.activity-row'},
  {id:'drive',route:'/drive?tag=pager-target',content:'.drive-grid',items:'.drive-grid .file-card'},
  {id:'attachments',route:'/pick?draft='+working+'&tag=pager-target',content:'.picker-context,.drive-grid',items:'.drive-grid .file-card'},
  {id:'profile-image',route:'/settings/avatar',content:'.crumbs,.drive-grid',items:'.drive-grid .file-card'},
  {id:'file-usage',route:'/'+media.textId,content:'.usage-posts',items:'.usage-posts article.note'},
  {id:'replies',route:'/'+parent,content:'.note-detail,.reply-list',items:'.reply-list article.note'},
  {id:'invitations',route:'/admin/invitations',content:'.crumbs,main>section.panel',items:'main>section.panel:last-of-type'},
  {id:'search-posts',route:'/search?q=Pager%20reply%20specimen',name:'Post pagination',content:'.search-results .feed',items:'.search-results article.note'},
  {id:'search-people',route:'/search?q=person',name:'People pagination',content:'.member-list',items:'.member-list .member-row'},
 ];
 const cases=[];
 for(const spec of routes){
  await goto(p,spec.route);const initial=await identities(p,spec.items),name=spec.name||'Pagination';
  await assertPager(p,{...spec,name,previous:false,next:true});
  await click(p,nextLink(p,name));const second=localPath(p);const forward=await nextLink(p,name).count()>0;
  await assertPager(p,{...spec,name,previous:true,next:forward});
  await click(p,prevLink(p,name));assert.deepEqual(await identities(p,spec.items),initial,spec.id);
  cases.push({...spec,second,hasNext:forward});
 }
 pass('All sixteen feed/list/search contexts retain a bottom pager and restore the exact first page');
 // Independent histories prevent a post-page Prev from appearing above People.
 await goto(p,'/search?q=person');const peopleFirst=await identities(p,'.member-list .member-row');
 await click(p,nextLink(p,'People pagination'));const memberSecond=new URL(p.url()).searchParams.get('members');
 assert(memberSecond!==null);assert.equal(new URL(p.url()).searchParams.get('members-trail'),'_');
 await goto(p,'/search?q=person&members='+memberSecond+'&members-trail=_&cursor=5&trail=_.35');
 await assertPager(p,{name:'Post pagination',content:'.search-results .feed',previous:true,next:false});
 await click(p,prevLink(p,'Post pagination'));assert.equal(new URL(p.url()).searchParams.get('cursor'),'35');assert.equal(new URL(p.url()).searchParams.get('members'),memberSecond);assert.equal(new URL(p.url()).searchParams.get('members-trail'),'_');
 await click(p,prevLink(p,'People pagination'));assert.equal(new URL(p.url()).searchParams.get('members'),null);assert.equal(new URL(p.url()).searchParams.get('cursor'),'35');assert.deepEqual(await identities(p,'.member-list .member-row'),peopleFirst);
 assert.equal(await p.locator('#search-query').getAttribute('autofocus'),null);
 pass('Search has separate named people/post pagination; either Prev retains the other list’s cursor/history and paginated results do not steal focus');
 // An attachment action must remain inside the paginated picker, with its history.
 const picker=cases.find(s=>s.id==='attachments');await goto(p,picker.second);const before=localPath(p);
 const choice=p.locator('.drive-grid .media-choice').first();await click(p,choice);
 const beforeSelection=new URL(before,base),afterSelection=new URL(p.url());assert.equal(afterSelection.pathname,beforeSelection.pathname);for(const key of ['draft','tag','cursor','trail'])assert.equal(afterSelection.searchParams.get(key),beforeSelection.searchParams.get(key),key);assert.equal(await p.locator('.selection-count').innerText(),'Selected: 1 / 4');
 await click(p,prevLink(p));assert.equal(new URL(p.url()).searchParams.get('draft'),working);assert.equal(new URL(p.url()).searchParams.get('tag'),'pager-target');
 await click(p,p.getByRole('link',{name:'Back to writing',exact:true}));assert.equal(await p.locator('[name=body]').inputValue(),'Pager attachment input retained.');
 pass('Choosing an attachment keeps its draft, tag, page and Prev history; returning to writing retains the submitted text');
 let rendered=0;
 for(const js of [true,false]){
  const context=await session(browser,'owner',{javaScriptEnabled:js}),page=await context.newPage();
  for(const theme of ['light','dark'])for(const width of [320,390,768,1280]){
   await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900});
   for(const spec of cases){await goto(page,spec.second);await assertPager(page,{...spec,name:spec.name||'Pagination',previous:true,next:spec.hasNext});rendered++;}
  }
  // All actual links remain usable without a JS navigation layer.
  for(const spec of cases){await goto(page,spec.second);await click(page,prevLink(page,spec.name||'Pagination'));const key=spec.id==='search-people'?'members':'cursor';assert.equal(new URL(page.url()).searchParams.get(key),null,spec.id);}
  await context.close();
 }
 pass('Sixteen paginated contexts at four widths in two themes, with and without JavaScript: 256 layout cases and real backward navigation');
 const reports=[];
 if(process.env.LKJSNS_AXE){const axe=fs.readFileSync(process.env.LKJSNS_AXE,'utf8');
  for(const id of ['home','search-posts','search-people','attachments','attention-from']){
   const spec=cases.find(c=>c.id===id);await goto(p,spec.second);await p.evaluate(axe);
   const r=await p.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));reports.push({id,violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))});assert.deepEqual(r.violations,[]);
  }
  pass('Selected accessibility checks pass on feed, both search lists, attachment picker and relationship pagination');
 }
 for(const query of ['members-trail=_.-1','members-trail=_.1..2','members-trail=https://evil.test','members-trail=_&members-trail=_','members-trail='+Array(65).fill('1').join('.')])assert.equal((await owner.request.get(base+'/search?q=person&'+query)).status(),400,query);
 await goto(p,'/saved?cursor=0');assert.equal(await p.locator('a[rel=first]').count(),2);assert.equal(await p.locator('a[rel=prev]').count(),0);await assertPager(p,{content:'main .feed',previous:true,next:false});
 await goto(p,'/saved?cursor=0&trail=_');await assertPager(p,{content:'main .feed',previous:true,next:false});
 await p.locator('.pager a').last().scrollIntoViewIfNeeded();await p.keyboard.press('Tab');await p.locator('.pager a').last().focus();const focus=await p.locator('.pager a').last().evaluate(e=>({outline:getComputedStyle(e).outlineStyle,width:getComputedStyle(e).outlineWidth}));assert(focus.outline!=='none'&&parseFloat(focus.width)>0);
 pass('Direct deep links offer First, last pages keep Prev, invalid people histories are rejected and keyboard focus remains visible');
 for(const [width,theme]of [[390,'light'],[1280,'light'],[390,'dark']]){
  await p.setViewportSize({width,height:900});await p.emulateMedia({colorScheme:theme});await goto(p,cases.find(c=>c.id==='home').second);await p.locator('.pager').last().scrollIntoViewIfNeeded();await p.screenshot({path:path.join(output,`pager-home-${width}-${theme}.png`)});
 }
 for(const handle of attention.created)await action({...relation,handle,subject:handle,direction:'profile',enabled:'0'});
 // Keep the existing attention persistence fixture's expected graph unchanged.
 await goto(p,'/@testowner/attention/to');assert.deepEqual(await p.locator('.attention-person').evaluateAll(es=>es.map(e=>new URL(e.href).pathname.split('/')[1].slice(1))),['testmember']);
 // Public pagination specimens must not change the prior no-script audience fixture.
 await action({intent:'audience',csrf:seed.csrf,audience:seed.audience},204);
 fs.writeFileSync(path.join(output,'pager-accessibility.json'),JSON.stringify(reports,null,2));save('pager-layout',{contexts:cases.length,rendered,cases,fileIds,parent,working});
 fs.writeFileSync(path.join(output,'pager-layout.json'),JSON.stringify({contexts:cases.length,rendered,postAndPeopleHistoryIndependent:true,bottomControls:true,scriptModes:2},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
