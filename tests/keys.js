const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message + '\n' + e.stack));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve('game.html'));
  await page.waitForTimeout(500);
  // label-driven picker: clicking the label must open a file chooser
  const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5000 }), page.click('#btn-file')]);
  console.log('file chooser opened from label:', !!chooser, 'multiple:', chooser.isMultiple());
  await chooser.setFiles(path.resolve('edm124.mp3'));
  await page.waitForFunction(() => window.__echoform.G.state === 'ready', null, { timeout: 60000 });
  console.log('mp3 loaded via chooser:', await page.textContent('#load-title'));
  // keyboard check row
  await page.click('#load-ready [data-diff="chill"]');
  for (const k of ['ArrowUp', 'KeyD', 'ArrowDown', 'KeyA']) { await page.keyboard.press(k); await page.waitForTimeout(60); }
  console.log('diff still chill after arrows:', await page.evaluate(() => window.__echoform.G.diff));
  console.log('chips ok:', await page.$$eval('.kt.ok', (els) => els.length), '|', await page.textContent('#kt-note'));
  console.log('focus hint hidden:', await page.isHidden('#focus-hint'));
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(40);
  await page.screenshot({ path: 'shots/20-ready-keys.png' });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__echoform.G.vt > 1.0, null, { timeout: 15000 });
  const st = await page.evaluate(() => ({ s: window.__echoform.G.state, active: document.activeElement.id }));
  console.log('started with Space, focus on:', JSON.stringify(st));
  // real keyboard presses register as lane presses
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(30); await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space'); await page.waitForTimeout(30); await page.keyboard.up('Space');
  const pr = await page.evaluate(() => ({ up: window.__echoform.FX.lanePress[0], slam: window.__echoform.FX.lanePress[4], t: window.__echoform.G.vt }));
  console.log('lane presses registered at song time:', JSON.stringify(pr));
  await page.waitForFunction(() => window.__echoform.G.vt > 3.2);
  await page.screenshot({ path: 'shots/21-play-labels.png' });
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
