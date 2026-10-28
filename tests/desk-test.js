const { chromium } = require('playwright'); const R = [];
function ok(n, c, x) { R.push((c ? 'PASS ' : 'FAIL ') + n + (x ? '  [' + x + ']' : '')); }
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const unfold = async () => p.evaluate(() => document.querySelectorAll('#dj-desk .is-folded').forEach(s => s.classList.remove('is-folded'))); const tap = async sel => { await unfold(); await p.locator(sel).first().scrollIntoViewIfNeeded(); const bb = await p.locator(sel).first().boundingBox(); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); };
  await tap('#dj-pill'); await p.waitForTimeout(6000);
  await tap('#dj-edit'); await p.waitForTimeout(1500);
  let s = await p.evaluate(() => ({ open: document.documentElement.hasAttribute('data-desk'), vis: !!document.getElementById('dj-desk') && getComputedStyle(document.getElementById('dj-desk')).display, pop: !document.getElementById('qh-djpop').hidden, ex: document.getElementById('dj-edit').getAttribute('aria-expanded'), playing: DadAutoDJ.playing, faders: document.querySelectorAll('#dj-desk .dk-f').length, strips: [...document.querySelectorAll('#dj-desk .dk-s')].map(x => x.dataset.strip + (x.classList.contains('is-folded') ? '(f)' : '')).join(' ') }));
  ok('faders button opens the desk as a page, sound untouched', s.open && s.vis === 'block' && !s.pop && s.ex === 'true' && s.playing, JSON.stringify(s));
  await p.waitForTimeout(2500); await p.screenshot({ path: process.argv[3] + '-1.png' });
  // mixer: solo drums, check engine
  const chs = await p.evaluate(() => DadAutoDJ.desk.CHS.join(','));
  await tap('.dk-ch:nth-child(1) .dk-so'); await p.waitForTimeout(300);
  let m = await p.evaluate(() => ({ on: DadAutoDJ.desk.CHS.map(c => c + ':' + (DadAutoDJ.desk.on(c) ? 1 : 0)).join(' '), mx: JSON.stringify(DadAutoDJ.desk.mx.s) }));
  ok('solo drums: only drums on', /drums:1 bass:0/.test(m.on), m.on);
  await p.waitForTimeout(4000); const meters = await p.evaluate(() => DadAutoDJ.desk.CHS.map(c => c + ':' + DadAutoDJ.desk.meter(c).toFixed(2)).join(' '));
  ok('meters: drums moving, the rest silent', /drums:0\.[1-9]/.test(meters) && /bass:0\.00/.test(meters), meters);
  await p.screenshot({ path: process.argv[3] + '-2.png' });
  await tap('.dk-ch:nth-child(1) .dk-so'); await p.waitForTimeout(200);
  await tap('.dk-ch:nth-child(2) .dk-m'); await p.waitForTimeout(200);
  m = await p.evaluate(() => DadAutoDJ.desk.CHS.map(c => c + ':' + (DadAutoDJ.desk.on(c) ? 1 : 0)).join(' ')); ok('mute bass', /bass:0/.test(m) && /drums:1/.test(m), m);
  // echo send up on lead (channel 6)
  const se = await p.evaluate(() => ({ f: document.querySelectorAll('#dj-desk .dk-mini-f').length, e: DadAutoDJ.desk.mx.e.lead | 0 })); ok('no send faders in the mixer (removed 07:48)', se.f === 0 && se.e === 0, se);
  // a drums fader: energy up
  const e0 = await p.evaluate(() => DadAutoDJ.desk.rd('energy')); await tap('[data-strip="drums"] .dk-f:nth-child(1) .dk-kh2.u'); const e1 = await p.evaluate(() => DadAutoDJ.desk.rd('energy'));
  ok('energy fader steps up', e1 > e0, e0 + ' -> ' + e1);
  // track tap: tap near the top of 808 character track => max
  await unfold(); const kh = p.locator('[data-strip="drums"] .dk-f:nth-child(10) .dk-kh2.u'); await kh.scrollIntoViewIfNeeded(); await kh.dispatchEvent('pointerdown'); await p.waitForTimeout(2500); await kh.dispatchEvent('pointerup');
  const c8 = await p.evaluate(() => DadAutoDJ.desk.dial('c808')); ok('holding the top half turns the knob to max (808 character)', Math.abs(c8 - 2.618) < 0.01, 'c808=' + c8);
  const kn = await p.evaluate(() => ({ knobs: document.querySelectorAll('#dj-desk .dk-knob').length, lit: document.querySelectorAll('[data-strip="drums"] .dk-f:nth-child(10) .dk-ks.on').length, vu: document.querySelectorAll('[data-strip="mixer"] .dk-vu').length, lvl: document.querySelectorAll('[data-strip="mixer"] .dk-knob').length }));
  ok('knobs everywhere, mixer has 8 stereo VUs and 8 level knobs, the ring lights to the top', kn.knobs > 40 && kn.vu === 8 && kn.lvl === 8 && kn.lit === 20, kn);
  const lv = await p.locator('[data-strip="mixer"] .dk-ch:nth-child(2) .dk-kh2.d'); await lv.scrollIntoViewIfNeeded(); await lv.dispatchEvent('pointerdown'); await lv.dispatchEvent('pointerup'); await lv.dispatchEvent('pointerdown'); await lv.dispatchEvent('pointerup');
  const L2 = await p.evaluate(() => DadAutoDJ.desk.level('bass')); ok('bass level down two rungs', L2 === -2, L2);
  const up = await p.locator('[data-strip="mixer"] .dk-ch:nth-child(1) .dk-kh2.u'); for (let i = 0; i < 3; i++) { await up.dispatchEvent('pointerdown'); await up.dispatchEvent('pointerup'); }
  const L3 = await p.evaluate(() => DadAutoDJ.desk.level('drums')); ok('drums driven up three rungs (above 0 dB)', L3 === 3, L3);
  const lab = await p.evaluate(() => document.querySelector('[data-strip="mixer"] .dk-ch:nth-child(1) .dk-val').textContent); ok('the drive shows as + dB drive', /^\+12\.5 dB drive$/.test(lab), lab);
  await p.evaluate(() => DadAutoDJ.desk.level('drums', 0)); await p.waitForTimeout(1500); const l0 = await p.evaluate(() => DadAutoDJ.out.level); await p.evaluate(() => DadAutoDJ.desk.level('drums', 5)); await p.waitForTimeout(2500); const l5 = await p.evaluate(() => DadAutoDJ.out.level);
  ok('full drive on the drums is louder and still finite', isFinite(l5) && l5 > l0, { l0, l5 }); await p.evaluate(() => { DadAutoDJ.desk.level('drums', 0); DadAutoDJ.desk.level('bass', 0); });
  // style switch
  await unfold(); await p.locator('[data-strip="style"] .dk-sw', { hasText: /^electro$/ }).first().tap(); const pk = await p.evaluate(() => DadAutoDJ.desk.pick); ok('style switch picks electro', pk === 'electro', pk);
  // fold
  await tap('[data-strip="harmony"] .dk-sh'); const fd = await p.evaluate(() => document.querySelector('[data-strip="harmony"]').classList.contains('is-folded')); ok('tap a strip name folds it', fd, '' + fd);
  // history + reload persistence
  const h = await p.evaluate(() => DjDesk.history().map(x => x[1]).join(',')); ok('history logs the moves', /solo\.drums/.test(h) && /mute\.bass/.test(h) && /rd\.energy/.test(h), h);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(4000);
  const kept = await p.evaluate(() => ({ m: DadAutoDJ.desk.mx.m.bass, e: DadAutoDJ.desk.mx.e.lead, c8: DadAutoDJ.desk.dial('c808') }));
  ok('mute, send and dials kept after reload', kept.m === true && Math.abs(kept.c8 - 2.618) < 0.01, JSON.stringify(kept));
  await tap('#dj-edit'); await p.waitForTimeout(1200); await tap('#dj-edit'); await p.waitForTimeout(300);
  const cl = await p.evaluate(() => ({ open: document.documentElement.hasAttribute('data-desk'), home: getComputedStyle(document.querySelector('#home-main > :not(#dj-desk)')).display }));
  ok('the faders button closes back to the home page', !cl.open && cl.home !== 'none', JSON.stringify(cl));
  ok('no page errors', !errs.length, errs.join(' / '));
  await b.close(); console.log(R.join('\n')); })();
