// Synthetic end-to-end coverage for pagination, returning from composition, and shortcuts.
'use strict';
const {chromium,base,assert,fields,goto,click,session,newPostId,pass}=require('./support.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const context=await session(browser);const page=await context.newPage();
  page.setDefaultTimeout(30000);
  await goto(page,'/compose');
  const seed=await fields(page,'note');
  for(let i=0;i<35;i++){
   const response=await context.request.post(base+'/action',{headers:{Origin:base},maxRedirects:0,
    form:{...seed,id:newPostId(),version:'0',reply:'',body:'Reading improvement '+i,cw:'',audience:'public',mode:'publish',return:'/'}});
   assert.equal(response.status(),303);
  }
  await goto(page,'/');
  let pagers=page.getByRole('navigation',{name:'Pagination',exact:true});
  assert.equal(await pagers.count(),1);
  assert.equal(await pagers.locator('button.pager-prev:disabled').count(),1);
  assert.equal(await pagers.locator('a[rel=next]').count(),1);
  await click(page,pagers.locator('a[rel=next]'));
  pagers=page.getByRole('navigation',{name:'Pagination',exact:true});
  assert.equal(await pagers.count(),2);
  assert.equal(await pagers.locator('a[rel=prev]').count(),2);
  const olderLinks=await pagers.locator('a[rel=next]').count();
  const disabledOlder=await pagers.locator('button.pager-next:disabled').count();
  assert((olderLinks===2&&disabledOlder===0)||(olderLinks===0&&disabledOlder===2));
  const reading=new URL(page.url());assert(reading.searchParams.has('cursor'));
  await page.evaluate(()=>scrollTo(0,300));
  await click(page,page.locator('.sidebar a[href="/compose"]'));
  assert.equal(await page.locator('input[name=return]').inputValue(),reading.pathname+reading.search);
  await page.locator('textarea[name=body]').fill('Return from a real attachment workflow');
  await click(page,page.getByRole('button',{name:'Attach file',exact:true}));
  await click(page,page.getByRole('link',{name:'Back to writing',exact:true}));
  assert.equal(await page.locator('input[name=return]').inputValue(),reading.pathname+reading.search);
  await click(page,page.getByRole('button',{name:'Post',exact:true}));
  assert.equal(new URL(page.url()).pathname+new URL(page.url()).search,reading.pathname+reading.search);
  pass('Pagination has disabled boundaries and posting returns to the exact prior timeline after attachment selection');
  await goto(page,'/?cursor=0');
  pagers=page.getByRole('navigation',{name:'Pagination',exact:true});
  assert.equal(await pagers.count(),2);
  assert.equal(await pagers.locator('button.pager-next:disabled').count(),2);
  assert.equal(await pagers.locator('a[rel=first]').count(),2);
  for (const width of [320,390,1280]) {
    await page.setViewportSize({width,height:900});
    for (const link of await page.locator('.pager a[rel=first]').all()) {
      const box=await link.boundingBox();assert(box.width>=44&&box.height>=44,JSON.stringify({width,box}));
    }
  }
  await page.setViewportSize({width:1280,height:1000});

  await goto(page,'/');
  assert.equal(await page.locator('.shortcut-help-button').count(),0);
  await page.setViewportSize({width:390,height:844});
  await goto(page,'/more');
  const helpButton=page.getByRole('button',{name:'Keyboard shortcuts View keys and preferences.'});
  assert.equal(await helpButton.isVisible(),true);
  await helpButton.click();
  await page.getByRole('dialog',{name:'Keyboard shortcuts'}).getByRole('button',{name:'Close'}).click();
  assert.equal(await helpButton.evaluate(element=>document.activeElement===element),true);
  await page.setViewportSize({width:1280,height:1000});
  await goto(page,'/');
  assert.equal(await page.locator('.shortcut-help-button').count(),0);
  await page.keyboard.press('j');
  assert.equal(await page.locator('article.note.keyboard-current').count(),1);
  await page.keyboard.press('k');
  assert.equal(await page.locator('article.note.keyboard-current').count(),1);
  await page.keyboard.press('?');
  const dialog=page.getByRole('dialog',{name:'Keyboard shortcuts'});
  assert.equal(await dialog.count(),1);
  await dialog.getByLabel('Enable single-key shortcuts').uncheck();
  await dialog.getByRole('button',{name:'Close'}).click();
  const url=page.url();await page.keyboard.press('n');assert.equal(page.url(),url);
  await page.keyboard.press('?');
  await page.getByRole('dialog').getByLabel('Enable single-key shortcuts').check();
  await page.getByRole('dialog').getByRole('button',{name:'Close'}).click();
  await page.keyboard.press('n');await page.waitForURL('**/compose');
  await page.locator('textarea[name=body]').fill('Shortcut submission');
  await page.keyboard.press('Control+Enter');await page.waitForURL(base+'/');
  pass('Keyboard shortcuts are discoverable, can be disabled, and submit only when explicitly requested');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
