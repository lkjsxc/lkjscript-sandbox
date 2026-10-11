// Run after a native restart or against a stopped-store backup restored elsewhere.
const {chromium,base,fixture,output,fs,path,assert,form,click,goto}=require('./support.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const credentials=JSON.parse(fs.readFileSync(path.join(fixture,'test-accounts.json')));
 const state=JSON.parse(fs.readFileSync(path.join(fixture,'flow-state.json')));
 const context=await browser.newContext({locale:'en-US'});const page=await context.newPage();
 await goto(page,'/login');await page.locator('[name=handle]').fill(credentials.owner.handle);await page.locator('[name=password]').fill(credentials.owner.password);
 await click(page,form(page,'login').locator('button'));await goto(page,'/settings');assert.equal(await page.locator('[name=display]').inputValue(),'Alex Morgan');
 await goto(page,'/admin');assert.equal(await page.locator('h1').innerText(),'Invitations');
 await goto(page,'/note?id='+state.membersPost);assert((await page.locator('main').innerText()).includes('A private update for members.'));
 for(const [id,name] of [[state.image,'landscape-1.png'],[state.video,'motion.webm'],[state.audio,'tone.wav']]){
  const response=await context.request.get(base+'/media?id='+id);assert.equal(response.status(),200);assert.deepEqual(await response.body(),fs.readFileSync(path.join(output,'media',name)));
 }
 const guest=await browser.newContext();assert.equal((await guest.request.get(base+'/note?id='+state.publicPost)).status(),404);
 assert.equal((await guest.request.get(base+'/media?id='+state.image+'&note='+state.publicPost)).status(),404);
 assert.equal((await guest.request.get(base+'/note?id='+state.membersPost)).status(),404);
 const report={passed:7,checks:['Fresh sign-in with persisted password','Profile and administrator role preserved','Members post preserved','PNG original byte equality','Video original byte equality','Audio original byte equality','Deleted public reference and Members access remain denied to guests']};
 const phase=process.env.LKJSNS_PERSISTENCE_PHASE||'restart';assert(/^[a-z-]+$/.test(phase));fs.writeFileSync(path.join(output,'persistence-'+phase+'.json'),JSON.stringify(report,null,2));
 for(const item of report.checks)console.log('PASS',phase+': '+item);console.log(JSON.stringify({passed:report.passed}));
}finally{await browser.close();}})().catch(error=>{console.error(error.stack);process.exitCode=1});
