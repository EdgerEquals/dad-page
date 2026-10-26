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

  // ---------- audio interruptions (Danny 16:04-16:17 AWST 26 Oct: the mic in another app stops the DJ, pressing send must bring it back every time) ----------
  // Kids Club standard 'Sound comes back after another app borrows it' (Danny 15:51 + 16:16 AWST 26 Oct, shared.md).
  // Triggers: the DJ context's statechange (interrupted / suspended / closed), the <audio> bridge's pause and play, the Media Session play
  // action, visibilitychange to visible, pageshow, focus, resume, and a PHI^4 s check. Each waits one tap-rung beat, then runs the ladder.
  // Ladder: tries at beat x PHI^0, PHI^1 .. PHI^5 (then repeating at PHI^5 beats); every try calls ctx.resume() AND bridge.play(), and
  // the ladder only ends when ctx.state is 'running' AND the bridge element is really playing. Only while the DJ is on (his own pause
  // sets playing false, so it is never undone). As soon as the context runs, the sound comes back with a PHI^-1 s fade-in on the duck
  // stage and the rhythm is caught up to now (the DJ's wake: jump + tick). A closed context, or one still stuck after the whole ladder,
  // is rebuilt (fresh graph, same track position; dry path, the effects chain returns on reload). Refused (no gesture): one gentle
  // 'tap to bring the sound back' button (not the pulse, never silence), and the first finger lift (pointerup / touchend), mouse press or key anywhere is a resume gesture (S-0017).
  // Every try is logged (try number, state before -> after, bridge paused) to the console and to localStorage 'dadRhythm.audiolog.v1'
  // (this device only; the last Fibonacci 89 lines) so the next failure shows which step stalled: RhythmContinuity.audio.log().
  // Tap-rung beat: quick feedback = B x PHI^-10 (shared.md timing table), with the dashboard's breath slot B = PHI^5 (rule 3 loop slot)
  // -> PHI^-5 s, the first phi rung inside the 0.1 s tap rail.
  var TAP = Math.pow(PHI, 5) * Math.pow(PHI, -10), TOP = 5, LOGK = 'dadRhythm.audiolog.v1', LOGN = 89;   // phi: B x PHI^-10, B = PHI^5; ladder to PHI^5 beats; Fibonacci log
  var AU = { ctx: null, el: null, rung: 0, n: 0, t: 0, wait: 0, down: false, sounded: false, built: false, btn: null, g: 0, log: [] };
  try { AU.log = JSON.parse(root.localStorage.getItem(LOGK) || '[]') || []; } catch (e) { AU.log = []; }
  function kit() { var D = root.DadAutoDJ; return D && D._kit ? D : null; }
  function wanted() { var D = kit(); return !!(D && D.playing); }
  function st() { return AU.ctx ? AU.ctx.state : 'none'; }
  function elOn() { return !AU.el || (!AU.el.paused && !AU.el.ended); }
  function note(m) { var line = [Date.now(), m]; AU.log.push(line); if (AU.log.length > LOGN) AU.log.splice(0, AU.log.length - LOGN);
    try { console.log('[dj-resume] ' + m); } catch (e) {} try { root.localStorage.setItem(LOGK, JSON.stringify(AU.log)); } catch (e) {} }
  function done() { return AU.ctx && AU.ctx.state === 'running' && elOn(); }
  function fadeIn() {
    var D = kit(), g = D && D._kit.duck, c = AU.ctx; if (!g || !c || (root.LogoRadio && root.LogoRadio.holding)) return;   // js/logo-radio.js holds it silent under the zoom
    var P = root.PageMusic, to = P && P.ducked ? IP : 1, t = c.currentTime;
    try { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(to, t + IP); } catch (e) {}   // phi: PHI^-1 s fade-in
  }
  function mute() { var D = kit(), g = D && D._kit.duck; if (!g || !AU.ctx) return; try { g.gain.cancelScheduledValues(AU.ctx.currentTime); g.gain.setValueAtTime(0, AU.ctx.currentTime); } catch (e) {} }
  function sound() {                                                               // the context runs: bring the sound back, caught up to now
    if (AU.sounded) return; AU.sounded = true; hideBack(); fadeIn(); var D = kit();
    try { if (D._kit.stalled) D._kit.resumeTap(); else D._kit.wake(); } catch (e) {}
    try { var m = navigator.mediaSession; if (m) m.playbackState = 'playing'; } catch (e) {}
  }
  function finish() { clearTimeout(AU.t); AU.t = 0; clearTimeout(AU.wait); AU.wait = 0; if (AU.down) note('ok after try ' + AU.n + ': ' + st() + ', bridge playing'); AU.down = false; AU.rung = 0; AU.n = 0; AU.built = false; hideBack(); }
  function drop() { clearTimeout(AU.t); AU.t = 0; clearTimeout(AU.wait); AU.wait = 0; AU.down = false; AU.rung = 0; AU.n = 0; AU.built = false; hideBack(); }
  function playEl() { if (!AU.el) return null; try { var q = AU.el.play(); if (q && q.catch) q.catch(function (er) { note('bridge play refused: ' + (er && er.name)); }); return q; } catch (e) { return null; } }
  function rebuild(why) {
    var D = kit(); if (!D || !D._kit.rebuild) return; note('rebuild (' + why + ') from ' + st()); AU.built = true;
    try { D._kit.rebuild(); } catch (e) { note('rebuild failed: ' + (e && e.name)); } AU.ctx = null; AU.el = null; hook(); AU.sounded = true; AU.rung = 0;   // the fresh graph starts with its own fade-in
  }
  function attempt(why) {
    hook(); var D = kit();
    if (!D || !wanted()) { drop(); return; }
    if (!AU.ctx) return;
    if (done()) { if (AU.down) { sound(); finish(); } return; }
    if (!AU.down) { AU.down = true; AU.sounded = false; AU.rung = 0; AU.n = 0; mute(); note('down (' + why + '): ' + st() + ', bridge ' + (elOn() ? 'playing' : 'paused')); }
    if (st() === 'closed') { rebuild('closed'); }
    var before = st(), n = ++AU.n;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (AU.el && AU.el.paused && n > 2 && AU.el.srcObject) { try { var s = AU.el.srcObject; AU.el.srcObject = null; AU.el.srcObject = s; } catch (e) {} }   // a stale bridge: re-attach its stream
    var p = null; try { p = AU.ctx && AU.ctx.resume(); } catch (e) {}
    playEl();
    function after() {
      note('try ' + n + ' (' + why + '): ' + before + ' -> ' + st() + ', bridge ' + (elOn() ? 'playing' : 'paused'));
      if (st() === 'running') sound();
      if (done()) { finish(); return; }
      if (st() !== 'running') { try { if (!D._kit.stalled) D._kit.wake(); } catch (e) {} if (!doc.hidden) showBack(); }   // refused: the one gentle button + any tap
      ladder();
    }
    if (p && p.then) p.then(after, after); else setTimeout(after, 0);
  }
  function ladder() {
    if (AU.t || !AU.down) return;
    if (AU.rung > TOP && !AU.built && st() !== 'running') rebuild('stuck after the ladder');
    var k = Math.min(AU.rung, TOP); AU.rung++;
    AU.t = setTimeout(function () { AU.t = 0; attempt('ladder'); }, TAP * Math.pow(PHI, k) * MS);   // phi: beat x PHI^k, k = 0 .. 5
  }
  function later(why) { if (AU.wait) return; AU.wait = setTimeout(function () { AU.wait = 0; attempt(why); }, TAP * MS); }   // one tap-rung beat first
  function gesture(e) {                                                            // finger lift (pointerup / touchend), mouse press or key anywhere: inside the gesture, resume + play now
    hook(); if (!wanted() || !AU.ctx || (done() && !AU.down)) return;
    var now = Date.now(); if (now - AU.g < IP * MS) return; AU.g = now;           // phi: one tap = one gesture (pointerdown / touchend / click within PHI^-1 s)
    note('gesture ' + e.type + ': ' + st()); if (st() === 'closed') rebuild('gesture, closed');
    var p = null; try { p = AU.ctx && AU.ctx.resume(); } catch (er) {} playEl();
    var stuck = AU.rung > TOP; function chk() { if (st() !== 'running' && stuck) rebuild('gesture, still stuck after the ladder'); }   // a plain resume first; rebuild only if that fails too
    if (p && p.then) p.then(chk, chk);
    var D = kit(); try { if (D && D._kit.stalled) D._kit.resumeTap(); } catch (er) {}
    clearTimeout(AU.t); AU.t = 0; setTimeout(function () { attempt('gesture'); }, 0);
  }
  ['pointerdown', 'pointerup', 'touchend', 'keydown'].forEach(function (n) { doc.addEventListener(n, function (e) {   // iPhone unlock (S-0017): touch on lift, mouse on press, keys
    if (e.type === 'pointerdown' && e.pointerType !== 'mouse') return; if (e.type === 'pointerup' && e.pointerType === 'mouse') return; gesture(e); }, true); });
  // the one gentle button: fixed just under the header (measured), palette colours, reader text size; the DJ's pulse rests while it shows
  function showBack() {
    if (AU.btn) return; var b = doc.createElement('button'); b.type = 'button'; b.className = 'sound-back'; b.textContent = 'tap to bring the sound back';
    var top = 0; ['q-head', 'dj-play'].forEach(function (id) { var n = doc.getElementById(id); n = n && id === 'dj-play' ? n.closest('.dad-dj') || n : n;   // under the header, and under the DJ panel when it is open
      var r = n && n.getClientRects().length ? n.getBoundingClientRect() : null; if (r && r.height) top = Math.max(top, r.bottom); });
    b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:calc(' + Math.round(top) + 'px + 1rem);z-index:60;font:inherit;font-size:1rem;' +
      'color:#9DBCCE;background:#143A57;border:1px solid #1F5478;border-radius:2rem;padding:calc(1rem / ' + PHI + ') 1rem;min-height:44px;' +
      'box-shadow:0 0 1rem rgba(10,242,255,' + IP * IP * IP + ');cursor:pointer;white-space:nowrap;max-width:calc(100vw - 2rem)';   // unit: 44 px minimum tap target (Apple HIG, cited)
    b.addEventListener('click', function (e) { e.stopPropagation(); note('tap: sound-back button'); gesture(e); });
    doc.documentElement.setAttribute('data-sound-back', ''); doc.body.appendChild(b); AU.btn = b; note('show: tap to bring the sound back');
  }
  function hideBack() { if (!AU.btn) return; try { AU.btn.remove(); } catch (e) {} AU.btn = null; doc.documentElement.removeAttribute('data-sound-back'); }
  try { var stl = doc.createElement('style'); stl.textContent = '[data-sound-back] .is-resuming,[data-sound-back] .is-resuming *{animation:none!important}'; (doc.head || doc.documentElement).appendChild(stl); } catch (e) {}
  function hook() {                                                                // attach to the DJ's context and bridge once they exist (and after a rebuild)
    var D = kit(); if (!D) return; var c = D._kit.ctx, a = D._kit.el;
    if (c && c !== AU.ctx) { AU.ctx = c; if (!c.__djResume) { c.__djResume = 1;   // one listener per context
      c.addEventListener('statechange', function () { if (c !== AU.ctx) return; note('state: ' + c.state);
        if (c.state === 'running') { if (AU.down) attempt('state'); } else if (wanted()) later('state'); }); } }
    if (a && a !== AU.el) { AU.el = a; if (!a.__djResume) { a.__djResume = 1;
      a.addEventListener('pause', function () { if (a !== AU.el || !wanted()) return; note('bridge: pause'); later('bridge-pause'); });
      a.addEventListener('play', function () { if (a !== AU.el) return; if (wanted() && AU.down) { note('bridge: play'); later('bridge-play'); } }); } }
  }
  function poke(why) { return function () { hook(); if (!wanted()) { drop(); return; } if (AU.down || !done()) later(why); }; }
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden) poke('visible')(); });
  root.addEventListener('pageshow', poke('pageshow'));
  root.addEventListener('focus', poke('focus'));
  doc.addEventListener('resume', poke('resume'));
  ['touchend', 'click', 'keydown'].forEach(function (n) { doc.addEventListener(n, function () { setTimeout(hook, 0); }, true); });   // the DJ builds its context on a tap
  setInterval(function () { if (!doc.hidden || !AU.down) poke('beat')(); }, CADENCE * MS);   // phi: a PHI^4 s check catches a silent interruption end
  try { var MSn = navigator.mediaSession; if (MSn) { var sa = MSn.setActionHandler.bind(MSn);   // the lock screen / Control Center play button also starts the ladder
    MSn.setActionHandler = function (k, f) { return sa(k, k === 'play' && f ? function (d) { note('session: play'); var r = f(d); setTimeout(poke('session-play'), 0); return r; } : f); }; } } catch (e) {}
  root.RhythmContinuity.audio = { info: function () { return { state: st(), down: AU.down, tries: AU.n, rung: AU.rung, button: !!AU.btn, el: AU.el ? { paused: AU.el.paused } : null }; },
    log: function () { return AU.log.map(function (l) { return new Date(l[0]).toTimeString().slice(0, 8) + ' ' + l[1]; }); }, clearLog: function () { AU.log = []; try { root.localStorage.removeItem(LOGK); } catch (e) {} },
    retry: function () { poke('manual')(); } };
})(window);
