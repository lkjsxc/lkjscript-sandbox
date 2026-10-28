// Capture the native preference immediately before the synthetic restart.
'use strict';
const {chromium,assert,goto,pass,session,save}=require('./support.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});try{
  const existing=await session(browser),state=await existing.storageState();await existing.close();
  const clean=await browser.newContext({locale:'en-US',storageState:{cookies:state.cookies,origins:[]}});try{
   const page=await clean.newPage();await goto(page,'/compose');
   const value=await page.locator('[name=audience]').inputValue();
   assert(['members','public','link-only'].includes(value));save('expected-audience',{value});
   pass('Captured the native default audience immediately before restart');
  }finally{await clean.close();}
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
