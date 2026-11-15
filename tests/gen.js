const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1366, height: 860 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message + '\n' + e.stack));
  await page.goto('file://' + path.resolve('game.html'));
  const seeds = (process.argv[2] || '11,222,3333,44444,555555,6666666').split(',').map(Number);
  let ok = 0;
  for (const seed of seeds) {
    const t0 = Date.now();
    await page.evaluate((sd) => window.__echoform.loadDemo(sd), seed);
    await page.waitForFunction(() => window.__echoform.G.state === 'ready' || !document.querySelector('#load-err').hidden, null, { timeout: 120000 });
    const r = await page.evaluate((sd) => {
      const E = window.__echoform, A = E.G.song.analysis;
      // ground truth from the generator itself
      const P = (function () { return null; })();
      return { title: E.G.song.title, bpm: +A.bpm.toFixed(2), key: A.key.name, prog: A.progression.join(' '), drops: A.drops.map((d) => +(d.t / (4 * A.beatDur)).toFixed(1)), secs: A.sections.map((x) => x.name).join(', '), notes: E.G.chart.notes.length };
    }, seed);
    const truth = await page.evaluate((sd) => { const f = window.__echoform.trackParams; return f ? f(sd) : null; }, seed);
    const tBpm = truth ? truth.bpm : '?', tKey = truth ? truth.keyName : '?';
    const L = truth && truth.lens, tDrops = L ? [L.intro + L.build, L.intro + L.build + L.drop + L.brk + L.build2] : [];
    const match = truth && Math.abs(r.bpm - tBpm) < 0.2 && r.key === tKey && JSON.stringify(r.drops.map(Math.round)) === JSON.stringify(tDrops);
    if (match) ok++;
    console.log(`seed ${seed} (${((Date.now() - t0) / 1000).toFixed(1)}s) "${r.title}" ${truth ? truth.style : ''}: bpm ${r.bpm} (truth ${tBpm}) · key ${r.key} (truth ${tKey}) · drops at bars ${JSON.stringify(r.drops)} (truth ${JSON.stringify(tDrops)}) ${match ? 'OK' : 'MISMATCH'}`);
    console.log(`   ${r.prog} | ${r.secs} | ${r.notes} notes`);
    await page.click('#btn-load-back');
  }
  await page.evaluate(() => window.__echoform.loadDemo(seeds_last = 0)).catch(() => {});
  console.log(`${ok}/${seeds.length} generated tracks heard exactly as composed`);
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
