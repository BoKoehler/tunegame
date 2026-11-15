const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message + '\n' + e.stack));
  await page.goto('file://' + path.resolve('game.html'));
  await page.click('#btn-demo');
  await page.waitForFunction(() => window.__echoform.G.state === 'ready', null, { timeout: 90000 });
  await page.evaluate(() => { window.__echoform.settings.noFail = true; });
  await page.click('#btn-start');
  await page.waitForFunction(() => window.__echoform.G.vt > 1, null, { timeout: 30000 });
  const before = await page.evaluate(() => ({ level: window.__echoform.QUAL.level, canvasW: document.querySelector('#stage').width }));
  // simulate a slow device: burn ~30 ms every frame
  await page.evaluate(() => { const burn = () => { const t = performance.now(); while (performance.now() - t < 30) {} if (window.__burn) requestAnimationFrame(burn); }; window.__burn = true; requestAnimationFrame(burn); });
  await page.waitForTimeout(6000);
  const slow = await page.evaluate(() => ({ level: window.__echoform.QUAL.level, canvasW: document.querySelector('#stage').width }));
  await page.screenshot({ path: 'shots/70-low-quality.png' });
  await page.evaluate(() => { window.__burn = false; });
  await page.waitForTimeout(13000);
  const recovered = await page.evaluate(() => ({ level: window.__echoform.QUAL.level, canvasW: document.querySelector('#stage').width }));
  console.log('quality before', JSON.stringify(before), '| under load', JSON.stringify(slow), '| after recovery', JSON.stringify(recovered));
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
