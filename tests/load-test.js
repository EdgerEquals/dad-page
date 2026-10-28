// LOAD (Danny 14:15 AWST 28 Oct, Claude chat: 'The Audio is dropping out'): two minutes of electro; sounds must start on time
// (the stall-aware look-ahead), the 808 must play from its rendered takes, driving a channel must not break anything.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  const ok = (n, v, x) => console.log((v ? 'PASS ' : 'FAIL ') + n + '  [' + (typeof x === 'string' ? x : JSON.stringify(x)) + ']');
  await p.addInitScript(() => { window.__late = { n: 0, late: 0, big: 0, worst: 0, buf: 0, osc: 0 };
    [AudioScheduledSourceNode.prototype, AudioBufferSourceNode.prototype, OscillatorNode.prototype].forEach(P => { if (!Object.prototype.hasOwnProperty.call(P, 'start')) return; const f = P.start;   // buffer sources have their own start()
      P.start = function (when) { const c = this.context, L = window.__late; if (c && c.constructor && c.constructor.name !== 'OfflineAudioContext') { if (this instanceof AudioBufferSourceNode) L.buf++; else if (this instanceof OscillatorNode) L.osc++;
        if (when) { const d = c.currentTime - when; L.n++; if (d > 0.005) { L.late++; L.worst = Math.max(L.worst, d); if (d > 0.05) L.big++; } } } return f.apply(this, arguments); }; }); });
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(5000);
  await p.evaluate(() => DadAutoDJ.desk.setPick('electro')); for (let i = 0; i < 80; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === 'electro') break; await p.waitForTimeout(500); }
  await p.waitForTimeout(15000); await p.evaluate(() => { window.__late = { n: 0, late: 0, big: 0, worst: 0, buf: 0, osc: 0 }; });
  await p.waitForTimeout(60000);
  await p.evaluate(() => DadAutoDJ.desk.level('drums', 3)); await p.waitForTimeout(20000); await p.evaluate(() => DadAutoDJ.desk.level('drums', 0)); await p.waitForTimeout(20000);
  const L = await p.evaluate(() => window.__late);
  ok('sounds start on time (late by more than 50 ms: under 1 in 200)', L.n > 500 && L.big / L.n < 0.005, { started: L.n, late: L.late, over50ms: L.big, worstMs: Math.round(L.worst * 1000) });
  const tk = await p.evaluate(() => { const D = DadAutoDJ._kit, k8 = D && D.k8 && D.k8(); return k8; }); ok('the 808 plays from rendered takes', L.buf > 200 && tk && tk.sounds > 0 && tk.takes >= tk.sounds, { bufferStarts: L.buf, oscillatorStarts: L.osc, kept: tk });
  ok('no page errors', !errs.length, errs.join(' / ') || 'none'); await b.close(); })();
