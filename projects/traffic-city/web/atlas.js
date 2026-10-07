// A view of native paired measurements. No simulation, scoring or route prediction.
export const atlasFields = ['home','before','after','same','less','more','equal','baseTime','planTime','baseWait','planWait','baseLost','planLost'];
export function decodeAtlas(wire) {
 const homes=(wire?.homes||[]).map(values=>{
  if(!Array.isArray(values)||values.length!==atlasFields.length||!values.every(Number.isSafeInteger))throw Error('Invalid native atlas row');
  return Object.fromEntries(atlasFields.map((key,i)=>[key,values[i]]));
 });
 return {...wire,homes};
}
export function atlasKind(row) {
 if(row.before!==row.same||row.after!==row.same)return 'changed';
 if(row.less&&row.more)return 'mixed';
 return row.more?'more':row.less?'less':'equal';
}
const marks={less:['−','Less journey time','#23716e'],more:['+','More journey time','#a94b27'],mixed:['±','Mixed effects','#70509a'],equal:['=','Same journey time','#667469'],changed:['×','Different residents','#5c617d']};
export function createDelayAtlas({focusHome,closeResults,clearSelection}) {
 const $=id=>document.getElementById(id);
 let report={homes:[]},rows=new Map(),active=false,phase=0,available=false,fingerprint='',rendered=[],inspected=null;
 const number=n=>n.toLocaleString();
 const signed=n=>(n>0?'+':n<0?'−':'')+number(Math.abs(n));
 const element=(tag,text,className)=>{const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node};
 function render() {
  document.body.classList.toggle('atlas-visible',active);
  $('atlas-toggle').hidden=phase!==4;$('atlas-toggle').disabled=!available||!rows.size;
  $('atlas-toggle').setAttribute('aria-pressed',String(active));$('atlas-toggle').textContent=active?'Hide journey atlas':'Journey atlas';
  $('atlas-controls').hidden=!active;$('atlas-map-open').disabled=!available||!rows.size;
  $('atlas-home-select').disabled=!available;
 }
 function show(value){active=value&&phase===4&&available&&rows.size>0;clearSelection();render()}
 $('atlas-toggle').onclick=()=>show(!active);
 $('atlas-map-open').onclick=()=>{show(true);closeResults();$('atlas-home-select').focus()};
 $('atlas-home-select').onchange=()=>{const value=$('atlas-home-select').value;if(value!==''&&available)focusHome(Number(value))};
 return {
  receive(frame,usable){
   phase=frame.phase;available=phase===4&&usable;
   if(phase!==4){if(active)clearSelection();active=false;report={homes:[]};rows.clear();fingerprint='';inspected=null;render();return}
   // The native full atlas is sent once, with the result transition. Subsequent
   // reliable WebSocket frames carry only totals; the retained report is local UI.
   const key=JSON.stringify(frame.atlas);
   if(key!==fingerprint){
    fingerprint=key;inspected=null;report=decodeAtlas(frame.atlas);rows=new Map(report.homes.map(r=>[r.home,r]));
    $('atlas-cohort').textContent=`${number(report.same||0)} of the same residents compared. ${number(report.removed||0)} original residents excluded; ${number(report.added||0)} new or relocated residents shown separately.`;
    $('atlas-counts').replaceChildren(...[['less','Less time'],['more','More time'],['equal','Same time']].map(([key,label])=>{
     const span=element('span','',key);span.append(element('strong',number(report[key]||0)),element('small',label));return span;
    }));
    $('atlas-warning').textContent=frame.cancelled||frame.moveouts||frame.newResidents?'This plan changes people or cancels journeys. A lower burden is not proof of better transport. Read visits and cancellations above.':'Less time tied up in journeys is not automatically better: it can also mean fewer trips or visits. Read both futures together.';
    const prior=$('atlas-home-select').value;
    $('atlas-home-select').replaceChildren(element('option','Choose a home…'));
    $('atlas-home-select').firstElementChild.value='';
    for(const row of report.homes){const kind=atlasKind(row),option=element('option',`${row.home%128}, ${Math.floor(row.home/128)} · ${marks[kind][0]} ${marks[kind][1]}`);option.value=String(row.home);$('atlas-home-select').append(option)}
    if(prior&&rows.has(Number(prior)))$('atlas-home-select').value=prior;
   }
   render();
  },
  inspect(id,open){
   if(!active){inspected=null;return false}
   const row=rows.get(id);if(!row){inspected=null;return false}
   // Results are immutable until the next experiment. Preserve selected text,
   // screen-reader position and scroll instead of rebuilding on every heartbeat.
   if(!open&&inspected===id)return true;
   inspected=id;
   if(open)$('inspector').hidden=false;
   $('atlas-home-select').value=String(id);
   const kind=atlasKind(row),delta=row.planTime-row.baseTime;
   $('inspect-title').textContent=`Home · ${id%128}, ${Math.floor(id/128)}`;
   $('inspect-body').textContent=`${marks[kind][0]} ${marks[kind][1]}. ${row.same} identical residents compared; ${row.before} before, ${row.after} in the plan. Markers show where people live, not where a queue formed.`;
   const details=document.createElement('div'),dl=document.createElement('dl');
   for(const [label,value]of [
    ['Time in journeys',`${number(row.baseTime)} → ${number(row.planTime)}`],
    ['Change · person-cycles',row.same?signed(delta):'Not comparable'],
    ['Long-wait exposure',`${number(row.baseWait)} → ${number(row.planWait)}`],
    ['Disconnected exposure',`${number(row.baseLost)} → ${number(row.planLost)}`],
    ['Residents with less / more time',`${row.less} / ${row.more}`],
    ['Unchanged residents',String(row.equal)],
    ['Excluded / new residents',`${row.before-row.same} / ${row.after-row.same}`]
   ])dl.append(element('dt',label),element('dd',value));
   details.append(dl,element('p','No change → your plan. All exposure values are person-cycles across the same window, including unfinished journeys. Resting and time at destinations are excluded. Long-wait exposure counts cycles with a current wait of at least 8.','small'));
   if(!row.same)details.prepend(element('p','No identical residents remain at this home. Zero comparison values are not an improvement.','atlas-caution'));
   if(row.less&&row.more)details.prepend(element('p','Effects are mixed inside this home. The total can hide residents spending more time in journeys.','atlas-caution'));
   $('inspect-details').replaceChildren(details);return true;
  },
  pick(point,project,scale){
   if(!active)return null;let nearest=null,distance=Math.max(10,Math.min(20,scale/2+4));
   for(const row of rows.values()){const p=project(row.home%128+.5,Math.floor(row.home/128)+.5),d=Math.hypot(point.x-p.x,point.y-p.y);if(d<distance){distance=d;nearest=row.home}}
   return nearest;
  },
  draw(ctx,project,scale,width,height){
   rendered=[];if(!active)return;
   const radius=Math.max(2,Math.min(13,scale*.43));ctx.save();ctx.lineWidth=scale<8?1:2;
   ctx.font=`700 ${Math.max(10,Math.min(17,scale*.6))}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';
   for(const row of rows.values()){
    const p=project(row.home%128+.5,Math.floor(row.home/128)+.5);if(p.x<-radius||p.x>width+radius||p.y<-radius||p.y>height+radius)continue;
    const kind=atlasKind(row),[symbol,,color]=marks[kind];ctx.strokeStyle=color;ctx.fillStyle='#fbfaf3eb';
    ctx.setLineDash(kind==='changed'?[3,2]:[]);ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();ctx.stroke();
    if(scale>=14){ctx.fillStyle=color;ctx.fillText(symbol,p.x,p.y+.5)}else{ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1,radius*.45),0,Math.PI*2);ctx.fill()}
    rendered.push({home:row.home,x:p.x,y:p.y,kind});
   }ctx.restore();
  },
  get state(){return {active,homes:report.homes.map(r=>({...r})),rendered:rendered.map(r=>({...r}))}}
 };
}
