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
  var eSend = g(0), eDel = c.createDelay(PHI * PHI), eFb = g(0), eRet = g(1), wSend = g(0), wConv = c.createConvolver(), cDry = g(1), shp = c.createWaveShaper(), cWet = g(0), out = g(0);
  lp.type = 'lowpass'; lp.frequency.value = FHI; hp.type = 'highpass'; hp.frequency.value = FLO;
  inp.connect(rDry); rDry.connect(mixA); inp.connect(rIn); rIn.connect(rDel); rDel.connect(rFb); rFb.connect(rDel); rDel.connect(rOut); rOut.connect(rAmp); rAmp.connect(mixA);
  // SCATTER (Danny 15:07 AWST 26 Oct: 'a little bit too much of the scatter ... modulate the amplitude faster than how often it's playing'):
  // the roll's base level sits a rung down (PHI^-1), each roll swells in and fades out inside its beat, and a slow sine moves the roll level
  // at PHI^2 x the rate rolls are triggered (so no two rolls land at the same level). The dry beat dips only to PHI^-1 under a roll.
  var RB = IPH, lfo = c.createOscillator(), lfoD = g(RB * IPH); rAmp.gain.value = RB; lfo.type = 'sine'; lfo.frequency.value = 0; lfo.connect(lfoD); lfoD.connect(rAmp.gain); lfo.start();
  mixA.connect(lp); lp.connect(hp); hp.connect(post); post.connect(post2);
  // SAFE ECHO LOOP (MIDI Bot delay-throw design push 1, Danny 18:34 AWST): the echo knob, the chaospad's echo corner and the transition
  // echo all ride one loop, eDel -> tLP -> tSh -> (eFb -> eDel) and (eRet -> tChop -> tDuck -> post2). tLP's Q is PHI^-1 (linear), so its
  // response never peaks above 1 (Web Audio's default Q peaks at 1.25 and would take the capped loop near runaway); the saturator
  // C tanh(x / C) sits last in the loop, so the return never passes C = PHI^-2 of full scale; every feedback write is capped at PHI^-1/2.
  // At rest the loop is transparent below C (LP open, chop and duck at 1). Max delay PHI^2 s so a half-note fits at the slowest tempo.
  // cite: 60 dB / ceiling sims in /workspace/midi-drafts/dj-delay-throw-2026-10-26.md section 3; Q in dB (W3C Web Audio API, BiquadFilterNode)
  var FBC = Math.pow(PHI, -1 / 2), CEIL = IPH * IPH, tLP = c.createBiquadFilter(), tSh = c.createWaveShaper(), tChop = g(1), tDuck = g(1);   // phi: feedback cap, ceiling
  tLP.type = 'lowpass'; tLP.frequency.value = FHI; tLP.Q.value = 20 * Math.log10(IPH);   // unit: Web Audio's Q is in dB (Q linear PHI^-1 = -4.18 dB)
  (function () { var n = 4097, cv = new Float32Array(n); for (var i = 0; i < n; i++) { var x = 2 * i / (n - 1) - 1; cv[i] = CEIL * Math.tanh(x / CEIL); } tSh.curve = cv; })();   // unit: 2^12 + 1 points over -1..1
  function fbTo(v) { return Math.min(FBC, Math.max(0, v)); }
  // THE THROW's taps (push 2): the full outgoing mix, the flanger wet, the scatter loop alone and the riser, each a gain (0 at rest)
  // into a high-pass (Q PHI^-1 linear) so the old kick and bass stay out of the repeats, then into the same eDel.
  var tHP = c.createBiquadFilter(), TAP = [g(0), g(0), g(0), g(0)]; tHP.type = 'highpass'; tHP.Q.value = 20 * Math.log10(IPH);
  TAP.forEach(function (t) { t.connect(tHP); }); tHP.connect(eDel);
  post.connect(eSend); eSend.connect(eDel); eDel.connect(tLP); tLP.connect(tSh); tSh.connect(eFb); eFb.connect(eDel); tSh.connect(eRet); eRet.connect(tChop); tChop.connect(tDuck); tDuck.connect(post2);
  post.connect(wSend); wSend.connect(wConv); wConv.connect(post2);
  // THE MIXER's channel sends (Danny 18:12 AWST 27 Oct: 'an effects send'): each channel's echo / wash send arrives here, straight into
  // the same delay loop and convolver as the knobs (their returns), so a send works whatever the master echo / wash knob is at
  var echoIn = g(1), washIn = g(1); echoIn.connect(eDel); washIn.connect(wConv);
  post2.connect(cDry); cDry.connect(out); post2.connect(shp); shp.connect(cWet); cWet.connect(out);
  // FLANGER + RISER (transitions only, Danny 15:44; 'flounder' = flanger): a short swept delay with feedback beside the dry path, and a
  // band-passed noise riser; both silent until a transition opens them.
  post.connect(TAP[0]);
  var flD = c.createDelay(IPH), flL = c.createOscillator(), flDep = g(Math.pow(PHI, -9)), flFb = g(0), flW = g(0), FLB = Math.pow(PHI, -7);   // phi: base delay PHI^-7 s (3.4 ms), sweep +-PHI^-9 s
  flD.delayTime.value = FLB; flL.frequency.value = 0; flL.connect(flDep); flDep.connect(flD.delayTime); flL.start();
  post.connect(flD); flD.connect(flFb); flFb.connect(flD); flD.connect(flW); flW.connect(post2);
  var nzBP = c.createBiquadFilter(), nzG = g(0), nzB = null; nzBP.type = 'bandpass'; nzBP.connect(nzG); nzG.connect(post2);
  flW.connect(TAP[1]); rAmp.connect(TAP[2]); nzG.connect(TAP[3]);       // throw taps: flanger wet, scatter loop alone, riser
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
    { k: 'crush', lab: 'Crush', L: R2, names: ['off', 'touch', 'some', 'lots', 'max'], kind: 'mul' },
    { k: 'trans', lab: 'Transition (\uD83D\uDD00)', L: [0, 1, 2, 3, 4, 5, 6], names: ['auto', 'techno cut', 'trance build', 'echo out', 'scatter roll', 'flanger wash', 'random'], kind: 'pick' }   // unit: style index (0 = auto: the pump energy picks; 6 = random: chance picks each time, Danny 18:53 AWST 27 Oct 'Keep auto and add random')
  ];
  var nudge = {}, seed = null, nodes = {};
  FX.forEach(function (f, i) { nudge[f.k] = 0; nodes[f.k] = P ? P.node('djfx:' + f.k, SPB - 1, PHI * SPB - 1, IPH * IPH, P.page, i) : null; });   // phi: periods PHI^5.5.. s, depth PHI^-2
  function energy() {                                                     // pump energy u in (0,1): excited, urgent, hot and day push it up
    var p = D.pumps(); return 1 / (1 + Math.pow(PHI, p.tp + p.wp + p.up + p.mp));
  }
  // CROSS-MODULATION (Danny 15:14; data layer, MIDI Bot pump-mapping sweep #2): each effect follows its own dimension of the start engine's
  // data layer (roll and the auto transition style: drive; filter: brightness; echo and wash: space; crush: drive x tension), heard
  // through the effect's own coupling weights per knob group (1 = as the music hears it; a tiny 🎲 re-rolls them PHI^-1..PHI^1), and the
  // coupling glides (tau PHI s, rule 6). The effects feed back a little: their smoothed mean (back(), tau PHI^2 s) leans the chain level
  // down by up to PHI^-2 rungs and sways the pump-knob needles.
  var PKS = ['tp', 'wp', 'up', 'mp'], DIM = { roll: ['drive'], filter: ['brightness'], echo: ['space'], wash: ['space'], crush: ['drive', 'tension'], trans: ['drive'] };
  var wseed = {}, uk = {}, bk = 0, T0FX = c.currentTime;               // T0FX: the engine's own PHI^2 s fade-in owns the level until then
  function cw(k) { var sd = wseed[k]; return PKS.map(function (x, j) { return sd == null ? 1 : Math.pow(PHI, 2 * frac((sd * PKS.length + j) * IPH) - 1); }); }
  function uOf(k, dt) {                                                   // this effect's own dimension (0..1), damped
    var tgt = 1; if (K.dimX) { var X = K.dimX(cw(k)); DIM[k].forEach(function (d) { tgt *= 1 / (1 + Math.pow(PHI, -X[d])); }); } else tgt = energy();
    if (k === 'wash') tgt = 1 - tgt;                                      // wash = (1 - u): more space, more wash
    uk[k] = uk[k] == null ? tgt : uk[k] + (tgt - uk[k]) * (1 - Math.exp(-(dt || IPH) / PHI)); return uk[k];
  }
  function back() { return bk; }
  function wob(k) { var n = nodes[k]; try { return n ? n.out() : 1; } catch (e) { return 1; } }
  function live(k, u0) {
    var u = uk[k] == null ? uOf(k) : uk[k];
    if (k === 'roll') return clamp(Math.floor(u * FX[0].L.length), 0, FX[0].L.length - 1);
    if (k === 'filter') return clamp((2 * u - 1) * IPH * IPH + (wob(k) - 1) * IPH, -1, 1);
    if (k === 'echo') return clamp(u * IPH * IPH * wob(k), 0, 1);
    if (k === 'wash') return clamp((1 - u) * IPH * wob(k), 0, 1);
    if (k === 'trans') return AUTO[clamp(Math.floor(u * wob(k) * AUTO.length), 0, AUTO.length - 1)];   // auto: calm pumps flanger/echo, lively scatter/techno
    return clamp((u - IPH) * IPH * wob(k), 0, 1);                        // crush: only on the liveliest pumps
  }
  var AUTO = [5, 3, 2, 4, 1];                                             // unit: styles in order of pump energy
  function near(f, v) { if (f.kind === 'idx' || f.kind === 'pick') return v; var b = 0, d = Infinity; f.L.forEach(function (x, i) { if (Math.abs(x - v) < d) { d = Math.abs(x - v); b = i; } }); return b; }
  function liveIdx(f, u) { var v = live(f.k, u), i = near(f, v); return f.kind === 'mul' && v > 0 && i === 0 ? 1 : i; }
  function effOf(f, u) {                                                   // live value with the hand nudge on top (in rungs)
    var v = live(f.k, u), li = liveIdx(f, u), j = clamp(li + nudge[f.k], 0, f.L.length - 1);
    if (f.kind === 'pick') { var hi = clamp(nudge[f.k] | 0, 0, f.L.length - 1); return { v: hi || li, i: hi, li: li }; }   // a hand pick is absolute; 0 = auto
    if (!nudge[f.k]) return { v: f.kind === 'idx' ? f.L[li] : v, i: f.kind === 'idx' ? li : near(f, v), li: li };
    if (f.kind === 'idx') return { v: f.L[j], i: j, li: li };
    if (f.kind === 'add') return { v: clamp(f.L[j] + (v - f.L[li]), -1, 1), i: j, li: li };
    return { v: j ? clamp(f.L[j] * (f.L[li] ? v / f.L[li] : 1), 0, 1) : 0, i: j, li: li };
  }
  // ---------- apply (every PHI^-1 s, everything glides) ----------
  var E = {}, bits = 0, PAD = null, padFl = false;                       // PAD: the logo Kaoss pad's offsets (js/logo-pad.js), null at rest
  function crushCurve(b) {
    var n = Math.pow(2, Math.round(Math.pow(PHI, 5))), a = new Float32Array(n), q = Math.pow(2, b - 1);   // phi: 2^11 curve points
    for (var i = 0; i < n; i++) { var x = 2 * i / (n - 1) - 1; a[i] = Math.round(x * q) / q; } return a;
  }
  function apply(tau) {
    irReady(); FX.forEach(function (f) { uOf(f.k); }); var u = energy(), bpm = (D.track && D.track.bpm) || D.compute().bpm, beat = SPM / bpm;
    FX.forEach(function (f) { E[f.k] = effOf(f, u); });
    if (c.currentTime < TXu) { sync(); return; }                         // (the logo pad waits too)
    if (PAD) { E.filter.v = clamp(E.filter.v + PAD.filter, -1, 1); ['echo', 'wash', 'crush'].forEach(function (k) { E[k].v = clamp(E[k].v + PAD[k], 0, 1); }); }   // logo pad: on top of the pumped values
    if (PAD || padFl) { var fb = bpm / SPM; padFl = !!PAD;                 // logo pad flanger: sweep at the beat rate x PHI^-3 .. x PHI^-2 with distance; silent at rest
      to(flW.gain, PAD ? PAD.flw * IPH * IPH : 0, tau); to(flFb.gain, PAD ? PAD.flw * IPH : 0, tau); to(flL.frequency, PAD ? fb * Math.pow(PHI, PAD.r - 3) : 0, tau); }                         // a transition owns the sweeps until its tail is done
    var fv = E.filter.v, span = Math.log(FHI / FLO);
    to(lp.frequency, FHI * Math.exp(-span * IPH * Math.max(0, -fv)), tau); var hpF = FLO * Math.exp(span * IPH * Math.max(0, fv)), bR = !PAD && K.bassRoot ? K.bassRoot() : null; if (bR) hpF = Math.min(hpF, Math.max(FLO, bR.f * Math.pow(PHI, -(1 + bR.w))));   // bass fix 3: at rest the HP stays under the bass fundamental (transitions and the pad keep the full sweep)
    to(hp.frequency, hpF, tau);
    var e = E.echo.v, dT = beat / 2, now = c.currentTime, q = Math.pow(PHI, -6);
    if (now >= thrU) {                                                    // a throw's tail owns the echo (and the pad's echo corner) until it has rung out
    if (Math.abs(dT - eDel.delayTime.value) > q * q) {                    // tempo change: no glide on delayTime (that warbles the pitch); dip, jump, return
      eRet.gain.setTargetAtTime(0, now, q); eFb.gain.setTargetAtTime(0, now, q);
      eDel.delayTime.setValueAtTime(dT, now + q * PHI * PHI); eRet.gain.setTargetAtTime(1, now + q * PHI * PHI, IPH);   // phi: jump once the tail is down (PHI^-4 s)
    }
    to(eSend.gain, e, tau); eFb.gain.setTargetAtTime(fbTo(e * IPH), now + q * PHI * PHI, tau || IPH); }
    to(wSend.gain, wConv.buffer ? E.wash.v * IPH : 0, tau);
    var cr = E.crush.v * (K.chip ? K.chip() : 1), b = cr ?   // bit-crush rides the chip share (Danny 16:53)
       Math.round(Math.pow(PHI, 4) * (1 - cr)) + SPB : 0;   // phi: gentle bit depth, PHI^4 rungs above 4 bits
    if (b && b !== bits) { bits = b; shp.curve = crushCurve(b); }
    to(cWet.gain, cr * IPH * IPH, tau); to(cDry.gain, 1 - cr * Math.pow(PHI, -3), tau);   // phi: gentle, at most PHI^-2 wet
    var m = (E.echo.v + E.wash.v + E.crush.v + Math.abs(E.filter.v) + (E.roll.v ? IPH : 0)) / R2N(); bk += (m - bk) * (1 - Math.exp(-IPH / (PHI * PHI)));   // phi: tau PHI^2 s
    if (c.currentTime > T0FX + PHI * PHI) out.gain.setTargetAtTime(Math.pow(PHI, -bk * IPH * IPH), c.currentTime, PHI * PHI);   // phi: up to PHI^-2 rungs lean, tau PHI^2 s
    var trg = TRG = energy() * IPH / (beat * SPB);                              // rolls per second: share of bars x bars per second
    lfo.frequency.setTargetAtTime(trg * PHI * PHI, c.currentTime, tau || IPH);   // phi: scatter amplitude moves PHI^2 faster than its trigger rate (rule 6 glide)
    sync();
  }
  // ---------- roll scheduler: on the last beat of a bar, loop a beat / F slice for the rest of that beat ----------
  var rolled = -1, rolls = 0, TRG = 0, lastF = 0;
  function rollTick() {                                                  // on the AUDIO clock: the engine's last even step is the anchor (MIDI Bot review: no wall-clock drift)
    var F = E.roll ? E.roll.v : 0, G = K.grid && K.grid(); if (!F || !G || !D.playing) return; if (c.currentTime < TXu) return;   // a transition owns the roll
    var S = SPB * SPB, beat = G.d16 * SPB, n = Math.floor(G.step / S), k = n * S + S - SPB;   // unit: sixteenths per bar; the last beat's first sixteenth
    if (k < G.step) { n++; k += S; }
    var t = G.t + (k - G.step) * G.d16, ahead = t - c.currentTime;
    if (n === rolled || ahead > Math.pow(PHI, -2) || ahead < 0) return;                  // phi: schedule PHI^-2 s ahead
    rolled = n; if (frac((n + (seed || 0)) * IPH) > energy() * IPH) return;                 // how often: pump energy x PHI^-1 of the bars
    rolls++;
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
  // ---------- TRANSITIONS (Danny 15:44): techno/trance-style mix-over on the bar grid ----------
  // A style = rungs (weight PHI^-k, null = off) for HP sweep on the outgoing, LP riser, flanger, scatter on the last beats, echo-out,
  // wash and noise riser; its length is a Fibonacci count of bars (1, 2, 3, 5, 8: the base rung, nudged a rung by pump energy),
  // starting on the next bar line, the drop pushed to a phrase line (SPB bars) when long; the new track lands ON the drop with the
  // style's fade (bars x PHI^k) and a bass swap. While it runs, the chain belongs to it (apply() hands off); the sweeps are logged
  // as CC74 (brightness), CC93 (flanger) and CC91 (wash) for the .mid.
  // THE THROW PLANNER (delay-throw design push 2, Danny 18:34 AWST; 'a delay comes in and records' the scatter so its repeats ring on
  // through the drop). x = drive through the echo's own coupling weights; throw amount A = x^(PHI^-1) (PHI^-1 + w_s space); every style gets w = 1 - (1 - w_ec)(1 - A), times the pumped
  // depth. Sources p_i ~ PHI^-((3x - r_i)^2 / width) over ranks mix 0, flanger 1, scatter 2, riser 3 (send gains sqrt p, equal power):
  // organic leans to a soft phrase tail, electronic to scatter and riser. Delay = F sixteenths, F in {2, 3, 4, 5, 8} (the roll's
  // Fibonacci counts and the beat), drive picks (busier = shorter, mid = 3, the dotted eighth). Ring-out in bars: T60 = PHI^(ring (1 - (1 - A)(1 - w_s space))),
  // g = min(cap, 10^(-3 delay / T60)). The taps open with the build and close linearly over the last sixteenth, exactly on the drop.
  // The echo stays the throw's until thrU = drop + T60 x PHI, then apply() glides it home. Open ranges are dials at mid-range
  // (exponents for PHI-power ranges): space weight w_s PHI^-2..PHI^-1, ring top PHI..PHI^3, cap PHI^-1..PHI^-1/2, send HP FLO PHI^4..PHI^6, rung offset 0.
  // cite: 60 dB decay of a recirculating delay G = 10^(-3/n60) (J.O. Smith, PASP); dotted eighth for dub (Attack Magazine); HP the
  // repeats above 200-300 Hz (atixUniverse); DJM ECHO / ECHO OUT keep the tail after the fader closes (Pioneer DJ DJM-S11 manual)
  var TD = { sw: Math.pow(PHI, -(2 + 1) / 2), ring: Math.pow(PHI, (1 + 3) / 2), cap: Math.pow(PHI, -(1 + 1 / 2) / 2), hp: (4 + 6) / 2, wid: 1, dF: 0, lp: -(1 + 3) / 2, cd: 1 / 2, dC: 0, dk: (1 + 2) / 2, dr: (3 + 5) / 2 }, FDEL = [2, 3, SPB, 5, 8], thrU = 0, lastThr = null;
  function thrX() { if (!K.dimX) return energy(); var X = K.dimX(cw('echo')); return 1 / (1 + Math.pow(PHI, -X.drive)); }   // the electronic zone: drive, heard through the echo's own coupling weights (the echo knob itself follows space since djdata)
  function thrS() { if (!K.dimX) return 1 - energy(); var X = K.dimX(cw('echo')); return 1 / (1 + Math.pow(PHI, -X.space)); }   // space, heard through the same coupling weights
  // Danny 19:00 AWST: no either/or, a gradient. A = drive^(PHI^-1) x (PHI^-1 + w_s space), drive leads; space only lengthens and softens
  // the tail (calm evenings: a gentle, longer echo, never the biggest throws). w_s is an open range PHI^-2..PHI^-1, dial at mid (exponent 3/2).
  function throwAmt() { return clamp(Math.pow(clamp(thrX(), 0, 1), IPH) * (IPH + TD.sw * clamp(thrS(), 0, 1)), 0, 1); }   // A as one function (the exit mix adds its echo exits here later)
  function planThrow(S, td, e0, d16, bar, dp) {
    var x = clamp(thrX(), 0, 1), A = throwAmt(), wec = S.ec == null ? 0 : Math.pow(PHI, -S.ec), w = (1 - (1 - wec) * (1 - A)) * dp;
    if (!(w > Math.pow(PHI, -8))) return null;                            // phi: below PHI^-8 there is nothing to throw
    var u = energy(), F = FDEL[clamp(Math.round(1 + 2 * (1 / 2 - u) * (FDEL.length - 2) + TD.dF), 0, FDEL.length - 1)], dl = F * d16;
    var sT = TD.sw * clamp(thrS(), 0, 1), T60 = Math.pow(PHI, TD.ring * (1 - (1 - A) * (1 - sT))), gF = fbTo(Math.min(TD.cap, Math.pow(10, -3 * dl / (T60 * bar))));
    var p = [0, 1, 2, 3].map(function (r) { return Math.pow(PHI, -Math.pow(3 * x - r, 2) / TD.wid); }), ps = p.reduce(function (a, b) { return a + b; }, 0), q = Math.pow(PHI, -6);
    tHP.frequency.setValueAtTime(FLO * Math.pow(PHI, TD.hp), e0);
    if (Math.abs(eDel.delayTime.value - dl) > q * q) { var tj = Math.max(c.currentTime, e0 - q * PHI * PHI); eRet.gain.setTargetAtTime(0, tj, q); eDel.delayTime.setValueAtTime(dl, e0); eRet.gain.setTargetAtTime(1, e0, q); }   // dip, jump, return before the taps open
    TAP.forEach(function (t, i) { var gi = Math.sqrt(p[i] / ps) * w; t.gain.cancelScheduledValues(c.currentTime); t.gain.setValueAtTime(0, e0); t.gain.linearRampToValueAtTime(gi, td - d16); t.gain.linearRampToValueAtTime(0, td); });
    eFb.gain.cancelScheduledValues(e0); eFb.gain.setValueAtTime(gF, e0);
    thrU = td + T60 * bar * PHI; var nw = c.currentTime; [tLP.frequency, tChop.gain].forEach(function (p) { p.cancelScheduledValues(nw); p.setValueAtTime(p.value, nw); });   // a tail still chopping hands over: gate home, LP to the new start
    tChop.gain.setTargetAtTime(1, nw, IPH * IPH); tLP.frequency.setTargetAtTime(FHI * Math.pow(PHI, TD.lp), nw, IPH * IPH); tChop.gain.setValueAtTime(1, e0); tLP.frequency.setValueAtTime(FHI * Math.pow(PHI, TD.lp), e0);
    return (lastThr = { bar: bar, beat: d16 * SPB, cn: td, x: x, s: thrS(), A: A, w: w, F: F, delay: dl, T60bars: T60, g: gF, taps: p.map(function (v) { return v / ps; }), drop: td, until: thrU });
  }
  // CHOP AND DARKENING (delay-throw design push 3, Danny 18:34 AWST). After the drop the throw's return is gated (the loop rings on under
  // it): F_c gates per beat, F_c in {2, 3, 5, 8} from drive (mid 3), duty PHI^-1; depth ramps over the first bar from 0 to
  // cd' (1 - PHI^-(1 + PHI t d)), t = tension through the echo's coupling, d = key travel of the bridge (fifths / D, as travel() weighs it);
  // edge tau from PHI^-8 s (bright: hard chop) to period x PHI^-3 (dark: tremolo), one gradient. The loop low-pass starts at FHI PHI^lp and
  // falls PHI^-1 (1 + PHI t d) rungs per bar, so a far key at high tension goes dull in about two bars; both glide home at thrU.
  // Gates are written PHI^-2 s ahead on the audio clock (like rollTick), about two events per slice, no oscillator.
  // Open ranges as dials at mid: loop LP start exponent -3..-1 (lp), chop depth share 0..1 (cd, the formula at 1/2 x 2), rung offset (dC).
  // cite: gate into delay (Attack Magazine; Sound On Sound 'gated delays'), tape-echo darkening (Smith PASP; Ableton Echo manual)
  var FCH = [2, 3, 5, 8];
  function thrT() { if (!K.dimX) return 1 - energy(); var X = K.dimX(cw('echo')); return 1 / (1 + Math.pow(PHI, -X.tension)); }
  function thrB() { if (!K.dimX) return energy(); var X = K.dimX(cw('echo')); return 1 / (1 + Math.pow(PHI, -X.brightness)); }
  function chopTick() {
    var L = lastThr, now = c.currentTime, ah = Math.pow(PHI, -2); if (!L || now >= L.until || now < L.drop - ah) return;
    if (L.td == null) {                                                    // once, at the drop: the bridge is planned by now
      var kt = K.keyTravel ? K.keyTravel() : 0, tk = clamp(thrT() * clamp(kt || 0, 0, 1), 0, 1), k = IPH * (1 + PHI * tk);
      L.td = tk; L.fall = k; L.dmax = clamp(2 * TD.cd, 0, 1) * (1 - Math.pow(PHI, -(1 + PHI * tk)));
      L.Fc = FCH[clamp(Math.round(1 + 2 * (L.x - 1 / 2) * (FCH.length - 2) + TD.dC), 0, FCH.length - 1)]; L.per = L.beat / L.Fc;
      L.edge = Math.pow(PHI, -8) * Math.pow(L.per * Math.pow(PHI, -3) / Math.pow(PHI, -8), 1 - clamp(thrB(), 0, 1));
      var f0 = FHI * Math.pow(PHI, TD.lp), f1 = Math.max(FLO, f0 * Math.pow(PHI, -k * (L.until - L.drop) / L.bar));
      tLP.frequency.setValueAtTime(f0, L.drop); tLP.frequency.exponentialRampToValueAtTime(f1, L.until); tLP.frequency.setTargetAtTime(FHI, L.until, IPH); L.cn = L.drop;
    }
    var end = Math.min(L.until, now + ah);
    while (L.cn < end) { var t = L.cn, dc = L.dmax * clamp((t - L.drop) / L.bar, 0, 1);
      if (t >= now) { tChop.gain.setTargetAtTime(1, t, L.edge); if (t + L.per * IPH < L.until) tChop.gain.setTargetAtTime(1 - dc, t + L.per * IPH, L.edge); }
      L.cn += L.per; }
    if (end >= L.until && !L.home) { L.home = 1; tChop.gain.setTargetAtTime(1, L.until, IPH); }   // after the last gate: home
  }
  // KICK DUCK (delay-throw design push 4): Web Audio has no sidechain, but the engine knows each kick when it schedules it, so the incoming
  // track's kicks call kick(t) and, while a throw's tail rings, the return dips to PHI^-(dk - 1/2) (PHI^-1, -4.2 dB at mid) and on the
  // drop's first downbeat to PHI^-(dk + 1/2) (PHI^-2, -8.4 dB), releasing with tau PHI^-dr s (PHI^-4 = 0.146 s at mid). Dials at mid:
  // depth exponent 1..2 (dk), release exponent 3..5 (dr). cite: ducking delay ~150 ms release, 2-10 dB (Ableton Echo; Pioneer DJM ducking echo)
  function kick(t) {
    var L = lastThr; if (!L || !(t >= L.drop - Math.pow(PHI, -6)) || t >= L.until) return;
    var first = Math.abs(t - L.drop) < L.beat / (2 * SPB), dip = Math.pow(PHI, -(TD.dk + (first ? 1 : -1) / 2)), a = Math.pow(PHI, -8);
    tDuck.gain.setTargetAtTime(dip, t, a); tDuck.gain.setTargetAtTime(1, t + Math.pow(PHI, -6), Math.pow(PHI, -TD.dr)); L.ducks = (L.ducks || 0) + 1;
  }
  var BARS = [1].concat(FIB.slice(1)), TXu = 0, txBusy = false, txLog = null, lastTx = null;   // Fibonacci bar counts 1, 2, 3, 5, 8
  var STY = [null,
    { n: 'techno cut',    r: 0, hp: 0, fl: 2, sc: 1, ec: 2, fade: -2 },   // unit: rung exponents
    { n: 'trance build',  r: 3, lp: 0, fl: 1, sc: 2, wa: 2, nz: 1, fade: 0 },   // unit: rung exponents
    { n: 'echo out',      r: 1, hp: 1, ec: 0, wa: 2, fade: -3 },   // unit: rung exponents
    { n: 'scatter roll',  r: 0, hp: 2, fl: 2, sc: 0, ec: 2, fade: -1 },   // unit: rung exponents
    { n: 'flanger wash',  r: 2, lp: 2, fl: 0, wa: 1, nz: 2, fade: 1 }];   // unit: rung exponents (weight = PHI^-k)
  function wt(S, k) { return S[k] == null ? 0 : Math.pow(PHI, -S[k]); }
  function noiseBuf() { if (nzB) return nzB; var n = c.sampleRate, b = c.createBuffer(1, n, n), d = b.getChannelData(0); for (var j = 0; j < n; j++) d[j] = Math.random() * 2 - 1; return (nzB = b); }   // unit: one second of white noise
  function hold(p, t) { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); }
  function rollAt(t, beat, F) {                                           // one beat-repeat: loop a beat / F slice for the rest of the beat
    var L = beat / F, s = Math.pow(PHI, -8), end = t + beat;               // phi: click-free edges
    rDel.delayTime.setValueAtTime(L, t); rIn.gain.setTargetAtTime(1, t, s); rIn.gain.setTargetAtTime(0, t + L, s);
    rFb.gain.setTargetAtTime(1, t + L, s); rFb.gain.setTargetAtTime(0, end, s);
    rOut.gain.setTargetAtTime(1, t + L, s); rOut.gain.setTargetAtTime(0, end, s); rDry.gain.setTargetAtTime(IPH, t + L, s); rDry.gain.setTargetAtTime(1, end, s);
  }
  // AUTO SWEEP (Danny 20:03 AWST 26 Oct: 'when the transition is set to auto just sweep through all of the parameters and anything can
  // show up at the next transition across any genre'): with the Transition dial on auto, every style can come at every transition,
  // drawn on the golden sequence (stream per parameter, like the rhythm plan's gold()), and the wait and depth are drawn across their
  // full ranges. Energy stays a gentle tilt, never a gate: style weight PHI^-|u - its energy place| (at most PHI between any two), and
  // the pumped wait / depth keep a PHI^-2 share of the draw. A style picked on the dial is unchanged. Key travel, bridge, bar grid as before.
  var txN = 0;
  function autoSweep() { return !(nudge.trans | 0); }
  function gdraw(k) { return frac((txN + 1) * IPH + (seed || 0) * IPH * IPH + k * Math.pow(IPH, 3)); }   // golden sequence, stream k
  function sweepStyle(u) { var n = AUTO.length, w = AUTO.map(function (st, j) { return Math.pow(PHI, -Math.abs(u - j / (n - 1))); }), x = gdraw(1) * w.reduce(function (a, b) { return a + b; }, 0);
    for (var j = 0; j < n; j++) { x -= w[j]; if (x <= 0) return AUTO[j]; } return AUTO[n - 1]; }
  function transition(go, o) {
    var G = K.grid && K.grid(); if (!G || !D.playing || txBusy) return false;
    var sw = autoSweep(), dk = !!(o && o.desk); if (sw && !dk) { txN++; var u0 = energy(), g2 = gdraw(2), g3 = gdraw(3), q2 = IPH * IPH;
      o = { wait: g2 * (1 - q2) + (o && o.wait != null ? clamp(o.wait, 0, 1) : u0) * q2,
            depth: Math.pow(Math.pow(PHI, -2 * (1 - g3)), 1 - q2) * Math.pow(o && o.depth != null ? clamp(o.depth, IPH * IPH, 1) : 1, q2) }; }
    var st = sw ? sweepStyle(energy()) : E.trans ? E.trans.v : AUTO[0]; if (st === 6) st = 1 + Math.floor(Math.random() * (STY.length - 1));   // random: any of the five, by chance
    var S = STY[st] || STY[1], S16 = SPB * SPB, d16 = G.d16, bar = d16 * S16, beat = d16 * SPB, now = c.currentTime;   // unit: sixteenths per bar
    var u = energy(), ri = clamp((o && o.wait != null ? Math.round(o.wait * (BARS.length - 1)) : S.r) + Math.round((u - 1 / 2) * IPH * PHI), 0, BARS.length - 1), nB = BARS[ri];   // automatic changes: the landing-wait dial picks the rung   // pump nudge of up to a rung
    var k = Math.ceil(G.step / S16) * S16, ts = G.t + (k - G.step) * d16; while (ts < now + Math.pow(PHI, -2)) { ts += bar; k += S16; }   // phi: the next bar line at least PHI^-2 s out
    if (dk && o.bars > 0) nB = o.bars;                                   // DESK CHANGES (Danny 18:59 AWST 27 Oct: 'build it as dials'): his own build length, no phrase snap
    var bs = k / S16, bd = bs + nB; if (!dk && nB >= SPB - 1 && bd % SPB) bd += SPB - bd % SPB;   // long ones land on a phrase line (SPB bars)
    var dp = o && o.depth != null ? clamp(o.depth, 0, 1) : 1, wt0 = wt; wt = function (S, k) { return wt0(S, k) * dp; };   // automatic changes: sweeps scaled by the pumped depth
    try {
    var td = ts + (bd - bs) * bar, T = td - ts, tail = bar, s8 = Math.pow(PHI, -6);
    txBusy = true; TXu = td + tail + PHI; lastTx = { style: S.n, idx: st, bars: bd - bs, start: ts, drop: td, now: now, dp: dp };   // dp: the pumped depth (the voice's light-build bump reads it)
    [lp.frequency, hp.frequency, eSend.gain, eFb.gain, wSend.gain, flW.gain, flFb.gain, flL.frequency, nzG.gain, nzBP.frequency].forEach(function (p) { hold(p, now); });
    var w;
    if ((w = wt(S, 'hp'))) { hp.frequency.setValueAtTime(Math.max(FLO, hp.frequency.value), ts); hp.frequency.exponentialRampToValueAtTime(FLO * Math.pow(PHI, SPB + PHI * PHI * w), td);   // phi: HP sweep up to FLO PHI^(4+PHI^2 w)
      hp.frequency.setTargetAtTime(FLO, td, s8); }
    if ((w = wt(S, 'lp'))) { lp.frequency.setTargetAtTime(FHI * Math.pow(PHI, -PHI * PHI * PHI * w), now, beat * IPH); lp.frequency.setValueAtTime(FHI * Math.pow(PHI, -PHI * PHI * PHI * w), ts);
      lp.frequency.exponentialRampToValueAtTime(FHI, td); }                // phi: riser from PHI^-PHI^3 under the top, open at the drop
    if ((w = wt(S, 'fl'))) { flW.gain.setValueAtTime(0, ts); flW.gain.linearRampToValueAtTime(w * IPH, td); flW.gain.setTargetAtTime(0, td + beat, tail * IPH);
      flFb.gain.setValueAtTime(w * IPH * IPH, ts); flFb.gain.setTargetAtTime(0, td + tail, tail * IPH);
      flL.frequency.setValueAtTime(1 / bar, ts); flL.frequency.exponentialRampToValueAtTime(PHI * PHI / beat, td); flL.frequency.setTargetAtTime(0, td + tail, tail); }   // phi: sweep speeds up to PHI^2 per beat
    if ((w = wt(S, 'sc'))) { var nb = Math.max(1, Math.round(SPB * w)); for (var b = 0; b < nb; b++) rollAt(td - (nb - b) * beat, beat, FIB[clamp(1 + b + SPB - nb, 1, FIB.length - 1)]); }   // last beats, accelerating 1/2 .. 1/8
    var thr = planThrow(S, td, td - Math.min(T, bar), d16, bar, dp); lastTx.thr = thr;   // echo-out is now the throw (style ec + the electronic zone): only the outgoing feeds the tail
    if (thr) { eSend.gain.setValueAtTime(eSend.gain.value, td - d16); eSend.gain.linearRampToValueAtTime(0, td); }   // the knob's own send closes on the drop too, so the incoming kick never enters the throw
    if ((w = wt(S, 'wa')) && wConv.buffer) { wSend.gain.setValueAtTime(wSend.gain.value, ts); wSend.gain.linearRampToValueAtTime(w * IPH, td); wSend.gain.setTargetAtTime(0, td, tail * IPH); }
    if ((w = wt(S, 'nz'))) { var ns = c.createBufferSource(); ns.buffer = noiseBuf(); ns.loop = true; ns.connect(nzBP); ns.start(ts); ns.stop(td + tail);
      nzBP.frequency.setValueAtTime(FLO * Math.pow(PHI, PHI * PHI * PHI * PHI), ts); nzBP.frequency.exponentialRampToValueAtTime(FHI * IPH * IPH, td);   // phi: riser band PHI^PHI^4 x FLO -> PHI^-2 x FHI
      nzG.gain.setValueAtTime(0, ts); nzG.gain.linearRampToValueAtTime(w * Math.pow(PHI, -5), td); nzG.gain.setTargetAtTime(0, td, Math.pow(PHI, -4)); }   // phi: riser at most PHI^-5 (the noise stays under the music)
    var fade = dk && o.fade > 0 ? o.fade : bar * Math.pow(PHI, S.fade);   // a desk change: his own fade
    setTimeout(function () { go({ at: td, fade: fade, swap: true, style: S.n }); }, Math.max(0, (td - c.currentTime - Math.pow(PHI, -2)) * MS));   // phi: hand over PHI^-2 s before the drop
    setTimeout(function () { txBusy = false; }, (td - c.currentTime + tail) * MS);
    // CC log for the export: brightness (LP up, HP down), flanger wet, wash, sampled on the sixteenth grid from now to the tail
    var R = K.recCC, span = Math.log(FHI / FLO); if (txLog && txLog.fn && K.never) K.never(txLog); else clearInterval(txLog);
    var q = '';
    function ccNow() { var x = (Math.log(lp.frequency.value / FLO) - Math.log(hp.frequency.value / FLO)) / span, v = [x, flW.gain.value * PHI, wSend.gain.value * PHI];   // unit: GM brightness, chorus/flanger depth, reverb send
      R(74, v[0]); R(93, v[1]); R(91, v[2]); var k = v.map(function (y) { return Math.round(clamp(y, 0, 1) * 127); }).join(), same = k === q; q = k; return same; }   // unit: 7-bit CC steps (settled = no step changed)
    // MIDI Bot review: the values before the sweep are logged at the call, and logging runs on past the hand-back (TXu) until the knobs
    // have settled again (a beat after apply() takes over), so the file ends at the resting brightness and sends, not mid-tail
    if (R) { ccNow(); var stopLog = function () { if (K.never) K.never(txLog); else clearInterval(txLog); }, logIt = function () { var st = ccNow(); if ((st && c.currentTime > TXu + beat) || c.currentTime > TXu + PHI * PHI * PHI) stopLog(); };
      txLog = K.every ? K.every(logIt, d16 * MS) : setInterval(logIt, d16 * MS); }   // phi: give up PHI^3 s after the hand-back
    } finally { wt = wt0; }
    sync(); return true;
  }
  // ---------- knob chips (same style as the pump knobs) ----------
  var els = {}, box = null, btn = null, ndl = {};
  function build() {
    var host = document.getElementById('dj-chips'); if (!host || box) return;
    box = document.createElement('div'); box.className = 'dj-fx';
    var hd = document.createElement('div'); hd.className = 'dj-fx-hd';
    var h = document.createElement('span'); h.textContent = 'effects';
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dj-fxr'; btn.title = 'Random effects (hold: back to live)';
    btn.setAttribute('aria-label', 'Random effects (hold for live effects)'); btn.innerHTML = '<span aria-hidden="true">&#127922;</span> effects';
    hd.appendChild(h); hd.appendChild(btn); box.appendChild(hd);
    FX.forEach(function (f) {
      var fs = document.createElement('fieldset'), lg = document.createElement('legend'); fs.className = 'dj-grp'; lg.textContent = f.lab; fs.appendChild(lg); els[f.k] = [];
      var kb = document.createElement('button'); kb.type = 'button'; kb.className = 'dj-kr'; kb.title = 'Random ' + f.lab.toLowerCase(); kb.setAttribute('aria-label', kb.title);
      kb.innerHTML = '<span aria-hidden="true">&#127922;</span>'; kb.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); reroll(f);
        kb.classList.remove('is-mixing'); void kb.offsetWidth; kb.classList.add('is-mixing'); }); fs.appendChild(kb);
      f.names.forEach(function (nm, i) {
        var l = document.createElement('label'), r = document.createElement('input'), s = document.createElement('span');
        r.type = 'radio'; r.name = 'djfx-' + f.k; r.value = i; s.textContent = nm;
        r.addEventListener('change', function () { if (!r.checked) return; var li = liveIdx(f, energy()); nudge[f.k] = f.kind === 'pick' ? i : i - li; apply(); save(); });
        l.appendChild(r); l.appendChild(s); fs.appendChild(l); els[f.k].push([i, r, l]);
      });
      ndl[f.k] = document.createElement('i'); ndl[f.k].className = 'dj-needle'; ndl[f.k].setAttribute('aria-hidden', 'true'); fs.appendChild(ndl[f.k]);
      box.appendChild(fs);
    });
    host.appendChild(box); wireBtn(); sync();
  }
  function sync() {
    FX.forEach(function (f) { var e = E[f.k]; if (!e) return; (els[f.k] || []).forEach(function (x) {
      if (x[1].checked !== (x[0] === e.i)) x[1].checked = x[0] === e.i; x[2].classList.toggle('is-live', x[0] === e.li);
      x[2].title = x[0] === e.li ? 'live now' + (nudge[f.k] ? '' : ' (no nudge)') : ''; }); });
    if (box && box.offsetParent) FX.forEach(function (f) { var e = E[f.k]; if (e) place(ndl[f.k], (els[f.k] || []).map(function (x) { return x[2]; }), pos(f, e)); });
  }
  function pos(f, e) {                                                    // continuous rung position of the live value (needle)
    var n = f.L.length - 1;
    if (f.kind === 'idx') return clamp(e.i + (wob(f.k) - 1) * PHI, 0, n);
    if (f.kind === 'pick') return clamp(e.li + (wob(f.k) - 1) * PHI, 0, n);
    if (f.kind === 'add') { for (var i = 0; i < n; i++) if (e.v <= f.L[i + 1]) return i + (e.v - f.L[i]) / (f.L[i + 1] - f.L[i]); return n; }
    return e.v > 0 ? clamp(n + Math.log(e.v) / Math.log(PHI), 1, n) : 0;   // phi: amount rungs are powers of PHI
  }
  function place(nd, labs, x) {
    if (!nd || !labs.length) return; var i = clamp(Math.floor(x), 0, labs.length - 1), j = Math.min(i + 1, labs.length - 1), f = clamp(x - i, 0, 1), a = labs[i], b = labs[j];
    if (b.offsetTop !== a.offsetTop) { b = a; f = 0; }
    var cx = a.offsetLeft + a.offsetWidth / 2 + f * (b.offsetLeft + b.offsetWidth / 2 - a.offsetLeft - a.offsetWidth / 2);
    nd.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + (a.offsetTop + a.offsetHeight).toFixed(1) + 'px)';
  }
  function reroll(f) {                                                    // one effect: a random rung + fresh coupling weights, gliding in
    var sd = Math.floor(Math.random() * Math.pow(2, 32)); wseed[f.k] = sd; uOf(f.k);   // unit: 2^32 seeds
    nudge[f.k] = Math.floor(frac(sd * IPH) * f.L.length) - (f.kind === 'pick' ? 0 : liveIdx(f, energy())); apply(PHI); save();
  }
  // ---------- random effects (golden-angle genome), hold = live ----------
  function draw(s) {
    var u = energy(); seed = s; if (s == null) FX.forEach(function (f) { delete wseed[f.k]; });   // hold: back to live couplings too
    FX.forEach(function (f, j) { nudge[f.k] = s == null ? 0 : Math.floor(frac((s * FX.length + j) * IPH) * f.L.length) - (f.kind === 'pick' ? 0 : liveIdx(f, u)); });
    apply(PHI); save();                                                   // rule 6: a new effects mix glides in, tau PHI s
    if (btn) { btn.classList.remove('is-mixing'); void btn.offsetWidth; btn.classList.add('is-mixing'); }
  }
  function fxGo() { draw(seed == null ? Math.floor(Date.now() / MS) : seed + 1); }   // the effects section's Random (tap); hold is draw(null)
  function wireBtn() {
    var held = 0, long = false;
    btn.addEventListener('pointerdown', function () { long = false; clearTimeout(held); held = setTimeout(function () { long = true; draw(null); }, IPH * MS); });   // phi: hold PHI^-1 s
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (n) { btn.addEventListener(n, function () { clearTimeout(held); }); });
    btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (long) { long = false; return; } fxGo(); });
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  // ---------- continuity ----------
  var RC = null;
  function save() { if (RC) RC.save(); }
  if (window.RhythmContinuity) RC = RhythmContinuity.register('djfx', {
    save: function () { return { n: nudge, seed: seed, w: wseed }; },
    catchUp: function (e, s, mode) { if (!s || mode === 'return') return; if (s.seed != null && isFinite(s.seed)) seed = s.seed; if (s.w) FX.forEach(function (f) { if (isFinite(s.w[f.k])) wseed[f.k] = s.w[f.k]; });
      if (mode !== 'restart' && s.n) FX.forEach(function (f) { if (isFinite(s.n[f.k])) nudge[f.k] = s.n[f.k]; }); },
    reset: function () { FX.forEach(function (f) { nudge[f.k] = 0; }); apply(); } });   // daily restart: knobs back to live, the effects seed stays
  // ---------- in ----------
  apply(); irReady(); K.fx({ inp: inp, out: out, sends: { echo: echoIn, wash: washIn } });                                  // the start engine crossfades dry -> this chain over PHI^2 s
  var EV = K.every || setInterval;                                        // phases on the one clock (core), else timers
  EV(function () { if (!document.hidden) apply(); }, IPH * MS);   // phi: knobs follow the live pumps every PHI^-1 s
  EV(rollTick, Math.pow(PHI, -4) * MS);
  EV(chopTick, Math.pow(PHI, -4) * MS);                          // phi: chop look-ahead every PHI^-4 s                          // phi: roll look-ahead every PHI^-4 s
  build();
  D.fx = { autoSweep: autoSweep, get txN() { return txN; }, random: function (hold) { if (hold) draw(null); else fxGo(); }, kick: kick, get lastThrow() { return lastThr; }, throwDial: function (k, v) { if (TD.hasOwnProperty(k) && isFinite(v)) TD[k] = +v; return TD[k]; }, get eff() { return JSON.parse(JSON.stringify(E)); }, get nudge() { return JSON.parse(JSON.stringify(nudge)); }, get seed() { return seed; }, get rolls() { return rolls; }, back: back, get u() { return JSON.parse(JSON.stringify(uk)); }, reroll: function (k) { FX.forEach(function (f) { if (f.k === k) reroll(f); }); }, get scatter() { return { base: RB, trigHz: TRG, widthHz: TRG * PHI, ampHz: lfo.frequency.value, amp: rAmp.gain.value, lastDiv: lastF }; },
    random: function (s) { draw(s === undefined ? (seed == null ? Math.floor(Date.now() / MS) : seed + 1) : s); },
    set: function (k, i) { FX.forEach(function (f) { if (f.k === k) nudge[k] = f.kind === 'pick' ? i : i - liveIdx(f, energy()); }); apply(); save(); }, energy: energy, transition: transition,
    pad: function (m) { PAD = m ? { filter: +m.filter || 0, echo: +m.echo || 0, wash: +m.wash || 0, crush: +m.crush || 0, flw: +m.flw || 0, r: +m.r || 0 } : null; apply(PAD ? Math.pow(PHI, -4) : IPH); },   // phi: pad glides tau PHI^-4 s, release glides home tau PHI^-1 s
    get padding() { return PAD ? JSON.parse(JSON.stringify(PAD)) : null; }, get lastTransition() { return lastTx; } };
})();
