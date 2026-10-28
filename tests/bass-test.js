const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  const ok = (n, v, x) => console.log((v ? 'PASS ' : 'FAIL ') + n + '  [' + (typeof x === 'string' ? x : JSON.stringify(x)) + ']');
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(6000);
  await p.evaluate(() => { DadAutoDJ.desk.dial('fmM', -1); DadAutoDJ.desk.setPick('electro'); }); for (let i = 0; i < 60; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === 'electro') break; await p.waitForTimeout(500); }
  await p.waitForTimeout(3000);
  await p.evaluate(() => { window.__b = []; DadAutoDJ._kit.voiceHook(function (part, lay, m, t, d, v) { if (part === 'bass') __b.push([m, +t.toFixed(3), +d.toFixed(3)]); }); });
  const rec = async (ms) => { await p.evaluate(() => { __b = []; }); await p.waitForTimeout(ms); return p.evaluate(() => __b.slice()); };
  const res = {};
  for (let j = 0; j < 13; j++) { await p.evaluate(j => { DadAutoDJ.desk.dial('bLib', 1); DadAutoDJ.desk.dial('bShp', 1 << j); }, j); await p.waitForTimeout(300);
    const sh = await p.evaluate(() => DadAutoDJ.desk.live().bass); const n = await rec(3000);
    const iv = n.map(x => x[0]), held = n.filter(x => x[2] > 0.2).length; res[sh] = { n: n.length, uniq: [...new Set(iv)].length, span: iv.length ? Math.max(...iv) - Math.min(...iv) : 0, held }; }
  for (const k in res) console.log(k.padEnd(14), JSON.stringify(res[k]));
  const names = Object.keys(res); ok('each shape switch plays that shape', names.length === 13 && !names.includes('random'), names.join(', '));
  ok('every shape plays notes', Object.values(res).every(r => r.n > 4), Object.values(res).map(r => r.n).join(','));
  ok('kick-lock holds long notes', res['kick-lock'] && res['kick-lock'].held > 0, res['kick-lock']);
  ok('machine 8ths stays simple (few pitches)', res['machine 8ths'] && res['machine 8ths'].uniq <= res['octave pump'].uniq + 3, [res['machine 8ths'], res['octave pump']]);
  await p.evaluate(() => { DadAutoDJ.desk.dial('bShp', 0); DadAutoDJ.desk.dial('bLib', 0); }); await p.waitForTimeout(300); const r0 = await p.evaluate(() => DadAutoDJ.desk.live().bass); ok('library share 0 = the old random line', r0 === 'random', r0);
  await p.evaluate(() => DadDJPanel.open()); await p.waitForTimeout(1200); await p.evaluate(() => document.querySelectorAll('#dj-desk .is-folded').forEach(s => s.classList.remove('is-folded')));
  const t = p.locator('[data-strip="bass"] .dk-sw', { hasText: /^gallop$/ }).first(); await t.scrollIntoViewIfNeeded(); await t.tap();
  const t2 = p.locator('[data-strip="bass"] .dk-sw', { hasText: /^funk$/ }).first(); await t2.tap();
  const m = await p.evaluate(() => DadAutoDJ.desk.dial('bShp')); ok('switches build a set (funk + gallop)', m === ((1 << 3) | (1 << 6)), m);
  await p.waitForTimeout(2500); const lab = await p.evaluate(() => document.querySelector('[data-strip="bass"] .dk-txl').textContent); ok('desk says which line is playing', /playing: /.test(lab), lab);
  const nf = await p.evaluate(() => document.querySelectorAll('[data-strip="bass"] .dk-f').length); ok('bass strip has 4 faders', nf === 4, nf);
  ok('no page errors', !errs.length, errs.join(' / ') || 'none'); await b.close(); })();
