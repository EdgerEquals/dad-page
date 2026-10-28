const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  const ok = (n, v, x) => console.log((v ? 'PASS ' : 'FAIL ') + n + '  [' + (typeof x === 'string' ? x : JSON.stringify(x)) + ']');
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(5000);
  await p.evaluate(() => { DadAutoDJ.desk.dial('fmM', -1); DadAutoDJ.desk.setPick('electro'); }); for (let i = 0; i < 60; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === 'electro') break; await p.waitForTimeout(500); }
  const form = await p.evaluate(() => DadAutoDJ.desk.live().form); ok('form waits switched off', form === null, form);
  await p.waitForTimeout(3000); let b0 = await p.evaluate(() => DadAutoDJ.desk.bus()); ok('electro plays through the electro template (VCA)', b0.p && b0.p.tpl === 'electro' && b0.p.model === 'VCA' && b0.p.own, b0.p);
  const hits = []; for (let i = 0; i < 12; i++) { await p.waitForTimeout(2000); hits.push(+(await p.evaluate(() => DadAutoDJ.desk.bus().hit)).toFixed(2)); }
  const tail = hits.slice(-5), avg = tail.reduce((a, q) => a + q, 0) / tail.length; ok('the servo brings the hits near the 2 dB target', avg > 0.8 && avg < 4, hits.join(' '));
  await p.evaluate(() => DadAutoDJ.desk.dial('tpM', 7)); await p.waitForTimeout(500); let b1 = await p.evaluate(() => DadAutoDJ.desk.bus().p); ok('orchestral template: vari-mu, 0.5 dB, no saturation', b1.tpl === 'orchestral' && b1.model === 'vari-mu' && Math.abs(b1.target - 0.5 * Math.pow(1.618034, 0.618034 * 2 * 0)) < 0.6 && !b1.sat, b1);
  await p.evaluate(() => DadAutoDJ.desk.dial('mbM', 2)); await p.waitForTimeout(300); let b2 = await p.evaluate(() => DadAutoDJ.desk.bus().p); ok('a forced FET brings its own settings', b2.model === 'FET' && !b2.own, b2);
  await p.evaluate(() => { DadAutoDJ.desk.dial('mbM', -1); }); await p.waitForTimeout(300); let b3 = await p.evaluate(() => DadAutoDJ.desk.bus().p); ok('off', b3.model === null, b3);
  const lv = []; for (const [t, sat] of [[1, 3], [3, 2], [4, 3], [6, 1]]) { await p.evaluate(([t, sat]) => { DadAutoDJ.desk.dial('mbM', 0); DadAutoDJ.desk.dial('tpM', t); DadAutoDJ.desk.dial('mbS', sat); DadAutoDJ.desk.dial('mbH', 0.146); }, [t, sat]); await p.waitForTimeout(1500);
    lv.push(await p.evaluate(() => { const o = DadAutoDJ.out; return { lvl: +(o.level || 0).toFixed(4), sat: DadAutoDJ.desk.bus().p.sat }; })); }
  ok('every saturation type plays (finite level)', lv.every(x => isFinite(x.lvl) && x.lvl > 0), lv);
  await p.evaluate(() => { ['mbS', 'mbH', 'tpM'].forEach(k => DadAutoDJ.desk.dial(k, 0)); });
  await p.evaluate(() => DadDJPanel.open()); await p.waitForTimeout(2500); await p.evaluate(() => document.querySelectorAll('#dj-desk .is-folded').forEach(s => s.classList.remove('is-folded')));
  const ui = await p.evaluate(() => { const st = document.querySelector('[data-strip="master"]'); return { rows: [...st.querySelectorAll('.dk-sws')].map(r => r.children.length), f: st.querySelectorAll('.dk-f').length, t: st.querySelector('.dk-txl').textContent, labs: [...st.querySelectorAll('.dk-val')].map(v => v.textContent).join(' | ') }; });
  ok('master strip: template row, model row, 9 master + 6 bus knobs, readout', ui.rows[0] === 10 && ui.rows[1] === 6 && ui.f === 16 && /template/.test(ui.t), ui);
  ok('no page errors', !errs.length, errs.join(' / ') || 'none'); await b.close(); })();
