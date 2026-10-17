'use strict';
const{newPostId,chromium,base,assert,form,fields,session,goto,click,pass,crypto}=require('./support.cjs');
const{assertPager}=require('./pager-contract.cjs');
(async()=>{const browser=await chromium.launch();try{
 const context=await session(browser),p=await context.newPage();await goto(p,'/compose');const seed=await fields(p,'note');
 for(let i=0;i<65;i++){const r=await context.request.post(base+'/action',{form:{...seed,id:newPostId(),body:'Pager position specimen '+i,audience:'public',mode:'publish'},headers:{Origin:base},maxRedirects:0});assert.equal(r.status(),303);}
 await goto(p,'/');const first=await assertPager(p,{content:'main .feed',previous:false});assert.equal(first.links[0].width,first.nav.width);
 await click(p,p.getByRole('link',{name:/^(Older|Next)$/}));
 await assertPager(p,{content:'main .feed',previous:true,next:true});
 pass('Prev and Next share the bottom of a multi-page feed, with native reading/focus order');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
