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
    dialog.addEventListener('close', () => { dialog.remove(); if (!document.querySelector('#shortcut-help[open]')) document.querySelector('.shortcut-help-button')?.focus(); }, {once:true});
    dialog.append(title,description,label,close); document.body.append(dialog); dialog.showModal();
  };
  if (typeof HTMLDialogElement !== 'undefined') {
    const area = document.querySelector('.sidebar .account');
    if (area) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'shortcut-help-button';
      button.textContent = 'Keyboard shortcuts'; button.addEventListener('click',help); area.append(button);
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
      document.dispatchEvent(new Event('lkjsns:timeline-loaded'));
    } catch (error) {
      if (error.name !== 'AbortError') status.textContent = 'Could not load more posts. Use the link to try again.';
    }
  };
  load();
})();
