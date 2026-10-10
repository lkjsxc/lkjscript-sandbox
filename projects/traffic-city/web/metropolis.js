import {MetroRenderer,clamp,districtAt,corridor} from './render.js';
import {sessionURL,classicURL} from './address.js';
const $=s=>document.querySelector(s),fmt=n=>Math.trunc(n||0).toLocaleString('en-US');
const canvas=$('#map'),renderer=new MetroRenderer(canvas);
let frame=null,socket=null,reconnectTimer=0,renewTimer=0,ack=0,inflight=null,queue=[],generation=0,disposed=false,viewTimer=0,lastView='',wantedView=null,noticeTimer=0,tool='explore',selected=-1,token='',owner='',ready=false;
const metrics={frames:0,bytes:0,maximumFrameBytes:0,acks:[],reconnections:0,errors:[]};
const randomHex=bytes=>Array.from(crypto.getRandomValues(new Uint8Array(bytes)),b=>b.toString(16).padStart(2,'0')).join('');
function notice(text,persist=false){clearTimeout(noticeTimer);$('#notice').textContent=text;if(text&&!persist)noticeTimer=setTimeout(()=>{$('#notice').textContent='';},6500);}
function error(e){metrics.errors.push(String(e));if(metrics.errors.length>32)metrics.errors.shift();notice(String(e.message||e));}
function endpoint(){return sessionURL(location.href);}
try{const classic=classicURL(location.href);$('#classic-menu').hidden=!classic;$('#classic-menu').href=classic||'/metropolis';}catch(e){error(e);}
$('#classic').href='/metropolis'+location.search;

try{token=localStorage.getItem('traffic-city.metropolis.key.v1')||'';if(!token){token=randomHex(32);localStorage.setItem('traffic-city.metropolis.key.v1',token);}else if(!/^[a-f0-9]{64}$/.test(token))throw Error('The existing recovery key is invalid and has been retained.');if(localStorage.getItem('traffic-city.metropolis.key.v1')!==token)throw Error('The browser did not retain its recovery key.');}catch(e){$('#connection').textContent='The recovery key could not be loaded. Existing storage is unchanged; no new city was created.';metrics.errors.push(String(e));token='';}
function pending(){renderer.pending=[...(inflight?[inflight]:[]),...queue].map(x=>x.preview).filter(Boolean);renderer.request();}
function flush(){
 if(!socket||socket.readyState!==WebSocket.OPEN||inflight||!ready||!queue.length)return;
 inflight=queue.shift();inflight.id=ack+1;inflight.started=performance.now();
 const action={op:inflight.op,x:0,y:0,x2:0,y2:0,kind:0,...inflight.fields};
 socket.send(JSON.stringify({id:inflight.id,action,token:inflight.op==='resume'?token:'',owner:inflight.op==='resume'?owner:''}));pending();
}
function command(op,fields={},preview=null){
 if(!ready||!socket||socket.readyState!==WebSocket.OPEN)return Promise.reject(Error('Not connected. The edit has not been queued.'));
 if(queue.length>=128)return Promise.reject(Error('The edit queue is full. Let the current edits finish.'));
 return new Promise((resolve,reject)=>{queue.push({op,fields,preview,resolve,reject});pending();flush();});
}
function mutate(op,fields={},preview=null){return command(op,fields,preview).catch(error);}
function requestView(v){wantedView=v;clearTimeout(viewTimer);viewTimer=setTimeout(sendView,100);}
function sendView(){
 if(!ready||frame?.status!==1||!wantedView)return;const text=JSON.stringify(wantedView);if(text===lastView)return;
 const old=queue.find(x=>x.op==='view');if(old){old.fields={...wantedView};lastView=text;return;}
 lastView=text;command('view',wantedView).catch(e=>{lastView='';error(e);});
}
renderer.onView=requestView;
function showInspector(id){selected=id;renderer.selected=id;$('#inspector').hidden=id<0;updateInspector();renderer.request();}
function updateInspector(){
 if(selected<0)return;const r=renderer.rows.get(selected),c=corridor(selected);$('#district-name').textContent=`District ${selected+1}`;
 $('#district-stats').textContent=r?`${fmt(r.population)} people · ${fmt(r.out+r.back)} travelling · ${fmt(r.queue)} queued`:'Fetching district traffic…';
 $('#district-route').textContent=`Commutes ${c.vertical?'north–south':'east–west'} to district ${c.toY*16+c.toX+1}. ${r?`Road capacity ${r.road}, rail capacity ${r.rail} per cycle.`:''}`;
 for(const [selector,value]of[['#district-road',renderer.roads[selected]??1],['#rail-h',renderer.rails[c.y]??0],['#rail-v',renderer.rails[16+c.x]??0]])if(document.activeElement!==$(selector))$(selector).value=String(value);
}
function update(frame){
 $('#population').textContent=fmt(frame.stats.population);$('#travelling').textContent=fmt(frame.stats.outbound+frame.stats.inbound);$('#queued').textContent=fmt(frame.stats.queued);$('#cash').textContent='$'+fmt(frame.cash);
 $('#pause').textContent=frame.paused?'Run':'Pause';$('#pause').setAttribute('aria-label',frame.paused?'Run the city':'Pause the city');
 const messages={0:'Resuming your city…',2:'Another tab controls this city. Use Menu → Resume here.',3:'Saved city needs recovery. It has not been overwritten.',4:'Saved-city capacity reached. Existing cities are preserved.',5:'A save could not be committed. Reconnect to recover.'};
 $('#connection').textContent=messages[frame.status]||'';$('#save-status').textContent=`Saved cycle ${frame.saved} · current cycle ${frame.stats.tick} · ${fmt(frame.stats.groups)} aggregate groups`;
 if(frame.notice)notice(frame.notice);updateInspector();
}
function receive(event,myGeneration){
 if(myGeneration!==generation)return;
 let f;try{f=JSON.parse(event.data);if(!f.stats||!Array.isArray(f.rows)||!Number.isSafeInteger(f.ack))throw Error('Invalid native frame.');}catch(e){error(e);socket.close();return;}
 metrics.frames++;const bytes=new TextEncoder().encode(event.data).length;metrics.bytes+=bytes;metrics.maximumFrameBytes=Math.max(metrics.maximumFrameBytes,bytes);
 frame=f;ack=f.ack;renderer.setFrame(f);update(f);
 if(!ready){ready=true;command('resume').then(()=>{lastView='';wantedView=renderer.viewport();sendView();if(document.hidden)mutate('sleep',{kind:1});}).catch(error);return;}
 if(inflight&&f.ack===inflight.id){const complete=inflight;inflight=null;metrics.acks.push({op:complete.op,ms:performance.now()-complete.started,tick:f.stats.tick,status:f.status});if(metrics.acks.length>256)metrics.acks.shift();complete.resolve(f);pending();}
 flush();
}
function disconnect(){
 ready=false;clearTimeout(renewTimer);lastView='';renderer.stop();
 if(renderer.frame)renderer.frame={...renderer.frame,status:0};
 const abandoned=[...(inflight?[inflight]:[]),...queue];inflight=null;queue=[];
 for(const q of abandoned)q.reject(Error(q.op==='view'?'Connection interrupted.':'Connection interrupted before acknowledgement. The edit is not replayed; reconnecting reads the saved result.'));
 pending();$('#connection').textContent='Disconnected. Your last committed city is retained.';
 if(!disposed&&!document.hidden)reconnectTimer=setTimeout(connect,1500);
}
function connect(){
 if(disposed||!token||socket&&[WebSocket.OPEN,WebSocket.CONNECTING].includes(socket.readyState))return;
 clearTimeout(reconnectTimer);ready=false;ack=0;owner=randomHex(16);const g=++generation;metrics.reconnections++;
 try{socket=new WebSocket(endpoint());}catch(e){error(e);return;}
 socket.onmessage=e=>receive(e,g);socket.onerror=()=>{};socket.onclose=()=>{if(g===generation)disconnect();};
 socket.onopen=()=>{renewTimer=setTimeout(async()=>{try{await command('save');socket.close(1000,'Renew city session');}catch(e){error(e);}},24*60*1000);};
}
function setTool(name){tool=name;for(const b of document.querySelectorAll('[data-tool]'))b.setAttribute('aria-pressed',String(b.dataset.tool===name));$('#road-palette').hidden=name!=='road';$('#rail-palette').hidden=name!=='rail';renderer.preview=null;renderer.request();}
for(const b of document.querySelectorAll('[data-tool]'))b.onclick=()=>setTool(b.dataset.tool);
$('#pause').onclick=()=>mutate('pause');$('#fit').onclick=()=>renderer.fit();$('#plus').onclick=()=>renderer.zoom(1.6);$('#minus').onclick=()=>renderer.zoom(1/1.6);
$('#inspect-close').onclick=()=>showInspector(-1);
$('#menu-open').onclick=$('#funds').onclick=()=>$('#menu').showModal();$('#menu-close').onclick=()=>$('#menu').close();
$('#save').onclick=()=>mutate('save');$('#resume').onclick=()=>mutate('resume').then(()=>{lastView='';requestView(renderer.viewport());});
$('#new-city').onclick=async()=>{const n=Number($('#scenario').value);if(!confirm(`Load a new city with ${fmt(n)} people? Your current city becomes the one previous-city backup.`))return;const f=await mutate('scenario',{kind:n});if(f?.status===1){showInspector(-1);renderer.rows.clear();renderer.setFrame(f);renderer.fit();$('#menu').close();}};
$('#restore').onclick=async()=>{if(!confirm('Restore the previous city? Changes in the current city will be replaced.'))return;const f=await mutate('restore');if(f?.status===1){showInspector(-1);renderer.rows.clear();renderer.setFrame(f);renderer.fit();$('#menu').close();}};
const selectedFields=()=>({x:selected%16,y:Math.floor(selected/16),x2:selected%16,y2:Math.floor(selected/16)});
$('#district-road').onchange=()=>{if(selected>=0){const c={...selectedFields(),kind:Number($('#district-road').value)};mutate('road',c,c);}};
for(const name of ['rail-h','rail-v'])$('#'+name).onchange=()=>{if(selected>=0)mutate(name,{...selectedFields(),kind:Number($('#'+name).value)});};
$('#grow').onclick=()=>{if(selected>=0)mutate('grow',selectedFields(),selectedFields());};
const pointers=new Map();let gesture=null;
function local(e){const b=canvas.getBoundingClientRect();return{x:e.clientX-b.left,y:e.clientY-b.top};}
function tile(point){const p=renderer.unproject(point.x,point.y),id=districtAt(p.x,p.y);return id<0?null:{x:id%16,y:Math.floor(id/16)};}
function stroke(a,b){if(!a||!b)return null;const horizontal=Math.abs(b.x-a.x)>=Math.abs(b.y-a.y);return{x:a.x,y:a.y,x2:horizontal?b.x:a.x,y2:horizontal?a.y:b.y};}
canvas.onpointerdown=e=>{
 if(e.button!==0&&e.pointerType==='mouse')return;const p=local(e);canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,p);
 if(pointers.size===1)gesture={origin:p,from:tile(p),moved:false,multi:false,tool};
 if(pointers.size>=2){const[a,b]=[...pointers.values()];gesture={multi:true,distance:Math.hypot(a.x-b.x,a.y-b.y),mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};renderer.preview=null;}
 else if(tool==='road'||tool==='rail')renderer.preview=stroke(gesture.from,gesture.from);renderer.request();
};
canvas.onpointermove=e=>{
 if(!pointers.has(e.pointerId))return;const p=local(e),old=pointers.get(e.pointerId);pointers.set(e.pointerId,p);if(!gesture)return;
 if(pointers.size>=2){const[a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(gesture.distance){renderer.pan(mid.x-gesture.mid.x,mid.y-gesture.mid.y);renderer.zoom(distance/Math.max(1,gesture.distance),mid.x,mid.y);}gesture={multi:true,distance,mid};return;}
 if(gesture.multi)return;gesture.moved||=Math.hypot(p.x-gesture.origin.x,p.y-gesture.origin.y)>5;
 if(gesture.tool==='explore')renderer.pan(p.x-old.x,p.y-old.y);else if(['road','rail'].includes(gesture.tool)){renderer.preview=stroke(gesture.from,tile(p));renderer.request();}
};
canvas.onpointerup=e=>{
 const p=local(e),g=gesture;pointers.delete(e.pointerId);if(!g)return;
 if(g.multi){if(!pointers.size)gesture=null;return;}
 gesture=null;renderer.preview=null;const end=tile(p);
 if(g.tool==='explore'&&!g.moved){showInspector(end?end.y*16+end.x:-1);}
 else if(g.tool==='road'){const c=stroke(g.from,end);if(c)mutate('road',{...c,kind:Number($('#road-kind').value)},c);}
 else if(g.tool==='rail'){const c=stroke(g.from,end);if(c)mutate(c.y===c.y2?'rail-h':'rail-v',{...c,kind:1},c);}
 else if(g.tool==='grow'&&!g.moved&&end)mutate('grow',{x:end.x,y:end.y},stroke(end,end));renderer.request();
};
canvas.onpointercancel=()=>{pointers.clear();gesture=null;renderer.preview=null;renderer.request();};
canvas.onwheel=e=>{e.preventDefault();const p=local(e);renderer.zoom(Math.exp(-clamp(e.deltaY,-200,200)*.003),p.x,p.y);};
canvas.onkeydown=e=>{if(e.key==='Escape'){showInspector(-1);setTool('explore');}else if(e.key==='+'||e.key==='=')renderer.zoom(1.4);else if(e.key==='-')renderer.zoom(1/1.4);else if(e.key==='ArrowLeft')renderer.pan(50,0);else if(e.key==='ArrowRight')renderer.pan(-50,0);else if(e.key==='ArrowUp')renderer.pan(0,50);else if(e.key==='ArrowDown')renderer.pan(0,-50);else return;e.preventDefault();};
addEventListener('resize',()=>renderer.resize());
addEventListener('pagehide',()=>{disposed=true;clearTimeout(reconnectTimer);clearTimeout(renewTimer);renderer.stop();socket?.close(1000,'Page closed');});
addEventListener('pageshow',e=>{if(e.persisted){disposed=false;connect();renderer.lastDraw=0;renderer.request();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){mutate('sleep',{kind:1});renderer.stop();}else{if(ready)mutate('sleep',{kind:0});else connect();renderer.lastDraw=0;renderer.request();}});
setInterval(()=>{if(document.hidden)return;const m=renderer.metrics;$('#metrics').textContent=`Cycle ${frame?.stats.tick??0} · ${m.shown} representatives · LOD ${m.level} · ${queue.length+(inflight?1:0)} pending · saved ${frame?.saved??'—'}`;if(inflight&&performance.now()-inflight.started>15000)$('#connection').textContent='Waiting for native acknowledgement. Pending edits remain outlined.';},500);
window.__metropolis={renderer,metrics,command,showInspector,setTool,get frame(){return frame;},get pending(){return queue.length+(inflight?1:0);}};
connect();
