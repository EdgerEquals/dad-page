// TEMPO (Danny 18:19 AWST 28 Oct): electro's energy is held in 120-130 (a resonance, not a clamp); the tempo fader slides every style on top.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  const ok = (n, v, x) => console.log((v ? 'PASS ' : 'FAIL ') + n + '  [' + (typeof x === 'string' ? x : JSON.stringify(x)) + ']');
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(5000);
  const bpm = () => p.evaluate(() => { const l = DadAutoDJ.desk.live(); return l && l.genre === 'electro' ? +l.bpm.toFixed(2) : null; });
  const seen = []; for (const g of ['soul', 'electro', 'ambient', 'electro', 'folk', 'electro']) { await p.evaluate(g => DadAutoDJ.desk.setPick(g), g); for (let i = 0; i < 80; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === g) break; await p.waitForTimeout(500); } if (g === 'electro') { await p.waitForTimeout(4000); seen.push(await bpm()); } }
  ok('electro sits in its 120-130 home as the energy changes', seen.length === 3 && seen.every(x => x >= 119.5 && x <= 130.5), seen);
  const b0 = await bpm(); await p.evaluate(() => DadAutoDJ.desk.dial('tpo', -1)); await p.waitForTimeout(12000); const b1 = await bpm();
  ok('the tempo fader slides it down past the home (one rung = x0.618)', b1 && Math.abs(b1 / b0 - 0.618) < 0.03, { before: b0, after: b1 });
  await p.evaluate(() => DadAutoDJ.desk.dial('tpo', 0)); await p.waitForTimeout(12000); const b2 = await bpm();
  ok('back to 0, back home', b2 && Math.abs(b2 - b0) < 1, { home: b0, back: b2 });
  await p.locator('#dj-edit').first().scrollIntoViewIfNeeded().catch(() => {}); await p.locator('#dj-edit').first().tap().catch(() => {}); await p.waitForTimeout(1500);   // open the desk
  const lab = await p.evaluate(() => [...document.querySelectorAll('#dj-desk [data-strip="style"] .dk-nm')].map(x => x.textContent).join(',') + ' | ' + ((document.querySelector('#dj-desk [data-strip="style"] .dk-txl:not([hidden])') || {}).textContent || ''));
  ok('the Style strip has tempo and tempo lock', /tempo/.test(lab) && /tempo lock/.test(lab), lab);
  ok('no page errors', !errs.length, errs.join(' / ') || 'none'); await b.close(); })();
