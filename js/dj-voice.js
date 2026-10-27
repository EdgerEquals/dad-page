/* Dad's DJ wordless voice (MIDI Bot dynamics spec V1 + V2, Danny 19:23 AWST 26 Oct: 'Yes, send all of it, vocals, ceiling, and the mic
   test page first'; the 19:15 / 19:17 asks: a wordless, feminine voice in the spirit of 'The Great Gig in the Sky', living mostly in
   light builds and drops in the organic realm, harmonising quietly with the melody or bringing its own line, as a gradient).
   Loaded at idle after js/dj-fx.js (never on first paint). Plain Web Audio nodes only: no worklet, no permissions, nothing recorded.
   SOURCE-FILTER VOICE (spec 4b method 1): a glottal-shaped PeriodicWave (harmonic k at k^-tilt, tilt from the LF model's ~-12 dB/oct,
   flattening as intensity rises) into three PARALLEL band-pass formants from the Peterson-Barney female averages (rule 11, cited below),
   F1 following f0 when f0 rises above it (soprano R1 tuning), breath noise through the same formants, portamento, vibrato (cited 5-7 Hz,
   50-100 cents p-p, onset delayed). It never models or samples any recording or any singer's voice; it imitates a style of wordless singing.
   PRESENCE (spec 4c): Pv = O B (1 - Hc). O = (1 - x)^PHI^-1 the organic lean (x = drive, the throw's electronic zone, until the exit mix
   lands); B = floor + (1 - floor) bump, the bump PHI^(-(ph - 1)^2 PHI^2) (1 - dp)^PHI^-1 peaking as a transition's build reaches its drop
   (ph = build progress, 1 at the drop; dp = its pumped depth, so light builds lift it most), windowed sin^2 so it is 0 at the build's
   start and one build-length after the drop; Hc = s(drive)^c u^c hard club energy (c dial) fades it there.
   HARMONISE <-> OWN LINE (V2): h = s(PHI (tension - tc) + nw novelty); both voices always exist, equal-power weights sqrt(1 - h), sqrt(h).
   Harmonise: a diatonic third or sixth under each lead note, picked by nearest voice leading (chord tones a rung cheaper), in the lead's
   rhythm. Own line: a melismatic line on the live chords, stepwise through chord tones (passing tones on weak sixteenths) along 2-4 bar
   arcs that rise toward the soar ceiling and breathe at the arc's end; note length PHI^(PHI (1 - I)) sixteenths (long and held when soft,
   running sixteenths when intense); it rests inside the rhythm plan's stop-before-the-downbeat, so the slam and the space stay.
   INTENSITY I = s(tension) u: range ceiling OCT PHI^(I S) semitones over the lead (an octave -> about an octave and a minor sixth at S = 1),
   tilt flattens, vibrato depth and rate rise, onset delay shortens, the vowel opens /u/ -> /o/ -> /a/, breath falls, portamento quickens.
   LEVEL: voice = the lead pluck's existing level x the presence peak dial x PHI^(-2 (1 - Pv)) (so PHI^(-3 + 2 Pv) of the lead at the mid
   dial). PLACEHOLDER-awaiting-Danny: the amplitude matrix (shared.md Loudness) has no voice entry yet; every level here is a ratio of an
   existing level, and no new fixed level is typed. Open ranges 1-6 of the spec are dials at mid (DadAutoDJ.voice.dial(k, v)).
   cite: Peterson & Barney, JASA 24 (1952) Table II female averages: /u/ 370 950 2670, /o/ (as in 'bought') 590 920 2710, /a/ 850 1220 2810 Hz;
   Joliveau, Smith & Wolfe, Nature 427 (2004) (R1 tuned to f0 by sopranos); Sundberg, KTH synthesis of singing (vibrato 5-7 Hz, 50-100 cents
   p-p); Fant, Liljencrants & Lin, STL-QPSR 26(4) 1985 (LF glottal flow, ~-12 dB/oct source); Torry / Wright 'The Great Gig in the Sky' (voice
   follows the chord sequence, intensity follows the arc; Louder, MusicRadar). Full list: /workspace/midi-drafts/dj-dynamics-sampling-beyond-2026-10-26.md s11. */
(function () {
  'use strict';
  var D = window.DadAutoDJ, K = D && D._kit; if (!K || !K.ctx || D.voice || !K.voiceHook) return;
  var PHI = (1 + Math.sqrt(5)) / 2, IPH = 1 / PHI, MS = 1e3, SPB = 4, OCT = 12;   // phi; unit: ms per s, sixteenths per beat, semitones per octave
  // cited data (rule 11): Peterson-Barney female formant averages (Hz), vowels from closed to open
  var VOW = [[370, 950, 2670], [590, 920, 2710], [850, 1220, 2810]];   // cite: /u/, /o/, /a/ (Peterson & Barney 1952, Table II)
  var VIB = { lo: 50, hi: 100, rlo: 5, rhi: 7 };                        // cite: vibrato 50-100 cents peak to peak, 5-7 Hz (Sundberg, KTH)
  var TILT = 2;                                                         // cite: LF glottal source ~-12 dB/oct = harmonic amplitude k^-2 (Fant et al. 1985)
  var LEAD = 0.16;                                                      // the lead pluck's existing level (quiz.js INST.pluck v x 0.16): the voice's anchor
  // open ranges (spec s10, 1-6), each at mid-dial: presence peak PHI^-2..1, floor PHI^-4..PHI^-2, club exponent 1..PHI^2,
  // tension centre 1/3..2/3, novelty weight 0..PHI^-1, soar S PHI^-1..PHI, vibrato-by-intensity exponent PHI^-1..PHI
  var VD = { peak: IPH, floor: Math.pow(PHI, -3), club: PHI, tc: 1 / 2, nw: IPH / 2, soar: 1, vib: 1 };
  var VR = { peak: [IPH * IPH, 1], floor: [Math.pow(PHI, -4), IPH * IPH], club: [1, PHI * PHI], tc: [1 / 3, 2 / 3], nw: [0, IPH], soar: [IPH, PHI], vib: [IPH, PHI] };
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function frac(x) { return x - Math.floor(x); }
  function sg(X) { return 1 / (1 + Math.pow(PHI, -X)); }               // the engine's s(X) = 1 / (1 + PHI^-X)
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / OCT); }        // unit: A4 = 440 Hz, MIDI 69
  function pc(n) { return ((n % OCT) + OCT) % OCT; }
  // ---------- the live state, as gradients ----------
  function dims() { try { return D.dims; } catch (e) { return null; } }
  function energy() { if (D.fx && D.fx.energy) return D.fx.energy(); var p = D.pumps(); return 1 / (1 + Math.pow(PHI, p.tp + p.wp + p.up + p.mp)); }
  function bumpAt(t) {                                                  // the transition bump, 0 outside a build and its mirror after the drop
    var L = D.fx && D.fx.lastTransition; if (!L || !(L.drop > L.start)) return 0;
    var ph = (t - L.start) / (L.drop - L.start); if (ph <= 0 || ph >= 2) return 0;
    var dp = L.dp == null ? 1 / 2 : clamp(L.dp, 0, 1), w = Math.pow(Math.sin(Math.PI * ph / 2), 2);
    return Math.pow(PHI, -(ph - 1) * (ph - 1) * PHI * PHI) * Math.pow(1 - dp, IPH) * w;
  }
  function state(t, tk) {
    var dm = dims() || {}, u = energy(), x = dm.drive == null ? u : dm.drive, ten = dm.tension == null ? 1 / 2 : dm.tension;
    var O = Math.pow(clamp(1 - x, 0, 1), IPH), B = VD.floor + (1 - VD.floor) * bumpAt(t), Hc = Math.pow(x, VD.club) * Math.pow(u, VD.club);
    var Pv = clamp(O * B * (1 - Hc), 0, 1), I = clamp(ten * u, 0, 1);
    var prog = tk && tk.prog, nov = 0; if (prog && prog.length > 1) { var seen = {}; prog.forEach(function (d) { seen[d] = 1; }); nov = (Object.keys(seen).length - 1) / (prog.length - 1); }   // novelty: the share of the loop's slots that left the home chord (distinct chords beyond the first)
    var h = sg(PHI * (ten - VD.tc) + VD.nw * nov);
    return { Pv: Pv, I: I, h: h, O: O, B: B, Hc: Hc, u: u, nov: nov, lvl: LEAD * VD.peak * Math.pow(PHI, -2 * (1 - Pv)) };   // PLACEHOLDER-awaiting-Danny: voice vs lead ratio (amplitude matrix)
  }
  // ---------- the source: glottal-shaped waves, cached by intensity rung ----------
  var WAV = {}, NH = 21;                                                // unit: 21 harmonics (a Fibonacci count)
  function wave(I) {
    var c = K.ctx, k = Math.round(I * Math.pow(PHI, 4)); if (WAV[k] && WAV[k].c === c) return WAV[k].w;   // phi: PHI^4 ~ 7 intensity rungs
    var tl = TILT * Math.pow(PHI, -k / Math.pow(PHI, 4)), re = new Float32Array(NH + 1), im = new Float32Array(NH + 1);   // tilt k^-2 -> k^-1.24 at full intensity
    for (var n = 1; n <= NH; n++) im[n] = Math.pow(n, -tl);
    WAV[k] = { c: c, w: c.createPeriodicWave(re, im) }; return WAV[k].w;
  }
  // shared per context (built once, reused by every note): the vibrato LFO and the breath-noise buffer; per track layer: a voice
  // bus into the lead layer and its reverb send. A rebuilt AudioContext gets fresh ones (K.ctx is read live).
  var SH = null;
  function shared() {
    var c = K.ctx; if (!c) return null; if (SH && SH.c === c) return SH;
    var n = c.sampleRate, b = c.createBuffer(1, n, n), d = b.getChannelData(0), r = 0x9E3779B9;   // unit: one second; its own golden-hash stream, so the music's draws are untouched
    for (var j = 0; j < n; j++) { r ^= r << 13; r ^= r >>> 17; r ^= r << 5; d[j] = (r >>> 0) / 4294967296 * 2 - 1; }   // xorshift32 white noise
    var lfo = c.createOscillator(); lfo.frequency.value = VIB.rlo; lfo.start();
    return (SH = { c: c, nb: b, lfo: lfo });
  }
  function bus(lay) {
    if (lay.__vb && lay.__vc === K.ctx) return lay.__vb;
    var c = K.ctx, g = c.createGain(); g.connect(lay.out); if (lay.rev) { var r = c.createGain(); r.gain.value = IPH; g.connect(r); r.connect(lay.rev); }   // phi: the voice sits a rung further into the track's own reverb
    lay.__vc = c; return (lay.__vb = g);
  }
  function vowel(I) {                                                   // /u/ -> /o/ -> /a/ by intensity, interpolated in log frequency
    var p = clamp(I, 0, 1) * (VOW.length - 1), i = Math.min(VOW.length - 2, Math.floor(p)), f = p - i;
    return VOW[i].map(function (a, j) { return Math.exp(Math.log(a) * (1 - f) + Math.log(VOW[i + 1][j]) * f); });
  }
  // ---------- one sung note ----------
  var live = 0, sung = 0;
  function sing(lay, m, from, t, dur, lvl, I, last) {
    var DK = D.desk; if (DK && !DK.on('voice')) return; if (DK) DK.act('voice', t, lvl);   // the desk's voice channel: mute / solo, meter (Danny 18:12 AWST 27 Oct)
    if (!lay || !lay.out || !(lvl > LEAD * Math.pow(PHI, -8))) return;     // phi: below PHI^-8 of the lead it is inaudible; no nodes
    var Z = shared(); if (!Z) return; var c = Z.c;
    var f = mtof(m), f0 = mtof(from == null ? m : from), tp = Math.pow(PHI, -2 - I), ta = Math.pow(PHI, -3 - I), tr = last ? Math.pow(PHI, -I) : Math.pow(PHI, -3 - I);
    var end = t + dur + tr * Math.pow(PHI, 3), F = vowel(I);            // phi: stop PHI^3 release constants after the release (under -36 dB)
    try {
      var o = c.createOscillator(); o.setPeriodicWave(wave(I)); o.frequency.setValueAtTime(f0, t); o.frequency.setTargetAtTime(f, t, tp);   // portamento tau PHI^(-2-I) s
      var vd = c.createGain(); vd.gain.value = 0; var on = Math.pow(PHI, -1 - 2 * I), dep = (VIB.lo + (VIB.hi - VIB.lo) * Math.pow(I, VD.vib)) / 2;   // vibrato onset PHI^-1 .. PHI^-3 s; unit: cents, half the p-p depth
      Z.lfo.frequency.setTargetAtTime(VIB.rlo + (VIB.rhi - VIB.rlo) * I, t, IPH); vd.gain.setValueAtTime(0, t); vd.gain.setTargetAtTime(dep, t + on, on * IPH); Z.lfo.connect(vd); vd.connect(o.detune);
      var bg = c.createGain(), env = c.createGain(); bg.gain.value = 0; env.gain.value = 0; bg.gain.setValueAtTime(0, t);   // silent from creation (the shared LFO runs before t)
      bg.gain.setTargetAtTime(Math.pow(PHI, -2) * Math.pow(1 - I, PHI), t, ta); bg.gain.setTargetAtTime(0, t + dur, tr); var nz = c.createBufferSource(); nz.buffer = Z.nb; nz.loop = true; nz.connect(bg);   // phi: breath PHI^-2 of the tone when soft, gone when soaring
      F.forEach(function (fv, j) {                                      // three parallel formants, Q PHI^(2+j) (narrower up the spectrum)
        var bp = c.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.setValueAtTime(j ? fv : Math.max(fv, f0), t); if (!j) bp.frequency.setTargetAtTime(Math.max(fv, f), t, tp);   // R1 tuning: F1 rides f0 above it
        bp.Q.value = Math.pow(PHI, 2 + j); o.connect(bp); bg.connect(bp); bp.connect(env);
      });
      env.gain.setValueAtTime(0, t); env.gain.setTargetAtTime(lvl, t, ta); env.gain.setTargetAtTime(0, t + dur, tr); env.connect(bus(lay));
      o.start(t); o.stop(end); nz.start(t, frac(sung * IPH)); nz.stop(end); live++; sung++;   // golden offset into the breath buffer
      o.onended = function () { live--; try { Z.lfo.disconnect(vd); env.disconnect(); } catch (e) {} };   // let the note's nodes go
    } catch (e) {}
  }
  // ---------- harmonise: a diatonic third or sixth under each lead note ----------
  var hPrev = null, oPrev = null, lPrev = null, lastTk = null, LOG = [];
  function inScale(tk, n) { var sc = tk.scNow || tk.sc; return !sc || sc.indexOf(pc(n - tk.root)) >= 0; }
  function isChord(tk, n) { var ch = tk.ch; if (!ch) return false; for (var i = 0; i < ch.length; i++) if (pc(ch[i]) === pc(n)) return true; return false; }
  function harm(tk, m) {
    var best = null, bc = Infinity; [3, 4, 8, 9].forEach(function (iv) {   // unit: minor/major third, minor/major sixth below (semitones)
      var n = m - iv; if (!inScale(tk, n)) return; var cost = (hPrev == null ? 0 : Math.abs(n - hPrev)) + (isChord(tk, n) ? 0 : IPH) + (iv > 4 ? IPH * IPH : 0);   // phi: thirds a little closer than sixths
      if (cost < bc) { bc = cost; best = n; } });
    return best;
  }
  function onNote(part, lay, m, t, d, v) {
    var tk = lay && (lay.tk || lay); if (!tk) return; if (!tk.leaving) lastTk = tk;
    if (part !== 'lead' || !D.playing) return; lPrev = m;
    var S = state(t, tk), n = harm(tk, m); if (n == null) return;
    var lv = S.lvl * Math.sqrt(1 - S.h) * clamp(v, 0, 1);
    sing(tk.L ? tk.L.voice || tk.L.lead : lay, n, hPrev, t, d, lv, S.I, false); hPrev = n; LOG.push([t, 'h', n, +lv.toFixed(4)]);
  }
  // ---------- own line: a melismatic line on the live chords, on the grid ----------
  var oNext = -1, oTk = null;
  function own() {
    var G = K.grid && K.grid(), tk = lastTk; if (!K.ctx || !G || !tk || !D.playing || tk.leaving || tk.dead) return;
    var ahead = Math.pow(PHI, -2), d16 = G.d16;                          // phi: write PHI^-2 s ahead on the audio clock
    if (tk !== oTk || oNext < G.step || (oNext - G.step) * d16 > ahead + SPB * SPB * d16) { oTk = tk; oNext = G.step + 1; }   // a new track restarts its own grid count
    for (;;) {
      var t = G.t + (oNext - G.step) * d16; if (t - K.ctx.currentTime > ahead) break; if (t < K.ctx.currentTime) { oNext++; continue; }
      var S = state(t, tk), s16 = oNext % (SPB * SPB), bar = Math.floor(oNext / (SPB * SPB));
      var arcB = 2 + Math.round(2 * ((dims() || {}).tension || 0)), p = ((bar % arcB) + s16 / (SPB * SPB)) / arcB;   // unit: arcs of 2..4 bars by tension
      var len = Math.max(1, Math.round(Math.pow(PHI, PHI * (1 - S.I))));   // sixteenths per note: ~2 soft, 1 intense
      var rp = tk.rp, stop = rp && rp.stop && s16 >= SPB * SPB - (rp.L16 || 0);
      var breathe = p > 1 - Math.pow(PHI, -2.5);                          // phi: the last PHI^-2.5 of each arc breathes (a phrase end)
      if (!stop && !breathe && frac(oNext * IPH + (tk.seed | 0) * IPH * IPH) < Math.pow(PHI, -(1 - S.I))) {   // golden-sequence draw: denser as intensity rises
        var anchor = lPrev != null ? lPrev : tk.root + 2 * OCT, ceil = OCT * Math.pow(PHI, S.I * VD.soar);   // unit: around the lead's register
        var tgt = anchor - OCT / 2 + ceil * Math.pow(Math.sin(Math.PI * p), IPH), cur = oPrev == null ? Math.round(anchor) : oPrev, n = cur, strong = s16 % SPB === 0;
        var dir = tgt > cur ? 1 : -1, step = Math.abs(tgt - cur) > OCT / 2 ? 2 : 1;   // stepwise, a skip when far from the arc
        for (var k = 0, moved = 0; k < OCT && moved < step; k++) { n += dir; if (inScale(tk, n) && (!strong || isChord(tk, n) || moved + 1 < step)) moved++; }
        if (strong && !isChord(tk, n)) { for (var e = 1; e < OCT / 2; e++) { if (isChord(tk, n + e * dir)) { n += e * dir; break; } if (isChord(tk, n - e * dir)) { n -= e * dir; break; } } }   // lean on the chord tones
        var nb = p + len / (SPB * SPB) / arcB > 1 - Math.pow(PHI, -2.5), lv = S.lvl * Math.sqrt(S.h) * Math.pow(PHI, -(s16 % SPB ? 1 : 0) * IPH);   // phi: off-beats PHI^-1/PHI softer
        sing(tk.L ? tk.L.voice || tk.L.lead : null, n, oPrev, t, len * d16, lv, S.I, nb); oPrev = n; LOG.push([t, 'o', n, +lv.toFixed(4)]);
      } else if (breathe) oPrev = null;                                 // a new arc starts fresh from the lead's register
      oNext += len;
    }
    while (LOG.length && LOG[0][0] < K.ctx.currentTime - 60) LOG.shift();   // unit: keep a minute
  }
  K.voiceHook(onNote);
  (K.every || setInterval)(own, Math.pow(PHI, -4) * MS);               // phi: look-ahead every PHI^-4 s on the one clock
  D.voice = { state: function () { return state(K.ctx ? K.ctx.currentTime : 0, lastTk); }, get live() { return live; }, get sung() { return sung; }, log: function () { return LOG.slice(); },
    dial: function (k, v) { if (VD.hasOwnProperty(k) && isFinite(v)) VD[k] = clamp(+v, VR[k][0], VR[k][1]); return VD[k]; }, get dials() { return JSON.parse(JSON.stringify(VD)); }, ranges: VR };
})();
