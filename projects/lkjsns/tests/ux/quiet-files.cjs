// The same file and native cursor can be reused across many real posts. Loopback only.
const {newPostId,chromium,base,output,fs,path,assert,fields,click,goto,pass,session,load,save,resourceId,crypto}=require('./support.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const owner=await session(browser),p=await owner.newPage();p.setDefaultTimeout(20000);const media=load('media');
 await goto(p,'/compose');const seed=await fields(p,'note');const posts=[];
 async function action(form){const r=await owner.request.post(base+'/action',{headers:{Origin:base},form,maxRedirects:0});assert.equal(r.status(),303,(await r.text()).slice(0,500));return r;}
 for(let i=0;i<33;i++){
  const id=newPostId(),body='Reusable file usage specimen '+String(i).padStart(2,'0');
  await action({...seed,id,version:'0',reply:'',body,cw:'',audience:'members',mode:'picker'});
  await action({intent:'attach',csrf:seed.csrf,draft:id,id:media.textId,version:'1',enabled:'1',destination:'compose'});
  await action({...seed,id,version:'2',reply:'',body,cw:'',audience:'members',mode:'publish'});posts.push(id);
 }
 await goto(p,'/'+media.textId);assert.deepEqual(await p.locator('.usage-posts > article.note').evaluateAll(es=>es.map(e=>e.id.slice(5))),posts.slice().reverse().slice(0,30));
 await click(p,p.getByRole('link',{name:'Next',exact:true}));const second=p.url();assert.equal(new URL(second).searchParams.get('trail'),'_');assert.equal(await p.getByRole('link',{name:'Prev',exact:true}).count(),1);
 const card=p.locator('.usage-posts > article.note').first();const expected=await card.getAttribute('id');assert.equal(expected,'post-'+posts[2]);
 await click(p,card.locator('form').filter({has:p.locator('input[name=intent][value=bookmark]')}).locator('button'));
 assert.equal(new URL(p.url()).pathname,'/'+media.textId);assert.equal(new URL(p.url()).searchParams.get('cursor'),new URL(second).searchParams.get('cursor'));assert.equal(new URL(p.url()).searchParams.get('trail'),'_');
 await click(p,p.getByRole('link',{name:'Prev',exact:true}));assert.equal(await p.locator('.usage-posts > article.note').first().getAttribute('id'),'post-'+posts[32]);
 pass('More than thirty Used in posts paginate newest-first; native bookmark actions preserve the file page and exact Prev history');
 // File options must return to the same input, without a second save/preview step.
 const quiet=load('quiet');await goto(p,'/compose');await p.locator('[name=body]').fill('File options preserve this pending input.');await click(p,p.getByRole('button',{name:'Attach file',exact:true}));const working=new URL(p.url()).searchParams.get('draft');
 await click(p,p.locator('#file-'+media.textId+' .media-choice'));await click(p,p.getByRole('link',{name:'Back to writing',exact:true}));
 await p.locator('[name=body]').fill('Changed again before opening file options.');await click(p,p.getByRole('button',{name:'File options',exact:true}));
 assert.equal(new URL(p.url()).pathname,'/'+media.textId);assert.equal(await p.locator('main').getByText(/your draft|in the draft|save draft/i).count(),0);
 const back=p.locator('#attachment-next').getByRole('link',{name:'Back to writing',exact:true});assert.equal(await back.getAttribute('href'),'/'+working+'/edit');await click(p,back);
 assert.equal(await p.locator('[name=body]').inputValue(),'Changed again before opening file options.');assert.equal(await p.locator('[name=id]').inputValue(),working);
 pass('File options save input before navigation and return to the same owned editor without draft copy or malformed URLs');
 save('quiet-files',{posts,working});
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
