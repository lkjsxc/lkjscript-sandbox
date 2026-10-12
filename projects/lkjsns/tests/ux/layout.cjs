const {chromium,base,root,output,fs,path,assert,goto,pass,session,load}=require('./support.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const context=await session(browser),p=await context.newPage();const media=load('media');const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const routes=['/','/compose','/settings','/settings/profile','/settings/security','/settings/avatar','/drive','/file?id='+media.textId,'/notifications','/search','/admin','/admin/invitations'];
  for(const scheme of ['light','dark'])for(const width of [320,390,768,1280]) {
   await p.emulateMedia({colorScheme:scheme,reducedMotion:'reduce'});await p.setViewportSize({width,height:900});
   for(const route of routes) {
    await goto(p,route);assert.equal(await p.locator('html').getAttribute('lang'),'en');
    const geometry=await p.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert(geometry.scroll<=geometry.viewport+1,JSON.stringify({route,scheme,width,...geometry}));
    if(width<=390){
     const small=await p.locator('input:not([type=hidden]),textarea,select').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width>0 && parseFloat(getComputedStyle(e).fontSize)<16).map(e=>e.name));assert.deepEqual(small,[],route);
    }
   }
   await goto(p,'/notifications');
   const boxes=await p.locator('.activity-tabs a').evaluateAll(es=>es.map(e=>({label:e.textContent,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
   for(const b of boxes){assert(b.w>=44&&b.h>=44,JSON.stringify({width,...b}));}
   pass(`${scheme} layout: twelve routes at ${width}px, no horizontal overflow, usable activity tabs`);
  }
  await p.emulateMedia({colorScheme:'light'});await p.setViewportSize({width:1280,height:950});
  for(const [name,route] of [['home','/'],['drive','/drive'],['settings','/settings'],['admin','/admin'],['compose','/compose']]) {
   await goto(p,route);await p.screenshot({path:path.join(output,name+'-desktop.png'),fullPage:true});
  }
  await p.setViewportSize({width:390,height:844});
  for(const [name,route] of [['home','/'],['drive','/drive'],['settings','/settings'],['compose','/compose']]) {
   await goto(p,route);await p.screenshot({path:path.join(output,name+'-mobile.png'),fullPage:true});
  }
  await p.emulateMedia({colorScheme:'dark'});await goto(p,'/notifications');await p.screenshot({path:path.join(output,'notifications-mobile-dark.png'),fullPage:true});
  await goto(p,'/compose');await p.locator('a.skip').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>document.activeElement.id),'main');
  assert.deepEqual(errors,[]);pass('Keyboard skip link and application scripts operate without browser errors');
  const axePath=process.env.LKJSNS_AXE;
  if(axePath) {
   assert(fs.existsSync(axePath),'The requested axe script does not exist.');
   const script=fs.readFileSync(axePath,'utf8');const reports=[];
   await p.emulateMedia({colorScheme:'light'});await p.setViewportSize({width:1280,height:950});
   for(const route of ['/','/compose','/settings','/settings/profile','/drive','/notifications','/search']) {
    await goto(p,route);await p.evaluate(script);
    const report=await p.evaluate(async()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
    reports.push({route,violations:report.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
   }
   fs.writeFileSync(path.join(output,'accessibility.json'),JSON.stringify(reports,null,2));
   const serious=reports.flatMap(r=>r.violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>({route:r.route,...v})));
   assert.deepEqual(serious,[],JSON.stringify(serious,null,2));pass('Automated accessibility checks: no serious or critical findings on seven primary routes');
  } else {console.log('SKIP optional accessibility audit: set LKJSNS_AXE to an installed axe.min.js.');}
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
