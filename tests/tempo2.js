const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve('game.html'));
  await page.setInputFiles('#file-input', path.resolve('long.mp3'));
  await page.waitForFunction(() => window.__echoform.G.state === 'ready', null, { timeout: 120000 });
  const r = await page.evaluate(() => { const A = window.__echoform.G.song.analysis; return { bpm: A.bpm, steady: A.steady, beats: A.beats }; });
  // truth: 0..137.1s at 100 BPM from 0.0 ; then EDM 124 BPM from 137.1+0.3
  const split = 137.4, P1 = 0.6, P2 = 60 / 124, a2 = split + 0.3;
  const res = (b) => b < split ? ((b + P1 / 2) % P1) - P1 / 2 : (((b - a2) % P2 + P2 * 1.5) % P2) - P2 / 2;
  const r1 = [], r2 = [];
  for (const b of r.beats) { if (b < 1 || b > 246) continue; (b < split ? r1 : r2).push(Math.abs(res(b))); }
  const med = (x) => { x.sort((a, b) => a - b); return (x[Math.floor(x.length / 2)] * 1000).toFixed(1); };
  console.log('tmap', JSON.stringify(await page.evaluate(() => window.__echoform.G.song.analysis.tempoMap)));
  console.log('bpm', r.bpm.toFixed(2), 'steady', r.steady, 'part1 median err ms', med(r1), 'part2 median err ms', med(r2));
  await browser.close();
})();
