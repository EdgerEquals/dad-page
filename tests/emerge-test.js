const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  const ok = (n, v, x) => console.log((v ? 'PASS ' : 'FAIL ') + n + '  [' + (typeof x === 'string' ? x : JSON.stringify(x)) + ']');
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(5000);
  // the plan is a pure function of seed, style and dials
  const pl = await p.evaluate(() => { const K = DadAutoDJ._kit; const a = JSON.stringify(K.emerge('electro', 12345, 0.5)), b2 = JSON.stringify(K.emerge('electro', 12345, 0.5)), c2 = JSON.stringify(K.emerge('electro', 777, 0.5));
    const all = []; for (let s = 1; s < 300; s++) all.push(K.emerge(['electro', 'club', 'song'][s % 3], Math.imul(s, 2654435761) | 0, (s % 5) / 4));
    const drops = all.filter(S => S.some((q, i) => q.f === 'drop' && i > 0 && S[i - 1].f === 'roll')).length, bad = all.filter(S => S.some((q, i) => q.f === 'drop' && !(i > 0 && S[i - 1].f === 'roll'))).length;
    const bdAfterIntro = all.filter(S => { const i = S.findIndex(q => q.lv === 'low'); return i >= 0 && S.slice(0, i).every(q => q.lv === 'intro' || q.n === S[0].n); }).length, ends = all.every(S => S[S.length - 1].f === 'out'), bars = all.map(S => S.reduce((t, q) => t + q.b, 0)).sort((x, y) => x - y);
    return { same: a === b2, differ: a !== c2, drops, bad, bdAfterIntro, ends, bars: [bars[0], bars[bars.length >> 1], bars[bars.length - 1]], n: all.length, ex: JSON.parse(a).map(q => q.n + ':' + q.b).join(' > ') }; });
  console.log('example:', pl.ex);
  ok('the same seed gives the same plan, another seed another', pl.same && pl.differ, pl);
  ok('every drop follows a build, every track ends on its outro', pl.bad === 0 && pl.ends && pl.drops > 0, { drops: pl.drops, bad: pl.bad });
  ok('no breakdown straight after the intro', pl.bdAfterIntro === 0, pl.bdAfterIntro);
  ok('tracks between 40 and 120 bars', pl.bars[0] >= 40 && pl.bars[2] <= 120, pl.bars);
  // live: emergent electro with 1-bar phrases (sections every few bars)
  await p.evaluate(() => { DadAutoDJ.desk.dial('fmM', -3); DadAutoDJ.desk.dial('fmU', 1); DadAutoDJ.desk.setPick('electro'); });
  for (let i = 0; i < 60; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === 'electro') break; await p.waitForTimeout(500); }
  await p.evaluate(() => { window.__h = []; DadAutoDJ._kit.voiceHook(function (part, lay) { const tk = lay && (lay.tk || lay.trk); if (!tk || tk.leaving || tk.genre !== 'electro' || !tk.fx) return; __h.push([tk.fx.s.lv || '-', part]); }); });
  const seen = {}, names = {}; let pump = null; const t0 = Date.now();
  while (Date.now() - t0 < 45000) { const l = await p.evaluate(() => { const x = DadAutoDJ.desk.live(); return x && x.form ? { s: x.form.sec, nm: x.form.name, pump: x.form.pump } : null; }); if (l) { seen[l.s] = 1; names[l.nm] = 1; if (l.pump) pump = l.pump; } await p.waitForTimeout(400); }
  const h = await p.evaluate(() => __h.slice()), by = {}; h.forEach(([lv, part]) => { by[lv] = by[lv] || {}; by[lv][part] = (by[lv][part] || 0) + 1; });
  for (const k in by) console.log(k.padEnd(8), JSON.stringify(by[k]));
  ok('the live form is emergent electro', Object.keys(names).some(n => /^emergent electro/.test(n)), Object.keys(names));
  ok('it moves through sections', Object.keys(seen).length >= 3, Object.keys(seen));
  ok('the desk sees the pumps', pump && isFinite(pump.sec) && isFinite(pump.trk), pump);
  ok('a breakdown (if one came) has no bass, the peak has bass', (!by.low || !by.low.bass) && by.high && by.high.bass, { low: by.low, high: by.high });
  await p.evaluate(() => DadDJPanel.open()); await p.waitForTimeout(2000); await p.evaluate(() => document.querySelectorAll('#dj-desk .is-folded').forEach(s => s.classList.remove('is-folded')));
  const ui = await p.evaluate(() => ({ form: [...document.querySelectorAll('[data-strip="style"] .dk-sws')[1].querySelectorAll('.dk-sw')].map(b => b.textContent + ':' + b.getAttribute('aria-pressed')).join(' '), read: [...document.querySelectorAll('[data-strip="style"] .dk-txl')].map(x => x.textContent).find(t => !/BPM/.test(t)) || '', knobs: document.querySelectorAll('[data-strip="style"] .dk-f').length }));
  ok('desk: emergent pressed, 10 Form knobs + tempo + tempo lock, readout', /emergent:true/.test(ui.form) && ui.knobs === 12 && /emergent/.test(ui.read), ui);
  await p.evaluate(() => { DadAutoDJ.desk.dial('fmU', 4); DadAutoDJ.desk.dial('fmM', -1); });
  ok('no page errors', !errs.length, errs.join(' / ') || 'none'); await b.close(); })();
