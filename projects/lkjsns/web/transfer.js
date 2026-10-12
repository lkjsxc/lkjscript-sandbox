// Transfer bytes only. The native server owns identity, quotas, storage and publication.
'use strict';
(() => {
 const LIMIT=256*1024*1024, CHUNK=4*1024*1024, RANGE=8*1024*1024, DIRECT=32*1024*1024;
 const upload=document.querySelector('form[enctype="multipart/form-data"]');
 function feedback(scope) {
  let progress=scope.querySelector('.transfer-progress'),status=scope.querySelector('.transfer-status');
  if(!progress){progress=document.createElement('progress');progress.className='transfer-progress';scope.append(progress);}
  if(!status){status=document.createElement('p');status.className='transfer-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');scope.append(status);}
  progress.hidden=false;return {progress,status};
 }
 function failure(body, fallback) {
  try {const doc=new DOMParser().parseFromString(body,'text/html');
   return doc.querySelector('[role=alert]')?.textContent?.trim().slice(0,300)||fallback;
  }catch{return fallback;}
 }
 if(upload) {
  const input=upload.querySelector('input[type=file]'),button=upload.querySelector('button[type=submit],button:not([type])');
  const pause=document.createElement('button');pause.type='button';pause.textContent='Pause';pause.hidden=true;button.after(pause);
  let xhr,active=false,started=false,paused=false,file;
  function endpoint(action,index) {const url=new URL(upload.action,location.href);url.pathname='/upload/'+action;
   url.searchParams.delete('folder');if(index!==undefined)url.searchParams.set('part',String(index));return url;}
  function send(action,body,type,index,progress) {
   return new Promise((resolve,reject)=>{
    xhr=new XMLHttpRequest();xhr.open('POST',endpoint(action,index));xhr.timeout=120000;
    if(type)xhr.setRequestHeader('Content-Type',type);
    xhr.upload.onprogress=progress||null;
    xhr.onload=()=>xhr.status>=200&&xhr.status<300 ? resolve({body:xhr.responseText,url:xhr.responseURL,status:xhr.status}) :
     reject(new Error(failure(xhr.responseText,`The server could not accept this upload (${xhr.status}).`)));
    xhr.onerror=()=>reject(new Error('The connection was interrupted. Resume to keep sending this file.'));
    xhr.ontimeout=()=>reject(new Error('The connection timed out. Resume to keep sending this file.'));
    xhr.onabort=()=>reject(new Error('Upload paused. Resume to continue.'));xhr.send(body);
   });
  }
  input.addEventListener('change',()=>{input.setCustomValidity(input.files[0]?.size>LIMIT?'Choose a file up to 256 MiB.':'');});
  pause.addEventListener('click',()=>{paused=true;xhr?.abort();});
  window.addEventListener('beforeunload',event=>{if(active){event.preventDefault();event.returnValue='';}});
  upload.addEventListener('submit',async event=>{
   if(!input.files.length)return;
   file=file||input.files[0];
   if(file.size===0)return; // The ordinary multipart path supports an empty file.
   event.preventDefault();if(active)return;
   if(file.size>LIMIT){input.setCustomValidity('Choose a file up to 256 MiB.');input.reportValidity();return;}
   const {progress,status}=feedback(upload);active=true;paused=false;button.disabled=true;input.disabled=true;pause.hidden=false;
   progress.max=file.size;status.textContent=started?'Resuming upload…':'Preparing upload…';
   try {
    const init=await send('start',new URLSearchParams({name:file.name,size:String(file.size)}),'application/x-www-form-urlencoded; charset=UTF-8');
    started=true;const next=Number(init.body),count=Math.ceil(file.size/CHUNK);
    if(!Number.isInteger(next)||next<0||next>count)throw new Error('The upload position could not be verified. Open Drive before retrying.');
    progress.value=Math.min(next*CHUNK,file.size);
    for(let index=next;index<count;index++) {
     if(paused)throw new Error('Upload paused. Resume to continue.');
     const start=index*CHUNK,end=Math.min(start+CHUNK,file.size);
     status.textContent=`Uploading · ${Math.floor(start/file.size*100)}%`;
     const part=await send('part',file.slice(start,end),'application/octet-stream',index,event=>{
      if(event.lengthComputable)progress.value=Math.min(file.size,start+event.loaded);
     });
     if(part.status!==204)throw new Error('The saved upload part could not be verified. Resume to check it.');
     progress.value=end;
    }
    if(paused)throw new Error('Upload paused. Resume to continue.');
    status.textContent='Saving file…';pause.hidden=true;
    const done=await send('finish',null);const destination=new URL(done.url);
    if(destination.origin!==location.origin||!['/file','/compose','/pick'].includes(destination.pathname))
     throw new Error('Check Drive before repeating this upload.');
    active=false;location.assign(destination.href);
   }catch(error){status.textContent=error.message;button.textContent=started?'Resume upload':'Retry upload';}
   finally{active=false;button.disabled=false;pause.hidden=true;}
  });
 }
 document.addEventListener('click',async event=>{
  const link=event.target.closest('a[data-download]');
  if(!link||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
  const size=Number(link.dataset.size);if(!Number.isSafeInteger(size)||size<=DIRECT||size>LIMIT)return;
  event.preventDefault();if(link.getAttribute('aria-busy')==='true')return;
  const url=new URL(link.href);if(url.origin!==location.origin||url.pathname!=='/media')return;
  const scope=link.closest('.download-workspace,.media-original,.file-detail')||link.parentElement;
  const {progress,status}=feedback(scope);progress.max=size;progress.value=0;link.setAttribute('aria-busy','true');
  let writer;
  try {
   if(window.showSaveFilePicker){const handle=await window.showSaveFilePicker({suggestedName:link.dataset.name||'download'});writer=await handle.createWritable();}
   const pieces=[];
   for(let start=0;start<size;) {
    const end=Math.min(start+RANGE,size)-1;
    const response=await fetch(url,{headers:{Range:`bytes=${start}-${end}`},cache:'no-store',redirect:'error'});
    if(response.status!==206||response.headers.get('content-range')!==`bytes ${start}-${end}/${size}`)
     throw new Error('The file is unavailable or changed. The download was not completed.');
    const bytes=await response.arrayBuffer();if(bytes.byteLength!==end-start+1)throw new Error('The download was interrupted. Try again.');
    if(writer)await writer.write(bytes);else pieces.push(bytes);
    start=end+1;progress.value=start;status.textContent=`Downloading · ${Math.floor(start/size*100)}%`;
   }
   if(writer){await writer.close();writer=null;}
   else {const blob=new Blob(pieces,{type:'application/octet-stream'});if(blob.size!==size)throw new Error('The download size could not be verified.');
    const objectURL=URL.createObjectURL(blob),a=document.createElement('a');a.href=objectURL;a.download=link.dataset.name||'download';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(objectURL),60000);
   }
   status.textContent='Download complete.';
  }catch(error){if(writer)await writer.abort().catch(()=>{});status.textContent=error.name==='AbortError'?'Download cancelled.':error.message;}
  finally{link.removeAttribute('aria-busy');}
 });
})();
