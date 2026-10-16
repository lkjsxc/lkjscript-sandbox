// Scope the redundant self label to profiles; retain list identity and relationship state.
'use strict';
const {chromium,base,output,fs,path,assert,form,fields,click,goto,pass,session}=require('./support.cjs');
const relation=(page,enabled)=>page.request.post(base+'/action',{
  form:{...page.__attentionForm,enabled:enabled?'1':'0'},headers:{Origin:base},maxRedirects:0
});
(async()=>{const browser=await chromium.launch({headless:true});try{
  const owner=await session(browser),member=await session(browser,'member'),guest=await browser.newContext({locale:'en-US'});
  const p=await owner.newPage(),m=await member.newPage(),g=await guest.newPage();
  const accountImages={};for(const user of ['testowner','testmember'])accountImages[user]=await(await owner.request.get(base+'/avatar?user='+user)).body();
  // Assert the actual response body, not a CSS hide or browser-script cleanup.
  await goto(p,'/profile?user=testowner');
  assert.equal(await p.locator('.profile>.relation-badge').count(),0,'Your own profile must not render a self/You relationship badge.');
  assert.equal(await p.locator('.profile').getByText('You',{exact:true}).count(),0);
  assert.deepEqual(await p.locator('.profile-relations a').allTextContents(),['Attention to','Attention from']);
  assert.equal(await p.getByRole('link',{name:'Edit profile',exact:true}).count(),1);
  assert.equal(await form(p,'attention').count(),0);
  const raw=await owner.request.get(base+'/profile?user=testowner');
  assert(!(await raw.text()).includes('<span class="relation-badge">You</span>'));
  pass('Own profile omits the You badge in server-rendered HTML; edit and both attention directions remain intact');

  for(const [page,target]of [[p,'testmember'],[m,'testowner']]){
    await goto(page,'/profile?user='+target);page.__attentionForm=await fields(page,'attention');page.__initialAttention=page.__attentionForm.enabled==='0';
    assert.equal((await relation(page,false)).status(),303);
  }
  try {
    await goto(p,'/profile?user=testmember');assert.equal(await p.locator('.profile>.relation-badge').count(),0);
    assert.equal((await relation(m,true)).status(),303);
    await goto(p,'/profile?user=testmember');assert.equal(await p.locator('.profile>.relation-badge').innerText(),'Attention to you');
    assert.equal((await relation(p,true)).status(),303);
    await goto(p,'/profile?user=testmember');assert.equal(await p.locator('.profile>.relation-badge').innerText(),'Mutual attention');
    await goto(m,'/profile?user=testowner');assert.equal(await m.locator('.profile>.relation-badge').innerText(),'Mutual attention');
    await goto(p,'/attention?user=testmember&direction=from');
    assert.equal(await p.locator('#attention-testowner .relation-badge').innerText(),'You');
    assert.equal(await p.locator('#attention-testowner button').count(),0);
    pass('Other profiles retain incoming/mutual attention badges; relationship lists still identify the viewer without a self-action');

    let cases=0;
    for(const javaScriptEnabled of [true,false]){
      const context=await session(browser,'owner',{javaScriptEnabled}),view=await context.newPage();
      for(const scheme of ['light','dark'])for(const width of [320,390,768,1280]){
        await view.emulateMedia({colorScheme:scheme});await view.setViewportSize({width,height:900});
        for(const route of ['/profile?user=testowner','/profile?user=testowner&cursor=0','/profile?user=testowner&trail=_']){
          await goto(view,route);assert.equal(await view.locator('.profile>.relation-badge').count(),0);
          assert.equal(await view.locator('.profile').getByText('You',{exact:true}).count(),0);
          assert.equal(await view.locator('.profile-relations a').count(),2);
          assert.equal(await view.getByRole('link',{name:'Edit profile',exact:true}).count(),1);
          assert(await view.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));cases++;
        }
      }
      await view.setViewportSize({width:390,height:844});await view.emulateMedia({colorScheme:'light'});
      await goto(view,'/profile?user=testowner');
      await view.screenshot({path:path.join(output,`self-profile-${javaScriptEnabled?'script':'no-script'}.png`),fullPage:true});
      await click(view,view.locator('.profile-relations a').first());assert.equal(new URL(view.url()).pathname,'/attention');
      await context.close();
    }
    pass('Own profile stays badge-free across 48 width/theme/paging/script cases; attention links remain usable without JavaScript');
    for(const user of ['testowner','testmember']){
      await goto(g,'/profile?user='+user);assert.equal(await g.locator('.profile>.relation-badge').count(),0);
      assert.equal(await g.locator('.profile-relations').count(),0);
      assert.equal(await form(g,'attention').count(),0);
      assert.deepEqual(await(await owner.request.get(base+'/avatar?user='+user)).body(),accountImages[user]);
    }
    pass('Guest visibility boundaries and independent user-avatar bytes are unchanged');
    const axePath=process.env.LKJSNS_AXE;
    if(axePath){
      const script=fs.readFileSync(axePath,'utf8'),reports=[];
      for(const width of [390,1280])for(const scheme of ['light','dark']){
        await p.setViewportSize({width,height:900});await p.emulateMedia({colorScheme:scheme});await goto(p,'/profile?user=testowner');await p.evaluate(script);
        const result=await p.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
        reports.push({width,scheme,violations:result.violations});assert.deepEqual(result.violations,[]);
      }
      fs.writeFileSync(path.join(output,'self-profile-accessibility.json'),JSON.stringify(reports,null,2));
      pass('Own-profile selected accessibility checks report no violations in mobile/desktop light/dark views');
    }
    fs.writeFileSync(path.join(output,'self-profile.json'),JSON.stringify({cases,ownProfileBadge:false,listSelfBadge:true,otherRelationshipBadges:true,userImagesUnchanged:true},null,2));
  }finally{
    for(const page of [p,m])assert.equal((await relation(page,page.__initialAttention)).status(),303);
  }
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
