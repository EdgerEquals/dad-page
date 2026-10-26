/* logo-sting.js: Ed's mark start-up and slow-down sounds as a TIERED cascade.
   THE ATOM FIRST (Danny 16:13 / 16:15 AWST 26 Oct): the open STARTS as the pure sound of the atom - its real emission lines from
   js/atom-ref-data.js (hydrogen by default: Balmer H-alpha..H-delta, Paschen-alpha, Lyman-alpha, Rydberg formula checked against NIST
   ASD), moved into hearing by a whole number of octaves (2^-40 for H, so H-alpha = 415 Hz and every line ratio stays exact), plain
   sines weighted by their Einstein A - then RAMPS into Ed's flavours, effects and pumps (the layers below + ensemble detune, vibrato,
   FM and stereo spread applied to the atom lines themselves). The slow-down runs the other way: flavoured first, back to the pure
   atom, then out. The ramp is shared with the picture through window.AtomRamp ({t0, pure, full, dur, up, r(nowMs) -> 0..1}).
   Ramp shape: pure for PHI^-2 of the length, modulation fully in by PHI^-1 (open); mirrored for the slow-down.
   Original header (Danny 16:04 AWST 26 Oct (Danny 16:04 AWST 26 Oct: "more parameters, more pumps";
   16:04 confirm: the header mini mark plays a tiny start-up cue on tap). Same LOD ladder as the picture (js/eq-lod.js):
     tiny   header mini mark: sub on the root + its octave, one glass ping. Short. A handful of nodes.
     light  logo window card: sub + 2 harmonics, a 5-hit arp with a 2-voice ensemble and stereo spread, one FM bell.
     full   the zoom (and every slow-down, which plays from the zoom): sub + 3 harmonics, an 8-hit arp with a 3-voice detuned ensemble,
            one shared vibrato LFO, golden-angle stereo spread, a 3-partial FM bell. Borrowed from Ed's DJ voice (MIDI Bot review #1).
   PUMPS (rule 8: 2+ pumps per parameter; rule 9 pump tree; rule 10 microcosm): the sting is a 5-pump child node of the logo's 8-pump node
   (PhiPumps.logo('dad-mark')), and each parameter is a 3-pump grandchild node, times page feeds it subscribes to:
     length      sting node x clock x pump:page            glide       moon x tide x its node
     brightness  daytime x moon x theme x its node         ensemble    dissonance D x logo modes x its node (cents on the phi ladder)
     vibrato     clock x eq-breath x its node (rate + depth)   spread  moon x phi-adapt:dad-mark x its node
     FM index    D x tide x its node                       arp feel    ratio-pump x dmw (wave phase) x its node (swing + strum)
   Every value is a phi rung of an anchor; feeds missing -> 0 (the rung itself). Cited: A4 = 440 Hz, 12-TET (pitch); the 24 Hz
   high-pass (MusicRef phone-safe sub); limiter on phi rungs. LOUDNESS (shared.md): the logo sits PHI^-1 under its own level / the page
   music, and the page music ducks (PageMusic.duck) for the sting's length unless the zoom's engine is already holding the duck.
   API: LogoSting.play(ctx, dest, tier, up, q) -> {nodes, dur}; q = the zoom's live map {midi, m, D, loud, day} (js/dad-mark-zoom.js dadMap).
   Loaded lazily: on the first press of either mark (js/eq-lod.js) or at tier 3 idle; never in T0/T1. */
(function (W) {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, GA = 1 - IP;                  // phi, its inverse, the golden-angle fraction
  function p(n) { return Math.pow(PHI, n); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function hz(n) { return 440 * Math.pow(2, (n - 69) / 12); }                   // cite: A4 = 440 Hz, 12-TET
  var P = W.PhiPumps, tree = null;
  function feed(n) { try { P = W.PhiPumps || P; var v = P && P.subscribe(n).get(); return typeof v === 'number' && isFinite(v) ? v : 0; } catch (e) { return 0; } }
  function nodes() {                                                            // rule 9: sting 5 -> each parameter 3
    if (tree || !(P = W.PhiPumps) || !P.node) return tree;
    var logo = P.logo ? P.logo('dad-mark') : P.page, st = P.node('sting', 5, 2, p(-4), logo, 1), k = 0;
    tree = { sting: st };
    ['len', 'glide', 'bright', 'ens', 'vib', 'spread', 'fm', 'feel'].forEach(function (n) { tree[n] = P.node('sting:' + n, 3, 1 + (k++) * GA, p(-3), st, k + 2); });
    return tree;
  }
  function nv(n) { var t = nodes(); try { return t && t[n] ? t[n].out() - 1 : 0; } catch (e) { return 0; } }   // a node's swing around 0
  var TIER = { tiny: { lines: 2, sub: 2, arp: 0, ens: 0, bell: 1, fm: 0, vib: 0, pan: 0 },
               light: { lines: 4, sub: 3, arp: 5, ens: 2, bell: 1, fm: 1, vib: 0, pan: 1 },
               full: { lines: 6, sub: 4, arp: 8, ens: 3, bell: 3, fm: 1, vib: 1, pan: 1 } };
  function play(ac, dest, tier, up, q) {
    var T = TIER[tier] || TIER.full, n = 0;
    function mk(f) { n++; return f; }
    q = q || {}; var midi = typeof q.midi === 'number' ? q.midi : 23, m = clamp(q.m == null ? IP : q.m, 0, 1), D = clamp(q.D == null ? IP : q.D, 0, 1);
    var loud = q.loud == null ? IP : q.loud, day = q.day == null ? IP : q.day;
    var clk = feed('clock'), moon = feed('moon'), tide = feed('tide'), pg = feed('pump:page') - 1, th = feed('component:theme'), ad = feed('phi-adapt:dad-mark'),
        br = feed('dad:eq-breath'), dmw = feed('dad:dmw'), rp = feed('ratio-pump'), dt = feed('daytime');
    // parameters: rung x phi^(pumps)
    var dur = (up ? IP : PHI * (1 + p(-4))) * p(tier === 'tiny' ? -1 : tier === 'light' ? -1 / 2 : 0) * p(nv('len') + clk * p(-3) + pg * PHI);
    var glide = p(-(1 + moon) / 2 * IP - tide * p(-3) - nv('glide'));          // < 1: start under the root (open) / sink under it (close)
    var cut = hz(midi + 48) * p(2 + dt + moon * IP + th * p(-3) + nv('bright') * PHI);
    var cents = p(1 + D + nv('ens') * PHI) * (1 + feed('pump:page') * 0);         // ensemble detune, cents
    var vRate = p(clk * IP + br * p(-2) + nv('vib')), vDepth = p(D + br * p(-3) + nv('vib') * IP);   // Hz, cents
    var spread = IP * (1 + moon * p(-2) + ad * p(-3) + nv('spread'));
    var fmI = p(-1 + 3 * D + tide * p(-2) + nv('fm') * PHI), harm = 2 - (2 - PHI) * D;   // FM index; harmonicity slides 2 -> phi as D rises
    var swing = p(-3) * (1 + rp * IP + dmw * p(-2) + nv('feel')), strum = dur * p(-6) * (1 + dmw * IP);
    if (up) dur = dur * PHI;                                                       // the open now carries the pure atom before the flavours
    var t = ac.currentTime + p(-8);                                               // a PHI^-8 s lead keeps the first sample clean
    var r0 = dur * p(-2), r1 = dur * IP;                                          // ramp window (s after t)
    // master: limiter on phi rungs -> PHI^-1 under (shared.md loudness)
    var lim = mk(ac.createDynamicsCompressor()); lim.threshold.value = -p(4); lim.ratio.value = p(6); lim.attack.value = p(-12); lim.release.value = p(-3); lim.connect(dest);
    var M = mk(ac.createGain()); M.gain.value = p(-3) * IP * (IP + (1 - IP) * loud) * (up ? 1 : p(-IP * (1 + nv('len') * p(-2) + (feed('pump:page') - 1) * p(-3)))); M.connect(lim);   // slow-down: flavours + atom overlap longest, so it sits PHI^-IP lower (pumped), at or under the old sting's peak
    var hp = mk(ac.createBiquadFilter()); hp.type = 'highpass'; hp.frequency.value = 24; hp.connect(M);   // cite: MusicRef phone-safe sub, 24 Hz
    // the flavour bus: every layer of Ed's sound goes through it, so it ramps in after the pure atom (and out again on the slow-down)
    var FB = mk(ac.createGain()); FB.connect(M);
    FB.gain.setValueAtTime(up ? 0 : 1, t); FB.gain.setValueAtTime(up ? 0 : 1, t + (up ? r0 : dur - r1)); FB.gain.linearRampToValueAtTime(up ? 1 : 0, t + (up ? r1 : dur - r0));
    var hpF = mk(ac.createBiquadFilter()); hpF.type = 'highpass'; hpF.frequency.value = 24; hpF.connect(FB);
    var ramp = function (param, a, b) { param.setValueAtTime(up ? a : b, t); param.setValueAtTime(up ? a : b, t + (up ? r0 : dur - r1)); param.linearRampToValueAtTime(up ? b : a, t + (up ? r1 : dur - r0)); };
    // 0. THE ATOM: its emission lines, exact ratios, pure sines first; then ensemble detune, vibrato, FM and spread ramp onto them
    var AR = W.AtomRef, lines = AR ? AR.audio(T.lines) : [];
    var ref0 = lines.length ? lines[0].hz : 0;
    lines.forEach(function (L, i) {
      var amp = Math.pow(Math.min(1, L.weight), IP) * Math.sqrt(ref0 / L.hz) * p(-1);   // Einstein-A weight, gentle loudness tilt for the high lines
      var o = mk(ac.createOscillator()), g = mk(ac.createGain()); o.type = 'sine'; o.frequency.value = L.hz;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + dur * p(-6)); g.gain.setValueAtTime(amp, t + dur * (1 - p(-3)));
      g.gain.exponentialRampToValueAtTime(p(-20), t + dur);
      ramp(o.detune, 0, (i % 2 ? -1 : 1) * cents * IP);                           // ensemble: alternate lines lean sharp / flat
      if (T.fm) { var mo = mk(ac.createOscillator()), mg = mk(ac.createGain()); mo.frequency.value = L.hz * harm; ramp(mg.gain, 0, L.hz * fmI * p(-3)); mo.connect(mg); mg.connect(o.frequency); mo.start(t); mo.stop(t + dur + p(-4)); }
      var out = g;
      if (T.pan && ac.createStereoPanner) { var sp = mk(ac.createStereoPanner()); ramp(sp.pan, 0, clamp(spread * Math.sin(2 * Math.PI * i * GA), -1, 1)); g.connect(sp); out = sp; }
      out.connect(hp); o.connect(g); o.start(t); o.stop(t + dur + p(-4));
      L.osc = o;
    });
    var pan = function (k, N) { if (!T.pan || !ac.createStereoPanner) return FB; var s = mk(ac.createStereoPanner()); s.pan.value = clamp(spread * Math.sin(2 * Math.PI * k * GA + N), -1, 1); s.connect(FB); return s; };
    // shared vibrato LFO (full tier)
    var lfo = null;
    if (T.vib) { lfo = mk(ac.createOscillator()); var lg = mk(ac.createGain()); lfo.frequency.value = vRate; ramp(lg.gain, 0, vDepth); lfo.connect(lg); lfo.start(t); lfo.stop(t + dur * PHI); lfo = lg; lines.forEach(function (L) { if (L.osc) lg.connect(L.osc.detune); }); }
    var tS = t, dS = dur; if (up) { t += r0; dur -= r0; }                       // Ed's layers enter where the ramp starts (open)
    // 1. sub on the root + harmonics, gliding in (open) or sinking (close)
    var f0 = hz(midi), ease = IP + (1 - IP) * day;
    for (var k = 1; k <= T.sub; k++) {
      var o = mk(ac.createOscillator()), g = mk(ac.createGain()); o.type = 'sine';
      o.frequency.setValueAtTime(f0 * k * (up ? glide : 1), t); o.frequency.exponentialRampToValueAtTime(f0 * k * (up ? 1 : glide), t + dur);
      var a = p(-(k - 1) * 3 / 2) * (k === 1 ? ease : 1) * IP;
      g.gain.setValueAtTime(p(-20), t); g.gain.exponentialRampToValueAtTime(a, t + dur * (up ? p(-3) : p(-4))); g.gain.exponentialRampToValueAtTime(p(-20), t + dur);
      o.connect(g); g.connect(hpF); o.start(t); o.stop(t + dur + p(-4));
    }
    // 2. arp: Fibonacci hits, minor-seventh colour + 9th, each note an ensemble (detuned copies, golden-angle pan), vibrato shared
    if (T.arp) {
      var lp = mk(ac.createBiquadFilter()); lp.type = 'lowpass'; lp.Q.value = IP + D;
      lp.frequency.setValueAtTime(up ? cut * p(-2) : cut, t); lp.frequency.exponentialRampToValueAtTime(up ? cut : cut * p(-2), t + dur);
      var outs = [], N = Math.max(1, T.ens);
      for (var e = 0; e < N; e++) { var b = pan(e, D); outs.push(b); }
      outs.forEach(function (b) { if (b !== FB) lp.connect(b); }); if (outs[0] === FB) lp.connect(FB);
      var mode = [0, 3, 7, 10, 12, 14, 15, 19], step = dur / (T.arp + 1);
      for (var h = 0; h < T.arp; h++) {
        var w = t + h * step * (1 + (h % 2 ? -swing : swing)) + h * strum, nn = midi + 48 + mode[up ? h : T.arp - 1 - h], len = step * PHI;
        var vel = p(-(h % 2) - (h % 4 ? 0 : -1 / 2)) * p(-2);                     // metric velocity ladder
        for (var c = 0; c < N; c++) {
          var oo = mk(ac.createOscillator()), gg = mk(ac.createGain()), det = N > 1 ? (c / (N - 1) * 2 - 1) * cents : 0;
          oo.type = (c + h) % 2 ? 'triangle' : (m > IP ? 'triangle' : 'square'); oo.frequency.value = hz(nn); oo.detune.value = det;
          if (lfo) lfo.connect(oo.detune);
          var lev = vel * (m > IP ? p(-1 / 2) : p(-3 / 2)) / N;
          gg.gain.setValueAtTime(0, w); gg.gain.linearRampToValueAtTime(lev, w + (m > IP ? p(-7) : p(-11))); gg.gain.exponentialRampToValueAtTime(p(-20), w + len);
          oo.connect(gg); gg.connect(lp); oo.start(w); oo.stop(w + len + p(-4));
        }
      }
    }
    // 3. bell: FM pair(s) (tiny: a plain glass ping), partials up to the high air
    var cf = hz(midi + 84), wb = t + (up ? dur * IP : p(-5)), bl = up ? dur * IP : dur * IP * PHI;
    for (var j = 0; j < T.bell; j++) {
      var ratio = [1, 2, 3 + D * IP][j], amp = p(-6 - j * 2);
      var car = mk(ac.createOscillator()), cg = mk(ac.createGain()); car.type = 'sine'; car.frequency.value = cf * ratio;
      if (T.fm) { var mod = mk(ac.createOscillator()), mg = mk(ac.createGain()); mod.frequency.value = cf * ratio * harm;
        mg.gain.setValueAtTime(cf * ratio * fmI, wb); mg.gain.exponentialRampToValueAtTime(cf * ratio * fmI * p(-4), wb + bl); mod.connect(mg); mg.connect(car.frequency); mod.start(wb); mod.stop(wb + bl + p(-4)); }
      cg.gain.setValueAtTime(0, wb); cg.gain.linearRampToValueAtTime(amp, wb + p(-12)); cg.gain.exponentialRampToValueAtTime(p(-20), wb + bl);
      car.connect(cg); cg.connect(T.pan ? pan(j + T.ens, IP) : FB); car.start(wb); car.stop(wb + bl + p(-4));
    }
    t = tS; dur = dS;
    // loudness relation: duck the page music for the sting's length (the zoom's own engine keeps its duck while open)
    try { var PM = W.PageMusic; if (PM && PM.duck) { PM.duck(true); setTimeout(function () { try { if (!(W.LogoZoom && LogoZoom.isOpen())) PM.duck(false); } catch (x) {} }, Math.round((dur + p(-2)) * 1000)); } } catch (x) {}
    try { var now = performance.now(), lead = (t - ac.currentTime) * 1000;
      W.AtomRamp = { t0: now + lead, pure: r0 * 1000, full: r1 * 1000, dur: dur * 1000, up: !!up, tier: tier,
        r: function (ms) { var x = ((ms == null ? performance.now() : ms) - this.t0) / 1000, a = up ? r0 : dur - r1, b = up ? r1 : dur - r0, k = clamp((x - a) / (b - a), 0, 1); return up ? k : 1 - k; } };
      if (W.dispatchEvent && W.CustomEvent) W.dispatchEvent(new CustomEvent('atomramp', { detail: W.AtomRamp }));
    } catch (x) {}
    return { nodes: n, dur: dur };
  }
  W.LogoSting = { play: play, tiers: TIER };
})(window);
