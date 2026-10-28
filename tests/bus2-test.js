const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  const ok = (n, v, x) => console.log((v ? 'PASS ' : 'FAIL ') + n + '  [' + (typeof x === 'string' ? x : JSON.stringify(x)) + ']');
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(5000);
  await p.evaluate(() => { DadAutoDJ.desk.dial('fmM', -1); DadAutoDJ.desk.setPick('electro'); }); for (let i = 0; i < 60; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === 'electro') break; await p.waitForTimeout(500); }
  await p.waitForTimeout(3000);
  const b0 = await p.evaluate(() => DadAutoDJ.desk.bus().buses); ok('the four-bus worklet is in, electro template', b0 && b0.p && b0.p.tpl === 'electro' && b0.p.b.map(q => q.model).join() === 'VCA,opto,opto,opto' && b0.p.par.model === 'FET' && Math.abs(b0.p.par.mix - 0.25) < 1e-6, b0 && b0.p);
  const H = []; for (let i = 0; i < 14; i++) { await p.waitForTimeout(2000); const r = await p.evaluate(() => { const x = DadAutoDJ.desk.bus().buses; return x && x.r ? { hit: x.r.hit.map(v => +v.toFixed(2)), phit: +x.r.phit.toFixed(2), lvl: +(DadAutoDJ.out.level || 0).toFixed(4) } : null; }); H.push(r); }
  const last = H.slice(-4), av = (i) => last.reduce((a, r) => a + (i < 0 ? r.phit : r.hit[i]), 0) / last.length, T = [4, 3, 1.5, 2];
  console.log('hits drums/bass/music/front/smash over time:'); H.forEach(r => r && console.log('  ' + r.hit.join(' ') + ' | ' + r.phit + '  out ' + r.lvl));
  ok('every bus squeezes something', [0, 1, 2, 3].every(i => av(i) > 0.2), [0, 1, 2, 3].map(av));
  ok('the servos bring each bus near its target (within a factor of 2.6)', [0, 1, 2, 3].every(i => av(i) > T[i] / 2.618 && av(i) < T[i] * 2.618), [0, 1, 2, 3].map(i => av(i).toFixed(2) + '/' + T[i]));
  ok('the smash copy is crushed (5 dB or more)', av(-1) > 5, av(-1).toFixed(2));
  const lv = last.map(r => r.lvl).sort((a, b) => a - b); ok('the output level is sane', (lv[1] + lv[2]) / 2 > 0.003 && lv[3] < 1, last.map(r => r.lvl));   // the median of the last four instants: one reading can land in a rhythmic stop
  await p.evaluate(() => DadAutoDJ.desk.dial('bsM', -1)); await p.waitForTimeout(800); const b1 = await p.evaluate(() => DadAutoDJ.desk.bus().buses.p); ok('off passes straight through', b1.off === true && b1.b.every(q => !q.model) && b1.par.mix === 0, b1);
  await p.evaluate(() => { DadAutoDJ.desk.dial('bsM', 0); DadAutoDJ.desk.setPick('piano'); }); for (let i = 0; i < 60; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === 'piano') break; await p.waitForTimeout(500); }
  await p.waitForTimeout(6000); const b2 = await p.evaluate(() => ({ p: DadAutoDJ.desk.bus().buses.p, lvl: DadAutoDJ.out.level })); ok('piano: its template leaves the buses straight, sound still flows', b2.p.tpl === 'piano' && b2.p.b.every(q => !q.model) && b2.lvl > 0.002, { tpl: b2.p.tpl, lvl: b2.lvl });
  await p.evaluate(() => DadDJPanel.open()); await p.waitForTimeout(2500); await p.evaluate(() => document.querySelectorAll('#dj-desk .is-folded').forEach(s => s.classList.remove('is-folded')));
  const ui = await p.evaluate(() => { const st = document.querySelector('[data-strip="master"]'); return { rows: [...st.querySelectorAll('.dk-sws')].map(r => r.children.length), f: st.querySelectorAll('.dk-f').length, t: [...st.querySelectorAll('.dk-txl')].map(x => x.textContent) }; });
  ok('master strip: a buses row, 6 more knobs, a buses readout', ui.rows.length === 3 && ui.rows[2] === 2 && ui.f === 16 && ui.t.length === 2 && /straight/.test(ui.t[1]), ui);
  ok('no page errors', !errs.length, errs.join(' / ') || 'none'); await b.close(); })();
