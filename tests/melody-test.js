// THE MELODY (Danny 12:53 AWST 28 Oct 'lock them in'): lead voices by section, a solo at long peaks, drift, build.
// Short phrases (1 bar) so a whole electro track's sections pass in about a minute; then a minute at the defaults for the numbers.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  const ok = (n, v, x) => console.log((v ? 'PASS ' : 'FAIL ') + n + '  [' + (typeof x === 'string' ? x : JSON.stringify(x)) + ']');
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(5000);
  const watch = async (secs) => { const S = []; for (let i = 0; i < secs * 2; i++) { S.push(await p.evaluate(() => { const l = DadAutoDJ.desk.live(); return l ? { g: l.genre, sec: l.form && l.form.sec, lead: l.lead } : null; })); await p.waitForTimeout(500); } return S; };
  const leadNotes = () => p.evaluate(() => { const now = Date.now(); return DadAutoDJ.notes().filter(n => n[1] === 'lead' && n[0] <= now).map(n => n[2]); });
  // phase 1: short sections, every track solos, full climb
  await p.evaluate(() => { const d = DadAutoDJ.desk; d.dial('fmM', 0); d.dial('fmU', 1); d.dial('soloP', 1); d.dial('soloA', 1); d.dial('soloL', 2); d.dial('lN', 2); d.setPick('electro'); });   // electro's written form: full (its own lead), breakdown, build, drop (the second voice)
  for (let i = 0; i < 80; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === 'electro') break; await p.waitForTimeout(500); }
  const S = (await watch(60)).filter(x => x && x.g === 'electro' && x.lead);
  const L0 = S[0] && S[0].lead; ok('electro track has a lead roster starting with the DX7', L0 && L0.all[0] === 'dx' && L0.all.length >= 2, L0 && L0.all);
  const used = [...new Set(S.map(x => x.lead.now).filter(Boolean))]; ok('the lead moved between instruments', used.length >= 2, used);
  const roles = [...new Set(S.map(x => x.lead.role))]; console.log('roles seen', roles.join(' '), '| sections', [...new Set(S.map(x => x.sec))].join(' > '));
  const skMax = Math.max(0, ...S.map(x => x.lead.sk)); ok('a solo climbed at a peak', skMax > 0.3, skMax.toFixed(2));
  const first = []; let seen = null; S.forEach(x => { const id = x.lead.all.join(','); if (x.lead.now && seen !== id) { seen = id; first.push(x.lead.now + '/' + x.lead.all[0]); } });
  ok('each track opens on its own lead voice', first.length > 0 && first.every(f => f.split('/')[0] === f.split('/')[1]), first);
  const so = S.filter(x => x.lead.sk > 0.3); ok('a solo has a voice', so.length > 0 && so.every(x => !!x.lead.now), [...new Set(so.map(x => x.lead.now))]);
  // phase 2: the defaults, one minute, the numbers against Danny's 10:23 file (18 lead notes, mostly one pitch)
  await p.evaluate(() => { const d = DadAutoDJ.desk; d.dial('fmM', -3); d.dial('fmU', 4); d.dial('lN', 3); d.dial('soloP', 0.618034); d.dial('soloA', 0.618034); d.setPick('random'); d.setPick('electro'); });
  let N = []; for (let i = 0; i < 18; i++) { await p.waitForTimeout(10000); N = await leadNotes(); if (i >= 6 && N.length >= 16) break; }   // at least 70 s, longer while the form is in sections with no lead (intro, groove, build), up to 3 minutes
  const U = [...new Set(N)].sort((a, b) => a - b);
  console.log('defaults, last minute: lead notes', N.length, 'distinct pitches', U.length, U.join(','));
  ok('lead has more than one pitch', U.length >= 4, U.length);
  ok('no page errors', !errs.length, errs.join(' / ') || 'none'); await b.close(); })();
