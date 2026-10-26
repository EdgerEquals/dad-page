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
  // PER-KNOB RE-ROLL (Danny 15:14 AWST 26 Oct): each pump knob owns a seed that re-rolls its column of coupling weights (how that pump
  // feeds fade, tempo, volume, length) on top of the mix genome; saved with the DJ snapshot. KP maps a knob to its pump.
  var KP = { time: 'tp', sky: 'wp', urgency: 'up', mood: 'mp' }, kseed = {};
  function withKnobs(g) {
    Object.keys(kseed).forEach(function (k) { var j = PK.indexOf(KP[k]), sd = kseed[k]; if (j < 0 || sd == null) return;
      g.W = g.W.map(function (row, i) { var r = row.slice(); r[j] = Math.pow(PHI, 2 * frac((sd * PAR.length + i) * IPH) - 1); return r; }); });   // phi: weight PHI^-1..PHI^1
    return g;
  }
  M = genome(null);
  function sOf(p, i) { var w = M.W[i]; return w[0] * p.tp + w[1] * p.wp + w[2] * p.up + w[3] * p.mp; }
  function compute(p) {
    p = p || pumps();
    var s = p.tp + p.wp + p.up + p.mp, S = PAR.map(function (x, i) { return sOf(p, i); }), sf = S[0] + M.cascade, sb = S[1], sv = S[2], sl = S[3];   // mix: per-parameter coupling
    var vol = clamp(IPH * Math.pow(PHI, -sv / 4), 0.25, 0.8);   // phi: base level PHI^-1 (was a fixed 0.55)
    if (p.mood === 'serious' || p.urgency === 'urgent') vol = 0.3;
    return { p: p, s: s, fade: clamp(Math.pow(PHI, 3.5 + sf), 2.06, 22.83), bpm: clamp(60 / Math.pow(PHI, -1 + sb / 2) * Math.pow(PHI, M.tempo), 62, 157),
             vol: vol, trackLen: Math.pow(PHI, Math.max(6, 7.5 + sl)), genres: GENRES[p.mood] || GENRES.neutral, mix: M.seed };   // phi: tracks last at least PHI^6 s (was PHI^4 = 6.9 s when excited/urgent/hot)
  }

  // ---------- music theory + genre table ----------
  var SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11] };
  var COLOUR = { penta: [0, 2, 4, 7, 9], penta_m: [0, 3, 5, 7, 10], whole: [0, 2, 4, 6, 8, 10] };   // cite: 12-TET pentatonic (major/minor) and whole-tone sets (en.wikipedia.org/wiki/Pentatonic_scale, /Whole-tone_scale)
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
  function chordNotes(sc, root, deg, sev, cnt) { var n = [], c = cnt || (sev ? 4 : 3); for (var i = 0; i < c; i++) { var d = deg + i * 2; n.push(root + sc[d % 7] + 12 * Math.floor(d / 7)); } return n; }

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
      if (state === 'playing' && window.MediaMetadata) m.metadata = new MediaMetadata({ title: (document.documentElement.getAttribute('data-who')||'Dad') + "'s DJ", artist: 'EdgerEquals', album: cur && cur.genre ? cur.genre : '' });
      m.playbackState = state;
    } catch (e) {}
  }
  // ---------- start engine first, extras later (Danny 14:20 AWST 26 Oct: 'taking a while to respond') ----------
  // This file is the minimal start engine, loaded at tier 1 (just after first paint). js/dj-extras.js (lead voices, drums + noise,
  // reverb impulse, knob chips) loads after sound has begun (or when the pumps panel opens, or at background idle) and glides in over
  // PHI^2 s. The first touch anywhere silently creates/resumes the AudioContext and unlocks the <audio> bridge, so the switch only starts sound.
  var X = null, XL = 0, xReq = false, XURL = 'js/dj-extras.js?v=10';
  function loadX() { if (xReq) return; xReq = true; var sc = document.createElement('script'); sc.src = XURL; sc.async = true; document.head.appendChild(sc); }
  function extras(x) {                                                    // called by js/dj-extras.js when it lands
    X = x; XL = 1; var t = ctx ? ctx.currentTime : 0, G = Math.pow(PHI, 2);   // phi: extras glide in over PHI^2 s
    if (ctx) { tracks.forEach(function (tr) { tr.xo.gain.cancelScheduledValues(t); tr.xo.gain.setValueAtTime(tr.xo.gain.value, t); tr.xo.gain.linearRampToValueAtTime(1, t + G); });
      if (X.reverb) X.reverb(ctx, revIn, bus, G); }
    if (X.chips && chips) X.chips(chips);
    paint(compute()); loadFX();
  }
  // ---------- effects (Danny 14:34 AWST 26 Oct): js/dj-fx.js loads after the extras, once sound exists; dry path -> fx chain over PHI^2 s ----------
  var FXURL = 'js/dj-fx.js?v=9', fxReq = false, fxDry = null, fxC = null;
  function loadFX() { if (fxReq || !ctx || !X) return; fxReq = true; var sc = document.createElement('script'); sc.src = FXURL; sc.async = true; document.head.appendChild(sc); }
  function fxIn(f) {                                                      // called by js/dj-fx.js: {inp, out}; the chain is transparent at rest
    if (fxC || !ctx) return; fxC = f; var t = ctx.currentTime, G = Math.pow(PHI, 2);   // phi: crossfade PHI^2 s (rule 6)
    bus.connect(f.inp); f.out.connect(master);
    f.out.gain.setValueAtTime(0, t); f.out.gain.linearRampToValueAtTime(1, t + G);
    fxDry.gain.setValueAtTime(1, t); fxDry.gain.linearRampToValueAtTime(0, t + G);
  }
  var primed = false, PRIME = ['touchend', 'click', 'keydown'], idleT = 0;
  function prime() {                                                      // first touch anywhere: unlock audio without making a sound
    if (primed) return; primed = true; PRIME.forEach(function (n) { document.removeEventListener(n, prime, true); }); document.removeEventListener('pointerdown', primeP, true); document.removeEventListener('pointerup', primeP, true);
    if (!ensure()) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}   // iOS: the ring / silent switch doesn't mute the page
    try { ctx.resume(); } catch (e) {}                                    // synchronously, inside the gesture, before anything async
    if (el) try { var p = el.play(); if (p && p.then) p.then(function () { if (!playing) el.pause(); }, function () {}); } catch (e) {}
    clearTimeout(idleT); idleT = setTimeout(function () { if (!playing && ctx && !pend) try { ctx.suspend(); } catch (e) {} }, Math.pow(PHI, 6) * MS);   // phi: rest the idle context after PHI^6 s
    if (X && X.reverb) X.reverb(ctx, revIn, bus, Math.pow(PHI, 2));
  }
  // iPhone unlock (shared.md S-0017, Steve; Danny 17:04 AWST 26 Oct): touch unlocks on finger LIFT (pointerup / touchend; iOS does not count a
  // touch pointerdown as a gesture), a mouse on pointerdown, keys on keydown (click stays as the fallback). Everything that needs no tap is
  // primed before it at idle: the graph and a SUSPENDED AudioContext, the media bridge, audioSession 'playback'; nothing starts.
  function primeP(e) { if (e.type === 'pointerdown' ? e.pointerType === 'mouse' : e.pointerType !== 'mouse') prime(); }
  PRIME.forEach(function (n) { document.addEventListener(n, prime, true); }); document.addEventListener('pointerdown', primeP, true); document.addEventListener('pointerup', primeP, true);
  function prebuild() { if (ctx || !AC) return; if (ensure()) { try { if (ctx.state === 'running' && !playing) ctx.suspend(); } catch (e) {} } try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {} }   // start nothing
  if (window.LoadTiers && LoadTiers.add) LoadTiers.add(2, prebuild, 'dj prime', { id: 'dj' });
  function ensure() {
    if (ctx || !AC) return ctx;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = sliderVol();           // the volume slider
      bus = ctx.createGain(); bus.gain.value = IPH;                       // the pump volume
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
      revIn = ctx.createGain(); revIn.gain.value = 0;                     // the reverb (and its impulse) arrives with js/dj-extras.js and glides in
      duck = ctx.createGain(); duck.gain.value = ducked ? IPH : 1;           // the logo duck sits after the meter's tap, so the meter reads undipped
      fxDry = ctx.createGain(); bus.connect(fxDry); fxDry.connect(master); master.connect(comp); comp.connect(duck); duck.connect(ctx.destination); out = duck; bridge(); if (X && X.reverb) X.reverb(ctx, revIn, bus, Math.pow(PHI, 2));
      meter = ctx.createAnalyser(); meter.fftSize = 2048; comp.connect(meter);              // level check for tests only
      kMeter = ctx.createAnalyser(); kw(ctx, comp).connect(kMeter);                          // undipped, K-weighted: the level the logos follow
    } catch (e) { ctx = null; }
    return ctx;
  }

  // ---------- instruments (each plays one note into a track's output) ----------
  function env(g, t, a, peak, dur, rel) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(0.0001, t + Math.max(a, dur), rel); }
  // SOPHISTICATION DIAL (MIDI Bot review #3): s in 0..1 per track (calm pumps, the mix seed and a 7th-chord genre raise it). It sets how many
  // partials the pad's wave carries (PHI^(1+3 PHI s): 2 .. 17, as a PeriodicWave with a brightness roll-off of PHI^-(k-1)(1-s)/PHI per
  // partial) and the FM index of the EP and bell (js/dj-extras.js). Waves are built once per (shape, count) and cached.
  var PW = {};
  function pwave(type, s) {
    var n = Math.max(2, Math.round(Math.pow(PHI, 1 + 3 * PHI * s))), key = type + n; if (PW[key]) return PW[key];   // phi: partial count PHI^(1+3 PHI s): 2 .. 17
    var re = new Float32Array(n + 1), im = new Float32Array(n + 1);
    for (var k = 1; k <= n; k++) {
      var a = type === 'square' ? (k % 2 ? 1 / k : 0) : type === 'triangle' ? (k % 2 ? (((k - 1) / 2) % 2 ? -1 : 1) / (k * k) : 0) : type === 'sine' ? Math.pow(PHI, -2 * (k - 1)) : 1 / k;   // unit: Fourier series of each shape (sine: golden overtones)
      im[k] = a * Math.pow(PHI, -(k - 1) * (1 - s) * IPH);
    }
    try { return (PW[key] = ctx.createPeriodicWave(re, im)); } catch (e) { return (PW[key] = null); }
  }
  function soph(tr) { return clamp(IPH * (1 - (tr.u == null ? IPH : tr.u)) + IPH * IPH * frac((tr.seed || 0) * IPH) + (tr.g.sev ? Math.pow(PHI, -3) : 0) + (sOver == null ? 0 : sOver - IPH), 0, 1); }
  var sOver = null;                                                       // test / hand override of the dial (null = pumps)
  function osc(type, f, t, end) { var o = ctx.createOscillator(); if (type && typeof type === 'object') o.setPeriodicWave(type); else o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(end); return o; }
  // VOICE (MIDI Bot review #1, Danny 14:48: the 'computer game' fix). Each note is an ENSEMBLE of detuned copies (spread PHI^(1+u)
  // cents apart, u = the track's pump energy; sustained voices 3 copies, short ones 2, bass 1), sustained voices share the track's slow
  // VIBRATO (one LFO per track near PHI^0 Hz, depth PHI^-4 semitones x tension, eased in over PHI s), and every note sits at its own
  // place in the STEREO field (pitch on the golden angle x PHI^-1 x width; width from space = 1 - u). NODE BUDGET: when many voices
  // ring at once (more than PHI^7, older iPhones), copies drop to 1 and per-note panning to the layer's, so the per-note node count stays small.
  var nlive = 0, CROWD = Math.pow(PHI, 7), CENT = 100;                     // phi: crowd limit; unit: cents per semitone
  function voice(tr, type, f, t, dur, vel, opt) {
    opt = opt || {};
    var rel = opt.rel || 0.2, a = opt.a || 0.005, end = t + dur + rel * 5, g = ctx.createGain(), lp = ctx.createBiquadFilter(), crowd = nlive > CROWD;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(opt.cut || tr.g.cut * PHI, t); if (opt.sweep) lp.frequency.setTargetAtTime(opt.cut * Math.pow(PHI, -3), t, opt.sweep);   // phi: sweep down three rungs
    var sus = a > Math.pow(PHI, -5) || (opt.hold || 0) > dur * IPH, bass = opt.cut && opt.cut < tr.g.cut;   // phi: sustained = slow attack or long hold
    var fm = null; if (opt.fm) { var mo = osc('sine', f * opt.fm.r, t, end); fm = ctx.createGain(); fm.gain.setValueAtTime(f * opt.fm.i0, t); fm.gain.setTargetAtTime(f * opt.fm.i1, t, opt.fm.tau); mo.connect(fm); }   // FM: one modulator per note (index i0 -> i1, tau)
    var n = crowd || bass ? 1 : sus ? 3 : 2, u = tr.u == null ? IPH : tr.u, sp = Math.pow(PHI, 1 + u) + (opt.det || 0) * IPH;   // unit: copies; phi: spread in cents
    for (var c = 0; c < n; c++) {
      var o = osc(type, f, t, end); o.detune.value = n > 1 ? sp * (2 * c / (n - 1) - 1) : 0; o.connect(lp); if (fm) fm.connect(o.frequency);
      var vb = sus && tr.vib ? tr.vib : null; if (vb) vb.connect(o.detune);
      nlive++; o.onended = (function (o, vb) { return function () { nlive--; if (vb) try { vb.disconnect(o.detune); } catch (e) {} }; })(o, vb);   // let the ended copy go
    }
    lp.connect(g); env(g, t, a, vel / Math.sqrt(n), opt.hold != null ? opt.hold : 0.01, rel);   // equal-power: the copies sum to the old level
    var to = tr.out;
    if (!crowd && ctx.createStereoPanner) { var pn = ctx.createStereoPanner(), w = (1 - u) * IPH + IPH * IPH; pn.pan.value = Math.sin(Math.log2(f) * 12 * 2 * Math.PI * IPH) * w; g.connect(pn); pn.connect(to); }   // unit: 12 semitones per octave; phi: golden-angle spread
    else g.connect(to);
    if (opt.rev) { var s = ctx.createGain(); s.gain.value = opt.rev; g.connect(s); s.connect(tr.rev); }
  }
  function vibrato(tr) {                                                  // one LFO per track: rate ~PHI^0 Hz (pump-nudged), depth from tension, eased in
    try { var l = ctx.createOscillator(), d = ctx.createGain(), t = ctx.currentTime, u = tr.u == null ? IPH : tr.u;
      l.frequency.value = Math.pow(PHI, (u - 1 / 2) * IPH); d.gain.setValueAtTime(0, t); d.gain.setTargetAtTime(CENT * Math.pow(PHI, -4) * (IPH + (1 - u) * IPH), t, PHI);   // phi: PHI^-4 semitone x tension, eased over PHI s
      l.connect(d); l.start(t); tr.vib = d; tr.lfo = l; } catch (e) {}
  }
  // CHIP GRADIENT (Danny 16:53 AWST 26 Oct: 'less electronic gaming and more organic ... a little bit of computer game sound every now
  // and again ... come and go faster and less often'). chip(tr) in 0..1 is the share of chiptune timbre (square/pulse leads, bass and
  // arpeggio blips, bit-crush) right now: a fast pump pair (periods PHI^PHI.. s) raised to PHI^(PHI + s + 1 - u), so it peaks briefly and
  // rarely, rarer still as sophistication s rises and energy u falls. Each note draws against it on the golden sequence (no rng use);
  // a note that misses takes the organic voice: filtered, detuned saw with a breath transient (js/dj-extras.js reed) or a plucked one.
  var chipP = null;
  function chip(tr) {
    var P = window.PhiPumps; if (!chipP) chipP = P && P.node ? P.node('dj:chip', 2, PHI, IPH, P.page, 7) : { modes: function (t) { return Math.sin(2 * Math.PI * t / Math.pow(PHI, PHI)); } };   // phi: period PHI^PHI s
    tr = tr && tr.tk || tr; var now = P && P.now ? P.now() : ctx ? ctx.currentTime : 0, x = (1 + clamp(chipP.modes(now), -1, 1)) / 2;
    var s = tr && tr.s != null ? tr.s : IPH, u = tr && tr.u != null ? tr.u : IPH; return Math.pow(x, Math.pow(PHI, PHI + s + 1 - u));
  }
  function chipNote(tr) { tr = tr && tr.tk || tr; return frac(((tr.step || 0) + 1) * IPH + (tr.seed | 0) * IPH * IPH) < chip(tr); }   // phi: golden-sequence draw
  function wv(tr, w) { return w === 'square' && !chipNote(tr) ? 'sawtooth' : w; }   // square waves only while the chip share lets them through
  var INST = {
    pad:   function (tr, f, t, d, v) { var w0 = wv(tr, tr.g.wave || 'sine'); voice(tr, pwave(w0, tr.s) || w0, f, t, d, v * 0.10, { a: d * 0.35, hold: d * 0.6, rel: d * 0.25, cut: tr.g.cut, det: 9, rev: 0.8 }); },
    pluck: function (tr, f, t, d, v) { voice(tr, wv(tr, tr.g.wave || 'triangle'), f, t, d, v * 0.16, { a: 0.003, hold: 0.01, rel: 0.22, cut: tr.g.cut * PHI, sweep: 0.08, rev: 0.4 }); },
    bass:  function (tr, f, t, d, v) { if (tr.g.bwave === 'piano') return (INST.piano || INST.pluck)(tr, f, t, d, v * 1.2);
                                       var bw = wv(tr, tr.g.bwave); voice(tr, bw, f, t, d, v * (tr.g.bwave === 'sine' ? 0.22 : 0.16), { a: 0.006, hold: d * (bw === 'square' ? IPH : 0.8), rel: 0.08, cut: tr.g.cut * IPH * (bw !== tr.g.bwave ? IPH : 1) }); }   // phi: the organic bass a rung darker
  };
  // ---------- a track: one generated piece (genre + BPM + seed) ----------
  // KEY TRAVEL (MIDI Bot transitions design #2; Danny 16:30 AWST 26 Oct: 'a gradient really ... on a dial', 'top of the dial can jump
  // further'): the incoming key is drawn from all twelve roots around the genre's own, weighted by its circle-of-fifths distance d from the
  // outgoing key signature, w = PHI^(-PHI^2 d / D), D = PHI^(PHI^2 s) with s the outgoing track's sophistication: plain tracks stay in the
  // same or a neighbouring key signature, sophisticated ones travel further. The seed picks within the weights.
  // cite: circle of fifths, closely related keys, harmonic mixing (en.wikipedia.org/wiki/Circle_of_fifths, /Closely_related_key, /Harmonic_mixing)
  function keySig(sc, root) { var best = 0, bn = -1; for (var t = 0; t < 12; t++) { var n = 0; sc.forEach(function (x) { if (SCALES.major.indexOf((((root + x - t) % 12) + 12) % 12) >= 0) n++; }); if (n > bn) { bn = n; best = t; } } return best; }   // unit: 12 pitch classes; the major scale sharing most notes
  function fifths(a, b) { var d = ((((a - b) * 7) % 12) + 12) % 12; return Math.min(d, 12 - d); }   // unit: 7 semitones per fifth, 12 keys round the circle
  function travel(sc, base, prev, pick) {
    var D = Math.pow(PHI, PHI * PHI * clamp(prev.s == null ? IPH : prev.s, 0, 1)), ks = keySig(prev.sc, prev.root), opt = [], sum = 0;
    for (var o = -6; o < 6; o++) { var w = Math.pow(PHI, -PHI * PHI * fifths(keySig(sc, base + o), ks) / D); opt.push([o, w]); sum += w; }   // unit: the twelve roots around the genre's own
    var x = pick * sum; for (var i = 0; i < opt.length; i++) { x -= opt[i][1]; if (x <= 0) return base + opt[i][0]; } return base;
  }
  function makeTrack(genre, bpm, seed, prev, root0) {
    var g = GEN[genre], r = rng(seed), sc = SCALES[g.scale], root = g.root + [-2, 0, 0, 2, 3, -3][Math.floor(r() * 6)];
    if (typeof root0 === 'number' && isFinite(root0)) root = root0; else if (prev && prev.sc) root = travel(sc, g.root, prev, frac((seed | 0) * IPH));   // restored key, or travel from the outgoing one
    var pi0 = Math.floor(r() * g.progs.length), prog = g.progs[pi0], progB = g.progs[(pi0 + 1) % g.progs.length], mel = [], deg = 7 + Math.floor(r() * 3);   // B section: the genre's other progression
    for (var i = 0; i < 32; i++) {                                // a 2-bar motif, repeated with small variations
      var strong = i % 4 === 0, p = (strong ? g.mel * 2.2 : (i % 2 ? g.mel * 0.6 : g.mel)) * Math.pow(PHI, M.density);   // mix: density rung
      if (r() < p) { deg = clamp(deg + [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(r() * 8)], 4, 13); mel.push(deg); } else mel.push(null);
    }
    // CALL AND RESPONSE (MIDI Bot directions): the motif is 64 steps; the answer is the call inverted around its first note
    var piv = mel.filter(function (x) { return x != null; })[0] || deg; for (var i2 = 0; i2 < 32; i2++) mel.push(mel[i2] == null ? null : clamp(2 * piv - mel[i2], 2, 16));   // unit: scale-degree range
    var u = energy(), gx = Object.create(g); gx.cut = mtof(root + 12) * Math.pow(PHI, PHI * PHI + 2 * u - 1);   // phi: brightness = PHI^(PHI^2 +- 1 rung) over the root (rule 8: no fixed cut)
    var out = ctx.createGain(); out.gain.value = 0.0001; out.connect(bus);
    var wet = ctx.createGain(); wet.gain.value = 0.0001; wet.connect(revIn);                    // reverb send, faded with the track
    var rv = ctx.createGain(); rv.gain.value = g.rev; rv.connect(wet);
    var xo = ctx.createGain(); xo.gain.value = XL; xo.connect(out);                                // extras (leads, drums) glide in here
    var P = window.PhiPumps, node = !P || !M.route ? null : M.route === 1 ? P.page : P.logo('dad');   // mix: which pump-tree node drives the dynamics
    var lay = function (to) { var n = ctx.createGain(); n.gain.value = 1; n.connect(to); return { g: gx, out: n, rev: rv }; };   // energy-arc layers (setTarget ramps, never gates)
    var L = { drums: lay(xo), lead: lay(xo), bass: lay(out), pad: lay(out) };
    var T = { dr: M.donor ? GEN[M.donor] : g, shift: M.shift, node: node, genre: genre, bpm: bpm, seed: seed, g: gx, sc: sc, root: root, prog: prog, progB: progB, mel: mel, r: r, out: out, wet: wet, rev: rv, xo: xo, x: { g: gx, out: xo, rev: rv }, L: L, u: u, cut: gx.cut, lastCh: null, step: 0, next: ctx.currentTime + Math.pow(PHI, -6), born: Date.now() }; T.s = soph(T); vibrato(T); T.x.tk = T; Object.keys(L).forEach(function (k) { L[k].tk = T; }); return T;   // phi: first step PHI^-6 s out
  }
  // ---------- richer DJ (Danny 14:42 AWST 26 Oct; MIDI Bot directions top 3) ----------
  // ENERGY ARC: a = track age / track length (analytic from tr.born, so continuity keeps the place). e(a) rises to a peak at
  // a = PHI^-1, breaks down to PHI^-2 by PHI^-1 + PHI^-3, then lifts a little into the outro. Drums, lead and bass follow e;
  // pads follow PHI^-2 + (1 - e) x PHI (so the peak keeps a little harmony). Each bar glides there (setTarget, tau = a bar x PHI^-1).
  function energy() { var p = pumps(); return 1 / (1 + Math.pow(PHI, p.tp + p.wp + p.up + p.mp)); }   // pump energy u in (0,1), shared with js/dj-fx.js
  function arc(a) {
    var lo = IPH * IPH, pk = IPH, bd = IPH + Math.pow(PHI, -3), q = Math.PI / 2, s2 = function (x) { var y = Math.sin(q * clamp(x, 0, 1)); return y * y; };
    if (a <= pk) return lo + (1 - lo) * s2(a / pk);
    if (a <= bd) return lo + (1 - lo) * (1 - s2((a - pk) / (bd - pk)));
    return lo + (IPH - lo) * s2((a - bd) / (1 - bd));
  }
  function ageOf(tr) { return clamp((Date.now() - tr.born) / MS / (tr.trackLen || compute().trackLen), 0, 1); }
  function shape(tr, t, barLen) {                                         // once a bar: glide the layers to the arc
    var a = ageOf(tr), e = arc(a), tau = barLen * IPH; tr.e = e; tr.bd = a > IPH && e < IPH;
    tr.L.drums.out.gain.setTargetAtTime(e, t, tau); tr.L.lead.out.gain.setTargetAtTime(e, t, tau); tr.L.bass.out.gain.setTargetAtTime(tr.noBass ? 0 : Math.sqrt(e), t, tau);
    tr.L.pad.out.gain.setTargetAtTime(clamp(IPH * IPH + (1 - e) * PHI, 0, 1), t, tau);
  }
  // VOICE LEADING + EXTENSIONS: 3 + a pump-ratio count of stacked thirds (triad, 7th, 9th); of the inversions (+-12 per note) the one
  // that moves least from the last chord is played, held near the root-position register.
  function voiced(tr, deg) {
    var x = clamp((1 - tr.u) + (tr.g.sev ? IPH : 0) + (tr.bd ? IPH * IPH : 0), 0, 1), n = 3 + Math.round(2 * x);   // unit: a triad plus up to two more thirds
    var base = chordNotes(tr.sc, tr.root, deg, 0, n), mean = function (a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; }, m0 = mean(base);
    if (!tr.lastCh) return (tr.lastCh = base);
    var best = base, bc = Infinity, prev = tr.lastCh.slice().sort(function (p, q) { return p - q; });
    for (var k = 0; k < n; k++) for (var o = -1; o <= 1; o++) {
      var c = base.map(function (v, i) { return v + 12 * ((i < k ? 1 : 0) + o); }).sort(function (p, q) { return p - q; });   // unit: octave
      var cost = c.reduce(function (s, v) { var d = Infinity; prev.forEach(function (w) { d = Math.min(d, Math.abs(v - w)); }); return s + d; }, 0) + Math.abs(mean(c) - m0) * IPH;
      if (cost < bc) { bc = cost; best = c; }
    }
    return (tr.lastCh = best);
  }
  // GOLDEN SWING + VELOCITY LADDER: long:short = PHI:1 at full drive (sw = PHI^-3 x drive, drive = pump energy); accents
  // PHI^-(metric depth): downbeat 1, beat PHI^-1, eighth PHI^-2, sixteenth PHI^-3, times the routed pump dynamics.
  function depth(s16) { return s16 % 16 === 0 ? 0 : s16 % SPB === 0 ? 1 : s16 % 2 === 0 ? 2 : 3; }   // unit: metric depth in a 4/4 bar of sixteenths
  function vl(s16, dyn) { return Math.pow(PHI, -depth(s16)) * (dyn || 1); }
  // FORM (MIDI Bot directions, approved Danny 14:48): the B section (the genre's other progression) runs from PHI^-2 of the track
  // through the peak to the end of the breakdown; the motif rises a scale degree each phrase (SPB bars) and starts again each section;
  // at the peak (e > 1 - PHI^-3) odd bars may take an axis substitute (root +-3 or +6 semitones, cited: Lendvai's axis system,
  // https://en.wikipedia.org/wiki/Axis_system) and the kick plays the additive 3+3+2 grouping (cited: Bartok, Bulgarian additive metre,
  // https://en.wikipedia.org/wiki/Additive_rhythm_and_divisive_rhythm); the last bar of each phrase gets a fill.
  var AXIS = [3, -3, 6], K332 = [0, 6, 12];                               // cite: axis substitutes (minor third, tritone); 3+3+2 eighths in sixteenths
  function playStep(tr, t) {
    var g = tr.g, st = tr.step, s16 = st % 16, bar = Math.floor(st / 16), dur16 = 60 / tr.bpm / 4, v;
    var a0 = ageOf(tr), secB = a0 >= IPH * IPH && a0 < IPH + Math.pow(PHI, -3), pr = secB && tr.progB ? tr.progB : tr.prog;
    if (s16 === 0 && secB !== tr.secB) { tr.secB = secB; tr.secBar = bar; }
    var deg = pr[Math.floor(bar / g.bars) % pr.length], barLen = dur16 * 16 * g.bars, first = s16 === 0 && bar % g.bars === 0;
    if (s16 === 0 || tr.e == null) shape(tr, t, barLen);
    var peak = tr.e > 1 - Math.pow(PHI, -3), phr = bar - (tr.secBar || 0), fill = (phr % SPB) === SPB - 1, rise = Math.floor(phr / SPB) % SPB;   // unit: phrase = SPB bars, rise cycles through SPB degrees
    if (first) tr.ax = peak && !tr.bridge && !tr.leaving && bar % 2 && tr.r() < IPH ? AXIS[Math.floor(tr.r() * AXIS.length)] : 0;
    var dyn = 1; if (tr.node) try { dyn = tr.node.out(); } catch (e) {}      // mix: routed pump-tree dynamics (around 1)
    var bx = tr.bx, bs = null; if (bx && t >= bx.start - dur16 / 2) bs = t >= bx.drop - dur16 / 2 ? bx.home : bx.segs[clamp(Math.floor((t - bx.start + dur16 / 2) / bx.bar), 0, bx.segs.length - 1)];   // the bridge owns the harmony
    if (bs && bs !== tr.bxSeg) { tr.bxSeg = bs; first = true; tr.ch = voicePcs(tr, bs.pcs); }
    var ch = bs ? tr.ch : first || !tr.ch ? (tr.ch = voiced(tr, deg).map(function (n) { return n + (tr.ax || 0); })) : tr.ch, root0 = bs ? nearRoot(tr, bs.root) : chordNotes(tr.sc, tr.root, deg, 0)[0] + (tr.ax || 0);
    // chords
    if (g.chords === 'pad' && first) ch.forEach(function (n) { pl('chords', INST.pad, tr.L.pad, n + 12, t, barLen, 1); });
    if ((g.chords === 'strum' || g.chords === 'stab' || g.chords === 'ep') && g.steps.indexOf(s16) >= 0)
      ch.forEach(function (n, k) { var inst = (g.chords === 'ep' ? INST.ep : g.chords === 'stab' ? INST.stab : null) || INST.pluck; pl('chords', inst, tr, n + 12, t + (g.chords === 'strum' ? k * dur16 * Math.pow(PHI, -4) : 0), dur16 * (g.chords === 'ep' ? 5 : 2), vl(s16, dyn)); });   // phi: strum spread PHI^-4 of a sixteenth
    if (g.chords === 'arp' && s16 % 2 === 0) { var an = ch.concat([ch[0] + 12]); pl('chords', INST.piano || INST.pluck, tr, an[(s16 / 2) % an.length] + 12, t, dur16 * 2, vl(s16, dyn)); }
    if (g.arp && INST.square) { var a2 = ch.concat([ch[0] + 12, ch[1] + 12]), cb = chipNote(tr); pl('chords', cb ? INST.square : INST.pluck, tr.x, a2[s16 % a2.length] + 24, t, dur16 * (cb ? IPH * IPH : IPH), cb ? 0.45 : IPH * IPH); }   // phi: blips short, the plucked ones a little longer and softer
    if (g.ost && s16 % 2 === 0 && INST.stab) pl('chords', INST.stab, tr.x, ch[s16 % 4 === 0 ? 0 : 2] + 12, t, dur16 * 1.6, 0.7);
    // bass
    var bn = root0 - 12;
    if (g.bass === 'hold' && first) pl('bass', INST.bass, tr.L.bass, bn, t, barLen * 0.9, vl(s16, dyn));
    if (g.bass === 'roots' && (s16 === 0 || s16 === 8)) pl('bass', INST.bass, tr.L.bass, s16 ? ch[2 % ch.length] - 12 : bn, t, dur16 * 6, vl(s16, dyn));
    if (g.bass === 'walk' && [0, 3, 6, 8, 11, 14].indexOf(s16) >= 0) pl('bass', INST.bass, tr.L.bass, s16 === 0 ? bn : ch[[0, 1, 2, 1, 2, 0][[0, 3, 6, 8, 11, 14].indexOf(s16)]] - 12, t, dur16 * 2, vl(s16, dyn));
    if (g.bass === 'eighths' && s16 % 2 === 0) pl('bass', INST.bass, tr.L.bass, bn, t, dur16 * 1.5, vl(s16, dyn));
    if (g.bass === 'octave' && s16 % 2 === 0) pl('bass', INST.bass, tr.L.bass, bn + (s16 % 4 ? 12 : 0), t, dur16 * 1.5, vl(s16, dyn));
    // melody (Dad's tune): motif from the seed, a note shifted now and then
    var md = tr.mel[st % tr.mel.length]; if (md != null) md += rise; var lsc = tr.bd ? (g.scale === 'lydian' || tr.genre === 'cinematic' ? COLOUR.whole : g.scale === 'major' ? COLOUR.penta : COLOUR.penta_m) : tr.sc, ln = lsc.length;
    if (md != null && INST[g.lead]) { if (tr.r() < 0.12) md += tr.r() < 0.5 ? 1 : -1; var li = g.lead === 'square' && !chipNote(tr) ? (INST.reed || INST.pluck) : INST[g.lead]; pl('lead', li, tr.L.lead, tr.root + lsc[md % ln] + 12 * Math.floor(md / ln) + 12, t, dur16 * (g.lead === 'horn' || g.lead === 'bell' ? 6 : 2), 0.8); }
    // drums
    if (X && X.hit && peak && (tr.dr || g).kick && K332.indexOf(s16) >= 0) { var kv = vl(s16, dyn); X.hit(tr.L.drums, 'kick', t, kv); rec('drums', GM.kick, t, dur16, kv * gAt(tr, t)); }   // 3+3+2 kick at the peak
    if (X && X.hit && fill && ((tr.dr || g).snare || (tr.dr || g).tom) && s16 >= 16 - SPB) { var fv = Math.pow(PHI, -(16 - s16)) * PHI * (dyn || 1), fk = s16 % 2 ? 'snare' : 'tom'; X.hit(tr.L.drums, fk, t, fv); rec('drums', GM[fk], t, dur16, fv * gAt(tr, t)); }   // phi: fill rising a rung per sixteenth on the last beat
    if (X && X.hit) ['kick', 'snare', 'hat', 'shaker', 'tom'].forEach(function (k) { if (k === 'kick' && peak) return; if (fill && s16 >= 16 - SPB && (k === 'snare' || k === 'tom')) return; var pat = (tr.dr || g)[k]; if (pat && (v = pat[(s16 + (tr.shift || 0)) % pat.length]) !== '.') { var hv = vl(s16, dyn) * (v === 'x' ? 1 : IPH); X.hit(tr.L.drums, k, t, hv); rec('drums', GM[k], t, dur16, hv * gAt(tr, t)); } });   // drums fade with the crossfade too (MIDI Bot review);   // phi: soft hits a rung down
    if (s16 % 4 === 0) beat(t, s16 === 0);
  }
  // ---------- note log for the MIDI export (Danny 14:48 AWST 26 Oct): the last minute of what played, pruned by wall time ----------
  // Each entry is [wall ms, part, MIDI note, velocity 0..1, seconds]; at most a minute of steps, a few KB. js/dj-midi.js writes it on tap.
  var NL = [], ccOld = {}, WIN = SPM * MS;                                            // unit: one minute
  var GM = { kick: 36, snare: 38, hat: 42, shaker: 82, tom: 45 };       // cite: General MIDI Level 1 percussion key map (channel 10)
  function rec(part, m, t, d, v) {
    var w = Date.now() + (t - ctx.currentTime) * MS; NL.push([w, part, m, v, d]);
    while (NL.length && NL[0][0] < w - WIN - SPM * MS / SPB) { var ex = NL.shift(); if (ex[1] === 'cc') ccOld[ex[2]] = ex; }   // keep a little over a minute (look-ahead slack)
  }
  function recCC(n, v) { NL.push([Date.now(), 'cc', n, clamp(v, 0, 1), 0]); }   // transition sweeps for the .mid (controller n, value 0..1)
  function pl(part, inst, tr, m, t, d, v) { inst(tr, mtof(m), t, d, v); rec(part, m, t, d, v * gAt(tr.tk || tr, t)); }   // logged at the track's crossfade level
  var TL = [];                                                            // tempo map for the export: [wall ms, bpm] when a track takes over (crossfade midpoint)
  function stepLen(tr) { var d = SPM / tr.bpm / SPB, sw = Math.pow(PHI, -3) * tr.u; return tr.step % 2 ? d * (1 - sw) : d * (1 + sw); }   // phi: golden swing x drive

  // ---------- scheduler (look-ahead) ----------
  var tracks = [], sched = 0;
  function tick() {
    if (!ctx) return;
    var horizon = ctx.currentTime + Math.pow(PHI, document.hidden ? 3 : -4);   // phi: look PHI^-4 s ahead, PHI^3 s while hidden (throttled timers)
    tracks.forEach(function (tr) {
      if (tr.next < ctx.currentTime - 0.5) tr.next = ctx.currentTime + 0.02;   // resumed after being hidden
      while (tr.next < horizon && !tr.dead) { if (tr.step % 2 === 0) tr.ga = [tr.next, tr.step]; playStep(tr, tr.next); tr.next += stepLen(tr); tr.step++; }   // ga: audio-clock anchor on an even (unswung) step
    });
  }
  function curve(up) { var n = 64, a = new Float32Array(n); for (var i = 0; i < n; i++) { var x = i / (n - 1); a[i] = Math.max(0.0001, up ? Math.sin(x * Math.PI / 2) : Math.cos(x * Math.PI / 2)); } return a; }
  function fadeGain(gn, up, t, len) { try { gn.gain.cancelScheduledValues(t); gn.gain.setValueCurveAtTime(curve(up), t, len); } catch (e) { gn.gain.setTargetAtTime(up ? 1 : 0.0001, t, len / 3); } }

  function fadeTrack(tr, up, t, len) { fadeGain(tr.out, up, t, len); fadeGain(tr.wet, up, t, len); tr.fd = { t: t, len: len, up: up }; }   // the plan, so the export reads the level at note time
  // MIDI Bot review: the crossfade level when the note sounds (the same sine/cosine curve as fadeGain), not when it was scheduled (up to PHI^3 s earlier in a hidden tab)
  function gAt(tr, t) { var f = tr && tr.fd; if (!f) return tr && tr.out ? Math.min(1, tr.out.gain.value) : 1; var x = clamp((t - f.t) / f.len, 0, 1); return f.up ? Math.sin(x * Math.PI / 2) : Math.cos(x * Math.PI / 2); }
  // ---------- the DJ ----------
  var playing = false, cur = null, fadingUntil = 0, clock = 0, T0 = Date.now(), lastMood = null, genreFlip = 0, setBm = false;
  function startTrack(c, fade, sp, ox) {
    var pre = !sp && ox && ox.pre && GEN[ox.pre.genre] ? ox.pre : null;   // the bridge already chose the next genre, seed and key
    var gs = c.genres, genre = sp && GEN[sp.genre] ? sp.genre : pre ? (genreFlip++, pre.genre) : gs[(genreFlip++) % gs.length], t = Math.max(ox && ox.at || 0, ctx.currentTime + Math.pow(PHI, -6));   // phi: fade starts PHI^-6 s out (or at the transition's drop)
    var prev = tracks.filter(function (x) { return !x.dead && !x.leaving; })[0];
    var tr = makeTrack(genre, sp && sp.bpm > 0 ? sp.bpm : c.bpm, sp && isFinite(sp.seed) ? sp.seed : pre ? pre.seed : (Math.random() * SEEDS) | 0, prev, sp ? sp.root : pre ? pre.root : null);
    if (sp) { tr.born = sp.born; tr.step = stepsIn((Date.now() - sp.born) / MS, tr.bpm); }
    if (ox && ox.at) { tr.next = t; if (!sp) tr.born = Date.now() + (t - ctx.currentTime) * MS; }   // the new track's first bar (and its arc) lands on the drop   // pick up the arrangement where wall-clock time has it
    var old = tracks.filter(function (x) { return !x.dead && !x.leaving; }), len = fade || c.fade;
    if (old[0] && old[0].lastCh) tr.lastCh = old[0].lastCh.slice();      // the first chord is voiced from the outgoing track's last one
    fadeTrack(tr, true, t, len);
    old.forEach(function (o) { o.leaving = true; fadeTrack(o, false, t, len); if (ox && ox.swap) { o.noBass = true; o.L.bass.out.gain.cancelScheduledValues(t); o.L.bass.out.gain.setTargetAtTime(0, t, Math.pow(PHI, -6)); }   // bass swap at the drop
      setTimeout(function () { kill(o); }, (t - ctx.currentTime + len) * 1000 + 300); });
    TL.push([Date.now() + (t - ctx.currentTime) * MS + len * MS / 2, tr.bpm]); while (TL.length > 1 && TL[1][0] < Date.now() - WIN) TL.shift();   // midpoint of the fade from where it starts (the drop on a transition), not the call
    tracks.push(tr); fadingUntil = Date.now() + len * 1000; lastMood = c.p.mood;
    return tr;
  }
  function kill(tr) { tr.dead = true; tracks = tracks.filter(function (x) { return x !== tr; }); setTimeout(function () { try { tr.out.disconnect(); tr.wet.disconnect(); tr.rev.disconnect(); if (tr.lfo) tr.lfo.stop(); } catch (e) {} }, 400); }
  function applyVol(c, len) { if (bus) bus.gain.setTargetAtTime(c.vol, ctx.currentTime, Math.max(0.05, len / 3)); }
  // EVERY CHANGE ON THE BAR GRID (MIDI Bot transitions design, Danny 16:30 AWST 26 Oct): automatic radio changes and dial changes go
  // through the same bar-grid planner as the shuffle button (js/dj-fx.js transition(), its sweeps scaled by depth); before the effects
  // chain has loaded, the change waits for the live track's next bar line. The outgoing track stops taking axis substitutes once a change
  // is planned (tr.bridge), and the incoming track voices its first chord from the outgoing track's last one (lastCh, see voiced()).
  var pendX = false, lastBx = null;
  // THE BRIDGE (MIDI Bot transitions design #3: pivot / dominant / home). When a change is planned, the next track's genre, seed, key and
  // first chord are drawn at once (pre), so over the bars to the drop the outgoing track plays a chord both keys share (preferring ii, IV,
  // vi of the new key), then the dominant seventh of the landing chord, and after the drop the landing chord itself while it fades.
  // One bar, or no shared chord: the landing chord's tones the old key also has, held as a pedal (common-tone modulation).
  // cite: common chord / pivot modulation, common-tone modulation, dominant seventh resolution
  // (en.wikipedia.org/wiki/Common_chord_(music), /Modulation_(music), /Dominant_seventh_chord)
  function pc(n) { return ((n % 12) + 12) % 12; }                          // unit: 12 pitch classes
  function nearRoot(tr, p) { var r = tr.root + pc(p - tr.root); return r - tr.root > 6 ? r - 12 : r; }   // unit: nearest within a half octave
  function voicePcs(tr, pcs) {                                            // each pitch class at the octave nearest the last chord's centre
    var ref = tr.lastCh && tr.lastCh.length ? tr.lastCh.reduce(function (a, b) { return a + b; }, 0) / tr.lastCh.length : tr.root + 7;   // unit: a fifth above the root
    return (tr.lastCh = pcs.map(function (p) { var n = ref + pc(p - ref); return n - ref > 6 ? n - 12 : n; }).sort(function (a, b) { return a - b; }));   // unit: half octave
  }
  function preProg(genre, seed) { var r = rng(seed), g = GEN[genre]; r(); return g.progs[Math.floor(r() * g.progs.length)]; }   // makeTrack's own draw order
  function preNext(live, mix) {
    var c = compute(), gs = c.genres, fl = genreFlip + (mix != null ? Math.floor(withKnobs(genome(mix)).flip * SPB) : 0), genre = gs[fl % gs.length], g = GEN[genre];
    var seed = (Math.random() * SEEDS) | 0, root = live && live.sc ? travel(SCALES[g.scale], g.root, live, frac(seed * IPH)) : g.root;
    return { genre: genre, seed: seed, root: root, prog: preProg(genre, seed) };
  }
  function planBridge(live, pre, start, drop) {
    if (!live || !pre) return; var SCn = SCALES[GEN[pre.genre].scale], dur = SPM / live.bpm * SPB * live.g.bars;   // unit: a bar of the live track
    var home = chordNotes(SCn, pre.root, pre.prog[0], 0), hr = pc(home[0]), old = live.sc.map(function (x) { return pc(live.root + x); });
    var tri = function (d) { return chordNotes(SCn, pre.root, d, 0).map(pc); }, inOld = function (ps) { return ps.every(function (p) { return old.indexOf(p) >= 0; }); };
    var piv = null; [1, 3, 5, 0, 4, 2].some(function (d) { var t = tri(d); if (inOld(t) && pc(t[0]) !== hr) { piv = { pcs: t, root: t[0] }; return true; } return false; });   // unit: scale degrees ii, IV, vi, I, V, iii
    var V7 = { pcs: [7, 11, 2, 5].map(function (x) { return pc(hr + x); }), root: pc(hr + 7) };   // cite: dominant seventh on the fifth above the landing root
    var ped = home.map(pc).filter(function (p) { return old.indexOf(p) >= 0; }); if (!ped.length) ped = [hr];
    var n = Math.max(0, Math.round((drop - start) / dur)), segs = !piv || n < 2 ? [{ pcs: ped, root: ped[0] }] : [];
    for (var i = 0; piv && n >= 2 && i < n; i++) segs.push(i < n - 1 ? piv : V7);
    lastBx = live.bx = { start: start, drop: drop, bar: dur, segs: segs, home: { pcs: home.map(pc), root: hr }, pre: pre, plan: segs.map(function (x) { return x === piv ? 'pivot' : x === V7 ? 'V7' : 'pedal'; }) };
  }
  // LANDING WAIT (Danny 16:30 'adjusted depending on mood, time of day ... they all sweep'): how long an automatic change takes to land,
  // 0 = the next bar .. 1 = a phrase (dj-fx BARS 1..8), from calm pumps and sophistication: calm, sophisticated tracks take their time.
  function waitAuto() { var tr = tracks.filter(function (x) { return !x.leaving && !x.dead; })[0], u = energy(), s = tr && tr.s != null ? tr.s : IPH;
    return clamp(IPH * (1 - u) + IPH * IPH * s, 0, 1); }
  function routed(fn, live) {
    live = live || tracks.filter(function (x) { return !x.leaving && !x.dead; })[0]; if (!live || !playing || !ctx) return false;
    var F = window.DadAutoDJ && DadAutoDJ.fx, pre = preNext(live), go = function (ox) { if (!pendX || !playing) return; pendX = false; ox = ox || {}; ox.pre = pre; fn(ox); };
    pendX = true; live.bridge = true;
    if (F && F.transition && F.transition(go, { depth: depthAuto(), wait: waitAuto() })) { var L = F.lastTransition; if (L) planBridge(live, pre, L.start, L.drop); return true; }
    var G = grid(); if (!G) { pendX = false; return false; }
    var S16 = SPB * SPB, k = Math.ceil(G.step / S16) * S16, at = G.t + (k - G.step) * G.d16;
    while (at < ctx.currentTime + Math.pow(PHI, -2)) { at += G.d16 * S16; }   // phi: the next bar line at least PHI^-2 s out
    planBridge(live, pre, at, at);
    setTimeout(function () { go({ at: at, fade: Math.max(G.d16 * S16, compute().fade * IPH), swap: true }); }, Math.max(0, (at - ctx.currentTime - Math.pow(PHI, -2)) * MS));   // phi: a bar or PHI^-1 of the mood's fade
    return true;
  }
  // how much of the transition styling an automatic or dial change carries: a gradient on the pumps (energy u) and the
  // sophistication of the live track, PHI^-2 .. 1 (calm, plain tracks fade with little sweep; energetic, sophisticated ones get it all)
  function depthAuto() { var tr = tracks.filter(function (x) { return !x.leaving && !x.dead; })[0], u = energy(), s = tr && tr.s != null ? tr.s : IPH;
    return Math.pow(PHI, -2 * (1 - (u + s) / 2)); }
  function boundary() {
    var c = compute();
    if (Date.now() < fadingUntil) { schedule(c.fade); paint(c); return; }   // never mid-fade
    if (playing && ctx) {
      var tr = tracks.filter(function (x) { return !x.leaving && !x.dead; })[0];
      var changed = !tr || c.genres.indexOf(tr.genre) < 0 || Math.abs(tr.bpm - c.bpm) > 0.5 || c.p.mood !== lastMood;
      var old = tr && (Date.now() - tr.born) / 1000 >= tr.trackLen;
      if ((changed || old) && !pendX) { if (!routed(function (ox) { var n = startTrack(compute(), ox && ox.fade, null, ox); n.trackLen = compute().trackLen; cur = compute(); cur.genre = n.genre; paint(cur); }, tr)) { tr = startTrack(c); tr.trackLen = c.trackLen; } }
      applyVol(c, c.fade); cur = c; if (tr) cur.genre = tr.genre;
    } else { cur = c; }
    paint(c); schedule(c.fade);
  }
  function schedule(period) { clearTimeout(clock); var P = period * 1000, now = Date.now(); clock = setTimeout(boundary, P - ((now - T0) % P) + 5); }
  function nextIn() { var c = compute(), P = c.fade * 1000; return (P - ((Date.now() - T0) % P)) / 1000; }

  // ---------- continuity: arrangement position from wall-clock time ----------
  var pend = null, stalled = false, held = null, GA = 0x9E3779B9, SEEDS = 4294967296;   // phi: golden-ratio hash (2^32 / PHI) steps the seed per skipped track; unit: 2^32 seeds
  function stepsIn(sec, bpm) { return Math.max(0, Math.floor(sec * bpm / SPM * SPB)); }
  function spec() { var tr = tracks.filter(function (x) { return !x.leaving && !x.dead; })[0];
    return tr ? { genre: tr.genre, bpm: tr.bpm, seed: tr.seed, born: tr.born, len: tr.trackLen, root: tr.root } : (pend || held); }
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
    setTimeout(function () { loadX(); loadFX(); }, Math.pow(PHI, 2) * MS);                              // phi: extras after the first sound has begun (PHI^2 s)
    if (!sched) sched = setInterval(tick, 25); tick();
    if (!document.documentElement.hasAttribute('data-bm')) { document.documentElement.setAttribute('data-bm', 'playing'); setBm = true; }  // the generated cue layer ducks to 30% under the music
    paint(c); schedule(c.fade);
  }
  function stop() {
    held = spec(); playing = false; pend = null; stalled = false; disarm();
    setTimeout(function () { if (!playing) elStop(); }, PHI * MS); session('paused');
    pendX = false;
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
  function rebuild() {                                                    // js/rhythm-continuity.js: a closed or stuck context gets a fresh graph at the same track position (dry path)
    var sp = spec(), was = playing, old = ctx; tracks.forEach(function (tr) { tr.dead = true; }); tracks = [];
    if (el) { try { el.pause(); el.srcObject = null; } catch (e) {} } el = null; direct = true; fxC = null; ctx = null; playing = false; stalled = false; pend = null; disarm();
    X = null; XL = 0; xReq = false; if (chips) chips.textContent = '';    // js/dj-extras.js holds the old context: it reloads onto the new one after the first sound
    try { if (old && old.state !== 'closed') old.close(); } catch (e) {}
    if (was) start(sp); return ctx;
  }
  function glide(ox) {                                                   // a change glides in over a PHI^3 s crossfade (rule 6), never a cut (or the transition's own fade)
    if (!ox && playing && ctx && (pendX || routed(function (o) { glide(o || { fade: Math.pow(PHI, 3) }); }))) { paint(compute()); save(); return; }   // dial changes wait for the bar grid too (a change already planned picks them up)
    var c = compute();
    if (playing && ctx) { var tr = startTrack(c, ox && ox.fade || Math.pow(PHI, 3), null, ox); tr.trackLen = c.trackLen; applyVol(c, Math.pow(PHI, 3)); cur = c; cur.genre = tr.genre; }
    else cur = c;
    paint(c); save();
  }
  function remix(seed, ox) {
    if (seed == null) Object.keys(kseed).forEach(function (k) { delete kseed[k]; });   // the default mix also clears the knob seeds
    mixSeed = seed; M = withKnobs(genome(seed)); if (seed != null) genreFlip += Math.floor(M.flip * SPB);
    glide(ox);
    if (mixBtn) { mixBtn.classList.remove('is-mixing'); void mixBtn.offsetWidth; mixBtn.classList.add('is-mixing');
      mixBtn.setAttribute('aria-label', 'Random pump mix (now ' + mixName() + '; hold for the default mix)'); }
  }
  function reroll(k) {                                                    // one knob: a random rung (nudge) + a fresh seed for its coupling weights
    var L = LADDER[k]; if (!L) return; var sd = Math.floor(Math.random() * SEEDS), li = L.indexOf(liveOf(k)); if (li < 0) li = L.indexOf('cloud');
    nudge[k] = Math.floor(frac(sd * IPH) * L.length) - li; kseed[k] = sd; M = withKnobs(genome(mixSeed)); glide(); syncChips();
  }
  function mixName() { return mixSeed == null ? 'default mix' : 'mix ' + mixSeed.toString(36).toUpperCase(); }   // unit: base-36 short name
  function nextMix() { remix(mixSeed == null ? Math.floor(Date.now() / MS) : mixSeed + 1); }
  // TRANSITION (Danny 15:44 AWST 26 Oct): the 🔀 button mixes into the new mix like a DJ. js/dj-fx.js plans it on the bar grid (style knob),
  // runs the sweeps, and calls back just before the drop; the new track starts ON the drop with the style's fade and a bass swap.
  function mixGo() {
    var s = mixSeed == null ? Math.floor(Date.now() / MS) : mixSeed + 1, F = window.DadAutoDJ && DadAutoDJ.fx;
    var live = tracks.filter(function (x) { return !x.leaving && !x.dead; })[0], pre = live ? preNext(live, s) : null;
    if (playing && ctx && F && F.transition) { if (F.transition(function (ox) { if (ox && pre) ox.pre = pre; remix(s, ox); })) { if (live) { live.bridge = true; var L = F.lastTransition; if (L) planBridge(live, pre, L.start, L.drop); } if (mixBtn) { mixBtn.classList.remove('is-mixing'); void mixBtn.offsetWidth; mixBtn.classList.add('is-mixing'); } return; } }
    remix(s);
  }
  var mixBtn = null;
  function wireMix() {
    mixBtn = document.getElementById('dj-mix'); if (!mixBtn) return;
    var held = 0, longDone = false;
    mixBtn.addEventListener('pointerdown', function () { longDone = false; clearTimeout(held); held = setTimeout(function () { longDone = true; remix(null); }, IPH * MS); });   // phi: hold PHI^-1 s
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (n) { mixBtn.addEventListener(n, function () { clearTimeout(held); }); });
    mixBtn.addEventListener('click', function (e) { e.stopPropagation(); if (longDone) { longDone = false; return; } if (e.shiftKey) remix(null); else mixGo(); });
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
  function snapshot() { return { on: playing || !!pend || stalled, nudge: nudge, flip: genreFlip, T0: T0, tr: spec(), mix: mixSeed, k: kRef, ks: kseed }; }
  function catchUp(e, s, mode) {
    if (mode === 'return') { wake(); return; }
    if (!s) return;
    if (s.k > 0 && isFinite(s.k)) kRef = s.k;                             // learned level per unit of nominal volume (a calibration, kept)
    if (s.ks) Object.keys(KP).forEach(function (k) { if (isFinite(s.ks[k])) kseed[k] = s.ks[k]; });   // knob seeds are choices: they carry like the mix
    if (s.mix != null && isFinite(s.mix)) mixSeed = s.mix; M = withKnobs(genome(mixSeed));   // his mix choice carries through reloads and the daily restart
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
    var WHO = (document.documentElement.getAttribute('data-who')||'Dad');   // shown name: Ed on his dashboard (data-who, Danny 15:39 AWST 26 Oct), Dad on Bonnie's pages
    btn.querySelector('.dj-lbl').textContent = !AC ? 'no sound here' : wait ? WHO + '\u2019s DJ \u00B7 tap to resume' : playing ? WHO + '\u2019s DJ on' : WHO + '\u2019s DJ';
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
    wireMix(); wireExport();
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
  // ---------- export button: the last minute as a Standard MIDI File (writer js/dj-midi.js loads on first press) ----------
  var MIDIURL = 'js/dj-midi.js?v=midifix1', midiP = null;
  function midiLib() { if (!midiP) midiP = new Promise(function (ok, no) { if (window.DadMidi) return ok(window.DadMidi); var sc = document.createElement('script'); sc.src = MIDIURL; sc.async = true;
    sc.onload = function () { window.DadMidi ? ok(window.DadMidi) : no(); }; sc.onerror = function () { midiP = null; no(); }; document.head.appendChild(sc); }); return midiP; }
  function lastMinute() { var now = Date.now(), w0 = now - WIN, cc0 = Object.assign({}, ccOld); NL.forEach(function (e) { if (e[1] === 'cc' && e[0] < w0) cc0[e[2]] = e; });
    var seed = Object.keys(cc0).map(function (n) { var e = cc0[n]; return [w0, 'cc', e[2], e[3], 0]; });   // controllers start the window at the value they already had
    return seed.concat(NL.filter(function (e) { return e[0] <= now && e[0] >= w0; })); }
  function wireExport() {
    var b = document.getElementById('dj-exp'); if (!b) return;
    b.addEventListener('pointerdown', function () { midiLib().catch(function () {}); });   // start loading on the press, ready by the click
    b.addEventListener('click', function (e) { e.stopPropagation(); var ev = lastMinute(), bpm = (spec() || {}).bpm || (cur && cur.bpm) || compute().bpm;
      if (!ev.length) { b.classList.remove('is-empty'); void b.offsetWidth; b.classList.add('is-empty'); b.title = 'Nothing played in the last minute yet'; return; }
      b.title = 'Export last minute as MIDI';
      midiLib().then(function (L) { L.save(ev, bpm, cur && cur.genre, TL.slice()); }).catch(function () {}); });
  }
  function grid() { var tr = tracks.filter(function (x) { return !x.dead && !x.leaving; })[0]; return tr && tr.ga ? { t: tr.ga[0], step: tr.ga[1], d16: SPM / tr.bpm / SPB, bpm: tr.bpm } : null; }
  window.DadAutoDJ = { _kit: { wv: wv, chip: function () { return chip(tracks.filter(function (x) { return !x.dead && !x.leaving; })[0]); }, grid: grid, reroll: reroll, nextMix: function () { nextMix(); }, defMix: function () { remix(null); }, kseed: kseed, extras: extras, fx: fxIn, ir: function () { return X && X.ir ? X.ir() : null; }, voice: function () { return voice.apply(null, arguments); }, osc: function () { return osc.apply(null, arguments); }, env: env,
      INST: INST, get ctx() { return ctx; }, LADDER: LADDER, eff: eff, liveOf: liveOf, nudge: nudge, setTo: setTo, compute: compute, paint: paint, save: save,
      idle: function (c) { if (!playing) cur = c; }, get el() { return el; }, get duck() { return duck; }, wake: function () { wake(); }, resumeTap: function () { resumeTap(); }, rebuild: function () { return rebuild(); }, get stalled() { return stalled; }, recCC: recCC, mixGo: function () { mixGo(); }, get voices() { return nlive; }, soph: soph, pwave: pwave, set sOver(v) { sOver = v; }, get sOver() { return sOver; } },
    compute: compute, pumps: pumps, GEN: Object.keys(GEN), set: function (k, v) { if (LADDER[k]) setTo(k, v); paint(compute()); save(); },
    get harmonyBridge() { return lastBx ? { plan: lastBx.plan, segs: lastBx.segs, home: lastBx.home, pre: lastBx.pre, start: lastBx.start, drop: lastBx.drop } : null; },
    get nudge() { return JSON.parse(JSON.stringify(nudge)); }, live: function (k) { return liveOf(k); }, get pending() { return !!pend || stalled; },
    get track() { var t = spec(); return t ? { genre: t.genre, bpm: t.bpm, born: t.born, len: t.len, step: (tracks.filter(function (x) { return !x.dead && !x.leaving; })[0] || {}).step, arc: (tracks.filter(function (x) { return !x.dead && !x.leaving; })[0] || {}).e, breakdown: !!(tracks.filter(function (x) { return !x.dead && !x.leaving; })[0] || {}).bd, soph: (tracks.filter(function (x) { return !x.dead && !x.leaving; })[0] || {}).s } : null; },
    get mix() { return { seed: mixSeed, name: mixName(), genome: M }; }, remix: function (seed) { if (seed === undefined) nextMix(); else remix(seed); },
    get bridge() { return el ? { paused: el.paused, direct: direct } : null; }, snapshot: snapshot,
    get playing() { return playing; }, get now() { return cur; }, get tracks() { return tracks.length; },
    level: rms, get out() { return { level: rms(), k_level: rmsOf(kMeter), ref: refS, k: kRef, nominal: nominal(), duck: duck ? duck.gain.value : 1, ducked: ducked }; },
    get extras() { return !!X; }, notes: function () { return NL.slice(); }, lastMinute: lastMinute, midi: function () { return midiLib(); }, dump: function () { var t = spec(); return midiLib().then(function (L) { return L.build(lastMinute(), t ? t.bpm : compute().bpm, t && t.genre, TL.slice()).csv; }); }, get primed() { return primed; },   // dump: dev midicsv of the last minute (MIDI Bot directions; loads the writer on demand)
    get graph() { return ctx ? { state: ctx.state, tracks: tracks.length, busGain: bus.gain.value, master: master.gain.value } : null; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
