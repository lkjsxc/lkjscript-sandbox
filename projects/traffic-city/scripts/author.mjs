import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const selectionFile=path.resolve(root,process.env.BUILD_SELECTION||'.build/selection.json');
const evidenceFile=path.resolve(root,process.env.BUILD_EVIDENCE||'evidence/build.json');
if(process.env.BUILD_SELECTION&&process.env.SKIP_PREPARE!=='1')throw Error('An isolated build selection requires SKIP_PREPARE=1; preserve active deployment descriptors.');
const bin=process.env.LKJSCRIPT||path.join(root,'tools/lkjscript/lkjscript');
const project=path.join(root,'.build/project-'+Date.now());
fs.mkdirSync(path.dirname(project),{recursive:true});
for(const directory of [path.dirname(selectionFile),path.dirname(evidenceFile),path.join(root,'evidence')])fs.mkdirSync(directory,{recursive:true});
await import('./embed-assets.mjs');
const sourceNames=['assets','core','railpath','rail','railinfra','railbuild','railplan','railqueue','railboarding','railtrain','railedit','money','moneytrade','moneyflow','moneyedit','moneytests','moneyedgecases','people','facts','factfixtures','summarytests','admissiontests','journeys','modeplan','cycles','movement','traffic','removal','city','scenarios','migration4','migration6','migration','migration-tests','labmetrics','labbase','labstep','labrun','labedit','lab','labfixtures','labtests','actorview','viewdata','views','session-capabilities','persistence','checkpoint','replacement','saving','removals','reviews','management','labstore','laboratory','session-origin','session-reconnect','session-heartbeat','session','tests','benchmark','http'];
const sources=Object.fromEntries(sourceNames.map(file=>[file,fs.readFileSync(path.join(root,'src',file+'.lkjc'),'utf8')]));
const hash=value=>createHash('sha256').update(value).digest('hex');
function run(args){const r=spawnSync(bin,args,{encoding:'utf8',cwd:root,maxBuffer:32*1024*1024});if(r.status!==0)throw Error(args.join(' ')+'\n'+r.stdout+'\n'+r.stderr);return r.stdout;}
console.log(run(['--version']));console.log(run(['new',project,'--template','command','--name','flowgarden']));
for(const file of sourceNames){
 if(!fs.existsSync(path.join(root,'src',file+'.lkjc')))continue;
 const status=run(['--project',project,'status']);
 const revision=status.match(/revision id=(rev_[a-f0-9]+)/)?.[1];if(!revision)throw Error(status);
 let declarations=sources[file];
 if(declarations.includes('__TRANSITION_OWNER__')){
  const draftPath=path.join(root,'.build','transition-'+path.basename(project)+'.lkjc');
  run(['--project',project,'change','draft','--declaration','live::transition','--output',draftPath]);
  const draft=fs.readFileSync(draftPath,'utf8');
  const bindings={__LIVE_MODULE__:draft.match(/\(module edit ([a-z]+_[a-f0-9]+) live\s/)?.[1],__TRANSITION_OWNER__:draft.match(/\(function edit ([a-z]+_[a-f0-9]+) transition\s/)?.[1],__STATE_PARAMETER__:draft.match(/\(parameter edit ([a-z]+_[a-f0-9]+) state\s/)?.[1],__EVENT_PARAMETER__:draft.match(/\(parameter edit ([a-z]+_[a-f0-9]+) event\s/)?.[1]};
  for(const [label,id]of Object.entries(bindings)){if(!id)throw Error('Canonical callback binding missing: '+label);declarations=declarations.replaceAll(label,id)}
 }
 const source='request base='+revision+'\n'+declarations;
 const proposal=path.join(project,file+'.lkjc');fs.writeFileSync(proposal,source);
 const plan=run(['--project',project,'change','plan','--input-file',proposal]);
 console.log(file,plan.slice(0,1200));fs.writeFileSync(path.join(project,file+'.plan.txt'),plan);
 const token=plan.match(/plan_[a-f0-9]+/)?.[0];if(!token)throw Error(plan);
 console.log(run(['--project',project,'change','apply','--input-file',proposal,'--plan',token]).slice(0,600));
}
const check=run(['--project',project,'check']);console.log(check);fs.writeFileSync(path.join(root,'evidence/native-check.txt'),check);
fs.mkdirSync(path.join(root,'runtime'),{recursive:true});
const artifact=path.join(root,'runtime','flowgarden-'+Date.now()+'.lkja');
console.log(run(['--project',project,'build','--output',artifact]));
fs.writeFileSync(selectionFile,JSON.stringify({bin,project,artifact,artifact_sha256:hash(fs.readFileSync(artifact)),compiler_sha256:hash(fs.readFileSync(bin)),sources:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,hash(v)])),tests:Number(check.match(/tests passed=(\d+)/)?.[1])},null,2));

fs.copyFileSync(selectionFile,evidenceFile);

if(process.env.SKIP_PREPARE!=='1')await import('./prepare-native.mjs');
