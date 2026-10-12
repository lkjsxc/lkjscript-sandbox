// Local synthetic acceptance; never run this against a public or real data store.
const s = require('../browser/support.cjs');
const crypto = require('node:crypto');
const file = s.path.join(s.output, 'checks.json');
function pass(name) {
  const checks = s.fs.existsSync(file) ? JSON.parse(s.fs.readFileSync(file)) : [];
  checks.push(name); s.fs.writeFileSync(file, JSON.stringify(checks, null, 2));
  console.log('PASS', name);
}
async function session(browser, role = 'owner', options = {}) {
  return browser.newContext({locale:'en-US', viewport:{width:1280,height:1000},
    storageState:s.path.join(s.fixture, role+'.session.json'), ...options});
}
async function submit(page, intent, extra = {}, status = 303) {
  const body = {...await s.fields(page, intent), ...extra};
  const response = await page.request.post(s.base+'/action', {
    form:body, headers:{Origin:s.base}, maxRedirects:0});
  s.assert.equal(response.status(), status, (await response.text()).slice(0,800));
  return response;
}
async function createPost(page, body, audience='members', mode='publish') {
  await s.goto(page,'/compose'); await page.locator('[name=body]').fill(body);
  await page.locator('select[name=audience]').selectOption(audience);
  const response=await submit(page,'note',{body,audience,mode});
  const location=response.headers().location; await s.goto(page,location);
  return resourceId(location);
}
function save(name,value) {s.fs.writeFileSync(s.path.join(s.fixture,name+'.json'),JSON.stringify(value,null,2),{mode:0o600});}
function load(name) {return JSON.parse(s.fs.readFileSync(s.path.join(s.fixture,name+'.json')));}
function resourceId(value){const u=new URL(value,s.base);return u.pathname.match(/^\/([a-f0-9]{64})(?:\/|$)/)?.[1]||u.searchParams.get('id');}
const isResource=value=>/^\/[a-f0-9]{64}$/.test(new URL(value,s.base).pathname);
const isEditor=value=>/^\/[a-f0-9]{64}\/edit$/.test(new URL(value,s.base).pathname);
module.exports={resourceId,isResource,isEditor,...s,crypto,pass,session,submit,createPost,save,load};
