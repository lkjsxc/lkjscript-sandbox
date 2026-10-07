// Independent measurement oracle over native observations. Does not move agents.
import assert from 'node:assert/strict';
export function observedLedger(frames){
 const out=new Map();
 for(const f of frames)for(const r of f.residents){
  const value=out.get(r.id)||{time:0,wait:0,lost:0};
  if([1,2,4,5,6].includes(r.state))value.time++;
  if(r.wait>=8)value.wait++;
  if(r.state===1&&[1,9].includes(r.reason))value.lost++;
  out.set(r.id,value);
 }
 return out;
}
export function expectedAtlas(original,plan,controlFrames,changedFrames){
 const a=new Map(original.agents),b=new Map(plan.agents),control=observedLedger(controlFrames),changed=observedLedger(changedFrames),rows=new Map();
 const blank=home=>({home,before:0,after:0,same:0,less:0,more:0,equal:0,baseTime:0,planTime:0,baseWait:0,planWait:0,baseLost:0,planLost:0});
 const row=home=>{if(!rows.has(home))rows.set(home,blank(home));return rows.get(home)};
 for(const id of original.ids){
  const r=a.get(id),other=b.get(id),out=row(r.home);out.before++;
  if(other?.id!==r.id||other.home!==r.home)continue;
  out.same++;const old=control.get(id),next=changed.get(id);assert(old&&next);
  out[next.time<old.time?'less':next.time>old.time?'more':'equal']++;
  for(const [field,key]of [['Time','time'],['Wait','wait'],['Lost','lost']]){out['base'+field]+=old[key];out['plan'+field]+=next[key]}
 }
 for(const id of plan.ids)row(b.get(id).home).after++;
 const homes=[...rows.values()].sort((a,b)=>a.home-b.home),out={homes,same:0,less:0,more:0,equal:0,removed:0,added:0,baseTime:0,planTime:0,baseWait:0,planWait:0,baseLost:0,planLost:0};
 for(const r of homes){for(const key of ['same','less','more','equal','baseTime','planTime','baseWait','planWait','baseLost','planLost'])out[key]+=r[key];out.removed+=r.before-r.same;out.added+=r.after-r.same}
 return out;
}
