const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message + '\n' + e.stack));
  await page.goto('file://' + path.resolve('game.html'));
  for (const f of ['demo', 'pop100', 'edm124']) {
    if (f === 'demo') await page.click('#btn-demo'); else await page.setInputFiles('#file-input', path.resolve(f + '.wav'));
    await page.waitForFunction(() => window.__echoform.G.state === 'ready', null, { timeout: 120000 });
    const r = await page.evaluate(() => {
      const E = window.__echoform, A = E.G.song.analysis, out = {};
      for (const k of ['chill', 'groove', 'frenzy']) {
        const c = E.buildChart(A, k);
        // compare each repeated section's pattern with its first appearance, in beat positions
        const B = A.beats; const pos = (t) => { let i = 0; while (i < B.length - 2 && B[i + 1] <= t) i++; return i + (t - B[i]) / (B[i + 1] - B[i]); };
        const firsts = new Map(); let same = 0, tot = 0;
        for (const sec of A.sections) {
          if (!firsts.has(sec.label)) { firsts.set(sec.label, sec); continue; }
          const src = firsts.get(sec.label); const off = A.bars[sec.i0].b0 - A.bars[src.i0].b0;
          const sig = (a, b, sh) => c.notes.filter((n) => n.t >= a && n.t < b && n.type !== 'det').map((n) => `${(pos(n.t) - sh).toFixed(2)}:${n.lane}`);
          const L = Math.min(sec.t1 - sec.t0, src.t1 - src.t0);
          const sA = new Set(sig(src.t0, src.t0 + L - 0.01, 0)), sB = sig(sec.t0, sec.t0 + L - 0.01, off);
          for (const x of sB) { tot++; if (sA.has(x)) same++; }
        }
        const holds = c.notes.filter((n) => n.len > 0).length;
        out[k] = { notes: c.notes.length, replayedBars: c.replayed, repeatMatch: tot ? +(same / tot).toFixed(2) : null, holds, dets: c.notes.filter((n) => n.type === 'det').length };
      }
      return out;
    });
    console.log(f, JSON.stringify(r));
    await page.click('#btn-load-back');
  }
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
