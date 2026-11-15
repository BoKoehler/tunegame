const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1366, height: 860 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message + '\n' + e.stack));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve('game.html'));
  await page.click('#btn-demo');
  await page.waitForFunction(() => window.__echoform.G.state === 'ready', null, { timeout: 90000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/50-ready-practice.png' });
  // bot that hits every note with a little jitter
  await page.evaluate(() => {
    const { G } = window.__echoform; const codes = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Space'];
    const done = new Set(), ups = [];
    const loop = () => {
      const now = performance.now();
      if (G.state === 'playing') for (let i = G.drawIdx; i < G.notes.length; i++) {
        const n = G.notes[i]; if (n.t > G.vt + 0.05) break; if (done.has(n)) continue;
        if (G.vt >= n.t + (window.__jit || 0.012)) { done.add(n); window.dispatchEvent(new KeyboardEvent('keydown', { code: codes[n.lane] })); ups.push({ at: now + (n.len ? n.len * 1000 / window.__echoform.clock.rate + 20 : 40), code: codes[n.lane] }); }
      }
      for (let k = ups.length - 1; k >= 0; k--) if (now >= ups[k].at) { window.dispatchEvent(new KeyboardEvent('keyup', { code: ups[k].code })); ups.splice(k, 1); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  // 1) practice Drop 1 at 70%
  await page.click('#prac-speed button[data-rate="0.7"]');
  const chips = await page.$$('#prac-secs .chip');
  const names = await page.$$eval('#prac-secs .chip', (els) => els.map((e) => e.textContent));
  console.log('chips:', names.join(' | '));
  await chips[2].click();
  const st = await page.evaluate(() => ({ rate: window.__echoform.clock.rate, from: window.__echoform.G.practice.from, to: window.__echoform.G.practice.to, notes: window.__echoform.G.notes.length, sec: window.__echoform.G.practice.name }));
  console.log('practice:', JSON.stringify(st));
  await page.waitForFunction(() => window.__echoform.G.vt > window.__echoform.G.practice.from + 3, null, { timeout: 30000 });
  await page.screenshot({ path: 'shots/51-practice-play.png' });
  await page.waitForFunction(() => window.__echoform.G.state === 'results', null, { timeout: 90000 });
  await page.waitForTimeout(1300);
  const r = await page.evaluate(() => ({ eyebrow: document.querySelector('#res-eyebrow').textContent, grade: document.querySelector('#res-grade').textContent, counts: window.__echoform.G.counts, dets: window.__echoform.G.dets, xp: document.querySelector('#res-xp-text').textContent, timing: document.querySelector('#res-timing-note').textContent, sections: [...document.querySelectorAll('.sec-row')].map((e) => e.textContent), full: !document.querySelector('#btn-res-full').hidden }));
  console.log('practice result:', JSON.stringify(r));
  await page.screenshot({ path: 'shots/52-practice-results.png', fullPage: false });
  // 2) full run with Mirror + Sudden death; the bot starts missing after 8 s
  await page.click('#btn-res-new');
  await page.click('#btn-demo');
  await page.waitForFunction(() => window.__echoform.G.state === 'ready', null, { timeout: 90000 });
  await page.click('[data-mod="mirror"]'); await page.click('[data-mod="sudden"]');
  await page.evaluate(() => { window.__jit = 0.012; });
  await page.click('#btn-start');
  const mm = await page.evaluate(() => ({ mods: window.__echoform.G.mods, mul: window.__echoform.G.modMul }));
  console.log('mods run:', JSON.stringify(mm));
  await page.waitForFunction(() => window.__echoform.G.vt > 8, null, { timeout: 30000 });
  await page.evaluate(() => { window.__jit = 0.4; });
  await page.waitForFunction(() => window.__echoform.G.state === 'results', null, { timeout: 30000 });
  console.log('sudden death:', await page.textContent('#res-eyebrow'), '| grade', await page.textContent('#res-grade'));
  // leave mods off for later tests
  await page.evaluate(() => { const s = window.__echoform.settings; s.mods = { mirror: false, hidden: false, sudden: false }; localStorage.setItem('echoform:settings', JSON.stringify(s)); });
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
