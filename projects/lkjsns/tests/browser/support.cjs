// Optional development tests only. The application server is native lkjscript.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.LKJSNS_PLAYWRIGHT || 'playwright');
const root=path.resolve(__dirname,'../..');
const base=process.env.LKJSNS_TEST_URL || 'http://127.0.0.1:19273';
const target=new URL(base);
assert.equal(target.protocol,'http:');
assert.equal(target.hostname,'127.0.0.1','Synthetic acceptance must stay on loopback');
assert(!target.username&&!target.password&&!target.search&&!target.hash&&target.pathname==='/');
const fixture=path.resolve(process.env.LKJSNS_TEST_FIXTURE || path.join(root,'runtime/acceptance'));
const output=path.resolve(process.env.LKJSNS_TEST_OUTPUT || path.join(root,'.build/acceptance'));
assert(fixture.startsWith(path.join(root,'runtime')+path.sep),'Refusing a non-test data directory');
assert(output.startsWith(path.join(root,'.build')+path.sep),'Test output must be ignored');
fs.mkdirSync(output,{recursive:true,mode:0o700});
const form=(page,intent)=>page.locator('form').filter({has:page.locator(`input[name="intent"][value="${intent}"]`)});
async function click(page,button){const [response]=await Promise.all([page.waitForNavigation({waitUntil:'load'}),button.click()]);return response;}
async function goto(page,route){const response=await page.goto(base+route);assert.equal(response.status(),200,route);return response;}
async function fields(page,intent){return form(page,intent).evaluate(el=>Object.fromEntries(new FormData(el).entries()));}
module.exports={chromium,root,base,fixture,output,fs,path,assert,form,click,goto,fields};
