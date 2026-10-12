// Native reply rendering regression tests. Only synthetic loopback accounts.
const {chromium,base,fixture,output,fs,path,assert,form,fields,click,goto,pass,session,createPost,submit,resourceId,save}=require('./support.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const owner=await session(browser),member=await session(browser,'member'),guest=await browser.newContext({locale:'en-US'});
 const p=await owner.newPage(),m=await member.newPage(),g=await guest.newPage();p.setDefaultTimeout(20000);
 async function reply(page,to,body,{audience='public',cw='',mode='publish'}={}){await goto(page,'/compose?reply='+to);await page.locator('[name=body]').fill(body);const r=await submit(page,'note',{body,cw,audience,mode});await goto(page,r.headers().location);return resourceId(r.headers().location);}
 async function remove(page,id){await goto(page,'/'+id+'/edit');await page.getByRole('link',{name:'Delete post',exact:true}).click();await page.getByRole('dialog').waitFor();await click(page,page.getByRole('dialog').getByRole('button',{name:'Delete post',exact:true}));}
 const body='A parent line with 日本語 and 🌍.\n'.repeat(30);const parent=await createPost(p,body,'public');
 const child=await reply(m,parent,'This is the first child reply.');const nested=await reply(p,child,'This is a reply to the child, not the root.');
 for(const route of ['/','/profile?user=testmember','/search?q='+encodeURIComponent('first child reply')]){
  await goto(p,route);const card=p.locator('#post-'+child);assert.equal(await card.count(),1);
  assert.equal(await card.locator('.parent-card').getAttribute('href'),'/'+parent);
  assert.equal(await card.locator('.note-body').innerText(),'This is the first child reply.');
  assert.equal(await card.locator('.parent-card a,.parent-card button').count(),0);
  assert.equal(await card.locator('.parent-card').getAttribute('target'),null);
 }
 await goto(p,'/'+child);await click(p,p.locator('.note-detail form').filter({has:p.locator('input[name=intent][value=bookmark]')}).locator('button'));await goto(p,'/saved');assert.equal(await p.locator('#post-'+child+' .parent-card').getAttribute('href'),'/'+parent);
 pass('Reply cards retain a bounded clickable parent in Home, profiles, Search and Bookmarks without nested controls');
 const geometry=[];
 for(const scheme of ['light','dark'])for(const width of [320,390,768,1280]){
  await p.emulateMedia({colorScheme:scheme});await p.setViewportSize({width,height:844});await goto(p,'/'+child);
  const metrics=await p.locator('.note-detail').evaluate(el=>{const preview=el.querySelector('.parent-card'),summary=preview.querySelector('.context-copy'),body=el.querySelector('.note-body');return{parentHeight:preview.getBoundingClientRect().height,summaryHeight:summary.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(summary).lineHeight),replyTop:body.getBoundingClientRect().top,summaryBytes:new TextEncoder().encode(summary.textContent).length,overflow:document.documentElement.scrollWidth>innerWidth+1};});
  assert(metrics.parentHeight<160,JSON.stringify(metrics));assert(metrics.summaryHeight<=metrics.lineHeight*3+1);assert(metrics.replyTop<460,JSON.stringify(metrics));assert(metrics.summaryBytes<=367);assert(!metrics.overflow);
  assert.equal(await p.locator('.note-detail .parent-card').count(),1);assert.equal(await p.locator('.reply-list #post-'+nested+' .parent-card').count(),0);geometry.push({scheme,width,...metrics});
 }
 fs.writeFileSync(path.join(output,'reply-geometry.json'),JSON.stringify(geometry,null,2));
 await p.emulateMedia({colorScheme:'light'});await p.setViewportSize({width:390,height:844});await goto(p,'/'+child);await p.screenshot({path:path.join(output,'reply-after-mobile.png'),fullPage:true});
 await p.setViewportSize({width:1280,height:950});await p.screenshot({path:path.join(output,'reply-after-desktop.png'),fullPage:true});
 pass('Long multilingual parents stay within three preview lines; reply text stays in the first viewport at four widths and two themes');
 // Native identity and links must continue to identify the intended reply level.
 await goto(p,'/'+parent);assert.equal(await p.locator('.reply-list #post-'+child).count(),1);assert.equal(await p.locator('.reply-list #post-'+nested).count(),0);
 await click(p,p.locator('.reply-list #post-'+child+' .note-body'));assert.equal(new URL(p.url()).pathname,'/'+child);
 await click(p,p.locator('.note-detail .parent-card'));assert.equal(new URL(p.url()).pathname,'/'+parent);
 await goto(p,'/'+nested);assert.equal(await p.locator('.note-detail .parent-card').getAttribute('href'),'/'+child);
 await click(p,p.locator('.note-detail .note-actions').getByRole('link',{name:'Reply',exact:true}));assert.equal(new URL(p.url()).searchParams.get('reply'),nested);
 assert.equal(await p.locator('.composer .parent-card').getAttribute('target'),'_blank');
 pass('Nested replies point to their immediate parent; post clicks and Reply target the correct resource and preserve composition links');
 // Saving, previewing and editing must not lose reply identity or duplicate the index.
 const draft=await reply(m,parent,'Draft reply that will be published from preview.',{mode:'draft'});
 await goto(p,'/'+parent);assert.equal(await p.locator('.reply-list #post-'+draft).count(),0);
 await goto(m,'/'+draft+'/edit');await click(m,m.getByRole('button',{name:'Save & preview',exact:true}));await click(m,m.getByRole('button',{name:'Post',exact:true}));
 await goto(p,'/'+parent);assert.equal(await p.locator('.reply-list #post-'+draft).count(),1);
 await goto(m,'/'+draft+'/edit');const updated=await submit(m,'note',{body:'Edited reply stays in the same conversation.',mode:'publish'});await goto(m,updated.headers().location);
 await goto(p,'/'+parent);assert.equal(await p.locator('.reply-list #post-'+draft).count(),1);assert.equal(await p.locator('#post-'+draft+' .note-body').innerText(),'Edited reply stays in the same conversation.');
 pass('Saved and previewed replies publish into their parent once; edits retain the same reply identity');
 // Content warnings must not leak the parent's underlying body through an excerpt.
 await goto(p,'/compose');const warningBody='Hidden parent content 8fb905';const created=await submit(p,'note',{body:warningBody,cw:'Spoilers',audience:'public',mode:'publish'});const warningParent=resourceId(created.headers().location);
 const warningChild=await reply(m,warningParent,'A safe reply to a warning.');await goto(g,'/'+warningChild);
 assert((await g.locator('.parent-card').innerText()).includes('Content warning: Spoilers'));assert(!(await g.content()).includes(warningBody));assert.equal(await g.locator('.parent-card img,.parent-card video,.parent-card audio').count(),0);
 const privateParent=await createPost(p,'Private parent d48649','members');const privateChild=await reply(m,privateParent,'Private child 90d091',{audience:'members'});
 const denied=await guest.request.get(base+'/'+privateChild);assert.equal(denied.status(),404);assert(!(await denied.text()).includes('Private parent'));assert(!(await denied.text()).includes('Private child'));
 pass('Warning text, private parents and private replies remain protected in previews and direct URLs');
 // Muting and deletion hide only the inaccessible parent context, not independent child content.
 const otherParent=await createPost(m,'Unique parent body cb7f56','public');const ownReply=await reply(p,otherParent,'Own reply that survives unavailable context.');
 await goto(p,'/profile?user=testmember');await click(p,form(p,'mute').locator('button'));await goto(p,'/'+ownReply);
 assert.equal(await p.locator('.note-detail .parent-card').count(),0);assert.equal(await p.locator('.note-detail .parent-unavailable').innerText(),'Original post unavailable.');assert(!(await p.content()).includes('Unique parent body cb7f56'));
 assert(!(await p.locator('main').innerText()).includes('save this reply as a draft'));assert((await p.locator('.note-detail .note-body').innerText()).includes('Own reply'));
 await goto(g,'/'+ownReply);assert.equal(await g.locator('.note-detail .parent-card').count(),1);
 await goto(p,'/profile?user=testmember');await click(p,form(p,'mute').locator('button'));await remove(m,otherParent);await goto(g,'/'+ownReply);
 assert.equal(await g.locator('.parent-card').count(),0);assert(!(await g.content()).includes('Unique parent body cb7f56'));assert((await g.locator('.note-body').innerText()).includes('Own reply'));
 pass('Muted or deleted parents become a compact unavailable context without leaking text or showing editor instructions');
 // A real uploaded attachment is authorized through the child, not its parent.
 await goto(m,'/compose?reply='+parent);await m.locator('[name=body]').fill('An image attached to this reply.');await click(m,m.getByRole('button',{name:'Save & choose files',exact:true}));await click(m,m.getByRole('link',{name:'Upload',exact:true}));
 await m.locator('input[type=file]').setInputFiles(path.join(output,'media','landscape-2.png'));await Promise.all([m.waitForURL(u=>/^\/[a-f0-9]{64}\/edit$/.test(u.pathname)),m.getByRole('button',{name:'Upload',exact:true}).click()]);
 const imageReply=resourceId(m.url());await click(m,m.getByRole('button',{name:'Post',exact:true}));await goto(g,'/'+imageReply);
 const image=g.locator('.note-detail .media-original img');await image.waitFor();await image.evaluate(el=>el.decode());assert(await image.evaluate(el=>el.naturalWidth>0));
 const imageURL=new URL(await image.getAttribute('src'),base);assert.equal(imageURL.searchParams.get('note'),imageReply);
 const blob=await guest.request.get(imageURL.href);assert.equal(blob.status(),200);assert.deepEqual(await blob.body(),fs.readFileSync(path.join(output,'media','landscape-2.png')));
 imageURL.searchParams.set('note',parent);assert.equal((await guest.request.get(imageURL.href)).status(),404);
 pass('An image reply renders the correct original and preserves child-specific media authorization');
 // Skip windows made entirely of removed replies; do not claim no replies globally.
 const sparseParent=await createPost(p,'Sparse conversation pagination regression.','public');const survivor=await reply(p,sparseParent,'Older surviving reply.');
 for(let i=0;i<31;i++){const id=await reply(p,sparseParent,'Temporary reply '+i);await remove(p,id);}
 await goto(p,'/'+sparseParent);assert.equal(await p.locator('.reply-list #post-'+survivor).count(),1);assert(!(await p.locator('.reply-list').innerText()).includes('No replies'));
 pass('Deleted reply windows no longer hide an older readable reply on the first thread page');
 const cold=await session(browser,'owner',{javaScriptEnabled:false,viewport:{width:390,height:844}});const np=await cold.newPage();await goto(np,'/'+nested);const link=np.locator('.note-detail .parent-card');await link.focus();await Promise.all([np.waitForNavigation(),np.keyboard.press('Enter')]);assert.equal(new URL(np.url()).pathname,'/'+child);await cold.close();
 pass('Reply context remains keyboard-operable with JavaScript disabled');
 const axePath=process.env.LKJSNS_AXE;if(axePath){const reports=[];for(const [name,id]of [['long-parent',child],['image-reply',imageReply],['unavailable-parent',ownReply]]){await goto(p,'/'+id);await p.evaluate(fs.readFileSync(axePath,'utf8'));const result=await p.evaluate(async()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));reports.push({name,violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))});}
  fs.writeFileSync(path.join(output,'reply-accessibility.json'),JSON.stringify(reports,null,2));assert(reports.every(r=>r.violations.length===0),JSON.stringify(reports));pass('Long, image and unavailable-parent reply pages pass the selected automated accessibility checks');}
 save('reply-regressions',{parent,child,nested,imageReply,warningChild,ownReply,sparseParent,survivor});
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
