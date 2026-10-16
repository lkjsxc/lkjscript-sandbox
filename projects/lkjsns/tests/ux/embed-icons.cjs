// Optional development-only embedding. Product markup and assets stay native.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {specs,iconPaths,iconRevision,previousPaths,legacyPaths,manifest}=require('./icon-catalog.cjs');
const root=path.resolve(__dirname,'../..');
const sources=specs.map(([name,file,mime])=>({name,file,mime,versioned:iconPaths[name],bytes:fs.readFileSync(path.join(root,'web',file))}));
const text=value=>`(text ${JSON.stringify(value)})`;
const call=(name,...args)=>`(call ${name}${args.length?' '+args.join(' '):''})`;
const iff=(condition,a,b)=>`(if ${condition} ${a} ${b})`;
const fn=(name,parameters,type,body)=>`  (function create ${name} (visibility public)\n${parameters.map(([name,type])=>`    (parameter create ${name} (type ${type}))\n`).join('')}    (returns ${type}) (effect pure)\n    (body ${body}))\n`;
const test=(name,actual,expected)=>`  (test create ${name} (visibility private) (actual ${actual}) (expected ${expected}))\n`;
const aliases=item=>['/'+item.file,item.versioned,...(previousPaths[item.name]?[previousPaths[item.name]]:[]),...(legacyPaths[item.name]?[legacyPaths[item.name]]:[])];
const matching=paths=>call('util::has',`(list Text ${paths.map(text).join(' ')})`,'(local path)','(i64 0)');
const declarations=[];
for(const item of sources){
 if(item.name==='svg')declarations.push(fn('svg',[],'Bytes',call('std::bytes-from-text',text(item.bytes.toString('utf8')))));
 else{
  if(item.bytes.length>32768)throw new Error('Icon exceeds the bounded 32 KiB representation limit: '+item.file);
  // Compact literals avoid a canonical graph node for every image byte.
  // The decoder is bounded native lkjscript; no host-language runtime is used.
  const decode=bytes=>call('iconbytes::decode',text(bytes.toString('hex')));
  const body=item.bytes.length<=16384?decode(item.bytes):call('iconbytes::pair',decode(item.bytes.subarray(0,16384)),decode(item.bytes.subarray(16384)));
  const payload=fn('read',[],'Bytes',body);
  fs.writeFileSync(path.join(root,'src/icondata',item.name+'.lkjc'),`(module create icon${item.name}\n${payload}\n)\n`);
  declarations.push(fn(item.name,[],'Bytes',call('icon'+item.name+'::read')));
 }
 declarations.push(test(item.name+'-has-payload',call('std::less','(i64 0)',call('std::bytes-length',call('icons::'+item.name))),'(bool true)'));
}
const manifestText=JSON.stringify(manifest,null,2)+'\n';fs.writeFileSync(path.join(root,'web/manifest.webmanifest'),manifestText);
declarations.push(fn('manifest',[],'Bytes',call('std::bytes-from-text',text(manifestText))));
const links=`<link rel="icon" href="${iconPaths.ico}" sizes="16x16 32x32"><link rel="icon" href="${iconPaths.png}" type="image/png" sizes="32x32"><link rel="icon" href="${iconPaths.svg}" type="image/svg+xml" sizes="any"><link rel="apple-touch-icon" href="${iconPaths.touch}" sizes="180x180"><link rel="manifest" href="/manifest.webmanifest"><meta name="application-name" content="lkjsns"><meta name="apple-mobile-web-app-title" content="lkjsns">`;
const mark=`<img class="brand-mark" src="${iconPaths.svg}" width="32" height="32" alt="" aria-hidden="true" decoding="async">`;
const brand=`<a href="/" class="brand" aria-label="lkjsns home">${mark}<span>lkjsns</span></a>`;
declarations.push(fn('links',[],'Text',text(links)),fn('revision',[],'Text',text(iconRevision)),fn('mark',[],'Text',text(mark)),fn('brand',[],'Text',text(brand)));
const extraPaths=['/manifest.webmanifest','/site.webmanifest','/apple-touch-icon-precomposed.png'];
declarations.push(fn('known',[['path','Text']],'Bool',matching([...new Set([...sources.flatMap(aliases),...extraPaths])])));
let data=call('std::bytes-from-text',text('')),mime=text('application/octet-stream');
for(const item of sources.slice().reverse()){
 data=iff(matching(aliases(item)),call('icons::'+item.name),data);mime=iff(matching(aliases(item)),text(item.mime),mime);
}
data=iff(matching(['/apple-touch-icon-precomposed.png']),call('icons::touch'),data);
mime=iff(matching(['/apple-touch-icon-precomposed.png']),text('image/png'),mime);
data=iff(matching(['/manifest.webmanifest','/site.webmanifest']),call('icons::manifest'),data);
mime=iff(matching(['/manifest.webmanifest','/site.webmanifest']),text('application/manifest+json; charset=utf-8'),mime);
declarations.push(fn('data',[['path','Text']],'Bytes',data),fn('mime',[['path','Text']],'Text',mime));
declarations.push(test('ico-header',call('std::bytes-to-hex',call('std::bytes-slice',call('icons::ico'),'(i64 0)','(i64 6)')),text('000001000200')));
declarations.push(test('png-header',call('std::bytes-to-hex',call('std::bytes-slice',call('icons::png'),'(i64 0)','(i64 8)')),text('89504e470d0a1a0a')));
declarations.push(test('wordmark-is-lkjsns',call('std::text-contains',call('std::bytes-to-text',call('icons::svg')),text('id="wordmark-lkjsns"')),'(bool true)'));
declarations.push(test('svg-is-font-independent',call('std::text-contains',call('std::bytes-to-text',call('icons::svg')),text('<text')),'(bool false)'));
for(const item of sources)for(const [i,url]of aliases(item).entries())declarations.push(test(item.name+'-alias-'+i,call('std::bytes-equal',call('icons::data',text(url)),call('icons::'+item.name)),'(bool true)'));
declarations.push(test('brand-uses-current-mark',call('std::text-contains',call('icons::brand'),call('icons::mark')),'(bool true)'));
declarations.push(test('brand-has-no-old-glyph',call('std::text-contains',call('icons::brand'),text('lk/')),'(bool false)'));
declarations.push(test('manifest-media-type',call('icons::mime',text('/manifest.webmanifest')),text('application/manifest+json; charset=utf-8')));
declarations.push(test('unknown-path-is-not-an-icon',call('icons::known',text('/icon/anything')),'(bool false)'));
fs.writeFileSync(path.join(root,'src/icons.lkjc'),'(module create icons\n'+declarations.join('\n')+'\n)\n');
const servicePath=path.join(root,'src/service.lkjc');let service=fs.readFileSync(servicePath,'utf8');
service=service.replace(/^\s*\(route create (?:icon-current-|identity-)[^\n]+\n/gm,'\n');
const maintenance=service.indexOf('\n(target create attention-index');
const end=service.lastIndexOf(')',maintenance<0?service.length:maintenance);if(end<0||!service.includes('(target create lkjsns'))throw new Error('Expected native service target.');
const paths=[...new Set([...sources.flatMap(aliases),...extraPaths])].filter(url=>!service.includes(`(path ${JSON.stringify(url)})`));
const routes=paths.map((url,i)=>`  (route create identity-${i} (method GET) (path ${JSON.stringify(url)}) (port service::app::view))`).join('\n');
service=service.slice(0,end)+routes+'\n'+service.slice(end);fs.writeFileSync(servicePath,service);
console.log(`Embedded six icon representations, shared brand, browser manifest and preserved previous URLs: ${iconRevision}`);
