import assert from 'node:assert/strict';
import {animationPreference,trafficReduced} from '../web/motion.js';
for(const saved of [undefined,null,false,12,'bad',{},[],{motion:false},{motion:'true'},{animation:'invalid'}])assert.equal(animationPreference(saved),'smooth');
assert.equal(animationPreference({motion:true}),'reduced');
for(const mode of ['smooth','reduced','system']){
 assert.equal(animationPreference({animation:mode,motion:true}),mode);
 for(const system of [false,true])assert.equal(trafficReduced(mode,system),mode==='reduced'||mode==='system'&&system);
}
console.log('Traffic preference defaults, legacy migration, explicit precedence and system matrix passed.');
