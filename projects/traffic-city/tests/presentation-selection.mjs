// Verify a retained native session against an independently built HTTP bundle.
// This is identity verification, not a replacement for native or browser tests.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const game=JSON.parse(fs.readFileSync(process.env.CITY_SELECTION||'.build/selection.json'));
const http=JSON.parse(fs.readFileSync(process.env.HTTP_CITY_SELECTION||'.build/web-selection.json'));
for(const selected of [game,http]){
 assert.equal(hash(fs.readFileSync(selected.bin)),selected.compiler_sha256,'Selected compiler');
 assert.equal(hash(fs.readFileSync(selected.artifact)),selected.artifact_sha256,'Selected artifact');
}
assert.equal(game.compiler_sha256,http.compiler_sha256,'Pinned runtime identity');
let gameModules=0;
for(const [name,digest]of Object.entries(game.sources)){
 if(['assets','http'].includes(name))continue;
 assert.equal(hash(fs.readFileSync('src/'+name+'.lkjc')),digest,'Retained game module: '+name);gameModules++;
}
assert(gameModules>0);assert.deepEqual(Object.keys(http.sources).sort(),['assets','http']);
for(const [name,digest]of Object.entries(http.sources))assert.equal(hash(fs.readFileSync('src/'+name+'.lkjc')),digest,'Selected HTTP source: '+name);
const embedded=fs.readFileSync('src/assets.lkjc','utf8');
const files=['index.html','app.js','motion.js','geometry.js','commands.js','lines.js','finances.js','lab.js','atlas.js','style.css','favicon.svg'];
const browser={};
for(const name of files){
 const bytes=fs.readFileSync('web/'+name);assert(bytes.length<=65536,'Native text literal limit: '+name);
 assert(embedded.includes('(text '+JSON.stringify(bytes.toString('utf8'))+')'),'Exact embedded asset: '+name);browser[name]=hash(bytes);
}
const result={passed:true,gameModules,gameArtifact:game.artifact_sha256,httpArtifact:http.artifact_sha256,compiler:game.compiler_sha256,browser};
fs.mkdirSync('evidence',{recursive:true});fs.writeFileSync('evidence/presentation-selection.json',JSON.stringify(result,null,2)+'\n');console.log(result);
