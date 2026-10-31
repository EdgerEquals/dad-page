const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  const ok = (n, v, x) => console.log((v ? 'PASS ' : 'FAIL ') + n + '  [' + (typeof x === 'string' ? x : JSON.stringify(x)) + ']');
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(5000);
  await p.evaluate(() => { DadAutoDJ.desk.dial('fmM', 0); DadAutoDJ.desk.dial('fmU', 2); DadAutoDJ.desk.dial('lenE', 1); DadAutoDJ.desk.setPick('electro'); });   // 1-bar phrases: the whole electro form in 20 bars (melbuild1: Electronic length x1 here, so it still fits the 80 s watch)
  for (let i = 0; i < 60; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === 'electro') break; await p.waitForTimeout(500); }
  await p.evaluate(() => { window.__h = []; DadAutoDJ._kit.voiceHook(function (part, lay) { const tk = lay && (lay.tk || lay.trk); if (!tk || tk.leaving || tk.genre !== 'electro') return; __h.push([tk.fx ? tk.fx.s.n : '-', part, lay && lay.ch || '']); }); });
  const seen = {}; const t0 = Date.now();
  while (Date.now() - t0 < 80000) { const l = await p.evaluate(() => { const x = DadAutoDJ.desk.live(); return x && x.form ? x.form.sec + '|' + x.genre : null; }); if (l) seen[l] = (seen[l] || 0) + 1; await p.waitForTimeout(400); }
  const h = await p.evaluate(() => __h.slice());
  const by = {}; h.forEach(([s, part, ch]) => { by[s] = by[s] || {}; const k = part === 'chords' ? ch || 'chords' : part; by[s][k] = (by[s][k] || 0) + 1; });
  for (const k in by) console.log(k.padEnd(10), JSON.stringify(by[k]));
  console.log('sections seen:', Object.keys(seen).join(', '));
  ok('electro walks its form', ['intro|electro', 'groove|electro', 'breakdown|electro', 'drop|electro'].every(k => seen[k]), Object.keys(seen));
  ok('intro: no bass, chords, pad or lead', by.intro && !by.intro.bass && !by.intro.chords && !by.intro.pad && !by.intro.lead, by.intro);
  ok('breakdown: no bass, pad and lead play', by.breakdown && !by.breakdown.bass && (by.breakdown.pad || by.breakdown.lead), by.breakdown);
  ok('drop: everything', by.drop && by.drop.bass && by.drop.lead, by.drop);
  const drum = await p.evaluate(() => new Promise(done => { const r = []; const D = DadAutoDJ._kit; done(true); }));
  await p.evaluate(() => DadDJPanel.open()); await p.waitForTimeout(2000); await p.evaluate(() => document.querySelectorAll('#dj-desk .is-folded').forEach(s => s.classList.remove('is-folded')));
  const ui = await p.evaluate(() => ({ form: [...document.querySelectorAll('[data-strip="style"] .dk-sws')[1].querySelectorAll('.dk-sw')].map(b => b.textContent + ':' + b.getAttribute('aria-pressed')).join(' '), read: [...document.querySelectorAll('[data-strip="style"] .dk-txl')].map(x => x.textContent).find(t => !/BPM/.test(t)) || '',
    sends: document.querySelectorAll('[data-strip="mixer"] .dk-mini-f').length, fad: document.querySelectorAll('[data-strip="style"] .dk-f').length }));
  ok('desk: form row, readout, 10 Form knobs (3 + 7 emergent) + tempo + tempo lock, no mixer sends', /written:true/.test(ui.form) && /electro/.test(ui.read) && ui.sends === 0 && ui.fad === 12, ui);
  await p.evaluate(() => DadAutoDJ.desk.dial('fmM', -1)); await p.waitForTimeout(3000); const off = await p.evaluate(() => DadAutoDJ.desk.live().form); ok('form off = the old arc', off === null, off);
  ok('no page errors', !errs.length, errs.join(' / ') || 'none'); await b.close(); })();
