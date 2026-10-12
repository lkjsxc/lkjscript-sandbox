// Read-only routing checks plus deliberately invalid, unauthenticated form submissions.
// No cookies, real credentials, accounts, or media fixtures are used here.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const origin=process.env.LKJSNS_CODER_ORIGIN,alias=process.env.LKJSNS_ALIAS_ORIGIN;
assert(origin&&/^https:\/\/[0-9]+--[a-z0-9-]+\.[a-z0-9.-]+$/.test(origin),'Supply the Coder port origin');
assert(alias&&/^https:\/\/[a-z0-9.-]+$/.test(alias),'Supply the old HTTPS origin');
assert.notEqual(origin,alias);
const output=fs.mkdtempSync(path.join(root,'.build/coder-route-'));fs.chmodSync(output,0o700);
const checks=[];
const request=(url,options={})=>fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000),...options});
async function main(){
 let r=await request(origin+'/healthz');assert.equal(r.status,200);assert.equal(await r.text(),'lkjsns\n');
 checks.push('Existing public Coder port reaches the native app without a Coder login');
 for(const route of ['/','/login','/drive?q=Field%20Notes&kind=image','/note?id='+'a'.repeat(64)]){
  r=await request(alias+route);assert.equal(r.status,302);assert.equal(r.headers.get('location'),origin+route);
 }
 checks.push('Old-domain read redirects preserve the exact application path and query');
 r=await request(alias+'/login',{redirect:'follow'});assert.equal(r.status,200);assert.equal(r.url,origin+'/login');assert((await r.text()).includes('Sign in'));
 checks.push('Following the old-domain sign-in link ends on the working native Coder page');
 r=await request(origin+'/drive');assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/login');
 checks.push('Native sign-in is still required for Drive');
 for(const incoming of [alias,'https://example.invalid','null','']){
  const headers={'Content-Type':'application/x-www-form-urlencoded'};if(incoming)headers.Origin=incoming;
  r=await request(origin+'/action',{method:'POST',headers,body:'intent=logout&csrf=invalid'});assert.equal(r.status,403);
 }
 checks.push('Former, foreign, null, and absent origins cannot submit native actions');
 r=await request(origin+'/action',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'intent=logout&csrf=invalid'});assert.equal(r.status,403);
 checks.push('The matching Coder origin still requires a valid session and CSRF token');
 const port=new URL(origin).hostname.split('--')[0];const local='http://127.0.0.1:'+port;
 r=await request(local+'/healthz',{headers:{Host:new URL(alias).hostname}});assert.equal(r.status,400);
 checks.push('The old Host is not silently accepted or rewritten at the native listener');
 r=await request(origin+'/style.css');assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),fs.readFileSync(path.join(root,'web/style.css')));
 checks.push('Coder serves the exact accepted native stylesheet');
 const report={verified_at:new Date().toISOString(),origin,alias,checks:checks.length,passed:checks};
 fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({checks:checks.length,origin,alias,output}));
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
