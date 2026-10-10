// Reuse an identity-checked graph, editing declarations only through public APIs.
// The normal fresh author.mjs also replays these literal source proposals.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const base=JSON.parse(fs.readFileSync(process.env.BASELINE_SELECTION||'.build/route-only.json'));
const hash=x=>createHash('sha256').update(x).digest('hex');
for(const [file,sha] of [[base.bin,base.compiler_sha256],[base.artifact,base.artifact_sha256]]) assert.equal(hash(fs.readFileSync(file)),sha);
const allowed=new Set(['facts','modeplan','railplan']);
const changes=[];
for(const [name,sha] of Object.entries(base.sources)) {
 if(['assets','http'].includes(name)) continue;
 const source=fs.readFileSync(path.join(root,'src',name+'.lkjc'),'utf8');
 if(hash(source)===sha) continue;
 assert(allowed.has(name),'Unexpected native change: '+name);
 const original=fs.readFileSync(path.join(base.project,name+'.lkjc'),'utf8').replace(/^request base=rev_[a-f0-9]+\n/,'');
 assert.equal(hash(original),sha,'Baseline source identity: '+name);
 changes.push({name,source,original});
}
assert(changes.length);
const project=process.env.OVERLAY_PROJECT?path.resolve(process.env.OVERLAY_PROJECT):path.join(root,'.build','hotpaths-'+Date.now());
assert.equal(path.dirname(project),path.join(root,'.build'));
assert(path.basename(project).startsWith('hotpaths-'));
if(!fs.existsSync(project)){const copied=spawnSync('cp',['-a','--reflink=auto',base.project,project],{encoding:'utf8'});assert.equal(copied.status,0,copied.stderr);}
const work=fs.mkdtempSync(path.join(root,'.build','hotpath-proposals-'));
function run(args){const r=spawnSync(base.bin,args,{encoding:'utf8',maxBuffer:64*1024*1024});if(r.error||r.status!==0)throw Error([r.error,r.stdout,r.stderr].filter(Boolean).join('\n'));return r.stdout}
const revisionOf=p=>run(['--project',p,'status']).match(/revision id=(rev_[a-f0-9]+)/)[1];
assert.equal(revisionOf(project),revisionOf(base.project),'Resume only an unedited baseline copy');
const oldArtifact=process.env.VERIFIED_BASELINE_ARTIFACT||path.join(work,'baseline.lkja');
if(!process.env.VERIFIED_BASELINE_ARTIFACT)run(['--project',project,'build','--output',oldArtifact]);
assert.equal(hash(fs.readFileSync(oldArtifact)),base.artifact_sha256);
const functions=s=>[...s.matchAll(/^  \(function create ([^ ]+) .*\n   \(body .*\n/gm)];
const receipts=[];
for(const {name,source,original} of changes){
 const moduleName=source.match(/ \(module create ([^\s]+)/)[1];
 const previous=new Map(functions(original).map(m=>[m[1],m[0]]));
 const current=functions(source),changed=current.filter(m=>previous.get(m[1])!==m[0]);
 let reverted=source;
 for(const m of changed) reverted=reverted.replace(m[0],previous.get(m[1])||'');
 assert.equal(reverted,original,'Only function edits/additions: '+name);
 const anchor=changed.find(m=>previous.has(m[1]));assert(anchor);
 const edits=[];let moduleId,revision;
 for(const m of changed){
  let edit=m[0];
  if(previous.has(m[1])){
   const draftFile=path.join(work,name+'-'+m[1]+'.lkjc');run(['--project',project,'change','draft','--declaration',moduleName+'::'+m[1],'--output',draftFile]);
   const draft=fs.readFileSync(draftFile,'utf8');
   moduleId=draft.match(/\(module edit (mod_[a-f0-9]+)/)[1];revision=draft.match(/^request base=(rev_[a-f0-9]+)/)[1];
   const owner=draft.match(/\(function edit (decl_[a-f0-9]+)/)[1];edit=edit.replace('(function create '+m[1]+' ',`(function edit ${owner} ${m[1]} `);
   edit=edit.replace(/\(parameter create ([^ ]+) /g,(_,param)=>{const id=draft.match(new RegExp('\\(parameter edit (param_[a-f0-9]+) '+param+'\\s'))?.[1];assert(id,param);return `(parameter edit ${id} ${param} `});
  }
  edits.push(edit.replace(/\(call ([^ :()]+)(?=[ )])/g,(whole,n)=>previous.has(n)?'(call '+moduleName+'::'+n:whole));
 }
 const proposal=path.join(work,name+'.lkjc');fs.writeFileSync(proposal,'request base='+revision+'\n'+source.slice(0,source.indexOf(' (module create '))+` (module edit ${moduleId} ${moduleName}\n`+edits.join('')+')\n)\ndeclarations.end\n');
 console.log('Applying',name,changed.map(m=>m[1]).join(', '));
 const plan=run(['--project',project,'change','plan','--input-file',proposal]);fs.writeFileSync(proposal+'.plan',plan);
 const token=plan.match(/plan_[a-f0-9]+/)?.[0];assert(token,plan);
 fs.writeFileSync(proposal+'.apply',run(['--project',project,'change','apply','--input-file',proposal,'--plan',token]));
 receipts.push({module:name,functions:changed.map(m=>m[1]),proposal_sha256:hash(fs.readFileSync(proposal))});
}
console.log('Checking complete candidate');
const checked=run(['--project',project,'check']);fs.writeFileSync(path.join(root,'evidence/hotpaths-native-check.txt'),checked);console.log(checked);
const artifact=path.join(root,'runtime','flowgarden-hotpaths-'+Date.now()+'.lkja');console.log(run(['--project',project,'build','--output',artifact]));
const selected={...base,project,artifact,artifact_sha256:hash(fs.readFileSync(artifact)),sources:{...base.sources},tests:Number(checked.match(/tests passed=(\d+)/)?.[1]),authoring:{kind:'source-bound canonical function edits',baseline_artifact_sha256:base.artifact_sha256,receipts,retained_presentation:true}};
for(const c of changes)selected.sources[c.name]=hash(c.source);
fs.writeFileSync(path.join(root,process.env.BUILD_SELECTION||'.build/selection.json'),JSON.stringify(selected,null,2)+'\n');
console.log('Selected',selected.artifact_sha256);
