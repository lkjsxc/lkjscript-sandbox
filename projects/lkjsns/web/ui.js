// Progressive browser conveniences. The server owns all data and authorization.
'use strict';
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (event.target.closest('a,button,input,textarea,select,summary,video,audio,label')) return;
  if (window.getSelection()?.toString()) return;
  const card = event.target.closest('article.note[data-href]');
  if (card) window.location.assign(card.dataset.href);
});
const composer = document.querySelector('.composer');
const audience = composer?.querySelector('select[name="audience"]');
const textarea = composer?.querySelector('textarea[name="body"]');
if (textarea && document.activeElement === textarea) textarea.setSelectionRange(textarea.value.length, textarea.value.length);
if (composer && audience) {
  const key = `lkjsns:pending-audience:${composer.dataset.user}`;
  if (composer.dataset.fresh === '1' && !composer.dataset.reply) {
    try { const pending = JSON.parse(localStorage.getItem(key));
      if (pending && Date.now()-pending.at<120000 && ['members','public'].includes(pending.value)) audience.value=pending.value;
    } catch {}
  }
  audience.addEventListener('change', () => {
    const pending = {value:audience.value,at:Date.now()};
    try { localStorage.setItem(key,JSON.stringify(pending)); } catch {}
    const csrf = composer.querySelector('input[name="csrf"]').value;
    fetch('/action', {method:'POST', credentials:'same-origin', keepalive:true, headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
      body:new URLSearchParams({intent:'audience',csrf,audience:pending.value})}).then(response => {
      if(response.status!==204)return;
      try { if(localStorage.getItem(key)===JSON.stringify(pending))localStorage.removeItem(key); } catch {}
    }).catch(() => {});
  });
}

// Confirmation is a presentation convenience; the native POST rechecks ownership,
// CSRF, exact version and current references. No delete is triggered by a GET.
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="/delete?"]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  if (typeof HTMLDialogElement === 'undefined') return;
  const target = new URL(link.href);
  if (target.origin !== location.origin || target.pathname !== '/delete') return;
  const kind = target.searchParams.get('kind'), id = target.searchParams.get('id');
  if (!['post','file'].includes(kind) || !(kind === 'post' ? /^(?:[0-9abcdefghjkmnpqrstvwxyz]{16}|[a-f0-9]{64})$/ : /^[a-f0-9]{64}$/).test(id || '')) return;
  const source = document.querySelector(`form input[name="intent"][value="${kind === 'post' ? 'note' : 'file'}"]`)?.form;
  if (!source || source.elements.namedItem('id')?.value !== id) return;
  const csrf = source.elements.namedItem('csrf')?.value, version = source.elements.namedItem('version')?.value;
  if (!csrf || !/^[0-9]+$/.test(version || '')) return;
  event.preventDefault();
  const dialog = document.createElement('dialog'); dialog.className = 'delete-confirm';
  const heading = document.createElement('h2'); heading.id = 'delete-confirm-title'; heading.textContent = `Delete this ${kind}?`;
  dialog.setAttribute('aria-labelledby', heading.id);
  const description = document.createElement('p'); description.textContent = kind === 'post'
    ? 'This cannot be undone. Attached files will stay in Drive.' : 'This cannot be undone.';
  const form = document.createElement('form'); form.method = 'post'; form.action = '/action';
  const values = {intent:kind === 'post' ? 'delete-note' : 'delete-file',csrf,id,version,confirm:'delete'};
  if (kind === 'file') values.draft = source.elements.namedItem('draft')?.value || '';
  for (const [name,value] of Object.entries(values)) {
    const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value; form.append(input);
  }
  const actions = document.createElement('div'); actions.className = 'row end';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel'; cancel.autofocus = true;
  const remove = document.createElement('button'); remove.type = 'submit'; remove.className = 'danger'; remove.textContent = `Delete ${kind}`;
  cancel.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {dialog.remove();link.focus();}, {once:true});
  actions.append(cancel,remove); form.append(actions); dialog.append(heading,description,form); document.body.append(dialog); dialog.showModal();
});

// Reading history is not pagination. Store only same-origin destinations and
// scroll offsets, never post bodies, credentials, or unrestricted return URLs.
(() => {
  const key = 'lkjsns:reading:v1';
  const shortId = /^[0-9abcdefghjkmnpqrstvwxyz]{16}$/;
  const longId = /^[a-f0-9]{64}$/;
  const compact = id => {
    if (shortId.test(id)) return id;
    if (!longId.test(id)) return id;
    const alphabet = '0123456789abcdefghjkmnpqrstvwxyz';
    let n = BigInt('0x' + id.slice(0,20)), text = '';
    for (let i=0;i<16;i++) {text=alphabet[Number(n&31n)]+text;n>>=5n;}
    return text;
  };
  const canonical = input => {
    const url = new URL(input,location.href);
    if (url.origin!==location.origin || url.username || url.password || url.href.length>4096) return null;
    if (url.pathname==='/profile' && /^[a-z0-9_-]{3,24}$/.test(url.searchParams.get('user')||'')) {
      url.pathname='/@'+url.searchParams.get('user');url.searchParams.delete('user');
    }
    if (url.pathname==='/note' && (shortId.test(url.searchParams.get('id')||'') || longId.test(url.searchParams.get('id')||''))) {
      url.pathname='/'+compact(url.searchParams.get('id'));url.searchParams.delete('id');
    }
    return url;
  };
  const readable = url => url && (['/','/saved','/search','/notifications','/people','/drive','/attention','/more'].includes(url.pathname)
    || /^\/@[a-z0-9_-]{3,24}(?:\/attention\/(?:to|from))?$/.test(url.pathname)
    || shortId.test(url.pathname.slice(1)) || longId.test(url.pathname.slice(1)));
  const relative = url => url.pathname+url.search+url.hash;
  const current = canonical(location.href);
  const load = () => {try {const value=JSON.parse(sessionStorage.getItem(key));return value&&typeof value==='object'?value:{};}catch{return {};}};
  const store = value => {try {sessionStorage.setItem(key,JSON.stringify(value));}catch{}};
  const safeEntry = entry => entry && Number.isFinite(entry.at) && Date.now()-entry.at>=0 && Date.now()-entry.at<1800000;
  const rememberPosition = () => {
    if (!readable(current)) return;
    const state=load();const positions=Array.isArray(state.positions)?state.positions:[];
    state.positions=[...positions.filter(x=>x.path!==relative(current)).slice(-23),{path:relative(current),y:scrollY,at:Date.now()}];store(state);
  };
  addEventListener('pagehide',rememberPosition);
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||!readable(current))return;
    const link=event.target.closest('a[href]');
    const card=!link&&!event.target.closest('button,input,textarea,select,summary,video,audio,label')&&!getSelection()?.toString()?event.target.closest('article.note[data-href]'):null;
    if(!link&&!card || link?.hasAttribute('data-post-back') || link?.target==='_blank')return;
    let target;try{target=canonical(link?.href||card.dataset.href);}catch{return;}
    if(!readable(target)||relative(target)===relative(current))return;
    rememberPosition();const state=load();state.departure={from:relative(current),to:relative(target),y:scrollY,length:history.length,at:Date.now()};store(state);
  },true);
  document.addEventListener('submit',event=>{
    if(event.target.elements?.namedItem('intent')?.value==='logout'){try{sessionStorage.removeItem(key);}catch{}}
  });
  const back=document.querySelector('[data-post-back]');
  let referrer=null;try{if(document.referrer)referrer=canonical(document.referrer);}catch{}
  if(back){
    const state=load(),departure=state.departure;const prior=Array.isArray(state.backs)?state.backs:[];
    let selected=null;
    if(safeEntry(departure)&&referrer&&canonical(departure.to)?.pathname===current.pathname&&readable(canonical(departure.from))&&relative(canonical(departure.from))!==relative(current)) {
      selected={...departure,path:current.pathname,href:departure.from,expectedLength:departure.length+1};delete state.departure;
    }else if(referrer && (referrer.pathname===current.pathname||referrer.pathname===current.pathname+'/edit'||referrer.pathname==='/action')){
      selected=prior.find(x=>x.path===current.pathname&&safeEntry(x)&&readable(canonical(x.href)));
    }
    if(!selected){const href=canonical(back.getAttribute('href'));if(readable(href)){
      const position=(Array.isArray(state.positions)?state.positions:[]).find(x=>x.path===relative(href)&&safeEntry(x));
      selected={path:current.pathname,href:relative(href),y:position?.y||0,at:Date.now(),expectedLength:-1};
    }}
    if(selected){back.href=selected.href;state.backs=[...prior.filter(x=>x.path!==current.pathname).slice(-23),selected];store(state);
      back.addEventListener('click',event=>{
        if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return;
        const target=canonical(back.href);if(!readable(target)||target.pathname===current.pathname&&target.search===current.search)return;
        event.preventDefault();const latest=load();delete latest.departure;
        latest.restore={to:relative(target),y:Math.max(0,Number(selected.y)||0),at:Date.now()};store(latest);
        if(referrer&&relative(referrer)===relative(target)&&history.length===selected.expectedLength&&history.length>1)history.back();
        else location.assign(relative(target));
      });
    }
  }
  const state=load(),restore=state.restore;
  if(readable(current)&&safeEntry(restore)&&restore.to===relative(current)){
    delete state.restore;store(state);
    const apply=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>scrollTo({top:Math.max(0,Number(restore.y)||0),behavior:'instant'})));
    if(document.readyState==='complete')apply();else addEventListener('load',apply,{once:true});
  }
})();
