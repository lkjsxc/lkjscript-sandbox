// Server-rendered Markdown and reply excerpts, using only the private synthetic store.
'use strict';
const {chromium,base,output,path,assert,goto,pass,session,submit,createPost,shortPostId}=require('./support.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const owner=await session(browser),p=await owner.newPage();p.setDefaultTimeout(30000);
  const source=[
   '# Heading',
   '###### Small heading',
   'Text **bold** and *italic* and ~~old~~.',
   'Nested *soft **bold within** soft* and ***both***.',
   '[Read](https://example.test/a?x=1&y=2) and [local](/about).',
   '', '- one','  - two','- [x] done','', '> Quote', '',
   '```js','<script>not markup</script>','```','',
   '| Name | Value |','| --- | --- |','| A | **B** |','',
   '![cat](https://example.test/cat.png)',
   '<img src=x onerror=alert(1)>',
   '[bad](javascript:alert(1)) [bad](//evil.test) [bad](data:text/html,evil) [bad](https://?missing-host)'
  ].join('\n');
  const id=await createPost(p,source,'public');
  const body=p.locator('.note-detail .markdown');
  assert.equal(await body.locator('h2').innerText(),'Heading');
  assert.equal(await body.locator('h6').innerText(),'Small heading');
  assert.equal(await body.locator('strong').first().innerText(),'bold');
  assert.equal(await body.locator('em').first().innerText(),'italic');
  assert.equal(await body.locator('em strong').innerText(),'bold within');
  assert.equal(await body.locator('strong em').innerText(),'both');
  assert.equal(await body.locator('del').innerText(),'old');
  assert.equal(await body.locator('ul ul li').innerText(),'two');
  assert.equal(await body.locator('input[type=checkbox]:checked:disabled').count(),1);
  assert.equal(await body.locator('blockquote').innerText(),'Quote');
  assert.equal(await body.locator('pre code').innerText(),'<script>not markup</script>\n');
  assert.equal(await body.locator('table th').count(),2);
  assert.equal(await body.locator('table td').count(),2);
  assert.equal(await body.locator('table td strong').innerText(),'B');
  assert.equal(await body.locator('a[href="https://example.test/cat.png"]').count(),1);
  assert.equal(await body.locator('img,script,iframe').count(),0);
  assert.equal(await body.locator('a[href^="javascript:"],a[href^="data:"],a[href^="//"],a[href^="https://?"]').count(),0);
  assert((await body.innerText()).includes('<img src=x onerror=alert(1)>'));
  assert.equal(await body.locator('a[href="/about"]').getAttribute('target'),null);
  const external=body.locator('a[href^="https://example.test/a?"]');
  assert.equal(await external.getAttribute('target'),'_blank');
  assert((await external.getAttribute('rel')).includes('noopener'));
  assert.equal(await body.locator('a a').count(),0);
  await goto(p,'/'+id+'/edit');assert.equal(await p.locator('textarea[name=body]').inputValue(),source);
  pass('Markdown is rendered and sanitized on the server, while the editor retains the original source');

  const malformed='['.repeat(6000)+' end <script>no execution</script> 🌍';
  await createPost(p,malformed,'public');
  assert.equal(await p.locator('.note-detail .markdown').textContent(),malformed);
  assert.equal(await p.locator('.note-detail .markdown script').count(),0);
  pass('Malformed, bounded Markdown keeps every character and does not execute HTML');

  const noScript=await browser.newContext({locale:'en-US',javaScriptEnabled:false,viewport:{width:390,height:844}});
  const cold=await noScript.newPage();await goto(cold,'/'+id);
  assert.equal(await cold.locator('.note-detail .markdown table td').count(),2);
  assert.equal(await cold.locator('.note-detail .markdown pre code').innerText(),'<script>not markup</script>\n');
  await noScript.close();
  for(const width of [320,390,768,1280])for(const scheme of ['light','dark']){
   await p.setViewportSize({width,height:900});await p.emulateMedia({colorScheme:scheme});await goto(p,'/'+id);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width} ${scheme}`);
  }
  await p.setViewportSize({width:390,height:844});await goto(p,'/'+id);await p.evaluate(()=>document.documentElement.style.fontSize='200%');
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.screenshot({path:path.join(output,'markdown-mobile.png'),fullPage:true});
  await p.setViewportSize({width:1280,height:900});await goto(p,'/');
  const card=p.locator('#post-'+id);await card.waitFor();const before=p.url();
  await p.evaluate(()=>sessionStorage.removeItem('lkjsns:reading:v1'));
  await card.locator('pre code').click();assert.equal(p.url(),before);
  assert.equal(await p.evaluate(()=>sessionStorage.getItem('lkjsns:reading:v1')),null);
  pass('Markdown works without JavaScript, remains responsive, and code can be selected without opening the post');

  const parent=await createPost(p,'**Parent** with [a link](https://example.test).','public');
  await goto(p,'/compose?reply='+parent);await p.locator('[name=body]').fill('A *formatted* reply.');
  const reply=shortPostId(await p.locator('input[name=id]').inputValue());await submit(p,'note',{body:'A *formatted* reply.',audience:'public',mode:'publish'});
  await goto(p,'/'+reply);assert.equal(await p.locator('.parent-card .context-copy').innerText(),'Parent with a link.');
  assert.equal(await p.getByRole('link',{name:/Original post by .*Parent with a link/}).count(),1);
  assert.equal(await p.locator('.note-detail .markdown em').innerText(),'formatted');
  assert.equal(await p.locator('.parent-card a,.parent-card button').count(),0);
  pass('Reply context shows readable Markdown text without nested controls');

  const longParent=await createPost(p,'**Bold parent** '+ 'x'.repeat(3000),'public');
  await goto(p,'/compose?reply='+longParent);const longReply=shortPostId(await p.locator('input[name=id]').inputValue());
  await submit(p,'note',{body:'A reply to a long parent.',audience:'public',mode:'publish'});
  await goto(p,'/'+longReply);const excerpt=await p.locator('.parent-card .context-copy').textContent();
  assert(excerpt.startsWith('Bold parent '));assert(excerpt.endsWith('…'));assert(Buffer.byteLength(excerpt)<=367);
  pass('Long formatted parents use bounded readable excerpts');

  await goto(p,'/compose');const warning=shortPostId(await p.locator('input[name=id]').inputValue());
  await submit(p,'note',{body:'**Private spoiler 9b7643**',cw:'Spoilers',audience:'public',mode:'publish'});
  await goto(p,'/compose?reply='+warning);const warnedReply=shortPostId(await p.locator('input[name=id]').inputValue());
  await submit(p,'note',{body:'A reply to the warning.',audience:'public',mode:'publish'});
  const warningGuest=await browser.newContext({locale:'en-US'});try{
   const view=await warningGuest.newPage();await goto(view,'/'+warnedReply);
   assert((await view.locator('.parent-card').innerText()).includes('Content warning: Spoilers'));
   assert(!(await view.content()).includes('Private spoiler 9b7643'));
  }finally{await warningGuest.close();}
  pass('Markdown in a content-warned parent never leaks through a reply preview');

  await goto(p,'/settings/profile');const original={display:await p.locator('[name=display]').inputValue(),bio:await p.locator('[name=bio]').inputValue()};
  try {
   await submit(p,'profile',{display:original.display,bio:'A **bold** bio with [a link](/about).'});
   await goto(p,'/@testowner');assert.equal(await p.locator('.profile .markdown strong').innerText(),'bold');
   assert.equal(await p.locator('.profile .markdown a[href="/about"]').innerText(),'a link');
   await goto(p,'/settings/profile');assert.equal(await p.locator('[name=bio]').inputValue(),'A **bold** bio with [a link](/about).');
   await submit(p,'profile',{display:original.display,bio:''});
   const anonymous=await browser.newContext({locale:'en-US'});try{
    const guest=await anonymous.newPage();await goto(guest,'/@testowner');
    assert.equal(await guest.locator('.profile > .note-body').evaluate(el=>getComputedStyle(el).display),'none');
    assert.equal(await guest.locator('.profile > .row').evaluate(el=>getComputedStyle(el).display),'none');
   }finally{await anonymous.close();}
  } finally {await goto(p,'/settings/profile');await submit(p,'profile',original);}
  pass('Profile bios render Markdown and keep their editable source');
  if(process.env.LKJSNS_CROSS_BROWSER==='1'){
   const playwright=require(process.env.LKJSNS_PLAYWRIGHT || 'playwright');
   for(const engine of ['firefox','webkit']){
    const other=await playwright[engine].launch({headless:true});try{
     for(const javaScriptEnabled of [true,false]){
      const context=await session(other,'owner',{javaScriptEnabled});try{
       const view=await context.newPage();
       for(const width of [320,390,1280]){
        await view.setViewportSize({width,height:900});await goto(view,'/'+reply);
        assert.equal(await view.locator('.parent-card .context-copy').innerText(),'Parent with a link.');
        assert.equal(await view.locator('.note-detail .markdown em').innerText(),'formatted');
        await view.evaluate(()=>document.documentElement.style.fontSize='200%');
        assert(await view.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${engine} ${width}`);
        await goto(view,'/');await view.evaluate(()=>document.documentElement.style.fontSize='200%');
        const tabs=await view.locator('.tabs[aria-label="Feed"]').evaluate(e=>({width:e.clientWidth,content:e.scrollWidth}));assert(tabs.content<=tabs.width+1,JSON.stringify({engine,width,tabs}));
        if(javaScriptEnabled && await view.locator('[data-load-all]').count()){
         await view.waitForFunction(()=>document.querySelector('[data-load-all]')?.hidden);
         assert.equal(await view.locator('.timeline-loading').evaluate(el=>el.getBoundingClientRect().height),0);
        }
        for(const height of await view.locator('main .pager .button').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height)))assert(height>=44);
        await goto(view,'/?cursor=0');await view.evaluate(()=>document.documentElement.style.fontSize='200%');
        for(const size of await view.locator('main .pager .button').evaluateAll(es=>es.map(e=>({width:e.clientWidth,content:e.scrollWidth}))))assert(size.content<=size.width+1,JSON.stringify({engine,width,size}));
       }
      }finally{await context.close();}
     }
    }finally{await other.close();}
   }
   pass('Firefox and WebKit retain compact pagination and readable replies with and without JavaScript');
  }
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
