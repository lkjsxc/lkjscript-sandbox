// Synthetic coverage for compact spacing and accessible mobile navigation.
'use strict';
const {chromium,base,output,path,assert,goto,pass,session,createPost,crypto}=require('./support.cjs');

(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const context=await session(browser),page=await context.newPage();
  page.setDefaultTimeout(30000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const body='Compact spacing '+crypto.randomBytes(3).toString('hex');
  await createPost(page,body,'public');

  // These measurements were recorded for the same synthetic account and content
  // before the spacing update. Compare visible results, not CSS declarations.
  const previous={390:{post:188.65625,row:82.78125},1280:{post:191.859375,row:84.78125}};
  for(const width of [390,1280]){
   await page.setViewportSize({width,height:900});
   await goto(page,'/');
   const card=page.locator('article.note').filter({has:page.locator('.note-body',{hasText:body})}).first();
   await card.waitFor({state:'visible'});
   const post=await card.boundingBox();
   assert(post.height<=previous[width].post*.8+.5,JSON.stringify({width,post:post.height,previous:previous[width].post}));
   for(const target of await card.locator('.note-actions button,.note-actions a.button').all()){
    const box=await target.boundingBox();
    assert(box.height>=44,JSON.stringify({width,target:await target.innerText(),box}));
   }
   await page.screenshot({path:path.join(output,`density-home-${width}.png`)});
   await goto(page,'/more');
   const row=await page.locator('main .settings-row').first().boundingBox();
   assert(row.height<=previous[width].row*.85+.5,JSON.stringify({width,row:row.height,previous:previous[width].row}));
   await page.screenshot({path:path.join(output,`density-more-${width}.png`)});
   await goto(page,'/compose');
   const editor=page.locator('textarea[name=body]');
   const geometry=await editor.evaluate(el=>({height:el.getBoundingClientRect().height,resize:getComputedStyle(el).resize}));
   assert(Math.abs(geometry.height-(width===390?160:180))<=1,JSON.stringify({width,geometry}));
   assert.equal(geometry.resize,'vertical');
   const longText=('日本語 and multiline text remain editable.\n').repeat(40);
   await editor.fill(longText);assert.equal(await editor.inputValue(),longText);
  }
  pass('Short posts, More rows, and the resizable editor use the compact layout');

  for(const width of [320,390]){
   await page.setViewportSize({width,height:900});
   for(const fontSize of ['100%','200%']){
    await goto(page,'/');
    await page.evaluate(size=>{document.documentElement.style.fontSize=size},fontSize);
    await page.waitForFunction(()=>{const link=document.querySelector('[data-load-all]');return !link||link.hidden});
    await page.evaluate(async()=>{scrollTo(0,document.documentElement.scrollHeight);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)});
    const info=await page.evaluate(()=>{
     const dock=document.querySelector('.mobile-nav').getBoundingClientRect();
     const last=[...document.querySelectorAll('main .pager')].at(-1).getBoundingClientRect();
     return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,dockTop:dock.top,dockBottom:dock.bottom,lastBottom:last.bottom};
    });
    assert(info.scrollWidth<=info.width+1,JSON.stringify({width,fontSize,info}));
    assert(info.dockBottom>=899,JSON.stringify({width,fontSize,info}));
    assert(info.lastBottom<=info.dockTop+1,JSON.stringify({width,fontSize,info}));
    if(fontSize==='100%'){
     const links=await page.locator('.mobile-nav a').evaluateAll(es=>es.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));
     for(const target of links)assert(target.width>=44&&target.height>=44,JSON.stringify({width,target}));
     const buttons=await page.locator('main .pager .button').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
     for(const height of buttons)assert(height>=48,JSON.stringify({width,height}));
    }
   }
  }
  pass('Mobile navigation remains usable and does not cover pagination, including with enlarged text');

  const guest=await browser.newContext({locale:'en-US',javaScriptEnabled:false,viewport:{width:390,height:900}});
  const cold=await guest.newPage();await goto(cold,'/');
  const empty=cold.locator('.note-actions:empty').first();assert(await empty.count());
  assert.equal(await empty.evaluate(el=>getComputedStyle(el).display),'none');
  await cold.evaluate(()=>{document.documentElement.style.fontSize='200%'});
  await cold.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  const noScript=await cold.evaluate(()=>({dock:document.querySelector('.mobile-nav').getBoundingClientRect().top,last:[...document.querySelectorAll('main .pager')].at(-1).getBoundingClientRect().bottom}));
  assert(noScript.last<=noScript.dock+1,JSON.stringify(noScript));
  await guest.close();
  assert.deepEqual(errors,[]);
  pass('Guest pages omit empty action spacing and retain an unobstructed dock without JavaScript');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
