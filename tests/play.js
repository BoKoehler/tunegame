const { chromium } = require('playwright');
const path = require('path');
const shots = process.env.SHOTS || '.';
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const vp = { width: +(process.env.W || 1280), height: +(process.env.H || 800) };
  const page = await browser.newPage({ viewport: vp });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + e.stack));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve('game.html'));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: shots + '/01-title.png' });
  const t0 = Date.now();
  if (process.env.SONG) await page.setInputFiles('#file-input', path.resolve(process.env.SONG));
  else await page.click('#btn-demo');
  await page.waitForFunction(() => window.__echoform.G.state === 'ready', null, { timeout: 90000 });
  console.log('ready after', (Date.now() - t0) / 1000, 's');
  if (process.env.DIFF) await page.click(`#load-ready [data-diff="${process.env.DIFF}"]`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: shots + '/02-ready.png' });
  const info = await page.evaluate(() => {
    const { G } = window.__echoform; const A = G.song.analysis;
    const ty = {}; for (const n of G.chart.notes) { const k = n.type + (n.len ? '-hold' : '') + (n.chord ? '-chord' : ''); ty[k] = (ty[k] || 0) + 1; }
    return { bpm: A.bpm, steady: A.steady, swing: A.swing, drops: A.drops.map((d) => [d.t.toFixed(2), d.end.toFixed(2), d.build.length]), down: A.downOff, dur: A.duration, notes: G.chart.notes.length, ty, diff: G.chart.key, ctx: window.__echoform.audio.ctx.state };
  });
  console.log(JSON.stringify(info));
  // in-page bot: presses keys with a small timing error; misses on purpose if MISS set
  await page.evaluate(({ missRate, jitter }) => {
    const { G } = window.__echoform;
    const codes = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Space'];
    const done = new Set();
    const ups = [];
    window.__frameTimes = [];
    let last = performance.now();
    const loop = () => {
      const now = performance.now(); window.__frameTimes.push(now - last); last = now;
      if (G.state === 'playing' && G.notes.length) {
        const t = G.vt;
        for (let i = G.drawIdx; i < G.notes.length; i++) {
          const n = G.notes[i]; if (n.t > t + 0.05) break;
          if (done.has(n.id)) continue;
          const target = n.t + n._j;
          if (t >= target) {
            done.add(n.id);
            if (n._skip) continue;
            window.dispatchEvent(new KeyboardEvent('keydown', { code: codes[n.lane], key: codes[n.lane], bubbles: true }));
            ups.push({ at: now + (n.len ? n.len * 1000 + 20 : 40), code: codes[n.lane] });
          }
        }
      }
      for (let k = ups.length - 1; k >= 0; k--) if (now >= ups[k].at) { window.dispatchEvent(new KeyboardEvent('keyup', { code: ups[k].code, key: ups[k].code, bubbles: true })); ups.splice(k, 1); }
      requestAnimationFrame(loop);
    };
    const prep = () => { for (const n of G.notes) { n._j = (Math.random() - 0.5) * 2 * jitter; n._skip = Math.random() < missRate; } };
    window.__prepBot = prep;
    requestAnimationFrame(loop);
  }, { missRate: +(process.env.MISS || 0.03), jitter: +(process.env.JIT || 0.02) });
  await page.click('#btn-start');
  await page.evaluate(() => window.__prepBot());
  const A = info;
  const marks = [];
  const drops = info.drops.map((d) => +d[0]);
  // screenshot moments: early, mid-fuse, right after detonation, overdrive
  const want = [6, ...(drops.length ? [drops[0] - 1.2, drops[0] + 0.12, drops[0] + 6] : [30])];
  const shotNames = ['03-play', '04-fuse', '05-detonate', '06-overdrive'];
  let si = 0;
  const startWall = Date.now();
  while (true) {
    const st = await page.evaluate(() => ({ s: window.__echoform.G.state, t: window.__echoform.G.vt, c: window.__echoform.G.combo, cl: window.__echoform.G.clarity, sc: Math.round(window.__echoform.G.score), od: !!window.__echoform.G.overdrive }));
    if (si < want.length && st.t >= want[si]) { await page.screenshot({ path: `${shots}/${shotNames[si]}.png` }); console.log('shot', shotNames[si], JSON.stringify(st)); si++; }
    if (st.s === 'results') break;
    if (process.env.MAXT && st.t > +process.env.MAXT && st.s === "playing") { await page.evaluate(() => window.__echoform.finish(false)); }
    if (Date.now() - startWall > 400000) { console.log('TIMEOUT', JSON.stringify(st)); break; }
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: shots + '/07-results.png' });
  const res = await page.evaluate(() => {
    const { G } = window.__echoform; const ft = window.__frameTimes.slice(60); ft.sort((a, b) => a - b);
    const errs = G.notes.filter(n => n.judged && n.judged !== 'miss').map(n => n.dt * 1000); errs.sort((a,b)=>a-b);
    return { counts: G.counts, score: Math.round(G.score), maxCombo: G.maxCombo, dets: G.dets, failed: G.failed, acc: (G.accSum / G.accN * 100).toFixed(2), grade: document.querySelector('#res-grade').textContent,
      frameMedian: ft[Math.floor(ft.length / 2)].toFixed(2), frameP99: ft[Math.floor(ft.length * 0.99)].toFixed(2), errMed: errs[Math.floor(errs.length/2)].toFixed(1), errP10: errs[Math.floor(errs.length*0.1)].toFixed(1), errP90: errs[Math.floor(errs.length*0.9)].toFixed(1) };
  });
  console.log('RESULT', JSON.stringify(res));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
