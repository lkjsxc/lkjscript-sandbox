// Deployment metadata only. The running HTTP and session processes are lkjscript.
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),dir=path.resolve(process.env.METRO_DIR||root+'/runtime/metropolis-host');
const selection=JSON.parse(fs.readFileSync(process.env.METRO_SELECTION||root+'/.build/metropolis-selection.json'));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
if([dir,selection.bin].some(s=>/[\n\r]/.test(s)))throw Error('Newlines are not valid deployment paths.');
for(const[name,sha]of Object.entries(selection.sources))if(hash(root+'/src/'+name+'.lkjc')!==sha)throw Error('Source differs from selected artifact: '+name);
if(hash(selection.artifact)!==selection.artifact_sha256||hash(selection.bin)!==selection.compiler_sha256)throw Error('Selected artifact/compiler digest mismatch.');
const marker='traffic-city-metropolis-private-host-v1\n';
fs.mkdirSync(dir,{recursive:true,mode:0o700});
if(fs.lstatSync(dir).isSymbolicLink())throw Error('The deployment directory must not be a symbolic link.');
if(fs.existsSync(dir+'/owner.marker')){if(fs.readFileSync(dir+'/owner.marker','utf8')!==marker)throw Error('Foreign deployment directory.');}
else {if(fs.readdirSync(dir).some(n=>n!=='supervisor.lock'))throw Error('Refusing to initialize a nonempty unmarked directory.');fs.writeFileSync(dir+'/owner.marker',marker,{mode:0o600});}
function run(args){const r=spawnSync(selection.bin,args,{encoding:'utf8'});if(r.error||r.status!==0)throw Error([r.error,r.stdout,r.stderr].filter(Boolean).join('\n'));return r.stdout;}
const portAddress=(value,fallback)=>{const s=value||fallback;if(!/^(?:127\.0\.0\.1|0\.0\.0\.0|\[::\]|\[::1\]):\d{1,5}$/.test(s))throw Error('Use an explicit local listen address and port.');const n=Number(s.split(':').at(-1));if(n<1||n>65535)throw Error('Invalid listen port.');return s;};
const httpListen=portAddress(process.env.METRO_HTTP_LISTEN,'127.0.0.1:19146'),wsListen=portAddress(process.env.METRO_SESSION_LISTEN,'127.0.0.1:19147');
if(httpListen===wsListen)throw Error('HTTP and session listeners need distinct addresses.');
const normalizeOrigin=s=>{const u=new URL(s);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.origin!==s)throw Error('Use an exact HTTP(S) Origin, without a path.');return s;};
const publicOrigin=normalizeOrigin(process.env.METRO_ORIGIN||'http://127.0.0.1:'+httpListen.split(':').at(-1));
const localOrigin=normalizeOrigin(process.env.METRO_LOCAL_ORIGIN||'http://localhost:'+httpListen.split(':').at(-1));
if(!fs.existsSync(dir+'/data/HEAD')){if(fs.existsSync(dir+'/data'))throw Error('Existing store lacks HEAD; recovery is required, not initialization.');console.log(run(['data','initialize','--root',dir+'/data']));}
const artifact=dir+'/app-'+selection.artifact_sha256+'.lkja';if(!fs.existsSync(artifact)){try{fs.linkSync(selection.artifact,artifact);}catch{fs.copyFileSync(selection.artifact,artifact,fs.constants.COPYFILE_EXCL);}}
const config=JSON.parse(fs.readFileSync(root+'/deployment.json'));
Object.assign(config,{artifact:path.basename(artifact),target:'metropolis-live',listen:wsListen});
config.runtime.maximum_queued_tasks=8;
Object.assign(config.session,{tick_interval_milliseconds:250,maximum_message_bytes:4096,maximum_state_bytes:16777216,maximum_state_nodes:300000,maximum_transition_bytes:32768,maximum_process_buffer_bytes:100663296});
config.streams.maximum_total_bytes=4096;
const data=config.grants.find(g=>g.requirement==='data');data.adapter.root='data';data.adapter.namespace='traffic-city-metropolis';data.sharing_domain='traffic-city-metropolis-data';
Object.assign(data.adapter.limits,{maximum_value_bytes:1048576,maximum_transaction_bytes:2097152,maximum_scan_bytes:1048576});
config.configuration={direct_origin:{kind:'text',value:publicOrigin},local_origin:{kind:'text',value:localOrigin},saved_city_limit:{kind:'text',value:'1024'}};
const http=structuredClone(config);Object.assign(http,{target:'metropolis-web',listen:httpListen,session:null,configuration:{},http:{maximum_request_body_bytes:4096,maximum_response_body_bytes:131072,maximum_header_bytes:8192,maximum_headers:32}});http.grants=http.grants.filter(g=>g.requirement==='streams');
function write(name,data){const target=dir+'/'+name,temp=target+'.staged';fs.writeFileSync(temp,data,{mode:0o600});fs.renameSync(temp,target);}
write('session.json',JSON.stringify(config,null,2)+'\n');write('http.json',JSON.stringify(http,null,2)+'\n');
write('compiler-path',selection.bin+'\n');write('artifact.sha256',selection.artifact_sha256+'  '+path.basename(artifact)+'\n');write('compiler.sha256',selection.compiler_sha256+'  '+selection.bin+'\n');
write('selection.json',JSON.stringify(selection,null,2)+'\n');
console.log(JSON.stringify({directory:dir,artifact_sha256:selection.artifact_sha256,http:httpListen,session:wsListen,origin:publicOrigin,local_origin:localOrigin,legacy_changed:false},null,2));
