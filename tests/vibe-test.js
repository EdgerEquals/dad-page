// VIBE (Danny 18:57 AWST 28 Oct): one soft <-> hard knob over whatever plays: hard drives every channel (oversampled clippers), heavier
// saturation, crush at the top, drier; soft lighter saturation, wetter. Also electro's voice chance and the Vibe strip.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  const ok = (n, v, x) => console.log((v ? 'PASS ' : 'FAIL ') + n + '  [' + (typeof x === 'string' ? x : JSON.stringify(x)) + ']');
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(5000);
  await p.evaluate(() => DadAutoDJ.desk.setPick('soul')); for (let i = 0; i < 80; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === 'soul') break; await p.waitForTimeout(500); }
  const read = async (v) => { await p.evaluate(v => DadAutoDJ.desk.dial('vb', v), v); await p.waitForTimeout(7000);
    return p.evaluate(() => { const B = DadAutoDJ.desk.bus(), E = DadAutoDJ.fx && DadAutoDJ.fx.eff; return { over: B.p && B.p.over, sat: B.p && B.p.sat, crush: E && E.crush ? +E.crush.v.toFixed(3) : null, wash: E && E.wash ? +E.wash.v.toFixed(3) : null, echo: E && E.echo ? +E.echo.v.toFixed(3) : null, out: +((DadAutoDJ.out || {}).level || 0).toFixed(4) }; }); };
  const mid = await read(0), hard = await read(1), soft = await read(-1); await p.evaluate(() => DadAutoDJ.desk.dial('vb', 0));
  console.log('soul, vibe: as is', JSON.stringify(mid), '| hard', JSON.stringify(hard), '| soft', JSON.stringify(soft));
  ok('hard: the master saturation sits closer (heavier), soft: further (lighter)', hard.over != null && hard.over < mid.over && soft.over > mid.over, { soft: soft.over, mid: mid.over, hard: hard.over });
  ok('hard: the crush comes in at the top', hard.crush > mid.crush, { mid: mid.crush, hard: hard.crush });
  ok('soft is wetter than hard (wash)', soft.wash > hard.wash, { soft: soft.wash, hard: hard.wash });
  ok('hard is loud but finite', isFinite(hard.out) && hard.out > 0, hard.out);
  await p.evaluate(() => DadAutoDJ.desk.setPick('electro')); for (let i = 0; i < 80; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === 'electro') break; await p.waitForTimeout(500); } await p.waitForTimeout(3000);
  const vc = await p.evaluate(() => { const P = DadAutoDJ.voice.plan(); return P && P.chance; });
  ok('an electro track has a voice with chance PHI^-1 (about 3 in 5)', Math.abs(vc - 0.618034) < 1e-3, vc);
  await p.locator('#dj-edit').first().tap().catch(() => {}); await p.waitForTimeout(1500);
  const nm = await p.evaluate(() => [...document.querySelectorAll('#dj-desk [data-strip="vibe"] .dk-nm')].map(x => x.textContent).join(','));
  ok('the Vibe strip has the knob and its four reaches', /vibe/.test(nm) && /drive reach/.test(nm) && /space \+ effects reach/.test(nm), nm);
  ok('no page errors', !errs.length, errs.join(' / ') || 'none'); await b.close(); })();
