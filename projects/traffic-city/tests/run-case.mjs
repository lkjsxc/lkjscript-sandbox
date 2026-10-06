import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');export const selection=JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||root+'/.build/selection.json'));
export function runCase(input,name='case',target='workload'){
 const dir=fs.mkdtempSync(root+'/runtime/check-');
 const d=JSON.parse(fs.readFileSync(root+'/deployment.json'));d.artifact=path.relative(dir,selection.artifact);d.target=target;d.listen=null;d.http=null;d.session=null;d.grants=[];d.runtime.request_deadline_milliseconds=240000;
 // Bundle paths are confined relative names. Keep an exact copied artifact beside the descriptor.
 try{fs.linkSync(selection.artifact,dir+'/app.lkja')}catch{fs.copyFileSync(selection.artifact,dir+'/app.lkja')}d.artifact='app.lkja';
 fs.writeFileSync(dir+'/run.json',JSON.stringify(d));fs.writeFileSync(dir+'/args.json',JSON.stringify([input]));
 const args=['run','--deployment',dir+'/run.json','--arguments-file',dir+'/args.json','--result-file',dir+'/result.json'];
 const measured=process.env.RUN_CASE_MEMORY==='1';
 const start=performance.now();const result=spawnSync(measured?'python3':selection.bin,measured?[root+'/tests/measure-command.py',dir+'/peak-rss-kib',selection.bin,...args]:args,{encoding:'utf8',maxBuffer:64*1024*1024});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error(result.stdout+'\n'+result.stderr);
 fs.writeFileSync(root+'/evidence/'+name+'.log',result.stdout);
 return {result:JSON.parse(fs.readFileSync(dir+'/result.json','utf8')),observation:result.stdout,wall_ms:performance.now()-start,peak_rss_kib:measured?Number(fs.readFileSync(dir+'/peak-rss-kib','utf8')):undefined,dir};
}
if(process.argv[1]===new URL(import.meta.url).pathname){const c=runCase({rows:-1,ticks:100,tiles:[],commands:[],after:[]},'baseline');console.log(JSON.stringify(c,null,2).slice(0,5000));}
