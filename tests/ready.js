const { chromium, devices } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  for (const [name, opts] of [['desk', { viewport: { width: 1366, height: 800 } }], ['phone', { ...devices['iPhone 13'] }]]) {
    const ctx = await browser.newContext(opts); const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('file://' + path.resolve('game.html'));
    await page.setInputFiles('#file-input', path.resolve('pop100.wav'));
    await page.waitForFunction(() => window.__echoform.G.state === 'ready', null, { timeout: 90000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `shots/40-ready-${name}.png` });
    const vis = await page.evaluate(() => { const r = document.querySelector('#btn-start').getBoundingClientRect(); return { startBottom: Math.round(r.bottom), vh: innerHeight, sw: document.documentElement.scrollWidth, vw: innerWidth }; });
    console.log(name, JSON.stringify(vis));
    if (name === 'desk') {
      await page.evaluate(() => { window.__echoform.settings.noFail = true; });
      await page.keyboard.press('Space');
      await page.waitForFunction(() => window.__echoform.G.vt > 21 * 2.4, null, { timeout: 90000 });
      await page.screenshot({ path: 'shots/41-pop-verse2.png' });
      const st = await page.evaluate(() => ({ sec: window.__echoform.FX.world.cur.name, chord: window.__echoform.FX.chord && window.__echoform.FX.chord.name }));
      console.log('at verse 2:', JSON.stringify(st));
      await page.waitForFunction(() => window.__echoform.G.vt > 36.5 * 2.4, null, { timeout: 90000 });
      await page.screenshot({ path: 'shots/42-pop-bridge.png' });
      console.log('at bridge:', JSON.stringify(await page.evaluate(() => ({ sec: window.__echoform.FX.world.cur.name, style: window.__echoform.FX.world.cur.style, chord: window.__echoform.FX.chord && window.__echoform.FX.chord.name }))));
    }
    await ctx.close();
  }
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
