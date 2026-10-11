// Synthetic accounts on loopback only. No external API or production data.
const {chromium,root,fixture,base,output}=require('./support.cjs');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const results = [];
function pass(name) { results.push(name); console.log('PASS', name); }
const form = (page, intent) => page.locator('form').filter({ has: page.locator(`input[name="intent"][value="${intent}"]`) });
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const ctx = await browser.newContext({locale:'en-US', viewport:{width:1440,height:1000}});
    const p = await ctx.newPage();
    p.setDefaultTimeout(15000);
    const errors=[]; p.on('pageerror',e=>errors.push(e.message));
    for (const route of ['/', '/login', '/join', '/about']) {
      const r=await p.goto(base+route);
      assert.equal(r.status(),200,route);
      assert.equal(await p.locator('html').getAttribute('lang'),'en');
      assert(!/[\u3040-\u30ff\u3400-\u9fff]/u.test(await p.locator('body').innerText()),route);
      pass('English guest page '+route);
    }
    const privateRoutes=['/compose','/drive','/drafts','/settings','/admin','/saved','/notifications'];
    for(const route of privateRoutes){const r=await ctx.request.get(base+route,{maxRedirects:0});assert.equal(r.status(),303);assert.equal(r.headers().location,'/login');}
    pass('Anonymous private-page admission');
    const credsPath=path.join(fixture,'test-accounts.json');
    let creds;
    if(fs.existsSync(credsPath)){
      creds=JSON.parse(fs.readFileSync(credsPath));
      await p.goto(base+'/login');
      await p.locator('[name=handle]').fill(creds.owner.handle);
      await p.locator('[name=password]').fill(creds.owner.password);
      await Promise.all([p.waitForNavigation(),form(p,'login').locator('button').click()]);
    } else {
      creds={owner:{handle:'testowner',password:crypto.randomBytes(24).toString('hex')}};
      await p.goto(base+'/join');
      await p.locator('[name=handle]').fill(creds.owner.handle);
      await p.locator('[name=password]').fill(creds.owner.password);
      await p.locator('[name=confirm]').fill(creds.owner.password);
      await p.locator('[name=invite]').fill(fs.readFileSync(path.join(fixture,'bootstrap.secret'),'utf8').trim());
      await Promise.all([p.waitForNavigation(),form(p,'join').locator('button').click()]);
      assert(!new URL(p.url()).pathname.includes('action'),await p.locator('body').innerText());
      fs.writeFileSync(credsPath,JSON.stringify(creds),{mode:0o600});
      pass('Bootstrap registration through real browser form');
    }
    await p.goto(base+'/settings');
    assert.equal(await p.locator('h1').innerText(),'Account');
    await p.locator('[name=display]').fill('Alex Morgan');
    await p.locator('[name=bio]').fill('Building a small corner of the web.');
    await Promise.all([p.waitForNavigation(),form(p,'profile').locator('button').click()]);
    assert.equal(await p.locator('[name=display]').inputValue(),'Alex Morgan');
    pass('Profile save round trip');
    await p.goto(base+'/admin');
    assert.equal(await p.locator('h1').innerText(),'Invitations');
    pass('First account has native administrator role');
    const issue=form(p,'invite');
    await issue.locator('[name=label]').fill('Acceptance member');
    await issue.locator('[name=uses]').fill('1');
    await issue.locator('[name=days]').fill('1');
    await Promise.all([p.waitForNavigation(),issue.locator('button').click()]);
    const invite=await p.locator('.copy-value').innerText();
    const code=new URL(invite,base).searchParams.get('invite');
    assert(code,'Invitation response did not contain a code');
    pass('Invitation creation');
    const memberCtx=await browser.newContext({locale:'en-US'});
    const member=await memberCtx.newPage();
    const user={handle:'member_'+crypto.randomBytes(3).toString('hex'),password:crypto.randomBytes(24).toString('hex')};
    await member.goto(base+'/join');
    await member.locator('[name=handle]').fill(user.handle);
    await member.locator('[name=password]').fill(user.password);
    await member.locator('[name=confirm]').fill(user.password);
    await member.locator('[name=invite]').fill(code);
    await Promise.all([member.waitForNavigation(),form(member,'join').locator('button').click()]);
    await member.goto(base+'/settings');
    assert.equal(await member.locator('h1').innerText(),'Account');
    creds.member=user;
    fs.writeFileSync(credsPath,JSON.stringify(creds),{mode:0o600});
    pass('Second account registration using a one-use invitation');
    const denied=await memberCtx.request.get(base+'/admin');assert.equal(denied.status(),403);pass('Non-admin invitation management denial');
    await ctx.storageState({path:path.join(fixture,'owner.session.json')});
    await memberCtx.storageState({path:path.join(fixture,'member.session.json')});
    assert.deepEqual(errors,[]);pass('No application JavaScript errors');
    await p.goto(base+'/');await p.screenshot({path:path.join(output,'home-empty-desktop.png'),fullPage:true});
    fs.writeFileSync(path.join(output,'account-smoke.json'),JSON.stringify({passed:results.length,checks:results},null,2));
    console.log(JSON.stringify({passed:results.length}));
  } finally {await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
