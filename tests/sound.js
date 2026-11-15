const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message + '\n' + e.stack));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve('game.html'));
  await page.waitForTimeout(400);
  for (const f of ['sine1k_m20', 'edm124', 'edm_loud', 'hiphop88', 'techno126', 'demo']) {
    if (f === 'demo') await page.click('#btn-demo'); else await page.setInputFiles('#file-input', path.resolve(f + '.wav'));
    await page.waitForFunction(() => window.__echoform.G.state === 'ready', null, { timeout: 90000 }).catch(() => {});
    const r = await page.evaluate(() => { const G = window.__echoform.G; return G.song ? { tune: G.song.analysis.tune, line: document.querySelector('#tune-line').textContent } : { err: document.querySelector('#load-err').textContent }; });
    console.log(f, JSON.stringify(r));
    if (f === 'demo') {
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'shots/30-ready-sound.png', fullPage: false });
      await page.locator('#sound-block').screenshot({ path: 'shots/31-sound-block.png' });
      // preview, then start and change volume with keys
      await page.click('#btn-preview');
      await page.waitForTimeout(600);
      const pv = await page.evaluate(() => ({ label: document.querySelector('#btn-preview').textContent, norm: window.__echoform.audio.norm.gain.value, kick: window.__echoform.audio.eqKick.gain.value, kickHz: window.__echoform.audio.eqKick.frequency.value }));
      console.log('preview', JSON.stringify(pv));
      await page.fill('#r-punch', '0'); await page.dispatchEvent('#r-punch', 'input');
      await page.waitForTimeout(500);
      console.log('punch 0 ->', await page.evaluate(() => ({ kick: +window.__echoform.audio.eqKick.gain.value.toFixed(2), line: document.querySelector('#tune-line').textContent })));
      await page.fill('#r-punch', '0.65'); await page.dispatchEvent('#r-punch', 'input');
      await page.keyboard.press('Space');
      await page.waitForFunction(() => window.__echoform.G.vt > 0.5);
      console.log('preview stopped on start:', await page.evaluate(() => document.querySelector('#btn-preview').textContent));
      await page.keyboard.press('Minus'); await page.keyboard.press('Minus');
      const v = await page.evaluate(() => ({ vol: window.__echoform.settings.volume, master: window.__echoform.audio.master.gain.value }));
      console.log('after 2x minus', JSON.stringify(v));
      await page.waitForTimeout(150);
      await page.screenshot({ path: 'shots/32-vol-hud.png' });
      await page.keyboard.press('KeyM'); await page.waitForTimeout(100);
      console.log('muted master', await page.evaluate(() => window.__echoform.audio.master.gain.value.toFixed(3)));
      await page.keyboard.press('KeyM');
      // force a slam hit to check pump
      const pump = await page.evaluate(async () => {
        const E = window.__echoform; const G = E.G;
        const n = G.notes.find((x) => x.lane === 4 && !x.judged && x.t > G.vt + 0.3);
        await new Promise((r) => { const w = () => (G.vt >= n.t ? r() : requestAnimationFrame(w)); w(); });
        E.press(4, G.vt - 0.0);
        await new Promise((r) => setTimeout(r, 25));
        return { judged: n.judged, kickNow: +E.audio.eqKick.gain.value.toFixed(2), base: +E.audio.kickBase.toFixed(2) };
      });
      console.log('slam pump', JSON.stringify(pump));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      await page.screenshot({ path: 'shots/33-pause-vol.png' });
    } else await page.click('#btn-load-back');
  }
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
