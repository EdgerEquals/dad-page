const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  const ok = (n, v, x) => console.log((v ? 'PASS ' : 'FAIL ') + n + '  [' + (typeof x === 'string' ? x : JSON.stringify(x)) + ']');
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(5000);
  await p.evaluate(() => { DadAutoDJ.desk.dial('fmM', -1); ['lN', 'mBl', 'soloP'].forEach(k => DadAutoDJ.desk.dial(k, k === 'lN' ? 1 : 0)); DadAutoDJ.desk.setPick('electro'); });   // the melody dials as before melody1: one lead voice, no build, no solo (this test counts the DX7's notes) for (let i = 0; i < 60; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === 'electro') break; await p.waitForTimeout(500); }
  await p.waitForTimeout(6000);
  await p.evaluate(() => { const I = DadAutoDJ._kit && DadAutoDJ._kit.INST; window.__b = 0; ['dx', 'bell'].forEach(k => { const f = I[k]; I[k] = function () { __b++; return f.apply(this, arguments); }; }); });
  const run = async (v) => { await p.evaluate((v) => { DadAutoDJ.desk.dial('belS', v); window.__b = 0; }, v); await p.waitForTimeout(20000); return p.evaluate(() => __b); };
  const full = await run(1), def = await run(0.618034), none = await run(0);
  ok('bells thin out with the knob (all > default > none)', full > def && none === 0, { full, def, none });
  await p.evaluate(() => DadAutoDJ.desk.dial('belS', 0.618034));
  ok('no page errors', !errs.length, errs.join(' / ') || 'none'); await b.close(); })();
