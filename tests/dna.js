const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message + '\n' + e.stack));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve('game.html'));
  for (const f of (process.argv[2] || 'demo').split(',')) {
    const t0 = Date.now();
    if (f === 'demo') await page.click('#btn-demo'); else await page.setInputFiles('#file-input', path.resolve(f.includes('.') ? f : f + '.wav'));
    await page.waitForFunction(() => window.__echoform.G.state === 'ready' || !document.querySelector('#load-err').hidden, null, { timeout: 120000 });
    const r = await page.evaluate(() => {
      const G = window.__echoform.G; if (!G.song) return { err: document.querySelector('#load-err').textContent };
      const A = G.song.analysis, bar = (t) => +(t / (4 * A.beatDur)).toFixed(1);
      // chords on each downbeat (first 24 bars)
      const downs = []; for (let i = A.downOff; i < A.beats.length && downs.length < 64; i += 4) { const s = A.chordAtBeat[i]; downs.push(s < 0 ? '-' : (['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'][s % 12] + (s >= 12 ? 'm' : ''))); }
      return { key: A.key.name, keyConf: +A.key.conf.toFixed(2), prog: A.progression.join(' '), downOff: A.downOff,
        sections: A.sections.map((s) => `${s.name}[${s.letter}] ${bar(s.t0)}-${bar(s.t1)} e${s.energy.toFixed(2)} ${s.style}`),
        downs: downs.join(' '), kicks: A.kicks.length, gaps: A.gaps.map((g) => `${g.t0.toFixed(2)}-${g.t1.toFixed(2)}`) };
    });
    console.log(`\n== ${f} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); console.log(JSON.stringify(r, null, 1));
    if (await page.isVisible('#btn-load-back')) await page.click('#btn-load-back'); else await page.click('#btn-load-cancel');
  }
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
