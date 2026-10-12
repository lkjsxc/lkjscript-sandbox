// Optional development-only rasterization of the checked-in lkjsns mark.
// The native app embeds the reviewed outputs; it never launches a browser.
const fs=require('node:fs'),path=require('node:path');
const zlib=require('node:zlib');
const {chromium}=require(process.env.LKJSNS_PLAYWRIGHT||'playwright');
function crc32(bytes){let c=0xffffffff;for(const byte of bytes){c^=byte;for(let bit=0;bit<8;bit++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),head=Buffer.alloc(4),crc=Buffer.alloc(4);head.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([head,name,data,crc]);}
function palettePNG(rgba,size){
 const shades=[];
 for(const base of [[11,16,32],[37,137,202],[81,170,215],[82,111,213],[131,136,224]]){
  for(let i=0;i<16;i++)shades.push(base.map(v=>Math.round(v+(255-v)*i/15)));
 }
 const palette=Buffer.from(shades.flat());
 const rows=Buffer.alloc(size*(size+1));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const at=(y*size+x)*4;let best=0,score=Infinity;
  for(let i=0;i<shades.length;i++){
   const distance=shades[i].reduce((n,v,k)=>n+(rgba[at+k]-v)**2,0);
   if(distance<score){score=distance;best=i;}
  }
  rows[y*(size+1)+1+x]=best;
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=3;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('PLTE',palette),chunk('IDAT',zlib.deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
(async()=>{const root=path.resolve(__dirname,'../../web');const svg=fs.readFileSync(path.join(root,'favicon.svg'),'utf8');
 const browser=await chromium.launch({headless:true});try{const p=await browser.newPage();const images=[];
 for(const size of [16,32,180]){
  const pixels=await p.evaluate(async({svg,size})=>{const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await img.decode();const c=document.createElement('canvas');c.width=c.height=size;c.getContext('2d').drawImage(img,0,0,size,size);return Array.from(c.getContext('2d').getImageData(0,0,size,size).data);},{svg,size});
  const data=palettePNG(pixels,size);if(size===32)fs.writeFileSync(path.join(root,'favicon-32.png'),data);if(size===180)fs.writeFileSync(path.join(root,'apple-touch-icon.png'),data);if(size<=32)images.push({size,data});
 }
 const directory=Buffer.alloc(6+16*images.length);directory.writeUInt16LE(1,2);directory.writeUInt16LE(images.length,4);let offset=directory.length;
 images.forEach(({size,data},i)=>{const at=6+16*i;directory[at]=directory[at+1]=size;directory.writeUInt16LE(1,at+4);directory.writeUInt16LE(32,at+6);directory.writeUInt32LE(data.length,at+8);directory.writeUInt32LE(offset,at+12);offset+=data.length;});
 fs.writeFileSync(path.join(root,'favicon.ico'),Buffer.concat([directory,...images.map(i=>i.data)]));
 console.log('Rendered 16/32px ICO, 32px PNG and 180px touch icon from the profile-derived lkjsns mark.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
