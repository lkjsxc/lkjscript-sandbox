// Resume only an unchanged, linked prefix of ordinary accepted proposals.
// No semantic-store metadata is edited. The caller independently obtains the
// current product revision through `lkjscript status` before this validation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
export function verifyAuthorPrefix(project,sources,currentRevision){
 let prior=null,count=0,gap=false;
 for(const [name,source]of Object.entries(sources)){
  const planFile=path.join(project,name+'.plan.txt');
  if(!fs.existsSync(planFile)){gap=true;continue;}
  assert(!gap,'An accepted proposal appears after a missing prefix member: '+name);
  // The caller resolves canonical callbacks through the public native draft
  // operation. Never accept an unresolved owner/module/parameter placeholder.
  assert(!['__LIVE_MODULE__','__TRANSITION_OWNER__','__STATE_PARAMETER__','__EVENT_PARAMETER__'].some(label=>source.includes(label)),'Unresolved canonical callback-owner binding.');
  const proposal=fs.readFileSync(path.join(project,name+'.lkjc'),'utf8');
  const header=proposal.match(/^request base=(rev_[a-f0-9]+)\n/);assert(header,'Missing ordinary request header: '+name);
  assert.equal(proposal.slice(header[0].length),source,'Already accepted source changed: '+name);
  const plan=fs.readFileSync(planFile,'utf8');
  assert(plan.includes('result status=prepared command=change.plan'),'Not an accepted plan receipt: '+name);
  const revision=plan.match(/revision base=(rev_[a-f0-9]+) result=(rev_[a-f0-9]+)/);assert(revision,'Missing planned revision chain: '+name);
  assert.equal(header[1],revision[1],'Proposal and plan disagree: '+name);
  if(prior!==null)assert.equal(revision[1],prior,'Broken accepted revision chain: '+name);
  prior=revision[2];count++;
 }
 assert(count>0,'No reusable accepted prefix');
 assert.equal(currentRevision,prior,'Live product revision differs from the accepted prefix; do not resume.');
 return count;
}
