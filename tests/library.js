const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const fs = require('fs');
(async () => {
  const server = http.createServer((req, res) => {
    const f = path.resolve('game.html');
    res.writeHead(200, { 'content-type': 'text/html' }); res.end(fs.readFileSync(f));
  }).listen(0);
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message + '\n' + e.stack));
  await page.goto(url);
  await page.waitForTimeout(400);
  console.log('library visible before any song:', await page.isVisible('#library'));
  // 1) a real file, 2) the demo, 3) a generated track
  await page.setInputFiles('#file-input', path.resolve('edm124.mp3'));
  await page.waitForFunction(() => window.__echoform.G.state === 'ready', null, { timeout: 90000 });
  await page.click('#btn-load-back');
  await page.click('#btn-demo');
  await page.waitForFunction(() => window.__echoform.G.state === 'ready', null, { timeout: 90000 });
  // finish a quick run so a best grade exists
  await page.evaluate(() => { window.__echoform.settings.noFail = true; });
  await page.click('#btn-start');
  await page.waitForFunction(() => window.__echoform.G.vt > 3, null, { timeout: 30000 });
  await page.evaluate(() => { const E = window.__echoform; E.G.score = 123456; E.finish(false); });
  await page.waitForTimeout(500);
  await page.click('#btn-res-new');
  await page.click('#btn-gen');
  await page.waitForFunction(() => window.__echoform.G.state === 'ready', null, { timeout: 90000 });
  const genTitle = await page.textContent('#load-title');
  await page.click('#btn-load-back');
  await page.waitForTimeout(600);
  // reload the page: everything should come back from storage
  await page.reload();
  await page.waitForTimeout(1200);
  const items = await page.$$eval('.lib-item', (els) => els.map((e) => e.querySelector('.lib-title').textContent + ' | ' + e.querySelector('.lib-meta').textContent + ' | ' + [...e.querySelectorAll('.lib-grades span')].map((x) => x.textContent).join(' ')));
  console.log('after reload, your songs:\n  ' + items.join('\n  '));
  console.log('generated title was:', genTitle, '| how-to collapsed:', !(await page.$eval('#howto-wrap', (d) => d.open)));
  console.log('profile:', await page.textContent('#profile'));
  await page.screenshot({ path: 'shots/60-title-library.png' });
  // reopen the stored mp3 straight from the library
  await page.click('.lib-item:has-text("edm124") .lib-play');
  await page.waitForFunction(() => window.__echoform.G.state === 'ready', null, { timeout: 90000 });
  console.log('reopened from library:', await page.textContent('#load-title'), '| bpm', await page.evaluate(() => window.__echoform.G.song.analysis.bpm.toFixed(2)));
  await page.click('#btn-load-back');
  // reopen the generated track (regenerated from its seed) and check it is the same song
  await page.click(`.lib-item:has-text("${genTitle}") .lib-play`);
  await page.waitForFunction(() => window.__echoform.G.state === 'ready', null, { timeout: 90000 });
  console.log('regenerated:', await page.textContent('#load-title'));
  await page.click('#btn-load-back');
  // remove one
  await page.click('.lib-item:has-text("edm124") .lib-del');
  await page.waitForTimeout(300);
  console.log('after remove:', (await page.$$('.lib-item')).length, 'songs');
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close(); server.close();
})();
