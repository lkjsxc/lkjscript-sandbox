// Check versioned publication inputs, never generated stores or tool downloads.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
assert(files.length>0,'Stage repository sources before checking publication inputs.');
const forbidden=/(^|\/)(node_modules|\.build|\.transfer|\.git|__pycache__)(\/|$)|(^|\/)\.env(\.|$)|\.(pem|key|p12|pfx|lkja|log|jsonl)$/;
for(const file of files){
 assert((!forbidden.test(file)&&!/^projects\/[^/]+\/(runtime|evidence|tools)(\/|$)/.test(file))||path.basename(file)==='.env.example',`Generated/private path is tracked: ${file}`);
 const full=path.join(root,file),info=fs.lstatSync(full);assert(info.isFile()&&!info.isSymbolicLink(),`Not a regular source file: ${file}`);
 assert(info.size<5*1024*1024,`Unexpected large source file: ${file}`);
 if(/\.(mjs|js)$/.test(file)){const r=spawnSync(process.execPath,['--check',full],{encoding:'utf8'});assert.equal(r.status,0,`${file}: ${r.stderr}`);}
 if(file.endsWith('.sh')||file==='sandbox'){const r=spawnSync('bash',['-n',full],{encoding:'utf8'});assert.equal(r.status,0,`${file}: ${r.stderr}`);}
 if(file.endsWith('.json'))JSON.parse(fs.readFileSync(full,'utf8'));
 if(file.endsWith('.md'))for(const match of fs.readFileSync(full,'utf8').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
  const link=match[1].split('#')[0];if(!link||/^[a-z]+:/i.test(link))continue;
  assert(fs.existsSync(path.resolve(path.dirname(full),link)),`Broken documentation link: ${file}: ${link}`);
 }
}
for(const name of fs.readdirSync(path.join(root,'projects'))){
 assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name),`Invalid project slug: ${name}`);
 const dir=path.join(root,'projects',name);assert(fs.lstatSync(dir).isDirectory()&&!fs.lstatSync(dir).isSymbolicLink());
 assert(fs.existsSync(path.join(dir,'README.md')),`Missing project README: ${name}`);
 fs.accessSync(path.join(dir,'project.sh'),fs.constants.X_OK);
}
const listed=execFileSync(path.join(root,'sandbox'),['list'],{encoding:'utf8'}).trim().split('\n');
assert(listed.includes('traffic-city'));
for(const args of [['../traffic-city','test'],['traffic-city'],['traffic-city','unknown'],['absent','test'],['list','extra']]){
 const r=spawnSync(path.join(root,'sandbox'),args,{encoding:'utf8'});assert.equal(r.status,2,`Invalid invocation accepted: ${args}`);
}
console.log(`PASS repository structure, ${files.length} source paths, syntax, JSON, documentation links, dispatcher failures`);
