/* Dad's DJ start engine: generated Web Audio music on phi pumps (phi rule 10). Design notes: docs/dad-dj.md. Loads at tier 1; js/dj-extras.js
   follows the first sound. Continuity via js/rhythm-continuity.js. Test hooks: ?mood= ?urgency= ?hour=0-23 ; window.DadAutoDJ. */
(function () {
  'use strict';
  var PHI = 1.6180339887;
  var GENRES = { neutral: ['cinematic'], calm: ['ambient', 'acoustic'], warm: ['soul', 'folk'], proud: ['cinematic'], playful: ['indie-pop'],
                 excited: ['upbeat-pop', 'electronic'], serious: ['piano'] };
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
  // TAP TEMPO (Danny 15:46 AWST 27 Oct, Claude chat: 'the random button ... a bit like a tempo tap button ... if I just hit it once then
  // it just does a random ... press it in a tempo it matches that tempo ... I don't want it to change the mood just the BPM'): the tapped
  // tempo is held as a ratio on the live tempo (a rung on the tempo ladder, not a gain), so the pumps keep moving it; hold on Random clears it.
  // GENRE PICK (Danny 15:3x AWST 27 Oct: 'if I've got that panel, I'll just select all electro and I can hear it'): null = the mood
  // chooses as before; a genre name = only that genre. Both are his choices, saved with the DJ like the mix.
  var TAPR = 1, TAPB = 0, GPICK = null, BPM_LO = 62, BPM_HI = 157;   // TAPB: the BPM he tapped (a new mix keeps it)              // unit: the DJ's tempo range, BPM (unchanged)
  function liveOf(k) { return k === 'mood' ? 'neutral' : k === 'urgency' ? 'idle' : k === 'sky' ? liveSky() : liveTime(); }
  function eff(k) {                                                       // live value + the hand nudge (clamped to the ladder)
    var L = LADDER[k], lv = liveOf(k); if (lv == null && !nudge[k]) return null;
    var i = L.indexOf(lv); if (i < 0) i = L.indexOf('cloud'); return L[clamp(i + nudge[k], 0, L.length - 1)];
  }
  function setTo(k, v) { var L = LADDER[k], i = L.indexOf(liveOf(k)); if (i < 0) i = L.indexOf('cloud'); nudge[k] = L.indexOf(v) < 0 ? 0 : L.indexOf(v) - i; }
  if (LADDER.mood.indexOf(qp('mood')) >= 0) setTo('mood', qp('mood'));
  if (LADDER.urgency.indexOf(qp('urgency')) >= 0) setTo('urgency', qp('urgency'));
  var demo = { get mood() { return eff('mood'); }, get urgency() { return eff('urgency'); } };
  var hourOverride = /^\d{1,2}$/.test(qp('hour') || '') ? (+qp('hour')) % 24 : null;
  function perthHour() {
    if (hourOverride != null) return hourOverride;
    try { return +new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Perth', hour: 'numeric', hourCycle: 'h23' }).format(new Date()) % 24; } catch (e) { return new Date().getHours(); }
  }
  function liveSky() { var w = window.SIM_WX; return w && (LADDER.sky.indexOf(w.cond) >= 0 || w.cond === 'snow') ? (w.cond === 'snow' ? 'cloud' : w.cond) : null; }
  function sky() { return eff('sky'); }
  function timeSlot() { return eff('time'); }
  function liveTime() {
    var h = perthHour(), k = sky();
    if (h < 5) return 'deep';
    if (h >= 21) return (k == null || k === 'night' || k === 'sun' || k === 'hot') ? 'night' : 'evening';
    if (h >= 18) return 'evening';
    return 'day';
  }
  // ---------- DATA LAYER (MIDI Bot pump-mapping sweep #2, Danny OK 17:05 AWST 26 Oct): streams -> six dimensions, no hand tables ----------
  // Every stream is z in -1..1 measured against ITS OWN range (today's min..max, the last day's pressures, the sun's own height, the
  // moon's own light), from the page's one weather request (index.html SIM_WX.f), the sky clocks (js/rhythm-continuity.js) and the cached
  // tide (js/phi-pumps.js). Each knob's hand nudge is a stream too: ladder rungs / the ladder's own half length. A missing stream is 0.
  // Six intent dimensions d = 1 / (1 + PHI^-X), X = sum of sign x z x the mix's coupling weight for that stream's knob group (the
  // existing energy() form). The signs are taste calls (MIDI Bot sweep 4b), so they sit on a dial: DadAutoDJ.sign(stream, dim, -1|0|1).
  var DIMS = ['drive', 'density', 'tension', 'brightness', 'weight', 'space'];
  var SIGN0 = { sun: [1, 0, 0, 1, 0, -1], temp: [1, 0, 0, 1, 0, 0], humid: [0, 0, 0, -1, 1, 1], cloud: [0, 0, 0, -1, 0, 1], wind: [1, 1, 0, 0, 0, 0],   // unit: signs (MIDI Bot sweep 4b)
    gust: [0, 1, 1, 0, 0, 0], pres: [0, 0, -1, 0, 1, 0], uv: [0, 0, 0, 1, 0, 0], storm: [1, 0, 1, 0, 0, 0], moon: [0, 0, 0, 0, 0, 1], tide: [0, 0, 0, 0, 1, 0],   // unit: signs
    season: [0, 0, 0, 1, 0, 0], urgency: [1, 0, 1, 0, 0, 0], mood: [1, 1, 0, 0, 0, -1], time: [1, 0, 0, 1, 0, -1], sky: [1, 0, 0, 1, 0, -1],   // unit: signs; the time and sky knobs read like the sun
    collisions: [0, 1, 0, 0, 0, 0] };                                    // djcollide: density only, via climate()
  var GRP = { sun: 0, season: 0, moon: 0, time: 0, temp: 1, humid: 1, cloud: 1, wind: 1, gust: 1, pres: 1, uv: 1, storm: 1, tide: 1, sky: 1, urgency: 2, mood: 3, collisions: 1 };   // which knob column (tp wp up mp) couples it
  var sign = JSON.parse(JSON.stringify(SIGN0));
  function span(v, lo, hi) { return isFinite(v) && isFinite(lo) && isFinite(hi) && hi > lo ? clamp(2 * (v - lo) / (hi - lo) - 1, -1, 1) : null; }   // its own range -> -1..1
  function streams() {
    var z = {}, R = window.RhythmContinuity, w = window.SIM_WX, f = w && w.f, P = window.PhiPumps, RAD = Math.PI / 180, PCT = 100;   // unit: radians per degree; percent
    if (R && R.sun) { var q = R.sun(); z.sun = Math.sin(q.elev * RAD); z.moon = 2 * q.moonLit - 1; z.season = -Math.sin(2 * Math.PI * q.season); }   // unit: season = solar longitude turns; Perth is south of the equator, so summer is at 3/4 of a turn
    if (f) {
      z.temp = span(f.temp, f.tmin, f.tmax); z.humid = span(f.rh, 0, PCT); z.cloud = span(f.cc, 0, PCT); z.wind = span(Math.min(f.ws, f.wmax), 0, f.wmax);
      z.gust = f.wg + f.ws > 0 ? (f.wg - f.ws) / (f.wg + f.ws) : null; z.pres = span(f.p, f.plo, f.phi); z.uv = span(f.uv, 0, f.uvmax);
      z.storm = f.code >= 95 && f.code <= 99 ? 1 : 0;                     // cite: WMO weather codes 95-99 = thunderstorm
    }
    if (P && P.subscribe) { var td = P.subscribe('tide').get(); if (td != null) z.tide = td; }
    Object.keys(LADDER).forEach(function (k) { z[k] = -2 * nudge[k] / (LADDER[k].length - 1); });   // a rung toward the calm end lowers it; unit: half the ladder = 1
    Object.keys(z).forEach(function (k) { if (z[k] == null || !isFinite(z[k])) delete z[k]; });
    return z;
  }
  // SYSTEM COUPLINGS (Danny 18:15-18:19 AWST 27 Oct, Claude chat: the desk's System strip, 'Yea' to the live ones first): how strongly each
  // live source steers the music, a coupling on the golden ladder (0 = isolated, 1 = as before, up to PHI^2), applied wherever a stream
  // enters the music: the knob groups' pulls (pumps()), the six dimensions (dimX) and the collision swell (colC). Mood and urgency have
  // no live source on this page (fixed at neutral / idle), so the desk shows them greyed until one exists.
  function cpl(gi) { return gi === 0 ? DIAL.cpTime : gi === 1 ? DIAL.cpSky : gi === 2 ? DIAL.cpUrg : DIAL.cpMood; }
  function dimX(w, z) {                                                    // w: coupling weight per knob group (tp wp up mp); X per dimension
    z = z || streams(); var X = {}; DIMS.forEach(function (d, i) { var x = 0; Object.keys(z).forEach(function (k) { var sg = sign[k]; if (sg && sg[i]) x += sg[i] * z[k] * (w ? w[GRP[k]] : 1) * cpl(GRP[k]); }); X[d] = x; });
    return X;
  }
  // DJ COLLISION PUMP (MIDI Bot sketch dj-collision-pump-2026-10-27; Danny 10:18 AWST 27 Oct 'Build it'): js/emoji-collide.js's swell c
  // (PhiPumps 'collisions'). (a) ornaments o = colD c colM (1 - spc) colW per bar: ghost share, accent contrast x PHI^o, roll chance;
  // (c) climate z = colF colD c on density, heard only by a new track's birth dims and the glue. No feed = 0 = as before.
  var COL = { c: 0, o: 0, z: 0, b: 0, beta: 0 };
  function colC() { var P = window.PhiPumps, v = null; try { v = P && P.subscribe ? P.subscribe('collisions').get() : null; } catch (e) {} return v > 0 ? clamp(v * DIAL.cpCol, 0, 1) : 0; }   // x the collisions -> music coupling
  function colM(e) { return Math.pow(Math.sin(Math.PI * clamp((e - IPH * IPH) / (IPH * IPH), 0, 1)), 2); }   // phi: sin^2 over the arc's floor PHI^-2 .. the peak line 1 - PHI^-3: 0 across the peak and at the floor
  function climate(X) { var z = DIAL.colF * DIAL.colD * colC(), sg = sign.collisions; COL.z = z; if (z > 0 && sg) DIMS.forEach(function (d, i) { if (sg[i]) X[d] += sg[i] * z; }); return X; }
  function dimsOf(X) { var o = {}; DIMS.forEach(function (d) { o[d] = 1 / (1 + Math.pow(PHI, -X[d])); }); return o; }   // the energy() form
  function pumps() {                                                      // per knob group: its pull toward calm (minus its drive), so sum = -X.drive
    var t = timeSlot(), k = sky(), z = streams(), g = [0, 0, 0, 0];
    Object.keys(z).forEach(function (s) { if (sign[s] && sign[s][0]) g[GRP[s]] -= sign[s][0] * z[s] * cpl(GRP[s]); });
    return { time: t, tp: g[0], sky: k || 'none', wp: g[1], urgency: demo.urgency, up: g[2], mood: demo.mood, mp: g[3], z: z };
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
    var drums = Object.keys(GEN).filter(function (k) { return !GEN[k].own && (GEN[k].kick || GEN[k].hat || GEN[k].tom || GEN[k].shaker); });   // own: 1 genres (electro) keep their drums to themselves, so the older mixes draw the same donors
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
  function baseBpm(sb) { return 60 / Math.pow(PHI, -1 + sb / 2) * Math.pow(PHI, M.tempo); }   // the live tempo before a tap (was inline in compute)
  // a genre with fold: 1 (electro) plays in the top octave of the DJ's range: a slow reading is doubled (2:1, the same groove at twice the
  // rate), so the pumps still move it and a calm sky never gives 70 BPM electro
  function gBpm(genre, b) { var g = GEN[genre]; if (g && g.fold) while (b < BPM_HI / 2) b *= 2; return Math.min(b, BPM_HI); }
  function compute(p) {
    p = p || pumps(); var X = PAR.map(function (x, i) { return dimX(M.W[i], p.z); });   // mix: each parameter hears the knob groups through its own coupling row
    var s = p.tp + p.wp + p.up + p.mp, sf = (X[0].space - X[0].drive) / 2 + M.cascade, sb = -X[1].drive, sv = -(X[2].weight + X[2].drive) / 2, sl = -X[3].density;   // calm/spacious = long fades, drive = tempo, heavy and driven = louder, dense = shorter tracks; unit: mean of two dimensions
    var vol = clamp(IPH * Math.pow(PHI, -sv / 4), 0.25, 0.8);   // phi: base level PHI^-1 (was a fixed 0.55)
    if (p.mood === 'serious' || p.urgency === 'urgent') vol = 0.3;
    return { p: p, s: s, fade: clamp(Math.pow(PHI, 3.5 + sf), 2.06, 22.83), bpm: clamp(baseBpm(sb) * TAPR, BPM_LO, BPM_HI),
             vol: vol, trackLen: Math.pow(PHI, Math.max(6, 7.5 + sl)), genres: GPICK && GEN[GPICK] ? [GPICK] : p.mood === 'neutral' ? Object.keys(GEN) : GENRES[p.mood] || GENRES.neutral, mix: M.seed, dims: dimsOf(dimX(null, p.z)) };   // phi: tracks last at least PHI^6 s (was PHI^4 = 6.9 s when excited/urgent/hot)
  }

  // ---------- music theory + genre table ----------
  var SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11] };
  var COLOUR = { penta: [0, 2, 4, 7, 9], penta_m: [0, 3, 5, 7, 10], whole: [0, 2, 4, 6, 8, 10] };   // cite: 12-TET pentatonic (major/minor) and whole-tone sets (en.wikipedia.org/wiki/Pentatonic_scale, /Whole-tone_scale)
  //  chords: pad | strum | stab | ep | arp ; bass: hold | roots | walk | eighths | octave ; drums: 16-step strings (x loud, o soft)
  var GEN = {
    ambient:     { scale: 'lydian', root: 50, progs: [[0, 4, 5, 3], [0, 5, 3, 4]], bars: 2, chords: 'pad', wave: 'sine', cut: 1500, bass: 'hold', bwave: 'sine', mel: 0.10, lead: 'bell', resp: 'reed', ro: -12, rev: 0.55 },
    acoustic:    { scale: 'major', root: 55, progs: [[0, 4, 5, 3], [0, 3, 4, 4]], bars: 1, chords: 'strum', steps: [0, 6, 8, 14], wave: 'triangle', cut: 2400, bass: 'roots', bwave: 'triangle', mel: 0.22, lead: 'pluck', resp: 'piano', ro: -12,
                   kick: 'x.......o.......', shaker: '..o...o...o...o.', rev: 0.3 },
    soul:        { scale: 'dorian', root: 50, progs: [[1, 4, 0, 5], [0, 3, 1, 4]], bars: 1, sev: 1, chords: 'ep', steps: [0, 6, 10], bass: 'walk', bwave: 'triangle', mel: 0.18, lead: 'ep', resp: 'horn', ro: 0,
                   kick: 'x......o..x.....', snare: '....x.......x...', hat: 'o.o.o.o.o.o.o.o.', swing: 0.12, rev: 0.25 },
    folk:        { scale: 'major', root: 52, progs: [[0, 3, 0, 4], [0, 5, 3, 4]], bars: 1, chords: 'strum', steps: [0, 4, 8, 12], wave: 'triangle', cut: 2000, bass: 'roots', bwave: 'triangle', mel: 0.28, lead: 'pluck', resp: 'reed', ro: 0,
                   tom: 'x.......x.......', shaker: 'o.o.o.o.o.o.o.o.', rev: 0.3 },
    cinematic:   { scale: 'minor', root: 45, progs: [[0, 5, 2, 6], [0, 3, 5, 4]], bars: 2, chords: 'pad', wave: 'sawtooth', cut: 900, ost: 1, bass: 'hold', bwave: 'sawtooth', mel: 0.08, lead: 'horn', resp: 'bell', ro: 12,
                   tom: 'x...........o...', rev: 0.55 },
    'indie-pop': { scale: 'major', root: 52, progs: [[0, 4, 5, 3], [5, 3, 0, 4]], bars: 1, chords: 'stab', steps: [0, 3, 6, 10, 12], wave: 'square', cut: 1800, bass: 'eighths', bwave: 'triangle', mel: 0.28, lead: 'square', resp: 'pluck', ro: -12,
                   kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.o.x.o.x.o.x.o.', rev: 0.2 },
    'upbeat-pop':{ scale: 'major', root: 53, progs: [[0, 4, 5, 3], [3, 4, 0, 5]], bars: 1, chords: 'stab', steps: [2, 6, 10, 14], wave: 'sawtooth', cut: 2600, bass: 'octave', bwave: 'sawtooth', mel: 0.32, lead: 'saw', resp: 'pluck', ro: 0,
                   kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', rev: 0.2 },
    electronic:  { scale: 'minor', root: 45, progs: [[0, 5, 3, 4], [0, 6, 5, 4]], bars: 1, chords: 'pad', wave: 'sawtooth', cut: 1200, arp: 1, bass: 'eighths', bwave: 'square', mel: 0.12, lead: 'square', resp: 'bell', ro: 12,
                   kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'oxoxoxoxoxoxoxox', rev: 0.25 },
    // ELECTRO (Danny 15:2x-15:42 AWST 27 Oct, Claude chat: 'I'm gonna start with electro ... build an 808 straight away ... the two
    // versions'): the 808 bank plays the drums (bank: 1, js/dj-extras.js + js/vendor/driftbox-808.js), the genre keeps its own drums
    // (own: 1: no donor, no Pocket Operations anchor; alt = the odd-bar variation), tempo folded into the top octave (fold: 1).
    // Drums: the electro 808 convention (kick 1 . 7 . 11, snare + clap on 2 and 4, straight closed-hat 16ths with an open hat into the
    // bar, off-beat cowbell); x = loud (an open hat on the 808), o = soft (a closed hat). Syncopated stabs over i-VI-VII on Ed's
    // Jupiter (ci), Ed's Juno on the arp (ai) and a pad under it (under), the DX7 on the lead, the 303 rack on the bass (acid).
    electro:     { scale: 'minor', root: 43, progs: [[0, 0, 5, 6], [0, 5, 3, 6]], bars: 1, chords: 'stab', ci: 'jup', steps: [0, 3, 6, 10], wave: 'sawtooth', cut: 1400, arp: 1, ai: 'juno', under: 'junopad', bass: 'acid', bwave: 'square', mel: 0.12, lead: 'dx', resp: 'jup', ro: -12,
                   kick: 'x.....x...x.....', snare: '....x.......x...', clap: '....x.......x...', hat: 'oooooooooooooox.', cow: '...o.......o....', rev: 0.18,
                   own: 1, bank: 1, fold: 1, alt: { kick: 'x.....x...x..x..', snare: '....x.......x..o', hat: 'oooooooooooooox.' } },
    piano:       { scale: 'minor', root: 48, progs: [[0, 5, 3, 4], [0, 3, 4, 0]], bars: 1, chords: 'arp', bass: 'hold', bwave: 'piano', mel: 0.25, lead: 'piano', resp: 'piano', ro: -12, rev: 0.4 }
  };
  // NEUTRAL USES EVERY STYLE (MIDI Bot scales + harmony plan P0, Danny 17:49 AWST 26 Oct): with the mood on neutral (its live value) the
  // genre draw takes all nine genres, each weighted by how near its own home sits to the live dimensions, w = PHI^(-PHI^2 k / D) with
  // D = PHI^(PHI^2 tension) (travel()'s form): k = |drive - its drum share| + |brightness - its mode's place on the line of fifths|.
  // The draw is the golden sequence on the genre counter, so a reload lands on the same genre. Other moods keep their own list.
  var FIFTHS = ['lydian', 'major', 'mixolydian', 'dorian', 'minor', 'phrygian', 'locrian'];   // cite: the diatonic modes from brightest to darkest along the line of fifths (en.wikipedia.org/wiki/Mode_(music))
  function home(k) { var g = GEN[k], S16 = SPB * SPB, n = 0;                // a genre's own place: drum steps hit per bar, mode brightness
    for (var i = 0; i < S16; i++) if (['kick', 'snare', 'hat', 'shaker', 'tom'].some(function (d) { return g[d] && g[d][i % g[d].length] !== '.'; })) n++;
    return { drive: n / S16, brightness: 1 - FIFTHS.indexOf(g.scale) / (FIFTHS.length - 1) }; }
  function pickG(c, n) {                                                  // the n-th genre of c.genres
    var F = window.DadAutoDJ && DadAutoDJ.fx; if (F && F.autoSweep && F.autoSweep() && c.dims) {   // auto sweep (Danny 20:03): any genre in GEN can come next; weather and a set mood only tilt the odds
      var all = Object.keys(GEN), d0 = c.dims, D0 = Math.pow(PHI, PHI * PHI * d0.tension), ml = c.genres.length < all.length ? c.genres : [];
      var w0 = all.map(function (k) { var h = home(k); return Math.pow(PHI, -(Math.abs(d0.drive - h.drive) + Math.abs(d0.brightness - h.brightness)) / D0) * (ml.indexOf(k) >= 0 ? PHI : 1); });   // phi: the closeness weight flattened by PHI^2; mood list x PHI
      var x0 = frac((n + 1) * IPH) * w0.reduce(function (a, b) { return a + b; }, 0); for (var i0 = 0; i0 < all.length; i0++) { x0 -= w0[i0]; if (x0 <= 0) return all[i0]; } return all[all.length - 1];
    }
    var gs = c.genres; if (gs.length < 2 || !c.dims) return gs[((n % gs.length) + gs.length) % gs.length];
    if (gs.length < Object.keys(GEN).length) return gs[((n % gs.length) + gs.length) % gs.length];   // a mood's own short list keeps its rotation
    var d = c.dims, D = Math.pow(PHI, PHI * PHI * d.tension), w = gs.map(function (k) { var h = home(k); return Math.pow(PHI, -PHI * PHI * (Math.abs(d.drive - h.drive) + Math.abs(d.brightness - h.brightness)) / D); });
    var x = frac((n + 1) * IPH) * w.reduce(function (a, b) { return a + b; }, 0); for (var i = 0; i < gs.length; i++) { x -= w[i]; if (x <= 0) return gs[i]; } return gs[gs.length - 1];
  }
  // BRIGHTNESS PICKS THE MODE (MIDI Bot scales + harmony plan P1): the seven diatonic modes are a chain on the line of fifths, each one
  // note from the next (Lydian +1 .. Locrian -5, sharps against the tonic). A track sits at p = its genre's own mode + (brightness - 1/2) x R;
  // the fraction of p is the share of chords that take the sharper neighbour (golden-sequence draw per chord), so between Ionian and
  // Mixolydian the 7th is sometimes natural, sometimes flat. R and the dark end are dials, at the middle of their ranges.
  var DIAL = { modeR: (1 / 2 + 3) / 2, modeLo: (-4 - 5) / 2,           // MIDI Bot open ranges 1: R from 1/2 to 3 steps; the dark end at Phrygian (-4) or Locrian (-5)
    loopLo: (0 + 1) / 2, loopHi: (2 + 3) / 2,                            // open range 4 (log2 chords per loop): shortest 1..2, longest 4..8
    hrLo: (-1 + 0) / 2, hrHi: (1 + 2) / 2,                               // open range 5 (log2 bars per chord): fastest 1/2..1, slowest 2..4
    rho0: (1 + 1 / 2) / 2, rho1: (-1 - 1 / 2) / 2,
    balD: PHI, balC: IPH,                                             // organ fix (MIDI Bot amplitude sweep V2): balance depth D in phi rungs, open range 1..PHI^2, default PHI; sustain centre, open range PHI^-2..1, default PHI^-1 (the golden split)
    colD: IPH, colT: Math.pow(PHI, 5), colW: 1, colF: IPH,
    c808: 1,
    recall: IPH, resp: IPH,
    cpTime: 1, cpSky: 1, cpUrg: 1, cpMood: 1, cpCol: 1 };                 // System strip couplings (Danny 18:19 AWST 27 Oct): 1 = as before                                            // motif memory + call and response (Danny 17:43 AWST 27 Oct): couplings, PHI^-1 of new themes recall one, PHI^-1 of phrases answered by another voice                                                           // 808 character depth (Danny 17:36 AWST 27 Oct): off 0, less PHI^-1, normal 1, more PHI, max PHI^2 (js/dj-extras.js char808)             // djcollide: crash amount PHI^-2..1, swell PHI^4..PHI^6 s, booms vs debris PHI^-1..PHI, fill-out 0..1 (mid defaults)                                              // organ fix (MIDI Bot amplitude sweep V2): balance depth D in phi rungs, open range 1..PHI^2, default PHI; sustain centre, open range PHI^-2..1, default PHI^-1 (the golden split)
  var FLO = 20, FHI = 20000;                                             // cite: the range of human hearing, 20 Hz - 20 kHz (as in dj-fx.js and dj-extras.js)                     // open range 3: root-motion direction at zero drive (+1..+1/2) and full drive (-1..-1/2)
  var DIAL0 = JSON.stringify(DIAL);
  var FLATS = [6, 2, 5, 1, 4];                                           // cite: from Ionian, each step down the line of fifths lowers the 7th, 3rd, 6th, 2nd, then 5th (Mixolydian, Dorian, Aeolian, Phrygian, Locrian)
  function modeScale(k) { var m = SCALES.major.slice(); if (k > 0) m[3] += 1; for (var i = 0; i < -k && i < FLATS.length; i++) m[FLATS[i]] -= 1; return m; }   // cite: Lydian raises the 4th
  // PROGRESSION GENERATOR (MIDI Bot scales + harmony plan P2, Danny 17:49 AWST): each track draws its own loop instead of only the
  // genre's two fixed ones. Three readings, each a dimension, each weight travel()'s w = PHI^(-PHI^2 k / D), D = PHI^(PHI^2 tension):
  // chords per loop L in {1, 2, 4, 8} near a target that falls as drive rises (grooves shuttle, phrases run on); bars per chord in
  // {1/2, 1, 2, 4} near a target that rises with space; and each next root over the six root-interval classes, k = 0 for the
  // direction rho favours and 1 for its mirror, rho = rho0 .. rho1 across drive (common practice .. rock-standard). The genre's own loop
  // stays as the home: each slot keeps the home chord (k = 0) or wanders (k = 1), so low tension sounds like today and the loop repeats
  // exactly once drawn. Slot 0 is always the home's first chord (the bridge lands there). Its own random stream (seed + GA), so the
  // track's other draws are unchanged.
  // cite: common-practice root motions ascending 4th, descending 3rd, ascending 2nd; rock's mirror image (Stephenson 2002, via
  // de Clercq & Temperley 2011, Popular Music 30(1) p. 49); two-chord shuttles (Tagg, via Hein 2021); loops in EDM (Faraldo et al. 2016)
  var RM = [3, -2, 1], LOOPS = [1, 2, 4, 8], HBARS = [1 / 2, 1, 2, 4];   // cite: those three root motions in scale steps; 4/4 hypermeter loop lengths; harmonic-rhythm rungs
  function wPick(opt, kOf, D, x) { var w = opt.map(function (o) { return Math.pow(PHI, -PHI * PHI * kOf(o) / D); }), sum = w.reduce(function (a, b) { return a + b; }, 0); x *= sum;
    for (var i = 0; i < opt.length; i++) { x -= w[i]; if (x <= 0) return opt[i]; } return opt[opt.length - 1]; }
  function genLoop(home, homeB, dm, rr) {                                 // rr: the loop's own seeded stream
    var D = Math.pow(PHI, PHI * PHI * dm.tension), tL = DIAL.loopLo + (1 - dm.drive) * (DIAL.loopHi - DIAL.loopLo);
    var L = wPick(LOOPS, function (n) { return Math.abs(Math.log2(n) - tL); }, D, rr()), src = L > home.length ? home.concat(homeB) : home;
    var rho = DIAL.rho0 + (DIAL.rho1 - DIAL.rho0) * dm.drive, steps = RM.concat(RM.map(function (m) { return -m; }));   // the six classes: the favoured three, then their mirrors
    var out = [src[0]];
    for (var i = 1; i < L; i++) {
      var h = src[i % src.length]; if (rr() < 1 / (1 + Math.pow(PHI, -PHI * PHI / D))) { rr(); out.push(h); continue; }   // keep the home chord (w 1 against the wander's PHI^(-PHI^2 / D))
      var mv = wPick(steps, function (m) { return RM.indexOf(m) >= 0 ? (1 - rho) / 2 : (1 + rho) / 2; }, D, rr());
      out.push((((out[i - 1] + mv) % 7) + 7) % 7);                       // unit: 7 scale degrees
    }
    return out;
  }
  function harmRhythm(dm, rr) { var t = DIAL.hrLo + dm.space * (DIAL.hrHi - DIAL.hrLo); return wPick(HBARS, function (b) { return Math.abs(Math.log2(b) - t); }, Math.pow(PHI, PHI * PHI * dm.tension), rr()); }
  function modePos(sc) { return 1 - FIFTHS.indexOf(sc); }               // a genre scale's place: lydian +1, major 0, dorian -2, minor -3
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // PHONE BASS (MIDI Bot bass + beats plan fix 1, Danny 18:48 AWST 26 Oct): an iPhone speaker plays little below 150-200 Hz, so each track
  // adds a harmonic layer beside its unchanged sub path (missing fundamental; Larsen & Aarts, JAES 50(3) 2002; MaxxBass): HP at the
  // bass root x PHI -> tanh shaper driven D = PHI^(PHI^2 + 2 w - 1) (built once, like the crush curve) -> LP at root x PHI^5 -> gain
  // H x PHI^-(PHI^2 + 1), H = PHI^(2 w - 1) x PHI^-1 (PHI^-2 .. 1, all from the track's weight pump w). 5 nodes per track, not per note.
  var TNH = null;
  function phoneBass(src, dst, br, w) {
    if (!ctx.createWaveShaper) return null; w = clamp(isFinite(w) ? w : IPH, 0, 1);
    if (!TNH) { var n = 1024; TNH = new Float32Array(n); for (var i = 0; i < n; i++) { var x = 2 * i / (n - 1) - 1; TNH[i] = Math.tanh(PHI * PHI * x); } }   // phi: tanh over +-PHI^2 of input
    var D = Math.pow(PHI, PHI * PHI + 2 * w - 1), H = Math.pow(PHI, 2 * w - 1) * IPH;   // drive into the +-PHI^2 curve
    var hp = ctx.createBiquadFilter(), sh = ctx.createWaveShaper(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = br * PHI; lp.type = 'lowpass'; lp.frequency.value = br * Math.pow(PHI, 5); sh.curve = TNH;
    var pre = ctx.createGain(); pre.gain.value = D; g.gain.value = H * Math.pow(PHI, -(PHI * PHI + 1));   // saturated: the layer sits at H x PHI^-(PHI^2 + 1) of full scale
    src.connect(hp); hp.connect(pre); pre.connect(sh); sh.connect(lp); lp.connect(g); g.connect(dst); return { hp: hp, lp: lp, g: g, pre: pre };
  }
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
  var X = null, XL = 0, xReq = false, XURL = 'js/dj-extras.js?v=desk1';
  function loadX() { if (xReq) return; xReq = true; var sc = document.createElement('script'); sc.src = XURL; sc.async = true; document.head.appendChild(sc); }
  function extras(x) {                                                    // called by js/dj-extras.js when it lands
    X = Object.create(x); X.hit = hitW(x); XL = 1; var t = ctx ? ctx.currentTime : 0, G = Math.pow(PHI, 2);   // phi: extras glide in over PHI^2 s
    if (ctx) { tracks.forEach(function (tr) { tr.xo.gain.cancelScheduledValues(t); tr.xo.gain.setValueAtTime(tr.xo.gain.value, t); tr.xo.gain.linearRampToValueAtTime(1, t + G); });
      if (X.reverb) X.reverb(ctx, revIn, bus, G); }
    if (X.chips && chips) X.chips(chips);
    paint(compute()); loadFX();
  }
  // ---------- effects (Danny 14:34 AWST 26 Oct): js/dj-fx.js loads after the extras, once sound exists; dry path -> fx chain over PHI^2 s ----------
  var FXURL = 'js/dj-fx.js?v=desk1', fxReq = false, fxDry = null, fxC = null;
  function loadFX() { if (fxReq || !ctx || !X) return; fxReq = true; var sc = document.createElement('script'); sc.src = FXURL; sc.async = true; document.head.appendChild(sc); }
  // ---------- wordless voice (MIDI Bot dynamics spec V1/V2, Danny 19:23 AWST 26 Oct): js/dj-voice.js loads at idle once the effects are in ----------
  var VURL = 'js/dj-voice.js?v=desk1', vReq = false, VH = null;
  function loadV() { if (vReq || !ctx) return; vReq = true; var sc = document.createElement('script'); sc.src = VURL; sc.async = true; document.head.appendChild(sc); }
  function idleV() { var ric = window.requestIdleCallback || function (f) { return setTimeout(f, Math.pow(PHI, 2) * MS); }; ric(loadV, { timeout: Math.pow(PHI, 5) * MS }); }   // phi: idle, at the latest PHI^5 s later
  function fxIn(f) {                                                      // called by js/dj-fx.js: {inp, out}; the chain is transparent at rest
    if (fxC || !ctx) return; fxC = f; var t = ctx.currentTime, G = Math.pow(PHI, 2);   // phi: crossfade PHI^2 s (rule 6)
    if (f.sends) { FXS = f.sends; tracks.forEach(fxSends); }              // the mixer's channel sends land in the echo loop and the wash
    bus.connect(f.inp); f.out.connect(master);
    f.out.gain.setValueAtTime(0, t); f.out.gain.linearRampToValueAtTime(1, t + G);
    fxDry.gain.setValueAtTime(1, t); fxDry.gain.linearRampToValueAtTime(0, t + G); idleV();
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
      ctx = window.__djAC || new AC(); window.__djAC = null;              // soundfix3: a context unlocked by the inline early-touch catcher (index.html) before this file landed
      master = ctx.createGain(); master.gain.value = sliderVol();           // the volume slider
      bus = ctx.createGain(); bus.gain.value = IPH;                       // the pump volume
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
      revIn = ctx.createGain(); revIn.gain.value = 0;                     // the reverb (and its impulse) arrives with js/dj-extras.js and glides in
      duck = ctx.createGain(); duck.gain.value = ducked ? IPH : 1;           // the logo duck sits after the meter's tap, so the meter reads undipped
      glueC = comp; glueT = ctx.createGain(); ceilN = ctx.createWaveShaper(); ceilN.oversample = '4x'; ceilN.curve = ceilCurve(CEIL || IPH);   // glue trim, then the master ceiling, before the duck (S1)
      fxDry = ctx.createGain(); bus.connect(fxDry); fxDry.connect(master); master.connect(comp); comp.connect(glueT); glueT.connect(ceilN); ceilN.connect(duck); duck.connect(ctx.destination); out = duck; bridge(); if (X && X.reverb) X.reverb(ctx, revIn, bus, Math.pow(PHI, 2));
      meter = ctx.createAnalyser(); meter.fftSize = 2048; ceilN.connect(meter);             // level check for tests only (what passes the ceiling, undipped)
      kMeter = ctx.createAnalyser(); kw(ctx, glueT).connect(kMeter);                         // undipped, K-weighted: the level the logos follow
      kPre = ctx.createAnalyser(); kw(ctx, master).connect(kPre);                            // the same reading before the glue: its threshold and trim
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
    // ORGAN FIX (Danny 20:15 AWST 26 Oct, 'Yes, send the organ fix'; MIDI Bot amplitude sweep V2 (b)): a balance gradient on every note,
    // vel x PHI^(-D (sigma - centre) w m). sigma = the note's own sustain share (attack + hold) / duration from its envelope; w = sin^2 of its
    // place across the hearing range (1 in the mid register, falling to the sub and the very top); m = sin^2(pi e), the energy arc's mid-ness.
    // So sustained mid-register voices (the chord pad, the organ) come down mid-build and plucks, bells, piano and melody come up; at the
    // arc's ends (m = 0) nothing moves. D and the centre are saved dials (DIAL.balD, DIAL.balC). All ratios of the pumps' arc and phi.
    var TKb = tr.tk || tr; if (TKb.e != null) { var sgm = clamp((a + (opt.hold != null ? opt.hold : 0.01)) / Math.max(dur, a), 0, 1), xr = clamp(Math.log(f / FLO) / Math.log(FHI / FLO), 0, 1);
      vel *= Math.pow(PHI, -DIAL.balD * (sgm - DIAL.balC) * Math.pow(Math.sin(Math.PI * xr), 2) * Math.pow(Math.sin(Math.PI * TKb.e), 2)); }
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
    var to = !tr.tk && tr.dk ? tr.dk : tr.out;
    if (!crowd && ctx.createStereoPanner) { var pn = ctx.createStereoPanner(), w = (tr.dm ? tr.dm.space : 1 - u) * IPH + IPH * IPH; var bh = tr.g && tr.g.br ? clamp(Math.log2(f / (tr.g.br * PHI * PHI)), 0, 1) : 1; pn.pan.value = Math.sin(Math.log2(f) * 12 * 2 * Math.PI * IPH) * w * bh; g.connect(pn); pn.connect(to); }   // unit: 12 semitones per octave; phi: golden-angle spread
    else g.connect(to);
    if (opt.rev) { var s = ctx.createGain(); s.gain.value = opt.rev; g.connect(s); s.connect(tr.rev); }
  }
  function vibrato(tr) {                                                  // one LFO per track: rate ~PHI^0 Hz (pump-nudged), depth from tension, eased in
    try { var l = ctx.createOscillator(), d = ctx.createGain(), t = ctx.currentTime, u = tr.u == null ? IPH : tr.u;
      l.frequency.value = Math.pow(PHI, (u - 1 / 2) * IPH); d.gain.setValueAtTime(0, t); d.gain.setTargetAtTime(CENT * Math.pow(PHI, -4) * (IPH + (tr.dm ? tr.dm.tension : 1 - u) * IPH), t, PHI);   // phi: PHI^-4 semitone x tension, eased over PHI s
      l.connect(d); l.start(t); tr.vib = d; tr.lfo = l; } catch (e) {}
  }
  // CHIP GRADIENT (Danny 16:53 AWST 26 Oct: 'less electronic gaming and more organic ... a little bit of computer game sound every now
  // and again ... come and go faster and less often'). chip(tr) in 0..1 is the share of chiptune timbre (square/pulse leads, bass and
  // arpeggio blips, bit-crush) right now: a fast pump pair (periods PHI^PHI.. s) raised to PHI^(PHI + s + 1 - u), so it peaks briefly and
  // rarely, rarer still as sophistication s rises and energy u falls. Each note draws against it on the golden sequence (no rng use);
  // a note that misses takes the organic voice: filtered, detuned saw with a breath transient (js/dj-extras.js reed) or a plucked one.
  var chipP = null;
  function pumpAt(at) { var P = window.PhiPumps; return (P && P.now ? P.now() : ctx ? ctx.currentTime : 0) + (at != null && ctx ? at - ctx.currentTime : 0); }   // pump clock at audio time at (note time, not schedule time)
  function chip(tr, at) {                                                 // at: the note's audio time, when given
    var P = window.PhiPumps; if (!chipP) chipP = P && P.node ? P.node('dj:chip', 2, PHI, IPH, P.page, 7) : { modes: function (t) { return Math.sin(2 * Math.PI * t / Math.pow(PHI, PHI)); } };   // phi: period PHI^PHI s
    tr = tr && tr.tk || tr; var now = pumpAt(at), x = (1 + clamp(chipP.modes(now), -1, 1)) / 2;
    var s = tr && tr.s != null ? tr.s : IPH, u = tr && tr.u != null ? tr.u : IPH; return Math.pow(x, Math.pow(PHI, PHI + s + 1 - u));
  }
  function chipNote(tr, at) { tr = tr && tr.tk || tr; return frac(((tr.step || 0) + 1) * IPH + (tr.seed | 0) * IPH * IPH) < chip(tr, at); }   // phi: golden-sequence draw
  function wv(tr, w, at) { return w === 'square' && !chipNote(tr, at) ? 'sawtooth' : w; }   // square waves only while the chip share lets them through
  var INST = {
    pad:   function (tr, f, t, d, v) { var w0 = wv(tr, tr.g.wave || 'sine', t); voice(tr, pwave(w0, tr.s) || w0, f, t, d, v * 0.10, { a: d * 0.35, hold: d * 0.6, rel: d * 0.25, cut: tr.g.cut, det: 9, rev: 0.8 }); },
    pluck: function (tr, f, t, d, v) { voice(tr, wv(tr, tr.g.wave || 'triangle', t), f, t, d, v * 0.16, { a: 0.003, hold: 0.01, rel: 0.22, cut: tr.g.cut * PHI, sweep: 0.08, rev: 0.4 }); },
    bass:  function (tr, f, t, d, v) { if (tr.g.bwave === 'piano') return (INST.piano || INST.pluck)(tr, f, t, d, v * 1.2);
                                       var bw = wv(tr, tr.g.bwave, t); voice(tr, bw, f, t, d, v * (tr.g.bwave === 'sine' ? 0.22 : 0.16), { a: 0.006, hold: d * (bw === 'square' ? IPH : 0.8), rel: 0.08, cut: tr.g.cut * IPH * (bw !== tr.g.bwave ? IPH : 1) }); }   // phi: the organic bass a rung darker
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
  // MOTIF MEMORY (Danny 17:43 AWST 27 Oct, Claude chat: 'Go' to motif memory and call and response, 'so the lead remembers its phrases
  // and the parts answer each other'). The DJ keeps the contours (scale-step moves between successive notes) of its last MEMN themes,
  // saved with the DJ (mm), so over hours and days the radio grows its own recurring themes. A new track recalls one with probability
  // DIAL.recall (a coupling between the memory and the generator, default PHI^-1), recent ones weighted PHI^-age; the remembered
  // contour goes onto the NEW track's own rhythm (the genre's density), starting from its own first note, so a theme comes back
  // re-rhythmed in another style. One development each time (almost-repeat): PHI^-1 of recalls move one interval a step, PHI^-3
  // invert the contour, the rest keep it. Draws are golden draws on the seed, not the track's random stream, so everything else in
  // the track is exactly as before. Fresh themes (and developed ones) join the memory.
  var MEMO = [], MEMN = 8;                                               // unit: the last 8 themes (a Fibonacci count)
  function contour(m) { var d = [], last = null; m.forEach(function (x) { if (x == null) return; if (last != null) d.push(x - last); last = x; }); return d; }
  function remember(m) { var c = contour(m); if (c.length < 2) return; MEMO.push(c); while (MEMO.length > MEMN) MEMO.shift(); }
  function recall(fresh, seed) {
    var sd = (seed | 0) >>> 0, gd = function (k) { return frac(sd * Math.pow(IPH, k) + k * IPH); }, first = fresh.filter(function (x) { return x != null; })[0];
    if (!MEMO.length || first == null || !(gd(2) < DIAL.recall)) return fresh.slice();
    var w = MEMO.map(function (_, j) { return Math.pow(PHI, -(MEMO.length - 1 - j)); }), x = gd(3) * w.reduce(function (a, b) { return a + b; }, 0), j = MEMO.length - 1;
    for (var i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) { j = i; break; } }
    var dl = MEMO[j].slice(), op = gd(4);
    if (op < IPH) { var q = Math.floor(gd(5) * dl.length); dl[q] += dl[q] > 0 ? -1 : 1; } else if (op < IPH + Math.pow(IPH, 3)) dl = dl.map(function (v) { return -v; });   // phi: the development shares
    var cur = first, n = 0;
    return fresh.map(function (y) { if (y == null) return null; if (n > 0) cur = clamp(cur + dl[(n - 1) % dl.length], 4, 13); n++; return cur; });   // unit: the fresh motif's degree range
  }
  function makeTrack(genre, bpm, seed, prev, root0, dm0, mo0) {
    var g = GEN[genre], r = rng(seed), sc = SCALES[g.scale], root = g.root + [-2, 0, 0, 2, 3, -3][Math.floor(r() * 6)];
    if (typeof root0 === 'number' && isFinite(root0)) root = root0; else if (prev && prev.sc) root = travel(sc, g.root, prev, frac((seed | 0) * IPH));   // restored key, or travel from the outgoing one
    var pi0 = Math.floor(r() * g.progs.length), prog = g.progs[pi0], progB = g.progs[(pi0 + 1) % g.progs.length], mel = [], deg = 7 + Math.floor(r() * 3);   // B section: the genre's other progression
    var dm = dm0 && typeof dm0.drive === 'number' ? dm0 : dimsOf(climate(dimX(null)));
    if (dm === dm0 && isFinite(dm0.w)) { var dl = dimsOf(climate(dimX(null))), wr = clamp(dm0.w, 0, 1); dm = {}; DIMS.forEach(function (d) { dm[d] = typeof dm0[d] === 'number' ? dl[d] + (dm0[d] - dl[d]) * wr : dl[d]; }); }   // reload: saved birth dims fade toward the live readings (catchUp)   // the six dimensions at the track's birth (restored with the track, so a reload rebuilds the same loop)
    var rr = rng((seed + GA) | 0); var hA = prog, hB = progB; prog = genLoop(hA, hB, dm, rr); progB = genLoop(hB, hA, dm, rr); var hb = harmRhythm(dm, rr);   // P2: this track's own loops and chord length
    var mp = clamp(modePos(g.scale) + (dm.brightness - 1 / 2) * DIAL.modeR, DIAL.modeLo, 1), mlo = Math.floor(mp), mf = mp - mlo, scLo = modeScale(mlo), scHi = modeScale(Math.min(1, mlo + 1));   // brightness -> mode
    for (var i = 0; i < 32; i++) {                                // a 2-bar motif, repeated with small variations
      var strong = i % 4 === 0, p = (strong ? g.mel * 2.2 : (i % 2 ? g.mel * 0.6 : g.mel)) * Math.pow(PHI, M.density + 2 * dm.density - 1);   // mix: density rung; data: density
      if (r() < p) { deg = clamp(deg + [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(r() * 8)], 4, 13); mel.push(deg); } else mel.push(null);
    }
    // MOTIF MEMORY (below): a reload rebuilds the same call (mo0); a new track may take a remembered theme's contour onto its own rhythm
    var mo = mo0 && mo0.length === 32 ? mo0.map(function (x) { return x == null ? null : clamp(Math.round(+x) || 0, 2, 16); }) : recall(mel, seed);
    mel = mo.slice(); if (!mo0) remember(mo);
    // CALL AND RESPONSE (MIDI Bot directions): the motif is 64 steps; the answer is the call inverted around its first note
    var piv = mel.filter(function (x) { return x != null; })[0] || deg; for (var i2 = 0; i2 < 32; i2++) mel.push(mel[i2] == null ? null : clamp(2 * piv - mel[i2], 2, 16));   // unit: scale-degree range
    var u = energy(), gx = Object.create(g); gx.cut = mtof(root + 12) * Math.pow(PHI, PHI * PHI + 2 * dm.brightness - 1);   // phi: brightness = PHI^(PHI^2 +- 1 rung) over the root (rule 8: no fixed cut); data: the brightness dimension
    var out = ctx.createGain(); out.gain.value = 0.0001; out.connect(bus);
    var wet = ctx.createGain(); wet.gain.value = 0.0001; wet.connect(revIn);                    // reverb send, faded with the track
    var rv = ctx.createGain(); rv.gain.value = g.rev * Math.pow(PHI, 2 * dm.space - 1); rv.connect(wet);   // data: space, a rung either way
    var xo = ctx.createGain(); xo.gain.value = XL; xo.connect(out);                                // extras (leads, drums) glide in here
    var P = window.PhiPumps, node = !P || !M.route ? null : M.route === 1 ? P.page : P.logo('dad');   // mix: which pump-tree node drives the dynamics
    var sE = ctx.createGain(), sW = ctx.createGain(); sE.gain.value = sW.gain.value = 0.0001;   // the track's echo / wash send busses, faded with it (the mixer)
    var lay = function (to, ch) { var n = ctx.createGain(); n.gain.value = 1; n.connect(to); var se = ctx.createGain(), sw = ctx.createGain(); se.gain.value = sendV(ch, 'e'); sw.gain.value = sendV(ch, 'w');
      n.connect(se); se.connect(sE); n.connect(sw); sw.connect(sW); return { g: gx, out: n, rev: rv, ch: ch, se: se, sw: sw }; };   // energy-arc layers (setTarget ramps, never gates); ch: the mixer channel
    var dk = ctx.createGain(); dk.gain.value = 1; dk.connect(out); var L = { drums: lay(xo, 'drums'), lead: lay(xo, 'lead'), answer: lay(xo, 'answer'), bass: lay(dk, 'bass'), pad: lay(dk, 'pad') }, X0 = lay(xo, 'arp');
    var hb0 = phoneBass(L.bass.out, dk, mtof(root - 12), dm.weight); gx.br = mtof(root - 12);   // bass fix 1: the harmonic (phone) layer beside the sub path
    var T = { dk: dk, dr: M.donor && !g.own ? GEN[M.donor] : g, shift: M.shift, node: node, genre: genre, bpm: bpm, seed: seed, g: gx, sc: mf < 1 / 2 ? scLo : scHi, scLo: scLo, scHi: scHi, mf: mf, mode: mp, root: root, prog: prog, progB: progB, hb: hb, mel: mel, mo: mo, r: r, out: out, wet: wet, rev: rv, xo: xo, x: X0, sE: sE, sW: sW, L: L, u: u, dm: dm, cut: gx.cut, lastCh: null, step: 0, next: ctx.currentTime + Math.pow(PHI, -6), born: Date.now() }; T.s = soph(T); vibrato(T); T.x.tk = T; Object.keys(L).forEach(function (k) { L[k].tk = T; });
    var S0 = Object.create(T), so = lay(dk, 'chords'); S0.out = so.out; S0.se = so.se; S0.sw = so.sw; S0.ch = 'chords'; S0.tk = T; L.chords = S0; fxSends(T); return T;   // chords: the track's own fields, its own channel   // phi: first step PHI^-6 s out
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
  function ageOf(tr, t) { var w = Date.now() + (t != null && ctx ? (t - ctx.currentTime) * MS : 0); return clamp((w - tr.born) / MS / (tr.trackLen || compute().trackLen), 0, 1); }   // at the note's audio time t when given (so the arc does not depend on when the clock scheduled it)
  function shape(tr, t, barLen) {                                         // once a bar: glide the layers to the arc
    var a = ageOf(tr, t), e = arc(a), tau = barLen * IPH; tr.e = e; tr.bd = a > IPH && e < IPH;
    tr.L.drums.out.gain.setTargetAtTime(e, t, tau); tr.L.lead.out.gain.setTargetAtTime(e, t, tau); tr.L.bass.out.gain.setTargetAtTime(tr.noBass ? 0 : Math.sqrt(e * Math.pow(PHI, 2 * (tr.dm ? tr.dm.weight : 1 / 2) - 1)), t, tau);   // data: weight, half a rung either way under the root
    tr.L.pad.out.gain.setTargetAtTime(clamp(IPH * IPH + (1 - e) * PHI, 0, 1), t, tau);
  }
  // VOICE LEADING + EXTENSIONS: 3 + a pump-ratio count of stacked thirds (triad, 7th, 9th); of the inversions (+-12 per note) the one
  // that moves least from the last chord is played, held near the root-position register.
  function voiced(tr, deg) {
    var x = clamp((tr.dm ? tr.dm.density : 1 - tr.u) + (tr.g.sev ? IPH : 0) + (tr.bd ? IPH * IPH : 0), 0, 1), n = 3 + Math.round(2 * x);   // unit: a triad plus up to two more thirds; data: density
    var base = chordNotes(tr.scNow || tr.sc, tr.root, deg, 0, n), mean = function (a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; }, m0 = mean(base);
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
  function vl(s16, dyn) { return Math.pow(PHI, -depth(s16) * (RPN.c || 1)) * (dyn || 1); }
  // FORM (MIDI Bot directions, approved Danny 14:48): the B section (the genre's other progression) runs from PHI^-2 of the track
  // through the peak to the end of the breakdown; the motif rises a scale degree each phrase (SPB bars) and starts again each section;
  // at the peak (e > 1 - PHI^-3) odd bars may take an axis substitute (root +-3 or +6 semitones, cited: Lendvai's axis system,
  // https://en.wikipedia.org/wiki/Axis_system) and the kick plays the additive 3+3+2 grouping (cited: Bartok, Bulgarian additive metre,
  // https://en.wikipedia.org/wiki/Additive_rhythm_and_divisive_rhythm); the last bar of each phrase gets a fill.
  var AXIS = [3, -3, 6], K332 = [0, 6, 12];                               // cite: axis substitutes (minor third, tritone); 3+3+2 eighths in sixteenths
  // ===== RHYTHM + DYNAMICS (MIDI Bot rhythm study, Danny 19:18 AWST 26 Oct: 'send the rhythm and reload fix') =====
  // Each bar rplan() draws a rhythm plan from the track's birth dims, the arc energy and its own phi pump (dj:rhy): the genre's home
  // pattern competes with cited anchors (weights PHI^(-PHI^2 k / D), D = PHI^(PHI^2 tension)), running notes thin toward the phrase
  // start, per-voice rests from space, a stop before the phrase's downbeat (chance drive), slam downbeat x PHI, accent contrast
  // PHI^-1..PHI, trap hat rolls, laid-back offset, ghost snares, kick sidechain on bass + pad. Energy goes into the drums, never into
  // running 8ths. Open dials at mid-range (RD). Transitions (dj-fx.js) untouched.
  // Anchors: Pocket Operations rev 3.1 (P. Wenzel 2024), 16-step grids, 1-indexed steps as printed. CH -> soft hat 'o', OH -> loud hat 'x'.
  var PO = {
    trapA: { BD: [1, 7, 13], SN: [9], CH: [1, 3, 5, 7, 9, 11, 13, 15] }, trapB: { BD: [3, 5], SN: [9], CH: [3, 5, 7, 9, 11, 15] },
    hh1A: { BD: [1, 7, 8, 12, 15], SN: [5, 13] }, hh1B: { BD: [1, 8, 12], SN: [5, 13] },
    hh3A: { BD: [1, 3, 9, 11], SN: [5, 13] }, hh3B: { BD: [1, 3, 9, 10, 12], SN: [5, 13] },
    impeach: { BD: [1, 8, 9, 15], SN: [5, 13], CH: [1, 3, 5, 7, 8, 9, 13, 15], OH: [11] },
    funky: { BD: [1, 3, 7, 11, 14], SN: [5, 8, 10, 12, 13, 16], AC: [5, 13], CH: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 15, 16], OH: [8, 14] },
    amenA: { BD: [1, 3, 11, 12], SN: [5, 8, 10, 13, 16], CH: [1, 3, 5, 7, 9, 11, 13, 15] }, amenB: { BD: [1, 3, 11, 12], SN: [8, 10, 13, 16], CH: [1, 3, 5, 7, 9, 11, 13, 15] },
    dnb1A: { BD: [1, 4, 8, 10, 11, 16], SN: [5, 13], CH: [1, 3, 5, 7, 9, 11, 13, 15] }, dnb1B: { BD: [1, 3, 8, 9, 10, 11], SN: [5, 13], CH: [1, 3, 5, 7, 9, 11, 13, 15] },
    techno: { BD: [1, 5, 9, 13, 15], SN: [5, 13], CH: [10], OH: [3, 7, 11, 15] }, house: { BD: [1, 5, 9, 13], SN: [5, 13], OH: [3, 7, 11, 15] },
    dubA: { BD: [1, 11], SN: [9], CH: [2, 3, 7, 12, 15], OH: [5, 14] }, dubB: { BD: [1, 4, 7, 11], SN: [9], CH: [2, 3, 7, 12, 15], OH: [5, 14] }
  };
  var PAIRS = [['trapA', 'trapB'], ['hh1A', 'hh1B'], ['hh3A', 'hh3B'], ['impeach', 'impeach'], ['funky', 'funky'], ['amenA', 'amenB'], ['dnb1A', 'dnb1B'], ['techno', 'techno'], ['house', 'house'], ['dubA', 'dubB']];
  var GHOST = [2, 5, 8, 13, 16], GHOST_AC = [5, 13];                      // Pocket Operations 'Ghost Snare 2 - A' (accents 5, 13)
  function poStr(a) { var s = []; for (var i = 0; i < 16; i++) s.push('.'); var o = { kick: s.slice(), snare: s.slice(), hat: s.slice() };
    (a.BD || []).forEach(function (n) { o.kick[n - 1] = 'x'; }); (a.SN || []).forEach(function (n) { o.snare[n - 1] = a.AC && a.AC.indexOf(n) < 0 ? 'o' : 'x'; });
    (a.CH || []).forEach(function (n) { o.hat[n - 1] = 'o'; }); (a.OH || []).forEach(function (n) { o.hat[n - 1] = 'x'; });
    return { kick: o.kick.join(''), snare: o.snare.join(''), hat: (a.CH || a.OH) ? o.hat.join('') : null }; }
  var LHLW = [0, -4, -3, -4, -2, -4, -3, -4, -1, -4, -3, -4, -2, -4, -3, -4];   // cite: Longuet-Higgins & Lee (1984) metrical weights, 4/4 in sixteenths
  function lhlOf(mask) { if (!mask) return 0; var s = 0; for (var i = 0; i < 16; i++) { if ((mask >> i) & 1) continue; var j = (i + 15) % 16; while (!((mask >> j) & 1)) j = (j + 15) % 16; if (LHLW[i] > LHLW[j]) s += LHLW[i] - LHLW[j]; } return s; }
  function maskOf(p) { var m = 0; if (p) for (var i = 0; i < 16; i++) if (p[i % p.length] !== '.') m |= 1 << i; return m; }
  function coords(p) { var u = maskOf(p.kick) | maskOf(p.snare) | maskOf(p.hat) | maskOf(p.shaker) | maskOf(p.tom), n = 0; for (var i = 0; i < 16; i++) if ((u >> i) & 1) n++;
    return { drive: n / 16, sync: lhlOf(maskOf(p.kick) | maskOf(p.snare)) }; }
  var ANCH = PAIRS.map(function (pr) { var A = poStr(PO[pr[0]]), B = poStr(PO[pr[1]]); return { n: pr[0], A: A, B: B, c: coords(A), half: PO[pr[0]].SN.length === 1 && PO[pr[0]].SN[0] === 9 }; });
  var SYMAX = Math.max.apply(null, ANCH.map(function (a) { return a.c.sync; })) || 1; ANCH.forEach(function (a) { a.c.sync /= SYMAX; });
  var RD = { vary: 1 / 2, energy: 0, reach: 1 / 2, rest: 1 / 2, stop: 1 / 2, contrast: 1 / 2, roll: 1 / 2, laid: 1 / 2, ghost: 1 / 2 };   // open dials, each at mid-range
  var RPN = {}, rP = null, RANK = { 'drum:hat': 0, 'drum:shaker': 0, chords: 1, bass: 1, 'drum:tom': 1, 'drum:snare': 2, 'drum:kick': 2, lead: 3 };
  function rpump(t) { var P = window.PhiPumps; if (!rP) rP = P && P.node ? P.node('dj:rhy', 3, PHI * PHI, IPH, P.page, 13) : { modes: function (x) { return Math.sin(2 * Math.PI * x / Math.pow(PHI, PHI * PHI)); } };
    return clamp(rP.modes(pumpAt(t)), -1, 1); }
  function gold(tk, n, k) { return frac((n + 1) * IPH + (tk.seed | 0) * IPH * IPH + k * Math.pow(IPH, 3)); }   // golden-sequence draw, stream k
  function rplan(tr, t) {
    var st = tr.step, s16 = st % 16, bar = Math.floor(st / 16); if (tr.rp && tr.rp.bar === bar) { RPN = tr.rp; return; }
    var dm = tr.dm || { drive: 1 / 2, density: 1 / 2, space: 1 / 2, tension: 1 / 2 }, e = tr.e == null ? 1 : tr.e, pm = rpump(t);
    var drv = clamp(dm.drive + RD.energy * IPH + pm * IPH * IPH, 0, 1);                                  // pumps + energy dial + the rhythm pump's crossfade
    var spc = clamp(dm.space + (1 - e) * IPH - pm * IPH * IPH, 0, 1);                                   // more space as the arc falls (breakdown, intro)
    var cc = colC(), mb = colM(arc(ageOf(tr, t))), o = clamp(DIAL.colD * cc * mb * (1 - spc) * DIAL.colW, 0, 1); COL.c = cc; COL.o = o;   // djcollide (a): on this bar's own arc (tr.e is last bar's here)
    var phr = bar - (tr.secBar || 0), bl = SPB - 1 - (((phr % SPB) + SPB) % SPB), D = Math.pow(PHI, PHI * PHI * dm.tension);
    var p = { bar: bar, drv: drv, spc: spc, rest: {} };
    // anchor: drawn on the even bar of each pair, B variant on the odd bar; home (the genre's own pattern) competes with a reach bonus
    var prev = tr.rp;
    var hold = prev && prev.an && bar % 2 === 0 && gold(tr, bar, 3) < IPH * (1 - dm.tension) * 2 * (1 - RD.vary);   // repeat the last pair: less as tension rises
    if (hold) { p.an = prev.an; p.pat = prev.an.A; p.ps = prev.ps; }
    else if (!prev || bar % 2 === 0 || !prev.an) { p.ps = bar;
      var home = { n: 'home', A: tr.dr || tr.g, B: (tr.g.own && tr.g.alt) || tr.dr || tr.g, c: coords(tr.dr || tr.g) }; home.c.sync /= SYMAX;
      var opt = tr.g.own ? [home] : [home].concat(ANCH), w = opt.map(function (a) { var k = Math.abs(drv - a.c.drive) + Math.abs(dm.tension - a.c.sync); if (a === home) k = Math.max(0, k - (1 - RD.reach)); return Math.pow(PHI, -PHI * PHI * k / D); });
      var sum = w.reduce(function (a, b) { return a + b; }, 0), x = gold(tr, bar, 1) * sum, an = opt[opt.length - 1];
      for (var i = 0; i < opt.length; i++) { x -= w[i]; if (x <= 0) { an = opt[i]; break; } }
      p.an = an; p.pat = an.A;
    } else { p.an = prev.an; p.pat = prev.an.B; p.ps = prev.ps; }
    p.kmask = maskOf(p.pat.kick); p.smask = maskOf(p.pat.snare);
    // density target for running (off-anchor) notes: rises through the phrase (PHI^-1 per bar left), from density against space
    p.x = clamp(Math.pow(PHI, -bl * IPH) * (IPH + (dm.density - spc) * IPH), 0, 1);
    // per-voice rests for this bar: space x PHI^-(rank+1) x rest dial (x2 at mid = 1)
    Object.keys(RANK).forEach(function (k, vi) { p.rest[k] = gold(tr, bar, 2 + vi) < spc * Math.pow(PHI, -RANK[k] - 1) * 2 * RD.rest; });
    if (p.rest.lead && p.rest.chords && p.rest.bass) p.rest.lead = false;                               // something always sings
    // stop before the hit: the last bar of a phrase, chance drive x stop dial (x2 at mid), length SPB x PHI^(2 drive - 1) sixteenths
    p.stop = bl === 0 && gold(tr, bar, 11) < drv * 2 * RD.stop; p.L16 = clamp(Math.round(SPB * Math.pow(PHI, 2 * drv - 1)), 2, 8);
    p.slam = prev && prev.stop && prev.bar === bar - 1;
    p.c = Math.pow(PHI, (2 * drv - 1) * 2 * RD.contrast) * Math.pow(PHI, o);                           // accent contrast exponent PHI^-1 .. PHI; djcollide x PHI^o
    p.roll = p.an.half && gold(tr, bar, 12) < dm.tension * 2 * RD.roll * (1 + o * PHI) && bar % 2 === 1; p.rollN = gold(tr, bar, 13) < 1 / 2 ? 2 : 3;   // trap hat rolls: 32nds or 16th-note triplets on the last beat
    p.lb = (SPM / tr.bpm) * Math.pow(PHI, -5) * clamp(spc * (1 - drv) * 2 * RD.laid * 2, 0, 1);       // laid-back snare/comp: up to a beat x PHI^-5 (Danielsen: 8-12% of a quarter)
    p.ghost = (1 - drv) * dm.density * 2 * RD.ghost; p.ghost += o * Math.max(0, 1 - p.ghost); p.o = o;  // ghost-note layer level share (djcollide: + o)
    p.dk = Math.pow(PHI, -2 * drv);                                                                     // duck depth on each kick
    var d16 = SPM / tr.bpm / SPB;
    if (tr.dk && p.stop) { var ts = t + (16 - p.L16) * d16, td = t + 16 * d16; tr.dk.gain.setTargetAtTime(Math.pow(PHI, -4), ts, Math.pow(PHI, -7)); tr.dk.gain.setTargetAtTime(1, td - Math.pow(PHI, -8), Math.pow(PHI, -8)); }
    tr.rp = p; RPN = p;
  }
  function RQ(part, tk, t, v, m, d) {
    var p = tk && tk.rp; if (!p) return v; var s16 = tk.step % 16, d16 = SPM / tk.bpm / SPB;
    if (p.stop && s16 >= 16 - p.L16) return 0;
    if (p.rest[part]) return 0;
    if ((part === 'chords' || part === 'bass') && d < d16 * SPB) {
      var on = part === 'bass' ? p.kmask : p.kmask | p.smask;
      if (!((on >> s16) & 1) && gold(tk, (p.ps || 0) * 16 + s16 + 16 * (p.bar % 2), part === 'bass' ? 21 : 22) >= p.x * (part === 'bass' ? IPH : 1)) return 0;
    }
    if (p.slam && s16 === 0 && part !== 'lead') v *= PHI;
    return v;
  }
  function RPAT(tr, k, home) { var p = tr.rp; if (!p || !p.pat) return home; if (k === 'kick' || k === 'snare') return p.pat[k] || home; if (k === 'hat') return p.pat.hat || home; return home; }
  function rduck(tk, t) { if (!tk.dk || !tk.rp) return; var b = SPM / tk.bpm; tk.dk.gain.setTargetAtTime(tk.rp.dk, t, Math.pow(PHI, -7)); tk.dk.gain.setTargetAtTime(1, t + Math.pow(PHI, -6), b * Math.pow(PHI, -1 - tk.rp.drv)); }
  function hitW(x) { return function (L, k, t, v, a) { if (!chOn('drums')) return; var tk = L.tk || L, p = tk.rp, q = RQ('drum:' + k, tk, t, v, 0, 0); if (!(q > 0)) return; act('drums', t, q);
    var d16 = SPM / tk.bpm / SPB, s16 = tk.step % 16;
    if (p && k === 'snare') t += p.lb;
    if (k === 'kick') rduck(tk, t);
    if (p && k === 'hat' && p.roll && s16 >= 12) { if (p.rollN === 2) { x.hit(L, k, t, q * IPH); x.hit(L, k, t + d16 / 2, q); } else if (s16 % 4 === 0) { for (var j = 0; j < 6; j++) x.hit(L, k, t + j * d16 * SPB / 6, q * Math.pow(PHI, -(5 - j) * IPH * IPH)); } return; }
    x.hit(L, k, t, q, a);
    if (p && k === 'snare' && s16 % 4 === 0 && p.ghost > 0) { /* ghost layer is scheduled per step below */ }
  }; }
  function ghostStep(tr, t) { var p = tr.rp, s16 = tr.step % 16; if (!p || !p.smask || !X || !X.hit || p.rest['drum:snare'] || !(p.ghost > 0)) return; if (p.stop && s16 >= 16 - p.L16) return;
    if (GHOST.indexOf(s16 + 1) >= 0 && GHOST_AC.indexOf(s16 + 1) < 0 && !((p.smask >> s16) & 1) && gold(tr, tr.step, 31) < p.ghost) X.hit(tr.L.drums, 'snare', t, Math.pow(PHI, -3)); }

  function playStep(tr, t) { rplan(tr, t);
    var g = tr.g, st = tr.step, s16 = st % 16, bar = Math.floor(st / 16), dur16 = 60 / tr.bpm / 4, v;
    var a0 = ageOf(tr, t), secB = a0 >= IPH * IPH && a0 < IPH + Math.pow(PHI, -3), pr = secB && tr.progB ? tr.progB : tr.prog;
    if (s16 === 0 && secB !== tr.secB) { tr.secB = secB; tr.secBar = bar; }
    var slot = Math.max(SPB * SPB / 2, Math.round(SPB * SPB * (tr.hb || g.bars))), ci = Math.floor(st / slot);   // unit: sixteenths per chord (half a bar at the fastest)
    var deg = pr[ci % pr.length], barLen = dur16 * slot, first = st % slot === 0;
    if (s16 === 0 || tr.e == null) shape(tr, t, barLen);
    var peak = tr.e > 1 - Math.pow(PHI, -3), phr = bar - (tr.secBar || 0), fill = (phr % SPB) === SPB - 1, rise = Math.floor(phr / SPB) % SPB;   // unit: phrase = SPB bars, rise cycles through SPB degrees
    if (first) tr.ax = peak && !tr.bridge && !tr.leaving && ci % 2 && tr.r() < clamp(IPH * Math.pow(PHI, 2 * (tr.dm ? tr.dm.tension : 1 / 2) - 1), 0, 1) ? AXIS[Math.floor(tr.r() * AXIS.length)] : 0;
    var dyn = 1; if (tr.node) try { dyn = tr.node.out(pumpAt(t)); } catch (e) {}      // mix: routed pump-tree dynamics (around 1)
    // CALL AND RESPONSE BETWEEN PARTS (Danny 17:43 AWST 27 Oct, 'Go'): the lead's 64-step motif is a 2-bar call and its 2-bar answer
    // (the call inverted); in PHI^-1 of phrases (DIAL.resp, a coupling; golden draw per phrase) another voice gives the answer in its
    // own register (the genre's resp / ro), and the arp drops to the beat while it does, to leave it room. Otherwise the lead answers itself.
    var ans = st % 64 >= 32 && g.resp && INST[g.resp] && gold(tr, Math.floor(st / 64), 50) < DIAL.resp, room = ans && chOn('answer');   // room: the arp leaves space only for an answer that sounds
    var bx = tr.bx, bs = null; if (bx && t >= bx.start - dur16 / 2) bs = t >= bx.drop - dur16 / 2 ? bx.home : bx.segs[clamp(Math.floor((t - bx.start + dur16 / 2) / bx.bar), 0, bx.segs.length - 1)];   // the bridge owns the harmony
    if (bs && bs !== tr.bxSeg) { tr.bxSeg = bs; first = true; tr.ch = voicePcs(tr, bs.pcs); }
    if (first && !bs && tr.scHi) tr.scNow = frac((ci + 1) * IPH + (tr.seed | 0) * IPH * IPH) < tr.mf ? tr.scHi : tr.scLo;   // this chord's mode: the sharper neighbour for a share mf of chords
    var ch = bs ? tr.ch : first || !tr.ch ? (tr.ch = voiced(tr, deg).map(function (n) { return n + (tr.ax || 0); })) : tr.ch, root0 = bs ? nearRoot(tr, bs.root) : chordNotes(tr.scNow || tr.sc, tr.root, deg, 0)[0] + (tr.ax || 0);
    // chords
    if (g.chords === 'pad' && first) ch.forEach(function (n) { pl('chords', INST.pad, tr.L.pad, n + 12, t, barLen, Math.sqrt(3 / ch.length))   /* organ fix (a): equal-power chord count, the triad voiced() starts from over n notes, like voice()'s vel / sqrt(copies) */; });
    if ((g.chords === 'strum' || g.chords === 'stab' || g.chords === 'ep') && g.steps.indexOf(s16) >= 0)
      ch.forEach(function (n, k) { var inst = (g.ci && INST[g.ci]) || (g.chords === 'ep' ? INST.ep : g.chords === 'stab' ? INST.stab : null) || INST.pluck; pl('chords', inst, tr.L.chords || tr, n + 12, t + (g.chords === 'strum' ? k * dur16 * Math.pow(PHI, -4) : 0), dur16 * (g.chords === 'ep' ? 5 : 2), vl(s16, dyn) * Math.sqrt(3 / ch.length)); });   // phi: strum spread PHI^-4 of a sixteenth; ci: the genre's own chord synth (electro: Ed's Jupiter)
    if (g.chords === 'arp' && s16 % 2 === 0) { var an = ch.concat([ch[0] + 12]); pl('chords', INST.piano || INST.pluck, tr.L.chords || tr, an[(s16 / 2) % an.length] + 12, t, dur16 * 2, vl(s16, dyn)); }
    if (g.arp && INST.square) { var a2 = ch.concat([ch[0] + 12, ch[1] + 12]), cb = chipNote(tr, t), ai = g.ai && INST[g.ai];   // ai: the genre's own arp synth (electro: Ed's Juno), in place of the chip blips
      if (!(room && s16 % SPB)) pl('chords', ai || (cb ? INST.square : INST.pluck), tr.x, a2[s16 % a2.length] + 24, t, dur16 * (cb && !ai ? IPH * IPH : IPH), cb && !ai ? 0.45 : IPH); }
    if (g.under && first && INST[g.under]) ch.forEach(function (n) { pl('chords', INST[g.under], tr.L.pad, n + 12, t, barLen, IPH * Math.sqrt(3 / ch.length)); });   // under: a pad under the stabs (electro: Ed's Juno), equal power over the chord   // phi: blips short, the plucked ones a little longer and softer
    if (g.ost && s16 % 2 === 0 && INST.stab) pl('chords', INST.stab, tr.x, ch[s16 % 4 === 0 ? 0 : 2] + 12, t, dur16 * 1.6, 0.7);
    // bass
    var bn = root0 - 12;
    if (g.bass === 'hold' && first) pl('bass', INST.bass, tr.L.bass, bn, t, barLen * 0.9, vl(s16, dyn));
    if (g.bass === 'roots' && (s16 === 0 || s16 === 8)) pl('bass', INST.bass, tr.L.bass, s16 ? ch[2 % ch.length] - 12 : bn, t, dur16 * 6, vl(s16, dyn));
    if (g.bass === 'walk' && [0, 3, 6, 8, 11, 14].indexOf(s16) >= 0) pl('bass', INST.bass, tr.L.bass, s16 === 0 ? bn : ch[[0, 1, 2, 1, 2, 0][[0, 3, 6, 8, 11, 14].indexOf(s16)]] - 12, t, dur16 * 2, vl(s16, dyn));
    if (g.bass === 'eighths' && s16 % 2 === 0) pl('bass', INST.bass, tr.L.bass, bn, t, dur16 * 1.5, vl(s16, dyn));
    if (g.bass === 'octave' && s16 % 2 === 0) pl('bass', INST.bass, tr.L.bass, bn + (s16 % 4 ? 12 : 0), t, dur16 * 1.5, vl(s16, dyn));
    if (g.bass === 'acid') acidStep(tr, t, s16, bn, dur16, dyn);
    // melody (Dad's tune): motif from the seed, a note shifted now and then
    var md = tr.mel[st % tr.mel.length]; if (md != null) md += rise; var lsc = tr.bd ? (g.scale === 'lydian' || tr.genre === 'cinematic' ? COLOUR.whole : g.scale === 'major' ? COLOUR.penta : COLOUR.penta_m) : tr.scNow || tr.sc, ln = lsc.length;
    if (md != null && INST[g.lead]) { if (tr.r() < 0.12) md += tr.r() < 0.5 ? 1 : -1; var li = g.lead === 'square' && !chipNote(tr, t) ? (INST.reed || INST.pluck) : INST[g.lead], lk = g.lead, lo = 0;
      if (ans) { li = INST[g.resp]; lk = g.resp; lo = g.ro || 0; }                        // the answer goes to the responding voice, in its own register
      pl('lead', li, ans ? tr.L.answer : tr.L.lead, tr.root + lsc[md % ln] + 12 * Math.floor(md / ln) + 12 + lo, t, dur16 * (lk === 'horn' || lk === 'bell' || lk === 'dx' ? 6 : 2), 0.8); }
    // drums
    if (X && X.hit && peak && (tr.dr || g).kick && K332.indexOf(s16) >= 0) { var kv = vl(s16, dyn); X.hit(tr.L.drums, 'kick', t, kv); kD(tr, t); rec('drums', GM.kick, t, dur16, kv * gAt(tr, t)); }   // 3+3+2 kick at the peak
    if (X && X.hit && fill && ((tr.dr || g).snare || (tr.dr || g).tom) && s16 >= 16 - SPB) { var fv = Math.pow(PHI, -(16 - s16)) * PHI * (dyn || 1), fk = s16 % 2 ? 'snare' : 'tom'; X.hit(tr.L.drums, fk, t, fv); rec('drums', GM[fk], t, dur16, fv * gAt(tr, t)); }   // phi: fill rising a rung per sixteenth on the last beat
    if (X && X.hit) ['kick', 'snare', 'clap', 'hat', 'shaker', 'tom', 'cow'].forEach(function (k) { if (k === 'kick' && peak) return; if (fill && s16 >= 16 - SPB && (k === 'snare' || k === 'tom')) return; var pat = RPAT(tr, k, (tr.dr || g)[k]); if (pat && (v = pat[(s16 + (tr.shift || 0)) % pat.length]) !== '.') { var hv = vl(s16, dyn) * (v === 'x' ? 1 : IPH); X.hit(tr.L.drums, k, t, hv, v); if (k === 'kick') kD(tr, t); rec('drums', GM[k], t, dur16, hv * gAt(tr, t)); } });   // drums fade with the crossfade too (MIDI Bot review);   // phi: soft hits a rung down
    ghostStep(tr, t); if (s16 % 4 === 0) beat(t, s16 === 0);
    if (s16 === 0 && !tr.leaving) recBar(tr, t, st);                     // the live track's downbeat, for the .mid's bar lines
  }
  // ---------- note log for the MIDI export (Danny 14:48 AWST 26 Oct): the last minute of what played, pruned by wall time ----------
  // Each entry is [wall ms, part, MIDI note, velocity 0..1, seconds]; at most a minute of steps, a few KB. js/dj-midi.js writes it on tap.
  var NL = [], ccOld = {}, WIN = SPM * MS;                                            // unit: one minute
  function kD(tr, t) { var F = window.DadAutoDJ && DadAutoDJ.fx; if (!tr.leaving && F && F.kick) F.kick(t); }   // the incoming track's kicks duck the throw's tail (delay-throw push 4)
  var GM = { kick: 36, snare: 38, clap: 39, hat: 42, shaker: 82, tom: 45, cow: 56 };
  // ---------- THE MIXER (Danny 18:12-18:15 AWST 27 Oct, Claude chat: 'I want a mute and solo button like a desk and an effects send';
  // 'Build everything else except the animation') ----------
  // Eight channels. MUTE / SOLO are switches: a muted (or soloed-out) channel's notes are not played at all (no gain at zero), not logged
  // to the .mid, and the arp only makes room for an answer that sounds. Solo latches on more than one channel, as on a desk. Each
  // channel's layer has an echo and a wash send (couplings into js/dj-fx.js's delay loop and convolver, on a golden ladder from off; 0 =
  // the mix as before), taken after the track's crossfade. No volume fader (THE RULE). Rack boxes (808, 303, DX7, Jupiter, Juno units)
  // have their own mute / solo, read by js/dj-extras.js; a box mute leaves its channel's sends alone. Meters: the notes each channel
  // played in the last beat (velocity sum), read by the desk once a beat. All saved with the DJ (mx).
  var CHS = ['drums', 'bass', 'chords', 'arp', 'pad', 'lead', 'answer', 'voice'];
  var SENDL = [0, Math.pow(PHI, -4), Math.pow(PHI, -3), Math.pow(PHI, -2), IPH, 1];   // phi: send rungs, off .. full
  var MX = { m: {}, s: {}, e: {}, w: {}, b: {} }, MX0 = JSON.stringify(MX), AQ = {}, FXS = null;
  function chOn(ch) { var any = false, k; for (k in MX.s) if (MX.s[k]) { any = true; break; } return any ? !!MX.s[ch] : !MX.m[ch]; }
  function chOf(part, tr) { return tr && tr.ch || (part === 'bass' ? 'bass' : part === 'lead' ? 'lead' : part === 'drums' ? 'drums' : 'chords'); }
  function sendV(ch, k) { var i = (k === 'e' ? MX.e : MX.w)[ch] | 0; return Math.max(1e-4, SENDL[clamp(i, 0, SENDL.length - 1)]); }
  function act(ch, t, v) { var q = AQ[ch] || (AQ[ch] = []), now = ctx ? ctx.currentTime : 0; q.push(t, v); while (q.length && q[0] < now - PHI * PHI) q.splice(0, 2); }   // phi: keep PHI^2 s
  function chMeter(ch) { var q = AQ[ch], now = ctx ? ctx.currentTime : 0, tr = tracks.filter(function (x) { return !x.dead && !x.leaving; })[0], bt = tr ? SPM / tr.bpm : IPH, sum = 0, i;
    if (q) for (i = 0; i < q.length; i += 2) if (q[i] <= now && q[i] > now - bt) sum += q[i + 1];
    return 1 - Math.pow(PHI, -sum * PHI); }                               // phi: a soft ceiling, one PHI-loud note reads ~0.7
  function boxOn(rack, u) { var b = MX.b[rack]; if (!b) return true; var any = b.s && b.s.some(function (x) { return x; }); return any ? !!b.s[u] : !(b.m && b.m[u]); }
  function layers(tr) { var o = []; if (tr.L) Object.keys(tr.L).forEach(function (k) { o.push(tr.L[k]); }); if (tr.x) o.push(tr.x); return o; }
  function resend() { var t = ctx ? ctx.currentTime : 0; tracks.forEach(function (tr) { layers(tr).forEach(function (L) { if (!L.se) return;
    L.se.gain.setTargetAtTime(sendV(L.ch, 'e'), t, Math.pow(PHI, -3)); L.sw.gain.setTargetAtTime(sendV(L.ch, 'w'), t, Math.pow(PHI, -3)); }); }); }   // phi: glide PHI^-3 s
  function fxSends(tr) { if (!FXS || !tr.sE || tr.sOn) return; try { tr.sE.connect(FXS.echo); tr.sW.connect(FXS.wash); tr.sOn = true; } catch (e) {} }       // cite: General MIDI Level 1 percussion key map (channel 10)
  function rec(part, m, t, d, v) {
    if (part === 'drums' && !chOn('drums')) return;                      // a muted channel stays out of the .mid
    var w = Date.now() + (t - ctx.currentTime) * MS; NL.push([w, part, m, v, d]);
    while (NL.length && NL[0][0] < w - WIN - SPM * MS / SPB) { var ex = NL.shift(); if (ex[1] === 'cc') ccOld[ex[2]] = ex; }   // keep a little over a minute (look-ahead slack)
  }
  function recCC(n, v) { NL.push([Date.now(), 'cc', n, clamp(v, 0, 1), 0]); }   // transition sweeps for the .mid (controller n, value 0..1)
  // BAR LINES (Danny 12:20 AWST 27 Oct, Claude chat: 'Yes' to the .mid starting on the DJ's own bar line): each downbeat of the live track
  // is logged as [wall ms, 'bar', bpm, track id, step]; js/dj-midi.js puts every one of them on a bar line of the file
  var BID = 0;
  function recBar(tr, t, st) { NL.push([Date.now() + (t - ctx.currentTime) * MS, 'bar', tr.bpm, tr.bid || (tr.bid = ++BID), st]); }
  function dropBars(w) { for (var i = NL.length - 1; i >= 0; i--) if (NL[i][1] === 'bar' && NL[i][0] >= w) NL.splice(i, 1); }   // a handover: the outgoing track's look-ahead downbeats from w on give way to the new track's grid
  // ACID LINE (Danny 15:42 AWST 27 Oct, Claude chat: the 303s 'build them both'; 16:0x DeepSeek review he relayed, my answer: a 303 needs
  // its own step pattern, not the melody maker). The 303 idiom: one 16-step line per track from its seed (golden draws), monophonic,
  // root-heavy with octave jumps, fifths, minor thirds and flat sevenths, slides on about PHI^-4 of the steps, accents mostly off the
  // beat; transposed with the chord's root every bar. The odd bar is the same line with two steps changed (almost-repeat). Each step
  // has a rank: the line fills in as the energy arc rises (PHI^-2 of the steps at the floor up to 1 - PHI^-3 at the peak); the
  // downbeat always plays. Rests and stops come from the rhythm plan (p.rest.bass, p.stop) but not its density gate, so the pattern
  // keeps its shape. Played by the 303 rack in js/dj-extras.js (X.acid); before that lands, by the plain bass voice, same line.
  var ACID_IV = [0, 0, 0, 12, 12, 7, 3, 10, 5, -2];                       // unit: semitones over the chord root (root-heavy acid idiom)
  function acidPat(tr) {
    if (tr.ac) return tr.ac; var A = [];
    for (var i = 0; i < 16; i++) { var a = gold(tr, i, 42);
      A.push({ iv: i ? ACID_IV[Math.floor(gold(tr, i, 41) * ACID_IV.length)] : 0, rank: i ? gold(tr, i, 40) : 0, acc: i % 2 ? a < IPH * IPH : a < Math.pow(IPH, 4), slide: gold(tr, i, 43) < Math.pow(IPH, 4) }); }   // phi: accents PHI^-2 off the beat, PHI^-4 on it; slides PHI^-4
    var B = A.map(function (x) { return { iv: x.iv, rank: x.rank, acc: x.acc, slide: x.slide }; });
    [44, 45].forEach(function (k) { var j = 1 + Math.floor(gold(tr, 0, k) * 15); B[j].iv = ACID_IV[Math.floor(gold(tr, 1, k) * ACID_IV.length)]; B[j].acc = !B[j].acc; });
    return (tr.ac = { A: A, B: B, wave: gold(tr, 2, 46) < IPH * IPH ? 'square' : 'sawtooth' });   // phi: a square-wave line on PHI^-2 of tracks
  }
  function acidStep(tr, t, s16, bn, dur16, dyn) {
    var P = acidPat(tr), pat = Math.floor(tr.step / 16) % 2 ? P.B : P.A, st = pat[s16], p = tr.rp, e = tr.e == null ? 1 : tr.e;
    var dn = IPH * IPH + (1 - IPH * IPH - Math.pow(IPH, 3)) * e, nx = pat[(s16 + 1) % 16];
    if (st.rank >= dn || !chOn('bass') || (p && (p.rest.bass || (p.stop && s16 >= 16 - p.L16)))) { tr.acFrom = null; return; }
    var m = bn + st.iv, v = vl(s16, dyn) * (st.acc ? 1 : IPH), slide = st.slide && nx.rank < dn, d = dur16 * (slide ? 1 + Math.pow(IPH, 6) : IPH);   // phi: a held slide just outlasts its step, a plain note is PHI^-1 of it
    act('bass', t, v); if (X && X.acid) X.acid(tr.L.bass, { m: m, t: t, step: dur16, acc: st.acc, slide: slide, from: tr.acFrom, v: v, e: e, wave: P.wave });
    else INST.bass(tr.L.bass, mtof(m), t, d, v);
    tr.acFrom = slide ? m : null;
    if (VH) try { VH('bass', tr.L.bass, m, t, d, v); } catch (er) {}
    rec('bass', m, t, d, v * gAt(tr, t));
  }
  function pl(part, inst, tr, m, t, d, v) { var ch = chOf(part, tr); if (!chOn(ch)) return; var q = RQ(part, tr.tk || tr, t, v, m, d); if (!(q > 0)) return; v = q; act(ch, t, v); if (part === 'chords' && (tr.tk || tr).rp && d < SPM / (tr.tk || tr).bpm) t += (tr.tk || tr).rp.lb; inst(tr, mtof(m), t, d, v); if (VH) try { VH(part, tr, m, t, d, v); } catch (e) {} rec(part, m, t, d, v * gAt(tr.tk || tr, t)); }   // VH: the voice hears the notes   // logged at the track's crossfade level
  var TL = [];                                                            // tempo map for the export: [wall ms, bpm] when a track takes over (crossfade midpoint)
  function stepLen(tr) { var d = SPM / tr.bpm / SPB, sw = Math.pow(PHI, -3) * tr.u; return tr.step % 2 ? d * (1 - sw) : d * (1 + sw); }   // phi: golden swing x drive

  // ---------- scheduler (look-ahead) ----------
  var tracks = [], sched = 0;
  // ONE CLOCK (MIDI Bot pump-mapping sweep #1): a single timer every PHI^-6 s (inside the PHI^-4 s look-ahead) runs the scheduler and,
  // as phases on it, every periodic job of the DJ (panel paint, loudness ref, beat LED, js/dj-fx.js knobs, rolls and CC log, needles).
  var JOBS = [], clk = 0;
  function every(fn, ms) { var j = { fn: fn, ms: ms, due: Date.now() + ms }; JOBS.push(j); if (!clk) clk = setInterval(oneClock, Math.pow(PHI, -6) * MS); return j; }   // phi: the clock period
  function never(j) { if (j) j.off = true; }
  function oneClock() {
    var now = Date.now(); if (sched) tick();
    for (var i = 0; i < JOBS.length; i++) { var j = JOBS[i]; if (j.off) { JOBS.splice(i--, 1); continue; } if (now >= j.due) { j.due = Math.max(j.due + j.ms, now); try { j.fn(); } catch (e) {} } }
    while (LED.length && LED[0][0] <= now) { var x = LED.shift(); if (led) { if (x[1] < 0) led.classList.remove('on', 'on2'); else led.classList.add(x[1] ? 'on2' : 'on'); } }
  }
  var LED = [];                                                           // beat-LED flashes on the clock: [wall ms, 1 downbeat / 0 beat / -1 off]
  function tick() {
    if (!ctx) return;
    var horizon = ctx.currentTime + Math.pow(PHI, document.hidden ? 3 : -4);   // phi: look PHI^-4 s ahead, PHI^3 s while hidden (throttled timers)
    tracks.forEach(function (tr) {
      if (tr.next < ctx.currentTime - 0.5) tr.next = ctx.currentTime + 0.02;   // resumed after being hidden
      while (tr.next < horizon && !tr.dead) { if (tr.step % 2 === 0) tr.ga = [tr.next, tr.step]; playStep(tr, tr.next); tglide(tr); tr.next += stepLen(tr); tr.step++; }   // ga: audio-clock anchor on an even (unswung) step
    });
  }
  // a tapped tempo glides in: PHI^-3 of the gap per sixteenth (about a bar to settle), the track keeps its place; tr.so keeps the
  // wall-clock step count (jump()) agreeing with the new tempo
  function tglide(tr) { if (!tr.bpmTo) return; var d = tr.bpmTo - tr.bpm; tr.bpm = Math.abs(d) < 0.05 ? tr.bpmTo : tr.bpm + d * Math.pow(PHI, -3);
    if (tr.bpm === tr.bpmTo) tr.bpmTo = 0; tr.so = tr.step - stepsIn((Date.now() - tr.born) / MS, tr.bpm); }
  function retempo() { var c = compute(); tracks.forEach(function (tr) { var b = gBpm(tr.genre, c.bpm); if (!tr.dead && !tr.leaving && Math.abs(tr.bpm - b) > 0.05) tr.bpmTo = b; }); paint(c); save(); }
  function curve(up) { var n = 64, a = new Float32Array(n); for (var i = 0; i < n; i++) { var x = i / (n - 1); a[i] = Math.max(0.0001, up ? Math.sin(x * Math.PI / 2) : Math.cos(x * Math.PI / 2)); } return a; }
  function fadeGain(gn, up, t, len) { try { gn.gain.cancelScheduledValues(t); gn.gain.setValueCurveAtTime(curve(up), t, len); } catch (e) { gn.gain.setTargetAtTime(up ? 1 : 0.0001, t, len / 3); } }

  function fadeTrack(tr, up, t, len) { fadeGain(tr.out, up, t, len); fadeGain(tr.wet, up, t, len); if (tr.sE) { fadeGain(tr.sE, up, t, len); fadeGain(tr.sW, up, t, len); } tr.fd = { t: t, len: len, up: up }; }   // the plan, so the export reads the level at note time
  // MIDI Bot review: the crossfade level when the note sounds (the same sine/cosine curve as fadeGain), not when it was scheduled (up to PHI^3 s earlier in a hidden tab)
  function gAt(tr, t) { var f = tr && tr.fd; if (!f) return tr && tr.out ? Math.min(1, tr.out.gain.value) : 1; var x = clamp((t - f.t) / f.len, 0, 1); return f.up ? Math.sin(x * Math.PI / 2) : Math.cos(x * Math.PI / 2); }
  // ---------- the DJ ----------
  var playing = false, cur = null, fadingUntil = 0, clock = 0, T0 = Date.now(), lastMood = null, genreFlip = 0, setBm = false;
  function startTrack(c, fade, sp, ox) {
    var pre = !sp && ox && ox.pre && GEN[ox.pre.genre] && c.genres.indexOf(ox.pre.genre) >= 0 ? ox.pre : null;   // the bridge already chose the next genre, seed and key (unless a style pick since rules it out)
    var gs = c.genres, genre = sp && GEN[sp.genre] ? sp.genre : pre ? (genreFlip++, pre.genre) : pickG(c, genreFlip++), t = Math.max(ox && ox.at || 0, ctx.currentTime + Math.pow(PHI, -6));   // phi: fade starts PHI^-6 s out (or at the transition's drop)
    var prev = tracks.filter(function (x) { return !x.dead && !x.leaving; })[0];
    var tr = makeTrack(genre, sp && sp.bpm > 0 ? sp.bpm : gBpm(genre, c.bpm), sp && isFinite(sp.seed) ? sp.seed : pre ? pre.seed : (Math.random() * SEEDS) | 0, prev, sp ? sp.root : pre ? pre.root : null, sp && sp.dm, sp && sp.mo);
    if (sp) { tr.born = sp.born; tr.step = stepsIn((Date.now() - sp.born) / MS, tr.bpm); }
    if (ox && ox.at) { tr.next = t; if (!sp) tr.born = Date.now() + (t - ctx.currentTime) * MS; }   // the new track's first bar (and its arc) lands on the drop   // pick up the arrangement where wall-clock time has it
    var old = tracks.filter(function (x) { return !x.dead && !x.leaving; }), len = fade || c.fade;
    if (old[0] && old[0].lastCh) tr.lastCh = old[0].lastCh.slice();      // the first chord is voiced from the outgoing track's last one
    fadeTrack(tr, true, t, len);
    old.forEach(function (o) { o.leaving = true; fadeTrack(o, false, t, len); if (ox && ox.swap) { o.noBass = true; o.L.bass.out.gain.cancelScheduledValues(t); o.L.bass.out.gain.setTargetAtTime(0, t, Math.pow(PHI, -6)); }   // bass swap at the drop
      setTimeout(function () { kill(o); }, (t - ctx.currentTime + len) * 1000 + 300); });
    TL.push([Date.now() + (t - ctx.currentTime) * MS + len * MS / 2, tr.bpm]); while (TL.length > 1 && TL[1][0] < Date.now() - WIN) TL.shift();   // midpoint of the fade from where it starts (the drop on a transition), not the call
    dropBars(Date.now() + (t - ctx.currentTime) * MS);                    // from here the bar lines are the new track's
    tracks.push(tr); fadingUntil = Date.now() + len * 1000; lastMood = c.p.mood;
    return tr;
  }
  function kill(tr) { tr.dead = true; tracks = tracks.filter(function (x) { return x !== tr; }); setTimeout(function () { try { tr.out.disconnect(); tr.wet.disconnect(); tr.rev.disconnect(); if (tr.sE) { tr.sE.disconnect(); tr.sW.disconnect(); } if (tr.lfo) tr.lfo.stop(); } catch (e) {} }, 400); }
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
    var q = pcs.length ? pcs.slice() : [pc(tr.root)]; while (q.length < 3) q.push(q[q.length % (pcs.length || 1)]);   // unit: a triad's 3 voices (a 1-2 tone pedal doubles its tones, so the parts that index ch[2] never read undefined)
    var out = []; q.forEach(function (p) { var n = ref + pc(p - ref); if (n - ref > 6) n -= 12; while (out.indexOf(n) >= 0) n += 12; out.push(n); });   // unit: half octave; doubled tones go an octave up
    return (tr.lastCh = out.sort(function (a, b) { return a - b; }));
  }
  function preProg(genre, seed) { var r = rng(seed), g = GEN[genre]; r(); return g.progs[Math.floor(r() * g.progs.length)]; }   // makeTrack's own draw order
  function preNext(live, mix) {
    var c = compute(), gs = c.genres, fl = genreFlip + (mix != null ? Math.floor(withKnobs(genome(mix)).flip * SPB) : 0), genre = pickG(c, fl), g = GEN[genre];
    var seed = (Math.random() * SEEDS) | 0, root = live && live.sc ? travel(SCALES[g.scale], g.root, live, frac(seed * IPH)) : g.root;
    return { genre: genre, seed: seed, root: root, prog: preProg(genre, seed) };
  }
  function planBridge(live, pre, start, drop) {
    if (!live || !pre) return; var SCn = SCALES[GEN[pre.genre].scale], dur = SPM / live.bpm * SPB * (live.hb || live.g.bars);   // unit: a bar of the live track
    var home = chordNotes(SCn, pre.root, pre.prog[0], 0), hr = pc(home[0]), old = live.sc.map(function (x) { return pc(live.root + x); });
    var tri = function (d) { return chordNotes(SCn, pre.root, d, 0).map(pc); }, inOld = function (ps) { return ps.every(function (p) { return old.indexOf(p) >= 0; }); };
    var piv = null; [1, 3, 5, 0, 4, 2].some(function (d) { var t = tri(d); if (inOld(t) && pc(t[0]) !== hr) { piv = { pcs: t, root: t[0] }; return true; } return false; });   // unit: scale degrees ii, IV, vi, I, V, iii
    var V7 = { pcs: [7, 11, 2, 5].map(function (x) { return pc(hr + x); }), root: pc(hr + 7) };   // cite: dominant seventh on the fifth above the landing root
    var ped = home.map(pc).filter(function (p) { return old.indexOf(p) >= 0; }); if (!ped.length) ped = [hr];
    var n = Math.max(0, Math.round((drop - start) / dur)), segs = !piv || n < 2 ? [{ pcs: ped, root: ped[0] }] : [];
    for (var i = 0; piv && n >= 2 && i < n; i++) segs.push(i < n - 1 ? piv : V7);
    var kD = Math.pow(PHI, PHI * PHI * clamp(live.s == null ? IPH : live.s, 0, 1)), kd = fifths(keySig(SCn, pre.root), keySig(live.sc, live.root)) / kD;   // key travel d / D, as travel() weighs it
    lastBx = live.bx = { start: start, drop: drop, bar: dur, segs: segs, kt: kd, home: { pcs: home.map(pc), root: hr }, pre: pre, plan: segs.map(function (x) { return x === piv ? 'pivot' : x === V7 ? 'V7' : 'pedal'; }) };
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
      var swp = window.DadAutoDJ && DadAutoDJ.fx && DadAutoDJ.fx.autoSweep && DadAutoDJ.fx.autoSweep(), changed = !tr || ((!swp || GPICK) && c.genres.indexOf(tr.genre) < 0) || Math.abs((tr.bpmTo || tr.bpm) - gBpm(tr.genre, c.bpm)) > 0.5 || c.p.mood !== lastMood;
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
    return tr ? { genre: tr.genre, bpm: tr.bpm, seed: tr.seed, born: tr.born, len: tr.trackLen, root: tr.root, dm: tr.dm, mo: tr.mo } : (pend || held); }
  function advance(sp, c) {                                               // whole track lengths that passed while away, then the remainder
    if (!sp || !(sp.len > 0) || !isFinite(sp.born)) return null;
    var age = (Date.now() - sp.born) / MS; if (age < sp.len) return sp;
    var k = Math.floor(age / sp.len), gs = c.genres; genreFlip += k;
    var gk = pickG(c, genreFlip - 1); return { genre: gk, bpm: gBpm(gk, c.bpm), seed: (sp.seed + Math.imul(k, GA)) | 0, born: sp.born + k * sp.len * MS, len: c.trackLen };
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
    if (!sched) { sched = 1; every(function () {}, SPM * MS); } tick();   // the scheduler rides the one clock
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
    tracks.forEach(function (tr) { if (tr.dead || tr.leaving) return; var want = stepsIn((Date.now() - tr.born) / MS, tr.bpm) + (tr.so || 0);
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
    mixSeed = seed; M = withKnobs(genome(seed)); keepTap(); if (seed != null) genreFlip += Math.floor(M.flip * SPB);
    glide(ox);
    if (mixBtn) { mixBtn.classList.remove('is-mixing'); void mixBtn.offsetWidth; mixBtn.classList.add('is-mixing');
      mixBtn.setAttribute('aria-label', 'Random pump mix (now ' + mixName() + '; hold for the default mix)'); }
  }
  function reroll(k) {                                                    // one knob: a random rung (nudge) + a fresh seed for its coupling weights
    var L = LADDER[k]; if (!L) return; var sd = Math.floor(Math.random() * SEEDS), li = L.indexOf(liveOf(k)); if (li < 0) li = L.indexOf('cloud');
    nudge[k] = Math.floor(frac(sd * IPH) * L.length) - li; kseed[k] = sd; M = withKnobs(genome(mixSeed)); keepTap(); glide(); syncChips();
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
  // HEADER RANDOM (Danny 20:22 AWST 26 Oct: the round header button should simply press both panel Random buttons): tap = the pumps
  // section's Random, then the effects section's Random, the same handlers in the same order (open panel: both sections change and
  // flash; closed: the same state changes). Hold (or shift) = both holds, back to live. Until the panel code has loaded, the pumps half
  // is its new pump mix alone (the effects only exist once the sound has started).
  function headRandom(hold) { var KK = window.DadAutoDJ && DadAutoDJ._kit, F = window.DadAutoDJ && DadAutoDJ.fx;
    if (KK && KK.pumpRandom) KK.pumpRandom(hold); else { loadX(); if (hold) remix(null); else nextMix(); }
    if (F && F.random) F.random(hold);
    if (hold && (TAPR !== 1 || TAPB)) { TAPR = 1; TAPB = 0; retempo(); }                     // hold = back to live, the tapped tempo too
    if (mixBtn) { mixBtn.classList.remove('is-mixing'); void mixBtn.offsetWidth; mixBtn.classList.add('is-mixing'); } }
  var mixBtn = null;
  function tapTempo(b) {                                                  // the tapped BPM, folded by octaves into the DJ's range
    if (!(b > 0) || !isFinite(b)) return; while (b > BPM_HI) b /= 2; while (b < BPM_LO) b *= 2;
    TAPB = b; keepTap(); retempo(); }
  function keepTap() { if (!TAPB) return; var p = pumps(), X1 = dimX(M.W[1], p.z); TAPR = TAPB / baseBpm(-X1.drive); }   // re-aim the ratio at the tapped BPM (after a new mix)
  function wireMix() {
    mixBtn = document.getElementById('dj-mix'); if (!mixBtn) return;
    var held = 0, longDone = false, taps = [], one = 0, went = false, TAPMAX = SPM * MS / BPM_LO;   // a tap within one beat of the slowest tempo carries the run on
    mixBtn.addEventListener('pointerdown', function () { longDone = false; clearTimeout(held); held = setTimeout(function () { longDone = true; clearTimeout(one); one = 0; taps = []; went = false; headRandom(true); }, IPH * MS); });   // phi: hold PHI^-1 s
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (n) { mixBtn.addEventListener(n, function () { clearTimeout(held); }); });
    mixBtn.addEventListener('click', function (e) { e.stopPropagation(); if (longDone) { longDone = false; return; } if (e.shiftKey) { headRandom(true); return; }
      // THIRD TAP (Danny 17:30 AWST 27 Oct, 'Yea' to: the tempo changes only on the 3rd tap in time, so a stray double tap can't move it)
      var now = performance.now(), last = taps[taps.length - 1], arm = function () { clearTimeout(one); one = setTimeout(function () { one = 0; headRandom(false); }, TAPMAX); }; kick();
      if (!taps.length || now - last > TAPMAX) { taps = [now]; went = false; arm(); return; }   // a lone tap: Random, as before, once no more taps come (the mix lands on the bar grid anyway)
      var n = taps.length, mean = n > 1 ? (last - taps[0]) / (n - 1) : now - last;
      if (n > 1 && Math.abs((now - last) - mean) > mean * Math.pow(PHI, -2)) { taps = [now]; if (!went) arm(); return; }   // phi: off the run's beat by more than PHI^-2: a new run starts at this tap (no Random once a tempo has been set)
      taps.push(now); if (taps.length > 8) taps.shift();                  // unit: the last 8 taps (7 beats) set the tempo
      if (taps.length < 3) { if (!went) arm(); return; }                  // a double tap is still one Random; the tempo waits for two intervals
      clearTimeout(one); one = 0; went = true;                            // a tempo run: no new mix (his mood stays)
      tapTempo(SPM * MS * (taps.length - 1) / (now - taps[0])); });
    function kick() { mixBtn.classList.remove('is-tapping'); void mixBtn.offsetWidth; mixBtn.classList.add('is-tapping'); }
    mixBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  function resumeTap() {
    disarm(); if (!masterOn()) { var sw = soundSwitch(); if (sw) sw.click(); }
    if (stalled && playing && ctx) { stalled = false; try { ctx.resume(); } catch (e) {} elPlay(); jump(); tick(); session('playing'); paint(compute()); return; }
    if (pend) start(pend);
  }
  var armed = false, GEST = ['touchend', 'click', 'keydown'];
  // djbtnfix (Danny 21:0x AWST 26 Oct, 'the buttons are just behaving erratically'): the DJ's own controls (music button, pop-up, header
  // Random, export) are never a 'tap anywhere' resume, so each tap does only its own job; anywhere else on the page still brings the sound back.
  var OWN = '#dj-pill,#dj-edit,#qh-djpop,#dj-mix,#dj-exp,#dj-desk';   // + the edit button (editbtn1, Danny 14:12 AWST 27 Oct)
  function onGesture(e) { var t = e.target; if (t && t.closest && t.closest(OWN)) return; if (pend || stalled) resumeTap(); else disarm(); }
  function arm() { if (armed) return; armed = true; GEST.forEach(function (n) { document.addEventListener(n, onGesture, true); }); }
  function disarm() { if (!armed) return; armed = false; GEST.forEach(function (n) { document.removeEventListener(n, onGesture, true); }); }
  // register with js/rhythm-continuity.js (save cadence, lifecycle hooks, catch-up and the daily restart live there)
  var RC = null;
  function save() { if (RC) RC.save(); }
  function snapshot() { var o = { on: playing || !!pend || stalled, nudge: nudge, flip: genreFlip, T0: T0, tr: spec(), mix: mixSeed, k: kRef, ks: kseed }; if (JSON.stringify(sign) !== JSON.stringify(SIGN0)) o.sg = sign; if (JSON.stringify(DIAL) !== DIAL0) o.dl = DIAL; if (TAPR !== 1) o.tt = TAPR; if (TAPB) o.tb = TAPB; if (GPICK) o.gp = GPICK; if (MEMO.length) o.mm = MEMO; if (JSON.stringify(MX) !== MX0) o.mx = MX; return o; }
  // RELOAD FADE (MIDI Bot rhythm study section 4, Danny 19:18 AWST): what a reload or logo tap restores (the first track's birth dims
  // since 060ba87, and the rotation phase T0) fades toward the live readings with the gap: saved weight w = PHI^-(gap / (B PHI^k)),
  // B = PHI^5 s (the breath slot), k = the resume dial (open range 3..7, mid 5: about two minutes per rung) plus its own phi pump
  // (dj:resume, +-1 rung). Short gap: the same loop comes back; long gap: the live sky takes over smoothly. Catch-up only blends toward
  // live, so it never adds drive or density of its own (shared.md L381 / L397: live feeds re-read, fundamentals carried).
  var RK = (3 + 7) / 2, rsP = null;
  function resumeW(e) { var P = window.PhiPumps; if (!rsP && P && P.node) rsP = P.node('dj:resume', 1, PHI, IPH, P.page, 5);
    var pm = rsP ? clamp(rsP.modes(pumpAt()) || 0, -1, 1) : 0, g = Math.max(0, +e || 0); return Math.pow(PHI, -g / (Math.pow(PHI, 5) * Math.pow(PHI, RK + pm))); }
  function catchUp(e, s, mode) {
    if (mode === 'return') { wake(); return; }
    if (!s) return;
    if (s.k > 0 && isFinite(s.k)) kRef = s.k;
    if (s.dl) Object.keys(DIAL).forEach(function (k) { if (isFinite(s.dl[k])) DIAL[k] = +s.dl[k]; });   // the dials are choices: they carry
    if (s.sg) Object.keys(sign).forEach(function (k) { var a = s.sg[k]; if (a && a.length === DIMS.length && a.every(function (v) { return v === -1 || v === 0 || v === 1; })) sign[k] = a.slice(); });   // the signs dial is a choice: it carries                             // learned level per unit of nominal volume (a calibration, kept)
    if (s.ks) Object.keys(KP).forEach(function (k) { if (isFinite(s.ks[k])) kseed[k] = s.ks[k]; });   // knob seeds are choices: they carry like the mix
    if (s.mix != null && isFinite(s.mix)) mixSeed = s.mix; M = withKnobs(genome(mixSeed));   // his mix choice carries through reloads and the daily restart
    if (s.mx && typeof s.mx === 'object') ['m', 's', 'e', 'w'].forEach(function (k) { var o = s.mx[k]; MX[k] = {}; if (o) CHS.forEach(function (c) { if (o[c] != null) MX[k][c] = k === 'm' || k === 's' ? !!o[c] : clamp(o[c] | 0, 0, SENDL.length - 1); }); });
    if (s.mx && s.mx.b && typeof s.mx.b === 'object') { MX.b = {}; Object.keys(s.mx.b).forEach(function (r) { var b = s.mx.b[r]; if (b && Array.isArray(b.m) && Array.isArray(b.s)) MX.b[r] = { m: b.m.map(Boolean).slice(0, 8), s: b.s.map(Boolean).slice(0, 8) }; }); }   // the desk's mutes, solos and sends carry like the dials
    if (Array.isArray(s.mm)) MEMO = s.mm.filter(function (c) { return Array.isArray(c) && c.length >= 2 && c.length <= 32 && c.every(function (v) { return Math.abs(v) <= 12 && v === Math.round(v); }); }).slice(-MEMN);   // the themes carry like the mix
    TAPR = s.tt > 0 && isFinite(s.tt) ? +s.tt : 1; TAPB = s.tb > 0 && isFinite(s.tb) ? +s.tb : 0; GPICK = s.gp && GEN[s.gp] ? s.gp : null;   // tapped tempo + genre pick carry like the mix
    if (mode === 'restart') { if (s.on && AC) { pend = {}; arm(); } return; }   // new solar day: still on (his choice), fresh track, knobs back to live
    if (s.nudge) Object.keys(nudge).forEach(function (k) { if (isFinite(s.nudge[k])) nudge[k] = s.nudge[k]; });
    var w = resumeW(e), now = Date.now();
    if (isFinite(s.flip)) genreFlip = s.flip; if (isFinite(s.T0)) T0 = now + (s.T0 - now) * w;   // the rotation phase fades toward a fresh start's (T0 = now) the same way
    if (s.on && AC) { pend = s.tr ? Object.assign({}, s.tr) : {}; if (pend.dm && typeof pend.dm.drive === 'number') pend.dm = Object.assign({}, pend.dm, { w: w }); arm(); }
    if (pend && window.__djTap) { window.__djTap = 0; setTimeout(resumeTap, 0); }   // soundfix3: he already touched the page before the engine landed: that touch counts
  }
  function reset() {                                                      // daily restart at local solar midnight: knobs back to live, fresh rotation
    Object.keys(nudge).forEach(function (k) { nudge[k] = 0; }); genreFlip = 0; T0 = Date.now(); held = null;
    if (pend) pend = {}; tracks.forEach(function (tr) { tr.born = 0; });  // the next boundary starts a fresh track
    cur = compute(); paint(cur); schedule(cur.fade);
  }

  // ---------- UI (Dad header) ----------
  var $ = function (id) { return document.getElementById(id); };
  var btn, vol, read, readP, led, chips;
  function sliderVol() { return 80 / 100; }   // volume slider removed (Danny 20:09 AWST 26 Oct: 'redundant, doesn't really work'): the master stays at its old default; a saved slider value is ignored
  function sgn(v) { return (v > 0 ? '+' : v < 0 ? '\u2212' : '\u00B1') + +Math.abs(v).toFixed(2); }
  function liveBpm(c) { var tr = playing && tracks.filter(function (x) { return !x.leaving && !x.dead; })[0]; return tr ? tr.bpmTo || tr.bpm : c.bpm; }
  function paint(c) {
    if (!read) return; syncGen();
    var shown = playing && cur ? cur : c, g = playing && cur && cur.genre ? cur.genre : c.genres.length === Object.keys(GEN).length ? 'every style' : c.genres.join(' / ');
    read.textContent = mixName() + ' \u00B7 ' + g + ' \u00B7 ' + Math.round(liveBpm(shown)) + ' BPM \u00B7 fade ' + shown.fade.toFixed(1) + ' s \u00B7 vol ' + Math.round(shown.vol * 100) + '%';
    var p = c.p, pendN = playing && cur && (Math.abs(cur.s - c.s) > Math.pow(PHI, -4) || cur.p.mood !== c.p.mood);
    readP.textContent = 's ' + sgn(c.s) + ' = time ' + p.time + ' ' + sgn(p.tp) + ', sky ' + p.sky + ' ' + sgn(p.wp) + ', ' + p.urgency + ' ' + sgn(p.up) + ', ' + p.mood + ' ' + sgn(p.mp) + ' \u00B7 ' + DIMS.map(function (d) { return d + ' ' + c.dims[d].toFixed(2); }).join(', ') +
      (pendN ? ' \u2192 next: ' + (c.genres.length === Object.keys(GEN).length ? 'every style' : c.genres.join('/')) + ' ' + Math.round(c.bpm) + ' BPM in ' + Math.max(0, nextIn()).toFixed(1) + ' s' : '') + liveLine();
    var on = playing || !!pend || stalled, wait = !!pend || stalled;
    btn.setAttribute('aria-pressed', playing && !stalled ? 'true' : 'false'); btn.classList.toggle('is-resuming', wait);   // soundfix3: the switch shows what he hears (pending / stalled = off, 'tap to resume'), so off never starts sound and on never stops it
    var WHO = (document.documentElement.getAttribute('data-who')||'Dad');   // shown name: Ed on his dashboard (data-who, Danny 15:39 AWST 26 Oct), Dad on Bonnie's pages
    btn.querySelector('.dj-lbl').textContent = !AC ? 'no sound here' : wait ? WHO + '\u2019s DJ \u00B7 tap to resume' : playing ? WHO + '\u2019s DJ on' : WHO + '\u2019s DJ';
    syncChips();
    btn.disabled = !AC;
  }
  var beatT = [];
  function beat(t, down) {
    if (RM.matches || !led || !ctx) return;
    var at = Date.now() + Math.max(0, (t - ctx.currentTime) * 1000);
    LED.push([at, down ? 1 : 0], [at + 90, -1]); LED.sort(function (a, b) { return a[0] - b[0]; }); if (LED.length > 64) LED.splice(0, 32);
  }
  function soundSwitch() { return document.querySelector('#vol-sound .bs-toggle'); }
  function masterOn() { var b = window.BonnieSound; return !b || b.on; }
  // knob chips + live line live in js/dj-extras.js (they arrive after first sound, or when the pumps panel opens, or at background idle)
  function syncChips() { if (X && X.sync) X.sync(); }
  // STYLE ROW (Danny 15:3x AWST 27 Oct, Claude chat: 'if I've got that panel, I'll just select all electro and I can hear it'): auto = the
  // mood picks the style (as before); a style = only that style, mixed in on the bar grid like a dial change
  var genEl = null;
  function genRow() { genEl = $('dj-gen'); if (!genEl || genEl.childNodes.length > 1) return;
    ['auto'].concat(Object.keys(GEN)).forEach(function (k) { var l = document.createElement('label'), i = document.createElement('input'), sp = document.createElement('span');
      i.type = 'radio'; i.name = 'dj-gen'; i.value = k; sp.textContent = k; l.appendChild(i); l.appendChild(sp); genEl.appendChild(l); });
    genEl.addEventListener('change', function (e) { var v = e.target && e.target.value; if (!v) return; GPICK = v === 'auto' || !GEN[v] ? null : v; glide(); });
    syncGen(); }
  function syncGen() { if (!genEl) return; var w = GPICK || 'auto', i = genEl.querySelector('input[value="' + w + '"]'); if (i && !i.checked) i.checked = true; syncC8(); }
  // 808 CHARACTER ROW (Danny 17:36 AWST 27 Oct: 'its own character each with a character dial that lessens or exaggerates'): five rungs
  // of how far each track's 808 rack departs from stock; heard on the next hit, saved with the dials
  var C8 = [['off', 0], ['less', IPH], ['normal', 1], ['more', PHI], ['max', PHI * PHI]], c8El = null;
  function c8Row() { c8El = $('dj-c808'); if (!c8El || c8El.childNodes.length > 1) return;
    C8.forEach(function (o, j) { var l = document.createElement('label'), i = document.createElement('input'), sp = document.createElement('span');
      i.type = 'radio'; i.name = 'dj-c808'; i.value = String(j); sp.textContent = o[0]; l.appendChild(i); l.appendChild(sp); c8El.appendChild(l); });
    c8El.addEventListener('change', function (e) { var j = +(e.target && e.target.value); if (C8[j]) { DIAL.c808 = C8[j][1]; save(); } });
    syncC8(); }
  function syncC8() { if (!c8El) return; var b = 0; C8.forEach(function (o, j) { if (Math.abs(o[1] - DIAL.c808) < Math.abs(C8[b][1] - DIAL.c808)) b = j; }); var i = c8El.querySelector('input[value="' + b + '"]'); if (i && !i.checked) i.checked = true; }
  function liveLine() { return X && X.live ? X.live() : ''; }
  function boot() {
    btn = $('dj-play'); vol = $('dj-vol'); read = $('dj-read'); readP = $('dj-pumps'); chips = $('dj-chips'); led = btn && btn.querySelector('.dj-led');
    if (!btn || !read) return;
    genRow(); c8Row();
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
    every(function () { if (!document.hidden) paint(compute()); }, 1000);
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
  every(function () { if (playing && !document.hidden) { ref(); glue(); } }, PHI * MS);   // phi: keep learning k (and set the glue) every PHI s while the music plays
  // MASTER CEILING + GLUE (MIDI Bot dynamics spec S1, Danny 19:23 AWST 26 Oct 'yes, send ... ceiling'; Danny 19:11 AWST via Kids Club: 'it
  // can get really loud'). ONE ceiling, always on: comp -> C tanh(x / C) (oversample 4x) -> duck, the same curve as the throw loop's tSh.
  // C is shared.md's loudness ceiling rail: the rail is full scale (js/logo-sound.js cap(): never past full scale) and the logo sits one
  // phi step above the music under it (logo = music x PHI), so the music's ceiling is the rail x PHI^-1. tanh never reaches C, so no voice,
  // effect, echo or mix can pass it. DadAutoDJ.ceiling reads / moves it (the amplitude matrix's top row, later).
  // GLUE: the existing master compressor becomes a gradient, G = s(density) s(drive)^PHI^-1 u^PHI^-1 (busy, driven, lively -> pop and soul
  // high; piano, ambient, cinematic near 0): ratio PHI^(PHI G) (1 .. 2.2), knee = the spec default x PHI^-G, attack d16 x PHI^(-2-G),
  // release beat x PHI^-G (both tempo-locked to the grid), threshold = the running K-weighted level going in + PHI^(2-G) dB. The W3C
  // compressor adds its own make-up gain to everything (that was the old +0.3 dB); the trim after it takes the make-up back out, so the
  // glue's output level never sits above its input level (trim = level in / level out, at most 1): glue shapes, it never makes louder.
  // Every move glides over one beat (rule 6). Before the first level reading it keeps today's values.
  var CEIL = IPH, ceilN = null, glueC = null, glueT = null, kPre = null, preS = 0, postS = 0, glueG = null;   // phi: rail (full scale) x PHI^-1
  function ceilCurve(c) { var n = 4097, cv = new Float32Array(n); for (var i = 0; i < n; i++) { var x = 2 * i / (n - 1) - 1; cv[i] = c * Math.tanh(x / c); } return cv; }   // unit: 2^12 + 1 points over -1..1
  function glue() {
    if (!glueC || !ctx || ctx.state !== 'running') return; var g = grid(); if (!g) return;
    var a = rmsOf(kPre), b = rmsOf(kMeter) / Math.max(glueT.gain.value, Math.pow(PHI, -8)), k = 1 - Math.exp(-1 / PHI);   // b: the glue's own output, before the trim; phi: tau PHI s at one reading per PHI s
    preS = preS ? preS + (a - preS) * k : a; postS = postS ? postS + (b - postS) * k : b; if (!(preS > 0) || !(postS > 0)) return;
    var D = dimsOf(climate(dimX(null))), u = energy(), G = D.density * Math.pow(D.drive, IPH) * Math.pow(u, IPH), t = ctx.currentTime, beat = g.d16 * SPB, KNEE = 30;   // unit: 30 dB, the W3C spec's default knee
    var th = Math.max(-100, Math.min(0, 20 * Math.log10(preS) + Math.pow(PHI, 2 - G)));   // unit: dB
    glueT.gain.setTargetAtTime(Math.min(1, preS / postS), t, beat);
    glueC.ratio.setTargetAtTime(Math.pow(PHI, PHI * G), t, beat); glueC.knee.setTargetAtTime(KNEE * Math.pow(PHI, -G), t, beat); glueC.threshold.setTargetAtTime(th, t, beat);
    glueC.attack.setTargetAtTime(g.d16 * Math.pow(PHI, -2 - G), t, beat); glueC.release.setTargetAtTime(beat * Math.pow(PHI, -G), t, beat); glueG = G;
  }
  // ---------- export button: the last minute as a Standard MIDI File (writer js/dj-midi.js loads on first press) ----------
  var MIDIURL = 'js/dj-midi.js?v=barline1', midiP = null;
  function midiLib() { if (!midiP) midiP = new Promise(function (ok, no) { if (window.DadMidi) return ok(window.DadMidi); var sc = document.createElement('script'); sc.src = MIDIURL; sc.async = true;
    sc.onload = function () { window.DadMidi ? ok(window.DadMidi) : no(); }; sc.onerror = function () { midiP = null; no(); }; document.head.appendChild(sc); }); return midiP; }
  function lastMinute() { var now = Date.now(), w0 = now - WIN, cc0 = Object.assign({}, ccOld);
    var wb = null; NL.forEach(function (e) { if (e[1] === 'bar' && e[0] <= w0 && (wb == null || e[0] > wb)) wb = e[0]; }); if (wb != null) w0 = wb;   // start on the bar line at or before the minute mark (Danny 12:20 AWST 27 Oct)
    NL.forEach(function (e) { if (e[1] === 'cc' && e[0] < w0) cc0[e[2]] = e; });
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
  // the desk's handle (js/dj-desk.js): read and set everything it shows, through the same paths the old panel used
  var DESK = { CHS: CHS, SENDL: SENDL, on: chOn, box: boxOn, meter: chMeter, act: function (ch, t, v) { act(ch, t, v); },
    get mx() { return JSON.parse(JSON.stringify(MX)); },
    mute: function (ch, v) { if (CHS.indexOf(ch) < 0) return; MX.m[ch] = !!v; save(); },
    solo: function (ch, v) { if (CHS.indexOf(ch) < 0) return; MX.s[ch] = !!v; save(); },
    send: function (ch, k, i) { if (CHS.indexOf(ch) < 0 || (k !== 'e' && k !== 'w')) return; (k === 'e' ? MX.e : MX.w)[ch] = clamp(i | 0, 0, SENDL.length - 1); resend(); save(); },
    boxSet: function (rack, u, k, v) { var b = MX.b[rack] || (MX.b[rack] = { m: [], s: [] }); (k === 's' ? b.s : b.m)[u] = !!v; save(); },
    get pick() { return GPICK; }, setPick: function (g) { GPICK = g && GEN[g] ? g : null; glide(); save(); syncGen(); }, get genres() { return Object.keys(GEN); },
    dial: function (k, v) { if (!DIAL.hasOwnProperty(k)) return null; if (v != null && isFinite(v)) { DIAL[k] = +v; save(); syncGen(); } return DIAL[k]; },
    rd: function (k, v) { if (!RD.hasOwnProperty(k)) return null; if (v != null && isFinite(v)) { RD[k] = clamp(+v, k === 'energy' ? -1 : 0, 1); save(); } return RD[k]; },
    rk: function (v) { if (v != null && isFinite(v)) { RK = clamp(+v, 3, 7); save(); } return RK; },
    live: function () { var tr = tracks.filter(function (x) { return !x.dead && !x.leaving; })[0]; return tr ? { e: tr.e, genre: tr.genre, bpm: tr.bpmTo || tr.bpm, rp: tr.rp ? { ghost: tr.rp.ghost, roll: tr.rp.roll, drv: tr.rp.drv, spc: tr.rp.spc, x: tr.rp.x } : null, phrase: Math.floor(tr.step / 64) % SPB + 1 } : null; },
    get read() { return read ? read.textContent : ''; }, get colc() { return colC(); },
    toLive: function () { Object.keys(nudge).forEach(function (k) { nudge[k] = 0; }); glide(); save(); } };
  window.DadAutoDJ = { desk: DESK, _kit: { dimX: function (w) { return dimX(w); }, voiceHook: function (f) { VH = typeof f === 'function' ? f : null; }, resumeDial: function (v) { if (isFinite(v)) RK = clamp(+v, 3, 7); return RK; }, resumeW: function (e) { return resumeW(e); }, rhythmDial: function (k, v) { if (RD.hasOwnProperty(k) && isFinite(v)) RD[k] = clamp(+v, k === 'energy' ? -1 : 0, 1); return RD[k]; }, bassRoot: function () { var t = tracks.filter(function (x) { return !x.dead && !x.leaving; })[0]; return t && t.g && t.g.br ? { f: t.g.br, w: t.dm ? t.dm.weight : 1 / 2 } : null; }, keyTravel: function () { return lastBx && lastBx.kt != null ? lastBx.kt : 0; }, dimsOf: dimsOf, every: every, never: never, wv: wv, chip: function () { return chip(tracks.filter(function (x) { return !x.dead && !x.leaving; })[0]); }, grid: grid, reroll: reroll, nextMix: function () { nextMix(); }, defMix: function () { remix(null); }, kseed: kseed, extras: extras, fx: fxIn, ir: function () { return X && X.ir ? X.ir() : null; }, voice: function () { return voice.apply(null, arguments); }, osc: function () { return osc.apply(null, arguments); }, env: env,
      INST: INST, get ctx() { return ctx; }, LADDER: LADDER, eff: eff, liveOf: liveOf, nudge: nudge, setTo: setTo, compute: compute, paint: paint, save: save,
      idle: function (c) { if (!playing) cur = c; }, get el() { return el; }, get duck() { return duck; }, wake: function () { wake(); }, resumeTap: function () { resumeTap(); }, rebuild: function () { return rebuild(); }, get stalled() { return stalled; }, recCC: recCC, mixGo: function () { mixGo(); }, get voices() { return nlive; }, soph: soph, pwave: pwave, set sOver(v) { sOver = v; }, get sOver() { return sOver; } },
    compute: compute, pumps: pumps, streams: streams, get dims() { return dimsOf(dimX(null)); }, get signs() { return JSON.parse(JSON.stringify(sign)); },
    sign: function (k, d, v) { var i = DIMS.indexOf(d); if (sign[k] && i >= 0 && (v === -1 || v === 0 || v === 1)) { sign[k][i] = v; paint(compute()); save(); } return sign[k] ? sign[k].slice() : null; },   // the signs dial (taste calls) GEN: Object.keys(GEN), set: function (k, v) { if (LADDER[k]) setTo(k, v); paint(compute()); save(); },
    get harmonyBridge() { return lastBx ? { plan: lastBx.plan, segs: lastBx.segs, home: lastBx.home, pre: lastBx.pre, start: lastBx.start, drop: lastBx.drop } : null; },
    get nudge() { return JSON.parse(JSON.stringify(nudge)); }, live: function (k) { return liveOf(k); }, get pending() { return !!pend || stalled; },
    get collide() { return { c: colC(), o: COL.o, z: COL.z, b: COL.b, beta: COL.beta }; },
    get dials() { return JSON.parse(JSON.stringify(DIAL)); }, dial: function (k, v) { if (DIAL.hasOwnProperty(k) && isFinite(v)) { DIAL[k] = +v; save(); } return DIAL[k]; },
    get track() { var t = spec(), lv = tracks.filter(function (x) { return !x.dead && !x.leaving; })[0] || {}; return t ? { loop: lv.prog && { a: lv.prog, b: lv.progB, bars: lv.hb }, mode: lv.mode, genre: t.genre, bpm: t.bpm, born: t.born, len: t.len, step: (tracks.filter(function (x) { return !x.dead && !x.leaving; })[0] || {}).step, arc: (tracks.filter(function (x) { return !x.dead && !x.leaving; })[0] || {}).e, breakdown: !!(tracks.filter(function (x) { return !x.dead && !x.leaving; })[0] || {}).bd, soph: (tracks.filter(function (x) { return !x.dead && !x.leaving; })[0] || {}).s } : null; },
    get mix() { return { seed: mixSeed, name: mixName(), genome: M }; }, remix: function (seed) { if (seed === undefined) nextMix(); else remix(seed); },
    get bridge() { return el ? { paused: el.paused, direct: direct } : null; }, snapshot: snapshot,
    get playing() { return playing; }, get now() { return cur; }, get tracks() { return tracks.length; },
    level: rms, get out() { return { level: rms(), k_level: rmsOf(kMeter), ref: refS, k: kRef, nominal: nominal(), duck: duck ? duck.gain.value : 1, ducked: ducked }; },
    get extras() { return !!X; }, notes: function () { return NL.slice(); }, lastMinute: lastMinute, midi: function () { return midiLib(); }, dump: function () { var t = spec(); return midiLib().then(function (L) { return L.build(lastMinute(), t ? t.bpm : compute().bpm, t && t.genre, TL.slice()).csv; }); }, get primed() { return primed; },   // dump: dev midicsv of the last minute (MIDI Bot directions; loads the writer on demand)
    get graph() { return ctx ? { state: ctx.state, tracks: tracks.length, busGain: bus.gain.value, master: master.gain.value } : null; },
    get ceiling() { return CEIL; }, set ceiling(c) { if (!(c > 0)) return; CEIL = Math.min(1, c); if (ceilN) try { ceilN.curve = ceilCurve(CEIL); } catch (e) {} },
    get glue() { return glueC ? { G: glueG, trim: glueT.gain.value, ratio: glueC.ratio.value, knee: glueC.knee.value, threshold: glueC.threshold.value, attack: glueC.attack.value, release: glueC.release.value, reduction: glueC.reduction } : null; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
