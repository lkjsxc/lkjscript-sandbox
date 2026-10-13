const {resourceId,isResource,isEditor,chromium,base,fixture,output,fs,path,assert,form,fields,click,goto,pass,session,submit,save,load}=require('./support.cjs');
async function upload(page,file,draft='') {
 await goto(page,'/upload'+(draft?'?draft='+draft:''));
 assert.equal(await page.locator('input[type=file]').getAttribute('accept'),null);
 await page.locator('input[type=file]').setInputFiles(file);
 await click(page,page.getByRole('button',{name:'Upload',exact:true}));
 const url=new URL(page.url());assert(isResource(url)||isEditor(url));return resourceId(url);
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const context=await session(browser);const p=await context.newPage();p.setDefaultTimeout(30000);
  const files=path.join(fixture,'files');fs.mkdirSync(files,{recursive:true});
  for(let i=0;i<5;i++)fs.copyFileSync(path.join(output,'media',`landscape-${i+1}.png`),path.join(files,`sample-${i}.png`));
  const content='Small text files belong in Drive.\n日本語もそのまま。\n';
  fs.writeFileSync(path.join(files,'notes.txt'),content);fs.writeFileSync(path.join(files,'empty.txt'),'');
  fs.writeFileSync(path.join(files,'document.svg'),'<svg xmlns="http://www.w3.org/2000/svg"><script>window.evil=1</script></svg>');
  fs.writeFileSync(path.join(files,'document.html'),'<script>window.evil=1</script>');
  fs.writeFileSync(path.join(files,'opaque.bin'),Buffer.from([0,255,128,13,10,1]));
  const textId=await upload(p,path.join(files,'notes.txt'));
  const text=await context.request.get(base+'/media?id='+textId);assert.equal(text.status(),200);assert.equal(await text.text(),content);
  assert(text.headers()['content-type'].startsWith('application/octet-stream'));assert(text.headers()['content-disposition'].startsWith('attachment'));
  assert.equal(text.headers()['x-content-type-options'],'nosniff');
  assert.equal(await p.getByLabel('File name',{exact:true}).count(),0);assert.equal(await p.getByLabel('Media description',{exact:true}).count(),0);
  pass('Text upload, unrestricted file chooser and safe original download');
  await p.locator('[name=tags]').fill('Travel, Work, travel, 日本語');await click(p,form(p,'file').locator('button'));
  assert.equal(await p.locator('[name=tags]').inputValue(),'travel, work, 日本語');
  await goto(p,'/drive');assert.equal(await p.locator('input[type=search],select[name=kind],select[name=folder]').count(),0);
  assert.equal(await p.getByText('New folder',{exact:true}).count(),0);
  await click(p,p.locator('.tag-chips').getByRole('link',{name:'travel',exact:true}));
  assert.equal(new URL(p.url()).searchParams.get('tag'),'travel');assert(await p.locator('#file-'+textId).count());
  pass('Private multi-tags replace Drive folders and filter/search controls');
  const unsafeIds=[];
  for(const name of ['document.svg','document.html','opaque.bin','empty.txt']) {
   const id=await upload(p,path.join(files,name));unsafeIds.push(id);
   const r=await context.request.get(base+'/'+id+'/raw');assert.equal(r.status(),200);
   assert.deepEqual(await r.body(),fs.readFileSync(path.join(files,name)));assert(r.headers()['content-type'].startsWith('application/octet-stream'));
   assert(r.headers()['content-disposition'].startsWith('attachment'));
  }
  pass('SVG, HTML, arbitrary binary and zero-byte files are accepted as safe downloads');
  const avatarId=await upload(p,path.join(files,'sample-0.png'));
  await goto(p,'/settings/avatar');await click(p,form(p,'avatar').filter({has:p.locator('input[name=id][value="'+avatarId+'"]')}).locator('.media-choice'));
  assert.equal(new URL(p.url()).pathname,'/settings/profile');
  const guest=await browser.newContext();const publicAvatar=await guest.request.get(base+'/avatar?user=testowner');assert.equal(publicAvatar.status(),200);
  assert.deepEqual(await publicAvatar.body(),fs.readFileSync(path.join(files,'sample-0.png')));
  assert.equal((await guest.request.get(base+'/media?id='+avatarId)).status(),404);
  assert.equal((await context.request.get(base+'/delete?kind=file&id='+avatarId)).status(),409);
  await goto(p,'/file?id='+avatarId);assert((await p.locator('body').innerText()).includes('public profile image'));assert(!(await p.locator('body').innerText()).includes('Only you can access this file.'));
  pass('Public profile image does not grant access to the private original; in-use deletion is blocked');
  await goto(p,'/compose');await p.locator('[name=body]').fill('Attachment journey through one writing workspace.');
  await click(p,p.getByRole('button',{name:'Attach file',exact:true}));const draft=new URL(p.url()).searchParams.get('draft');assert(draft);
  await click(p,p.getByRole('link',{name:/Upload/,exact:false}).first());
  await p.locator('input[type=file]').setInputFiles(path.join(files,'sample-1.png'));
  await click(p,p.getByRole('button',{name:'Upload',exact:true}));
  assert(isEditor(p.url())||new URL(p.url()).pathname==='/compose');assert.equal(resourceId(p.url()),draft);
  assert.equal(await p.locator('.composer-attachments img').count(),1);
  assert.equal(await p.locator('[name=body]').inputValue(),'Attachment journey through one writing workspace.');
  pass('Upload from the picker attaches to the saved draft and returns directly to writing');
  const attachmentURL=await p.locator('.composer-attachments img').getAttribute('src');
  const attached=resourceId(attachmentURL,base);
  assert.equal((await guest.request.get(base+attachmentURL)).status(),404);
  await p.locator('select[name=audience]').selectOption('public');
  await click(p,p.getByRole('button',{name:'Post',exact:true}));const postId=resourceId(p.url());
  const publicFile=await guest.request.get(base+'/media?id='+attached+'&note='+postId);assert.equal(publicFile.status(),200);
  const range=await guest.request.get(base+'/media?id='+attached+'&note='+postId,{headers:{Range:'bytes=2-15'}});assert.equal(range.status(),206);
  assert.deepEqual(await range.body(),fs.readFileSync(path.join(files,'sample-1.png')).subarray(2,16));
  pass('Draft attachments stay private until publication; public ranges are exact');
  await goto(p,'/compose?id='+postId);await p.getByRole('link',{name:'Delete post',exact:true}).click();await p.getByRole('dialog').waitFor();
  await click(p,p.getByRole('button',{name:'Delete post',exact:true}));
  assert.equal((await guest.request.get(base+'/media?id='+attached+'&note='+postId)).status(),404);
  assert.equal((await context.request.get(base+'/media?id='+attached)).status(),200);
  await goto(p,'/file?id='+attached);await p.getByRole('link',{name:'Delete file',exact:true}).click();await p.getByRole('dialog').waitFor();
  await click(p,p.getByRole('button',{name:'Delete file',exact:true}));
  assert.equal((await context.request.get(base+'/media?id='+attached)).status(),404);
  pass('Deleting a post revokes public access but keeps the file; file deletion is one confirmation');
  save('media',{textId,avatarId,unsafeIds});await goto(p,'/drive');await p.screenshot({path:path.join(output,'drive-desktop.png'),fullPage:true});
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
