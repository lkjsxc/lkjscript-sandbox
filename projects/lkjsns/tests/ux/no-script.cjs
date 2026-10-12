// The native HTML form path remains usable when progressive scripts are disabled.
const {chromium,base,fixture,fs,path,assert,form,click,goto,pass,session,save}=require('./support.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const context=await session(browser,'owner',{javaScriptEnabled:false,viewport:{width:390,height:844}});const p=await context.newPage();
  await goto(p,'/compose');await p.locator('[name=body]').fill('Native HTML writing without application scripts.');
  await p.locator('select[name=audience]').selectOption('members');await click(p,p.getByRole('button',{name:'Save & preview',exact:true}));
  assert.equal(new URL(p.url()).searchParams.get('preview'),'1');const draft=new URL(p.url()).searchParams.get('id');
  await click(p,p.getByRole('link',{name:'Back to writing',exact:true}));
  await click(p,p.getByRole('button',{name:'Save & choose files',exact:true}));
  await click(p,p.getByRole('link',{name:'Upload',exact:true}));
  const f=path.join(fixture,'no-script.txt');fs.writeFileSync(f,'Native multipart fallback.');
  await p.locator('input[type=file]').setInputFiles(f);await click(p,p.getByRole('button',{name:'Upload',exact:true}));
  assert.equal(new URL(p.url()).pathname,'/compose');assert.equal(new URL(p.url()).searchParams.get('id'),draft);
  assert.equal(await p.locator('[name=body]').inputValue(),'Native HTML writing without application scripts.');
  const href=await p.locator('.composer-attachments .download-card').getAttribute('href');const media=new URL(href,base).searchParams.get('id');
  pass('Without JavaScript, native writing, preview, picker and multipart attachment all work');
  await click(p,p.getByRole('link',{name:'Delete post',exact:true}));assert.equal(new URL(p.url()).pathname,'/delete');
  await click(p,p.getByRole('link',{name:'Cancel',exact:true}));assert.equal(await p.locator('[name=body]').inputValue(),'Native HTML writing without application scripts.');
  await click(p,p.getByRole('link',{name:'Delete post',exact:true}));await click(p,p.getByRole('button',{name:'Delete post',exact:true}));
  await goto(p,'/file?id='+media);await click(p,p.getByRole('link',{name:'Delete file',exact:true}));await click(p,p.getByRole('button',{name:'Delete file',exact:true}));
  assert.equal((await context.request.get(base+'/media?id='+media)).status(),404);
  pass('Without JavaScript, native delete confirmations cancel safely and remove confirmed items');
  await goto(p,'/compose');assert.equal(await p.locator('[name=audience]').inputValue(),'members');save('expected-audience',{value:'members'});
  pass('Successful native form saves retain the next-post audience without local storage');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
