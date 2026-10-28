// LISTEN PROBE (Danny 19:17 AWST 28 Oct, Claude chat: 'push go with setting up GitHub to do those things'): a long headless listen run on
// GitHub instead of in Claude's session. Usage: node tests/probes/listen.js <url> <minutes> <genre> <label> [capture.json]
// Opens the desk, plays <genre> and reports every 30 s: sounds started and how many were late (> 5 ms, > 50 ms), main-thread stalls, the
// audio clock against the wall clock (under 1 = the audio thread falling behind), the section, BPM and output level. With capture.json it
// also keeps every note (for tests/probes/report.py). Prints one SUMMARY line at the end.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const url = process.argv[2], mins = +process.argv[3] || 5, genre = process.argv[4] || 'electro', label = process.argv[5] || 'run', cap = process.argv[6];
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  await p.addInitScript(() => { window.__m = { n: 0, late: 0, big: 0, worst: 0, gaps: [0, 0, 0, 0], gw: 0 };
    [AudioScheduledSourceNode.prototype, AudioBufferSourceNode.prototype, OscillatorNode.prototype].forEach(P => { if (!Object.prototype.hasOwnProperty.call(P, 'start')) return; const f = P.start;   // buffer sources have their own start()
      P.start = function (when) { const c = this.context, M = window.__m; if (c && c.constructor && c.constructor.name !== 'OfflineAudioContext' && when) { const d = c.currentTime - when; M.n++; if (d > 0.005) { M.late++; M.worst = Math.max(M.worst, d); if (d > 0.05) M.big++; } } return f.apply(this, arguments); }; });
    window.__S = []; setInterval(() => { try { if (!window.__cap || !window.DadAutoDJ || !DadAutoDJ.desk) return; const l = DadAutoDJ.desk.live(), v = DadAutoDJ.voice && DadAutoDJ.voice.plan ? DadAutoDJ.voice.plan() : null;   // the DJ's state each second, for the capture
      window.__S.push({ t: Date.now(), l: l && { g: l.genre, bpm: l.bpm, e: l.e, bass: l.bass, form: l.form && { sec: l.form.sec, bar: l.form.bar, bars: l.form.bars }, lead: l.lead && { all: l.lead.all, now: l.lead.now, sk: l.lead.sk, solo: l.lead.solo } }, voice: v && { role: v.role, ch: v.ch, on: v.on }, seed: DadAutoDJ.track && DadAutoDJ.track.seed }); } catch (e) {} }, 1000);
    let last = performance.now(); setInterval(() => { const n = performance.now(), g = n - last; last = n; const M = window.__m; M.gw = Math.max(M.gw, g); M.gaps[g < 146 ? 0 : g < 382 ? 1 : g < 618 ? 2 : 3]++; }, 10); });
  await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const bb = await p.locator('#dj-pill').boundingBox(); await p.touchscreen.tap(bb.x + 5, bb.y + 5); await p.waitForTimeout(5000);
  await p.evaluate(g => DadAutoDJ.desk.setPick(g), genre); for (let i = 0; i < 80; i++) { if (await p.evaluate(() => DadAutoDJ.track.genre) === genre) break; await p.waitForTimeout(500); }
  await p.locator('#dj-edit').first().tap().catch(() => {}); await p.waitForTimeout(1500);
  await p.evaluate(cap => { const M = window.__m; M.n = M.late = M.big = M.worst = M.gw = 0; M.gaps = [0, 0, 0, 0]; window.__cap = !!cap; window.__S = []; }, cap || '');
  const N = new Map(); let clk = null, ratioMin = 1;
  for (let i = 0; i < mins * 2; i++) { await p.waitForTimeout(30000);
    const r = await p.evaluate(() => { const M = window.__m, l = DadAutoDJ.desk.live(), x = DadAutoDJ._kit.ctx; return { late: M.late, big: M.big, n: M.n, gw: Math.round(M.gw), at: x ? x.currentTime : 0, wall: performance.now() / 1000, bpm: l && Math.round(l.bpm), sec: l && l.form && l.form.sec, g: l && l.genre, out: +((DadAutoDJ.out || {}).level || 0).toFixed(4) }; });
    const ratio = clk ? (r.at - clk.at) / (r.wall - clk.wall) : 1; clk = r; ratioMin = Math.min(ratioMin, ratio);
    console.log(label, ((i + 1) / 2).toFixed(1) + ' min', 'sounds ' + r.n, 'late ' + r.late + ' (>50ms ' + r.big + ')', 'worst stall ' + r.gw + ' ms', 'audio clock x' + ratio.toFixed(3), r.g + ' ' + r.bpm + ' BPM ' + r.sec, 'out ' + r.out);
    if (cap) (await p.evaluate(() => DadAutoDJ.notes())).forEach(n => N.set(n.join('|'), n)); }
  const M = await p.evaluate(() => window.__m);
  console.log('SUMMARY ' + label + ': ' + mins + ' min of ' + genre + ' with the desk open | sounds ' + M.n + ', late ' + M.late + ' (' + (M.late / Math.max(1, M.n) * 100).toFixed(2) + '%), late by >50 ms ' + M.big + ', worst ' + Math.round(M.worst * 1000) + ' ms | main-thread stalls 146-382 ms ' + M.gaps[1] + ', 382-618 ms ' + M.gaps[2] + ', >618 ms ' + M.gaps[3] + ' | audio clock at worst x' + ratioMin.toFixed(3) + ' | page errors: ' + (errs.join(' / ') || 'none'));
  if (cap) fs.writeFileSync(cap, JSON.stringify({ notes: [...N.values()].sort((a, b) => a[0] - b[0]), states: await p.evaluate(() => window.__S), errs }));
  await b.close(); })();
