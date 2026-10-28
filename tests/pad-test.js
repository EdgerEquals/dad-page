const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  const ok = (n, v, x) => console.log((v ? 'PASS ' : 'FAIL ') + n + '  [' + (typeof x === 'string' ? x : JSON.stringify(x)) + ']');
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(6000);
  await p.evaluate(() => { DadAutoDJ.desk.dial('fmM', -1); DadAutoDJ.desk.setPick('electro'); }); for (let i = 0; i < 60; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === 'electro') break; await p.waitForTimeout(500); }
  await p.waitForTimeout(4000);
  await p.evaluate(() => { window.__pl = null; DadAutoDJ._kit.voiceHook(function (part, lay) { if (part === 'chords' && lay && lay.ch === 'pad') window.__pl = lay; }); });
  for (let i = 0; i < 20; i++) { if (await p.evaluate(() => !!window.__pl)) break; await p.waitForTimeout(500); }
  const res = {};
  for (const [name, bit] of [['swell', 1], ['stab', 2], ['pluck', 4], ['gate', 8]]) {
    await p.evaluate(b => DadAutoDJ.desk.dial('padM', b), bit); await p.waitForTimeout(4500);
    res[name] = await p.evaluate(() => new Promise(done => { const L = window.__pl, ac = L.out.context, an = ac.createAnalyser(); an.fftSize = 1024; L.out.connect(an); const buf = new Float32Array(1024), xs = [];
      const iv = setInterval(() => { an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; xs.push(Math.sqrt(s / buf.length)); }, 4);
      setTimeout(() => { clearInterval(iv); L.out.disconnect(an); const mx = Math.max(...xs) || 1e-9, th = mx / 2; let up = 0, on = 0; for (let i = 0; i < xs.length; i++) { if (xs[i] > th) on++; if (i && xs[i] > th && xs[i - 1] <= th) up++; }
        let pk = 0; for (const v of xs) pk = Math.max(pk, v); done({ ser0: xs.filter((_, i) => i % 10 === 0).map(v => +(v * 1000).toFixed(1)).join(','), n: xs.length, duty: +(on / xs.length).toFixed(2), rises: up, peak: +mx.toFixed(4) }); }, 9000); }));
  }
  for (const k in res) { const r = res[k]; console.log(k, 'peak', r.peak, 'duty', r.duty, 'rises', r.rises, (r.ser0 || '').slice(0, 330)); }
  ok('stab is shorter than swell', res.stab.duty < res.swell.duty * 0.6, [res.stab.duty, res.swell.duty]); ok('stab hits as hard as the swell', res.stab.peak > res.swell.peak * Math.pow(1.618, -2), [res.stab.peak, res.swell.peak]);
  ok('pluck sits between', res.pluck.duty < res.swell.duty, [res.pluck.duty, res.swell.duty]);
  ok('gate chops (many rises)', res.gate.rises >= res.swell.rises * 2 && res.gate.rises >= 10, [res.gate.rises, res.swell.rises]);
  await p.evaluate(() => DadAutoDJ.desk.dial('padM', 6)); await p.waitForTimeout(3000);
  await p.evaluate(() => DadDJPanel.open()); await p.waitForTimeout(1200); await p.evaluate(() => document.querySelectorAll('#dj-desk .is-folded').forEach(s => s.classList.remove('is-folded')));
  const pr = await p.evaluate(() => [...document.querySelectorAll('[data-strip="pad"] .dk-sw')].map(b => b.textContent + ':' + b.getAttribute('aria-pressed')).join(' '));
  ok('desk shows stab + pluck picked', /stab:true/.test(pr) && /pluck:true/.test(pr) && /auto:false/.test(pr) && /gate:false/.test(pr), pr);
  const t = p.locator('[data-strip="pad"] .dk-sw', { hasText: /^gate$/ }).first(); await t.scrollIntoViewIfNeeded(); await t.tap();
  const m = await p.evaluate(() => DadAutoDJ.desk.dial('padM')); ok('tap gate adds it to the set', m === 14, m);
  const nf = await p.evaluate(() => document.querySelectorAll('[data-strip="pad"] .dk-f').length); ok('pad strip has 7 faders', nf === 7, nf);
  ok('no page errors', !errs.length, errs.join(' / ') || 'none'); await b.close(); })();
