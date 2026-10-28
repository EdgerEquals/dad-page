const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(6000);
  const rms = () => p.evaluate(() => new Promise(d => { const o = []; const iv = setInterval(() => o.push(DadAutoDJ.out.level || 0), 100); setTimeout(() => { clearInterval(iv); d(+(20 * Math.log10(o.reduce((a, q) => a + q, 0) / o.length + 1e-9)).toFixed(1)); }, 4000); }));
  const a = await rms(); await p.evaluate(() => DadAutoDJ.desk.CHS.forEach(ch => DadAutoDJ.desk.level(ch, 3))); await p.waitForTimeout(500); const b3 = await rms();
  await p.evaluate(() => DadAutoDJ.desk.CHS.forEach(ch => DadAutoDJ.desk.level(ch, 6))); await p.waitForTimeout(800); const off = await rms();
  console.log('level 0:', a, 'dB · all channels 3 rungs down:', b3, 'dB · all off:', off, 'dB'); console.log('errors:', errs.join(' / ') || 'none'); await b.close(); })();
