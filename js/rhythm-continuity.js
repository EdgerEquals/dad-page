/* RHYTHM CONTINUITY (Danny 13:47 / 13:48 / 13:51 AWST 26 Oct 2026; Kids Club standard "rhythms keep going while you're away").
   Every cascading rhythm on the page (the DJ, the pump tree, dials, sky and season clocks, the logo, scene phases) registers here once.
   This module owns the storage key, the save cadence, the page-lifecycle hooks, the catch-up and the daily restart, so a reload, an
   iOS tab discard or a trip to another app never resets anything: it restores at once and fast-forwards to now.

   API  RhythmContinuity.register(name, { save(), catchUp(elapsedSec, state, mode), reset() })   mode 'cold' (page load) | 'return' |
                                          'restart' (first load of a new solar day: yesterday's state, carry choices only)
          save()      -> a small JSON-able snapshot of the rhythm (called on the cadence and on every hide)
          catchUp()   -> called once at register time with the stored snapshot ('cold', only if it is from today's solar day)
                         and on every return to the page with the snapshot taken at hide ('return'); fast-forward analytically
          reset()     -> the daily restart (every rhythm together, at local solar midnight)
        RhythmContinuity.phase(name, get, set)   sugar for a scalar clock in seconds (scene phases): set(saved + elapsed)
        RhythmContinuity.css(name, elOrSelector) sugar for CSS / Web Animations under one element: currentTime += elapsed x rate
        RhythmContinuity.video(name, video)      sugar for a looping <video>: currentTime = (saved + elapsed x rate) mod duration
        RhythmContinuity.peek(name)  the stored snapshot (today only) before its owner has loaded, e.g. to paint the DJ pill 'on'
        RhythmContinuity.sun(ms?)    { elev, depth, day, season, moon }  the sky clocks below, read on demand
        RhythmContinuity.saveNow(), .names(), .info()
   Storage: localStorage 'dadRhythm.v1' only, on this device. No network, no names, no typed text.
   Cadence: one save every PHI^4 s (the page pump's fastest mode, js/phi-pumps.js k0 = 4), plus visibilitychange (hidden), pagehide
   and freeze. Returns are caught on visibilitychange (visible), pageshow (bfcache) and resume.
   DAILY RESTART (no clock time): local apparent solar time = UT days + longitude / one turn + equation of time / one turn.
   Its whole part counts solar days; the count ticks over when the hour angle passes half a turn, i.e. at local solar midnight, which is
   where the Sun's height reaches its daily minimum (deepest night). The equation of time and declination use Meeus ch. 25 linear terms
   (as js/season-pumps.js). Place = the shared layer's one coarse city point (location standard; never device GPS). */
(function (root) {
  'use strict';
  if (root.RhythmContinuity) return;
  var doc = root.document, PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI;            // phi: the golden ratio, the sole scaling factor
  var TAU = 2 * Math.PI, RAD = Math.PI / 180, DEG = 360;                           // unit: one turn = 360 deg
  var MS = 1e3, MS_DAY = 864e5, JD_UNIX = 2440587.5, JD_2000 = 2451545, CENTURY = 36525;   // unit/cite: ms per s, SI day; Meeus ch. 7
  var POINT = { lat: -32.0, lon: 115.9 };                                          // anchor: shared layer's one coarse city point (Perth, 0.1 deg)
  var SYN = 29.530588853, NEW0 = Date.UTC(2000, 0, 6, 18, 14);                     // cite: Meeus 49.1 synodic month; new moon 2000-01-06 18:14 UT
  var KEY = 'dadRhythm.v1', CADENCE = Math.pow(PHI, 4);                            // phi: save every PHI^4 s (page pump's fastest mode)

  // ---------- sky clocks (sun height, solar day, season, moon) ----------
  function sun(ms) {
    ms = ms == null ? Date.now() : ms;
    var d = ms / MS_DAY, T = (d + JD_UNIX - JD_2000) / CENTURY;
    var L0 = (280.46646 + 36000.76983 * T) * RAD, M = (357.52911 + 35999.05029 * T) * RAD;        // cite: Meeus 25.2, 25.3
    var e = 0.016708634 - 0.000042037 * T, eps = (23.439291 - 0.0130042 * T) * RAD;             // cite: Meeus 25.4, 22.2
    var C = (1.914602 * Math.sin(M) + 0.019993 * Math.sin(2 * M)) * RAD, lam = L0 + C;           // cite: Meeus 25 equation of centre
    var y = Math.pow(Math.tan(eps / 2), 2);
    var eot = y * Math.sin(2 * L0) - 2 * e * Math.sin(M) + 4 * e * y * Math.sin(M) * Math.cos(2 * L0) - y * y / 2 * Math.sin(4 * L0) - 5 / 4 * e * e * Math.sin(2 * M);   // cite: Meeus 28.3 (radians)
    var las = d + POINT.lon / DEG + eot / TAU;                                     // local apparent solar time in days (0 = solar midnight)
    var dec = Math.asin(Math.sin(eps) * Math.sin(lam)), H = TAU * (las - Math.floor(las)) - Math.PI, la = POINT.lat * RAD;
    var elev = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(H));
    var moon = (((ms - NEW0) / MS_DAY / SYN) % 1 + 1) % 1;
    return { elev: elev / RAD, depth: (1 - Math.cos(H)) / 2, day: Math.floor(las), solarDays: las,   // depth: 1 at solar noon .. 0 at deepest night
             season: ((lam / TAU) % 1 + 1) % 1, moon: moon, moonLit: (1 - Math.cos(TAU * moon)) / 2 };
  }

  // ---------- store ----------
  var R = {}, order = [], stored = null, hideAt = 0, snaps = {}, today = sun().day, timer = 0;
  try { stored = JSON.parse(root.localStorage.getItem(KEY) || 'null'); } catch (e) { stored = null; }
  var fresh = !stored || stored.day !== today, prev = fresh && stored && stored.r ? stored.r : null;   // a new solar day since the last save: daily restart
  if (fresh) stored = { day: today, at: Date.now(), r: {}, t: {} };
  if (!stored.t) stored.t = {};                                                      // per-rhythm save time, so a late-loading rhythm counts its own time away
  function snapAll() { var o = {}; order.forEach(function (n) { try { var s = R[n].save && R[n].save(); if (s != null) o[n] = s; } catch (e) {} }); return o; }
  function write() {
    var o = snapAll(), r = (stored && stored.r) || {}, t = (stored && stored.t) || {}, now = Date.now();
    Object.keys(o).forEach(function (n) { r[n] = o[n]; t[n] = now; });            // keep snapshots (and their times) of rhythms not loaded yet
    stored = { day: today, at: now, r: r, t: t };
    try { root.localStorage.setItem(KEY, JSON.stringify(stored)); } catch (e) {}
  }
  function restart() {                                                             // every registered rhythm together
    order.forEach(function (n) { try { R[n].reset && R[n].reset(); } catch (e) {} });
    stored = { day: today, at: Date.now(), r: {}, t: {} }; write();
    try { doc.dispatchEvent(new CustomEvent('rhythm:restart', { detail: { day: today } })); } catch (e) {}
  }
  function beat() {
    clearTimeout(timer); timer = 0;
    var d = sun().day; if (d !== today) { today = d; restart(); } else if (!doc.hidden) write();
    timer = setTimeout(beat, CADENCE * MS);
  }

  // ---------- register ----------
  function register(name, h) {
    if (!R[name]) order.push(name); R[name] = h;
    var s = stored && stored.r && stored.r[name];
    var at = (stored.t && stored.t[name]) || stored.at;
    if (s != null && h.catchUp) { try { h.catchUp(Math.max(0, (Date.now() - at) / MS), s, 'cold'); } catch (e) {} }
    else if (prev && prev[name] != null && h.catchUp) { try { h.catchUp(0, prev[name], 'restart'); } catch (e) {} }   // yesterday's state: only choices carry (e.g. DJ on)
    return { save: write };
  }
  function phase(name, get, set) {
    return register(name, { save: function () { return { t: get() }; },
      catchUp: function (e, s, mode) { if (mode !== 'restart' && s && isFinite(s.t)) set(s.t + e); }, reset: function () { set(0); } });
  }
  function el(x) { return typeof x === 'string' ? doc.querySelector(x) : x; }
  function anims(x) { var n = el(x); return n && n.getAnimations ? n.getAnimations({ subtree: true }) : []; }
  function css(name, x) {
    return register(name, { save: function () { var A = anims(x); return A.length ? { t: A.map(function (a) { return a.currentTime; }) } : null; },   // none (e.g. paused while hidden): keep the last one
      catchUp: function (e, s, mode) { if (mode === 'restart' || !s || !s.t) return; var at = Date.now();
        function apply() { var k = e + (Date.now() - at) / MS; anims(x).forEach(function (a, i) {
          var t = s.t[i]; if (t == null || !isFinite(t)) return; try { a.currentTime = t + k * MS * (a.playbackRate || 1); } catch (er) {} }); }
        if (anims(x).length) apply(); else requestAnimationFrame(function () { requestAnimationFrame(apply); }); },   // the layer re-starts its animations on return
      reset: function () { anims(x).forEach(function (a) { try { a.currentTime = 0; } catch (er) {} }); } });
  }
  function video(name, v) {
    function seek(t) { function go() { var D = v.duration; if (!(D > 0) || !isFinite(t)) return; try { v.currentTime = ((t % D) + D) % D; } catch (er) {} }
      if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, { once: true }); }
    return register(name, { save: function () { return v.readyState >= 1 ? { t: v.currentTime, r: v.playbackRate || 1 } : null; },
      catchUp: function (e, s, mode) { if (mode !== 'restart' && s && isFinite(s.t)) seek(s.t + e * (s.r || 1)); }, reset: function () { seek(0); } });
  }

  // ---------- lifecycle ----------
  function away() { if (!hideAt) { hideAt = Date.now(); snaps = snapAll(); } write(); }
  function back(ev) {
    if (ev && ev.type === 'pageshow' && !ev.persisted) return;
    var d = sun().day; if (d !== today) { today = d; hideAt = 0; restart(); return; }
    if (!hideAt) return;
    var now = Date.now(), e = Math.max(0, (now - hideAt) / MS), s = snaps; hideAt = 0; snaps = {};
    order.forEach(function (n) { try { if (!R[n].catchUp) return;                // no snapshot at hide: fall back to the last saved one and its own time
      if (s[n] != null) R[n].catchUp(e, s[n], 'return'); else R[n].catchUp(Math.max(0, (now - ((stored.t && stored.t[n]) || now)) / MS), stored.r[n], 'return'); } catch (er) {} });
    write();
  }
  doc.addEventListener('visibilitychange', function () { if (doc.hidden) away(); else back(); });
  root.addEventListener('pagehide', away);
  root.addEventListener('pageshow', back);
  doc.addEventListener('freeze', away);
  doc.addEventListener('resume', back);
  timer = setTimeout(beat, CADENCE * MS);

  root.RhythmContinuity = { register: register, phase: phase, css: css, video: video, sun: sun, saveNow: write,
    peek: function (n) { return stored && stored.r ? stored.r[n] : undefined; }, names: function () { return order.slice(); },
    info: function () { return { key: KEY, day: today, restartedToday: fresh, savedAt: stored && stored.at, cadence: CADENCE, rhythms: order.slice() }; } };

  // ---------- page-owned rhythms that need no file of their own ----------
  // sky + season clocks: computed from the date itself, so catching up is just a re-read; on a return, tell the page's feeds to refresh
  // (not on a cold load: the ratio pump's first scan stays at idle, as the load-order fix needs).
  register('sky', { save: function () { var s = sun(); return { elev: s.elev, season: s.season, moon: s.moon }; },
    catchUp: function (e, st, mode) { if (mode !== 'return') return; try { var P = root.RatioPump; if (P && P.refresh) P.refresh(); doc.dispatchEvent(new CustomEvent('rhythm:sky', { detail: sun() })); } catch (e) {} },
    reset: function () {} });
  // dials: Danny's dial settings are kept as set; the live rate they feed is re-read from the current feeds on return
  register('dials', { save: function () { var P = root.RatioPump; return { rate: P && P.rate ? P.rate() : null }; },
    catchUp: function (e, st, mode) { var P = root.RatioPump; if (mode === 'return' && P && P.refresh) P.refresh(); }, reset: function () { var P = root.RatioPump; if (P && P.refresh) P.refresh(); } });
  function late() {
    var v = doc.getElementById('bgloop'); if (v) video('scene:bgloop', v);                                // the background space loop
    css('logo:dad', '.q-head .dad-zoom');                                                        // the logo's own CSS rhythm (pumps cover the rest)
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', late); else late();
})(window);
