// Build a native HTTP-only artifact from the same tracked browser assets/routes.
// It has no simulation target or data-store grant. Useful for presentation tests
// and independent HTTP updates that do not interrupt a running native session.
import fs from 'node:fs';import path from 'node:path';import{spawnSync}from'node:child_process';import{createHash}from'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),bin=process.env.LKJSCRIPT||path.join(root,'tools/lkjscript/lkjscript'),hash=b=>createHash('sha256').update(b).digest('hex');
const output=path.resolve(root,process.env.WEB_SELECTION||'.build/web-selection.json'),project=path.join(root,'.build','web-'+Date.now());
fs.mkdirSync(path.dirname(project),{recursive:true});fs.mkdirSync(path.join(root,'runtime'),{recursive:true});fs.mkdirSync(path.dirname(output),{recursive:true});
await import('./embed-assets.mjs');const sources=Object.fromEntries(['assets','http'].map(n=>[n,fs.readFileSync(path.join(root,'src',n+'.lkjc'),'utf8')]));
function run(args){const r=spawnSync(bin,args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});if(r.error||r.status!==0)throw Error([r.error,r.stdout,r.stderr].filter(Boolean).join('\n'));return r.stdout}
console.log(run(['--version']));console.log(run(['new',project,'--template','command','--name','traffic-city-web']));
for(const[name,text]of Object.entries(sources)){
 const revision=run(['--project',project,'status']).match(/revision id=(rev_[a-f0-9]+)/)?.[1];if(!revision)throw Error('Missing native revision');
 const input=path.join(project,name+'.lkjc');fs.writeFileSync(input,'request base='+revision+'\n'+text);
 const plan=run(['--project',project,'change','plan','--input-file',input]),token=plan.match(/plan_[a-f0-9]+/)?.[0];if(!token)throw Error(plan);
 console.log(run(['--project',project,'change','apply','--input-file',input,'--plan',token]));
}
const check=run(['--project',project,'check']);console.log(check);
const artifact=path.join(root,'runtime','traffic-city-web-'+Date.now()+'.lkja');console.log(run(['--project',project,'build','--output',artifact]));
const result={bin,project,artifact,artifact_sha256:hash(fs.readFileSync(artifact)),compiler_sha256:hash(fs.readFileSync(bin)),sources:Object.fromEntries(Object.entries(sources).map(([n,t])=>[n,hash(t)])),tests:Number(check.match(/tests passed=(\d+)/)?.[1]),scope:'native HTTP presentation only; authoritative sessions require their separately selected game artifact'};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log('Web selection:',output);
