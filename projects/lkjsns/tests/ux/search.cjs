const {resourceId,isResource,isEditor,chromium,base,output,path,assert,form,click,goto,pass,session,createPost,load,save}=require('./support.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const owner=await session(browser),member=await session(browser,'member'),guest=await browser.newContext({locale:'en-US'});
  const p=await owner.newPage(),m=await member.newPage(),g=await guest.newPage();
  const posts=load('posts');
  await goto(p,'/search');assert.equal(await p.locator('form.search-form input:not([type=hidden])').count(),1);
  assert.equal(await p.locator('form.search-form select').count(),0);assert.equal(await p.locator('#search-query').evaluate(e=>e===document.activeElement),true);
  await p.locator('#search-query').fill('RIVERSIDE');await click(p,p.locator('.search-form button'));
  assert.equal(await p.locator('article.note[data-href="/'+posts.publicId+'"]').count(),1);
  await goto(g,'/search?q=RIVERSIDE');assert.equal(await g.locator('article.note').count(),1);
  pass('Query-only search, autofocus and case-insensitive public post matching');
  await goto(p,'/search?q=constellation');assert.equal(await p.locator('article.note').count(),1);
  await goto(m,'/search?q=constellation');assert.equal(await m.locator('article.note').count(),1);
  await goto(g,'/search?q=constellation');assert.equal(await g.locator('article.note').count(),0);
  for(const page of [p,m,g]){await goto(page,'/search?q=nebula');assert.equal(await page.locator('article.note').count(),0);}
  pass('Search rechecks Members visibility and never exposes unpublished drafts');
  await goto(p,'/search?q=Alex');assert(await p.locator('.member').count()||await p.locator('.member-row').count()||await p.locator('.member-list a[href="/@testowner"]').count());
  await goto(g,'/search?q=Alex');assert.equal(await g.locator('.member-list').count(),0);
  pass('Member name search is available only to registered viewers');
  const japanese=await createPost(p,'日本語の検索も、余計なフィルターなしで。','public');
  await goto(g,'/search?q='+encodeURIComponent('日本語の検索'));assert.equal(await g.locator('article.note').count(),1);
  const xss='Literal <img src=x onerror="window.searchInjected=1"> in a post.';
  const escaped=await createPost(p,xss,'public');
  await goto(g,'/search?q='+encodeURIComponent('<img'));assert.equal(await g.locator('article.note').count(),1);assert.equal(await g.evaluate(()=>window.searchInjected),undefined);
  const reflected='\"><script>window.searchInjected=2</script>';
  await goto(g,'/search?q='+encodeURIComponent(reflected));assert.equal(await g.locator('#search-query').inputValue(),reflected);assert.equal(await g.evaluate(()=>window.searchInjected),undefined);
  pass('Japanese matching and escaped query/post output');
  const otherPost=await createPost(m,'A distinctive telescope update from a member.','public');
  await goto(p,'/search?q=telescope');assert.equal(await p.locator('article.note').count(),1);
  await goto(p,'/@testmember');const mute=form(p,'mute');
  if(await mute.locator('button').getAttribute('aria-pressed')!=='true')await click(p,mute.locator('button'));
  await goto(p,'/search?q=telescope');assert.equal(await p.locator('article.note').count(),0);
  await goto(p,'/@testmember');await click(p,form(p,'mute').locator('button'));
  await goto(p,'/search?q=telescope');assert.equal(await p.locator('article.note').count(),1);
  await goto(m,'/compose?id='+otherPost);await m.getByRole('link',{name:'Delete post',exact:true}).click();await m.getByRole('dialog').waitFor();await click(m,m.getByRole('button',{name:'Delete post',exact:true}));
  await goto(g,'/search?q=telescope');assert.equal(await g.locator('article.note').count(),0);
  pass('Muted authors and deleted posts are excluded using current records');
  for(const path of ['/search?q=x&q=y','/search?q=x&type=post','/search?cursor=-1','/search?q='+encodeURIComponent('a'.repeat(121))]) {
   assert.equal((await owner.request.get(base+path)).status(),400,path);
  }
  save('search',{japanese,escaped});await goto(p,'/search?q='+encodeURIComponent('日本語'));await p.screenshot({path:path.join(output,'search-desktop.png'),fullPage:true});
  pass('Duplicate, unknown and unbounded search query inputs are rejected');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
