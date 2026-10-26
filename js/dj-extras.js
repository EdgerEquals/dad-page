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
    stab:  function (tr, f, t, d, v) { voice(tr, tr.g.wave, f, t, d, v * 0.07, { a: 0.004, hold: d * 0.5, rel: 0.06, cut: tr.g.cut, det: 7, rev: 0.25 }); },
    ep:    function (tr, f, t, d, v) {
      var end = t + d + 1.5, c = osc('sine', f, t, end), m = osc('sine', f * 2, t, end), mg = C().createGain(), g = C().createGain();
      mg.gain.setValueAtTime(f * 1.2, t); mg.gain.setTargetAtTime(f * 0.1, t, 0.25); m.connect(mg); mg.connect(c.frequency);
      c.connect(g); env(g, t, 0.004, v * 0.12, d * 0.7, 0.35); g.connect(tr.out); var s = C().createGain(); s.gain.value = 0.4; g.connect(s); s.connect(tr.rev); },
    piano: function (tr, f, t, d, v) { voice(tr, 'triangle', f, t, d, v * 0.14, { a: 0.003, hold: 0.02, rel: 0.6, cut: 3200, sweep: 0.5, rev: 0.6 });
                                       voice(tr, 'sine', f * 2, t, d, v * 0.04, { a: 0.003, hold: 0.01, rel: 0.3, cut: 5000 }); },
    bell:  function (tr, f, t, d, v) { voice(tr, 'sine', f, t, d, v * 0.08, { a: 0.01, hold: 0.02, rel: 0.9, cut: 6000, rev: 1 }); voice(tr, 'sine', f * 3.01, t, d, v * 0.015, { a: 0.005, rel: 0.4, cut: 8000, rev: 1 }); },
    horn:  function (tr, f, t, d, v) { voice(tr, 'sawtooth', f, t, d, v * 0.06, { a: 0.12, hold: d * 0.8, rel: 0.3, cut: 1100, det: 5, rev: 0.8 }); },
    square:function (tr, f, t, d, v) { voice(tr, 'square', f, t, d, v * 0.045, { a: 0.004, hold: d * 0.6, rel: 0.08, cut: 2600, rev: 0.3 }); },
    saw:   function (tr, f, t, d, v) { voice(tr, 'sawtooth', f, t, d, v * 0.045, { a: 0.004, hold: d * 0.6, rel: 0.08, cut: 3200, det: 6, rev: 0.3 }); },
  };
  Object.keys(MORE).forEach(function (k) { INST[k] = MORE[k]; });
  // ---------- drums ----------
  var nb = null;
  function noise() { if (nb) return nb; var c = C(), n = c.sampleRate, b = c.createBuffer(1, n, n), d = b.getChannelData(0); for (var j = 0; j < n; j++) d[j] = Math.random() * 2 - 1; return (nb = b); }
  function hit(tr, kind, t, v) {
    var g = C().createGain(); g.connect(tr.out);
    if (kind === 'kick' || kind === 'tom') {
      var o = C().createOscillator(), f0 = FLO * Math.pow(PHI, kind === 'kick' ? 2 * PHI + IPH : 2 * PHI), f1 = FLO * Math.pow(PHI, kind === 'kick' ? PHI : PHI + IPH), dec = kind === 'kick' ? 0.12 : 0.35;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dec); o.connect(g);
      g.gain.setValueAtTime(v * (kind === 'kick' ? 0.55 : 0.4), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dec * 2.5); o.start(t); o.stop(t + dec * 3);
      return;
    }
    var src = C().createBufferSource(), f = C().createBiquadFilter(); src.buffer = noise(); src.connect(f); f.connect(g);
    var len = kind === 'snare' ? 0.16 : kind === 'shaker' ? 0.06 : 0.035;
    f.type = kind === 'snare' ? 'bandpass' : 'highpass'; f.frequency.value = FHI * Math.pow(PHI, kind === 'snare' ? -5 : kind === 'shaker' ? -3 : -2);   // phi: bands PHI^-n under the top of hearing
    g.gain.setValueAtTime(v * (kind === 'snare' ? 0.22 : kind === 'shaker' ? 0.05 : 0.06), t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
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
  function buildChips() {
    GROUPS.forEach(function (gp) {
      var k = gp[0], fs = document.createElement('fieldset'), lg = document.createElement('legend'); fs.className = 'dj-grp'; lg.textContent = gp[1]; fs.appendChild(lg);
      chipEls[k] = [];
      LADDER[k].forEach(function (v) {
        var l = document.createElement('label'), i = document.createElement('input'), s = document.createElement('span');
        i.type = 'radio'; i.name = 'dj-' + k; i.value = v; s.textContent = v === 'deep' ? 'deep night' : v === 'night' && k === 'sky' ? 'clear night' : v;
        i.addEventListener('change', function () { if (!i.checked) return; setTo(k, v); var c = compute(); K.idle(c); paint(c); save(); });
        l.appendChild(i); l.appendChild(s); fs.appendChild(l); chipEls[k].push([v, i, l]);
      });
      chips.appendChild(fs);
    });
    syncChips();
  }
  function syncChips() {
    GROUPS.forEach(function (gp) { var k = gp[0], e = eff(k), lv = liveOf(k); (chipEls[k] || []).forEach(function (x) {
      if (x[1].checked !== (x[0] === e)) x[1].checked = x[0] === e; x[2].classList.toggle('is-live', x[0] === lv);
      x[2].title = x[0] === lv ? 'live now' + (nudge[k] ? '' : ' (no nudge)') : ''; }); });
  }
  function liveLine() {                                                   // the live sky the knobs sit on (js/rhythm-continuity.js sky clocks)
    var R = window.RhythmContinuity, P = window.PhiPumps; if (!R) return '';
    var z = R.sun(), pct = 100, deg = 360;                                // unit: percent; degrees per turn
    return ' \u00B7 live: sun ' + Math.round(z.elev) + '\u00B0, moon ' + Math.round(z.moonLit * pct) + '% lit, season ' + Math.round(z.season * deg) + '\u00B0' +
      (P && P.page ? ', rhythm \u00D7' + P.page.out().toFixed(2) : '');
  }
  K.extras({ ir: function () { return conv && conv.buffer; }, hit: hit, reverb: reverb, sync: syncChips, live: liveLine, chips: function (el) { if (chips) return; chips = el; buildChips(); } });
})();
