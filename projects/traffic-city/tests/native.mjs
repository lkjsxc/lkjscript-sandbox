import fs from 'node:fs';import path from 'node:path';import {spawn,spawnSync} from 'node:child_process';import {once} from 'node:events';import {createRequire} from 'node:module';
export const WS=createRequire(import.meta.url)('playwright-core/lib/utilsBundle').ws;
export const root=path.resolve(import.meta.dirname,'..');
export async function startNative({target='live',tick=500,name='native-test',directory=null,publicDemo=false,origin=null,idleMilliseconds=null,lifetimeMilliseconds=null}={}){
 const selection=JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||root+'/.build/selection.json'));const dir=directory||fs.mkdtempSync(root+'/runtime/'+name+'-');
 fs.rmSync(dir+'/app.lkja',{force:true});try{fs.linkSync(selection.artifact,dir+'/app.lkja')}catch{fs.copyFileSync(selection.artifact,dir+'/app.lkja')}
 if(!publicDemo&&!fs.existsSync(dir+'/data/HEAD')){const init=spawnSync(selection.bin,['data','initialize','--root',dir+'/data'],{encoding:'utf8'});if(init.status!==0)throw Error(init.stdout+init.stderr);}
 const config=JSON.parse(fs.readFileSync(root+'/deployment.json'));config.artifact='app.lkja';config.target=target;config.listen='127.0.0.1:0';config.session.tick_interval_milliseconds=tick;config.grants.find(x=>x.requirement==='data').adapter.root='data';
 if(target==='benchmark-live'){config.grants=config.grants.filter(x=>x.requirement==='streams');}
 if(publicDemo){config.grants=config.grants.filter(x=>x.requirement!=='data');config.session.maximum_active_sessions=4;config.session.maximum_state_bytes=8388608;config.session.maximum_state_nodes=300000;config.session.maximum_lifetime_milliseconds=1800000;config.session.idle_timeout_milliseconds=300000;}
 for(const [field,value]of [['idle_timeout_milliseconds',idleMilliseconds],['maximum_lifetime_milliseconds',lifetimeMilliseconds]])if(value!==null){if(!Number.isInteger(value)||value<750||value>config.session[field])throw Error('Test session limit must be a shorter positive duration');config.session[field]=value;}
 if(origin)config.configuration.direct_origin.value=origin;
 fs.writeFileSync(dir+'/session.json',JSON.stringify(config));
 let output='',address;const child=spawn(selection.bin,['serve','--deployment',dir+'/session.json']);const log=fs.createWriteStream(root+'/evidence/'+name+'.jsonl');
 child.stdout.on('data',b=>{output+=b;log.write(b)});child.stderr.on('data',b=>log.write(b));
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('No native ready: '+output)),30000);child.once('exit',code=>{if(!address){clearTimeout(timeout);reject(Error('Native exit '+code+' '+output))}});child.stdout.on('data',()=>{const line=output.split('\n').find(l=>l.includes('"event":"ready"'));if(line){address=JSON.parse(line).local_address;clearTimeout(timeout);resolve()}})});
 return {child,dir,address,config,selection,async stop(){const exit=once(child,'exit');child.kill('SIGINT');await exit;log.end();return output;}};
}
export function memory(pid){try{const s=fs.readFileSync(`/proc/${pid}/status`,'utf8');return {rss_kib:Number(s.match(/VmRSS:\s+(\d+)/)?.[1]),peak_rss_kib:Number(s.match(/VmHWM:\s+(\d+)/)?.[1])};}catch{return {};}}
export function connect(address,path='/live'){
 const socket=new WS('ws://'+address+path);const frames=[];const events=[];
 socket.on('message',data=>{const f=JSON.parse(String(data));frames.push({...f,bytes:data.length,at:performance.now()});for(const waiter of [...events])if(waiter.test(f)){clearTimeout(waiter.timeout);events.splice(events.indexOf(waiter),1);waiter.resolve(f)}});
 socket.on('error',()=>{});socket.on('close',(code,reason)=>{for(const w of events.splice(0)){clearTimeout(w.timeout);w.reject(Error('Socket closed '+code+' '+String(reason)));}});
 function wait(test,ms=30000){const existing=frames.find(test);if(existing)return Promise.resolve(existing);return new Promise((resolve,reject)=>{const waiter={test,resolve,reject,timeout:setTimeout(()=>{events.splice(events.indexOf(waiter),1);reject(Error('Frame timeout, close state '+socket.readyState+' last '+JSON.stringify(frames.at(-1)?.stats)))},ms)};events.push(waiter)});}
 return{socket,frames,wait,async close(){if(socket.readyState===WS.CLOSED)return;const done=once(socket,'close');socket.close();await done;}};
}
