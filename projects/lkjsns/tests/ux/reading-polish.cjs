// Synthetic regression coverage for direct replies, absolute time and neutral reading.
'use strict';
const {base,output,path,assert,form,click,goto,pass,session,submit,createPost,shortPostId,load}=require('./support.cjs');
const engine=process.env.LKJSNS_POLISH_BROWSER||'chromium';
const browserType=require(process.env.LKJSNS_PLAYWRIGHT||'playwright')[engine];
assert(browserType,'Unknown browser engine');

(async()=>{
 const browser=await browserType.launch({headless:true});
 try {
  const owner=await session(browser,'owner',{timezoneId:'Asia/Tokyo'});
  const member=await session(browser,'member');
  const p=await owner.newPage(),m=await member.newPage();
  p.setDefaultTimeout(30000);m.setDefaultTimeout(30000);
  const parent=await createPost(p,'Reading polish parent','public');
  await goto(m,'/compose?reply='+parent);
  await m.locator('[name=body]').fill('Reading polish child');
  const child=shortPostId(await m.locator('[name=id]').inputValue());
  await submit(m,'note',{body:'Reading polish child',audience:'public',mode:'publish'});
  await goto(p,'/'+child);
  await click(p,form(p,'bookmark').locator('button'));

  // Each visible Reply action goes directly to the corresponding composer.
  for(const route of ['/','/@testmember','/search?q=Reading%20polish%20child','/saved']){
   await goto(p,route);
   const action=p.locator('#post-'+child+' .note-actions').getByRole('link',{name:/^Reply/});
   await action.waitFor();
   const href=new URL(await action.getAttribute('href'),base);
   assert.equal(href.pathname,'/compose',route);assert.equal(href.searchParams.get('reply'),child,route);
   await click(p,action);
   assert.equal(new URL(p.url()).pathname,'/compose');
   assert.equal(await p.locator('[name=reply]').inputValue(),child);
   assert.equal(await p.locator('textarea[name=body]').isVisible(),true);
  }
  await goto(p,'/'+parent);
  const nestedAction=p.locator('.reply-list #post-'+child+' .note-actions').getByRole('link',{name:/^Reply/});
  await click(p,nestedAction);
  assert.equal(new URL(p.url()).pathname,'/compose');
  assert.equal(await p.locator('[name=reply]').inputValue(),child);
  await p.locator('[name=body]').fill('Reading polish nested reply');
  const nested=shortPostId(await p.locator('[name=id]').inputValue());
  await submit(p,'note',{body:'Reading polish nested reply',audience:'public',mode:'publish'});
  pass('Reply links from feeds, search, bookmarks and nested threads open the intended composer');

  await goto(p,'/search?q=Reading%20polish%20child');
  const prior=new URL(p.url()).pathname+new URL(p.url()).search;
  await click(p,p.locator('#post-'+child+' .note-actions').getByRole('link',{name:/^Reply/}));
  assert.equal(await p.locator('[name=return]').inputValue(),prior);
  await p.locator('[name=body]').fill('Return to search after reply');
  await click(p,p.getByRole('button',{name:'Attach file',exact:true}));
  await click(p,p.getByRole('link',{name:'Back to writing',exact:true}));
  await click(p,p.getByRole('button',{name:'Post',exact:true}));
  assert.equal(new URL(p.url()).pathname+new URL(p.url()).search,prior);
  pass('Reply publishing restores the exact search after attachment selection');

  await goto(p,'/');
  await p.keyboard.press('j');
  const selected=p.locator('article.note.keyboard-current');
  assert.equal(await selected.count(),1);
  const selectedHref=new URL(await selected.locator('.note-actions').getByRole('link',{name:/^Reply/}).getAttribute('href'),base);
  await p.keyboard.press('r');await p.waitForURL('**/compose?**');
  assert.equal(new URL(p.url()).searchParams.get('reply'),selectedHref.searchParams.get('reply'));
  pass('The reply shortcut uses the selected card’s native composer link');

  // Detail pages show absolute times for the parent, main post and child replies.
  await goto(p,'/'+child);
  for(const selector of ['.note-detail .parent-card time[data-local-time]','.note-detail article.note time[data-local-time]','.reply-list #post-'+nested+' time[data-local-time]']){
   const time=p.locator(selector);assert.equal(await time.count(),1,selector);
   const details=await time.evaluate(el=>({
    iso:el.dateTime, displayed:el.textContent,
    expected:new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(el.dateTime))
   }));
   assert.match(details.iso,/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
   assert.equal(details.displayed,details.expected);
   assert(!/ago|Just now/.test(details.displayed));
  }
  await p.setViewportSize({width:320,height:900});
  await p.evaluate(()=>{document.documentElement.style.fontSize='200%'});
  const timeLayout=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(timeLayout.scroll<=timeLayout.width+1,JSON.stringify(timeLayout));
  await goto(p,'/');
  assert.equal(await p.locator('#post-'+child+' time[data-local-time]').count(),0);
  pass('Post details show local absolute times without overflow at enlarged text sizes');

  for(const scheme of ['light','dark']){
   await p.setViewportSize({width:390,height:844});await p.emulateMedia({colorScheme:scheme});
   await goto(p,'/'+child);
   await p.mouse.move(0,0);
   const preview=p.locator('.note-detail .parent-card');
   const before=await preview.evaluate(el=>getComputedStyle(el).backgroundColor);
   await preview.hover();await p.waitForTimeout(150);
   const after=await preview.evaluate(el=>getComputedStyle(el).backgroundColor);
   assert.notEqual(before,after,scheme+' parent hover');
   await p.screenshot({path:path.join(output,'reading-polish-'+scheme+'.png')});
   await preview.focus();
   const focus=await preview.evaluate(el=>({width:parseFloat(getComputedStyle(el).outlineWidth),style:getComputedStyle(el).outlineStyle}));
   assert(focus.width>=2&&focus.style!=='none',JSON.stringify({scheme,focus}));
  }
  await p.emulateMedia({forcedColors:'active'});await goto(p,'/'+child);
  const forced=p.locator('.note-detail .parent-card');await forced.focus();
  const forcedFocus=await forced.evaluate(el=>({width:parseFloat(getComputedStyle(el).outlineWidth),style:getComputedStyle(el).outlineStyle}));
  assert(forcedFocus.width>=2&&forcedFocus.style!=='none',JSON.stringify(forcedFocus));
  await p.emulateMedia({forcedColors:'none'});
  pass('Reply-parent links visibly respond to hover and keyboard focus in both themes and forced colours');

  // Measure the gap from the controls to actual neighbouring content.
  for(const width of [320,390,1280])for(const scheme of ['light','dark']){
   await p.setViewportSize({width,height:900});await p.emulateMedia({colorScheme:scheme});
   await goto(p,'/?cursor=0&trail=_');
   if(width===320)await p.evaluate(()=>{document.documentElement.style.fontSize='200%'});
   const gaps=await p.evaluate(()=>{
    const navs=[...document.querySelectorAll('main>.pager')];
    const feed=[...document.querySelectorAll('main>.feed')].at(-1).getBoundingClientRect();
    const tabs=document.querySelector('.tabs[aria-label="Feed"]').getBoundingClientRect();
    const top=navs[0].querySelector('.button').getBoundingClientRect();
    const bottom=navs.at(-1).querySelector('.button').getBoundingClientRect();
    return {tabsToTop:top.top-tabs.bottom,topToFeed:feed.top-top.bottom,feedToBottom:bottom.top-feed.bottom,
      topHeight:top.height,bottomHeight:bottom.height,width:innerWidth,scroll:document.documentElement.scrollWidth};
   });
   assert(gaps.tabsToTop>=8&&gaps.topToFeed>=8&&gaps.feedToBottom>=8,JSON.stringify({width,scheme,gaps}));
   assert(gaps.topHeight>=44&&gaps.bottomHeight>=44&&gaps.scroll<=gaps.width+1,JSON.stringify({width,scheme,gaps}));
  }
  pass('Pagination keeps breathing room and usable targets at narrow widths and enlarged text');

  for(const scheme of ['light','dark']){
   await p.emulateMedia({colorScheme:scheme});await goto(p,'/settings');
   const colors=await p.evaluate(()=>{
    const s=getComputedStyle(document.documentElement);
    return Object.fromEntries(['bg','surface','ink','muted','line','control-line','accent','on-accent','tint','danger','danger-bg'].map(k=>[k,s.getPropertyValue('--'+k).trim()]));
   });
   const rgb=value=>{
    const hex=value.slice(1);assert(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value),value);
    const long=hex.length===3?[...hex].map(x=>x+x).join(''):hex;
    return [0,2,4].map(i=>parseInt(long.slice(i,i+2),16));
   };
   const lum=value=>{const a=rgb(value).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*a[0]+.7152*a[1]+.0722*a[2]};
   const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
   for(const value of Object.values(colors)){const [r,g,b]=rgb(value);assert.equal(r,g,JSON.stringify(colors));assert.equal(g,b,JSON.stringify(colors));}
   for(const text of ['ink','muted','accent'])assert(contrast(colors[text],colors.surface)>=4.5,JSON.stringify({scheme,text,colors}));
   assert(contrast(colors['on-accent'],colors.accent)>=4.5,JSON.stringify({scheme,colors}));
   assert(contrast(colors['control-line'],colors.surface)>=3,JSON.stringify({scheme,colors}));
   const signout=p.getByRole('button',{name:'Sign out',exact:true});
   assert.equal(await signout.count(),1);
   assert.equal(await signout.getAttribute('aria-describedby'),'signout-description');
   assert((await signout.boundingBox()).height>=44);
  }
  const avatar=await owner.request.get(base+'/avatar?user=neutralmissing');
  assert.equal(avatar.status(),200);assert(avatar.headers()['content-type'].startsWith('image/svg+xml'));
  const fills=[...(await avatar.text()).matchAll(/fill="#([0-9a-f]{6})"/ig)].map(match=>match[1]);
  assert(fills.length>=2);
  for(const fill of fills)assert(fill.slice(0,2)===fill.slice(2,4)&&fill.slice(2,4)===fill.slice(4,6),fill);
  pass('Light and dark interface colours and default avatars are neutral; sign-out is a clear settings action');

  const nojs=await session(browser,'owner',{javaScriptEnabled:false,timezoneId:'America/New_York'});
  const n=await nojs.newPage();await goto(n,'/'+child);
  for(const time of await n.locator('.note-detail time[data-local-time],.reply-list time[data-local-time]').all()){
   const iso=await time.getAttribute('datetime');
   assert.equal(await time.innerText(),iso.slice(0,10)+' '+iso.slice(11,16)+' UTC');
  }
  await goto(n,'/');
  await click(n,n.locator('#post-'+child+' .note-actions').getByRole('link',{name:/^Reply/}));
  assert.equal(await n.locator('[name=reply]').inputValue(),child);
  await nojs.close();
  pass('Absolute UTC timestamps and direct Reply links work without JavaScript');

  // Use an independent synthetic sign-in so the shared test session survives sign-out.
  const signingOut=await browser.newContext({locale:'en-US',javaScriptEnabled:false});
  const s=await signingOut.newPage(),creds=load('accounts').other;
  await goto(s,'/login');await s.locator('[name=handle]').fill(creds.handle);
  await s.locator('[name=password]').fill(creds.password);
  await click(s,form(s,'login').locator('button'));
  await goto(s,'/settings');
  await click(s,s.getByRole('button',{name:'Sign out',exact:true}));
  assert.equal(new URL(s.url()).pathname,'/login');
  const privateResponse=await signingOut.request.get(base+'/settings',{maxRedirects:0});
  assert.equal(privateResponse.status(),303);assert.equal(privateResponse.headers().location,'/login');
  await signingOut.close();
  pass('Sign-out remains a native CSRF-protected action and ends the current session');
  await owner.close();await member.close();
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
