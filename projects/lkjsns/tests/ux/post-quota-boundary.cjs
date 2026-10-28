// Run only in a fresh synthetic fixture: incomplete file reservations consume its quota.
const {chromium,base,assert,goto,pass,session}=require('./support.cjs');
const LIMIT=2*1024*1024*1024, MAX=256*1024*1024;
(async()=>{const browser=await chromium.launch({headless:true});try{
 const member=await session(browser,'member'),p=await member.newPage();p.setDefaultTimeout(30000);
 async function used(){await goto(p,'/drive');return Number(await p.locator('.quota progress').getAttribute('value'));}
 async function reserve(size,expected=200){
  await goto(p,'/upload');const url=new URL(await p.locator('form[enctype="multipart/form-data"]').getAttribute('action'),base);
  url.pathname='/upload/start';url.searchParams.delete('folder');
  const response=await member.request.post(url.href,{headers:{Origin:base},form:{name:'reserved.bin',size:String(size)},maxRedirects:0});
  assert.equal(response.status(),expected,`reservation of ${size} bytes`);
  if(expected!==200)assert((await response.text()).includes('not enough free space'));
 }
 const baseline=await used();assert(baseline<MAX-4096);
 for(let i=0;i<7;i++)await reserve(MAX);
 const reserved=await used();assert.equal(reserved,baseline+7*MAX);
 const remaining=LIMIT-reserved;assert(remaining>4096 && remaining<=MAX);
 await reserve(remaining-2048);
 const nearlyFull=await used();assert.equal(nearlyFull,LIMIT-2048);
 await goto(p,'/compose');const value='quota boundary '.repeat(400)+' retained ending';
 await p.locator('[name=body]').fill(value);
 await Promise.all([p.waitForURL('**/action**'),p.getByRole('button',{name:'Post',exact:true}).click()]);
 assert((await p.locator('body').innerText()).includes('not enough free Drive storage'));
 assert.equal(await p.locator('[name=body]').inputValue(),value);
 assert.equal(await used(),nearlyFull);
 const longValue='large quota boundary '.repeat(4000)+' retained ending';
 await goto(p,'/compose');await p.locator('[name=body]').fill(longValue);
 await p.getByRole('button',{name:'Post',exact:true}).click();
 await p.waitForFunction(() => /not enough free Drive storage/i.test(document.querySelector('.post-transfer-status')?.textContent || ''));
 assert.equal(await p.locator('[name=body]').inputValue(),longValue);
 await p.getByRole('button',{name:'Discard unfinished upload'}).click();
 await p.waitForFunction(() => /discarded/i.test(document.querySelector('.post-transfer-status')?.textContent || ''));
 assert.equal(await p.locator('[name=body]').inputValue(),longValue);
 assert.equal(await used(),nearlyFull);
 await goto(p,'/compose');await p.locator('[name=body]').fill('Short post fits.');
 await Promise.all([p.waitForURL(base+'/'),p.getByRole('button',{name:'Post',exact:true}).click()]);
 const after=await used();assert(after>nearlyFull && after<=LIMIT);
 await reserve(LIMIT-after+1,409);assert.equal(await used(),after);
 pass('File reservations and posts share the quota; oversized writes retain text and small posts still fit');
 await member.close();
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1;});
