// Progressive browser conveniences. The server owns all data and authorization.
'use strict';
const cardInteractiveSelector = 'a,button,input,textarea,select,summary,video,audio,label,pre,code';
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (event.target.closest(cardInteractiveSelector)) return;
  if (window.getSelection()?.toString()) return;
  const card = event.target.closest('article.note[data-href]');
  if (card) window.location.assign(card.dataset.href);
});
// The server supplies an absolute UTC fallback; display the same instant locally when possible.
for (const time of document.querySelectorAll('time[data-local-time]')) {
  try {
    const instant = new Date(time.dateTime);
    if (!Number.isFinite(instant.getTime())) continue;
    time.textContent = new Intl.DateTimeFormat('en-US', {
      year:'numeric', month:'short', day:'numeric',
      hour:'numeric', minute:'2-digit', timeZoneName:'short'
    }).format(instant);
  } catch { /* Keep the server-rendered UTC time. */ }
}
const composer = document.querySelector('.composer');
const audience = composer?.querySelector('select[name="audience"]');
const textarea = composer?.querySelector('textarea[name="body"]');
if (textarea && document.activeElement === textarea) textarea.setSelectionRange(textarea.value.length, textarea.value.length);
if (composer && audience) {
  const key = `lkjsns:pending-audience:${composer.dataset.user}`;
  if (composer.dataset.fresh === '1' && !composer.dataset.reply) {
    try { const pending = JSON.parse(localStorage.getItem(key));
      if (pending && Date.now()-pending.at<120000 && ['members','public','link-only'].includes(pending.value)) audience.value=pending.value;
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
    const card=!link&&!event.target.closest(cardInteractiveSelector)&&!getSelection()?.toString()?event.target.closest('article.note[data-href]'):null;
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
  const composerForm = document.querySelector('.composer form');
  composerForm?.addEventListener('submit', event => {
    if (event.submitter?.name !== 'mode' || event.submitter?.value !== 'publish') return;
    const raw = composerForm.elements.namedItem('return')?.value;
    let target; try { target = raw && canonical(raw); } catch { return; }
    if (!readable(target)) return;
    const latest = load();
    const position = (Array.isArray(latest.positions) ? latest.positions : []).find(x => x.path === relative(target) && safeEntry(x));
    latest.restore = {to:relative(target), y:position?.y || 0, at:Date.now()};
    store(latest);
  });
  const state=load(),restore=state.restore;
  if(readable(current)&&safeEntry(restore)&&restore.to===relative(current)){
    delete state.restore;store(state);
    const apply=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>scrollTo({top:Math.max(0,Number(restore.y)||0),behavior:'instant'})));
    if(document.readyState==='complete')apply();else addEventListener('load',apply,{once:true});
    document.addEventListener('lkjsns:timeline-loaded',apply,{once:true});
  }
})();

// Keyboard navigation stays on native links and forms; the server still authorizes every action.
(() => {
  const preference = 'lkjsns:shortcuts-disabled';
  let prefix = 0;
  let current = null;
  const disabled = () => { try { return localStorage.getItem(preference) === '1'; } catch { return false; } };
  const editable = target => target instanceof Element &&
    !!target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
  const cards = () => [...document.querySelectorAll('article.note[data-href]')];
  const selectCard = direction => {
    const items = cards();
    if (!items.length) return;
    let index = current && items.includes(current) ? items.indexOf(current) : -1;
    index = Math.max(0, Math.min(items.length - 1, index < 0 && direction < 0 ? items.length - 1 : index + direction));
    current?.classList.remove('keyboard-current');
    current = items[index];
    current.classList.add('keyboard-current');
    current.tabIndex = -1;
    current.focus({preventScroll:true});
    current.scrollIntoView({block:'nearest',behavior:'auto'});
  };
  const follow = selector => {
    const link = document.querySelector(selector);
    if (link instanceof HTMLAnchorElement) { location.assign(link.href); return true; }
    return false;
  };
  const action = intent => {
    const form = current?.querySelector(`form:has(input[name="intent"][value="${intent}"])`);
    if (!(form instanceof HTMLFormElement)) return false;
    form.requestSubmit();
    return true;
  };
  const help = () => {
    const previous = document.querySelector('#shortcut-help');
    if (previous?.open) return;
    previous?.remove();
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = document.createElement('dialog');
    dialog.id = 'shortcut-help';
    dialog.className = 'shortcut-help';
    dialog.setAttribute('aria-labelledby','shortcut-help-title');
    const title = document.createElement('h2'); title.id = 'shortcut-help-title'; title.textContent = 'Keyboard shortcuts';
    const description = document.createElement('p');
    description.textContent = 'N: new post · /: search · J/K: move between posts · O: open · R: reply · A: Attention · B: bookmark · [ / ]: newer / older · G then H, N, B, D or P: Home, Notifications, Bookmarks, Drive or your profile · Ctrl/Cmd+Enter: submit a post';
    const label = document.createElement('label');
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = !disabled();
    label.append(checkbox,document.createTextNode(' Enable single-key shortcuts'));
    checkbox.addEventListener('change', () => { try { localStorage.setItem(preference, checkbox.checked ? '0' : '1'); } catch {} });
    const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close';
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { dialog.remove(); if (opener?.isConnected) opener.focus({preventScroll:true}); }, {once:true});
    dialog.append(title,description,label,close); document.body.append(dialog); dialog.showModal();
  };
  if (typeof HTMLDialogElement !== 'undefined' && location.pathname === '/more') {
    const lists = document.querySelectorAll('.more-group .settings-list');
    const area = lists[lists.length - 1];
    if (area) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'settings-row shortcut-help-button';
      const icon = document.createElementNS('http://www.w3.org/2000/svg','svg');
      for (const [name,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'})) icon.setAttribute(name,value);
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d','M3 7h18v10H3zM6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 13h.01M10 13h.01M13 13h.01M16 13h.01M8 15h8');
      icon.append(path);
      const text = document.createElement('span');
      const title = document.createElement('strong'); title.textContent = 'Keyboard shortcuts';
      const detail = document.createElement('small'); detail.textContent = 'View keys and preferences.';
      text.append(title,detail); button.append(icon,text); button.addEventListener('click',help); area.append(button);
    }
  }
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.repeat || event.altKey) return;
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key === 'Enter' &&
        composer && composer.contains(event.target)) {
      const button = composer.querySelector('button[name="mode"][value="publish"]');
      if (button && !button.disabled) { event.preventDefault(); button.form.requestSubmit(button); }
      return;
    }
    if (event.ctrlKey || event.metaKey || editable(event.target) || window.getSelection()?.toString()) return;
    if (event.key === '?' && typeof HTMLDialogElement !== 'undefined') { event.preventDefault(); help(); return; }
    if (disabled() || document.querySelector('dialog[open]')) return;
    const key = event.key.toLowerCase();
    if (prefix && Date.now() - prefix < 1200) {
      prefix = 0;
      const routes = {h:'/', n:'/notifications', b:'/saved', d:'/drive'};
      if (routes[key]) { event.preventDefault(); location.assign(routes[key]); return; }
      if (key === 'p' && follow('.account-identity')) { event.preventDefault(); return; }
    }
    if (key === 'g' && !event.shiftKey) { prefix = Date.now(); event.preventDefault(); return; }
    if (event.shiftKey) return;
    let handled = true;
    switch (key) {
      case 'n': handled = follow('a[href="/compose"]'); break;
      case '/': handled = follow('a[href="/search"]'); break;
      case 'j': selectCard(1); break;
      case 'k': selectCard(-1); break;
      case 'o': if (current) location.assign(current.dataset.href); else handled = false; break;
      case 'r': {
        const link = current?.querySelector('.note-actions a[href*="reply="]');
        if (link instanceof HTMLAnchorElement) location.assign(link.href); else handled = false;
        break;
      }
      case 'a': handled = action('eyes'); break;
      case 'b': handled = action('bookmark'); break;
      case '[': handled = follow('.pager a[rel="prev"], .pager a[rel="first"]'); break;
      case ']': handled = follow('.pager a[rel="next"]'); break;
      default: handled = false;
    }
    if (handled) event.preventDefault();
  });
})();

// Render the first part of a timeline immediately and complete the same stable page in the background.
(() => {
  const feed = document.querySelector('.feed[data-progressive="timeline"]');
  const link = document.querySelector('[data-load-all]');
  const current = new URL(location.href);
  if (!feed || !link || current.searchParams.has('chunk') || !/^[0-9]+$/.test(feed.dataset.anchor || '')) return;
  const status = document.querySelector('.timeline-status');
  const abort = new AbortController();
  addEventListener('pagehide', () => abort.abort(), {once:true});
  const load = async () => {
    status.textContent = 'Loading more posts…';
    try {
      for (const chunk of ['1','2']) {
        const url = new URL(current);
        url.searchParams.set('chunk',chunk);
        url.searchParams.set('snapshot',feed.dataset.anchor);
        const response = await fetch(url,{credentials:'same-origin',signal:abort.signal});
        if (!response.ok || new URL(response.url).pathname !== current.pathname) throw new Error('Timeline unavailable');
        const parsed = new DOMParser().parseFromString(await response.text(),'text/html');
        const section = parsed.querySelector('.feed[data-progressive="timeline"]');
        if (!section) throw new Error('Timeline changed');
        for (const child of section.children) {
          if (!child.matches('article.note,.conversation-pair')) continue;
          const article = child.matches('article.note') ? child : child.querySelector('article.note');
          if (article?.id && document.getElementById(article.id)) continue;
          feed.append(document.importNode(child,true));
        }
      }
      if (feed.querySelector('article.note')) feed.querySelector(':scope > .empty')?.remove();
      link.hidden = true; status.textContent = '';
      const loading = link.closest('.timeline-loading');
      if (loading) loading.hidden = true;
      document.dispatchEvent(new Event('lkjsns:timeline-loaded'));
    } catch (error) {
      if (error.name !== 'AbortError') status.textContent = 'Could not load more posts. Use the link to try again.';
    }
  };
  load();
})();

// Large post text uses native, authorized chunk transfers; the server publishes it.
(() => {
  const composer = document.querySelector('.composer[data-post-body]');
  const form = composer?.querySelector('form');
  const textarea = form?.elements.namedItem('body');
  if (!form || !(textarea instanceof HTMLTextAreaElement)) return;
  const id = form.elements.namedItem('id')?.value;
  const version = form.elements.namedItem('version')?.value;
  const csrf = form.elements.namedItem('csrf')?.value;
  const share = form.elements.namedItem('share')?.value || '';
  const blobField = form.elements.namedItem('blob');
  const loadedField = form.elements.namedItem('body-loaded');
  if (!id || !csrf || !blobField || !loadedField) return;

  const currentBlob = composer.dataset.bodyBlob || '';
  const parts = Number(composer.dataset.bodyParts || 0);
  let active = composer.dataset.activeBlob || '', activeText = null, busy = false, stageKnown = Boolean(active);
  const status = document.createElement('p');
  status.className = 'field-help post-transfer-status';
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  status.hidden = true;
  const setStatus = value => { status.textContent = value; status.hidden = !value; };
  textarea.closest('label').after(status);
  const discard = document.createElement('button');
  discard.type = 'button'; discard.className = 'subtle';
  discard.textContent = 'Discard unfinished upload'; discard.hidden = !active;
  status.after(discard);

  function endpoint(kind, blob, index) {
    const url = new URL('/post-body/' + kind, location.origin);
    url.searchParams.set('id', blob);
    if (index !== undefined) url.searchParams.set('part', String(index));
    return url;
  }
  async function send(kind, blob, body, index) {
    const response = await fetch(endpoint(kind, blob, index), {
      method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: {'X-CSRF-Token': csrf, ...(body instanceof Blob ? {'Content-Type':'application/octet-stream'} :
        body ? {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'} : {})},
      body
    });
    if (!response.ok) {
      const raw = await response.text();
      const doc = new DOMParser().parseFromString(raw, 'text/html');
      const error = new Error(doc.querySelector('[role=alert]')?.textContent?.trim().slice(0,300) ||
        'The post transfer could not be completed. Your text is still here.');
      error.status = response.status; throw error;
    }
    return response;
  }
  async function cleanup(blob) {
    for (let i = 0; i < 12; i++) {
      const response = await send('gc', blob);
      if (response.status === 204 || response.status === 202) return;
      if (response.status !== 200) throw new Error('Cleanup could not be completed.');
    }
  }
  async function cancel(blob) {
    try { await send('cancel', blob); }
    catch (error) { if (stageKnown || error.status !== 409) throw error; }
    if (stageKnown) { try { await cleanup(blob); } catch {} }
    if (active === blob) { active = ''; activeText = null; stageKnown = false; discard.hidden = true; }
  }
  discard.addEventListener('click', async () => {
    if (busy || !active) return;
    busy = true; discard.disabled = true; setStatus('Discarding unfinished upload…');
    try { await cancel(active); setStatus('Unfinished upload discarded.'); }
    catch (error) { setStatus(error.message); }
    finally { busy = false; discard.disabled = false; }
  });

  if (active) setStatus('An unfinished post upload is using Drive storage.');
  if (currentBlob) {
    textarea.disabled = true;
    const buttons = [...form.querySelectorAll('button[type=submit],button:not([type]),input[type=submit]')];
    buttons.forEach(button => { button.disabled = true; });
    setStatus('Loading the complete post…');
    (async () => {
      if (!Number.isSafeInteger(parts) || parts < 1 || parts > 514) throw new Error('The stored post could not be verified.');
      const pieces = [];
      for (let part = 0; part < parts; part++) {
        const url = new URL('/post-body/raw', location.origin);
        url.searchParams.set('note', id); url.searchParams.set('part', String(part));
        url.searchParams.set('version', version); if (share) url.searchParams.set('share', share);
        const response = await fetch(url, {credentials:'same-origin', cache:'no-store', redirect:'error'});
        if (!response.ok) throw new Error('The complete post could not be loaded. Reopen it before editing.');
        pieces.push(await response.text());
      }
      textarea.value = pieces.join(''); loadedField.value = '1'; textarea.disabled = false;
      buttons.forEach(button => { button.disabled = false; });
      setStatus(active ? 'An unfinished post upload is using Drive storage.' : '');
    })().catch(error => { setStatus(error.message); });
  }

  async function boundary(data, start) {
    let end = Math.min(start + 4194304, data.size);
    while (end < data.size && end > start) {
      const byte = new Uint8Array(await data.slice(end, end + 1).arrayBuffer())[0];
      if ((byte & 0xc0) !== 0x80) break;
      end--;
    }
    if (end <= start) throw new Error('A text boundary could not be verified.');
    return end;
  }
  function randomId() {
    return [...crypto.getRandomValues(new Uint8Array(32))].map(x => x.toString(16).padStart(2,'0')).join('');
  }

  form.addEventListener('submit', async event => {
    if (busy) { event.preventDefault(); return; }
    if (currentBlob && loadedField.value !== '1') {
      event.preventDefault(); setStatus('Wait for the complete post to load before saving.'); return;
    }
    const value = textarea.value.replace(/\r\n?/g, '\n');
    const data = new Blob([value], {type:'text/plain;charset=utf-8'});
    if (data.size <= 65536 && !currentBlob && !active) return;
    event.preventDefault();
    const submitter = event.submitter;
    const payload = new FormData(form);
    const mode = submitter?.name === 'mode' ? submitter.value :
      form.querySelector('input[type=submit][name=mode]')?.value || 'draft';
    payload.set('mode', mode);
    const buttons = [...form.querySelectorAll('button[type=submit],button:not([type]),input[type=submit]')];
    busy = true; buttons.forEach(button => { button.disabled = true; }); textarea.readOnly = true;
    try {
      if (active && activeText !== null && activeText !== value) await cancel(active);
      if (active && activeText === null) throw new Error('Discard the unfinished upload before starting another.');
      let preview = value;
      if (data.size > 65536) {
        if (!active) { active = randomId(); activeText = value; discard.hidden = false; }
        const response = await send('start', active,
          new URLSearchParams({post:id, version, size:String(data.size)}));
        stageKnown = true;
        const position = Number(await response.text());
        if (!Number.isSafeInteger(position) || position < 0 || position > 514)
          throw new Error('The saved transfer position could not be verified.');
        let start = 0, part = 0;
        while (start < data.size) {
          const end = await boundary(data, start);
          if (part >= position) {
            setStatus('Uploading post · ' + Math.floor(start / data.size * 100) + '%');
            await send('part', active, data.slice(start, end), part);
          }
          start = end; part++;
        }
        if (position > part) throw new Error('The saved transfer position no longer matches this text.');
        setStatus('Saving post…');
        preview = await (await send('finish', active)).text();
        payload.set('blob', active);
      } else {
        payload.set('blob', '');
      }
      payload.set('body', preview);
      payload.set('body-loaded', '1');
      const response = await fetch(form.action, {method:'POST', credentials:'same-origin',
        headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
        body:new URLSearchParams(payload), redirect:'follow', cache:'no-store'});
      const destination = new URL(response.url, location.href);
      if (!response.redirected || destination.origin !== location.origin || destination.pathname === '/login') {
        const raw = await response.text();
        const doc = new DOMParser().parseFromString(raw, 'text/html');
        throw new Error(doc.querySelector('[role=alert]')?.textContent?.trim().slice(0,300) ||
          'The post was not saved. Your text is still here.');
      }
      const oldBlob = currentBlob;
      active = ''; activeText = null; discard.hidden = true;
      if (oldBlob) { try { await cleanup(oldBlob); } catch {} }
      location.assign(destination.href);
    } catch (error) {
      const message = error.message || 'The connection was interrupted.';
      setStatus(/text is still here/i.test(message) ? message : message + ' Your text is still here.');
    } finally {
      busy = false; textarea.readOnly = false; buttons.forEach(button => { button.disabled = false; });
    }
  });
})();

// Search long post bodies in bounded pages; the ordinary link works without script.
(() => {
  const box = document.querySelector('[data-long-search]');
  const link = box?.querySelector('a[data-long-search-link]');
  const results = box?.querySelector('[data-long-search-results]');
  const status = box?.querySelector('[role=status]');
  if (!link || !results || !status) return;
  const setStatus = value => { status.textContent = value; status.hidden = !value; };
  let active = false;
  link.addEventListener('click', async event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault(); if (active) return;
    active = true; link.setAttribute('aria-disabled','true'); setStatus('Searching long posts…');
    try {
      for (let pages = 0; pages < 4; pages++) {
        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin || url.pathname !== '/search-long') throw new Error('The search link is invalid.');
        const response = await fetch(url, {credentials:'same-origin', cache:'no-store', redirect:'error'});
        if (!response.ok) throw new Error('The search could not continue. Use the link to retry.');
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const feed = doc.querySelector('.long-post-search .feed');
        const next = doc.querySelector('.long-post-search a[rel=next]');
        const items = feed ? [...feed.children].filter(item => item.matches('article.note,.conversation-pair')) : [];
        for (const item of items) results.append(document.importNode(item, true));
        if (!next) { link.hidden = true; setStatus('Finished searching long posts.'); return; }
        const nextUrl = new URL(next.getAttribute('href'), location.origin);
        if (nextUrl.origin !== location.origin || nextUrl.pathname !== '/search-long') throw new Error('The search continuation is invalid.');
        link.href = nextUrl.href; link.textContent = 'Continue searching long posts';
        if (items.length) { setStatus(''); return; }
      }
      setStatus('More long posts remain to search.');
    } catch (error) {
      setStatus(error.message || 'The search could not continue. Use the link to retry.');
    } finally {
      active = false; link.removeAttribute('aria-disabled');
    }
  });
})();
