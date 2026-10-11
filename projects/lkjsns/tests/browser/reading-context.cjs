// Synthetic reading journeys, including real paginated feeds, on loopback only.
const {chromium,base,fixture,output,fs,path,assert,form,click,goto,fields}=require('./support.cjs');
const checks=[];
function pass(name){checks.push(name);console.log('PASS',name);fs.writeFileSync(path.join(output,'reading-context.json'),JSON.stringify({passed:checks.length,checks},null,2));}
(async()=>{const browser=await chromium.launch({headless:true});try{
 const owner=await browser.newContext({locale:'en-US',storageState:path.join(fixture,'owner.session.json')});
 const member=await browser.newContext({locale:'en-US',storageState:path.join(fixture,'member.session.json')});
 const p=await owner.newPage(),m=await member.newPage();
 await goto(p,'/compose');await p.locator('[name=body]').fill('A place to return to.');await p.locator('[name=audience]').selectOption('public');
 await click(p,p.locator('button[name=mode][value=publish]'));const post=new URL(p.url()).searchParams.get('id');assert(post);
 for(const [route,intent] of [['/','eyes'],['/','bookmark'],['/?feed=following','eyes'],['/profile?user=testowner','eyes']]){
  await goto(m,route);const card=m.locator('#post-'+post);assert.equal(await card.count(),1);
  const action=card.locator('form').filter({has:m.locator(`input[name=intent][value=${intent}]`)});
  await click(m,action.locator('button'));const destination=new URL(m.url()),expected=new URL(route,base);
  assert.equal(destination.pathname,expected.pathname);assert.equal(destination.search,expected.search);assert.equal(destination.hash,'#post-'+post);
  pass(intent+' keeps the reading location '+route);
 }
 await goto(m,'/compose?reply='+post);await m.locator('[name=body]').fill('A reply in the same conversation.');await m.locator('[name=audience]').selectOption('public');
 await click(m,m.locator('button[name=mode][value=publish]'));const reply=new URL(m.url()).searchParams.get('id');
 await goto(p,'/note?id='+post);await click(p,p.locator('#post-'+reply+' form').filter({has:p.locator('input[name=intent][value=eyes]')}).locator('button'));
 assert.equal(new URL(p.url()).searchParams.get('id'),post);assert.equal(new URL(p.url()).hash,'#post-'+reply);pass('Reacting to a reply keeps the parent conversation');
 // Populate via the same admitted HTTP action used by the editor, never direct data writes.
 for(let i=0;i<36;i++){
  await goto(p,'/compose');const fresh=await fields(p,'note');
  const response=await owner.request.post(base+'/action',{headers:{Origin:base},form:{...fresh,body:'Reading test '+(i+1)+': a quiet chronological feed.',cw:'',audience:'public',mode:'publish'},maxRedirects:0});
  assert.equal(response.status(),303,'Fixture post '+i);assert(response.headers().location.startsWith('/note?id='));
 }
 await goto(m,'/?feed=following');const next=await m.locator('.pager a').getAttribute('href');assert(next);
 await goto(m,next);const pageUrl=new URL(m.url());assert(pageUrl.searchParams.has('cursor'));
 const old=m.locator('.note').first(),anchor=await old.getAttribute('id');
 await click(m,old.locator('form').filter({has:m.locator('input[name=intent][value=eyes]')}).locator('button'));
 const kept=new URL(m.url());assert.equal(kept.search,pageUrl.search);assert.equal(kept.hash,'#'+anchor);pass('Reaction preserves both Following and the next-page cursor');
 const same=m.locator('#'+anchor);const reaction=same.locator('form').filter({has:m.locator('input[name=intent][value=eyes]')});
 const data=await reaction.evaluate(f=>Object.fromEntries(new FormData(f).entries()));const before=await reaction.locator('button').getAttribute('aria-pressed');
 for(const place of ['//example.invalid/','https://example.invalid/','profile:alice&admin=1','thread:']){
  const response=await member.request.post(base+'/action',{headers:{Origin:base},form:{...data,place},maxRedirects:0});
  assert.equal(response.status(),422);assert.equal(response.headers().location,undefined);
 }
 await m.reload();assert.equal(await m.locator('#'+anchor+' form').filter({has:m.locator('input[name=intent][value=eyes]')}).locator('button').getAttribute('aria-pressed'),before);
 pass('Untrusted return destinations are rejected before changing the reaction');
 await goto(m,'/saved');const saved=m.locator('#post-'+post);assert.equal(await saved.count(),1);
 await click(m,saved.locator('form').filter({has:m.locator('input[name=intent][value=eyes]')}).locator('button'));assert.equal(new URL(m.url()).pathname,'/saved');
 pass('Reading a bookmarked post does not leave the bookmark list on reaction');
 console.log(JSON.stringify({passed:checks.length}));
}finally{await browser.close();}})().catch(error=>{console.error(error.stack);process.exitCode=1});
