// Build-time data embedding only: preserve each browser file byte-for-byte as a native Text literal.
import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const items=[['html','index.html'],['javascript','app.js'],['motion','motion.js'],['geometry','geometry.js'],['lab','lab.js'],['atlas','atlas.js'],['css','style.css'],['icon','favicon.svg']];
const functions=items.map(([name,file])=>`  (function create ${name} (visibility public) (effect pure) (returns Bytes)\n   (body (call std::bytes-from-text (text ${JSON.stringify(fs.readFileSync(root+'/web/'+file,'utf8'))}))))`).join('\n');
fs.writeFileSync(root+'/src/assets.lkjc',`declarations.begin\n(units (use std builtin)\n (module create assets\n${functions}\n ))\ndeclarations.end\n`);
