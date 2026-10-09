// Real browser controls against disposable native HTTP and session stores.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser = await chromium.launch({headless: true, executablePath: process.env.CHROMIUM || undefined, args: ['--no-sandbox']});
const errors = [];
let page;
try {
  page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  page.setDefaultTimeout(180000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.PREVIEW_URL);
  await page.waitForFunction(() => window.__flowgarden?.sessionStatus === 1);
  await page.locator('#menu-open').click();
  await page.locator('#examples-open').click();
  await page.locator('[data-scenario="6"]').click();
  await page.waitForFunction(() => !document.querySelector('#city-confirm').disabled);
  await page.locator('#city-confirm').click();
  await page.waitForFunction(() => window.__flowgarden.stats.population === 2048 && window.__flowgarden.menuPage === 'home');
  await page.locator('#continue').click();
  await page.locator('#fit').click();
  const start = Date.now();
  await page.locator('#play').click();
  await page.waitForFunction(() => window.__flowgarden.stats.tick >= 16, null, {timeout: 240000});
  await page.locator('#play').click();
  await page.waitForFunction(() => window.__flowgarden.stats.paused);
  const inspect = () => page.evaluate(() => {
    const g = window.__flowgarden;
    return {stats: g.stats, street: g.street, actors: g.actors, rails: g.rails, rendered: g.renderedActors};
  });
  const stopped = await inspect();
  assert.equal(stopped.stats.population, 2048);
  assert.equal(stopped.stats.wealthError, 0);
  assert.equal(stopped.rails.length, 8);
  assert(stopped.street.walking >= 128, 'Real walkers must reach the overview viewport');
  assert(stopped.actors.filter(a => a.mode !== 2).length >= 64, 'The native sample must contain visible pedestrians');
  assert(stopped.rendered.filter(a => a.mode !== 2).length >= 32, 'Native actors must reach actual canvas presentation');
  await page.screenshot({path: 'evidence/commuter-residents-overview.png'});
  await page.locator('#menu-open').click();
  await page.locator('#save').click();
  await page.waitForFunction(() => document.querySelector('#notice').textContent === 'City saved.');
  const saved = await inspect();
  await page.reload();
  await page.waitForFunction(() => window.__flowgarden?.sessionStatus === 1);
  const resumed = await inspect();
  assert.deepEqual(resumed.stats, saved.stats, 'The same saved city, not a fresh example, must resume');
  assert.deepEqual(resumed.rails, saved.rails);
  await page.locator('#fit').click();
  await page.waitForFunction(() => window.__flowgarden.street.walking >= 128);
  assert.deepEqual(errors, []);
  const report = {passed: true, artifact_sha256: JSON.parse(fs.readFileSync(process.env.CITY_SELECTION || '.build/selection.json')).artifact_sha256, wall_ms: Date.now() - start, stats: stopped.stats, street: stopped.street, shown_walkers: stopped.actors.filter(a => a.mode !== 2).length, rendered_walkers: stopped.rendered.filter(a => a.mode !== 2).length, saved_city_reloaded: true, errors};
  fs.writeFileSync('evidence/commuter-residents-ui.json', JSON.stringify(report, null, 2) + '\n');
  console.log(report);
} catch (error) {
  if (page) {
    await page.screenshot({path: 'evidence/commuter-residents-ui-failure.png'}).catch(() => {});
    console.error(await page.evaluate(() => ({stats: window.__flowgarden?.stats, street: window.__flowgarden?.street, notice: document.querySelector('#notice')?.textContent})).catch(() => null));
  }
  throw error;
} finally {
  await browser.close();
}
