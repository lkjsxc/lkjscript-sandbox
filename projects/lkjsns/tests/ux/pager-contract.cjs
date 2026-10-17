// One bottom pagination group; native DOM order and visible geometry must agree.
'use strict';
const assert=require('node:assert/strict');
async function assertPager(page,{name='Pagination',content,previous=true,next=true}={}){
 const pager=page.getByRole('navigation',{name,exact:true});assert.equal(await pager.count(),1,page.url());
 const backward=pager.locator('a[rel=prev],a[rel=first]'),forward=pager.locator('a[rel=next]');
 assert.equal(await backward.count(),Number(previous));assert.equal(await forward.count(),Number(next));
 const report=await pager.evaluate((nav,selector)=>{
  const box=e=>{const b=e.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height}};
  const items=Array.from(document.querySelectorAll(selector));const links=Array.from(nav.querySelectorAll('a'));
  return {nav:box(nav),links:links.map(e=>({rel:e.rel,...box(e)})),below:items.every(e=>!!(e.compareDocumentPosition(nav)&Node.DOCUMENT_POSITION_FOLLOWING)&&box(e).bottom<=box(nav).top+1),nested:nav.querySelectorAll('nav').length,after:nav.nextElementSibling?.className||'',documentOrder:links.map(e=>e.rel),viewport:innerWidth,scroll:document.documentElement.scrollWidth};
 },content);
 assert(report.below,'Pagination must follow the paginated content in DOM and on screen: '+JSON.stringify(report));
 assert.equal(report.nested,0);assert(report.scroll<=report.viewport+1);
 for(const l of report.links){assert(l.height>=48&&l.width>=64,JSON.stringify(l));assert(l.left>=-1&&l.right<=report.viewport+1);}
 if(previous&&next){const[a,b]=report.links;assert(['prev','first'].includes(a.rel)&&b.rel==='next');assert(Math.abs(a.top-b.top)<1);assert(a.right<b.left);assert(b.width>=a.width);}
 return report;
}
module.exports={assertPager};
