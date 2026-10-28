// LOAD GUARD (Danny 19:01 AWST 28 Oct, cutting out on the phone): block the page's main thread a few times; the guard must rise, write a
// 'health:' line to the sound log, and come back down after calm windows. The desk's System strip shows it.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  const ok = (n, v, x) => console.log((v ? 'PASS ' : 'FAIL ') + n + '  [' + (typeof x === 'string' ? x : JSON.stringify(x)) + ']');
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(5000);
  await p.evaluate(() => { DadAutoDJ.desk.setPick('electro'); RhythmContinuity.audio.clearLog(); }); await p.waitForTimeout(12000);
  const g0 = await p.evaluate(() => DadAutoDJ._kit.guard());
  for (let i = 0; i < 4; i++) { await p.evaluate(() => { const t = performance.now(); while (performance.now() - t < 800) {} }); await p.waitForTimeout(2500); }   // four 0.8 s stalls of the main thread
  await p.waitForTimeout(8000); const g1 = await p.evaluate(() => DadAutoDJ._kit.health());
  ok('the guard rises when the page stalls', g0 === 0 && g1.guard >= 1, { before: g0, after: g1 });
  const log = await p.evaluate(() => RhythmContinuity.audio.log().filter(l => /health:/.test(l)));
  ok('the sound log says what happened', log.length > 0, log.slice(-2).join(' / '));
  await p.waitForTimeout(75000); const g2 = await p.evaluate(() => DadAutoDJ._kit.health());
  ok('calm again, it comes back down', g2.guard < g1.guard, { up: g1.guard, now: g2.guard });
  await p.locator('#dj-edit').first().tap().catch(() => {}); await p.waitForTimeout(2500);
  const line = await p.evaluate(() => [...document.querySelectorAll('#dj-desk [data-strip="system"] .dk-txl')].map(x => x.textContent).filter(t => /audio clock/.test(t)).join(''));
  ok('the System strip shows the guard', /layers/.test(line), line);
  ok('no page errors', !errs.length, errs.join(' / ') || 'none'); await b.close(); })();
