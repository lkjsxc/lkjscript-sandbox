// Optional development-only embedding of reviewed static artwork.
// Run after render-icons.cjs, then use the ordinary native build/check gate.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const specs=[['svg','favicon.svg','image/svg+xml'],['ico','favicon.ico','image/x-icon'],['png','favicon-32.png','image/png'],['touch','apple-touch-icon.png','image/png']];
const sources=specs.map(([name,file,mime])=>({name,file,mime,bytes:fs.readFileSync(path.join(root,'web',file))}));
const revision=crypto.createHash('sha256');for(const item of sources)revision.update(item.bytes);
const tag=revision.digest('hex').slice(0,12);
const text=value=>`(text ${JSON.stringify(value)})`;
const call=(name,...args)=>`(call ${name}${args.length?' '+args.join(' '):''})`;
const equal=(a,b)=>call('std::text-equal',a,b);
const iff=(condition,a,b)=>`(if ${condition} ${a} ${b})`;
const fn=(name,parameters,type,body,visibility='public')=>`  (function create ${name} (visibility ${visibility})\n${parameters.map(([name,type])=>`    (parameter create ${name} (type ${type}))\n`).join('')}    (returns ${type}) (effect pure)\n    (body ${body}))\n`;
const test=(name,actual,expected)=>`  (test create ${name} (visibility private) (actual ${actual}) (expected ${expected}))\n`;
let declarations=[];fs.mkdirSync(path.join(root,'src/icondata'),{recursive:true});
for(const item of sources){
 item.versioned=item.name==='touch'?`/apple-touch-icon-${tag}.png`:item.name==='png'?`/favicon-${tag}-32.png`:`/favicon-${tag}.${item.name}`;
 if(item.name==='svg')declarations.push(fn('svg',[],'Bytes',call('std::bytes-from-text',text(item.bytes.toString('utf8')))));
 else{
  const payload=fn('read',[],'Bytes',call('std::bytes-from-list',`(list I64 ${Array.from(item.bytes,n=>`(i64 ${n})`).join(' ')})`));
  fs.writeFileSync(path.join(root,'src/icondata',item.name+'.lkjc'),`(module create icon${item.name}\n${payload}\n)\n`);
  declarations.push(fn(item.name,[],'Bytes',call('icon'+item.name+'::read')));
 }
 declarations.push(test(item.name+'-has-payload',call('std::less','(i64 0)',call('std::bytes-length',call('icons::'+item.name))),'(bool true)'));
}
const byName=Object.fromEntries(sources.map(s=>[s.name,s]));
const links=`<link rel="icon" href="${byName.ico.versioned}" sizes="16x16 32x32"><link rel="icon" href="${byName.png.versioned}" type="image/png" sizes="32x32"><link rel="icon" href="${byName.svg.versioned}" type="image/svg+xml" sizes="any"><link rel="apple-touch-icon" href="${byName.touch.versioned}" sizes="180x180">`;
declarations.push(fn('links',[],'Text',text(links)),fn('revision',[],'Text',text(tag)));
const paths=sources.flatMap(s=>['/'+s.file,s.versioned]);
declarations.push(fn('known',[['path','Text']],'Bool',call('util::has',`(list Text ${paths.map(text).join(' ')})`,'(local path)','(i64 0)')));
let data=call('icons::touch'),mime=text('image/png');
for(const item of sources.slice(0,3).reverse()){
 const matches=call('util::has',`(list Text ${text('/'+item.file)} ${text(item.versioned)})`,'(local path)','(i64 0)');
 data=iff(matches,call('icons::'+item.name),data);mime=iff(matches,text(item.mime),mime);
}
declarations.push(fn('data',[['path','Text']],'Bytes',data),fn('mime',[['path','Text']],'Text',mime));
declarations.push(test('ico-header',call('std::bytes-to-hex',call('std::bytes-slice',call('icons::ico'),'(i64 0)','(i64 6)')),text('000001000200')));
declarations.push(test('png-header',call('std::bytes-to-hex',call('std::bytes-slice',call('icons::png'),'(i64 0)','(i64 8)')),text('89504e470d0a1a0a')));
declarations.push(test('wordmark-is-lkjsns',call('std::text-contains',call('std::bytes-to-text',call('icons::svg')),text('id="wordmark-lkjsns"')),'(bool true)'));
declarations.push(test('svg-is-font-independent',call('std::text-contains',call('std::bytes-to-text',call('icons::svg')),text('<text')),'(bool false)'));
for(const item of sources){declarations.push(test(item.name+'-versioned-alias',call('std::bytes-equal',call('icons::data',text(item.versioned)),call('icons::data',text('/'+item.file))),'(bool true)'));}
fs.writeFileSync(path.join(root,'src/icons.lkjc'),'(module create icons\n'+declarations.join('\n')+'\n)\n');
const servicePath=path.join(root,'src/service.lkjc');let service=fs.readFileSync(servicePath,'utf8');
service=service.replace(/^\s*\(route create icon-current-[^\n]+\n/gm,'\n');const end=service.lastIndexOf(')');if(end<0||!service.includes('(target create lkjsns'))throw new Error('Expected native service target.');
const routes=sources.map(s=>`  (route create icon-current-${s.name} (method GET) (path ${JSON.stringify(s.versioned)}) (port service::app::view))`).join('\n');
service=service.slice(0,end)+routes+'\n'+service.slice(end);fs.writeFileSync(servicePath,service);
console.log(`Embedded outlined lkjsns artwork and compatible content-versioned routes: ${tag}`);
