// Synthetic end-to-end checks for continuous reading and long-post search.
const {chromium,base,assert,goto,pass,session}=require('./support.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const owner=await session(browser),p=await owner.newPage();p.setDefaultTimeout(180000);
 const ticks=String.fromCharCode(96).repeat(3);
 const header='Opening line\n'+ticks+'\n'+'x'.repeat(16383)+'🌱\ncontinued fenced code\n'+ticks+'\n**Bold after fence**\n';
 const pad='a'.repeat(65530-Buffer.byteLength(header));
 const text=header+pad+'RareBoundaryNeedle'+'z'.repeat(310000)+' THE_END_MARKER\n**Bold after long line**\n<script>window.badPost=true</script>\n';
 assert(Buffer.byteLength(text)>262195);
 await goto(p,'/compose');const id=await p.locator('[name=id]').inputValue();
 await p.locator('[name=body]').fill(text);await p.locator('[name=audience]').selectOption('public');
 await Promise.all([p.waitForURL(base+'/',{timeout:180000}),p.getByRole('button',{name:'Post',exact:true}).click()]);

 const guest=await browser.newContext(),g=await guest.newPage();g.setDefaultTimeout(180000);
 let requests=0;
 const failSecond=route=>{
  if(new URL(route.request().url()).searchParams.get('fragment')==='1' && ++requests===2)return route.abort();
  return route.continue();
 };
 await g.route('**/post-body/read?**',failSecond);
 await goto(g,'/'+id);await g.locator('.note-detail').getByRole('link',{name:'Read full post'}).click();
 await g.locator('[data-post-retry]').waitFor({state:'visible',timeout:180000});
 assert(requests>=2,'the first bounded response should be shown before the interruption');
 const before=await g.locator('[data-post-complete]').textContent();assert(before.includes('Opening line'));assert(!before.includes('THE_END_MARKER'));
 await g.unroute('**/post-body/read?**',failSecond);
 await g.locator('[data-post-retry]').click();
 await g.waitForFunction(()=>document.querySelector('[data-post-complete]')?.textContent.includes('THE_END_MARKER') &&
   document.querySelector('[data-post-status]')?.hidden,null,{timeout:180000});
 const complete=g.locator('[data-post-complete]'),output=await complete.textContent();
 assert.equal(output.split('Opening line').length-1,1,'retry must not duplicate earlier text');
 assert.equal(await complete.locator('pre code').count(),1,'a continued fence is one code block');
 assert.equal(await complete.locator('pre code').textContent(),'x'.repeat(16383)+'🌱\ncontinued fenced code\n');
 const strong=await complete.locator('strong').allTextContents();
 assert(strong.includes('Bold after fence'));assert(strong.includes('Bold after long line'));
 assert(output.includes('THE_END_MARKER'));assert(output.includes('<script>window.badPost=true</script>'));
 assert.equal(await complete.locator('script').count(),0);assert.equal(await g.evaluate(()=>window.badPost),undefined);
 assert.equal(await g.locator('.post-body-page a[rel=next], .post-body-page a[rel=prev], .post-body-page nav.pagination').count(),0);
 pass('Long posts load continuously, preserve Unicode and Markdown, and resume without duplication');

 const noScript=await browser.newContext({javaScriptEnabled:false}),n=await noScript.newPage();n.setDefaultTimeout(180000);
 await goto(n,'/'+id);await n.locator('.note-detail').getByRole('link',{name:'Read full post'}).click();
 assert((await n.locator('.post-body-page').innerText()).includes('JavaScript is required to read the full post.'));
 assert.equal(await n.locator('.post-body-page a[rel=next], .post-body-page a[rel=prev]').count(),0);
 pass('Without JavaScript, long posts keep their preview and explain full reading');

 await goto(n,'/search-long?q=RareBoundaryNeedle');
 const found=n.locator('.long-post-search article.note#post-'+id);
 assert.equal(await found.count(),1,'search finds a match across the 64 KiB boundary');
 await goto(p,'/search?q=RareBoundaryNeedle');
 await p.getByRole('link',{name:'Search inside long posts'}).click();
 await p.locator('[data-long-search-results] article.note#post-'+id).waitFor({timeout:180000});
 pass('Long post search finds cross-boundary text in native and progressive flows');

 const secret='link-only-secret-tail-'+Date.now();
 await goto(p,'/compose');const privateId=await p.locator('[name=id]').inputValue();
 await p.locator('[name=body]').fill('private '.repeat(45000)+secret);
 await p.locator('[name=audience]').selectOption('link-only');
 await Promise.all([p.waitForURL(base+'/',{timeout:180000}),p.getByRole('button',{name:'Post',exact:true}).click()]);
 await goto(p,'/link-posts');const card=p.locator('article.note#post-'+privateId);
 const share=new URL(await card.locator('a.share-link').getAttribute('href'),base).searchParams.get('share');
 assert(share);
 const read=base+'/post-body/read?note='+privateId+'&version=1';
 assert.equal((await g.request.get(read)).status(),404);
 assert.equal((await g.request.get(read+'&share='+share)).status(),200);
 assert.equal((await g.request.get(read+'&fragment=1')).status(),404);
 assert.equal((await g.request.get(read+'&fragment=1&share='+share)).status(),200);
 await goto(n,'/search-long?q='+encodeURIComponent(secret));
 assert.equal(await n.locator('.long-post-search article.note#post-'+privateId).count(),0);
 pass('Link-only full text and fragments require their share token and stay out of search');

 let release, reached;
 const blocked=new Promise(resolve=>{release=resolve;}),second=new Promise(resolve=>{reached=resolve;});
 let privateRequests=0;
 const holdSecond=async route=>{
  if(new URL(route.request().url()).searchParams.get('fragment')==='1' && ++privateRequests===2){reached();await blocked;}
  await route.continue();
 };
 await g.route('**/post-body/read?**',holdSecond);
 try {
  await goto(g,'/'+privateId+'?share='+share);
  await g.locator('.note-detail').getByRole('link',{name:'Read full post'}).click();
  await Promise.race([second,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('second fragment not requested')),180000);timer.unref();})]);
  await goto(p,'/'+privateId+'/edit');
  await p.locator('[name=body]:not([disabled])').waitFor({timeout:180000});
  await p.locator('[name=body]').fill('Replacement text.');
  await Promise.all([p.waitForURL(new RegExp('/'+privateId+'(?:\\?.*)?$'),{timeout:180000}),p.getByRole('button',{name:'Save changes'}).click()]);
 } finally {release();}
 await g.waitForFunction(()=>/unavailable or has changed/i.test(document.querySelector('[data-post-status]')?.textContent||''),null,{timeout:180000});
 assert.equal(await g.locator('[data-post-retry]').isHidden(),true);
 assert(!(await g.locator('[data-post-complete]').textContent()).includes(secret));
 await g.unroute('**/post-body/read?**',holdSecond);
 pass('A post edit stops an in-progress read rather than mixing versions');

 await goto(p,'/compose');const warningId=await p.locator('[name=id]').inputValue();
 await p.locator('[name=body]').fill('warning body '.repeat(6000)+' WARNING_END');
 await p.locator('[name=audience]').selectOption('public');
 await p.getByText('Content warning',{exact:true}).click();await p.locator('[name=cw]').fill('Sensitive topic');
 await Promise.all([p.waitForURL(base+'/',{timeout:180000}),p.getByRole('button',{name:'Post',exact:true}).click()]);
 let warningRequests=0;
 const countWarning=route=>{if(new URL(route.request().url()).searchParams.get('fragment')==='1')warningRequests++;return route.continue();};
 await g.route('**/post-body/read?**',countWarning);
 await goto(g,'/'+warningId);await g.locator('.note-detail details.cw summary').click();
 await g.locator('.note-detail').getByRole('link',{name:'Read full post'}).click();
 assert.equal(warningRequests,0);assert.equal(await g.locator('.post-body-page details.cw').getAttribute('open'),null);
 await g.locator('.post-body-page details.cw summary').click();
 await g.waitForFunction(()=>document.querySelector('[data-post-complete]')?.textContent.includes('WARNING_END'),null,{timeout:180000});
 assert(warningRequests>0);await g.unroute('**/post-body/read?**',countWarning);
 pass('Content warnings keep the full text hidden until opened');
 await noScript.close();await guest.close();
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1;});
