// Optional installed axe-core audit. Injection is confined to a synthetic test browser.
const {chromium,base,fixture,output,fs,path,assert,goto}=require('./support.cjs');
const source=process.env.LKJSNS_AXE || require.resolve('axe-core/axe.min.js');
assert(fs.existsSync(source),'Use an installed axe-core; this test never downloads dependencies.');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const state=JSON.parse(fs.readFileSync(path.join(fixture,'flow-state.json')));
 const reading=JSON.parse(fs.readFileSync(path.join(fixture,'reading-state.json')));
 const writing=JSON.parse(fs.readFileSync(path.join(fixture,"writing-state.json")));
 const checks=[],violations=[];
 for(const signed of [false,true]){
  // The production policy remains script-src 'none'. Only axe's inspection needs this.
  const ctx=await browser.newContext({locale:'en-US',bypassCSP:true,...(signed?{storageState:path.join(fixture,'owner.session.json')}:{})});
  const page=await ctx.newPage();
  const routes=signed?['/','/drive','/compose','/compose?reply='+reading.visible,'/settings','/notifications?kind=replies','/file?id='+state.image,'/note?id='+reading.visible,'/compose?id='+writing.draft,writing.preview,writing.picker]:['/','/login','/join','/about'];
  for(const colorScheme of ['light','dark'])for(const width of [390,1440]){
   await page.emulateMedia({colorScheme,reducedMotion:'reduce'});await page.setViewportSize({width,height:960});
   for(const route of routes){
    await goto(page,route);await page.addScriptTag({path:source});
    const result=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return {violations:r.violations,incomplete:r.incomplete.map(x=>x.id)};});
    const entry={signed,colorScheme,width,route,violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:result.incomplete};
    checks.push(entry);violations.push(...entry.violations);
    fs.writeFileSync(path.join(output,'accessibility.json'),JSON.stringify({pages:checks.length,violations:violations.length,checks},null,2));
    console.log('AUDIT',signed?'member':'guest',colorScheme,width,route,entry.violations.length);
   }
  }
  await ctx.close();
 }
 assert.equal(violations.length,0,'Review accessibility.json: automated violations remain.');
 console.log(JSON.stringify({pages:checks.length,violations:violations.length}));
}finally{await browser.close();}})().catch(error=>{console.error(error.stack);process.exitCode=1});
