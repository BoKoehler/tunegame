const { chromium } = require('playwright');
const path = require('path');
const truth = require('./truth.json');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve('game.html'));
  await page.waitForTimeout(500);
  const files = (process.argv[2] || 'clicks128,edm124,swing96,drift,hiphop88').split(',');
  for (const name of files) {
    const file = name.endsWith('.mp3') ? name : name + '.wav';
    const t0 = Date.now();
    await page.setInputFiles('#file-input', path.resolve(file));
    await page.waitForFunction(() => window.__echoform.G.state === 'ready' || !document.querySelector('#load-err').hidden, null, { timeout: 60000 });
    const res = await page.evaluate(() => {
      const { G, buildChart } = window.__echoform; const A = G.song.analysis;
      const counts = {};
      for (const k of ['chill', 'groove', 'frenzy']) { const c = buildChart(A, k); const ty = {}; for (const n of c.notes) ty[n.type + (n.len ? '-hold' : '')] = (ty[n.type + (n.len ? '-hold' : '')] || 0) + 1; counts[k] = { n: c.notes.length, nps: +(c.notes.length / A.duration).toFixed(2), ty }; }
      return { bpm: A.bpm, steady: A.steady, swing: A.swing, downOff: A.downOff, beats: A.beats, drops: A.drops.map(d => +d.t.toFixed(3)), dur: A.duration, conf: A.conf, counts, err: document.querySelector('#load-err').hidden ? null : document.querySelector('#load-err').textContent };
    });
    const tr = truth[name.replace('.mp3', '')] || {};
    let phase = '';
    if (tr.bpm) {
      const P = 60 / tr.bpm; const resid = [];
      for (const b of res.beats) { if (b < tr.first || b > res.dur - 1) continue; const k = Math.round((b - tr.first) / P); resid.push(b - (tr.first + k * P)); }
      resid.sort((a, b) => a - b);
      const med = resid[Math.floor(resid.length / 2)], mx = Math.max(...resid.map(Math.abs));
      phase = `phase median ${(med * 1000).toFixed(1)}ms max ${(mx * 1000).toFixed(1)}ms`;
    }
    if (tr.beats) {
      const resid = []; for (const b of res.beats) { if (b < 1 || b > res.dur - 2) continue; let best = 1e9; for (const x of tr.beats) if (Math.abs(x - b) < Math.abs(best)) best = x - b; resid.push(-best); }
      resid.sort((a, b) => a - b); phase = `drift resid median ${(resid[Math.floor(resid.length / 2)] * 1000).toFixed(1)}ms p90 ${(Math.abs(resid[Math.floor(resid.length * 0.9)]) * 1000).toFixed(1)}ms max ${(Math.max(...resid.map(Math.abs))*1000).toFixed(1)}`;
    }
    console.log(`${name}: ${((Date.now() - t0) / 1000).toFixed(1)}s bpm=${res.bpm.toFixed(3)} (truth ${tr.bpm || '-'}) steady=${res.steady} swing=${res.swing} down=${res.downOff} conf=${res.conf.toFixed(2)} ${phase}`);
    console.log(`   drops=${JSON.stringify(res.drops)} truth=${JSON.stringify((tr.drops || []).map(x => +x.toFixed(3)))} err=${res.err}`);
    console.log('   charts', JSON.stringify(res.counts));
    await page.click('#btn-load-back');
  }
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
