// Native build only. Never reads legacy saves or starts/replaces a public host.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const bin=process.env.LKJSCRIPT||path.join(root,'tools/lkjscript/lkjscript');
const modelOnly=process.env.METRO_MODEL_ONLY==='1';
const names=['mesomath','mesocohort','mesocity','mesoprobe','mesoview','metronetwork','metrocity','metroview'];
if(!modelOnly){await import('./embed-metropolis.mjs');names.push('metrosession','metroassets','metrohttp');}
const project=path.join(root,'.build','metropolis-'+Date.now());
const hash=data=>createHash('sha256').update(data).digest('hex');
for(const name of ['.build','runtime','evidence'])fs.mkdirSync(path.join(root,name),{recursive:true});
const sources=Object.fromEntries(names.map(name=>[name,fs.readFileSync(path.join(root,'src',name+'.lkjc'),'utf8')]));
function run(args){const r=spawnSync(bin,args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});if(r.error||r.status!==0)throw Error(args.join(' ')+'\n'+[r.error,r.stdout,r.stderr].filter(Boolean).join('\n'));return r.stdout;}
console.log(run(['--version']));console.log(run(['new',project,'--template','command','--name','traffic-city-metropolis']));
for(const [name,body]of Object.entries(sources)){
 const revision=run(['--project',project,'status']).match(/revision id=(rev_[a-f0-9]+)/)?.[1];if(!revision)throw Error('Missing revision');
 const input=path.join(project,name+'.lkjc');fs.writeFileSync(input,'request base='+revision+'\n'+body);
 const plan=run(['--project',project,'change','plan','--input-file',input]);const token=plan.match(/plan_[a-f0-9]+/)?.[0];if(!token)throw Error(plan);
 fs.writeFileSync(path.join(project,name+'.plan.txt'),plan);console.log(name,run(['--project',project,'change','apply','--input-file',input,'--plan',token]));
}
const check=run(['--project',project,'check']);console.log(check);fs.writeFileSync(path.join(root,'evidence/metropolis-check.txt'),check);
const artifact=path.join(root,'runtime','traffic-city-metropolis-'+Date.now()+'.lkja');console.log(run(['--project',project,'build','--output',artifact]));
const selection={bin,project,artifact,artifact_sha256:hash(fs.readFileSync(artifact)),compiler_sha256:hash(fs.readFileSync(bin)),sources:Object.fromEntries(Object.entries(sources).map(([n,t])=>[n,hash(t)])),tests:Number(check.match(/tests passed=(\d+)/)?.[1]),scope:modelOnly?'Aggregate model probe only':'Aggregate Metropolis game with native session, private persistence and HTTP'};
const output=path.join(root,'.build',modelOnly?'metropolis-model-selection.json':'metropolis-selection.json');
fs.writeFileSync(output,JSON.stringify(selection,null,2)+'\n');console.log('Selection:',output);
