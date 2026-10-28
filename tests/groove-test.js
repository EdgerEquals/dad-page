const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  const ok = (n, v, x) => console.log((v ? 'PASS ' : 'FAIL ') + n + '  [' + (typeof x === 'string' ? x : JSON.stringify(x)) + ']');
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(5000);
  await p.evaluate(() => { DadAutoDJ.desk.dial('fmM', -1); DadAutoDJ.desk.dial('kdC', -1); DadAutoDJ.desk.setPick('electro'); }); for (let i = 0; i < 60; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === 'electro') break; await p.waitForTimeout(500); }
  await p.waitForTimeout(8000); const t0 = await p.evaluate(() => Date.now()); const dks = [];
  for (let i = 0; i < 16; i++) { await p.waitForTimeout(2000); dks.push(await p.evaluate(() => { const r = DadAutoDJ.desk.live().rp; return r ? +r.dk.toFixed(3) : null; })); }
  const res = await p.evaluate((t0) => { const N = DadAutoDJ.notes().filter(e => e[0] >= t0), bars = N.filter(e => e[1] === 'bar'); if (bars.length < 3) return null;
    const bpm = bars[bars.length - 1][2], d16 = 60000 / bpm / 4, B0 = bars[0][0];
    const pos = (w) => Math.round((w - B0) / d16); const kicks = N.filter(e => e[1] === 'drums' && e[2] === 36).map(e => ({ s: ((pos(e[0]) % 16) + 16) % 16, v: e[3] }));
    const down = kicks.filter(k => k.s === 0).map(k => k.v), other = kicks.filter(k => k.s !== 0).map(k => k.v), avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
    const nb = Math.round((N[N.length - 1][0] - B0) / (d16 * 16)), toms = N.filter(e => e[1] === 'drums' && e[2] === 45).map(e => Math.floor(pos(e[0]) / 16)), fillBars = [...new Set(toms)];
    return { bpm, nb, down: +avg(down).toFixed(3), other: +avg(other).toFixed(3), fillBars, nk: kicks.length }; }, t0);
  console.log(JSON.stringify(res), 'duck', dks.join(' '));
  ok('electro kicks sit level: the off-beat kicks are at least 0.6 of the downbeat', res && res.other / res.down >= 0.6, res && (res.other / res.down).toFixed(2));
  ok('no kick duck on electro (template)', dks.filter(x => x != null).every(x => Math.abs(x - 1) < 1e-6), dks);
  ok('fills at most every 8 bars', res && res.fillBars.length <= Math.ceil(res.nb / 8) + 1 && res.fillBars.every((b, i, a) => !i || b - a[i - 1] >= 7), res && res.fillBars);
  await p.evaluate(() => DadAutoDJ.desk.dial('kdC', 1)); await p.waitForTimeout(4000); const dk2 = await p.evaluate(() => DadAutoDJ.desk.live().rp.dk); ok('the kick duck knob brings it back', dk2 < 0.99, dk2);
  await p.evaluate(() => DadAutoDJ.desk.dial('kdC', -1));
  ok('no page errors', !errs.length, errs.join(' / ') || 'none'); await b.close(); })();
