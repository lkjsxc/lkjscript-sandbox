// Synthetic end-to-end checks for paged reading and long-post search.
const {chromium,base,assert,goto,pass,session}=require('./support.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const owner=await session(browser),p=await owner.newPage();p.setDefaultTimeout(180000);
 const header='Opening line\n```\n'+'x'.repeat(16383)+'🌱\ncontinued fenced code\n```\n**Bold after fence**\n';
 const pad='a'.repeat(65530-Buffer.byteLength(header));
 const text=header+pad+'RareBoundaryNeedle'+'z'.repeat(10000)+' THE_END_MARKER\n**Bold after long line**\n';
 assert(Buffer.byteLength(text)>65536);
 await goto(p,'/compose');const id=await p.locator('[name=id]').inputValue();
 await p.locator('[name=body]').fill(text);await p.locator('[name=audience]').selectOption('public');
 await Promise.all([p.waitForURL(base+'/',{timeout:180000}),p.getByRole('button',{name:'Post',exact:true}).click()]);
 const guest=await browser.newContext({javaScriptEnabled:false}),g=await guest.newPage();g.setDefaultTimeout(180000);
 await goto(g,'/'+id);await g.locator('.note-detail').getByRole('link',{name:'Read full post'}).click();
 let pre=0,bold=false,boldAfterLong=false,unicode=false,tail=false,pages=0;
 while(true){
  pre+=await g.locator('.post-body-page pre code').count();
  const strong=await g.locator('.post-body-page strong').allTextContents();
  bold=bold || strong.includes('Bold after fence');
  boldAfterLong=boldAfterLong || strong.includes('Bold after long line');
  const pageText=await g.locator('.post-body-page').innerText();
  unicode=unicode || pageText.includes('🌱');
  tail=tail || pageText.includes('THE_END_MARKER');
  pages++;assert(pages<20,'unexpectedly many text pages');
  const next=g.locator('.post-body-page a[rel=next]');if(!(await next.count()))break;
  if(pages===2)assert.equal(await g.locator('.post-body-page a[rel=prev]').count(),1);
  await next.click();
 }
 assert(pre>=2,'fenced code should continue across pages');assert(bold);assert(boldAfterLong);assert(unicode);assert(tail);assert(pages>1);
 pass('Long post pages preserve Unicode, fenced Markdown, the full tail, and no-script navigation');

 await goto(g,'/search-long?q=RareBoundaryNeedle');
 const found=g.locator('.long-post-search article.note#post-'+id);
 assert.equal(await found.count(),1,'search finds a match across the 64 KiB boundary');
 await goto(p,'/search?q=RareBoundaryNeedle');
 await p.getByRole('link',{name:'Search inside long posts'}).click();
 await p.locator('[data-long-search-results] article.note#post-'+id).waitFor({timeout:180000});
 pass('Long post search finds cross-boundary text in native and progressive flows');

 const secret='link-only-secret-tail-'+Date.now();
 await goto(p,'/compose');const privateId=await p.locator('[name=id]').inputValue();
 await p.locator('[name=body]').fill('private '.repeat(9000)+secret);
 await p.locator('[name=audience]').selectOption('link-only');
 await Promise.all([p.waitForURL(base+'/',{timeout:180000}),p.getByRole('button',{name:'Post',exact:true}).click()]);
 await goto(p,'/link-posts');const card=p.locator('article.note#post-'+privateId);
 const share=new URL(await card.locator('a.share-link').getAttribute('href'),base).searchParams.get('share');
 assert(share);
 assert.equal((await g.request.get(base+'/post-body/read?note='+privateId+'&version=1')).status(),404);
 assert.equal((await g.request.get(base+'/post-body/read?note='+privateId+'&version=1&share='+share)).status(),200);
 await goto(g,'/search-long?q='+encodeURIComponent(secret));
 assert.equal(await g.locator('.long-post-search article.note#post-'+privateId).count(),0);
 pass('Link-only long text requires its share token and is excluded from search');
 await guest.close();
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1;});
