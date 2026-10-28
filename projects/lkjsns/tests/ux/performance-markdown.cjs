// Compare identical synthetic timeline workloads across selected native bundles.
'use strict';
const {chromium,base,output,path,fs,assert,fields,goto,pass,session,newPostId}=require('./support.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});try{
  const context=await session(browser),page=await context.newPage();page.setDefaultTimeout(30000);
  await goto(page,'/compose');const seed=await fields(page,'note');const results=[];
  async function publish(body,reply=''){
   const id=newPostId();const r=await context.request.post(base+'/action',{headers:{Origin:base},maxRedirects:0,timeout:60000,
    form:{...seed,id,version:'0',reply,body,cw:'',audience:'public',mode:'publish',return:'/'}});
   assert.equal(r.status(),303);return id;
  }
  async function measure(name){
   const times=[];let bytes=0;
   for(let n=0;n<3;n++){
    const start=performance.now(),r=await context.request.get(base+'/?chunk=all',{timeout:60000});
    assert.equal(r.status(),200);const html=await r.text();bytes=Buffer.byteLength(html);times.push(performance.now()-start);
    assert.equal((html.match(/<article class="note/g)||[]).length,30,name);
   }
   times.sort((a,b)=>a-b);results.push({name,medianMs:Math.round(times[1]),samplesMs:times.map(Math.round),responseBytes:bytes});
  }
  for(let i=0;i<30;i++)await publish(`Typical ${i}: `+'A small update with useful context. '.repeat(10));
  await measure('30 typical posts');
  const long='Long plain text. '.repeat(800);
  for(let i=0;i<30;i++)await publish(long+' '+i);
  await measure('30 long posts');
  const parent=await publish(long);
  for(let i=0;i<30;i++)await publish(`Reply ${i} to the long original.`,parent);
  await measure('30 replies to a long parent');
  fs.writeFileSync(path.join(output,'markdown-performance.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));pass('Representative and long timeline loads are measured against the previous native bundle');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
