// Development-only catalog. All product identities use this one checked-in SVG.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../web');
const specs=[['svg','favicon.svg','image/svg+xml'],['ico','favicon.ico','image/x-icon'],['png','favicon-32.png','image/png'],['touch','apple-touch-icon.png','image/png'],['app192','app-icon-192.png','image/png'],['app512','app-icon-512.png','image/png']];
const hash=crypto.createHash('sha256');for(const [,file] of specs)hash.update(fs.readFileSync(path.join(root,file)));
const iconRevision=hash.digest('hex').slice(0,12);
const versioned=(name,tag)=>name==='touch'?`/apple-touch-icon-${tag}.png`:name==='png'?`/favicon-${tag}-32.png`:name.startsWith('app')?`/app-icon-${tag}-${name.slice(3)}.png`:`/favicon-${tag}.${name}`;
const iconPaths=Object.fromEntries(specs.map(([name])=>[name,versioned(name,iconRevision)]));
// Older asset URLs remain aliases. They now serve the circular revision too;
// current document links always use the new content hash.
const previousRevision='9ef7b4ce01bf';
const previousPaths=Object.fromEntries(specs.map(([name])=>[name,versioned(name,previousRevision)]));
const legacyPaths=Object.fromEntries(specs.slice(0,4).map(([name])=>[name,versioned(name,'b7cf1e2c2a49')]));
const manifest={id:'/',name:'lkjsns',short_name:'lkjsns',start_url:'/',scope:'/',display:'standalone',lang:'en',icons:[{src:iconPaths.app192,sizes:'192x192',type:'image/png',purpose:'any'},{src:iconPaths.app512,sizes:'512x512',type:'image/png',purpose:'any'},{src:iconPaths.svg,sizes:'any',type:'image/svg+xml',purpose:'any'}]};
module.exports={specs,iconPaths,iconRevision,previousPaths,legacyPaths,manifest};
