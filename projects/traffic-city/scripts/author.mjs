import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {verifyAuthorPrefix} from './verify-author-prefix.mjs';
const root=path.resolve(import.meta.dirname,'..');
const selectionFile=path.resolve(root,process.env.BUILD_SELECTION||'.build/selection.json');
const evidenceFile=path.resolve(root,process.env.BUILD_EVIDENCE||'evidence/build.json');
if(process.env.BUILD_SELECTION&&process.env.SKIP_PREPARE!=='1')throw Error('An isolated build selection requires SKIP_PREPARE=1; preserve active deployment descriptors.');
const bin=process.env.LKJSCRIPT||path.join(root,'tools/lkjscript/lkjscript');
const resumeProject=process.env.BUILD_RESUME_PROJECT;
if(resumeProject&&(!process.env.BUILD_SELECTION||process.env.SKIP_PREPARE!=='1'))throw Error('Resume requires an isolated selection and SKIP_PREPARE=1.');
const project=resumeProject?path.resolve(root,resumeProject):path.join(root,'.build/project-'+Date.now());
if(resumeProject&&(path.dirname(project)!==path.join(root,'.build')||!path.basename(project).startsWith('project-')||!fs.lstatSync(project).isDirectory()||fs.lstatSync(project).isSymbolicLink()))throw Error('Resume only a regular project directory directly inside this worktree .build.');
fs.mkdirSync(path.dirname(project),{recursive:true});
for(const directory of [path.dirname(selectionFile),path.dirname(evidenceFile),path.join(root,'evidence')])fs.mkdirSync(directory,{recursive:true});
await import('./embed-assets.mjs');
const sourceNames=['assets','roads','roadcache','roadtests','core','junctionflow','terrain','terrainbuild','terrainfixtures','terraintests','terrainprobe','railpath','rail','railinfra','railbuild','railplan','railqueue','railboarding','railtrain','railedit','money','moneytrade','moneyflow','moneycandidates','moneychanges','moneyedit','moneytests','moneyedgecases','people','facts','factfixtures','summarytests','admissiontests','journeys','planninggate','returnplan','modeplan','cycles','movement','employment','traffic','moneyprobe','roadbuild','removal','city','waterfront','region','commuter','regionprobe','commuterrailprobe','scenarios','migration4','migration6','migration','migration-tests','roadintegration','atlassample','atlascohort','atlasreport','atlasfixtures','atlasstatetests','atlaswaittests','atlascohorttests','atlasidentitytests','atlastests','labmetrics','labbase','labstep','labrun','labedit','lab','labfixtures','labtests','actorpool','actorview','streettests','streetquotatests','streeteligibletests1','streeteligibletests2','streeteligibletests3','streetsampletests1','streetsampletests2','streetsampletests3','streetsampletests4','viewdata','views','session-capabilities','persistence','checkpoint','replacement','saving','removals','reviews','management','labstore','laboratory','session-origin','session-reconnect','session-heartbeat','session-input','session','tests','simulationtests','railpairtests','railboundtests','planningmetertests','atlasprobe','benchmarkseed','benchmarkmessage','benchmarktick','benchmark','planningproof','walktrace','scalefixtures1','scalefixtures2','scalefixtures3','scalefixtures4','scalefixtures5','scalefixtures6','scalefixtures7','scalefixtures8','scaletests','scaletests2','scaletests3','scaletests4','scaletests5','scaletests6','scaletests7','scaletests8','scaletests9','scaletests10','scaletests11','scaletests12','scaletests13','scaletests14','scaletests15','scaletests16','scaletests17','http'];
const sources=Object.fromEntries(sourceNames.map(file=>[file,fs.readFileSync(path.join(root,'src',file+'.lkjc'),'utf8')]));
const hash=value=>createHash('sha256').update(value).digest('hex');
function run(args){const r=spawnSync(bin,args,{encoding:'utf8',cwd:root,maxBuffer:32*1024*1024});if(r.status!==0)throw Error(args.join(' ')+'\n'+r.stdout+'\n'+r.stderr);return r.stdout;}
function bindCanonicalCallback(declarations){
 if(declarations.includes('__TRANSITION_OWNER__')){
  const draftPath=path.join(fs.mkdtempSync(path.join(root,'.build','canonical-draft-')),'transition.lkjc');
  run(['--project',project,'change','draft','--declaration','live::transition','--output',draftPath]);
  const draft=fs.readFileSync(draftPath,'utf8');
  const bindings={__LIVE_MODULE__:draft.match(/\(module edit ([a-z]+_[a-f0-9]+) live\s/)?.[1],__TRANSITION_OWNER__:draft.match(/\(function edit ([a-z]+_[a-f0-9]+) transition\s/)?.[1],__STATE_PARAMETER__:draft.match(/\(parameter edit ([a-z]+_[a-f0-9]+) state\s/)?.[1],__EVENT_PARAMETER__:draft.match(/\(parameter edit ([a-z]+_[a-f0-9]+) event\s/)?.[1]};
  for(const [label,id]of Object.entries(bindings)){if(!id)throw Error('Canonical callback binding missing: '+label);declarations=declarations.replaceAll(label,id)}
 }
 return declarations;
}
console.log(run(['--version']));
let prefix=0;
if(resumeProject){
 const current=run(['--project',project,'status']).match(/revision id=(rev_[a-f0-9]+)/)?.[1];
 if(!current)throw Error('Cannot resolve live product revision for resume.');
 const resolved=Object.fromEntries(Object.entries(sources).map(([name,body])=>[
  name,fs.existsSync(path.join(project,name+'.plan.txt'))?bindCanonicalCallback(body):body,
 ]));
 prefix=verifyAuthorPrefix(project,resolved,current);
 const after=run(['--project',project,'status']).match(/revision id=(rev_[a-f0-9]+)/)?.[1];
 if(after!==current)throw Error('Product revision changed during canonical owner resolution.');
 console.log(JSON.stringify({resumed_project:project,verified_prefix:prefix,revision:current}));
}else console.log(run(['new',project,'--template','command','--name','flowgarden']));
for(const file of sourceNames.slice(prefix)){
 if(!fs.existsSync(path.join(root,'src',file+'.lkjc')))continue;
 const status=run(['--project',project,'status']);
 const revision=status.match(/revision id=(rev_[a-f0-9]+)/)?.[1];if(!revision)throw Error(status);
 let declarations=sources[file];
 declarations=bindCanonicalCallback(declarations);
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
fs.writeFileSync(selectionFile,JSON.stringify({bin,project,artifact,artifact_sha256:hash(fs.readFileSync(artifact)),compiler_sha256:hash(fs.readFileSync(bin)),authoring:{resumed:!!resumeProject,verified_prefix:prefix},sources:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,hash(v)])),tests:Number(check.match(/tests passed=(\d+)/)?.[1])},null,2));

fs.copyFileSync(selectionFile,evidenceFile);

if(process.env.SKIP_PREPARE!=='1')await import('./prepare-native.mjs');
