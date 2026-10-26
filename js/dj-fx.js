/* Dad's DJ effects (Danny 14:34 AWST 26 Oct 2026: 'the roll and DJ effects ... adjust them there as well ... a random button for the effects').
   Loaded lazily by the start engine after js/dj-extras.js lands (after sound has begun), so the tap-to-sound path is untouched.
   One chain, built once, nodes reused (no libraries), between the pump volume (bus) and the master/compressor/logo-duck:
     roll    beat-repeat: the last beat of a bar now and then loops a slice of beat / F (F = 2, 3, 5, 8 Fibonacci divisions)
     filter  low-pass <- open -> high-pass sweep, cut-offs on the hearing range (cited), exponent PHI^-1 per full turn
     echo    beat-synced delay (half a beat), feedback and return scaled by the knob
     wash    a reverb send through its own convolver that reuses the extras' impulse buffer (no new impulse)
     crush   a gentle bit-depth wave-shaper (4 bits at most), mixed in at most PHI^-2
   Each knob opens at a live pump-driven value (pump energy u from the four DJ pumps + a slow pump-tree child per effect, rule 9) and a
   hand change is a nudge on top (rungs), saved through js/rhythm-continuity.js as 'djfx'. Every change glides (rule 6). 🎲 draws a seeded
   effects genome (golden-angle sequence); a hold of PHI^-1 s returns to live. The chain fades in over PHI^2 s against a dry path. */
(function () {
  'use strict';
  var D = window.DadAutoDJ, K = D && D._kit; if (!K || !K.ctx || D.fx) return;
  var PHI = (1 + Math.sqrt(5)) / 2, IPH = 1 / PHI, MS = 1e3, SPM = 60, SPB = 4;   // phi: golden ratio; unit: ms per s, s per minute, beats per bar
  var FLO = 20, FHI = 20000;                                              // cite: the range of human hearing, 20 Hz - 20 kHz
  var c = K.ctx, P = window.PhiPumps;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function frac(x) { return x - Math.floor(x); }
  function g(v) { var n = c.createGain(); n.gain.value = v; return n; }
  function to(prm, v, tau) { prm.setTargetAtTime(v, c.currentTime, tau || IPH); }   // rule 6: free-wheel glide
  // ---------- the chain (built once) ----------
  var inp = g(1), rDry = g(1), rIn = g(0), rDel = c.createDelay(PHI), rFb = g(0), rOut = g(0), rAmp = g(1), mixA = g(1);
  var lp = c.createBiquadFilter(), hp = c.createBiquadFilter(), post = g(1), post2 = g(1);
  var eSend = g(0), eDel = c.createDelay(PHI), eFb = g(0), wSend = g(0), wConv = c.createConvolver(), cDry = g(1), shp = c.createWaveShaper(), cWet = g(0), out = g(0);
  lp.type = 'lowpass'; lp.frequency.value = FHI; hp.type = 'highpass'; hp.frequency.value = FLO;
  inp.connect(rDry); rDry.connect(mixA); inp.connect(rIn); rIn.connect(rDel); rDel.connect(rFb); rFb.connect(rDel); rDel.connect(rOut); rOut.connect(rAmp); rAmp.connect(mixA);
  // SCATTER (Danny 15:07 AWST 26 Oct: 'a little bit too much of the scatter ... modulate the amplitude faster than how often it's playing'):
  // the roll's base level sits a rung down (PHI^-1), each roll swells in and fades out inside its beat, and a slow sine moves the roll level
  // at PHI^2 x the rate rolls are triggered (so no two rolls land at the same level). The dry beat dips only to PHI^-1 under a roll.
  var RB = IPH, lfo = c.createOscillator(), lfoD = g(RB * IPH); rAmp.gain.value = RB; lfo.type = 'sine'; lfo.frequency.value = 0; lfo.connect(lfoD); lfoD.connect(rAmp.gain); lfo.start();
  mixA.connect(lp); lp.connect(hp); hp.connect(post); post.connect(post2);
  post.connect(eSend); eSend.connect(eDel); eDel.connect(eFb); eFb.connect(eDel); eDel.connect(post2);
  post.connect(wSend); wSend.connect(wConv); wConv.connect(post2);
  post2.connect(cDry); cDry.connect(out); post2.connect(shp); shp.connect(cWet); cWet.connect(out);
  function irReady() { if (wConv.buffer) return; var b = K.ir && K.ir(); if (b) try { wConv.buffer = b; } catch (e) {} }
  // ---------- knobs: ladders, live values, nudges ----------
  function R2N() { return SPB + 1; }                                     // unit: off + four rungs, as the amount ladders
  var FIB = [0]; for (var a = 1, b = 2; FIB.length < R2N(); ) { FIB.push(b); b = a + b; a = b - a; }   // Fibonacci divisions 2, 3, 5, 8 (approved counts)
  var R2 = [0, Math.pow(PHI, -3), Math.pow(PHI, -2), IPH, 1];             // phi: amount rungs off .. full
  var FX = [
    { k: 'roll', lab: 'Roll', L: FIB, names: FIB.map(function (n) { return n ? '1/' + n : 'off'; }), kind: 'idx' },   // Fibonacci beat divisions
    { k: 'filter', lab: 'Filter', L: [-1, -IPH, 0, IPH, 1], names: ['low \u25C0\u25C0', 'low \u25C0', 'open', 'high \u25B6', 'high \u25B6\u25B6'], kind: 'add' },
    { k: 'echo', lab: 'Echo', L: R2, names: ['off', 'touch', 'some', 'lots', 'max'], kind: 'mul' },
    { k: 'wash', lab: 'Wash', L: R2, names: ['off', 'touch', 'some', 'lots', 'max'], kind: 'mul' },
    { k: 'crush', lab: 'Crush', L: R2, names: ['off', 'touch', 'some', 'lots', 'max'], kind: 'mul' }
  ];
  var nudge = {}, seed = null, nodes = {};
  FX.forEach(function (f, i) { nudge[f.k] = 0; nodes[f.k] = P ? P.node('djfx:' + f.k, SPB - 1, PHI * SPB - 1, IPH * IPH, P.page, i) : null; });   // phi: periods PHI^5.5.. s, depth PHI^-2
  function energy() {                                                     // pump energy u in (0,1): excited, urgent, hot and day push it up
    var p = D.pumps(); return 1 / (1 + Math.pow(PHI, p.tp + p.wp + p.up + p.mp));
  }
  function wob(k) { var n = nodes[k]; try { return n ? n.out() : 1; } catch (e) { return 1; } }
  function live(k, u) {
    if (k === 'roll') return clamp(Math.floor(u * FX[0].L.length), 0, FX[0].L.length - 1);
    if (k === 'filter') return clamp((2 * u - 1) * IPH * IPH + (wob(k) - 1) * IPH, -1, 1);
    if (k === 'echo') return clamp(u * IPH * IPH * wob(k), 0, 1);
    if (k === 'wash') return clamp((1 - u) * IPH * wob(k), 0, 1);
    return clamp((u - IPH) * IPH * wob(k), 0, 1);                        // crush: only on the liveliest pumps
  }
  function near(f, v) { if (f.kind === 'idx') return v; var b = 0, d = Infinity; f.L.forEach(function (x, i) { if (Math.abs(x - v) < d) { d = Math.abs(x - v); b = i; } }); return b; }
  function liveIdx(f, u) { var v = live(f.k, u), i = near(f, v); return f.kind === 'mul' && v > 0 && i === 0 ? 1 : i; }
  function effOf(f, u) {                                                   // live value with the hand nudge on top (in rungs)
    var v = live(f.k, u), li = liveIdx(f, u), j = clamp(li + nudge[f.k], 0, f.L.length - 1);
    if (!nudge[f.k]) return { v: f.kind === 'idx' ? f.L[li] : v, i: f.kind === 'idx' ? li : near(f, v), li: li };
    if (f.kind === 'idx') return { v: f.L[j], i: j, li: li };
    if (f.kind === 'add') return { v: clamp(f.L[j] + (v - f.L[li]), -1, 1), i: j, li: li };
    return { v: j ? clamp(f.L[j] * (f.L[li] ? v / f.L[li] : 1), 0, 1) : 0, i: j, li: li };
  }
  // ---------- apply (every PHI^-1 s, everything glides) ----------
  var E = {}, bits = 0;
  function crushCurve(b) {
    var n = Math.pow(2, Math.round(Math.pow(PHI, 5))), a = new Float32Array(n), q = Math.pow(2, b - 1);   // phi: 2^11 curve points
    for (var i = 0; i < n; i++) { var x = 2 * i / (n - 1) - 1; a[i] = Math.round(x * q) / q; } return a;
  }
  function apply(tau) {
    irReady(); var u = energy(), bpm = (D.track && D.track.bpm) || SPM * 2, beat = SPM / bpm;
    FX.forEach(function (f) { E[f.k] = effOf(f, u); });
    var fv = E.filter.v, span = Math.log(FHI / FLO);
    to(lp.frequency, FHI * Math.exp(-span * IPH * Math.max(0, -fv)), tau); to(hp.frequency, FLO * Math.exp(span * IPH * Math.max(0, fv)), tau);
    var e = E.echo.v; eDel.delayTime.setTargetAtTime(beat / 2, c.currentTime, tau || IPH); to(eSend.gain, e, tau); to(eFb.gain, e * IPH, tau);
    to(wSend.gain, wConv.buffer ? E.wash.v * IPH : 0, tau);
    var cr = E.crush.v, b = cr ? Math.round(Math.pow(PHI, 4) * (1 - cr)) + SPB : 0;   // phi: gentle bit depth, PHI^4 rungs above 4 bits
    if (b && b !== bits) { bits = b; shp.curve = crushCurve(b); }
    to(cWet.gain, cr * IPH * IPH, tau); to(cDry.gain, 1 - cr * Math.pow(PHI, -3), tau);   // phi: gentle, at most PHI^-2 wet
    var trg = TRG = energy() * IPH / (beat * SPB);                              // rolls per second: share of bars x bars per second
    lfo.frequency.setTargetAtTime(trg * PHI * PHI, c.currentTime, tau || IPH);   // phi: scatter amplitude moves PHI^2 faster than its trigger rate (rule 6 glide)
    sync();
  }
  // ---------- roll scheduler: on the last beat of a bar, loop a beat / F slice for the rest of that beat ----------
  var rolled = -1, rolls = 0, TRG = 0, lastF = 0;
  function rollTick() {
    var F = E.roll ? E.roll.v : 0, tr = D.track; if (!F || !tr || !D.playing || !(tr.bpm > 0)) return;
    var beat = SPM / tr.bpm, bar = beat * SPB, el = (Date.now() - tr.born) / MS, n = Math.floor(el / bar), at = (n + 1) * bar - beat;   // last beat of this bar
    if (n === rolled || at - el > Math.pow(PHI, -2) || at < el) return;                     // phi: schedule PHI^-2 s ahead
    rolled = n; if (frac((n + (seed || 0)) * IPH) > energy() * IPH) return;                 // how often: pump energy x PHI^-1 of the bars
    rolls++; var t = c.currentTime + (at - el);
    // WIDTH (Danny 15:08): the slice length moves too, on the same ladder of musical divisions. One base rate r = the trigger rate:
    // rolls come at r, the width sways at r x PHI, the amplitude at r x PHI^2. Sway depth = pump energy x PHI rungs (rounded, so snapped).
    var ix = FIB.indexOf(F), dep = energy() * PHI * wob('roll'), sway = Math.round(dep * Math.sin(2 * Math.PI * TRG * PHI * t));
    F = FIB[clamp(ix + sway, 1, FIB.length - 1)]; lastF = F;
    var L = beat / F, s = Math.pow(PHI, -8), end = t + beat;   // phi: click-free edges PHI^-8 s
    rDel.delayTime.setValueAtTime(L, t);
    rIn.gain.setTargetAtTime(1, t, s); rIn.gain.setTargetAtTime(0, t + L, s);
    rFb.gain.setTargetAtTime(1, t + L, s); rFb.gain.setTargetAtTime(0, end, s);
    var w = beat - L;                                                     // the looping part of the beat: swell in (tau w PHI^-2), fade out from PHI^-1 of it (tau w PHI^-3)
    rOut.gain.setTargetAtTime(1, t + L, w * IPH * IPH); rOut.gain.setTargetAtTime(0, t + L + w * IPH, w * Math.pow(PHI, -3)); rOut.gain.setTargetAtTime(0, end, s);
    rDry.gain.setTargetAtTime(IPH, t + L, s); rDry.gain.setTargetAtTime(1, end, s);
  }
  // ---------- knob chips (same style as the pump knobs) ----------
  var els = {}, box = null, btn = null;
  function build() {
    var host = document.getElementById('dj-chips'); if (!host || box) return;
    box = document.createElement('div'); box.className = 'dj-fx';
    var hd = document.createElement('div'); hd.className = 'dj-fx-hd';
    var h = document.createElement('span'); h.textContent = 'effects';
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dj-fxr'; btn.title = 'Random effects (hold: back to live)';
    btn.setAttribute('aria-label', 'Random effects (hold for live effects)'); btn.innerHTML = '<span aria-hidden="true">&#127922;</span> effects';
    var mx = document.createElement('span'); mx.className = 'dj-fx-note'; mx.textContent = '\uD83D\uDD00 by the DJ pill = random pump mix';
    hd.appendChild(h); hd.appendChild(btn); hd.appendChild(mx); box.appendChild(hd);
    FX.forEach(function (f) {
      var fs = document.createElement('fieldset'), lg = document.createElement('legend'); fs.className = 'dj-grp'; lg.textContent = f.lab; fs.appendChild(lg); els[f.k] = [];
      f.names.forEach(function (nm, i) {
        var l = document.createElement('label'), r = document.createElement('input'), s = document.createElement('span');
        r.type = 'radio'; r.name = 'djfx-' + f.k; r.value = i; s.textContent = nm;
        r.addEventListener('change', function () { if (!r.checked) return; var li = liveIdx(f, energy()); nudge[f.k] = i - li; apply(); save(); });
        l.appendChild(r); l.appendChild(s); fs.appendChild(l); els[f.k].push([i, r, l]);
      });
      box.appendChild(fs);
    });
    host.appendChild(box); wireBtn(); sync();
  }
  function sync() {
    FX.forEach(function (f) { var e = E[f.k]; if (!e) return; (els[f.k] || []).forEach(function (x) {
      if (x[1].checked !== (x[0] === e.i)) x[1].checked = x[0] === e.i; x[2].classList.toggle('is-live', x[0] === e.li);
      x[2].title = x[0] === e.li ? 'live now' + (nudge[f.k] ? '' : ' (no nudge)') : ''; }); });
  }
  // ---------- random effects (golden-angle genome), hold = live ----------
  function draw(s) {
    var u = energy(); seed = s;
    FX.forEach(function (f, j) { nudge[f.k] = s == null ? 0 : Math.floor(frac((s * FX.length + j) * IPH) * f.L.length) - liveIdx(f, u); });
    apply(PHI); save();                                                   // rule 6: a new effects mix glides in, tau PHI s
    if (btn) { btn.classList.remove('is-mixing'); void btn.offsetWidth; btn.classList.add('is-mixing'); }
  }
  function wireBtn() {
    var held = 0, long = false;
    btn.addEventListener('pointerdown', function () { long = false; clearTimeout(held); held = setTimeout(function () { long = true; draw(null); }, IPH * MS); });   // phi: hold PHI^-1 s
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (n) { btn.addEventListener(n, function () { clearTimeout(held); }); });
    btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (long) { long = false; return; } draw(seed == null ? Math.floor(Date.now() / MS) : seed + 1); });
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  // ---------- continuity ----------
  var RC = null;
  function save() { if (RC) RC.save(); }
  if (window.RhythmContinuity) RC = RhythmContinuity.register('djfx', {
    save: function () { return { n: nudge, seed: seed }; },
    catchUp: function (e, s, mode) { if (!s || mode === 'return') return; if (s.seed != null && isFinite(s.seed)) seed = s.seed;
      if (mode !== 'restart' && s.n) FX.forEach(function (f) { if (isFinite(s.n[f.k])) nudge[f.k] = s.n[f.k]; }); },
    reset: function () { FX.forEach(function (f) { nudge[f.k] = 0; }); apply(); } });   // daily restart: knobs back to live, the effects seed stays
  // ---------- in ----------
  apply(); K.fx({ inp: inp, out: out });                                  // the start engine crossfades dry -> this chain over PHI^2 s
  setInterval(function () { if (!document.hidden) apply(); }, IPH * MS);   // phi: knobs follow the live pumps every PHI^-1 s
  setInterval(rollTick, Math.pow(PHI, -4) * MS);                          // phi: roll look-ahead every PHI^-4 s
  build();
  D.fx = { get eff() { return JSON.parse(JSON.stringify(E)); }, get nudge() { return JSON.parse(JSON.stringify(nudge)); }, get seed() { return seed; }, get rolls() { return rolls; }, get scatter() { return { base: RB, trigHz: TRG, widthHz: TRG * PHI, ampHz: lfo.frequency.value, amp: rAmp.gain.value, lastDiv: lastF }; },
    random: function (s) { draw(s === undefined ? (seed == null ? Math.floor(Date.now() / MS) : seed + 1) : s); },
    set: function (k, i) { FX.forEach(function (f) { if (f.k === k) nudge[k] = i - liveIdx(f, energy()); }); apply(); save(); }, energy: energy };
})();
