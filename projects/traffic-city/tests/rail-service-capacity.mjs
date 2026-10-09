// Exercise actual native construction at the eight-service boundary, including
// the legacy atomic builder. No seeded fake rail IDs or client-side admission.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runCase, selection} from './run-case.mjs';
const command = (op, x, y, x2 = x, y2 = y, kind = 0) => ({op, x, y, x2, y2, kind});
const tiles = [[1,10,8],[10,10,8],[1,11,7],[10,11,7]].map(([x,y,kind]) => ({id:x+y*128,kind,q:0}));
const track = command('build-track', 1,10,10,10);
const pair = command('create-service',1,10,10,10);
const build = (count, after = []) => ({rows:0,ticks:0,tiles,commands:[track,...Array.from({length:count},()=>pair)],after});
const eight = runCase(build(8),'rail-services-eight').result;
assert.equal(eight.city.sim.transit.ids.length,8,'Eight services must be admitted through the native command');
assert.equal(eight.city.sim.transit.lines.length,8);
assert.deepEqual(eight.city.sim.transit.ids,[1,2,3,4,5,6,7,8]);
assert.equal(eight.conservation,0);
const ninth = runCase(build(8,[pair]),'rail-services-ninth-rejected').result;
assert.deepEqual(ninth,eight,'Ninth service rejects atomically, including funds, topology and next ID');
const legacy = command('build-rail',1,12,10,12);
const lastLegacy = runCase(build(7,[legacy]),'rail-services-eighth-legacy').result;
assert.equal(lastLegacy.city.sim.transit.lines.length,8);
assert.equal(lastLegacy.city.sim.transit.lines.at(-1)[1].enabled,true);
const legacyNinth = runCase(build(8,[legacy]),'rail-services-ninth-legacy-rejected').result;
assert.deepEqual(legacyNinth,eight,'Legacy builder obeys the same service limit');
fs.writeFileSync('evidence/commuter-grid/service-capacity.json',JSON.stringify({passed:true,artifact_sha256:selection.artifact_sha256,checks:['eight native services admitted','ninth rejects without any change','legacy eighth admitted','legacy ninth rejects without any change']},null,2)+'\n');
console.log('PASS eight-service native limit and atomic rejection through both builders');
