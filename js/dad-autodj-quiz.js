/* Dad's DJ start engine: generated Web Audio music on phi pumps (phi rule 10). Design notes: docs/dad-dj.md. Loads at tier 1; js/dj-extras.js
   follows the first sound. Continuity via js/rhythm-continuity.js. Test hooks: ?mood= ?urgency= ?hour=0-23 ; window.DadAutoDJ. */
(function () {
  'use strict';
  var PHI = 1.6180339887;
  var MOOD = { neutral: 0, calm: 1, warm: 0.5, proud: 0, playful: -0.5, excited: -1, serious: 0.5 };
  var GENRES = { neutral: ['cinematic'], calm: ['ambient', 'acoustic'], warm: ['soul', 'folk'], proud: ['cinematic'], playful: ['indie-pop'],
                 excited: ['upbeat-pop', 'electronic'], serious: ['piano'] };
  var URG = { idle: 0, 'new': -0.5, urgent: -1.5 };
  var WX = { hot: -1, sun: -0.5, storm: 0, cloud: 0, rain: 0.5, fog: 1, night: 0, snow: 0 };
  var TIME = { day: 0, evening: 0.5, night: 1.5, deep: 2 };
  var K_VOL = 'preview.dadDJ.vol', MS = 1e3, SPM = 60, SPB = 4;   // unit: ms per s, seconds per minute, sixteenths per beat
  // knob ladders, ordered by their phi-step pump value (calm/slow at the high end); a hand change is a nudge along these
  var LADDER = { mood: ['excited', 'playful', 'neutral', 'proud', 'warm', 'serious', 'calm'], urgency: ['urgent', 'new', 'idle'],
                 sky: ['hot', 'sun', 'night', 'cloud', 'storm', 'rain', 'fog'], time: ['day', 'evening', 'night', 'deep'] };
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function qp(k) { try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; } }
  function store(k, v) { try { if (v != null) localStorage.setItem(k, v); return localStorage.getItem(k); } catch (e) { return null; } }
  var RM = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  // ---------- pumps ----------
  var nudge = { mood: 0, urgency: 0, sky: 0, time: 0 };
  function liveOf(k) { return k === 'mood' ? 'neutral' : k === 'urgency' ? 'idle' : k === 'sky' ? liveSky() : liveTime(); }
  function eff(k) {                                                       // live value + the hand nudge (clamped to the ladder)
    var L = LADDER[k], lv = liveOf(k); if (lv == null && !nudge[k]) return null;
    var i = L.indexOf(lv); if (i < 0) i = L.indexOf('cloud'); return L[clamp(i + nudge[k], 0, L.length - 1)];
  }
  function setTo(k, v) { var L = LADDER[k], i = L.indexOf(liveOf(k)); if (i < 0) i = L.indexOf('cloud'); nudge[k] = L.indexOf(v) < 0 ? 0 : L.indexOf(v) - i; }
  if (MOOD.hasOwnProperty(qp('mood'))) setTo('mood', qp('mood'));
  if (URG.hasOwnProperty(qp('urgency'))) setTo('urgency', qp('urgency'));
  var demo = { get mood() { return eff('mood'); }, get urgency() { return eff('urgency'); } };
  var hourOverride = /^\d{1,2}$/.test(qp('hour') || '') ? (+qp('hour')) % 24 : null;
  function perthHour() {
    if (hourOverride != null) return hourOverride;
    try { return +new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Perth', hour: 'numeric', hourCycle: 'h23' }).format(new Date()) % 24; } catch (e) { return new Date().getHours(); }
  }
  function liveSky() { var w = window.SIM_WX; return w && WX.hasOwnProperty(w.cond) ? (w.cond === 'snow' ? 'cloud' : w.cond) : null; }
  function sky() { return eff('sky'); }
  function timeSlot() { return eff('time'); }
  function liveTime() {
    var h = perthHour(), k = sky();
    if (h < 5) return 'deep';
    if (h >= 21) return (k == null || k === 'night' || k === 'sun' || k === 'hot') ? 'night' : 'evening';
    if (h >= 18) return 'evening';
    return 'day';
  }
  function pumps() {
    var t = timeSlot(), k = sky();
    return { time: t, tp: TIME[t], sky: k || 'none', wp: k ? WX[k] : 0, urgency: demo.urgency, up: URG[demo.urgency], mood: demo.mood, mp: MOOD[demo.mood] };
  }
  // ---------- MIX GENOME (Danny 14:10 AWST 26 Oct: 'if I don't like the music I can just hit it') ----------
  // The real inputs (time, sky, urgency, mood) are never touched; a mix only changes HOW they feed the music: the pump -> parameter
  // coupling weights (PHI^-1..PHI^1 per pump per parameter), the pump-tree node that drives the live dynamics (rule 9), and half-rung phi
  // offsets for tempo, density and cascade, a drum-pattern donor and an even-step pattern shift. Genes come from the golden-angle (Weyl)
  // sequence frac((seed x genes + j) / PHI), so no decimals and successive mixes land far apart. seed null = the default mix.
  var PAR = ['fade', 'bpm', 'vol', 'len'], PK = ['tp', 'wp', 'up', 'mp'], GX = ['tempo', 'density', 'cascade', 'donor', 'shift', 'route', 'flip'];
  var NG = PAR.length * PK.length + GX.length, IPH = 1 / PHI, mixSeed = null, M = null;
  function frac(x) { return x - Math.floor(x); }
  function half(u) { return Math.round((2 * u - 1) * 2) / 2; }                 // phi: a rung offset in half rungs, -1 .. +1
  function genome(seed) {
    var W = PAR.map(function () { return PK.map(function () { return 1; }); });
    if (seed == null) return { seed: null, W: W, tempo: 0, density: 0, cascade: 0, donor: null, shift: 0, route: 0, flip: 0 };
    var j = 0, u = function () { return frac((seed * NG + (j++)) * IPH); };
    W = PAR.map(function () { return PK.map(function () { return Math.pow(PHI, 2 * u() - 1); }); });
    var drums = Object.keys(GEN).filter(function (k) { return GEN[k].kick || GEN[k].hat || GEN[k].tom || GEN[k].shaker; });
    var g = { seed: seed, W: W, tempo: half(u()), density: half(u()), cascade: half(u()) }, d = Math.floor(u() * (drums.length + 1));
    g.donor = d < drums.length ? drums[d] : null; g.shift = 2 * Math.floor(u() * SPB); g.route = Math.floor(u() * (2 + 1)); g.flip = u();   // unit: even steps; three routes
    return g;
  }
  M = genome(null);
  function sOf(p, i) { var w = M.W[i]; return w[0] * p.tp + w[1] * p.wp + w[2] * p.up + w[3] * p.mp; }
  function compute(p) {
    p = p || pumps();
    var s = p.tp + p.wp + p.up + p.mp, S = PAR.map(function (x, i) { return sOf(p, i); }), sf = S[0] + M.cascade, sb = S[1], sv = S[2], sl = S[3];   // mix: per-parameter coupling
    var vol = clamp(0.55 * Math.pow(PHI, -sv / 4), 0.25, 0.8);
    if (p.mood === 'serious' || p.urgency === 'urgent') vol = 0.3;
    return { p: p, s: s, fade: clamp(Math.pow(PHI, 3.5 + sf), 2.06, 22.83), bpm: clamp(60 / Math.pow(PHI, -1 + sb / 2) * Math.pow(PHI, M.tempo), 62, 157),
             vol: vol, trackLen: Math.pow(PHI, 7.5 + sl), genres: GENRES[p.mood] || GENRES.neutral, mix: M.seed };
  }

  // ---------- music theory + genre table ----------
  var SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11] };
  //  chords: pad | strum | stab | ep | arp ; bass: hold | roots | walk | eighths | octave ; drums: 16-step strings (x loud, o soft)
  var GEN = {
    ambient:     { scale: 'lydian', root: 50, progs: [[0, 4, 5, 3], [0, 5, 3, 4]], bars: 2, chords: 'pad', wave: 'sine', cut: 1500, bass: 'hold', bwave: 'sine', mel: 0.10, lead: 'bell', rev: 0.55 },
    acoustic:    { scale: 'major', root: 55, progs: [[0, 4, 5, 3], [0, 3, 4, 4]], bars: 1, chords: 'strum', steps: [0, 6, 8, 14], wave: 'triangle', cut: 2400, bass: 'roots', bwave: 'triangle', mel: 0.22, lead: 'pluck',
                   kick: 'x.......o.......', shaker: '..o...o...o...o.', rev: 0.3 },
    soul:        { scale: 'dorian', root: 50, progs: [[1, 4, 0, 5], [0, 3, 1, 4]], bars: 1, sev: 1, chords: 'ep', steps: [0, 6, 10], bass: 'walk', bwave: 'triangle', mel: 0.18, lead: 'ep',
                   kick: 'x......o..x.....', snare: '....x.......x...', hat: 'o.o.o.o.o.o.o.o.', swing: 0.12, rev: 0.25 },
    folk:        { scale: 'major', root: 52, progs: [[0, 3, 0, 4], [0, 5, 3, 4]], bars: 1, chords: 'strum', steps: [0, 4, 8, 12], wave: 'triangle', cut: 2000, bass: 'roots', bwave: 'triangle', mel: 0.28, lead: 'pluck',
                   tom: 'x.......x.......', shaker: 'o.o.o.o.o.o.o.o.', rev: 0.3 },
    cinematic:   { scale: 'minor', root: 45, progs: [[0, 5, 2, 6], [0, 3, 5, 4]], bars: 2, chords: 'pad', wave: 'sawtooth', cut: 900, ost: 1, bass: 'hold', bwave: 'sawtooth', mel: 0.08, lead: 'horn',
                   tom: 'x...........o...', rev: 0.55 },
    'indie-pop': { scale: 'major', root: 52, progs: [[0, 4, 5, 3], [5, 3, 0, 4]], bars: 1, chords: 'stab', steps: [0, 3, 6, 10, 12], wave: 'square', cut: 1800, bass: 'eighths', bwave: 'triangle', mel: 0.28, lead: 'square',
                   kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.o.x.o.x.o.x.o.', rev: 0.2 },
    'upbeat-pop':{ scale: 'major', root: 53, progs: [[0, 4, 5, 3], [3, 4, 0, 5]], bars: 1, chords: 'stab', steps: [2, 6, 10, 14], wave: 'sawtooth', cut: 2600, bass: 'octave', bwave: 'sawtooth', mel: 0.32, lead: 'saw',
                   kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', rev: 0.2 },
    electronic:  { scale: 'minor', root: 45, progs: [[0, 5, 3, 4], [0, 6, 5, 4]], bars: 1, chords: 'pad', wave: 'sawtooth', cut: 1200, arp: 1, bass: 'eighths', bwave: 'square', mel: 0.12, lead: 'square',
                   kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'oxoxoxoxoxoxoxox', rev: 0.25 },
    piano:       { scale: 'minor', root: 48, progs: [[0, 5, 3, 4], [0, 3, 4, 0]], bars: 1, chords: 'arp', bass: 'hold', bwave: 'piano', mel: 0.25, lead: 'piano', rev: 0.4 }
  };
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function chordNotes(sc, root, deg, sev) { var n = [], c = sev ? 4 : 3; for (var i = 0; i < c; i++) { var d = deg + i * 2; n.push(root + sc[d % 7] + 12 * Math.floor(d / 7)); } return n; }

  // ---------- audio graph ----------
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, bus = null, revIn = null, meter = null, out = null;
  var duck = null, kMeter = null, ducked = false, kRef = null, refS = 0, refT = 0;     // logo duck + the level the logos follow (Danny 14:23/14:26)
  // ---------- media bridge: WebAudio -> MediaStream -> hidden <audio>, so iOS treats the DJ as media playback ----------
  var el = null, direct = true;
  function bridge() {
    if (!ctx.createMediaStreamDestination || !window.HTMLAudioElement) return;
    try { var msd = ctx.createMediaStreamDestination(); out.connect(msd); el = document.createElement('audio'); el.setAttribute('playsinline', ''); el.srcObject = msd.stream;
      el.addEventListener('pause', function () { if (!direct) { try { out.connect(ctx.destination); } catch (e) {} direct = true; } }); } catch (e) { el = null; }
  }
  function elPlay() {                                                     // once the element is really playing, it is the only path out
    if (!el) return; var p; try { p = el.play(); } catch (e) { return; }
    if (p && p.then) p.then(function () { if (direct && !el.paused && playing) { try { out.disconnect(ctx.destination); direct = false; } catch (e) {} } }, function () {});
  }
  function elStop() { if (el) try { el.pause(); } catch (e) {} }
  var msWired = false;
  function session(state) {
    var m = navigator.mediaSession; if (!m) return;
    try {
      if (!msWired) { msWired = true;
        m.setActionHandler('play', function () { if (stalled || pend) resumeTap(); else if (!playing) start(held); });
        m.setActionHandler('pause', function () { if (playing) stop(); });
        m.setActionHandler('stop', function () { if (playing) stop(); }); }
      if (state === 'playing' && window.MediaMetadata) m.metadata = new MediaMetadata({ title: "Dad's DJ", artist: 'EdgerEquals', album: cur && cur.genre ? cur.genre : '' });
      m.playbackState = state;
    } catch (e) {}
  }
  // ---------- start engine first, extras later (Danny 14:20 AWST 26 Oct: 'taking a while to respond') ----------
  // This file is the minimal start engine, loaded at tier 1 (just after first paint). js/dj-extras.js (lead voices, drums + noise,
  // reverb impulse, knob chips) loads after sound has begun (or when the pumps panel opens, or at background idle) and glides in over
  // PHI^2 s. The first touch anywhere silently creates/resumes the AudioContext and unlocks the <audio> bridge, so the switch only starts sound.
  var X = null, XL = 0, xReq = false, XURL = 'js/dj-extras.js?v=1';
  function loadX() { if (xReq) return; xReq = true; var sc = document.createElement('script'); sc.src = XURL; sc.async = true; document.head.appendChild(sc); }
  function extras(x) {                                                    // called by js/dj-extras.js when it lands
    X = x; XL = 1; var t = ctx ? ctx.currentTime : 0, G = Math.pow(PHI, 2);   // phi: extras glide in over PHI^2 s
    if (ctx) { tracks.forEach(function (tr) { tr.xo.gain.cancelScheduledValues(t); tr.xo.gain.setValueAtTime(tr.xo.gain.value, t); tr.xo.gain.linearRampToValueAtTime(1, t + G); });
      if (X.reverb) X.reverb(ctx, revIn, bus, G); }
    if (X.chips && chips) X.chips(chips);
    paint(compute());
  }
  var primed = false, PRIME = ['touchend', 'click', 'keydown'], idleT = 0;
  function prime() {                                                      // first touch anywhere: unlock audio without making a sound
    if (primed) return; primed = true; PRIME.forEach(function (n) { document.removeEventListener(n, prime, true); });
    if (!ensure()) return;
    try { ctx.resume(); } catch (e) {}
    if (el) try { var p = el.play(); if (p && p.then) p.then(function () { if (!playing) el.pause(); }, function () {}); } catch (e) {}
    clearTimeout(idleT); idleT = setTimeout(function () { if (!playing && ctx && !pend) try { ctx.suspend(); } catch (e) {} }, Math.pow(PHI, 6) * MS);   // phi: rest the idle context after PHI^6 s
    if (X && X.reverb) X.reverb(ctx, revIn, bus, Math.pow(PHI, 2));
  }
  PRIME.forEach(function (n) { document.addEventListener(n, prime, true); });
  function ensure() {
    if (ctx || !AC) return ctx;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = sliderVol();           // the volume slider
      bus = ctx.createGain(); bus.gain.value = 0.55;                       // the pump volume
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
      revIn = ctx.createGain(); revIn.gain.value = 0;                     // the reverb (and its impulse) arrives with js/dj-extras.js and glides in
      duck = ctx.createGain(); duck.gain.value = ducked ? IPH : 1;           // the logo duck sits after the meter's tap, so the meter reads undipped
      bus.connect(master); master.connect(comp); comp.connect(duck); duck.connect(ctx.destination); out = duck; bridge(); if (X && X.reverb) X.reverb(ctx, revIn, bus, Math.pow(PHI, 2));
      meter = ctx.createAnalyser(); meter.fftSize = 2048; comp.connect(meter);              // level check for tests only
      kMeter = ctx.createAnalyser(); kw(ctx, comp).connect(kMeter);                          // undipped, K-weighted: the level the logos follow
    } catch (e) { ctx = null; }
    return ctx;
  }

  // ---------- instruments (each plays one note into a track's output) ----------
  function env(g, t, a, peak, dur, rel) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(0.0001, t + Math.max(a, dur), rel); }
  function osc(type, f, t, end) { var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(end); return o; }
  function voice(tr, type, f, t, dur, vel, opt) {
    opt = opt || {};
    var end = t + dur + (opt.rel || 0.2) * 5, g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(opt.cut || 2400, t); if (opt.sweep) lp.frequency.setTargetAtTime(opt.cut * 0.25, t, opt.sweep);
    var o = osc(type, f, t, end); o.connect(lp);
    if (opt.det) { var o2 = osc(type, f, t, end); o2.detune.value = opt.det; o2.connect(lp); }
    lp.connect(g); env(g, t, opt.a || 0.005, vel, opt.hold != null ? opt.hold : 0.01, opt.rel || 0.2); g.connect(tr.out);
    if (opt.rev) { var s = ctx.createGain(); s.gain.value = opt.rev; g.connect(s); s.connect(tr.rev); }
  }
  var INST = {
    pad:   function (tr, f, t, d, v) { voice(tr, tr.g.wave, f, t, d, v * 0.10, { a: d * 0.35, hold: d * 0.6, rel: d * 0.25, cut: tr.g.cut, det: 9, rev: 0.8 }); },
    pluck: function (tr, f, t, d, v) { voice(tr, tr.g.wave || 'triangle', f, t, d, v * 0.16, { a: 0.003, hold: 0.01, rel: 0.22, cut: (tr.g.cut || 2400) * 1.6, sweep: 0.08, rev: 0.4 }); },
    bass:  function (tr, f, t, d, v) { if (tr.g.bwave === 'piano') return (INST.piano || INST.pluck)(tr, f, t, d, v * 1.2);
                                       voice(tr, tr.g.bwave, f, t, d, v * (tr.g.bwave === 'sine' ? 0.22 : 0.16), { a: 0.006, hold: d * 0.8, rel: 0.08, cut: 600 }); }
  };
  // ---------- a track: one generated piece (genre + BPM + seed) ----------
  function makeTrack(genre, bpm, seed) {
    var g = GEN[genre], r = rng(seed), sc = SCALES[g.scale], root = g.root + [-2, 0, 0, 2, 3, -3][Math.floor(r() * 6)];
    var prog = g.progs[Math.floor(r() * g.progs.length)], mel = [], deg = 7 + Math.floor(r() * 3);
    for (var i = 0; i < 32; i++) {                                // a 2-bar motif, repeated with small variations
      var strong = i % 4 === 0, p = (strong ? g.mel * 2.2 : (i % 2 ? g.mel * 0.6 : g.mel)) * Math.pow(PHI, M.density);   // mix: density rung
      if (r() < p) { deg = clamp(deg + [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(r() * 8)], 4, 13); mel.push(deg); } else mel.push(null);
    }
    var out = ctx.createGain(); out.gain.value = 0.0001; out.connect(bus);
    var wet = ctx.createGain(); wet.gain.value = 0.0001; wet.connect(revIn);                    // reverb send, faded with the track
    var rv = ctx.createGain(); rv.gain.value = g.rev; rv.connect(wet);
    var xo = ctx.createGain(); xo.gain.value = XL; xo.connect(out);                                // extras (leads, drums) glide in here
    var P = window.PhiPumps, node = !P || !M.route ? null : M.route === 1 ? P.page : P.logo('dad');   // mix: which pump-tree node drives the dynamics
    return { dr: M.donor ? GEN[M.donor] : g, shift: M.shift, node: node, genre: genre, bpm: bpm, seed: seed, g: g, sc: sc, root: root, prog: prog, mel: mel, r: r, out: out, wet: wet, rev: rv, xo: xo, x: { g: g, out: xo, rev: rv }, step: 0, next: ctx.currentTime + Math.pow(PHI, -6), born: Date.now() };   // phi: first step PHI^-6 s out
  }
  function playStep(tr, t) {
    var g = tr.g, st = tr.step, s16 = st % 16, bar = Math.floor(st / 16), dur16 = 60 / tr.bpm / 4, v;
    var deg = tr.prog[Math.floor(bar / g.bars) % tr.prog.length], ch = chordNotes(tr.sc, tr.root, deg, g.sev);
    var barLen = dur16 * 16 * g.bars, first = s16 === 0 && bar % g.bars === 0;
    // chords
    if (g.chords === 'pad' && first) ch.forEach(function (n) { INST.pad(tr, mtof(n + 12), t, barLen, 1); });
    if ((g.chords === 'strum' || g.chords === 'stab' || g.chords === 'ep') && g.steps.indexOf(s16) >= 0)
      ch.forEach(function (n, k) { var inst = (g.chords === 'ep' ? INST.ep : g.chords === 'stab' ? INST.stab : null) || INST.pluck; inst(tr, mtof(n + 12), t + (g.chords === 'strum' ? k * 0.012 : 0), dur16 * (g.chords === 'ep' ? 5 : 2), s16 ? 0.8 : 1); });
    if (g.chords === 'arp' && s16 % 2 === 0) { var an = ch.concat([ch[0] + 12]); (INST.piano || INST.pluck)(tr, mtof(an[(s16 / 2) % an.length] + 12), t, dur16 * 2, s16 % 8 ? 0.6 : 0.9); }
    if (g.arp && INST.square) { var a2 = ch.concat([ch[0] + 12, ch[1] + 12]); INST.square(tr.x, mtof(a2[s16 % a2.length] + 24), t, dur16 * 0.8, 0.45); }
    if (g.ost && s16 % 2 === 0 && INST.stab) INST.stab(tr.x, mtof(ch[s16 % 4 === 0 ? 0 : 2] + 12), t, dur16 * 1.6, 0.7);
    // bass
    var bn = ch[0] - 12;
    if (g.bass === 'hold' && first) INST.bass(tr, mtof(bn), t, barLen * 0.9, 1);
    if (g.bass === 'roots' && (s16 === 0 || s16 === 8)) INST.bass(tr, mtof(s16 ? ch[2] - 12 : bn), t, dur16 * 6, 1);
    if (g.bass === 'walk' && [0, 3, 6, 8, 11, 14].indexOf(s16) >= 0) INST.bass(tr, mtof(s16 === 0 ? bn : ch[[0, 1, 2, 1, 2, 0][[0, 3, 6, 8, 11, 14].indexOf(s16)]] - 12), t, dur16 * 2, 0.9);
    if (g.bass === 'eighths' && s16 % 2 === 0) INST.bass(tr, mtof(bn), t, dur16 * 1.5, s16 % 4 ? 0.7 : 1);
    if (g.bass === 'octave' && s16 % 2 === 0) INST.bass(tr, mtof(bn + (s16 % 4 ? 12 : 0)), t, dur16 * 1.5, 0.9);
    // melody (Dad's tune): motif from the seed, a note shifted now and then
    var md = tr.mel[st % 32];
    if (md != null && INST[g.lead]) { if (tr.r() < 0.12) md += tr.r() < 0.5 ? 1 : -1; INST[g.lead](tr.x, mtof(tr.root + tr.sc[md % 7] + 12 * Math.floor(md / 7) + 12), t, dur16 * (g.lead === 'horn' || g.lead === 'bell' ? 6 : 2), 0.8); }
    // drums
    var dyn = 1; if (tr.node) try { dyn = tr.node.out(); } catch (e) {}      // mix: routed pump-tree dynamics (around 1)
    if (X && X.hit) ['kick', 'snare', 'hat', 'shaker', 'tom'].forEach(function (k) { var pat = (tr.dr || g)[k]; if (pat && (v = pat[(s16 + (tr.shift || 0)) % pat.length]) !== '.') X.hit(tr.x, k, t, (v === 'x' ? 1 : 0.55) * dyn); });
    if (s16 % 4 === 0) beat(t, s16 === 0);
  }
  function stepLen(tr) { var d = 60 / tr.bpm / 4, sw = tr.g.swing || 0; return tr.step % 2 ? d * (1 - sw) : d * (1 + sw); }

  // ---------- scheduler (look-ahead) ----------
  var tracks = [], sched = 0;
  function tick() {
    if (!ctx) return;
    var horizon = ctx.currentTime + Math.pow(PHI, document.hidden ? 3 : -4);   // phi: look PHI^-4 s ahead, PHI^3 s while hidden (throttled timers)
    tracks.forEach(function (tr) {
      if (tr.next < ctx.currentTime - 0.5) tr.next = ctx.currentTime + 0.02;   // resumed after being hidden
      while (tr.next < horizon && !tr.dead) { playStep(tr, tr.next); tr.next += stepLen(tr); tr.step++; }
    });
  }
  function curve(up) { var n = 64, a = new Float32Array(n); for (var i = 0; i < n; i++) { var x = i / (n - 1); a[i] = Math.max(0.0001, up ? Math.sin(x * Math.PI / 2) : Math.cos(x * Math.PI / 2)); } return a; }
  function fadeGain(gn, up, t, len) { try { gn.gain.cancelScheduledValues(t); gn.gain.setValueCurveAtTime(curve(up), t, len); } catch (e) { gn.gain.setTargetAtTime(up ? 1 : 0.0001, t, len / 3); } }

  function fadeTrack(tr, up, t, len) { fadeGain(tr.out, up, t, len); fadeGain(tr.wet, up, t, len); }
  // ---------- the DJ ----------
  var playing = false, cur = null, fadingUntil = 0, clock = 0, T0 = Date.now(), lastMood = null, genreFlip = 0, setBm = false;
  function startTrack(c, fade, sp) {
    var gs = c.genres, genre = sp && GEN[sp.genre] ? sp.genre : gs[(genreFlip++) % gs.length], t = ctx.currentTime + Math.pow(PHI, -6);   // phi: fade starts PHI^-6 s out
    var tr = makeTrack(genre, sp && sp.bpm > 0 ? sp.bpm : c.bpm, sp && isFinite(sp.seed) ? sp.seed : (Math.random() * SEEDS) | 0);
    if (sp) { tr.born = sp.born; tr.step = stepsIn((Date.now() - sp.born) / MS, tr.bpm); }   // pick up the arrangement where wall-clock time has it
    var old = tracks.filter(function (x) { return !x.dead && !x.leaving; }), len = fade || c.fade;
    fadeTrack(tr, true, t, len);
    old.forEach(function (o) { o.leaving = true; fadeTrack(o, false, t, len); setTimeout(function () { kill(o); }, len * 1000 + 300); });
    tracks.push(tr); fadingUntil = Date.now() + len * 1000; lastMood = c.p.mood;
    return tr;
  }
  function kill(tr) { tr.dead = true; tracks = tracks.filter(function (x) { return x !== tr; }); setTimeout(function () { try { tr.out.disconnect(); tr.wet.disconnect(); tr.rev.disconnect(); } catch (e) {} }, 400); }
  function applyVol(c, len) { if (bus) bus.gain.setTargetAtTime(c.vol, ctx.currentTime, Math.max(0.05, len / 3)); }
  function boundary() {
    var c = compute();
    if (Date.now() < fadingUntil) { schedule(c.fade); paint(c); return; }   // never mid-fade
    if (playing && ctx) {
      var tr = tracks.filter(function (x) { return !x.leaving && !x.dead; })[0];
      var changed = !tr || c.genres.indexOf(tr.genre) < 0 || Math.abs(tr.bpm - c.bpm) > 0.5 || c.p.mood !== lastMood;
      var old = tr && (Date.now() - tr.born) / 1000 >= tr.trackLen;
      if (changed || old) { tr = startTrack(c); tr.trackLen = c.trackLen; }
      applyVol(c, c.fade); cur = c; cur.genre = tr.genre;
    } else { cur = c; }
    paint(c); schedule(c.fade);
  }
  function schedule(period) { clearTimeout(clock); var P = period * 1000, now = Date.now(); clock = setTimeout(boundary, P - ((now - T0) % P) + 5); }
  function nextIn() { var c = compute(), P = c.fade * 1000; return (P - ((Date.now() - T0) % P)) / 1000; }

  // ---------- continuity: arrangement position from wall-clock time ----------
  var pend = null, stalled = false, held = null, GA = 0x9E3779B9, SEEDS = 4294967296;   // phi: golden-ratio hash (2^32 / PHI) steps the seed per skipped track; unit: 2^32 seeds
  function stepsIn(sec, bpm) { return Math.max(0, Math.floor(sec * bpm / SPM * SPB)); }
  function spec() { var tr = tracks.filter(function (x) { return !x.leaving && !x.dead; })[0];
    return tr ? { genre: tr.genre, bpm: tr.bpm, seed: tr.seed, born: tr.born, len: tr.trackLen } : (pend || held); }
  function advance(sp, c) {                                               // whole track lengths that passed while away, then the remainder
    if (!sp || !(sp.len > 0) || !isFinite(sp.born)) return null;
    var age = (Date.now() - sp.born) / MS; if (age < sp.len) return sp;
    var k = Math.floor(age / sp.len), gs = c.genres; genreFlip += k;
    return { genre: gs[(genreFlip - 1) % gs.length], bpm: c.bpm, seed: (sp.seed + Math.imul(k, GA)) | 0, born: sp.born + k * sp.len * MS, len: c.trackLen };
  }
  function start(sp) {
    if (!ensure()) { paint(compute()); return; }
    try { ctx.resume && ctx.resume(); } catch (e) {}
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    playing = true; pend = null; stalled = false; var c = compute(); bus.gain.cancelScheduledValues(ctx.currentTime); bus.gain.setValueAtTime(c.vol, ctx.currentTime);
    sp = sp && sp.genre ? advance(sp, c) : null;
    var tr = startTrack(c, PHI, sp); tr.trackLen = sp && sp.len > 0 ? sp.len : c.trackLen; cur = c; cur.genre = tr.genre;   // first tap: a quick PHI^1 s fade-in (crossfades use PHI^(3.5+s))
    elPlay(); session('playing'); save(); clearTimeout(idleT);
    setTimeout(loadX, Math.pow(PHI, 2) * MS);                              // phi: extras after the first sound has begun (PHI^2 s)
    if (!sched) sched = setInterval(tick, 25); tick();
    if (!document.documentElement.hasAttribute('data-bm')) { document.documentElement.setAttribute('data-bm', 'playing'); setBm = true; }  // the generated cue layer ducks to 30% under the music
    paint(c); schedule(c.fade);
  }
  function stop() {
    held = spec(); playing = false; pend = null; stalled = false; disarm();
    setTimeout(function () { if (!playing) elStop(); }, PHI * MS); session('paused');
    if (ctx) { var t = ctx.currentTime; tracks.forEach(function (o) { o.leaving = true; fadeTrack(o, false, t, 1); setTimeout(function () { kill(o); }, 1300); }); }
    if (setBm) { document.documentElement.removeAttribute('data-bm'); setBm = false; }
    fadingUntil = 0; paint(compute()); save();
  }
  function jump() {                                                       // live return: if the music was frozen while away, skip ahead to now
    tracks.forEach(function (tr) { if (tr.dead || tr.leaving) return; var want = stepsIn((Date.now() - tr.born) / MS, tr.bpm);
      if ((want - tr.step) * SPM / tr.bpm / SPB > PHI) { tr.step = want; tr.next = ctx.currentTime + Math.pow(PHI, -4); } });   // phi: only past a PHI s gap
  }
  function wake() {                                                       // visibilitychange / pageshow: resume what was playing
    if (!playing || !ctx) return;
    var p = null; try { p = ctx.resume && ctx.resume(); } catch (e) {}
    elPlay(); jump(); tick();
    var check = function () { if (playing && ctx.state !== 'running') { stalled = true; arm(); paint(compute()); } };
    if (p && p.then) p.then(check, check); else check();
  }
  function remix(seed) {                                                  // a new mix glides in over a PHI^3 s crossfade (rule 6), never a cut
    mixSeed = seed; M = genome(seed); if (seed != null) genreFlip += Math.floor(M.flip * SPB);
    var c = compute();
    if (playing && ctx) { var tr = startTrack(c, Math.pow(PHI, 3)); tr.trackLen = c.trackLen; applyVol(c, Math.pow(PHI, 3)); cur = c; cur.genre = tr.genre; }
    else cur = c;
    paint(c); save();
    if (mixBtn) { mixBtn.classList.remove('is-mixing'); void mixBtn.offsetWidth; mixBtn.classList.add('is-mixing');
      mixBtn.setAttribute('aria-label', 'New DJ mix (now ' + mixName() + '; hold for the default mix)'); }
  }
  function mixName() { return mixSeed == null ? 'default mix' : 'mix ' + mixSeed.toString(36).toUpperCase(); }   // unit: base-36 short name
  function nextMix() { remix(mixSeed == null ? Math.floor(Date.now() / MS) : mixSeed + 1); }
  var mixBtn = null;
  function wireMix() {
    mixBtn = document.getElementById('dj-mix'); if (!mixBtn) return;
    var held = 0, longDone = false;
    mixBtn.addEventListener('pointerdown', function () { longDone = false; clearTimeout(held); held = setTimeout(function () { longDone = true; remix(null); }, IPH * MS); });   // phi: hold PHI^-1 s
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (n) { mixBtn.addEventListener(n, function () { clearTimeout(held); }); });
    mixBtn.addEventListener('click', function (e) { e.stopPropagation(); if (longDone) { longDone = false; return; } if (e.shiftKey) remix(null); else nextMix(); });
    mixBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  function resumeTap() {
    disarm(); if (!masterOn()) { var sw = soundSwitch(); if (sw) sw.click(); }
    if (stalled && playing && ctx) { stalled = false; try { ctx.resume(); } catch (e) {} elPlay(); jump(); tick(); session('playing'); paint(compute()); return; }
    if (pend) start(pend);
  }
  var armed = false, GEST = ['touchend', 'click', 'keydown'];
  function onGesture(e) { if (btn && btn.contains(e.target)) return; if (pend || stalled) resumeTap(); else disarm(); }
  function arm() { if (armed) return; armed = true; GEST.forEach(function (n) { document.addEventListener(n, onGesture, true); }); }
  function disarm() { if (!armed) return; armed = false; GEST.forEach(function (n) { document.removeEventListener(n, onGesture, true); }); }
  // register with js/rhythm-continuity.js (save cadence, lifecycle hooks, catch-up and the daily restart live there)
  var RC = null;
  function save() { if (RC) RC.save(); }
  function snapshot() { return { on: playing || !!pend || stalled, nudge: nudge, flip: genreFlip, T0: T0, tr: spec(), mix: mixSeed, k: kRef }; }
  function catchUp(e, s, mode) {
    if (mode === 'return') { wake(); return; }
    if (!s) return;
    if (s.k > 0 && isFinite(s.k)) kRef = s.k;                             // learned level per unit of nominal volume (a calibration, kept)
    if (s.mix != null && isFinite(s.mix)) { mixSeed = s.mix; M = genome(mixSeed); }   // his mix choice carries through reloads and the daily restart
    if (mode === 'restart') { if (s.on && AC) { pend = {}; arm(); } return; }   // new solar day: still on (his choice), fresh track, knobs back to live
    if (s.nudge) Object.keys(nudge).forEach(function (k) { if (isFinite(s.nudge[k])) nudge[k] = s.nudge[k]; });
    if (isFinite(s.flip)) genreFlip = s.flip; if (isFinite(s.T0)) T0 = s.T0;
    if (s.on && AC) { pend = s.tr || {}; arm(); }
  }
  function reset() {                                                      // daily restart at local solar midnight: knobs back to live, fresh rotation
    Object.keys(nudge).forEach(function (k) { nudge[k] = 0; }); genreFlip = 0; T0 = Date.now(); held = null;
    if (pend) pend = {}; tracks.forEach(function (tr) { tr.born = 0; });  // the next boundary starts a fresh track
    cur = compute(); paint(cur); schedule(cur.fade);
  }

  // ---------- UI (Dad header) ----------
  var $ = function (id) { return document.getElementById(id); };
  var btn, vol, read, readP, led, chips;
  function sliderVol() { var v = vol ? +vol.value : +(store(K_VOL) || 80); return clamp(isFinite(v) ? v : 80, 0, 100) / 100; }
  function sgn(v) { return (v > 0 ? '+' : v < 0 ? '\u2212' : '\u00B1') + Math.abs(v); }
  function paint(c) {
    if (!read) return;
    var shown = playing && cur ? cur : c, g = playing && cur && cur.genre ? cur.genre : c.genres.join(' / ');
    read.textContent = mixName() + ' \u00B7 ' + g + ' \u00B7 ' + Math.round(shown.bpm) + ' BPM \u00B7 fade ' + shown.fade.toFixed(1) + ' s \u00B7 vol ' + Math.round(shown.vol * 100) + '%';
    var p = c.p, pendN = playing && cur && (Math.abs(cur.s - c.s) > Number.EPSILON || cur.p.mood !== c.p.mood);
    readP.textContent = 's ' + sgn(c.s) + ' = time ' + p.time + ' ' + sgn(p.tp) + ', sky ' + p.sky + ' ' + sgn(p.wp) + ', ' + p.urgency + ' ' + sgn(p.up) + ', ' + p.mood + ' ' + sgn(p.mp) +
      (pendN ? ' \u2192 next: ' + c.genres.join('/') + ' ' + Math.round(c.bpm) + ' BPM in ' + Math.max(0, nextIn()).toFixed(1) + ' s' : '') + liveLine();
    var on = playing || !!pend || stalled, wait = !!pend || stalled;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.classList.toggle('is-resuming', wait);
    btn.querySelector('.dj-lbl').textContent = !AC ? 'no sound here' : wait ? 'Dad\u2019s DJ \u00B7 tap to resume' : playing ? 'Dad\u2019s DJ on' : 'Dad\u2019s DJ';
    syncChips();
    btn.disabled = !AC;
  }
  var beatT = [];
  function beat(t, down) {
    if (RM.matches || !led || !ctx) return;
    var ms = Math.max(0, (t - ctx.currentTime) * 1000);
    beatT.push(setTimeout(function () { led.classList.add(down ? 'on2' : 'on'); setTimeout(function () { led.classList.remove('on', 'on2'); }, 90); }, ms));
    if (beatT.length > 64) beatT.splice(0, 32);
  }
  function soundSwitch() { return document.querySelector('#vol-sound .bs-toggle'); }
  function masterOn() { var b = window.BonnieSound; return !b || b.on; }
  // knob chips + live line live in js/dj-extras.js (they arrive after first sound, or when the pumps panel opens, or at background idle)
  function syncChips() { if (X && X.sync) X.sync(); }
  function liveLine() { return X && X.live ? X.live() : ''; }
  function boot() {
    btn = $('dj-play'); vol = $('dj-vol'); read = $('dj-read'); readP = $('dj-pumps'); chips = $('dj-chips'); led = btn && btn.querySelector('.dj-led');
    if (!btn || !read) return;
    vol.value = Math.round(sliderVol() * 100);
    vol.addEventListener('input', function () { store(K_VOL, vol.value); if (master) master.gain.setTargetAtTime(sliderVol(), ctx.currentTime, 0.03); });
    btn.addEventListener('click', function () {
      if (pend || stalled) { resumeTap(); return; }
      if (playing) { stop(); return; }
      if (!masterOn()) { var sw = soundSwitch(); if (sw) sw.click(); }        // the page's sound switch is the master: Dad's DJ turns it on
      start();
    });
    // the sound switch off = everything off (mute respected)
    var slot = $('vol-sound');
    if (slot) new MutationObserver(function () { if (playing && !masterOn()) stop(); }).observe(slot, { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] });
    // hidden: keep playing if the DJ is on (Media Session + <audio> bridge keep it alive), otherwise rest the context
    document.addEventListener('visibilitychange', function () { if (!ctx) return; if (document.hidden) { if (!playing) try { ctx.suspend(); } catch (e) {} } else wake(); });
    window.addEventListener('pageshow', function () { wake(); });
    document.addEventListener('simwx', function () { if (!playing) { cur = compute(); paint(cur); } });
    wireMix();
    if (window.RhythmContinuity) RC = RhythmContinuity.register('dj', { save: snapshot, catchUp: catchUp, reset: reset });
    cur = compute(); paint(cur); schedule(cur.fade);
    var dm = document.querySelector('.dad-dj .dj-demo'); if (dm) dm.addEventListener('toggle', function () { if (dm.open) loadX(); });
    if (window.LoadTiers) LoadTiers.add(3, loadX, 'dj extras', { id: 'dj' });
    setInterval(function () { if (!document.hidden) paint(compute()); }, 1000);
  }
  // ---------- page-music level for the logos (Danny 14:23 + 14:26 AWST 26 Oct; js/logo-sound.js trimmer) ----------
  function rmsOf(m) { if (!m) return 0; var a = new Float32Array(m.fftSize); m.getFloatTimeDomainData(a); var q = 0; for (var i = 0; i < a.length; i++) q += a[i] * a[i]; return Math.sqrt(q / a.length); }
  function rms() { return rmsOf(meter); }
  function kw(c, src) {                                                   // ITU-R BS.1770-4 K-weighting (cited): shelf +4 dB @ 1681.97 Hz, high-pass 38.13 Hz
    var a = c.createBiquadFilter(), b = c.createBiquadFilter(); a.type = 'highshelf'; a.frequency.value = 1681.97; a.gain.value = 4;   // cite: ITU-R BS.1770-4 K-weighting
    b.type = 'highpass'; b.frequency.value = 38.13; b.Q.value = 0.5003; src.connect(a); a.connect(b); return b;   // cite: ITU-R BS.1770-4 K-weighting
  }
  function nominal() { return sliderVol() * compute().vol; }
  function ref() {                                                        // undipped live level while playing, else learned k x nominal
    var now = performance.now() / MS, dt = refT ? now - refT : 0; refT = now;
    if (playing && ctx && ctx.state === 'running') {
      var x = rmsOf(kMeter); refS = refS ? refS + (x - refS) * (1 - Math.exp(-dt / PHI)) : x;   // phi: tau PHI s
      var n = nominal(); if (n > 0 && refS > 0) kRef = kRef ? kRef + (refS / n - kRef) * (1 - Math.exp(-dt / Math.pow(PHI, 4))) : refS / n;   // phi: tau PHI^4 s
      return refS;
    }
    refS = 0; return kRef ? kRef * nominal() : null;
  }
  function duckTo(on) { ducked = !!on; if (duck) duck.gain.setTargetAtTime(on ? IPH : 1, ctx.currentTime, on ? IPH * IPH : IPH); }   // rule 6: down tau PHI^-2 s, up tau PHI^-1 s
  window.PageMusic = { ref: ref, duck: duckTo, get ducked() { return ducked; } };
  setInterval(function () { if (playing && !document.hidden) ref(); }, PHI * MS);   // phi: keep learning k every PHI s while the music plays
  window.DadAutoDJ = { _kit: { extras: extras, voice: function () { return voice.apply(null, arguments); }, osc: function () { return osc.apply(null, arguments); }, env: env,
      INST: INST, get ctx() { return ctx; }, LADDER: LADDER, eff: eff, liveOf: liveOf, nudge: nudge, setTo: setTo, compute: compute, paint: paint, save: save,
      idle: function (c) { if (!playing) cur = c; } },
    compute: compute, pumps: pumps, GEN: Object.keys(GEN), set: function (k, v) { if (LADDER[k]) setTo(k, v); paint(compute()); save(); },
    get nudge() { return JSON.parse(JSON.stringify(nudge)); }, live: function (k) { return liveOf(k); }, get pending() { return !!pend || stalled; },
    get track() { var t = spec(); return t ? { genre: t.genre, bpm: t.bpm, born: t.born, len: t.len, step: (tracks.filter(function (x) { return !x.dead && !x.leaving; })[0] || {}).step } : null; },
    get mix() { return { seed: mixSeed, name: mixName(), genome: M }; }, remix: function (seed) { if (seed === undefined) nextMix(); else remix(seed); },
    get bridge() { return el ? { paused: el.paused, direct: direct } : null; }, snapshot: snapshot,
    get playing() { return playing; }, get now() { return cur; }, get tracks() { return tracks.length; },
    level: rms, get out() { return { level: rms(), k_level: rmsOf(kMeter), ref: refS, k: kRef, nominal: nominal(), duck: duck ? duck.gain.value : 1, ducked: ducked }; },
    get extras() { return !!X; }, get primed() { return primed; },
    get graph() { return ctx ? { state: ctx.state, tracks: tracks.length, busGain: bus.gain.value, master: master.gain.value } : null; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
