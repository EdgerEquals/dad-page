const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(6000);
  await p.evaluate(() => { window.__n = { arp: [], lead: [] }; DadAutoDJ._kit.voiceHook(function (part, lay, m, t, d, v) { if (part === 'lead') __n.lead.push(m); }); const I = DadAutoDJ._kit.INST, f = I.juno; I.juno = function (tr, fr) { __n.arp.push(Math.round(69 + 12 * Math.log2(fr / 440))); return f.apply(this, arguments); }; });
  await p.evaluate(() => { DadAutoDJ.desk.dial('fmM', -1); DadAutoDJ.desk.setPick('electro'); }); for (let i = 0; i < 60; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === 'electro') break; await p.waitForTimeout(500); }
  await p.evaluate(() => { __n.arp = []; __n.lead = []; }); await p.waitForTimeout(40000);
  const r = await p.evaluate(() => { const a = __n.arp, l = __n.lead, span = x => x.length ? Math.max(...x) - Math.min(...x) : 0, mv = x => { const d = {}; for (let i = 1; i < x.length; i++) { const k = x[i] - x[i - 1]; d[k] = (d[k] || 0) + 1; } return Object.keys(d).sort((p, q) => d[q] - d[p]).slice(0, 8).map(k => k + ':' + d[k]).join(' '); };
    return { arpN: a.length, arpSpan: span(a), arpMoves: mv(a), arpHead: a.slice(0, 24).join(','), leadN: l.length, leadSpan: span(l), leadMoves: mv(l) }; });
  console.log(JSON.stringify(r, null, 1)); console.log('errors:', errs.length ? errs.join(' / ') : 'none'); await b.close(); })();
