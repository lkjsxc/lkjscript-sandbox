// Development-time descriptor preparation. The running service needs only bash/flock and lkjscript.
import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),selection=JSON.parse(fs.readFileSync(root+'/.build/selection.json'));
const session=JSON.parse(fs.readFileSync(root+'/deployment.json'));
const limits=session.session;
const perSession=['maximum_message_bytes','maximum_inbound_mailbox_bytes','maximum_outbound_mailbox_bytes','maximum_state_bytes'].reduce((sum,key)=>sum+limits[key],0);
if(perSession*limits.maximum_active_sessions>limits.maximum_process_buffer_bytes)throw Error(`Session buffer limit must reserve ${perSession*limits.maximum_active_sessions} bytes for all ${limits.maximum_active_sessions} configured cities.`);
const bind=process.env.BIND_HOST||'127.0.0.1',httpPort=Number(process.env.HTTP_PORT||19140),sessionPort=Number(process.env.SESSION_PORT||19141);
if(!/^[a-zA-Z0-9.:-]+$/.test(bind)||![httpPort,sessionPort].every(p=>Number.isInteger(p)&&p>0&&p<=65535))throw Error('Invalid listener settings');
const host=bind.includes(':')?'['+bind+']':bind;
session.artifact=path.basename(selection.artifact);session.listen=host+':'+sessionPort;
session.grants.find(x=>x.requirement==='data').adapter.root='data-v4/store';
session.configuration.direct_origin.value=process.env.DIRECT_ORIGIN||'http://127.0.0.1:'+httpPort;
session.configuration.local_origin.value=process.env.LOCAL_ORIGIN||'http://localhost:'+httpPort;
fs.writeFileSync(root+'/runtime/session.mode','persistent-v4\n');
const http={...session,target:'web',listen:host+':'+httpPort,session:null,grants:session.grants.filter(x=>x.requirement==='streams'),configuration:{},secrets:[],http:{maximum_request_body_bytes:4096,maximum_response_body_bytes:131072,maximum_header_bytes:8192,maximum_headers:32}};
fs.writeFileSync(root+'/runtime/http.deployment.json',JSON.stringify(http,null,2));
fs.writeFileSync(root+'/runtime/session.deployment.json',JSON.stringify(session,null,2));
console.log(JSON.stringify({native_http:http.listen,native_session:session.listen,direct_browser:`http://${host}:${httpPort}/?session_port=${sessionPort}`}));
