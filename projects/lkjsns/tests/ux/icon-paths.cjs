// Test-only mirror of the source-content revision used by embed-icons.cjs.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../web');
const files=['favicon.svg','favicon.ico','favicon-32.png','apple-touch-icon.png'];
const hash=crypto.createHash('sha256');for(const file of files)hash.update(fs.readFileSync(path.join(root,file)));
const revision=hash.digest('hex').slice(0,12);
const iconPaths={svg:`/favicon-${revision}.svg`,ico:`/favicon-${revision}.ico`,png:`/favicon-${revision}-32.png`,touch:`/apple-touch-icon-${revision}.png`};
module.exports={iconPaths,iconRevision:revision};
