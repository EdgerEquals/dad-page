const { chromium } = require('playwright'); const R = [];
function ok(n, c, x) { R.push((c ? 'PASS ' : 'FAIL ') + n + (x ? '  [' + x + ']' : '')); }
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });
  await c.addInitScript(() => { window.__k = { dxNodes: 0, dxOn: 0, msgs: {} };
    const AW = window.AudioWorkletNode; window.AudioWorkletNode = function (ctx, name, opt) { const n = new AW(ctx, name, opt); if (name === 'ed-dx7') { __k.dxNodes++; const pm = n.port.postMessage.bind(n.port); n.port.postMessage = function (m) { if (m && m.k === 'on') { __k.dxOn++; __k.msgs[m.id] = (__k.msgs[m.id] || 0) + 1; } return pm(m); }; } return n; }; window.AudioWorkletNode.prototype = AW.prototype;
    const oc = AudioNode.prototype.connect; window.__an = null;
    AudioNode.prototype.connect = function (d) { const r = oc.apply(this, arguments); try { if (d instanceof AudioDestinationNode) { if (!window.__an) { window.__an = this.context.createAnalyser(); window.__an.fftSize = 2048; } oc.call(this, window.__an); } } catch (e) {} return r; }; });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(4000);
  const cdp = await c.newCDPSession(p); await cdp.send('Performance.enable');
  const cpu = async (sec) => { const m0 = (await cdp.send('Performance.getMetrics')).metrics; await p.waitForTimeout(sec * 1000); const m1 = (await cdp.send('Performance.getMetrics')).metrics;
    const g = (m, k) => (m.find(x => x.name === k) || {}).value; return +(100 * (g(m1, 'TaskDuration') - g(m0, 'TaskDuration')) / (g(m1, 'Timestamp') - g(m0, 'Timestamp'))).toFixed(1); };
  const before = { genre: await p.evaluate(() => DadAutoDJ.track.genre), cpu: await cpu(10) };
  const inst = await p.evaluate(() => { const I = DadAutoDJ._kit && DadAutoDJ._kit.INST; if (!I) return 'no INST'; window.__c = {}; ['jup', 'juno', 'junopad', 'dx', 'bell', 'stab', 'square'].forEach(k => { const f = I[k]; if (!f) return; I[k] = function () { __c[k] = (__c[k] || 0) + 1; return f.apply(this, arguments); }; }); return Object.keys(I).join(','); });
  await p.evaluate(() => { DadAutoDJ.desk.dial('fmM', -1); DadAutoDJ.desk.setPick('electro'); });
  for (let i = 0; i < 90; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === 'electro') break; await p.waitForTimeout(500); }
  await p.waitForTimeout(4000);
  const meas = (sec) => p.evaluate(async (sec) => { const a = window.__an, d = new Float32Array(a.fftSize); let pk = 0, ss = 0, n = 0, t0 = performance.now();
    while (performance.now() - t0 < sec * 1000) { a.getFloatTimeDomainData(d); for (const x of d) { pk = Math.max(pk, Math.abs(x)); ss += x * x; n++; } await new Promise(r => setTimeout(r, 40)); }
    return { peak_dB: +(20 * Math.log10(pk)).toFixed(1), rms_dB: +(10 * Math.log10(ss / n)).toFixed(1) }; }, sec);
  const ec = await cpu(10); const lv = await meas(15);
  const k = await p.evaluate(() => ({ c: window.__c, k: window.__k, g: DadAutoDJ.track.genre }));
  ok('electro playing', k.g === 'electro', k.g);
  ok('INST exposed for the check', inst !== 'no INST', inst.slice(0, 80));
  ok('Jupiter plays the stabs', (k.c.jup || 0) > 4 && !(k.c.stab > (k.c.jup || 0) * 2), JSON.stringify(k.c));
  ok('Juno plays the arp and the pad', (k.c.juno || 0) > 8 && (k.c.junopad || 0) > 0, JSON.stringify(k.c));
  ok('no chip blips in electro', !(k.c.square > 0), 'square ' + (k.c.square || 0));
  ok('DX7 worklet node made, bell notes sent', k.k.dxNodes >= 1 && (k.k.msgs.bell || 0) > 0, JSON.stringify(k.k) + ' dx calls ' + (k.c.dx || 0));
  ok('levels sane', lv.peak_dB < -3, JSON.stringify(lv));
  ok('CPU (main thread busy %)', true, before.genre + ' ' + before.cpu + ' % -> electro ' + ec + ' %');
  ok('no page errors', !errs.length, errs.join(' / '));
  await b.close(); console.log(R.join('\n'));
})();
