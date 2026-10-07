// Release verification groups; every result is bound to the selected native
// artifact and checked-in declaration inputs. Generated evidence is not public.
import fs from 'node:fs';import {spawn} from 'node:child_process';import {createHash} from 'node:crypto';
const groups={
 core:[['baseline','npm','test'],['waterfront','node','tests/waterfront.mjs'],['save-capacity','node','tests/save-capacity.mjs'],['management','npm','run','test:management'],['persistence','npm','run','test:persistence'],['city-lab','npm','run','test:city-lab']],
 transport:[['rail','npm','run','test:rail'],['expansion','npm','run','test:expansion'],['repair','npm','run','test:repair'],['delay-atlas','npm','run','test:delay-atlas'],['delay-atlas-metro','npm','run','test:delay-atlas-metro']],
 browser:[['native-host','node','tests/with-preview.mjs','tests/native-host.mjs'],['waterfront-ui','node','tests/with-preview.mjs','tests/waterfront-ui.mjs'],['city-lab-ui','npm','run','test:city-lab-ui'],['delay-atlas-ui','npm','run','test:delay-atlas-ui'],['ui-expansion','npm','run','test:ui-expansion'],['gestures','npm','run','test:gestures']],
};
const group=process.argv[2];if(!groups[group])throw Error('Specify core, transport or browser');
const selection=JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||'.build/selection.json'));
for(const [name,hash]of Object.entries(selection.sources)){const file='src/'+name+'.lkjc';if(createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==hash)throw Error('Unbuilt declaration input: '+name)}
const report={group,artifact_sha256:selection.artifact_sha256,started:new Date().toISOString(),tests:[],passed:false};
for(const [name,program,...args]of groups[group]){const log='evidence/waterfront-verify-'+name+'.log',fd=fs.openSync(log,'w'),start=performance.now();const child=spawn(program,args,{stdio:['ignore',fd,fd]});const result=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}))});fs.closeSync(fd);report.tests.push({name,...result,wall_ms:performance.now()-start,log,passed:result.code===0&&!result.signal});fs.writeFileSync('evidence/waterfront-verify-'+group+'.json',JSON.stringify(report,null,2));console.log(name,report.tests.at(-1).passed?'PASS':'FAIL',Math.round(report.tests.at(-1).wall_ms)+'ms')}
report.passed=report.tests.every(t=>t.passed);report.finished=new Date().toISOString();fs.writeFileSync('evidence/waterfront-verify-'+group+'.json',JSON.stringify(report,null,2));process.exitCode=report.passed?0:1;
