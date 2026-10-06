import fs from 'node:fs';import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';
import {startNative,connect,root,memory,WS} from './native.mjs';
const n=await startNative({name:'session-capacity',tick:500}),clients=[];let overflow;
async function city(){const c=connect(n.address);clients.push(c);await c.wait(f=>f.seq===1);c.socket.send(JSON.stringify({id:1,token:randomBytes(32).toString('hex'),owner:randomBytes(16).toString('hex'),action:{op:'resume',x:0,y:0,x2:0,y2:0,kind:0}}));const f=await c.wait(f=>f.ack===1);assert.equal(f.status,1);return c}
try {
 for(let i=0;i<4;i++)await city();assert.equal(clients.length,4);
 const status=await new Promise((resolve,reject)=>{
  overflow=new WS('ws://'+n.address+'/live');overflow.on('error',()=>{});
  const timer=setTimeout(()=>reject(Error('Fifth handshake did not resolve')),10000);
  overflow.once('unexpected-response',(_request,response)=>{clearTimeout(timer);response.resume();resolve(response.statusCode);overflow.terminate()});
  overflow.once('open',()=>{clearTimeout(timer);reject(Error('Fifth session exceeded configured capacity'))});
 });assert.equal(status,503);
 const first=clients.shift();await first.close();const replacement=await city();assert.equal(replacement.frames.at(-1).stats.population,32);
 const reservation=n.config.session.maximum_state_bytes+n.config.session.maximum_message_bytes+n.config.session.maximum_inbound_mailbox_bytes+n.config.session.maximum_outbound_mailbox_bytes;
 const report={passed:true,artifact_sha256:n.selection.artifact_sha256,checks:['four native persistent cities are admitted in one process','fifth handshake is refused with HTTP503','closing one city releases admission for a new private city'],maximum_active_sessions:4,process_buffer_limit_bytes:n.config.session.maximum_process_buffer_bytes,per_session_reserved_bytes:reservation,required_four_reserved_bytes:4*reservation,...memory(n.child.pid)};
 fs.writeFileSync(root+'/evidence/session-capacity.json',JSON.stringify(report,null,2));console.log(report);
} finally {overflow?.terminate();await Promise.all(clients.map(c=>c.close().catch(()=>{})));await n.stop()}
