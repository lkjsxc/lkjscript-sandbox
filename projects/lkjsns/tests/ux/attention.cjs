// Directional relationships through real native forms. Never use real-user stores.
'use strict';
const {chromium,base,fixture,output,fs,path,assert,form,fields,click,goto,pass,session,submit,createPost,load,save,crypto}=require('./support.cjs');
const list=(user,direction)=>`/attention?user=${user}&direction=${direction}`;
const people=page=>page.locator('.attention-person').evaluateAll(es=>es.map(e=>new URL(e.href).searchParams.get('user')));
const post=async(context,body,status=303)=>{
 const response=await context.request.post(base+'/action',{form:body,headers:{Origin:base},maxRedirects:0});
 assert.equal(response.status(),status,(await response.text()).slice(0,500));return response;
};
(async()=>{const browser=await chromium.launch({headless:true});try{
 const owner=await session(browser),member=await session(browser,'member'),other=await session(browser,'other'),guest=await browser.newContext({locale:'en-US'});
 const p=await owner.newPage(),m=await member.newPage(),o=await other.newPage(),g=await guest.newPage();
 await goto(p,'/profile?user=testowner');
 assert.deepEqual(await p.locator('.profile-relations a').allTextContents(),['Attention to','Attention from']);
 assert.equal(await form(p,'attention').count(),0);
 await goto(g,'/profile?user=testowner');assert.equal(await g.locator('.profile-relations').count(),0);
 const denied=await guest.request.get(base+list('testowner','from'),{maxRedirects:0});assert.equal(denied.status(),303);assert.equal(denied.headers().location,'/login');
 await goto(g,'/privacy');assert.equal(await g.locator('.effective').innerText(),'Updated October 17, 2026');assert((await g.locator('main').innerText()).includes('Attention to and Attention from lists are visible to signed-in members, not to guests.'));
 pass('Profile links expose both attention directions to signed-in members, without exposing the graph to guests');
 await goto(p,list('testowner','to'));assert.deepEqual(await people(p),[]);assert.equal(await p.getByRole('link',{name:'Find people',exact:true}).count(),1);
 await goto(p,'/profile?user=testmember');let body=await fields(p,'attention');
 assert.equal(await form(p,'attention').locator('button').innerText(),'Attention');
 assert.equal(await form(p,'attention').locator('button').getAttribute('aria-pressed'),'false');
 await click(p,form(p,'attention').locator('button'));assert.equal(new URL(p.url()).searchParams.get('user'),'testmember');
 assert.equal(await form(p,'attention').locator('button').getAttribute('aria-pressed'),'true');
 await goto(p,list('testowner','to'));assert.deepEqual(await people(p),['testmember']);
 await goto(p,list('testmember','from'));assert.deepEqual(await people(p),['testowner']);
 await goto(p,list('testowner','from'));assert.deepEqual(await people(p),[]);
 await goto(m,'/notifications?kind=people-attention');let noticeCount=await m.locator('.activity-row').count();assert.equal(noticeCount,1);
 assert((await m.locator('.activity-row').innerText()).includes('started paying attention to you'));
 assert.equal(await m.locator('.activity-row').getAttribute('href'),'/profile?user=testowner');
 // Same desired state, including concurrent replays, is not a toggle or another notice.
 await Promise.all(Array.from({length:3},()=>post(owner,body)));
 await goto(m,'/notifications?kind=people-attention');assert.equal(await m.locator('.activity-row').count(),noticeCount);
 await goto(p,list('testowner','to'));assert.deepEqual(await people(p),['testmember']);
 pass('Attention writes update both directions atomically and repeated/concurrent desired-state submissions do not duplicate people or notifications');
 await goto(m,'/profile?user=testowner');await click(m,form(m,'attention').locator('button'));
 assert((await m.locator('.profile').innerText()).includes('Mutual attention'));
 await goto(p,'/profile?user=testmember');assert((await p.locator('.profile').innerText()).includes('Mutual attention'));
 await goto(p,list('testowner','from'));assert.deepEqual(await people(p),['testmember']);assert.equal(await p.locator('.relation-badge').innerText(),'Mutual attention');
 await click(p,p.locator('.attention-row button'));assert.equal(new URL(p.url()).pathname,'/attention');assert.equal(new URL(p.url()).searchParams.get('direction'),'from');
 assert.equal(new URL(p.url()).hash,'#attention-testmember');assert.deepEqual(await people(p),['testmember']);
 assert.equal(await p.locator('.attention-row button').getAttribute('aria-pressed'),'false');
 assert.equal(await p.locator('.relation-badge').innerText(),'Attention to you');
 await goto(p,list('testowner','to'));assert.deepEqual(await people(p),[]);
 await goto(p,list('testmember','from'));assert.deepEqual(await people(p),[]);
 pass('Mutual attention is directional; removing your attention never removes the other person’s attention, and row actions retain the viewed list');
 await goto(p,'/profile?user=testmember');await click(p,form(p,'attention').locator('button'));
 await goto(p,list('testowner','to'));assert.deepEqual(await people(p),['testmember']);
 const memberPost=await createPost(m,'Attention relation feed sentinel.','members');
 const otherPost=await createPost(o,'Outside attention feed sentinel.','members');
 await goto(p,'/?feed=attention');assert.equal(await p.locator(`article.note[data-href="/${memberPost}"]`).count(),1);assert.equal(await p.locator(`article.note[data-href="/${otherPost}"]`).count(),0);
 assert.equal(await p.getByRole('link',{name:'Attention',exact:true}).count(),1);
 // Muting stays independent and can be managed without making the relationship disappear.
 await goto(p,'/profile?user=testmember');await click(p,form(p,'mute').locator('button'));
 await goto(p,'/?feed=attention');assert.equal(await p.locator(`article.note[data-href="/${memberPost}"]`).count(),0);
 await goto(p,list('testowner','to'));assert.deepEqual(await people(p),['testmember']);assert((await p.locator('.attention-row').innerText()).includes('Muted'));
 await goto(p,list('testowner','from'));assert.deepEqual(await people(p),[]);
 await goto(p,'/profile?user=testmember');await click(p,form(p,'mute').locator('button'));
 pass('Attention feed uses current relationships; mute is independent, hides feed/incoming rows, and retains your manageable outgoing relation');
 await goto(p,'/notifications');assert.deepEqual(await p.locator('.activity-tabs a').allTextContents(),['All','Replies','Post attention','People attention']);
 await goto(p,'/notifications?kind=post-attention');assert((await p.locator('.activity-row').allTextContents()).every(t=>t.includes('paid attention to your post')));
 const posts=load('posts');await goto(m,'/'+posts.publicId);const postReaction=form(m,'eyes').filter({has:m.locator(`input[name=id][value="${posts.publicId}"]`)});assert.equal(await postReaction.count(),1);assert((await postReaction.innerText()).includes('Attention'));
 pass('Post buttons remain Attention; notifications distinguish Post attention and People attention without restoring Follow or Like labels');
 await goto(p,'/profile?user=testother');body=await fields(p,'attention');
 for(const [extra,status]of [[{handle:'testowner',subject:'testowner'},422],[{handle:'missing-person',subject:'missing-person'},422],[{enabled:'toggle'},403],[{subject:'//outside.invalid'},422],[{direction:'from&user=testother'},422],[{cursor:'-1'},422],[{trail:'https://outside.invalid'},422],[{owner:'testmember'},422],[{csrf:'invalid'},403]])await post(owner,{...body,...extra},status);
 const evil=await owner.request.post(base+'/action',{form:body,headers:{Origin:'https://outside.invalid'},maxRedirects:0});assert.equal(evil.status(),403);
 for(const route of ['/attention?user=testowner&direction=to&direction=from','/attention?user=testowner&direction=unknown','/attention?user=testowner&direction=to&cursor=-1','/attention?user=testowner&direction=to&cursor=999999999999','/attention?user=testowner&direction=to&return=https://outside.invalid'])assert.equal((await owner.request.get(base+route)).status(),400,route);
 assert.equal((await owner.request.get(base+list('not-existing','to'))).status(),404);
 assert.equal((await owner.request.get(base+list('testowner','to'),{headers:{Host:'outside.invalid'}})).status(),400);
 pass('Relation/query validation rejects self-action, nonexistent members, malformed state, open-redirect inputs, CSRF and foreign Host/Origin');
 // Every person row is a real anchor; controls are siblings, never nested links.
 await goto(p,list('testowner','from'));await click(p,p.locator('.attention-person').first());assert.equal(new URL(p.url()).searchParams.get('user'),'testmember');
 const cold=await session(browser,'owner',{javaScriptEnabled:false,viewport:{width:390,height:844}}),n=await cold.newPage();
 await goto(n,list('testowner','from'));await click(n,n.locator('.attention-row button'));assert.equal(new URL(n.url()).pathname,'/attention');
 await click(n,n.locator('.attention-row button'));await cold.close();
 pass('Whole identity rows navigate to profiles and native attention forms work without JavaScript');
 // A real >30-row relationship graph exercises pagination and independent people.
 await goto(p,'/admin/invitations');for(const [name,value]of Object.entries({label:'Attention directory synthetic fixtures',uses:'40',days:'1'}))await form(p,'invite').locator(`[name=${name}]`).fill(value);await click(p,form(p,'invite').locator('button'));
 const invite=new URL(await p.locator('.copy-value').innerText(),base).searchParams.get('invite');assert(invite);
 const created=[];
 for(let i=0;i<33;i++){
  const handle='attentionperson'+String(i).padStart(2,'0'),password=crypto.randomBytes(24).toString('hex');
  const context=await browser.newContext({locale:'en-US'}),page=await context.newPage();await goto(page,'/join');
  await post(context,{...await fields(page,'join'),handle,password,confirm:password,invite});
  await goto(page,'/settings/profile');
  await submit(page,'profile',{display:i===32?'Morgan & Lee <friends>':`Person ${String(i).padStart(2,'0')}`,bio:i===32?'A calm corner for experiments. <img src=x onerror="window.attentionXSS=1">':'Notes about places, projects, and everyday life.'});
  await goto(page,'/profile?user=testowner');await post(context,await fields(page,'attention'));
  created.push(handle);await context.close();
 }
 await goto(p,list('testowner','from'));const firstPage=await people(p);assert.equal(firstPage.length,30);assert.equal(firstPage[0],created.at(-1));assert.equal(await p.evaluate(()=>window.attentionXSS),undefined);
 const next=await p.getByRole('link',{name:'Next',exact:true}).getAttribute('href');await goto(p,next);const beforeUrl=p.url(),secondPage=await people(p);assert.equal(secondPage.length,4);assert.equal(new Set([...firstPage,...secondPage]).size,34);
 let row=p.locator('.attention-row').filter({has:p.locator('.attention-person[href="/profile?user='+secondPage[0]+'"]')});
 await click(p,row.locator('button'));const after=new URL(p.url()),before=new URL(beforeUrl);assert.equal(after.search,before.search);assert.equal(after.hash,'#attention-'+secondPage[0]);
 row=p.locator('#attention-'+secondPage[0]);await click(p,row.locator('button'));assert.equal(new URL(p.url()).search,before.search);
 await click(p,p.getByRole('link',{name:'Prev',exact:true}));assert.deepEqual(await people(p),firstPage);
 pass('Newest attention first, 30-row native pagination, no duplicates, exact Prev and same-page actions across a 34-person incoming graph');
 const reports=[];const script=process.env.LKJSNS_AXE?fs.readFileSync(process.env.LKJSNS_AXE,'utf8'):null;
 for(const scheme of ['light','dark'])for(const width of [320,390,768,1280]){
  await p.emulateMedia({colorScheme:scheme});await p.setViewportSize({width,height:900});
  for(const route of ['/profile?user=testowner','/profile?user=testmember',list('testowner','to'),list('testowner','from'),'/notifications']){
   await goto(p,route);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${scheme} ${width} ${route}`);
   assert.equal(await p.locator('main h1:not(.sr-only)').count(),0);
   assert(!/\b(?:Follow|Following|Followers|Unfollow|Follows)\b/.test(await p.locator('main').innerText()));
   for(const b of await p.locator('.attention-toggle,.profile-relations a,.attention-tabs a,.activity-tabs a').evaluateAll(es=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))))assert(b.w>=44&&b.h>=44,JSON.stringify(b));
  }
  await goto(p,list('testowner','from'));await p.screenshot({path:path.join(output,`attention-from-${scheme}-${width}.png`),fullPage:true});
  if(script&&(width===390||width===1280)){
   await p.evaluate(script);const result=await p.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
   reports.push({scheme,width,violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))});assert.deepEqual(result.violations,[]);
  }
 }
 fs.writeFileSync(path.join(output,'attention-accessibility.json'),JSON.stringify(reports,null,2));
 pass('Five attention/profile/notification routes at four widths in both themes, readable controls, escaped bios, no redundant page headers and automated accessibility checks');
 save('attention',{created,memberPost,otherPost,expectedIncoming:34,firstPage});
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
