import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {verifyAuthorPrefix} from '../scripts/verify-author-prefix.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'traffic-author-prefix-'));
const sources={a:'a\n',b:'b\n',c:'c\n'};
function plan(name,base,next,source=sources[name]){fs.writeFileSync(path.join(dir,name+'.lkjc'),`request base=${base}\n${source}`);fs.writeFileSync(path.join(dir,name+'.plan.txt'),`result status=prepared command=change.plan\nrevision base=${base} result=${next}\n`);}
try{
 plan('a','rev_01','rev_02');plan('b','rev_02','rev_03');
 assert.equal(verifyAuthorPrefix(dir,sources,'rev_03'),2);
 assert.equal(verifyAuthorPrefix(dir,{...sources,c:'changed not-yet-applied tail'},'rev_03'),2);
 assert.throws(()=>verifyAuthorPrefix(dir,{...sources,a:'changed accepted source'},'rev_03'),/Already accepted source changed/);
 assert.throws(()=>verifyAuthorPrefix(dir,sources,'rev_04'),/Live product revision differs/);
 plan('b','rev_04','rev_05');assert.throws(()=>verifyAuthorPrefix(dir,sources,'rev_05'),/Broken accepted revision chain/);
 plan('b','rev_02','rev_03');plan('c','rev_03','rev_04');fs.rmSync(path.join(dir,'b.plan.txt'));assert.throws(()=>verifyAuthorPrefix(dir,sources,'rev_04'),/after a missing prefix/);
 fs.rmSync(path.join(dir,'c.plan.txt'));plan('a','rev_01','rev_02','__TRANSITION_OWNER__');assert.throws(()=>verifyAuthorPrefix(dir,{a:'__TRANSITION_OWNER__'},'rev_02'),/callback-owner binding/);
 const bound='(module edit module_ab live (function edit fn_cd transition (parameter edit param_ef state)))';
 plan('a','rev_01','rev_02',bound);
 assert.equal(verifyAuthorPrefix(dir,{a:bound},'rev_02'),1);
 assert.throws(()=>verifyAuthorPrefix(dir,{a:bound.replace('fn_cd','fn_ce')},'rev_02'),/Already accepted source changed/);
 assert.throws(()=>verifyAuthorPrefix(dir,{a:bound.replace('param_ef','param_ab')},'rev_02'),/Already accepted source changed/);
 for(const label of ['__LIVE_MODULE__','__STATE_PARAMETER__','__EVENT_PARAMETER__']){plan('a','rev_01','rev_02',label);assert.throws(()=>verifyAuthorPrefix(dir,{a:label},'rev_02'),/callback-owner binding/);}
 console.log('PASS 13 author-prefix cases: exact revisions, sources, chain, owner and parameter bindings; all unresolved callback placeholders rejected.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
