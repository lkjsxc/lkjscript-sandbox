// Build only the aggregate traffic experiment. Never opens a legacy City graph,
// reads player saves, replaces a selected production artifact, or starts a host.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const bin=process.env.LKJSCRIPT||path.join(root,'tools/lkjscript/lkjscript');
const hash=data=>createHash('sha256').update(data).digest('hex');
const names=['mesomath','mesocohort','mesocity','mesoprobe','mesoview'];
const project=path.join(root,'.build','meso-'+Date.now());
for(const name of ['.build','runtime','evidence'])fs.mkdirSync(path.join(root,name),{recursive:true});
const sources=Object.fromEntries(names.map(name=>[name,fs.readFileSync(path.join(root,'src',name+'.lkjc'),'utf8')]));
function run(args){const result=spawnSync(bin,args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});if(result.error||result.status!==0)throw Error([result.error,result.stdout,result.stderr].filter(Boolean).join('\n'));return result.stdout;}
console.log(run(['--version']));console.log(run(['new',project,'--template','command','--name','traffic-city-meso']));
for(const [name,body] of Object.entries(sources)){
 const revision=run(['--project',project,'status']).match(/revision id=(rev_[a-f0-9]+)/)?.[1];if(!revision)throw Error('Missing revision');
 const input=path.join(project,name+'.lkjc');fs.writeFileSync(input,'request base='+revision+'\n'+body);
 const plan=run(['--project',project,'change','plan','--input-file',input]);const token=plan.match(/plan_[a-f0-9]+/)?.[0];if(!token)throw Error(plan);
 console.log(name,run(['--project',project,'change','apply','--input-file',input,'--plan',token]));
}
const check=run(['--project',project,'check']);console.log(check);fs.writeFileSync(path.join(root,'evidence/meso-check.txt'),check);
const artifact=path.join(root,'runtime','traffic-city-meso-'+Date.now()+'.lkja');console.log(run(['--project',project,'build','--output',artifact]));
const selection={bin,project,artifact,artifact_sha256:hash(fs.readFileSync(artifact)),compiler_sha256:hash(fs.readFileSync(bin)),sources:Object.fromEntries(Object.entries(sources).map(([name,body])=>[name,hash(body)])),tests:Number(check.match(/tests passed=(\d+)/)?.[1]),scope:'Independent aggregate traffic experiment; not a legacy City/save or production deployment'};
fs.writeFileSync(path.join(root,'.build/meso-selection.json'),JSON.stringify(selection,null,2)+'\n');
console.log('Wrote .build/meso-selection.json');
