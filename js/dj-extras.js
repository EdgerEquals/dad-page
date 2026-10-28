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
  function house(tr, kind, t, v) {                                         // our own kit (unchanged); a clap is its snare, a cowbell only exists on the 808
    if (kind === 'clap') kind = 'snare'; else if (kind === 'cow') return;
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

  // ---------- 808 BANK (Danny 15:2x-15:42 AWST 27 Oct, Claude chat: 'in my own studio I don't have just 1 808 ... multiple hardware
  // units ... replicas ... I just layer them up ... I want to do the same here ... do both'; 15:42 'build them both and get them in there
  // so I can hear them') ----------
  // Genres with bank: 1 (electro) play every drum hit on a rack of 808s. Unit 0 is the driftbox 808 at stock settings ('body'), unit 1
  // our own kit above (house, unchanged), unit 2 the driftbox 808 set up as a 'sub' box (a golden step lower, longer, no click: kick,
  // toms, snare body), unit 3 as a 'snap' box (shorter, brighter, more click / snappy: kick, snare, clap, hats). driftbox = @driftbox/engine
  // 0.6.0 by Louis Emmett, MIT (js/vendor/driftbox-808.js, licence and credit there), loaded on the first electro hit; until it lands the
  // house kit plays alone. Each driftbox unit is a few cents out (golden cents, +-PHI^5 / 2) and a few ms late (golden ms, 0..PHI^-11 s),
  // so the layers thicken instead of doubling.
  // THE RULE (docs/electrical-model.md): no gain dial anywhere here. How many units play is a pump count from the track's energy arc
  // (sub joins above PHI^-2, snap above PHI^-1: thresholds); each unit's share is a fixed coupling on the golden ladder PHI^-k / sqrt 5
  // (1 + PHI^-1 + PHI^-2 + PHI^-3 = sqrt 5, so the full rack sums to one kit); the 808's own voice balance is the driftbox kit's trims,
  // anchored to our kick by measurement (KM). Closed hats choke open ones (one circuit on the real machine). At most PHI^7 driftbox
  // voices sound at once (a count); past that a hit gets its body unit only.
  var D8 = null, d8Req = false, D8URL = 'js/vendor/driftbox-808.js?v=e808a';
  var B8 = { kick: '808.bd', snare: '808.sd', clap: '808.cp', tom: '808.lt', hat: '808.ch', shaker: '808.ma', cow: '808.cb' }, B8V = {};
  var KM = 0.2576;                                                         // data: our kick / driftbox kick, RMS of the first 200 ms, 48 kHz offline render (Claude, 27 Oct)
  var SHARE = [0, 1, 2, 3].map(function (k) { return Math.pow(PHI, -k) / Math.sqrt(5); });   // phi: ladder shares body, house, sub, snap
  var ROLE = [{ tune: 1 / 2, decay: 1 / 2, tone: 1 / 2, colour: 1 / 2 }, null,
              { tune: IPH * IPH, decay: IPH, tone: IPH * IPH, colour: Math.pow(IPH, 4) },    // sub: a golden step down, longer, darker, no click
              { tune: IPH, decay: IPH * IPH, tone: IPH, colour: IPH }];                      // snap: up a step, shorter, brighter, more click
  var SUBK = { kick: 1, tom: 1, snare: 1 }, SNAPK = { kick: 1, snare: 1, clap: 1, hat: 1 }, d8live = [];
  function load808() { if (d8Req) return; d8Req = true; var sc = document.createElement('script'); sc.src = D8URL; sc.async = true;
    sc.onload = function () { var W = window.Driftbox808; if (!W || !W.voices) return; W.voices.forEach(function (x) { B8V[x.id] = x; }); D8 = W; }; document.head.appendChild(sc); }
  function retune(spec, r) { spec.sources.forEach(function (s) { if (s.kind !== 'osc') return; s.frequency *= r; if (s.pitch) s.pitch = s.pitch.map(function (q) { return { to: q.to * r, at: q.at, curve: q.curve }; }); }); return spec; }
  // 808 CHARACTER (Danny 17:30-17:36 AWST 27 Oct, Claude chat: 'Yea' to each track getting its own 808 character, 'its own character
  // each with a character dial that lessens or exaggerates'): each track rolls its rack's set-up from its seed, a point on a smooth
  // range (not presets), fixed for the whole track: thickness (how far apart the boxes are tuned and timed, and how long they ring),
  // brightness (tone and click), the kit's pitch, and which box sits where in the golden spread. The character dial (DIAL c808, the
  // panel's '808 character' row) is a rung on the depth of that departure from the stock rack: off 0, less PHI^-1, normal 1, more
  // PHI, max PHI^2. It moves set-up, never level (THE RULE). Our own kit (unit 1) keeps its sound.
  function fr(x) { return x - Math.floor(x); }
  // rack boxes on the desk (Danny 18:12 AWST 27 Oct: mute / solo like a desk, inside the racks too): a box that is off plays no notes
  function bx(rack, u) { var DK = window.DadAutoDJ && DadAutoDJ.desk; return !DK || DK.box(rack, u); }
  function char808(tk) { if (tk.c8) return tk.c8; var sd = (tk.seed | 0) >>> 0, g = function (k) { return fr(sd * IPH + k * IPH * IPH) - 1 / 2; };   // phi: golden draws on the track seed, -1/2..1/2
    return (tk.c8 = { th: g(1), br: g(2), pt: g(3), rot: g(4) + 1 / 2 }); }
  function depth808() { var D = window.DadAutoDJ, d = D && D.dial ? +D.dial('c808') : 1; return isFinite(d) && d >= 0 ? d : 1; }
  function bank(tr, kind, t, v, a) {
    var tk = tr.tk || tr, e = tk.e == null ? 1 : tk.e, c = C(), now = c.currentTime, ch = char808(tk), dp = depth808(), cl = function (x) { return Math.max(0, Math.min(1, x)); };
    if (!D8) { load808(); if (bx('808', 1)) house(tr, kind, t, v); return; }
    var id = kind === 'hat' && a === 'x' ? '808.oh' : kind === 'tom' && tk.step % 16 >= 16 - 2 ? '808.mt' : B8[kind], V = B8V[id];   // the fill's last toms step up to the mid tom
    if (bx('808', 1) && grd() < 2) house(tr, kind, t, v * SHARE[1]);   // LOAD GUARD level 2: the 808 alone
    if (!V) return;
    d8live = d8live.filter(function (x) { return x > now; });
    var on = [0]; if (SUBK[kind] && e > IPH * IPH && grd() < 1) on.push(2); if (SNAPK[kind] && e > IPH && grd() < 1) on.push(3);   // pump count: units join as the arc rises
    if (d8live.length > Math.pow(PHI, 7)) on = [0];                        // phi: voice cap PHI^7
    on = on.filter(function (u) { return bx('808', u); });
    var acc = Math.max(0, Math.min(1, (v - IPH) / (1 - IPH)));             // x hits (v >= 1) are accented, o hits (v = PHI^-1) not
    if (kind === 'hat' && a !== 'x' && tr.oh) { tr.oh.forEach(function (o) { try { o.gain.cancelScheduledValues(t); o.gain.setTargetAtTime(0, t, Math.pow(PHI, -12)); } catch (er) {} }); tr.oh = null; }   // phi: choke over PHI^-12 s
    var VB = K.vibe ? K.vibe() : null, vt = VB ? VB.v * VB.t : 0;   // VIBE: the tone reach on the 808
    on.forEach(function (u) {
      var R = ROLE[u], k = fr(u * IPH + Math.min(dp, 1) * ch.rot), sp = Math.pow(PHI, 2 * dp * ch.th), cents = (k - 1 / 2) * Math.pow(PHI, 5) * sp, dt = k * Math.pow(PHI, -11) * sp;   // phi: golden cents and ms per unit, spread a rung wider (thick) or narrower (tight) per track
      var kn = { tune: cl(R.tune + dp * ch.pt * IPH * IPH), decay: cl(R.decay + dp * ch.th * IPH * IPH - vt * IPH * IPH), tone: cl(R.tone + dp * ch.br * IPH * IPH + vt * Math.pow(IPH, 3)), colour: cl(R.colour + dp * ch.br * IPH * IPH) };   // VIBE (Danny 18:57 AWST 28 Oct): hard shortens the decay PHI^-2 and brightens the tone PHI^-3, soft the reverse   // phi: each knob moves up to PHI^-2 x depth / 2
      var pan = kind === 'hat' || kind === 'cow' || kind === 'shaker' ? (u % 2 ? -1 : 1) * Math.pow(IPH, 3) : 0;   // phi: hats a little wide, the rest centred
      var aq = Math.round(acc * 2) / 2, spec = retune(V.build({ tune: kn.tune, decay: kn.decay, tone: kn.tone, colour: kn.colour, level: 1, pan: (1 + pan) / 2 }, aq), Math.pow(2, cents / 1200));   // accent in three steps (off, half, full) so the sound can be kept
      spec.trim = V.trim * KM * v * SHARE[u];
      try { var o = play808(c, spec, tr.out, t + dt, tk, id + '|' + u + '|' + aq + '|' + dp + '|' + vt.toFixed(3)); d8live.push(o.endsAt); if (id === '808.oh') (tr.oh = tr.oh || []).push(o.output); } catch (er) {}
    });
  }
  // 808 KEPT AS RECORDINGS (Danny 14:15 AWST 28 Oct, Claude chat: 'The Audio is dropping out ... at some point it times out I think the
  // website reloads'). A 12-minute headless listen found no leak but load peaks: in electro's full and drop sections the engine made ~450
  // audio nodes a second and the audio thread sat at 95-99%, and 58% of those nodes were the 808 bank (driftbox renderVoice builds a whole
  // voice per hit, up to six oscillators for a hat, up to three units layered, on every sixteenth). Now each sound this track uses (which
  // 808, which unit, the accent in three steps, the character depth) is rendered once in the background (OfflineAudioContext, the same
  // renderVoice, trim 1) into F(4) = 3 takes; every later hit plays a take (a buffer and a gain: 2 nodes, no oscillators), taking turns, so
  // the noisy voices (hats, snare, clap) still vary hit to hit. The level (trim) and the hat's choke stay live on the gain. Until a sound's
  // first take lands (a fraction of a second), hits play live as before. Takes live on the track, so they go with it.
  var TK8 = 3;   // unit: takes per sound (a Fibonacci count)
  function render8(c, spec, E) { var OC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OC || E.busy) return; var sp = Object.assign({}, spec, { trim: 1 }), oc;
    try { oc = new OC(spec.pan ? 2 : 1, Math.ceil((spec.duration + Math.pow(PHI, -5)) * c.sampleRate), c.sampleRate); D8.renderVoice(oc, sp, oc.destination, 0); } catch (er) { E.dead = true; return; }   // phi: PHI^-5 s of room after the voice; mono unless the voice is panned (the hats)
    E.busy = true; var done = function (b) { E.busy = false; if (b) E.b.push(trim8(c, b)); if (E.b.length < TK8 && b) render8(c, spec, E); }, q = null;
    try { q = oc.startRendering(); } catch (er) { E.busy = false; E.dead = true; return; } if (q && q.then) q.then(done, function () { E.busy = false; E.dead = true; }); else oc.oncomplete = function (ev) { done(ev.renderedBuffer); }; }
  var K8L = null; K.k8 = function () { var M = K8L && K8L.k8 || {}, ks = Object.keys(M); return { sounds: ks.length, takes: ks.reduce(function (a, k) { return a + M[k].b.length; }, 0), mb: +(ks.reduce(function (a, k) { return a + M[k].b.reduce(function (x, q) { return x + q.length * q.numberOfChannels * 4; }, 0); }, 0) / 1e6).toFixed(1) }; };   // test hook: the latest track's kept sounds and takes
  function trim8(c, b) { var n = b.length, k, ch; for (k = n - 1; k > 0; k--) { var on = false; for (ch = 0; ch < b.numberOfChannels; ch++) if (Math.abs(b.getChannelData(ch)[k]) > 1e-4) { on = true; break; } if (on) break; }   // unit: -80 dB, the end of the take
    var m = Math.min(n, k + Math.ceil(c.sampleRate * Math.pow(PHI, -9))); if (m >= n * (1 - Math.pow(IPH, 4))) return b; var o = c.createBuffer(b.numberOfChannels, m, b.sampleRate);   // phi: PHI^-9 s past the last sound; keep it whole if trimming saves under PHI^-4
    for (ch = 0; ch < b.numberOfChannels; ch++) o.copyToChannel(b.getChannelData(ch).subarray(0, m), ch); return o; }
  function play808(c, spec, dest, t, tk, key) {
    var M = tk.k8 || (tk.k8 = {}), E = M[key] || (M[key] = { b: [], i: 0, busy: false, dead: false }); K8L = tk;
    if (!E.b.length) { if (!E.dead) render8(c, spec, E); return D8.renderVoice(c, spec, dest, t); }   // the first hits play live while the takes render
    var b = E.b[E.i++ % E.b.length], s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.setValueAtTime(spec.trim, t); s.connect(g); g.connect(dest);
    s.start(t); s.stop(t + b.duration); s.onended = function () { try { g.disconnect(); } catch (er) {} }; return { output: g, endsAt: t + b.duration }; }
  function grd() { try { return K.guard ? K.guard() : 0; } catch (e) { return 0; } }   // LOAD GUARD (Danny 19:01 AWST 28 Oct, cutting out on the phone): level 1 holds back the Jupiter's stab and octave units and the 808's sub and snap units, level 2 also the house kit beside the 808
  function hit(tr, kind, t, v, a) { if (tr.g && tr.g.bank) bank(tr, kind, t, v, a); else house(tr, kind, t, v); }

  // ---------- 303 RACK (Danny 15:42 AWST 27 Oct, Claude chat: 'we get the 303 as well ... you can write one of those two'; the rack is
  // how he layers hardware: 15:2x 'I just layer them up') ----------
  // One acid line (the engine's acidStep) played by a rack of 303s on the bass layer:
  //   unit 0  driftbox 303 (MIT, js/vendor/driftbox-303.js): Huovilainen ladder in an AudioWorklet, the squelch; loaded on the first line
  //   unit 1  Ed's 303, ours from scratch: one running oscillator (slides glide, they never retrigger) into two lowpass stages (24 dB per
  //           octave, the resonance on the second), an accent 'wow' that builds over successive accents (a capacitor charging, as on the
  //           real accent circuit), a soft output stage; no keytracking, like the machine
  //   unit 2  the overdrive pedal after the rack (tanh, then a lowpass), joining when the arc is past PHI^-1
  // THE RULE: units join by threshold (a count), each unit's share is a fixed coupling PHI^-k / 2 (1 + PHI^-1 + PHI^-2 = 2, the rack
  // sums to one voice), the rack's peak is the plain bass voice's square level a rung up (0.16 PHI: the 303 leads the low end in
  // electro); the filter rises with the arc as a rung (base cutoff PHI^(2 PHI^2 + e PHI) x 20 Hz). Units are golden cents apart and
  // golden ms late, as in the 808 rack. Nothing runs without notes: a rack stops PHI^3 s after its last note.
  var D3 = null, d3Req = false, D3URL = 'js/vendor/driftbox-303.js?v=e303a', SLIDE = Math.pow(PHI, -6);   // phi: slide PHI^-6 s (~56 ms, the 303's fixed slide)
  var A3 = 0.16 * PHI, ASH = [0, 1, 2].map(function (k) { return Math.pow(PHI, -k) / 2; });   // the rack peak; phi: shares 0.5, 0.31, 0.19
  function load303() { if (d3Req) return; d3Req = true; var sc = document.createElement('script'); sc.src = D3URL; sc.async = true; sc.onload = function () { if (window.Driftbox303) D3 = window.Driftbox303; }; document.head.appendChild(sc); }
  var TANH = {};
  function tanhCurve(k) { if (TANH[k]) return TANH[k]; var n = 1024, a = new Float32Array(n); for (var i = 0; i < n; i++) { var x = i / (n - 1) * 2 - 1; a[i] = Math.tanh(k * x) / Math.tanh(k); } return (TANH[k] = a); }
  function edUnit(c, to) {
    var o = c.createOscillator(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), vca = c.createGain(), sh = c.createWaveShaper();
    f1.type = f2.type = 'lowpass'; f1.Q.value = 0; f2.Q.value = Math.pow(PHI, 5); vca.gain.value = 0; sh.curve = tanhCurve(PHI);   // phi: resonance PHI^5 dB on the second stage; output stage tanh(PHI x)
    o.type = 'sawtooth'; o.frequency.value = 55; o.connect(f1); f1.connect(f2); f2.connect(vca); vca.connect(sh); sh.connect(to); o.start();
    return { o: o, f1: f1, f2: f2, vca: vca, sh: sh, held: 0, lg: 0, wow: 0 };
  }
  function edNote(u, n, f, from, t, gate, gain) {
    var F = u.o.frequency, slideIn = from != null, peakR, base, dec;
    if (u.o.type !== n.wave) u.o.type = n.wave;
    F.cancelScheduledValues(t); if (slideIn) { F.setValueAtTime(from, t); F.exponentialRampToValueAtTime(f, t + SLIDE); } else F.setValueAtTime(f, t);
    u.wow = n.acc ? u.wow * IPH + 1 : u.wow * IPH * IPH;                  // phi: the accent capacitor charges a PHI^-1 step per accent, drains PHI^-2 per plain note
    base = FLO * Math.pow(PHI, 2 * PHI * PHI + n.e * PHI); peakR = Math.pow(PHI, PHI * PHI + (n.acc ? PHI * Math.min(u.wow, PHI) * IPH : 0)); dec = n.acc ? Math.pow(PHI, -4) : Math.pow(PHI, -3);   // phi: base, sweep and decay rungs
    if (!slideIn) [u.f1, u.f2].forEach(function (q) { q.frequency.cancelScheduledValues(t); q.frequency.setValueAtTime(Math.min(FHI * Math.pow(IPH, 2), base * peakR), t); q.frequency.exponentialRampToValueAtTime(base, t + dec); });
    u.f2.Q.setValueAtTime(Math.pow(PHI, 5) + (n.acc ? Math.pow(PHI, 3) : 0), t);   // phi: an accent leans on the resonance (+PHI^3 dB)
    var G = u.vca.gain; G.cancelScheduledValues(t); G.setValueAtTime(t < u.held ? Math.max(u.lg, 1e-4) : 1e-4, t);
    G.linearRampToValueAtTime(gain, t + (slideIn ? SLIDE : Math.pow(PHI, -12))); G.setValueAtTime(gain, t + gate); G.exponentialRampToValueAtTime(1e-4, t + gate + Math.pow(PHI, -9));   // phi: attack PHI^-12 s, release PHI^-9 s
    u.lg = gain; u.held = t + gate;
  }
  function acid(L, n) {
    var c = C(), R = L.a3, e = n.e;
    if (!R || R.dead) { R = L.a3 = { bus: c.createGain(), od: c.createWaveShaper(), lp: c.createBiquadFilter(), og: c.createGain(), db: null, dbReq: false, prev: null };
      R.bus.connect(L.out); R.od.curve = tanhCurve(PHI * PHI * PHI); R.lp.type = 'lowpass'; R.lp.frequency.value = FHI * Math.pow(IPH, 3); R.og.gain.value = 0;   // phi: drive tanh(PHI^3 x), then a lowpass PHI^-3 under the top
      R.bus.connect(R.od); R.od.connect(R.lp); R.lp.connect(R.og); R.og.connect(L.out); R.ed = edUnit(c, R.bus); }
    clearTimeout(R.idle); R.idle = setTimeout(function () { R.dead = true; try { R.ed.o.stop(); R.ed.o.disconnect(); if (R.db) R.db.dispose(); R.bus.disconnect(); R.og.disconnect(); } catch (er) {} }, (Math.max(0, n.t - c.currentTime) + n.step * 2 + Math.pow(PHI, 3)) * 1e3);   // phi: stop PHI^3 s after the last note sounds; unit: ms per s
    if (!D3) load303(); else if (!R.db && !R.dbReq) { R.dbReq = true; D3.Bassline.create(c).then(function (r) { if (R.dead) { r.bassline.dispose(); return; } R.db = r.bassline; R.db.output.connect(R.bus); }).catch(function () {}); }
    var f = 440 * Math.pow(2, (n.m - 69) / 12), from = n.from != null ? 440 * Math.pow(2, (n.from - 69) / 12) : null, gate = n.hold > 0 ? n.hold : n.step * (n.slide ? 1 + Math.pow(IPH, 6) : IPH);   // hold: a bass shape's held note (Danny 20:10)
    var det = function (u) { var k = (u * IPH) % 1; return { r: Math.pow(2, (k - 1 / 2) * Math.pow(PHI, 5) / 1200), dt: k * Math.pow(PHI, -11) }; };   // phi: golden cents and ms per unit
    var d1 = det(1); if (bx('303', 1)) edNote(R.ed, n, f * d1.r, from != null ? from * d1.r : null, n.t + d1.dt, gate, A3 * ASH[1] * n.v);
    if (R.db && bx('303', 0)) { var d0 = det(0), pa = D3.params, P = { tune: 1 / 2, wave: n.wave === 'square' ? 1 : 0, cutoff: IPH * IPH + Math.pow(IPH, 3) * e, resonance: 1 - Math.pow(IPH, 3), envMod: IPH, decay: IPH * IPH, accent: pa.accent, level: Math.min(1, A3 * ASH[0] * n.v) };   // phi: knobs on golden fractions; cutoff a rung brighter with the arc
      var nt = D3.bassNote(P, { note: n.m - 33, accent: n.acc, slide: n.slide }, n.from != null ? { note: n.from - 33, slide: true } : { note: null, slide: false }, n.step);   // unit: MIDI 33 = A1 = driftbox's 55 Hz root at tune 0.5
      if (nt) { if (n.hold > 0) nt.gate = n.hold; nt.frequency *= d0.r; if (nt.glideFrom) nt.glideFrom *= d0.r; try { R.db.play(nt, n.t + d0.dt); } catch (er) {} } }
    R.og.gain.setTargetAtTime(e > IPH && bx('303', 2) ? A3 * ASH[2] : 0, n.t, Math.pow(PHI, -3));   // the overdrive unit joins past PHI^-1 of the arc (its share of the rack)
  }

  // ---------- KEYS FOR ELECTRO (Danny 15:42-15:56 AWST 27 Oct, Claude chat: 'we need the Junos ... and the Jupiter eight ... best if you
  // just build it from scratch because we'll get our own unique version and even if it's quirky ... that's fine'; FM: 'I absolutely love
  // that FM synth ... that's the one I wanted you to go with' = dx7-synth-js, MIT). Each is a rack like the 808s (the same rule: units
  // join by threshold on the track's energy arc, shares fixed on the golden ladder PHI^-k / 2, golden cents and ms between units):
  //   DX7 (lead)      unit 0 the DX7 (dx7-synth-js by Matt Montag, MIT, js/vendor/dx7-worklet.js) on our warm 'soft bell' patch,
  //                   unit 1 our own 2-operator FM bell (INST.bell), unit 2 the DX7 on our 'tine piano' patch past PHI^-1.
  //                   Warm on purpose (DeepSeek's caution Danny relayed 17:09: bright FM is the 90s game sound): two operators a
  //                   carrier, low modulation index, golden ratios, a lowpass PHI^-3 under the top after the worklet.
  //   Ed's Juno (arp + pad)  ours: saw DCO + square sub an octave down, a fixed highpass, two lowpass stages keytracked like the
  //                   Juno's KYBD follow, ADSR; then the layer's chorus: chorus I always (the Juno sound), the dry DCO as unit 1,
  //                   chorus II past PHI^-1. Chorus rates and depths as commonly measured on the Juno-60 (I 0.513 Hz, II 0.863 Hz,
  //                   delay swept 1.66-5.35 ms), stereo by sweeping the two sides in opposition.
  //   Ed's Jupiter (stabs)   ours: two saw VCOs golden cents apart (panned apart), VCO 2 cross-modulating VCO 1 a little (its quirk),
  //                   two lowpass stages with a fast brassy sweep; unit 1 the old saw stab (INST.stab), unit 2 a unison voice an
  //                   octave down past PHI^-1.
  var DXR = { u: [0, 1, 2].map(function (k) { return Math.pow(PHI, -k) / 2; }) }, dxMod = null, dxReq = false;   // phi: rack shares 0.5, 0.31, 0.19
  function dxOp(o) { return Object.assign({ enabled: true, rates: [99, 50, 30, 60], levels: [99, 80, 0, 0], detune: 0, velocitySens: 2, lfoAmpModSens: 0, volume: 99, oscMode: 0, freqCoarse: 1, freqFine: 0, pan: 0 }, o); }
  function dxPatch(ops, extra) { var off = { enabled: false, volume: 0 }; while (ops.length < 6) ops.push(dxOp(off));
    return Object.assign({ algorithm: 5, feedback: 0, lfoSpeed: 30, lfoDelay: 40, lfoPitchModDepth: 0, lfoAmpModDepth: 0, lfoPitchModSens: 0, lfoWaveform: 4, lfoSync: 0,
      pitchEnvelope: { rates: [0, 0, 0, 0], levels: [50, 50, 50, 50] }, controllerModVal: 0, aftertouchEnabled: 0, operators: ops.map(function (o, i) { o.idx = i; return o; }) }, extra || {}); }
  // our patches (DX7 parameter ranges 0-99; algorithm 5 = three 2-operator stacks, op 1 <- op 2, op 3 <- op 4, op 5 <- op 6):
  var DXP = {
    bell: dxPatch([dxOp({ rates: [99, 32, 22, 45], levels: [99, 82, 0, 0], velocitySens: 2 }),                                   // carrier, a long ring
                   dxOp({ freqCoarse: 2, freqFine: 31, volume: 62, rates: [99, 45, 30, 60], levels: [99, 55, 0, 0], velocitySens: 6 }),   // ratio 2.62 = PHI^2 (the house bell's ratio), soft index
                   dxOp({ freqCoarse: 2, detune: 3, volume: 72, rates: [99, 38, 25, 50], levels: [99, 70, 0, 0] }),                     // an octave partial, a little sharp
                   dxOp({ freqCoarse: 4, freqFine: 6, volume: 44, rates: [99, 60, 40, 70], levels: [99, 40, 0, 0], velocitySens: 7 })]),   // ratio 4.24 = PHI^3, quiet: a glint
    tine: dxPatch([dxOp({ rates: [96, 28, 25, 67], levels: [99, 92, 0, 0], velocitySens: 3 }),                                   // the EP body
                   dxOp({ volume: 58, rates: [95, 50, 35, 78], levels: [99, 72, 0, 0], velocitySens: 7 }),                               // 1:1, velocity opens it (the bark)
                   dxOp({ detune: -3, volume: 88, rates: [95, 30, 22, 55], levels: [99, 92, 0, 0] }),                                    // a second body a few cents flat
                   dxOp({ freqCoarse: 14, volume: 40, rates: [98, 85, 40, 80], levels: [99, 0, 0, 0], velocitySens: 6 })])               // 14:1, the tine, gone in a moment
  };
  function dxLoad(c) { if (dxMod || dxReq || !c.audioWorklet) return; dxReq = true; c.audioWorklet.addModule('js/vendor/dx7-worklet.js?v=dx7a').then(function () { dxMod = true; }).catch(function () {}); }
  function dxRack(L) { var c = C(); if (L.dx && !L.dx.dead) return L.dx; if (!dxMod) { dxLoad(c); return null; }
    var cents = function (u) { return (((u * IPH) % 1) - 1 / 2) * Math.pow(PHI, 5) / 100; };   // phi: golden cents per unit, in semitones
    var msgs = [{ k: 'patch', id: 'bell', p: DXP.bell, b: cents(0) }, { k: 'patch', id: 'tine', p: DXP.tine, b: cents(2) }];
    try { var n = new AudioWorkletNode(c, 'ed-dx7', { numberOfInputs: 0, outputChannelCount: [2], processorOptions: { msgs: msgs } }), lp = c.createBiquadFilter(); } catch (er) { return null; }
    lp.type = 'lowpass'; lp.frequency.value = FHI * Math.pow(IPH, 3); lp.Q.value = 0; n.connect(lp); lp.connect(L.out);   // phi: warmth, PHI^-3 under the top
    return (L.dx = { n: n, lp: lp });
  }
  function dxIdle(L, t) { var R = L.dx; if (!R) return; clearTimeout(R.idle); R.idle = setTimeout(function () { R.dead = true; try { R.n.port.postMessage({ k: 'end' }); setTimeout(function () { R.n.disconnect(); R.lp.disconnect(); }, Math.pow(PHI, 4) * 1e3); } catch (er) {} }, (Math.max(0, t - C().currentTime) + Math.pow(PHI, 4)) * 1e3); }   // phi: retire PHI^4 s after the last note; unit: ms per s
  INST.dx = function (tr, f, t, d, v) {
    var L = tr, tk = tr.tk || tr, e = tk.e == null ? 1 : tk.e, m = Math.round(69 + 12 * Math.log(f / 440) / Math.LN2), R = dxRack(L), g = v * IPH;   // our bell peaks near the DX7's 2-op level at gain PHI^-1 (offline renders)
    if (INST.bell && bx('dx', 1)) INST.bell(tr, f, t + Math.pow(PHI, -11) * IPH, d, v * DXR.u[1] * 2);
    if (!R) return;
    if (bx('dx', 0)) R.n.port.postMessage({ k: 'on', id: 'bell', note: m, vel: v, t: t, d: d, g: g * DXR.u[0] * 2 });
    if (e > IPH && bx('dx', 2)) R.n.port.postMessage({ k: 'on', id: 'tine', note: m, vel: v, t: t + Math.pow(PHI, -11) * ((2 * IPH) % 1), d: d, g: g * DXR.u[2] * 2 });   // the tine piano joins past PHI^-1
    dxIdle(L, t + d);
  };
  // ----- Ed's Juno -----
  var JCH = [{ hz: 0.513, lo: 1.66e-3, hi: 5.35e-3 }, { hz: 0.863, lo: 1.66e-3, hi: 5.35e-3 }];   // cite: Juno-60 chorus I / II LFO rates and delay sweep as commonly measured
  function junoBus(L) { if (L.ju && !L.ju.dead) return L.ju; var c = C(), inp = c.createGain(), dry = c.createGain(), mk = function (k) {
      var lfo = c.createOscillator(), dl = c.createDelay(0.02), dr = c.createDelay(0.02), gl = c.createGain(), gr = c.createGain(), pl = c.createStereoPanner ? c.createStereoPanner() : null, pr = c.createStereoPanner ? c.createStereoPanner() : null, out = c.createGain(), J = JCH[k], mid = (J.lo + J.hi) / 2, dep = (J.hi - J.lo) / 2;
      lfo.type = 'triangle'; lfo.frequency.value = J.hz; dl.delayTime.value = dr.delayTime.value = mid; gl.gain.value = dep; gr.gain.value = -dep; lfo.connect(gl); lfo.connect(gr); gl.connect(dl.delayTime); gr.connect(dr.delayTime);
      inp.connect(dl); inp.connect(dr); if (pl) { pl.pan.value = -1; pr.pan.value = 1; dl.connect(pl); dr.connect(pr); pl.connect(out); pr.connect(out); } else { dl.connect(out); dr.connect(out); }
      out.gain.value = k ? 0 : DXR.u[0]; out.connect(L.out); lfo.start(); return { lfo: lfo, out: out }; };
    dry.gain.value = DXR.u[1]; inp.connect(dry); dry.connect(L.out);
    return (L.ju = { inp: inp, dry: dry, ch: [mk(0), mk(1)] });
  }
  function junoIdle(L, t) { var J = L.ju; if (!J) return; clearTimeout(J.idle); J.idle = setTimeout(function () { J.dead = true; try { J.ch.forEach(function (x) { x.lfo.stop(); x.out.disconnect(); }); J.dry.disconnect(); J.inp.disconnect(); } catch (er) {} }, (Math.max(0, t - C().currentTime) + Math.pow(PHI, 4)) * 1e3); }
  function juno(tr, f, t, d, v, pad, ev) {                                // ev: a pad shape's envelope (padEnv), else the old pad / the arp
    var c = C(), tk = tr.tk || tr.trk || tr, e = tk.e == null ? 1 : tk.e, J = junoBus(tr), o = c.createOscillator(), sub = c.createOscillator(), sg = c.createGain(), hp = c.createBiquadFilter(), l1 = c.createBiquadFilter(), l2 = c.createBiquadFilter(), a = c.createGain();
    var at = ev ? ev.at : pad ? IPH : Math.pow(PHI, -8), rel = ev ? ev.rel : pad ? IPH : Math.pow(PHI, -4), sus = ev ? ev.sus : pad ? IPH : IPH * IPH, dec = ev ? ev.dec : Math.pow(PHI, pad ? 0 : -4), end = t + d + rel * 4;   // phi: pad PHI^-1 s attack / release, arp PHI^-8 / PHI^-4
    var base = Math.min(FHI * Math.pow(IPH, 3), f * Math.pow(PHI, (pad ? 1 : PHI) + e * IPH)), pk = Math.min(FHI * IPH * IPH, base * Math.pow(PHI, ev ? ev.fd : pad ? IPH : PHI)), fT = ev ? ev.fT : pad ? PHI : Math.pow(PHI, -3);   // keytracked cutoff, a rung up with the arc; the arp sweeps more
    o.type = 'sawtooth'; o.frequency.value = f; sub.type = 'square'; sub.frequency.value = f / 2; sg.gain.value = IPH * IPH;   // sub oscillator PHI^-2
    hp.type = 'highpass'; hp.frequency.value = FLO * Math.pow(PHI, pad ? 3 : 4); l1.type = l2.type = 'lowpass'; l1.Q.value = 0; l2.Q.value = Math.pow(PHI, 2);   // phi: HPF rung, resonance PHI^2 dB
    [l1, l2].forEach(function (q) { q.frequency.setValueAtTime(pk, t); q.frequency.exponentialRampToValueAtTime(base, t + fT); });
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + at); a.gain.setTargetAtTime(v * sus, t + at, dec); a.gain.setTargetAtTime(0, t + d, rel / 3);
    var out = a;
    if (ev && ev.gate) { var g = c.createGain(), sm = Math.pow(PHI, -10), st = ev.gate.step, n = Math.max(1, Math.round(d / st));   // phi: chop edges PHI^-10 s (~8 ms), click-free
      g.gain.setValueAtTime(0, t); for (var k = 0; k < n; k++) { if (!ev.gate.on(k)) continue; var s0 = t + k * st; g.gain.setTargetAtTime(1, s0, sm); g.gain.setTargetAtTime(0, s0 + st * ev.gate.open, sm); }
      a.connect(g); out = g; }
    o.connect(hp); sub.connect(sg); sg.connect(hp); hp.connect(l1); l1.connect(l2); l2.connect(a); out.connect(J.inp); o.start(t); sub.start(t); o.stop(end); sub.stop(end);
    J.ch[1].out.gain.setTargetAtTime(e > IPH && bx('juno', 2) ? DXR.u[2] : 0, t, IPH);    // chorus II joins past PHI^-1
    J.ch[0].out.gain.setTargetAtTime(bx('juno', 0) ? DXR.u[0] : 0, t, Math.pow(PHI, -3)); J.dry.gain.setTargetAtTime(bx('juno', 1) ? DXR.u[1] : 0, t, Math.pow(PHI, -3));   // the desk's box switches
    junoIdle(tr, end);
  }
  // PAD SHAPES (Danny 19:58 AWST 27 Oct, Claude chat: pads 'not sounding electro'; asked stab, pluck or gated: 'All'): the Juno pad under
  // electro's stabs takes any set of four shapes, layered at equal power (each at 1/sqrt n of the old pad):
  //   swell  the old pad: PHI^-1 s in and out, holds at PHI^-1, the filter closes over PHI s (the trance swell, kept to compare)
  //   stab   in PHI^-9 s (~13 ms), gone in a PHI^-4 s decay (holds at PHI^-6), PHI^-3 s release, the filter snaps PHI rungs and shuts with it
  //   pluck  in PHI^-8 s (~21 ms), a PHI^-2 s decay to a PHI^-3 tail through the bar, PHI^-2 s release, the filter snaps PHI rungs and closes
  //          over PHI^-1 s (the 'wah')
  //   gate   the swell's sustain chopped on the grid (16ths), each chop open PHI^-1 of its step; the downbeat always open, the rest open
  //          with the arc (PHI^-1 .. all), the pattern seeded per track
  // AUTO (padM 0): the energy picks one; pluck under PHI^-2, stab under PHI^-1, gate above. RANDOM (padM -1): 1 or 2 shapes per track.
  // The desk's faders move each shape in rungs from its own: attack, decay, release x PHI^k; hold loss x PHI^-k; filter snap +k rungs;
  // gate rate x 2^k (1/32 .. 1/4); gate open is the threshold itself.
  var PSH = { 1: { at: IPH, dec: 1, sus: IPH, rel: IPH, fd: IPH, fT: PHI },
              2: { at: Math.pow(PHI, -9), dec: Math.pow(PHI, -4), sus: Math.pow(PHI, -6), rel: Math.pow(PHI, -3), fd: PHI, fT: Math.pow(PHI, -4) },
              4: { at: Math.pow(PHI, -8), dec: Math.pow(PHI, -2), sus: Math.pow(PHI, -3), rel: Math.pow(PHI, -2), fd: PHI, fT: IPH },
              8: { at: Math.pow(PHI, -6), dec: 1, sus: IPH, rel: Math.pow(PHI, -2), fd: IPH, fT: PHI, gate: 1 } };   // phi: every time and level a rung
  function pdl(k, d) { var D = window.DadAutoDJ, x = D && D.dial ? +D.dial(k) : d; return isFinite(x) ? x : d; }
  function padModes(tk) {
    var m = pdl('padM', 0) | 0, e = tk.e == null ? 1 : tk.e, a = [];
    if (m > 0) { [1, 2, 4, 8].forEach(function (b) { if (m & b) a.push(b); }); if (a.length) return a; }
    if (m < 0) { if (!tk.pmR) { var all = [1, 2, 4, 8], n = Math.random() < IPH ? 1 : 2; tk.pmR = []; while (tk.pmR.length < n) tk.pmR.push(all.splice(Math.floor(Math.random() * all.length), 1)[0]); } return tk.pmR; }   // phi: one shape on PHI^-1 of tracks, two on the rest
    return [e < IPH * IPH ? 4 : e < IPH ? 2 : 8];
  }
  function padEnv(b, tk) {
    var VB = K.vibe ? K.vibe() : null, S = PSH[b], ev = { at: S.at * Math.pow(PHI, pdl('padA', 0) - (VB ? Math.min(0, VB.v) * VB.t : 0)), dec: S.dec * Math.pow(PHI, pdl('padD', 0)), sus: clamp(S.sus * Math.pow(PHI, -pdl('padS', 0)), 0, 1), rel: S.rel * Math.pow(PHI, pdl('padR', 0)), fd: Math.max(0, S.fd + pdl('padF', 0)), fT: S.fT * Math.pow(PHI, pdl('padD', 0)) };
    if (S.gate) { var e = tk.e == null ? 1 : tk.e, dens = IPH + (1 - IPH) * e, sd = (tk.seed | 0) >>> 0, bpm = tk.bpm > 0 ? tk.bpm : 120;   // unit: 120 BPM only if the track has none
      ev.gate = { step: 60 / bpm / 4 * Math.pow(2, Math.round(pdl('padG', 0))), open: clamp(pdl('padO', IPH), Math.pow(IPH, 6), 1 - Math.pow(IPH, 6)), on: function (k) { return k % 16 === 0 || fr(sd * IPH * IPH + (k % 16) * IPH) < dens; } }; }   // unit: a sixteenth = a quarter of a beat; 2^k: 1/32 .. 1/4
    return ev;
  }
  INST.juno = function (tr, f, t, d, v) { juno(tr, f, t, d, v * 0.07, false); };          // the arp: a rung over the old chip blips (0.045)
  INST.junopad = function (tr, f, t, d, v) { var tk = tr.tk || tr.trk || tr, ms = padModes(tk), q = 1 / Math.sqrt(ms.length); ms.forEach(function (b) { juno(tr, f, t, d, v * 0.05 * q, true, padEnv(b, tk)); }); };   // the pad under the stabs, in its shapes
  // ----- Ed's Jupiter -----
  function jup(tr, f, t, d, v, oct) {
    var c = C(), o1 = c.createOscillator(), o2 = c.createOscillator(), xm = c.createGain(), p1 = c.createStereoPanner ? c.createStereoPanner() : null, p2 = c.createStereoPanner ? c.createStereoPanner() : null,
        l1 = c.createBiquadFilter(), l2 = c.createBiquadFilter(), a = c.createGain(), end = t + d + 7 * Math.pow(PHI, -5);   // LOAD (Danny 14:15 AWST 28 Oct, dropouts): stop 7 release time constants after the note (-61 dB), not a whole second (~30% of the Jupiter's running time was silence)
    f = f * (oct ? 1 / 2 : 1); o1.type = o2.type = 'sawtooth'; o1.frequency.value = f; o2.frequency.value = f * Math.pow(2, Math.pow(PHI, 3) / 1200);   // phi: VCO 2 PHI^3 cents sharp
    xm.gain.value = f * Math.pow(IPH, 4); o2.connect(xm); xm.connect(o1.frequency);                     // phi: the cross-mod quirk, PHI^-4 of the pitch
    l1.type = l2.type = 'lowpass'; l1.Q.value = 0; l2.Q.value = PHI;
    var pk = Math.min(FHI * IPH * IPH, f * Math.pow(PHI, PHI * PHI + PHI)), base = f * Math.pow(PHI, PHI);   // phi: the brassy sweep from PHI^(PHI^2+PHI) down to PHI^PHI over the note
    [l1, l2].forEach(function (q) { q.frequency.setValueAtTime(pk, t); q.frequency.exponentialRampToValueAtTime(base, t + Math.pow(PHI, -3)); });
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + Math.pow(PHI, -9)); a.gain.setTargetAtTime(v * IPH, t + Math.pow(PHI, -9), Math.pow(PHI, -4)); a.gain.setTargetAtTime(0, t + d, Math.pow(PHI, -5));   // phi: attack, decay, release
    if (p1) { p1.pan.value = -Math.pow(IPH, 3); p2.pan.value = Math.pow(IPH, 3); o1.connect(p1); o2.connect(p2); p1.connect(l1); p2.connect(l1); } else { o1.connect(l1); o2.connect(l1); }
    l1.connect(l2); l2.connect(a); a.connect(tr.out); o1.start(t); o2.start(t); o1.stop(end); o2.stop(end);
  }
  INST.jup = function (tr, f, t, d, v) { var tk = tr.tk || tr, e = tk.e == null ? 1 : tk.e, g = v * 0.07;   // the old stab's level (0.07)
    if (bx('jup', 0)) jup(tr, f, t, d, g * DXR.u[0] * 2, false);
    if (MORE.stab && bx('jup', 1) && grd() < 1) MORE.stab(tr, f, t + Math.pow(PHI, -11) * IPH, d, v * DXR.u[1] * 2);
    if (e > IPH && bx('jup', 2) && grd() < 1) jup(tr, f, t + Math.pow(PHI, -11) * ((2 * IPH) % 1), d, g * DXR.u[2] * 2, true); };   // unison an octave down past PHI^-1

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
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (long) { long = false; return; } on(); flash(b); });
    return b;
  }
  function flash(b) { if (!b) return; b.classList.remove('is-mixing'); void b.offsetWidth; b.classList.add('is-mixing'); }
  function needle(fs) { var n = document.createElement('i'); n.className = 'dj-needle'; n.setAttribute('aria-hidden', 'true'); fs.appendChild(n); return n; }
  function place(n, labs, x) {                                            // x = fractional rung: between chip centres, on the chip's row
    if (!n || !labs.length) return; var i = clamp(Math.floor(x), 0, labs.length - 1), j = Math.min(i + 1, labs.length - 1), f = clamp(x - i, 0, 1), a = labs[i], b = labs[j];
    if (b.offsetTop !== a.offsetTop) { b = a; f = 0; }
    var cx = a.offsetLeft + a.offsetWidth / 2 + f * (b.offsetLeft + b.offsetWidth / 2 - a.offsetLeft - a.offsetWidth / 2);
    n.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + (a.offsetTop + a.offsetHeight).toFixed(1) + 'px)';
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  var IPH = 1 / PHI, needles = {}, wob = {};
  // PUMPS RANDOM (Danny 19:58 AWST 26 Oct: 'If I press that it should make that section randomise'): the section button only drew a new
  // mix genome, so no pump knob moved and the chips never changed. Now modelled on the effects section's draw(): every pump knob gets a
  // golden-angle rung from one seed, frac((s N + j) PHI^-1) of its own ladder (always inside its range), through the chips' own setTo,
  // plus the new pump mix as before; the change glides in (the mix's PHI^3 s crossfade, rule 6) and the chips repaint. Hold: back to live.
  var pSeed = null;
  function pumpDraw(s) {
    pSeed = s; GROUPS.forEach(function (gp, j) { var k = gp[0], L = LADDER[k]; if (!L || !L.length) return;
      setTo(k, s == null ? liveOf(k) : L[Math.floor(frac((s * GROUPS.length + j) * IPH) * L.length)]); });
    if (s == null) K.defMix(); else K.nextMix();
    var c = compute(); K.idle(c); paint(c); save(); syncChips();
  }
  function pumpGo() { pumpDraw(pSeed == null ? Math.floor(Date.now() / 1e3) : pSeed + 1); }   // the pumps section's Random (tap)
  function pumpLive() { pumpDraw(null); }                                  // ... and its hold: back to live
  // HEADER RANDOM (Danny 20:22 AWST 26 Oct): the round header button presses this section's Random, so the kit carries the same handler,
  // with the button's own flash when the panel is open.
  var pBtn = null; K.pumpRandom = function (hold) { if (hold) pumpLive(); else pumpGo(); flash(pBtn); };
  function frac(x) { return x - Math.floor(x); }
  function buildChips() {
    var hd = document.createElement('div'); hd.className = 'dj-fx-hd';
    var h = document.createElement('span'); h.textContent = 'pumps'; hd.appendChild(h);
    hd.appendChild(pBtn = rbtn('dj-fxr', 'pumps', 'Random pumps (hold: back to live)', pumpGo, pumpLive));
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
  K.extras({ ir: function () { return conv && conv.buffer; }, hit: hit, acid: acid, reverb: reverb, sync: syncChips, live: liveLine, chips: function (el) { if (chips) return; chips = el; buildChips(); } });
})();
