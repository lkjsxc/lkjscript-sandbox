// Synthetic Drive quota and long-text acceptance; never run on public data.
const {chromium,base,assert,goto,pass,session,createPost,submit,form}=require('./support.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const owner=await session(browser), p=await owner.newPage();p.setDefaultTimeout(30000);
 async function used(){await goto(p,'/drive');return Number(await p.locator('.quota progress').getAttribute('value'));}
 const baseline=await used();
 const body='Start of a longer post. '+('日本語🌱 letters and spaces. '.repeat(1500))+' TAILMARK';
 const id=await createPost(p,body,'public');
 const after=await used();assert(after>baseline+Buffer.byteLength(body));
 assert((await p.locator('.quota').innerText()).includes('Posts'));
 await goto(p,'/');const card=p.locator('article.note').filter({hasText:'Start of a longer post.'}).first();
 assert(await card.getByRole('link',{name:'Read full post'}).count());
 assert(!(await card.innerText()).includes('TAILMARK'));
 await goto(p,'/'+id);
 assert.equal((await p.locator('.note-detail .note-body').innerText()).includes('TAILMARK'),true);
 await goto(p,'/'+id+'/edit');assert.equal(await p.locator('[name=body]').inputValue(),body);
 await submit(p,'note',{body:'A shorter post.',audience:'public',mode:'publish'});
 const shrunk=await used();assert(shrunk<after);
 const member=await session(browser,'member'), mp=await member.newPage();await goto(mp,'/'+id);
 await form(mp,'eyes').locator('button').click();
 const reacted=await used();assert(reacted>shrunk);
 await goto(p,'/'+id+'/edit');const deletion=await p.getByRole('link',{name:'Delete post'}).getAttribute('href');
 await goto(p,deletion);await submit(p,'delete-note',{confirm:'delete'});
 const deleted=await used();assert(deleted<reacted);
 pass('Long posts preserve full text, compact timelines, and account for post storage and reactions');
 await member.close();
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
