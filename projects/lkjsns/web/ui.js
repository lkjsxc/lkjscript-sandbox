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
  if (!['post','file'].includes(kind) || !/^[a-f0-9]{64}$/.test(id || '')) return;
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
