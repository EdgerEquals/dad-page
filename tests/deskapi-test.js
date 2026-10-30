// DESK API (Danny 14:31 AWST 30 Oct via Dashboard Bot: "Let's get the VU panels and get all that finished and pushed live"): params(), set(),
// mixer(), setLevel() on DadAutoDJ, matched to Dashboard Bot's mock (js/dj-api-mock.js). Usage: node tests/deskapi-test.js <url> [mock-data.js] [panel-dir]
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  let fails = 0; const ok = (n, v, x) => { if (!v) fails++; console.log((v ? 'PASS ' : 'FAIL ') + n + '  [' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 600) + ']'); };
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(4000);
  const shape = await p.evaluate(() => ['params', 'paramsReady', 'set', 'mixer', 'setLevel'].map(k => k + ':' + typeof DadAutoDJ[k]).join(' '));
  ok('window.DadAutoDJ has params/paramsReady/set/mixer/setLevel', !/undefined/.test(shape), shape);
  const pre = await p.evaluate(() => ({ dsk: !!window.DjDesk, scripts: [...document.scripts].filter(s => /dj-desk/.test(s.src)).length }));
  await p.evaluate(() => document.querySelector('#dj-pill').scrollIntoView({ block: 'center' })); const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(9000);
  // params
  const P = await p.evaluate(() => new Promise(res => DadAutoDJ.paramsReady(L => res(L.map(x => ({ id: x.id, label: x.label, info: x.info, type: x.type, min: x.min, max: x.max, value: x.value, steps: x.steps, labels: x.labels, def: x.def, panel: x.panel, panelLabel: x.panelLabel, panelNote: x.panelNote, section: x.section, kind: x.kind, kindName: x.kindName, disabled: x.disabled, live: x.live, src: x.energySrc, e: x.energy(), keys: Object.keys(x).join(',') }))))));
  ok('params(): the desk as data (loaded on demand, no desk script before)', pre.scripts === 0 && P.length > 50 && P.every(x => x.type === 'ladder' && Array.isArray(x.steps) && x.labels.length === x.steps.length && typeof x.e === 'number'), { pre, n: P.length, keys: P[0] && P[0].keys });
  if (process.argv[3]) { const src = fs.readFileSync(process.argv[3], 'utf8'); const S = JSON.parse(src.slice(src.indexOf('= [') + 2, src.lastIndexOf(']') + 1)).filter(x => x.id.indexOf('level.') !== 0);
    const by = {}; P.forEach(x => by[x.id] = x); const miss = S.filter(x => !by[x.id]).map(x => x.id), extra = P.filter(x => !S.some(y => y.id === x.id)).map(x => x.id), diff = []; // extra: dial.dxS (bell2) is newer than the mock data
    const vis = x => x.panel.charAt(0) === 'v' && x.panel !== 'vibe' && x.panel !== 'voice';
    const NEWER = ['dial.belS']; // bell2 (Danny 13:48 / 13:52 AWST 30 Oct) moved the bells ladder after the mock data was made
    S.forEach(m => { const r = by[m.id]; if (!r || NEWER.indexOf(m.id) >= 0) return; const want = { label: m.id.indexOf('vspeed.') === 0 ? m.section : m.label, info: m.note, panel: (vis(m) ? 'visual.' : '') + m.panel, panelLabel: (vis(m) ? 'Visual ' : '') + m.panelLabel, panelNote: m.panelNote, section: m.section, kind: m.kind, steps: m.steps, labels: JSON.stringify(m.labels), def: m.def };
      const got = { label: r.label, info: r.info, panel: r.panel, panelLabel: r.panelLabel, panelNote: r.panelNote, section: r.section, kind: r.kind, steps: r.steps, labels: JSON.stringify(r.labels), def: r.def };
      const same = (a, b) => Array.isArray(a) ? Array.isArray(b) && a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-12) : typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-12 : a === b;
      Object.keys(want).forEach(k => { if (k === 'labels' && /^(dial\.mb|dial\.bs)/.test(m.id)) return; if (!same(want[k], got[k])) diff.push(m.id + '.' + k + ': mock ' + JSON.stringify(want[k]).slice(0, 60) + ' real ' + JSON.stringify(got[k]).slice(0, 60)); }); });
    ok('params() match the mock data id for id (ids, labels, panels, sections, ladders, defaults; extra = knobs newer than the mock data)', !miss.length && !diff.length, { mock: S.length, real: P.length, miss, extra, diff }); }
  // live energies over time
  const E = await p.evaluate(async () => { const T = DadAutoDJ.mixer(), out = { ch: {}, pl: {}, kick: [], par: {} }, L = DadAutoDJ.params(), pick = ['rd.energy', 'dial.tLk', 'dial.recall', 'fx.filter', 'dial.mbT'].map(id => L.find(x => x.id === id)).filter(Boolean);
    for (let i = 0; i < 24; i++) { T.forEach(n => { (out.ch[n.id] = out.ch[n.id] || []).push(+n.energy().toFixed(3)); out.pl[n.id] = (out.pl[n.id] || '') + (n.playing ? 1 : 0); }); out.kick.push(+T[0].children[0].energy().toFixed(3)); pick.forEach(x => (out.par[x.id + '(' + x.energySrc + ')'] = out.par[x.id + '(' + x.energySrc + ')'] || []).push(+x.energy().toFixed(3))); await new Promise(r => setTimeout(r, 250)); }
    out.same = DadAutoDJ.mixer() === T; out.voices = T[0].children.map(k => k.id + ':' + (k.playing ? 1 : 0)).join(' '); return out; });
  const spread = a => Math.max(...a) - Math.min(...a);
  ok('mixer(): channel energy() live (moves over 6 s), drums playing', spread(E.ch.drums) > 0.05 && /1/.test(E.pl.drums) && E.same, { drums: E.ch.drums.join(' '), bass: E.ch.bass.join(' '), playing: E.pl });
  ok('mixer(): drum voice energy() live (kick)', spread(E.kick) > 0.05, { kick: E.kick.join(' '), voices: E.voices });
  ok('params(): energy() live values', Object.values(E.par).some(a => spread(a) > 0.02), E.par);
  // set round trip
  const S1 = await p.evaluate(() => { const a = DadAutoDJ.set('dial.tLk', 0.4), v = DadAutoDJ.desk.dial('tLk'), pv = DadAutoDJ.params().find(x => x.id === 'dial.tLk').value; const b2 = DadAutoDJ.set('dial.tLk', 1); const g = DadAutoDJ.set('grey.busy cap', 1), u = DadAutoDJ.set('nope', 1); return { a, v, pv, b2, back: DadAutoDJ.desk.dial('tLk'), grey: g, unknown: u, hist: (JSON.parse(localStorage.getItem('dadDesk.hist.v1') || '[]').filter(h => h[1] === 'dial.tLk').length) }; });
  ok('set(id, v): nearest step lands in the engine, value reads it back, greyed/unknown -> null, logged', Math.abs(S1.a - Math.pow((1 + Math.sqrt(5)) / 2, -2)) < 1e-9 && S1.v === S1.a && S1.pv === S1.a && S1.b2 === 1 && S1.back === 1 && S1.grey === null && S1.unknown === null && S1.hist >= 2, S1);
  // setLevel round trip
  const S2 = await p.evaluate(async () => { const T = DadAutoDJ.mixer(), f = id => (function w(L) { for (const n of L) { if (n.id === id) return n; const x = w(n.children); if (x) return x; } })(T);
    const r = {}; r.bass = DadAutoDJ.setLevel('bass', -2.2); r.bassDesk = DadAutoDJ.desk.level('bass'); r.bassNode = f('bass').level; DadAutoDJ.setLevel('bass', 0); r.bassBack = DadAutoDJ.desk.level('bass');
    r.kick = DadAutoDJ.setLevel('drums.kick', -3); r.kickNode = f('drums.kick').level; await new Promise(z => setTimeout(z, 1500)); r.kickE = +f('drums.kick').energy().toFixed(3); DadAutoDJ.setLevel('drums.kick', 0); r.kickBack = f('drums.kick').level;
    r.box = DadAutoDJ.setLevel('bass.303.1', -6); r.boxMx = !!(DadAutoDJ.desk.mx.b['303'] && DadAutoDJ.desk.mx.b['303'].m[1]); r.boxNode = f('bass.303.1').level; DadAutoDJ.setLevel('bass.303.1', 0); r.boxBack = !!DadAutoDJ.desk.mx.b['303'].m[1];
    r.voice = DadAutoDJ.setLevel('voice.singer', -2); r.bad = DadAutoDJ.setLevel('nope', 0); r.steps = f('drums').steps.join(','); r.labels = f('drums').labels[0] + '..' + f('drums').labels[11]; return r; });
  ok('setLevel(id, v): channel rung via the desk, drum voice rung, rack unit mute, all read back; read-only/unknown -> null', S2.bass === -2 && S2.bassDesk === -2 && S2.bassNode === -2 && S2.bassBack === 0 && S2.kick === -3 && S2.kickNode === -3 && S2.kickBack === 0 && S2.box === -6 && S2.boxMx && S2.boxNode === -6 && !S2.boxBack && S2.voice === null && S2.bad === null, S2);
  // the old desk still works
  await p.evaluate(() => document.querySelector('#dj-edit').scrollIntoView({ block: 'center' })); const eb = await p.locator('#dj-edit').boundingBox(); await p.touchscreen.tap(eb.x + eb.width / 2, eb.y + eb.height / 2); await p.waitForTimeout(1500);
  const D = await p.evaluate(() => { const r = { open: document.documentElement.hasAttribute('data-desk'), faders: document.querySelectorAll('#dj-desk .dk-f').length, face: !!(DjDesk && DjDesk.open && !DjDesk.vumock), reg: DjDeskRegistry.params().length, strips: document.querySelectorAll('#dj-desk .dk-s').length };
    const up = [...document.querySelectorAll('#dj-desk .dk-f')].find(f => f.querySelector('.dk-nm') && /tempo lock/.test(f.textContent)); r.tl = !!up; r.playing = DadAutoDJ.playing; return r; });
  ok('the existing desk (js/dj-desk.js) still opens with its faders while the DJ plays', D.open && D.faders > 50 && D.face && D.reg > 50 && D.playing, D);
  await p.touchscreen.tap(eb.x + eb.width / 2, eb.y + eb.height / 2); await p.waitForTimeout(500);
  // Dashboard Bot's panel against the real API
  if (process.argv[4]) { await p.addStyleTag({ path: process.argv[4] + '/css/dj-vu-panel.css' }); await p.addScriptTag({ path: process.argv[4] + '/js/dj-vu-panel.js' });
    const V = await p.evaluate(async () => { DjDesk.open(); await new Promise(r => setTimeout(r, 400)); const r = { vumock: !!DjDesk.vumock, mockBanner: !!document.querySelector('.vp-mock'), menu: [...document.querySelectorAll('.vp-nav')].map(b => b.textContent.replace('›', '')).join(' | ') };
      document.querySelector('.vp-nav').click(); await new Promise(z => setTimeout(z, 2500)); r.mixRows = [...document.querySelectorAll('.vp-row .vp-nm')].map(x => x.textContent).join(','); r.lit = [...document.querySelectorAll('.vp-row .vp-vu-e')].map(m => m.querySelectorAll('i.on').length).join(',');
      const drum = [...document.querySelectorAll('.vp-row')].find(x => x.querySelector('.vp-nm').textContent === 'drums'); if (drum) { drum.querySelector('.vp-mid').click(); await new Promise(z => setTimeout(z, 1200)); r.drumRows = [...document.querySelectorAll('.vp-row .vp-nm')].map(x => x.textContent).join(','); r.drumLit = [...document.querySelectorAll('.vp-row .vp-vu-e')].map(m => m.querySelectorAll('i.on').length).join(','); }
      document.querySelector('.vp-back').click(); document.querySelector('.vp-back').click(); await new Promise(z => setTimeout(z, 200));
      const st = [...document.querySelectorAll('.vp-nav')].find(b => /Style/.test(b.textContent)); st.click(); await new Promise(z => setTimeout(z, 300));
      const row = [...document.querySelectorAll('.vp-row')].find(x => x.querySelector('.vp-nm').textContent === 'tempo lock'); const before = DadAutoDJ.desk.dial('tLk'); row.querySelector('.vp-dn').click(); r.tLk = [before, DadAutoDJ.desk.dial('tLk'), row.querySelector('.vp-val').textContent]; row.querySelector('.vp-up').click(); r.tLkBack = DadAutoDJ.desk.dial('tLk');
      return r; });
    ok('Dashboard Bot panel (vumock-local) on the real API: menu, mixer rows, lit VUs, drill-down, a step lands', V.vumock && !V.mockBanner && /Mixer/.test(V.menu) && /drums/.test(V.mixRows) && /[1-9]/.test(V.lit) && /kick/.test(V.drumRows || '') && V.tLk[1] < V.tLk[0] && V.tLkBack === V.tLk[0], V); }
  ok('no page errors', !errs.length, errs.join(' / ') || 'none'); await b.close(); process.exit(fails ? 1 : 0); })();
