// Browser input helpers. Coordinates are relative to the native district origin;
// the helpers inspect state, then use ordinary visible controls and pointer input.
export async function selectTool(page,kind){
 if([8,9,10].includes(kind)){
  if(!await page.locator('#rail-palette').isVisible())await page.getByRole('button',{name:'Build railway',exact:true}).click();
  await page.locator(`#rail-palette [data-tool="${kind}"]`).click();return;
 }
 if([1,2,7].includes(kind)||[3,4,5,6].includes(kind)){
  const palette=[1,2,7].includes(kind)?'roads':'places',button=page.locator(`button[data-palette="${palette}"]`);
  if(await button.getAttribute('aria-expanded')!=='true')await button.click();
 }
 await page.locator(`[data-tool="${kind}"]`).click();
}
export async function districtPoint(page,x,y){return page.evaluate(({x,y})=>{const g=window.__flowgarden;return g.worldToScreen(x+(g.stats.originX||0)+.5,y+(g.stats.originY||0)+.5)},{x,y})}
export async function waitTile(page,x,y,kind){await page.waitForFunction(({x,y,kind})=>{const g=window.__flowgarden;return (g.cells.find(c=>c.id===x+(g.stats.originX||0)+(y+(g.stats.originY||0))*128)?.kind||0)===kind},{x,y,kind})}
