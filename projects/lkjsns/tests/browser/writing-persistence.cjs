// Stored writing must survive restart, restore, upgrade, and the preceding binary.
const {chromium,base,fixture,output,fs,path,assert,form,click,goto}=require('./support.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const state=JSON.parse(fs.readFileSync(path.join(fixture,'writing-state.json')));
 const credentials=JSON.parse(fs.readFileSync(path.join(fixture,'test-accounts.json')));
 const phase=process.env.LKJSNS_PERSISTENCE_PHASE||'restart';assert(/^[a-z-]+$/.test(phase));
 const owner=await browser.newContext({locale:'en-US'}),page=await owner.newPage();
 await goto(page,'/login');await page.locator('[name=handle]').fill(credentials.owner.handle);await page.locator('[name=password]').fill(credentials.owner.password);await click(page,form(page,'login').locator('button'));
 await goto(page,'/compose?id='+state.draft);assert.equal(await page.locator('[name=body]').inputValue(),state.body);
 assert.equal(await page.locator('.composer-attachments img').count(),1);assert((await page.locator('.composer-attachments img').getAttribute('src')).includes('id='+state.file));
 const guest=await browser.newContext();assert.equal((await guest.request.get(base+'/note?id='+state.draft)).status(),404);assert.equal((await guest.request.get(base+'/media?id='+state.file+'&note='+state.draft)).status(),404);
 const reader=await guest.newPage();await goto(reader,'/note?id='+state.published);assert.equal(await reader.locator('.note-detail .note-body').textContent(),state.publishedBody);
 const original=await guest.request.get(base+'/media?id='+state.file+'&note='+state.published);assert.equal(original.status(),200);assert.deepEqual(await original.body(),fs.readFileSync(path.join(output,'media/landscape-2.png')));
 const updated=state.body+'\nVerified after '+phase+'.';await page.locator('[name=body]').fill(updated);await click(page,page.locator('button[name=mode][value=draft]'));
 await goto(page,'/compose?id='+state.draft);assert.equal(await page.locator('[name=body]').inputValue(),updated);assert.equal(await page.locator('.composer-attachments img').count(),1);assert.equal((await guest.request.get(base+'/note?id='+state.draft)).status(),404);
 fs.writeFileSync(path.join(fixture,'writing-state.json'),JSON.stringify({...state,body:updated}),{mode:0o600});
 const checks=['Saved draft text and its attachment remain readable','Unpublished draft and its media reference remain private','Post published from preview and exact original bytes remain available to the chosen audience','The running binary can save the retained draft without changing its attachment or audience'];
 fs.writeFileSync(path.join(output,'writing-persistence-'+phase+'.json'),JSON.stringify({passed:checks.length,checks},null,2));for(const item of checks)console.log('PASS',phase+': '+item);console.log(JSON.stringify({passed:checks.length}));
 await owner.close();await guest.close();
}finally{await browser.close();}})().catch(error=>{console.error(error.stack);process.exitCode=1});
