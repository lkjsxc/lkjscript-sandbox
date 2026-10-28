// Synthetic acceptance for incremental timeline rendering and a stable page boundary.
'use strict';
const {chromium,base,assert,fields,goto,click,session,newPostId,pass}=require('./support.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const owner=await session(browser),p=await owner.newPage();p.setDefaultTimeout(30000);
  await goto(p,'/compose');const seed=await fields(p,'note');const ids=[];
  async function create(label){
   const id=newPostId();const r=await owner.request.post(base+'/action',{headers:{Origin:base},maxRedirects:0,
    form:{...seed,id,version:'0',reply:'',body:label,cw:'',audience:'public',mode:'publish',return:'/'}});
   assert.equal(r.status(),303);return id;
  }
  for(let i=0;i<35;i++)ids.push(await create('Progressive specimen '+i));
  const noScript=await session(browser,'owner',{javaScriptEnabled:false});const plain=await noScript.newPage();
  await goto(plain,'/');
  assert.equal(await plain.locator('.feed[data-progressive] article.note').count(),10);
  await click(plain,plain.getByRole('link',{name:'Load remaining posts'}));
  assert.equal(await plain.locator('.feed[data-progressive] article.note').count(),30);
  await noScript.close();

  const chunk=url=>url.searchParams.get('chunk')==='1';
  const fail=route=>route.abort();
  await p.route(chunk,fail);await goto(p,'/');
  await p.getByText('Could not load more posts. Use the link to try again.').waitFor();
  assert(await p.locator('.timeline-loading').isVisible());
  assert(await p.locator('[data-load-all]').isVisible());
  await p.unroute(chunk,fail);
  pass('A failed progressive request keeps a visible native fallback');

  let inserted=false;
  await p.route(url=>url.searchParams.get('chunk')==='1',async route=>{
   if(!inserted){inserted=true;await create('Concurrent newer post');}
   await route.continue();
  });
  await goto(p,'/');
  await p.locator('[data-load-all][hidden]').waitFor({state:'attached'});
  assert.equal(await p.locator('.timeline-loading').evaluate(el=>el.getBoundingClientRect().height),0);
  const rendered=await p.locator('.feed[data-progressive] article.note').evaluateAll(nodes=>nodes.map(n=>n.id.replace(/^post-/,'')));
  assert.equal(rendered.length,30);assert.equal(new Set(rendered).size,30);
  assert.deepEqual(rendered,ids.slice().reverse().slice(0,30));
  pass('Timeline renders incrementally, retains a stable page under concurrent posts, and has a no-script fallback');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
