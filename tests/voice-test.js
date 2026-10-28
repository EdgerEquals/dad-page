const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  const ok = (n, v, x) => console.log((v ? 'PASS ' : 'FAIL ') + n + '  [' + (typeof x === 'string' ? x : JSON.stringify(x)) + ']');
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(5000);
  await p.evaluate(() => { DadAutoDJ.desk.dial('fmM', -1); DadAutoDJ.desk.dial('voM', 2); DadAutoDJ.desk.setPick('electro'); }); for (let i = 0; i < 60; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === 'electro') break; await p.waitForTimeout(500); }
  for (let i = 0; i < 30 && !(await p.evaluate(() => !!DadAutoDJ.voice)); i++) await p.waitForTimeout(500);
  await p.waitForTimeout(25000); const mode = await p.evaluate(() => DadAutoDJ.voice && DadAutoDJ.voice.mode()); ok('forced machine: electro speaks as the machine', mode === 'machine', mode);
  const L = await p.evaluate(() => DadAutoDJ.voice.log().filter(x => x[1] === 'm'));
  const notes = L.map(x => x[2]), span = notes.length ? Math.max(...notes) - Math.min(...notes) : 0, steps = {}; for (let i = 1; i < notes.length; i++) { const d = Math.abs(notes[i] - notes[i - 1]); steps[d] = (steps[d] || 0) + 1; }
  console.log('syllables', L.length, 'range', Math.min(...notes), '-', Math.max(...notes), 'steps', JSON.stringify(steps));
  ok('it speaks in the male register', L.length > 5 && Math.min(...notes) >= 40 && Math.max(...notes) <= 64, [L.length, Math.min(...notes), Math.max(...notes)]);
  ok('mostly small steps', ((steps[0] || 0) + (steps[1] || 0) + (steps[2] || 0)) / Math.max(1, notes.length - 1) > 0.7, steps);
  await p.evaluate(() => DadAutoDJ.desk.dial('voM', 1)); await p.waitForTimeout(500); const m2 = await p.evaluate(() => DadAutoDJ.voice.mode()); ok('the desk can switch electro to the singer', m2 === 'singer', m2);
  // VOICE PER TRACK
  await p.evaluate(() => { DadAutoDJ.desk.dial('voM', 3); }); await p.waitForTimeout(9000); const ch = await p.evaluate(() => ({ c: DadAutoDJ.voice.choir(), n: DadAutoDJ.voice.log().filter(x => x[1] === 'c').length, mode: DadAutoDJ.voice.mode() }));
  ok('forced choir holds the chord (2-3 voices)', ch.mode === 'choir' && ch.c.n >= 2 && ch.c.n <= 3 && ch.n >= 2, ch);
  await p.evaluate(() => { DadAutoDJ.desk.dial('voM', 0); DadAutoDJ.desk.dial('voP', -9); }); await p.waitForTimeout(3000); const nv = await p.evaluate(() => ({ p: DadAutoDJ.voice.plan(), c: DadAutoDJ.voice.choir().n }));
  ok('voice tracks: never = no voice, the choir lets go', nv.p.on === false && nv.p.role === 'none' && nv.c === 0, nv);
  await p.evaluate(() => { DadAutoDJ.desk.dial('voP', 9); DadAutoDJ.desk.dial('voF', 2); DadAutoDJ.desk.dial('fmM', -1); }); await p.waitForTimeout(500);
  const pl = await p.evaluate(() => DadAutoDJ.voice.plan()); ok('always + talker: the electro track has the machine', pl.on && pl.flavName === 'talker' && pl.ch === 'machine' && ['lead', 'choir', 'none'].indexOf(pl.role) >= 0, pl);
  const odds = await p.evaluate(() => { let on = 0; for (let s = 1; s <= 400; s++) { const sd = Math.imul(s, 2654435761) >>> 0, x = (sd * 0.381966 + Math.pow(0.618034, 5)) % 1; if (x < Math.pow(0.618034, 3)) on++; } return on / 400; });
  ok('about 1 in 4 electro tracks would draw a voice', odds > 0.18 && odds < 0.3, odds);
  await p.evaluate(() => { DadAutoDJ.desk.dial('voP', 0); DadAutoDJ.desk.dial('voF', 0); DadAutoDJ.desk.dial('voM', 0); });
  ok('no page errors', !errs.length, errs.join(' / ') || 'none'); await b.close(); })();
