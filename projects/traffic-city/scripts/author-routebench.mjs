// Small, fully checked command artifact for routing experiments. Uses exactly
// the authored native graph; never replaces the running game's selection.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const label=process.env.ROUTE_LABEL||'candidate';
if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid routing evidence label');
const bin=process.env.LKJSCRIPT||path.join(root,'tools/lkjscript/lkjscript');
const project=path.join(root,'.build',`routing-${label}-${Date.now()}`);
const core=process.env.ROUTE_CORE||path.join(root,'src/core.lkjc');
const files=(process.env.ROUTE_PRELUDE||'').split(',').filter(Boolean).map(f=>path.resolve(root,f));
files.push(core,...(process.env.ROUTE_POSTLUDE||'').split(',').filter(Boolean).map(f=>path.resolve(root,f)),path.join(root,'src/routeprobe.lkjc'));
const hash=x=>createHash('sha256').update(x).digest('hex');
function run(args){const r=spawnSync(bin,args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});if(r.status!==0)throw Error(args.join(' ')+'\n'+r.stdout+'\n'+r.stderr);return r.stdout;}
console.log(run(['--version']));console.log(run(['new',project,'--template','command','--name','routeprobe']));
const sources={};
for(const file of files){
 const text=fs.readFileSync(file,'utf8'),name=path.basename(file),revision=run(['--project',project,'status']).match(/revision id=(rev_[a-f0-9]+)/)?.[1];
 if(!revision)throw Error('Missing revision');
 const input=path.join(project,name);fs.writeFileSync(input,`request base=${revision}\n${text}`);sources[name]=hash(text);
 const plan=run(['--project',project,'change','plan','--input-file',input]);console.log(name,plan);
 const token=plan.match(/plan_[a-f0-9]+/)?.[0];if(!token)throw Error(plan);
 console.log(run(['--project',project,'change','apply','--input-file',input,'--plan',token]));
}
const check=run(['--project',project,'check']);console.log(check);
const artifact=path.join(root,'runtime',`routing-${label}-${Date.now()}.lkja`);
console.log(run(['--project',project,'build','--output',artifact]));
fs.writeFileSync(path.join(root,'.build',`routing-${label}.json`),JSON.stringify({bin,project,artifact,artifact_sha256:hash(fs.readFileSync(artifact)),compiler_sha256:hash(fs.readFileSync(bin)),sources,tests:Number(check.match(/tests passed=(\d+)/)?.[1])},null,2));
