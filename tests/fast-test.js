const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(9000);
  const timeTo = async (g, setup) => { await p.evaluate(setup); const t0 = Date.now(); await p.evaluate(g => DadAutoDJ.desk.setPick(g), g);
    for (let i = 0; i < 160; i++) { const tg = await p.evaluate(() => DadAutoDJ.track.genre); if (tg === g) return ((Date.now() - t0) / 1000).toFixed(1); await p.waitForTimeout(250); } return '>40'; };
  console.log('fast (1 bar, 1.6 s): electro in', await timeTo('electro', () => { DadAutoDJ.desk.dial('dkBars', 1); DadAutoDJ.desk.dial('dkFade', 1); }), 's');
  await p.waitForTimeout(6000);
  console.log('fast again: soul in', await timeTo('soul', () => {}), 's'); await p.waitForTimeout(6000);
  console.log('radio pacing: folk in', await timeTo('folk', () => { DadAutoDJ.desk.dial('dkBars', 0); DadAutoDJ.desk.dial('dkFade', 0); }), 's'); await p.waitForTimeout(4000);
  await p.evaluate(() => { DadAutoDJ.desk.dial('dkBars', 1); DadAutoDJ.desk.dial('dkFade', 1); });
  // rebuild on a harmony fader: same genre and seed, new born
  await p.waitForTimeout(3000); await p.evaluate(() => { window.__tk = []; DadAutoDJ._kit.voiceHook(function (part, lay) { const tk = lay && (lay.tk || lay.trk); if (tk && !tk.leaving && __tk.indexOf(tk) < 0) __tk.push(tk); }); });
  await p.waitForTimeout(1500); const a = await p.evaluate(() => ({ n: __tk.length, g: DadAutoDJ.track.genre, born: DadAutoDJ.track.born })); const t1 = Date.now();
  await p.evaluate(() => DadAutoDJ.desk.dial('modeR', 3));
  let r = null; for (let i = 0; i < 100; i++) { const t = await p.evaluate(() => ({ n: __tk.length, g: DadAutoDJ.track.genre, born: DadAutoDJ.track.born })); if (t.n > a.n) { r = t; break; } await p.waitForTimeout(250); }
  console.log('harmony fader rebuild:', r ? ('new track ' + r.g + ' (was ' + a.g + ') in ' + ((Date.now() - t1) / 1000).toFixed(1) + ' s, ' + (r.born === a.born ? 'keeps its place (same born)' : 'new born')) : 'none');
  console.log('errors:', errs.length ? errs.join(' / ') : 'none'); await b.close(); })();
