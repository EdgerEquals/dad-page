/* Dad's DJ extras (Danny 14:20 AWST 26 Oct 2026: 'load earlier and lighter'). The start engine (js/dad-autodj-quiz.js) loads at tier 1
   and starts sound on its own (pads, plucks, bass); this file brings the rest AFTER sound has begun, or when the pumps panel opens,
   or at background idle, whichever comes first, and everything it adds glides in over PHI^2 s (rule 6):
     lead voices    stab, ep, piano, bell, horn, square, saw (same voices as before, moved here unchanged)
     drums          kick, tom, snare, hat, shaker + their 1 s noise buffer (built on first use)
     reverb         the 2.2 s impulse, built once, its send faded up from silence
     knob chips     the 'try the pumps' ladders (open at the live value, a hand change is a nudge) + the live sky line
   No network beyond this file, no storage of its own (nudges are saved by the start engine through js/rhythm-continuity.js). */
(function () {
  'use strict';
  var D = window.DadAutoDJ, K = D && D._kit; if (!K) return;
  var PHI = (1 + Math.sqrt(5)) / 2, IPH = 1 / PHI, FLO = 20, FHI = 20000;   // phi: the golden ratio; cite: human hearing 20 Hz - 20 kHz (drum pitches as phi rungs on it)                                       // phi: the golden ratio
  var ctx = null, voice = K.voice, osc = K.osc, env = K.env, INST = K.INST, LADDER = K.LADDER, eff = K.eff, liveOf = K.liveOf, nudge = K.nudge,
      setTo = K.setTo, compute = K.compute, paint = K.paint, save = K.save, chips = null;
  function C() { return ctx || (ctx = K.ctx); }
  // ---------- lead voices (unchanged from the single-file engine) ----------
  var MORE = {
    stab:  function (tr, f, t, d, v) { voice(tr, K.wv ? K.wv(tr, tr.g.wave, t) : tr.g.wave, f, t, d, v * 0.07, { a: 0.004, hold: d * 0.5, rel: 0.06, cut: tr.g.cut, det: 7, rev: 0.25 }); },
    ep:    function (tr, f, t, d, v) {                                  // FM e-piano: ratio 2, index PHI^(2s-1) x f falling to PHI^-(4+(1-s)) x f (sophistication dial)
      var so = tr.s == null ? IPH : tr.s;
      voice(tr, 'sine', f, t, d, v * Math.pow(PHI, -SPB - IPH), { a: Math.pow(PHI, -Math.pow(PHI, 4) - SPB - IPH), hold: d * IPH, rel: IPH * IPH, cut: FHI * IPH * IPH, rev: IPH * IPH, fm: { r: 2, i0: Math.pow(PHI, 2 * so - 1), i1: Math.pow(PHI, -(SPB + 1 - so)), tau: Math.pow(PHI, -3) } }); },   // phi: index rungs; unit: 2:1 FM ratio (octave)
    piano: function (tr, f, t, d, v) { voice(tr, 'triangle', f, t, d, v * 0.14, { a: 0.003, hold: 0.02, rel: 0.6, cut: 3200, sweep: 0.5, rev: 0.6 });
                                       voice(tr, 'sine', f * 2, t, d, v * 0.04, { a: 0.003, hold: 0.01, rel: 0.3, cut: 5000 }); },
    bell:  function (tr, f, t, d, v) {                                  // FM bell: inharmonic ratio PHI^2, index PHI^(s PHI) x f ringing down over PHI^-1 s (sophistication dial)
      var so = tr.s == null ? IPH : tr.s;
      voice(tr, 'sine', f, t, d, v * Math.pow(PHI, -2 * PHI * PHI), { a: Math.pow(PHI, -Math.pow(PHI, 4) - PHI * PHI), hold: Math.pow(PHI, -SPB * PHI - PHI), rel: IPH + Math.pow(PHI, -PHI * PHI), cut: FHI * Math.pow(PHI, -1 - so), rev: 1, fm: { r: PHI * PHI, i0: Math.pow(PHI, so * PHI) * IPH, i1: Math.pow(PHI, -SPB), tau: IPH } }); },   // phi: bell partials and cut
    horn:  function (tr, f, t, d, v) { voice(tr, 'sawtooth', f, t, d, v * 0.06, { a: 0.12, hold: d * 0.8, rel: 0.3, cut: 1100, det: 5, rev: 0.8 }); },
    reed:  function (tr, f, t, d, v) {                                  // organic lead (Danny 16:53): detuned filtered saw, keytracked, with a breath transient
      var tk = tr.tk || tr, so = tk.s == null ? IPH : tk.s, w = K.pwave ? K.pwave('sawtooth', so) || 'sawtooth' : 'sawtooth';
      voice(tr, w, f, t, d, v * Math.pow(PHI, -SPB * PHI), { a: Math.pow(PHI, -6), hold: d * IPH, rel: Math.pow(PHI, -3), cut: Math.min(FHI, f * Math.pow(PHI, PHI + so * PHI)), det: Math.pow(PHI, SPB), rev: IPH * IPH });   // phi: level, attack, release, cut over the note, detune
      breath(tr, f, t, v * Math.pow(PHI, -SPB * PHI - PHI)); },
    square:function (tr, f, t, d, v) { voice(tr, 'square', f, t, d, v * 0.045, { a: 0.004, hold: d * 0.6, rel: 0.08, cut: 2600, rev: 0.3 }); },
    saw:   function (tr, f, t, d, v) { voice(tr, 'sawtooth', f, t, d, v * 0.045, { a: 0.004, hold: d * 0.6, rel: 0.08, cut: 3200, det: 6, rev: 0.3 }); },
  };
  Object.keys(MORE).forEach(function (k) { INST[k] = MORE[k]; });
  function breath(tr, f, t, v) {                                          // a short band of noise at the note: the air before the tone (grit, not a click)
    try { var c = C(), s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), at = Math.pow(PHI, -8);   // phi: attack PHI^-8 s
      s.buffer = noise(); bp.type = 'bandpass'; bp.frequency.value = Math.min(FHI, f * PHI); bp.Q.value = PHI;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + at); g.gain.setTargetAtTime(0, t + at, Math.pow(PHI, -5));   // phi: decay PHI^-5 s
      s.connect(bp); bp.connect(g); g.connect(tr.out); s.start(t, ((t * PHI) % 1) * IPH); s.stop(t + IPH); } catch (e) {} }
  // ---------- drums ----------
  var nb = null;
  function noise() { if (nb) return nb; var c = C(), n = c.sampleRate, b = c.createBuffer(1, n, n), d = b.getChannelData(0); for (var j = 0; j < n; j++) d[j] = Math.random() * 2 - 1; return (nb = b); }
  // NOISE LAYER (Danny 15:44-15:45 AWST 26 Oct): the hat + shaker noise goes through its own bus per track. The snare keeps its own level.
  // - IN/OUT: a faster pump pair (PHI^PHI.. and PHI^PHI^2.. s rungs) layered on the track's energy arc, so it comes and goes less predictably.
  // - SOUND: cutoff, Q, high-shelf tilt and stereo width each come from 2 pumps, so it keeps evolving.
  // - CEILING: centred on PHI^-4 of the old maximum and moved by 2 pumps over PHI^-5..PHI^-3, never above PHI^-3 x old (rule 8; the
  //   envelope moves underneath it). All nodes hang off the page pump tree (rule 9).
  var nzP = null, nzN = 0, DB = 20;                                       // unit: dB = 20 log10 of an amplitude ratio
  function nzPumps() {
    if (nzP) return nzP; var P = window.PhiPumps, root = P && P.page, mk = function (nm, n, k0, d, sd) { return P && P.node ? P.node(nm, n, k0, d, root, sd)
      : { modes: function (t) { var s = 0; for (var j = 0; j < n; j++) s += Math.sin(2 * Math.PI * t / Math.pow(PHI, k0 + j / 2) + 2 * Math.PI * (((j + 1 + sd) * IPH) % 1)); return s / n; } }; };
    return (nzP = { a: mk('djnoise:a', 3, PHI, IPH, 1), b: mk('djnoise:b', 3, PHI * PHI, IPH, 2), c: mk('djnoise:c', 2, PHI * PHI * PHI, IPH * IPH, 3),   // phi: rungs PHI^PHI, PHI^PHI^2, PHI^PHI^3 s
      d: mk('djnoise:d', 1, PHI + 1, IPH, 4), e: mk('djnoise:e', 1, PHI + 2, IPH, 5) });   // phi: two slower amplitude LFOs at PHI^-1 and PHI^-2 of pump a's rate (Danny 16:37): periods PHI^(PHI+1), PHI^(PHI+2) s
  }
  function nzBus(tr, t) {
    var c = C(), z = tr.nz, P = nzPumps(), now = (window.PhiPumps && PhiPumps.now) ? PhiPumps.now() : c.currentTime;
    if (!z) { z = tr.nz = { in: c.createGain(), sh: c.createBiquadFilter(), g: c.createGain() };
      z.sh.type = 'highshelf'; z.sh.frequency.value = FHI * Math.pow(PHI, -3); z.g.gain.value = 0; z.in.connect(z.sh); z.sh.connect(z.g); z.g.connect(tr.out); }   // phi: shelf PHI^-3 under the top
    var a = P.a.modes(now), b = P.b.modes(now), m = P.c.modes(now), d = P.d.modes(now), e = P.e.modes(now), sm = function (x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };   // unit: smoothstep 3x^2 - 2x^3
    var io = Math.pow(PHI, -3) + (1 - Math.pow(PHI, -3)) * sm((1 + (a + IPH * b + IPH * d + IPH * IPH * e) / (1 + 2 * IPH + IPH * IPH)) / 2);   // in/out: pump a beating against d, e (rates PHI^-1, PHI^-2 of a) plus b; floor PHI^-3
    var ceil = Math.pow(PHI, -4 + (m + IPH * a) / (1 + IPH));                                              // ceiling: centre PHI^-4, range PHI^-5..PHI^-3 (Danny 16:37: one more phi step down)
    z.lvl = ceil * io; z.ceil = ceil; z.io = io;
    z.cf = Math.pow(PHI, (IPH * a + IPH * IPH * m) * PHI);                                                  // cutoff: about +-1 rung, 2 pumps
    z.q = Math.pow(PHI, IPH * b + IPH * IPH * a);                                                           // Q: about PHI^-1..PHI, 2 pumps
    z.tilt = DB * Math.log10(PHI) * (a - b) * PHI;                                                          // tilt: +-PHI rungs of shelf gain, 2 pumps
    z.w = IPH * (1 + (m * IPH + b * IPH * IPH) / (IPH + IPH * IPH)) / 2;                                    // width: 0..PHI^-1, 2 pumps
K.nzLast = z;     z.g.gain.setTargetAtTime(z.lvl, t, Math.pow(PHI, -2)); z.sh.gain.setTargetAtTime(z.tilt, t, Math.pow(PHI, -2));   // phi: glide PHI^-2 s
    return z;
  }
  function hit(tr, kind, t, v) {
    var g = C().createGain(); g.connect(tr.out);
    if (kind === 'kick' || kind === 'tom') {
      var o = C().createOscillator(), f0 = FLO * Math.pow(PHI, kind === 'kick' ? 2 * PHI + IPH : 2 * PHI), f1 = FLO * Math.pow(PHI, kind === 'kick' ? PHI : PHI + IPH), dec = kind === 'kick' ? 0.12 : 0.35;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dec); o.connect(g);
      g.gain.setValueAtTime(v * (kind === 'kick' ? 0.55 : 0.4), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dec * 2.5); o.start(t); o.stop(t + dec * 3);
      return;
    }
    var src = C().createBufferSource(), f = C().createBiquadFilter(), z = kind === 'snare' ? null : nzBus(tr, t); src.buffer = noise(); src.connect(f);
    if (z) { g.disconnect(); var pn = C().createStereoPanner ? C().createStereoPanner() : null; if (pn) { pn.pan.value = (nzN++ % 2 ? 1 : -1) * z.w; g.connect(pn); pn.connect(z.in); } else g.connect(z.in); }
    f.connect(g);
    var len = kind === 'snare' ? 0.16 : kind === 'shaker' ? 0.06 : 0.035;
    f.type = kind === 'snare' ? 'bandpass' : 'highpass'; f.frequency.value = FHI * Math.pow(PHI, kind === 'snare' ? -5 : kind === 'shaker' ? -3 : -2) * (z ? z.cf : 1);   // phi: bands PHI^-n under the top of hearing (x the bus cutoff pump)
    if (z) f.Q.value = z.q;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * (kind === 'snare' ? 0.22 : kind === 'shaker' ? 0.05 : 0.06), t + len * Math.pow(PHI, -5)); g.gain.exponentialRampToValueAtTime(0.0001, t + len);   // phi: a PHI^-5 attack, no onset click (MIDI Bot review)
    src.start(t, Math.random() * 0.5); src.stop(t + len + 0.02);
  }

  // ---------- reverb: impulse built once, send glides up from silence ----------
  var conv = null;
  function reverb(c, revIn, bus, G) {
    if (conv || !c) return;
    try { conv = c.createConvolver(); var L = Math.floor(c.sampleRate * 2.2), ir = c.createBuffer(2, L, c.sampleRate);
      for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 3); }
      conv.buffer = ir; revIn.connect(conv); conv.connect(bus);
      var t = c.currentTime; revIn.gain.cancelScheduledValues(t); revIn.gain.setValueAtTime(revIn.gain.value, t); revIn.gain.linearRampToValueAtTime(0.35, t + G);
    } catch (e) { conv = null; }
  }
  // ---------- knob chips ----------
  // knobs: each group is its ladder; the checked chip is the live value + the hand nudge, the live value's chip carries a marker
  // (.is-live), and both move on their own as the sky, time and weather move (CSS glides the change). Tapping the live chip clears the nudge.
  var GROUPS = [['mood', 'Mood (Simmie\u2019s tag)'], ['urgency', 'Urgency'], ['sky', 'Sky'], ['time', 'Time']], chipEls = {};
  // RANDOM + MOTION (Danny 15:14 AWST 26 Oct): a labelled section button (🎲 pumps = a new pump mix; hold = default), a tiny 🎲 on every
  // knob (re-rolls only that knob: its rung and its coupling weights, gliding in), and a needle under each knob that rides its live,
  // pump-moved position between the chips (CSS glides it), so the knobs are seen moving while the panel is open.
  function rbtn(cls, label, title, on, hold) {
    var b = document.createElement('button'), held = 0, long = false; b.type = 'button'; b.className = cls; b.title = title; b.setAttribute('aria-label', title);
    b.innerHTML = '<span aria-hidden="true">&#127922;</span>' + (label ? ' ' + label : '');
    b.addEventListener('pointerdown', function () { long = false; clearTimeout(held); if (hold) held = setTimeout(function () { long = true; hold(); }, IPH * 1e3); });   // phi: hold PHI^-1 s; unit: ms per s
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (n) { b.addEventListener(n, function () { clearTimeout(held); }); });
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (long) { long = false; return; } on(); b.classList.remove('is-mixing'); void b.offsetWidth; b.classList.add('is-mixing'); });
    return b;
  }
  function needle(fs) { var n = document.createElement('i'); n.className = 'dj-needle'; n.setAttribute('aria-hidden', 'true'); fs.appendChild(n); return n; }
  function place(n, labs, x) {                                            // x = fractional rung: between chip centres, on the chip's row
    if (!n || !labs.length) return; var i = clamp(Math.floor(x), 0, labs.length - 1), j = Math.min(i + 1, labs.length - 1), f = clamp(x - i, 0, 1), a = labs[i], b = labs[j];
    if (b.offsetTop !== a.offsetTop) { b = a; f = 0; }
    var cx = a.offsetLeft + a.offsetWidth / 2 + f * (b.offsetLeft + b.offsetWidth / 2 - a.offsetLeft - a.offsetWidth / 2);
    n.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + (a.offsetTop + a.offsetHeight).toFixed(1) + 'px)';
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  var IPH = 1 / PHI, needles = {}, wob = {};
  function buildChips() {
    var hd = document.createElement('div'); hd.className = 'dj-fx-hd';
    var h = document.createElement('span'); h.textContent = 'pumps'; hd.appendChild(h);
    hd.appendChild(rbtn('dj-fxr', 'pumps', 'Random pump mix (hold: default mix)', function () { K.nextMix(); }, function () { K.defMix(); }));
    chips.appendChild(hd);
    GROUPS.forEach(function (gp) {
      var k = gp[0], fs = document.createElement('fieldset'), lg = document.createElement('legend'); fs.className = 'dj-grp'; lg.textContent = gp[1]; fs.appendChild(lg);
      fs.appendChild(rbtn('dj-kr', '', 'Random ' + gp[1].split(' ')[0].toLowerCase(), function () { K.reroll(k); }));
      chipEls[k] = [];
      LADDER[k].forEach(function (v) {
        var l = document.createElement('label'), i = document.createElement('input'), s = document.createElement('span');
        i.type = 'radio'; i.name = 'dj-' + k; i.value = v; s.textContent = v === 'deep' ? 'deep night' : v === 'night' && k === 'sky' ? 'clear night' : v;
        i.addEventListener('change', function () { if (!i.checked) return; setTo(k, v); var c = compute(); K.idle(c); paint(c); save(); });
        l.appendChild(i); l.appendChild(s); fs.appendChild(l); chipEls[k].push([v, i, l]);
      });
      needles[k] = needle(fs); chips.appendChild(fs);
    });
    syncChips();
  }
  function syncChips() {
    GROUPS.forEach(function (gp) { var k = gp[0], e = eff(k), lv = liveOf(k); (chipEls[k] || []).forEach(function (x) {
      if (x[1].checked !== (x[0] === e)) x[1].checked = x[0] === e; x[2].classList.toggle('is-live', x[0] === lv);
      x[2].title = x[0] === lv ? 'live now' + (nudge[k] ? '' : ' (no nudge)') : ''; }); });
    motion();
  }
  function motion() {                                                     // needle = effective rung + the pump tree's sway (+ a little back from the effects)
    var P = window.PhiPumps, fx = window.DadAutoDJ && DadAutoDJ.fx, back = fx && fx.back ? fx.back() : 0;
    GROUPS.forEach(function (gp, gi) { var k = gp[0], L = LADDER[k], e = eff(k), i = L.indexOf(e); if (i < 0) return;
      if (!wob[k] && P) wob[k] = P.node('djknob:' + k, SPB - 1, PHI * PHI, IPH, P.page, gi);   // phi: periods PHI^2.6..PHI^3.6 s, depth PHI^-1 (rule 9): visibly on the fly
      var sw = 0; try { sw = wob[k] ? (wob[k].out() - 1) * PHI : 0; } catch (er) {}
      place(needles[k], (chipEls[k] || []).map(function (x) { return x[2]; }), clamp(i + sw + back * IPH * IPH, 0, L.length - 1)); });
  }
  var SPB = 4;                                                            // unit: beats per bar (as the start engine)
  (K.every || setInterval)(function () { if (chips && !document.hidden && chips.offsetParent) motion(); }, IPH * 1e3);   // phi: needles move every PHI^-1 s while visible; unit: ms per s
  function liveLine() {                                                   // the live sky the knobs sit on (js/rhythm-continuity.js sky clocks)
    var R = window.RhythmContinuity, P = window.PhiPumps; if (!R) return '';
    var z = R.sun(), pct = 100, deg = 360;                                // unit: percent; degrees per turn
    return ' \u00B7 live: sun ' + Math.round(z.elev) + '\u00B0, moon ' + Math.round(z.moonLit * pct) + '% lit, season ' + Math.round(z.season * deg) + '\u00B0' +
      (P && P.page ? ', rhythm \u00D7' + P.page.out().toFixed(2) : '');
  }
  K.extras({ ir: function () { return conv && conv.buffer; }, hit: hit, reverb: reverb, sync: syncChips, live: liveLine, chips: function (el) { if (chips) return; chips = el; buildChips(); } });
})();
