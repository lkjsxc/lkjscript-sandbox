// Bounded native cursor history and recent-bookmark order; synthetic loopback only.
const {chromium,base,output,fs,path,assert,fields,click,goto,pass,session,load,save,resourceId,crypto}=require('./support.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const context=await session(browser),p=await context.newPage();p.setDefaultTimeout(20000);
 await goto(p,'/compose');const seed=await fields(p,'note'),ids=[];
 for(let i=0;i<35;i++){const id=crypto.randomBytes(32).toString('hex');const r=await context.request.post(base+'/action',{headers:{Origin:base},form:{...seed,id,version:'0',reply:'',body:'Quiet paging specimen '+String(i).padStart(2,'0'),cw:'',audience:'public',mode:'publish'},maxRedirects:0});assert.equal(r.status(),303,(await r.text()).slice(0,400));ids.push(resourceId(r.headers().location));}
 // Bookmark order intentionally differs from post creation order.
 const order=[];for(let lo=0,hi=ids.length-1;lo<=hi;lo++,hi--){order.push(ids[lo]);if(lo!==hi)order.push(ids[hi]);}
 for(const id of order){const r=await context.request.post(base+'/action',{headers:{Origin:base},form:{intent:'bookmark',csrf:seed.csrf,id,enabled:'1',place:'home',cursor:'',trail:''},maxRedirects:0});assert.equal(r.status(),303);}
 const expected=[...order].reverse();
 const cardIds=()=>p.locator('main article.note[data-href]').evaluateAll(es=>es.map(e=>e.getAttribute('data-href').slice(1)));
 await goto(p,'/saved');assert.deepEqual(await cardIds(),expected.slice(0,30));assert.equal(await p.getByText('Your bookmarks are private.',{exact:true}).count(),0);
 assert.equal(await p.getByRole('link',{name:'Next page',exact:true}).count(),0);assert.equal(await p.getByRole('link',{name:'Prev',exact:true}).count(),0);
 for(const width of [320,390,1280]){await p.setViewportSize({width,height:900});const metrics=await p.evaluate(()=>{const feed=document.querySelector('main .feed').getBoundingClientRect(),next=document.querySelector('a[rel=next]').getBoundingClientRect();return{feed:feed.width,next:next.width,height:next.height,left:next.left,feedLeft:feed.left};});assert(Math.abs(metrics.feed-metrics.next)<=2,JSON.stringify({width,...metrics}));assert(metrics.height>=48);}
 await click(p,p.getByRole('link',{name:'Next',exact:true}));const second=p.url();assert.deepEqual((await cardIds()).slice(0,5),expected.slice(30));assert.equal(new URL(second).searchParams.get('trail'),'_');
 const position=await p.evaluate(()=>({prev:document.querySelector('a[rel=prev]').getBoundingClientRect().bottom,card:document.querySelector('main article.note').getBoundingClientRect().top}));assert(position.prev<=position.card);
 const reaction=p.locator('main article.note form').filter({has:p.locator('input[name=intent][value=eyes]')}).first().locator('button');await click(p,reaction);assert.equal(new URL(p.url()).searchParams.get('cursor'),new URL(second).searchParams.get('cursor'));assert.equal(new URL(p.url()).searchParams.get('trail'),'_');
 await click(p,p.getByRole('link',{name:'Prev',exact:true}));assert.equal(new URL(p.url()).pathname,'/saved');assert.equal(new URL(p.url()).searchParams.get('cursor'),null);assert.deepEqual(await cardIds(),expected.slice(0,30));
 pass('Bookmarks are ordered by newest bookmark, with full-width Next and a top Prev that survives reactions and restores the prior page');
 // The trail retains the exact preceding page even when a filter scans several
 // native windows. No browser history or JavaScript is needed to return.
 const cold=await session(browser,'owner',{javaScriptEnabled:false,viewport:{width:390,height:844}});const n=await cold.newPage();
 for(const route of ['/saved','/','/profile?user=testowner','/search?q=Quiet%20paging%20specimen']){
  await goto(n,route);const before=await n.locator('main article.note').evaluateAll(es=>es.map(e=>e.id));const next=n.getByRole('link',{name:'Next',exact:true});assert.equal(await next.count(),1,route);await click(n,next);const previous=n.getByRole('link',{name:'Prev',exact:true});assert.equal(await previous.count(),1,route);await click(n,previous);assert.deepEqual(await n.locator('main article.note').evaluateAll(es=>es.map(e=>e.id)),before,route);
 }
 await cold.close();pass('Home, Bookmarks, profiles and search retain exact bidirectional native paging without JavaScript');
 for(const query of ['trail=_.20..2','trail=https%3A%2F%2Fevil.test','trail=_%26next%3D1','trail=_.-1','trail='+Array(66).fill('1').join('.'),'trail=_&trail=2']){const r=await context.request.get(base+'/saved?cursor=0&'+query,{maxRedirects:0});assert.equal(r.status(),400,query);}
 await goto(p,'/saved?cursor=0');assert.equal(await p.getByRole('link',{name:'First',exact:true}).count(),1);assert.equal(await p.getByRole('link',{name:'Prev',exact:true}).count(),0);
 pass('Invalid, duplicate, injected and oversized paging histories are rejected; direct cursors never invent a previous destination');
 await p.setViewportSize({width:390,height:844});await goto(p,'/saved');await click(p,p.getByRole('link',{name:'Next',exact:true}));await p.screenshot({path:path.join(output,'quiet-bookmarks-second-mobile.png'),fullPage:true});
 save('quiet-paging',{ids,order,expected,secondPath:new URL(second).pathname+new URL(second).search});
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
