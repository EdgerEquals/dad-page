const { chromium } = require('playwright'); const R = [];
function ok(n, c, x) { R.push((c ? 'PASS ' : 'FAIL ') + n + (x ? '  [' + x + ']' : '')); }
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  const snap = () => p.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('dadRhythm.radio.v1') || localStorage.getItem('dadRhythm.v1') || '{}'); return s.r && s.r.dj || {}; } catch (e) { return {}; } });
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const pb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(pb.x + 5, pb.y + 5); await p.waitForTimeout(5000);
  await p.evaluate(() => { const I = DadAutoDJ._kit.INST; window.__r = { resp: 0, stab: 0, lead: 0, ansHalf: 0 }; window.__wrapped = {};
    ['jup', 'horn', 'bell', 'reed', 'pluck', 'piano'].forEach(k => { const f = I[k]; if (!f || __wrapped[k]) return; __wrapped[k] = 1; I[k] = function (tr) { if (tr && tr.tk && tr.tk.L && tr === tr.tk.L.lead) { __r.resp++; __r[k] = (__r[k] || 0) + 1; } return f.apply(this, arguments); }; }); });
  let s0 = await snap(); ok('a first theme goes into memory', Array.isArray(s0.mm) && s0.mm.length >= 1, JSON.stringify(s0.mm));
  ok('the live track saves its call (mo, 32 steps)', s0.tr && Array.isArray(s0.tr.mo) && s0.tr.mo.length === 32, s0.tr && JSON.stringify(s0.tr.mo));
  // walk through several genres to build memory and catch recalls
  const genres = ['electro', 'soul', 'cinematic', 'electro', 'folk', 'electronic'], seen = [];
  for (const g of genres) {
    await p.evaluate(g => DadAutoDJ.desk.setPick(g), g);
    for (let i = 0; i < 100; i++) { const tg = await p.evaluate(() => DadAutoDJ.track.genre); if (tg === g) break; await p.waitForTimeout(500); }
    await p.waitForTimeout(1500); const sn = await snap(); seen.push({ g, mo: sn.tr && sn.tr.mo, mm: (sn.mm || []).length });
  }
  const cont = m => { const d = []; let last = null; (m || []).forEach(x => { if (x == null) return; if (last != null) d.push(x - last); last = x; }); return d; };
  const mems = (await snap()).mm || [];
  const near = (a, b) => { if (!a.length || !b.length) return false; let diff = 0; for (let i = 0; i < a.length; i++) { const v = b[i % b.length]; if (a[i] !== v && a[i] !== -v) diff++; } return diff <= Math.max(1, Math.floor(a.length / 8)); };
  const rec = seen.map((x, i) => { const cc = cont(x.mo); return mems.slice(0, i + 1).some(m => m !== cc && near(cc, m) && JSON.stringify(m) !== JSON.stringify(cc)); });
  ok('memory grows (up to 8 themes)', mems.length >= 3 && mems.length <= 8, 'themes ' + mems.length + ' / per track ' + seen.map(x => x.mm).join(','));
  ok('some new tracks recall a remembered contour', rec.some(x => x), seen.map((x, i) => x.g + (rec[i] ? ':recall' : ':fresh')).join(' '));
  // electro: the Jupiter answers the DX7 in the answer halves
  await p.evaluate(() => DadAutoDJ.desk.setPick('electro'));
  for (let i = 0; i < 100; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === 'electro') break; await p.waitForTimeout(500); }
  await p.evaluate(() => { __r.resp = 0; __r.jup = 0; }); await p.waitForTimeout(25000); const rr = await p.evaluate(() => __r);
  ok('another voice answers the lead (electro: Jupiter in the lead layer)', rr.resp > 0, JSON.stringify(rr));
  // reload: the same track comes back with the same call
  const before = await snap(); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(4000); const after = await snap();
  ok('reload keeps the call', JSON.stringify(before.tr && before.tr.mo) === JSON.stringify(after.tr && after.tr.mo) && after.mm && after.mm.length === before.mm.length, (before.mm || []).length + ' themes');
  ok('no page errors', !errs.length, errs.join(' / '));
  await b.close(); console.log(R.join('\n')); })();
