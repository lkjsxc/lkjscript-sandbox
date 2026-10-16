// Real native requests on the isolated UX store. Never run against public data.
const {chromium,base,output,fs,path,assert,form,fields,click,goto,pass,session,submit,createPost,load,save,resourceId}=require('./support.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const owner=await session(browser),member=await session(browser,'member'),other=await session(browser,'other'),guest=await browser.newContext({locale:'en-US'});
 const p=await owner.newPage(),m=await member.newPage(),o=await other.newPage(),g=await guest.newPage();p.setDefaultTimeout(20000);
 const media=load('media');
 // More is a map, Settings is settings, and the mobile dock never expands.
 for(const route of ['/more','/settings','/drive','/saved','/search','/privacy','/terms','/guidelines','/contact']){
  await goto(p,route);assert.deepEqual(await p.locator('.mobile-nav a').allTextContents(),['Home','Post','Notifications','More'],route);
  assert.equal(await p.locator('.mobile-nav [aria-current=page]').getAttribute('href'),'/more',route);
  assert.equal(await p.locator('.sidebar-account a[href="/about"],.account a[href="/about"]').count(),0);
  assert.equal(await p.locator('a[href="/drafts"]').count(),0,route);
 }
 await goto(p,'/more');assert.equal(await p.locator('main .settings-row[href="/admin"]').count(),1);
 await goto(m,'/more');assert.equal(await m.locator('main a[href="/admin"]').count(),0);
 await goto(p,'/settings');assert.deepEqual(await p.locator('main .settings-row').evaluateAll(es=>es.map(e=>e.getAttribute('href'))),['/settings/profile','/settings/security']);
 for(const route of ['/more','/about','/privacy','/terms','/guidelines','/contact']){await goto(g,route);assert.equal(await g.locator('html').getAttribute('lang'),'en');assert.equal(await g.locator('main a[href="/admin"]').count(),0);}
 await goto(g,'/contact');assert.equal(await g.locator('main a[href="mailto:lkjsxc@gmail.com"]').count(),1);
 await goto(g,'/join');assert.equal(await g.locator('form a[href="/terms"]').count(),1);assert.equal(await g.locator('form a[href="/privacy"]').count(),1);
 pass('More, focused Settings, stable four-item mobile dock, private admin destination, and public service/contact pages');
 // Navigation is deliberately silent, but neither text nor the reply identity is lost.
 const parent=await createPost(p,'Quiet workflow parent.','public');
 await goto(p,'/compose?reply='+parent);await p.locator('[name=body]').fill('Input retained without any visible draft feature.');
 await p.locator('details summary').first().click();await p.locator('[name=cw]').fill('A small warning');
 await p.locator('[name=audience]').selectOption('members');
 assert.deepEqual(await p.locator('.form-actions button').allTextContents(),['Attach file','Post']);
 await click(p,p.getByRole('button',{name:'Attach file',exact:true}));const retained=new URL(p.url()).searchParams.get('draft');assert(retained);
 await click(p,p.locator('#file-'+media.textId+' .media-choice'));
 await click(p,p.getByRole('link',{name:'Back to writing',exact:true}));
 assert.equal(await p.locator('[name=body]').inputValue(),'Input retained without any visible draft feature.');
 assert.equal(await p.locator('[name=cw]').inputValue(),'A small warning');assert.equal(await p.locator('[name=audience]').inputValue(),'members');assert.equal(await p.locator('[name=reply]').inputValue(),parent);
 assert.equal(await p.getByRole('button',{name:/save draft|save.*preview/i}).count(),0);
 assert.equal(await p.locator('.notice').filter({hasText:/draft saved/i}).count(),0);
 assert.equal((await guest.request.get(base+'/'+retained)).status(),404);
 await goto(p,'/'+retained+'/preview');assert.equal(await p.locator('.preview-card,.preview-summary').count(),0);assert.equal(await p.locator('[name=body]').inputValue(),'Input retained without any visible draft feature.');
 pass('Attachment selection retains text, content warning, audience, reply identity and file selection without publishing or exposing drafts');
 // Native rendering escapes hostile text; opening a URL cannot navigate the
 // signed-in page or pass its opener/referrer to the destination.
 const linkBody='Read (https://links.example.test/a_(b)?x=1&y=2).\n案内 https://links.example.test/道。\n<script>alert(1)</script> javascript:alert(1)';
 const linked=await createPost(p,linkBody,'public');const original=p.url();
 const links=p.locator('.note-detail .post-link');assert.equal(await links.count(),2);
 assert.equal(await links.first().getAttribute('href'),'https://links.example.test/a_(b)?x=1&y=2');assert.equal(await links.nth(1).getAttribute('href'),'https://links.example.test/道');
 for(const link of await links.all()){assert.equal(await link.getAttribute('target'),'_blank');const rel=(await link.getAttribute('rel')).split(/\s+/);assert(rel.includes('noopener')&&rel.includes('noreferrer'));}
 assert.equal(await p.locator('.note-detail .note-body script,.note-detail .note-body img').count(),0);assert((await p.locator('.note-detail .note-body').innerText()).includes('<script>alert(1)</script>'));
 const requests=[];await owner.route('https://links.example.test/**',async route=>{requests.push(route.request().headers());await route.fulfill({status:200,contentType:'text/html',body:'<title>Synthetic link destination</title>Opened safely.'});});
 const [popup]=await Promise.all([p.waitForEvent('popup'),links.first().click()]);await popup.waitForLoadState('load');assert.equal(p.url(),original);assert.equal(await popup.evaluate(()=>window.opener),null);assert.equal(requests.length,1);assert.equal(requests[0].referer,undefined);await popup.close();
 const cold=await session(browser,'owner',{javaScriptEnabled:false});const np=await cold.newPage();await goto(np,'/'+linked);assert.equal(await np.locator('.note-detail .post-link[target="_blank"]').count(),2);await cold.close();
 pass('Native links preserve Unicode and punctuation, escape markup, open a separate tab without opener/referrer, and work without JavaScript');
 // Count exactly the same directly readable replies as the conversation list.
 async function reply(page,body,audience,mode='publish'){await goto(page,'/compose?reply='+parent);const r=await submit(page,'note',{body,audience,mode});return resourceId(r.headers().location);}
 const pub=await reply(m,'Counted public reply.','public');await reply(o,'Counted members reply.','members');await reply(p,'Private working reply must not count.','members','draft');
 const nested=await createPost(p,'Independent non-reply must not count.','public');assert(nested);
 async function count(page,expected){await goto(page,'/'+parent);assert.equal(await page.locator('.note-detail .reply-count').innerText(),String(expected));assert.equal(await page.locator('.reply-list > article.note').count(),expected);}
 await count(p,2);await count(m,2);
 await goto(p,'/profile?user=testother');await click(p,form(p,'mute').locator('button'));await count(p,1);
 await goto(p,'/profile?user=testother');await click(p,form(p,'mute').locator('button'));await count(p,2);
 await goto(m,'/'+pub+'/edit');
 await m.getByRole('link',{name:'Delete post',exact:true}).click();await m.getByRole('dialog').waitFor();await click(m,m.getByRole('dialog').getByRole('button',{name:'Delete post',exact:true}));await count(p,1);
 await goto(g,'/'+parent);assert.equal(await g.locator('.reply-list > article.note').count(),0);assert(!(await g.locator('main').innerText()).includes('Counted members reply.'));
 pass('Reply counts exclude unposted, deleted, muted and unrelated posts and match the visible direct replies');
 // Used in is the same post renderer, including content and native social actions.
 await goto(p,'/'+retained+'/edit');await click(p,p.getByRole('button',{name:'Post',exact:true}));
 await goto(p,'/'+media.textId);const usage=p.locator('.usage-posts #post-'+retained);assert.equal(await usage.count(),1);assert.equal(await usage.locator('.note-head').count(),1);assert.equal(await usage.locator('.note-actions').count(),1);assert.equal(await usage.locator('.reply-count').count(),1);
 assert.equal(await p.locator('.usage-list li').count(),0);
 await click(p,usage.locator('form').filter({has:p.locator('input[name=intent][value=eyes]')}).locator('button'));assert.equal(new URL(p.url()).pathname,'/'+media.textId);
 assert.equal(await p.locator('.usage-posts #post-'+retained+' form').filter({has:p.locator('input[name=intent][value=eyes]')}).locator('button').getAttribute('aria-pressed'),'true');
 assert.equal((await member.request.get(base+'/'+media.textId)).status(),404);
 pass('Used in renders normal post cards and keeps reactions on the owning file page without weakening file access');
 const geometry=[];
 for(const width of [320,390,768,1280]){await p.setViewportSize({width,height:900});await goto(p,'/drive');const row=await p.locator('.drive-header').evaluate(el=>{const a=el.querySelector('.quota').getBoundingClientRect(),b=el.querySelector('a').getBoundingClientRect();return{quotaRight:a.right,uploadLeft:b.left,quotaTop:a.top,quotaBottom:a.bottom,uploadTop:b.top,uploadBottom:b.bottom,scroll:document.documentElement.scrollWidth,viewport:innerWidth};});assert(row.uploadLeft>=row.quotaRight+6,JSON.stringify({width,...row}));assert(row.uploadTop<row.quotaBottom&&row.uploadBottom>row.quotaTop);assert(row.scroll<=row.viewport+1);const padding=await p.locator('.file-info').first().evaluate(el=>parseFloat(getComputedStyle(el).paddingLeft));assert(padding>=14);geometry.push({width,...row,padding});
  if(width===390||width===1280){await p.screenshot({path:path.join(output,'quiet-drive-'+width+'.png'),fullPage:true});await goto(p,'/more');await p.screenshot({path:path.join(output,'quiet-more-'+width+'.png'),fullPage:true});await goto(p,'/'+media.textId);await p.screenshot({path:path.join(output,'quiet-file-'+width+'.png'),fullPage:true});}}
 fs.writeFileSync(path.join(output,'quiet-geometry.json'),JSON.stringify(geometry,null,2));
 pass('Upload sits beside the storage meter, file-card text has breathing room, and More/Drive/Used in fit four viewport widths');
 save('quiet',{parent,retained,linked});
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
