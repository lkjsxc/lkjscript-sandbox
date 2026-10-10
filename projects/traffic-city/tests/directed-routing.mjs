// Isolated native topology research. This does NOT certify building UI, saves,
// demolition, moving lane reservations, or deployment of these road features.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.env.CITY_SELECTION ||= '.build/routing-directed083.json';
const {runCase,selection}=await import('./run-case.mjs?directed');
const ground=id=>id%16384,layer=id=>Math.floor(id/16384),x=id=>id%128,y=id=>Math.floor(id/128)%128;
const road=k=>[1,2,9,10,11,12,13].includes(k),one=k=>k>=9&&k<=12,building=k=>k>=3&&k<=6;
const adjacent=id=>[x(id)<127?id+1:-1,y(id)<127?id+128:-1,x(id)>0?id-1:-1,y(id)>0?id-128:-1];
const directions=[[1,0],[0,1],[-1,0],[0,-1]];
function valid(tiles,from,to,origin,dest,mode){if(to<0||to>=32768)return false;const a=tiles.get(from)||0,b=tiles.get(to)||0;if(to!==origin&&to!==dest&&!road(b)&&!(mode===1&&b===7))return false;if(layer(from)!==layer(to))return ground(from)===ground(to)&&tiles.get(ground(from))===13&&a>0&&b>0;const d=adjacent(from).indexOf(to);if(d<0)return false;if(mode!==2)return true;return (!one(a)||d===a-9||building(b)||b===8)&&(!one(b)||d!==(b-9+2)%4||building(a)||a===8)}
function cost(tiles,q,to,mode){if(mode===1)return 4;const k=tiles.get(to)||0,junction=road(k)&&(tiles.get(ground(to))===13||adjacent(to).filter(id=>road(tiles.get(id))).length>=3),capacity=road(k)?k===2?2:1:k===4?16:k===5?8:12;return (road(k)&&k!==2?2:1)+(junction?2:0)+Math.min(8,Math.floor((q.get(to)||0)/capacity))}
function shortest(tiles,q,query){const {origin,dest,mode}=query,dist=new Map([[origin,0]]),pending=[[0,origin]];while(pending.length){pending.sort((a,b)=>b[0]-a[0]);const [distance,node]=pending.pop();if(dist.get(node)!==distance)continue;if(node===dest)return distance;const choices=[...adjacent(node),layer(node)?node-16384:node+16384];for(const to of choices){if(!valid(tiles,node,to,origin,dest,mode))continue;const candidate=distance+(relaxed&&mode===2?1:cost(tiles,q,to,mode));if(candidate<(dist.get(to)??Infinity)){dist.set(to,candidate);pending.push([candidate,to])}}}return -1}
const relaxed=process.env.ROUTE_POLICY==='topology-first';
const cases=[];
const add=(name,tiles,origin,dest,q=new Map())=>cases.push({name,tiles,q,queries:[{origin,dest,mode:1},{origin,dest,mode:2},{origin:dest,dest:origin,mode:1},{origin:dest,dest:origin,mode:2}]});
for(let d=0;d<4;d++){const [dx,dy]=directions[d],id=i=>10+dx*i+(10+dy*i)*128;add('oneway-'+d,new Map(Array.from({length:5},(_,i)=>[id(i),i===0?3:i===4?4:9+d])),id(0),id(4))}
function tunnel(under=1,portals=2){const t=new Map([[2560,3],[2561,portals?13:1],[2569,portals===2?13:1],[2570,4],[2565,6]]);for(let i=1;i<=9;i++)t.set(16384+2560+i,under);return t}
for(const p of [0,1,2])add('tunnel-portals-'+p,tunnel(1,p),2560,2570);
add('pedestrian-underpass',tunnel(7),2560,2570);
add('oneway-tunnel',tunnel(9),2560,2570);
const ring=new Map();for(let i=20;i<26;i++)ring.set(i+20*128,9);for(let j=20;j<24;j++)ring.set(26+j*128,10);for(let i=26;i>20;i--)ring.set(i+24*128,11);for(let j=24;j>20;j--)ring.set(20+j*128,12);ring.set(19+20*128,3);ring.set(27+24*128,4);add('directed-ring-driveways',ring,19+20*128,27+24*128);
add('ground-row-boundary',new Map([[127,3],[128,4]]),127,128);
add('underground-row-boundary',new Map([[16511,3],[16512,4]]),16511,16512);
add('layer-boundary',new Map([[16383,3],[16384,4]]),16383,16384);
let seed=739113;const rand=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
for(let c=0;c<32;c++){const t=new Map(),q=new Map();for(let level=0;level<2;level++)for(let b=0;b<8;b++)for(let a=0;a<8;a++){const id=40+a+(40+b)*128+level*16384,r=rand();if(r%6)t.set(id,[1,2,7,9,10,11,12][r%7]);if(r%5===0)q.set(id,r%19)}const start=40+40*128,end=47+47*128;t.set(start,3);t.set(end,4);for(const id of [42+42*128,46+45*128]){t.set(id,13);t.set(id+16384,1)}add('layered-random-'+c,t,start,end,q)}
const results=[];let routes=0,layerChanges=0;
for(const c of cases){const input={tiles:[...c.tiles],q:[...c.q],queries:c.queries},r=runCase(input,'directed-'+c.name,relaxed?'commute-route-probe':'route-probe');const observed=[];for(let i=0;i<c.queries.length;i++){const query=c.queries[i],route=r.result[i],expected=shortest(c.tiles,c.q,query);if(relaxed&&query.mode===2&&expected>=0)assert.equal(route.path.length-1,expected,c.name+' hop count');else assert.equal(route.cost,expected,c.name+' '+JSON.stringify(query));if(expected<0){assert.deepEqual(route.path,[])}else{assert.equal(route.path[0],query.origin);assert.equal(route.path.at(-1),query.dest);let total=0;for(let j=1;j<route.path.length;j++){assert(valid(c.tiles,route.path[j-1],route.path[j],query.origin,query.dest,query.mode));total+=cost(c.tiles,c.q,route.path[j],query.mode);if(layer(route.path[j-1])!==layer(route.path[j]))layerChanges++}assert.equal(total,route.cost);if(!(relaxed&&query.mode===2))assert.equal(total,expected)}observed.push({mode:query.mode,cost:expected,path_length:route.path.length});routes++}results.push({name:c.name,observed,input_sha256:createHash('sha256').update(JSON.stringify(input)).digest('hex')})}
assert(layerChanges>0,'A tunnel must actually be used');const out={passed:true,policy:relaxed?'topology-first driving; exact walking':'weighted-time reference',scope:'Routing graph only. Construction, demolition, persistence, UI, movement reservations and deployment are not certified by this probe.',routes,layerChanges,artifact_sha256:selection.artifact_sha256,compiler_sha256:selection.compiler_sha256,native_tests:selection.tests,cases:results};fs.writeFileSync(process.env.DIRECTED_REPORT||'evidence/directed-routing.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
