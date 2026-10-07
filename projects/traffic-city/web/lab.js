// Presentation only. Native lkjscript owns the branches, clock, metrics and commit.
import {createDelayAtlas} from './atlas.js';
export function createCityLab({send,leaveMenu,cancelGesture,setTool,toast,focusHome}){
 const $=id=>document.getElementById(id);
 let frame={phase:0},status=0,pending=null,hadLab=false,disconnected=false;
 const money=n=>(n<0?'−$':'$')+Math.abs(n).toLocaleString();
  const usable=()=>status===1&&!disconnected;
 const close=id=>{if($(id).open)$(id).close()};
 const allDialogs=['lab-intro','lab-results','lab-confirm','lab-discard'];
 const atlas=createDelayAtlas({focusHome,closeResults:()=>close('lab-results'),clearSelection:()=>setTool(-2)});
 function command(op,fields={},kind=op){if(!usable()||pending)return;cancelGesture();const id=send(op,fields);if(id){pending={id,kind};render()}}
 function render(){
  const active=frame.phase>0,running=frame.phase===2||frame.phase===3,ready=usable()&&!pending;
  document.body.classList.toggle('in-lab',active);$('lab-bar').hidden=!active;
  $('lab-open').disabled=!usable()||!!pending;
  $('lab-open-label').textContent=active?'Return to City Lab':'City Lab · compare a plan';
  $('lab-heading').textContent=['','CITY LAB · EDIT PLAN','CITY LAB · NO CHANGE','CITY LAB · YOUR PLAN','CITY LAB · RESULTS'][frame.phase]||'CITY LAB';
  $('lab-anchor').textContent=`Real city frozen · cycle ${frame.realTick||0}`;
  $('lab-plan-cost').textContent=`${frame.planCost<0?'Plan refund':'Plan cost'} ${money(Math.abs(frame.planCost||0))}`;
  $('lab-caption').textContent=disconnected?'Connection lost. Temporary experiments are discarded on reconnect.':running?`${frame.phase===2?'No change':'Your plan'} · ${frame.step} / ${frame.horizon} cycles`:frame.phase===4?'Both futures ran for the same number of cycles.': 'Build on the map. Your original city stays untouched.';
  $('lab-progress').hidden=!running;$('lab-progress').max=frame.horizon||64;$('lab-progress').value=frame.step||0;
  $('lab-horizon').hidden=frame.phase!==1;$('lab-horizon').disabled=!ready;
  $('lab-compare').hidden=frame.phase!==1;$('lab-compare').disabled=!ready;
  $('lab-details').hidden=frame.phase!==4;$('lab-details').disabled=!ready;
  $('lab-edit').hidden=frame.phase===1;$('lab-edit').textContent=running?'Stop comparison':'Edit plan';$('lab-edit').disabled=!ready;
  $('lab-exit').disabled=!ready;
  for(const id of ['lab-start','lab-apply','lab-confirm-apply','lab-discard-yes'])$(id).disabled=!ready;
  $('lab-apply').disabled=!ready||frame.phase!==4||!!frame.control?.wealthError||!!frame.changed?.wealthError;
  $('lab-confirm-apply').disabled=!ready||frame.phase!==4||!frame.confirmation;
  for(const id of ['lab-intro-cancel','lab-confirm-cancel','lab-discard-no'])$(id).disabled=!!pending;
  $('lab-result-title').textContent=`Two futures · ${frame.horizon||64} cycles each`;
  $('lab-result-context').textContent=`Same starting city at cycle ${frame.realTick||0}. Plan cost: ${money(frame.planCost||0)}. New residents: ${frame.newResidents||0}; moving out: ${frame.moveouts||0}; journeys cancelled by the plan: ${frame.cancelled||0}.`;
  const a=frame.control||{},b=frame.changed||{};
  const rows=[['Destination visits','visits'],['Completed journeys','arrived'],['Waiting · person-cycles','waitCycles'],['Disconnected · person-cycles','disconnectedCycles'],['Unfinished journeys','outstanding'],['Cancelled journeys','cancelled'],['Residents','population'],['Rail boardings','boardings'],['City funds change','netFunds']];
  if(frame.phase===4)$('lab-comparison').replaceChildren(...rows.map(([label,key])=>{const tr=document.createElement('tr');const th=document.createElement('th');th.scope='row';th.textContent=label;tr.append(th);for(const value of [a[key]||0,b[key]||0]){const td=document.createElement('td');td.textContent=key==='netFunds'?money(value):value.toLocaleString();tr.append(td)}return tr}));
  $('lab-result-note').textContent=frame.control?.wealthError||frame.changed?.wealthError?'Accounting check failed. This experiment cannot be applied.':'Funds include construction and operation. Fewer waits alone do not prove a better plan: compare visits, unfinished journeys, cancellations and population. This is a bounded experiment, not a long-term forecast.';
  $('lab-commit-summary').textContent=`Apply the construction and service plan at cycle ${frame.realTick||0}. ${frame.planCost<0?'Refund':'Cost'}: ${money(Math.abs(frame.planCost||0))}. ${frame.newResidents||0} new residents, ${frame.moveouts||0} moving out, ${frame.cancelled||0} journeys cancelled.`;
  if(active){
   $('play').disabled=true;$('grow').disabled=frame.phase!==1||$('grow').disabled;
   $('cycle').textContent=`LAB · ${frame.phase===2?'NO CHANGE':frame.phase===3?'YOUR PLAN':frame.phase===4?'SIMULATED FUTURE':'EDITING PLAN'}`;
   if(usable())$('connection').textContent='Lab · original saved';
   $('saved').textContent=`Original saved · cycle ${frame.realTick}`;
   $('menu-saved').textContent=usable()?`Experiment is temporary. Original city saved at cycle ${frame.realTick}.`:'Another tab or connection interruption made this experiment inactive.';
   $('save').textContent='Save original city';
   $('session-note').textContent='Experimental plans are temporary. Reconnecting or session expiry discards them; your real saved city and previous-city backup are retained.';
  }
  atlas.receive(frame,ready);
  for(const id of ['examples-open','manage-open'])$(id).disabled=active;
  for(const button of document.querySelectorAll('button[data-tool],button[data-palette]')){if(button.dataset.tool===undefined||Number(button.dataset.tool)>=0)button.disabled=active&&frame.phase!==1}
 }
 $('lab-open').onclick=()=>{if(!usable())return;if(frame.phase){leaveMenu();$('lab-exit').focus()}else{$('lab-intro').showModal();$('lab-intro-cancel').focus()}};
 $('lab-start').onclick=()=>{command('lab-start');if(pending){close('lab-intro');leaveMenu()}};
 $('lab-intro-cancel').onclick=()=>{if(!pending)close('lab-intro')};
 $('lab-compare').onclick=()=>command('lab-run',{kind:Number($('lab-horizon').value)});
 $('lab-edit').onclick=()=>{command('lab-edit');close('lab-results')};
 $('lab-details').onclick=()=>{$('lab-results').showModal();$('lab-results-close').focus()};
 $('lab-results-close').onclick=()=>{if(!pending){close('lab-results');$('lab-details').focus()}};
 $('lab-apply').onclick=()=>command('lab-review');
 $('lab-confirm-cancel').onclick=()=>{if(!pending){command('cancel-review');close('lab-confirm')}};
 $('lab-confirm-apply').onclick=()=>command('lab-apply',{x:frame.confirmation});
 $('lab-exit').onclick=()=>{close('lab-results');$('lab-discard').showModal();$('lab-discard-no').focus()};
 $('lab-discard-no').onclick=()=>{if(!pending){close('lab-discard');$('lab-exit').focus()}};
 $('lab-discard-yes').onclick=()=>command('lab-discard');
 for(const id of allDialogs)$(id).addEventListener('cancel',e=>{e.preventDefault();if(pending)return;if(id==='lab-confirm')command('cancel-review');close(id)});
 return {
  get active(){return frame.phase>0},get phase(){return frame.phase},get report(){return structuredClone(frame)},get atlas(){return atlas.state},
  drawAtlas(...args){atlas.draw(...args)},pickAtlas(...args){return atlas.pick(...args)},inspectAtlas(...args){return atlas.inspect(...args)},
  offline(){disconnected=true;if(frame.phase)hadLab=true;pending=null;allDialogs.forEach(close);render()},
  receive(f){
   const previous=frame.phase,retainedAtlas=frame.atlas;let focusAfterRender=null;frame=f.lab||{phase:0};
   if(frame.phase===4&&!frame.atlasChanged&&previous===4)frame={...frame,atlas:{...frame.atlas,homes:retainedAtlas?.homes||[]}};status=f.status;
   if(status===1&&disconnected){disconnected=false;if(hadLab&&!frame.phase)toast('Temporary experiment discarded after reconnect. Your original saved city was restored.',8000);hadLab=false}
   if(previous!==frame.phase){cancelGesture();setTool(-2);if(!frame.phase)allDialogs.forEach(close)}
   if(pending&&f.ack>=pending.id){const action=pending;pending=null;if(action.kind==='lab-review'&&frame.phase===4&&frame.confirmation===action.id&&status===1){close('lab-results');$('lab-confirm').showModal();focusAfterRender='lab-confirm-cancel'}if(action.kind==='lab-apply'||action.kind==='lab-discard'){allDialogs.forEach(close);$('map').focus()}}
   render();if(focusAfterRender)$(focusAfterRender).focus();
   if(frame.phase===4&&previous===3&&usable()&&!document.querySelector('dialog[open]')){$('lab-results').showModal();$('lab-results-close').focus()}
  }
 };
}
