// Isolated test hosts; never opens or changes a public preview or its store.
import fs from 'node:fs';import {spawn} from 'node:child_process';import {once} from 'node:events';import {randomBytes,createHash} from 'node:crypto';
import {startNative,connect,root,memory,WS} from './native.mjs';
export {root,memory,WS};
process.env.CITY_SELECTION=process.env.METRO_SELECTION||root+'/.build/metropolis-selection.json';
export const selection=JSON.parse(fs.readFileSync(process.env.CITY_SELECTION));
export function verifySelection(){if(createHash('sha256').update(fs.readFileSync(selection.bin)).digest('hex')!==selection.compiler_sha256)throw Error('Compiler mismatch');for(const[n,digest]of Object.entries(selection.sources))if(createHash('sha256').update(fs.readFileSync(root+'/src/'+n+'.lkjc')).digest('hex')!==digest)throw Error('Selection source mismatch: '+n);if(createHash('sha256').update(fs.readFileSync(selection.artifact)).digest('hex')!==selection.artifact_sha256)throw Error('Artifact mismatch');}
export async function startMetro(options={}){verifySelection();return startNative({target:'metropolis-live',tick:250,name:'metropolis-session',...options});}
export async function client(host,key=randomBytes(32).toString('hex')){
 const c=connect(host.address,'/metropolis/live');await c.wait(f=>f.seq===1);let id=0;const owner=randomBytes(16).toString('hex');c.token=key;c.owner=owner;
 c.command=async(op,fields={})=>{const next=++id;c.socket.send(JSON.stringify({id:next,token:op==='resume'?key:'',owner:op==='resume'?owner:'',action:{op,x:0,y:0,x2:0,y2:0,kind:0,...fields}}));return c.wait(f=>f.ack===next);};
 c.resumed=await c.command('resume');return c;
}
export async function startMetroHttp(){
 verifySelection();const dir=fs.mkdtempSync(root+'/runtime/metropolis-http-');fs.copyFileSync(selection.artifact,dir+'/app.lkja');
 const config=JSON.parse(fs.readFileSync(root+'/deployment.json'));Object.assign(config,{artifact:'app.lkja',target:'metropolis-web',listen:'127.0.0.1:0',session:null,configuration:{},secrets:[],http:{maximum_request_body_bytes:4096,maximum_response_body_bytes:131072,maximum_header_bytes:8192,maximum_headers:32}});config.grants=config.grants.filter(g=>g.requirement==='streams');fs.writeFileSync(dir+'/http.json',JSON.stringify(config));
 const child=spawn(selection.bin,['serve','--deployment',dir+'/http.json']);let output='',address;const exit=once(child,'exit');
 child.stdout.on('data',b=>{output+=b;});child.stderr.on('data',b=>{output+=b;});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('HTTP start timeout: '+output)),30000);child.once('exit',code=>{if(!address){clearTimeout(timer);reject(Error('HTTP exited '+code+' '+output));}});child.stdout.on('data',()=>{const line=output.split('\n').find(x=>x.includes('"event":"ready"'));if(line){clearTimeout(timer);address=JSON.parse(line).local_address;resolve();}});});
 return {child,address,dir,origin:'http://'+address,async stop(){if(child.exitCode===null){child.kill('SIGINT');await exit;}}};
}
