/* SOLAR MODEL (solarsystem; Danny's solar-system principle 15:32 AWST 26 Oct, Moon round the Earth 17:50 AWST). Tier 2, after js/ping-layer.js.
   ONE orbit tree bound to the PingLayer anchor graph (rule 13: members bind to anchors, never to coordinates):
     ☀️ sun (PingLayer anchor 'sun', the shared PhiSun)                    root
       🌍 earth (PingLayer anchor 'earth', its existing orbit)               Layer A
         🌙 moon group (PingLayer anchor 'moon': 🌙 + 🛰️ + 🧑‍🚀, orbits the Earth) Layer A
       ☿ ♀ ♂ ♃ planets: drawn discs on Kepler ellipses round the Sun        Layer A (in the PingLayer layer, behind/in front of the Sun)
       💫 a long ellipse along axis B (TR -> BL), Sun at its focus           Layer B (over everything, header and footer included)
   Planets: real eccentricity and semi-major axis (cite: NASA JPL, Standish "Approximate Positions of the Planets", J2000 elements),
   today's real mean anomaly at load, then each runs at its real Kepler III period ratio to the Earth's on-screen orbit (T = T_earth x a^1.5).
   The orbit plane, depth and size law are the Earth's own (PingLayer spec 'earth'): screen semi-major = the Earth's x a_AU^PHI^-1
   (a phi compression so Mercury..Jupiter share one screen), size = the Moon node x PHI x (R / R_earth)^PHI^-2 (cite: NASA planetary fact
   sheets, mean radius ratios), scaled by depth PHI^(sin E - 1) like the Earth. The 💫: Halley's eccentricity (cite: JPL SBDB 1P/Halley
   e = 0.96714), aphelion on the BL end of axis B, period by Kepler III from its screen semi-major against the Earth's.
   INTENSITY dial (dials.html tile 7, 'intensity', rungs 1..6, default 5 = rich): every body declares a pump count n; its strength is
   amp(n + r - 5) = 1 - PHI^-(n + r - 5) (the axes audit's amp(n)), applied to opacity; at or below zero the body is not drawn at all.
   One rAF loop capped at PHI^-7 s, transforms + opacity only, paused while hidden; reduced motion: one still frame. */
(function () {
  'use strict';
  var doc = document, root = window;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, TAU = 2 * Math.PI, DEG = TAU / 360, MS = 1e3;   // phi; unit: a turn, a degree, ms per s
  var RM = root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var J2000 = Date.UTC(2000, 0, 1, 12), CENT = 36525 * 86400 * MS;       // cite: J2000.0 epoch; unit: a Julian century in ms
  // cite: JPL Standish table 1 (1800-2050): a (AU), e, mean longitude L (deg), longitude of perihelion w (deg), L rate (deg / century);
  //       NASA fact sheets: mean radius / Earth's (Mercury 0.383, Venus 0.950, Mars 0.532, Jupiter 10.97); n = pump count (Fibonacci)
  var EL = [
    { id: 'mercury', a: 0.38709927, e: 0.20563593, L: 252.25032350, w: 77.45779628, dL: 149472.67411175, r: 0.383, n: 3, c: '#a8a8a8,#5e5e5e' },   // anchor: true-colour greys (NASA MESSENGER imagery)
    { id: 'venus',   a: 0.72333566, e: 0.00677672, L: 181.97909950, w: 131.60246718, dL: 58517.81538729, r: 0.950, n: 3, c: '#f4e7c3,#c9a96b' },  // anchor: true-colour cloud deck (Mariner 10)
    { id: 'mars',    a: 1.52371034, e: 0.09339410, L: -4.55343205, w: -23.94362959, dL: 19140.30268499, r: 0.532, n: 3, c: '#e2774a,#8f2f12' },  // anchor: true-colour rust (Viking imagery)
    { id: 'jupiter', a: 5.20288700, e: 0.04838624, L: 34.39644051, w: 14.72847983, dL: 3034.74612775, r: 10.97, n: 3, c: '#e9dcc0,#b98a5e', band: true } ];   // anchor: true-colour belts and zones (Cassini)
  var HALLEY = 0.96714;                                                   // cite: JPL Small-Body Database, 1P/Halley eccentricity
  var DEF = 5;                                                            // phi: intensity dial default rung (rich)
  function dial(id, def) { try { var d = JSON.parse(localStorage.getItem('dadSceneDials.v1') || '{}'); return d[id] != null ? +d[id] : def; } catch (e) { return def; } }
  function amp(n) { return n > 0 ? 1 - Math.pow(IP, n) : 0; }            // phi: the axes audit's amp(n)
  var tries = 0;
  function start() {
    var PL = root.PingLayer, LA = doc.querySelector('.pl-layer');
    if (!PL || !PL.anchors || !PL.anchors.sun || !PL.anchors.earth || !LA) { tries++; return setTimeout(start, MS * Math.pow(PHI, Math.min(tries, 5)) * IP); }   // phi: free-wheel wait for the ping layer, growing gaps
    var A = PL.anchors, SP = PL.spec, ES = SP.earth.orb;                  // the Earth's orbit spec: [semi-major x view width, depth, e]
    var TO = (PL.info().orbit || {}).period || Math.pow(PHI, 8);         // phi: the Earth's on-screen orbit period (PingLayer TO)
    var css = '.sm-b{position:fixed;inset:0;pointer-events:none;overflow:hidden;overflow:clip;contain:strict}' +
      '.sm-n{position:absolute;left:0;top:0;line-height:1;will-change:transform,opacity;border-radius:50%}';
    var st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);
    // Layer B: one above the header / footer (measured), like the top sweep
    var LB = doc.createElement('div'); LB.className = 'sm-b'; LB.setAttribute('aria-hidden', 'true');
    var zt = 0; ['#q-head', '.q-head', '.foot'].forEach(function (q) { var e = doc.querySelector(q); if (e) { var v = parseInt(getComputedStyle(e).zIndex, 10); if (v > zt) zt = v; } });
    LB.style.zIndex = zt + 1; doc.body.appendChild(LB);                   // unit: one above the measured header / footer
    var ZS = +((A.sun && A.sun.z) || 6), now0 = Date.now();              // unit: the Sun's z inside the ping layer (ZS)
    var P = EL.map(function (b, i) {
      var e = doc.createElement('span'); e.className = 'sm-n sm-' + b.id; var c = b.c.split(',');
      e.style.background = b.band ? 'repeating-linear-gradient(0deg,' + c[0] + ' 0 ' + Math.pow(IP, 3) * 100 + '%,' + c[1] + ' ' + Math.pow(IP, 3) * 100 + '% ' + Math.pow(IP, 2) * 100 + '%)'   // phi: belt / zone widths
        : 'radial-gradient(circle at ' + Math.pow(IP, 2) * 100 + '% ' + Math.pow(IP, 2) * 100 + '%,' + c[0] + ',' + c[1] + ')';   // phi: lit from the Sun's side
      e.style.boxShadow = 'inset -' + Math.pow(IP, 4) + 'em -' + Math.pow(IP, 4) + 'em ' + Math.pow(IP, 3) + 'em rgba(0,0,0,' + IP + ')';   // phi: night side shading
      LA.appendChild(e);
      var M0 = (b.L - b.w + b.dL * (now0 - J2000) / CENT) * DEG;          // cite: mean anomaly today = L - w (Standish)
      return { b: b, el: e, M: M0, T: TO * Math.pow(b.a, 3 / 2), ka: Math.pow(b.a, IP), ks: PHI * Math.pow(b.r, IP * IP), n: b.n, z: null, op: -1, sz: -1 };   // cite: Kepler III; phi: compressions
    });
    var star = doc.createElement('span'); star.className = 'sm-n sm-dizzy'; star.textContent = '\uD83D\uDCAB'; star.style.borderRadius = '0'; LB.appendChild(star);
    var S = { el: star, M: TAU / 2, n: 2, op: -1, sz: -1, T: TO };       // unit: starts at aphelion (the BL end, in view); phi: n = 2 (twinkle-level)
    var r = dial('intensity', DEF), pump = null;
    function k() { var Pp = root.PhiPumps; if (Pp && !pump) pump = Pp.node('solar', 3, 7, Math.pow(IP, 4), Pp.page, 21); try { return pump ? pump.out() : 1; } catch (e) { return 1; } }   // phi: 3 pumps, rungs 7.., depth PHI^-4
    function kep(M, e) { var E = M, i; for (i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }   // unit: Newton steps (8 covers Halley's e)
    function axisB() { var F = root.PhiAxes && PhiAxes.frame; if (F && F.w) return { x: F.b.x, y: F.b.y, end: PhiAxes.at(0, 1) };
      var w = innerWidth, h = innerHeight, L = Math.hypot(w, h); return { x: -w / L, y: h / L, end: { x: 0, y: h } }; }   // unit: TR -> BL fallback
    function put(o, x, y, size, sc, op, z, round) {
      if (o.sz !== size) { o.sz = size; o.el.style.width = o.el.style.height = round ? size + 'px' : ''; o.el.style.fontSize = size + 'px'; }
      if (o.op !== op) { o.op = op; o.el.style.opacity = op; o.el.style.display = op > 0 ? '' : 'none'; }
      if (z != null && o.z !== z) { o.z = z; o.el.style.zIndex = z; }
      o.el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(calc(-100% / 2),calc(-100% / 2)) scale(' + sc + ')';   // unit: centre on the point
    }
    var OPA = Math.pow(IP, 2);                                            // phi: planet base opacity PHI^-2 (the PingLayer node rung)
    function draw() {
      var sun = A.sun, W = A.view ? A.view.w : innerWidth, ae = ES[0] * W, q = ES[1], node = A.moon ? A.moon.s0 || A.moon.s : Math.min(innerWidth, innerHeight) * Math.pow(IP, 5.5);   // phi: fallback node size as the PingLayer's
      P.forEach(function (p) {
        var E = kep(p.M, p.b.e), sn = Math.sin(E), ra = ae * p.ka, sc = Math.pow(PHI, sn - 1);   // phi: the Earth's depth law
        var x = sun.x + ra * (Math.cos(E) - p.b.e), y = sun.y + ra * q * sn;
        put(p, x, y, node * p.ks, sc, OPA * amp(p.n + r - DEF), sn > 0 ? ZS + ZS / 2 : ZS - ZS / 2, true);   // unit: in front of / behind the Sun
        p.front = sn > 0; p.x = x; p.y = y;
      });
      var B = axisB(), d = Math.hypot(B.end.x - sun.x, B.end.y - sun.y), a = d / (1 + HALLEY), bb = a * Math.sqrt(1 - HALLEY * HALLEY);   // aphelion on the BL end of axis B
      var ux = (B.end.x - sun.x) / (d || 1), uy = (B.end.y - sun.y) / (d || 1), E2 = kep(S.M, HALLEY), cu = -(Math.cos(E2) - HALLEY), sv = Math.sin(E2);   // unit: +u toward the aphelion
      S.T = TO * Math.pow(a / ae, 3 / 2);                                  // cite: Kepler III in screen units against the Earth's orbit
      S.x = sun.x + a * cu * ux - bb * sv * uy; S.y = sun.y + a * cu * uy + bb * sv * ux;
      put(S, S.x, S.y, node, 1, Math.pow(IP, 2) * amp(S.n + r - DEF), null, false);   // phi: Layer B ceiling PHI^-2 (it crosses text)
    }
    var raf = 0, last = 0, tl = 0, FRAME = MS * Math.pow(IP, 7);           // phi: frame cap PHI^-7 s
    function tick(t) { raf = 0; if (doc.hidden) return; if (t - last >= FRAME) { var dt = tl ? Math.min(t - tl, MS) / MS : 0, kk = k(); tl = t; last = t;   // unit: dt capped at a second
        P.forEach(function (p) { p.M -= TAU * dt / (p.T / kk); }); S.M -= TAU * dt / (S.T / kk); draw(); }   // minus: the Earth's sense of travel
      raf = requestAnimationFrame(tick); }
    function go() { if (!raf && !doc.hidden && !RM) raf = requestAnimationFrame(tick); }
    draw(); go();
    if (root.Arrivals) P.forEach(function (p) { Arrivals.land(p.el, 'pop', 1); });   // rule 14: each planet arrives (after its first draw, so it sweeps up to its own opacity), then a pop
    doc.addEventListener('visibilitychange', function () { tl = 0; if (!doc.hidden) { r = dial('intensity', DEF); go(); } });
    addEventListener('resize', function () { requestAnimationFrame(draw); });
    root.SolarModel = {
      tree: { sun: { anchor: 'sun', layer: 'A', children: { earth: { anchor: 'earth', layer: 'A', children: { moon: { anchor: 'moon', layer: 'A', with: ['satellite', 'astronaut'] } } },
        mercury: { layer: 'A' }, venus: { layer: 'A' }, mars: { layer: 'A' }, jupiter: { layer: 'A' }, dizzy: { layer: 'B', axis: 'B' } } } },
      info: function () { return { intensity: r, planets: P.map(function (p) { return { id: p.b.id, e: p.b.e, T: p.T, front: p.front, x: p.x, y: p.y, op: p.op, size: p.sz }; }), dizzy: { e: HALLEY, T: S.T, x: S.x, y: S.y, op: S.op }, layerBz: LB.style.zIndex }; } };
  }
  start();
})();
