// Same-host / same-workspace port routing. No arbitrary remote endpoint override.
export function atPort(href,port,path){
 const u=new URL(href),s=String(port);
 if(!/^\d{1,5}$/.test(s)||Number(s)<1||Number(s)>65535)throw Error('Invalid application port.');
 // Port-based workspace gateways put the port in the first hostname label.
 // Preserve every byte of the workspace/account/domain suffix.
 if(!u.port&&/^\d{1,5}--/.test(u.hostname))u.hostname=u.hostname.replace(/^\d{1,5}(?=--)/,s);
 else u.port=s;
 u.pathname=path;u.search='';u.hash='';return u;
}
export function sessionURL(href){
 const current=new URL(href),port=current.searchParams.get('session_port');
 const u=port===null?new URL(href):atPort(href,port,'/metropolis/live');
 u.pathname='/metropolis/live';u.protocol=u.protocol==='https:'?'wss:':'ws:';u.search='';u.hash='';return u.href;
}
export function classicURL(href){
 const port=new URL(href).searchParams.get('classic_port');return port===null?null:atPort(href,port,'/').href;
}
