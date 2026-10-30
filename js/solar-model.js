/* SOLAR MODEL, the drawer (solarsystem 26 Oct; solarsys1, Danny 11:10 AWST 30 Oct 2026, t289u: "model all the planets as animations
   ... build out their complete solar system now ... see it sweeping through the screen again with the sun at the centre ... a complete
   gravity and position model of the solar system including all its moons"). Tier 2, after js/ping-layer.js and js/solar-system.js.
   Draws js/solar-system.js (the numbers: orbits, sizes, masses, periods, all cited and phi-compressed) round the shared Sun (rule 13):
     ☀️ sun (PingLayer anchor 'sun', the shared PhiSun)                     root
       🌍 earth + 🌙 moon group (PingLayer anchors; drawn by js/ping-layer.js)  Layer A
       ☿ ♀ ♂ ♃ ♄ ♅ ♆ + Pluto: discs on their Kepler ellipses, in front of / behind the Sun (z), Saturn with its rings   Layer A
         their 20 major moons: small discs round each planet, in front of / behind it, drawn only while that planet's system is on screen
       💫 a long ellipse along axis B (TR -> BL), Sun at its focus            Layer B (over everything, header and footer included)
   Was: Mercury..Jupiter only, on real Kepler III periods (Jupiter 9 min); the top sweep's 🪐 🌑 🌕 (js/top-sweep.js, no longer loaded)
   stood in for the outer planets. Now every period is screen Kepler III round one screen GM (js/solar-system.js), Jupiter ~2 min.
   The 💫: Halley's eccentricity (cite: JPL SBDB 1P/Halley e = 0.96714), aphelion on the BL end of axis B, Kepler III against the Earth.
   INTENSITY dial (dials.html tile 7, 'intensity', rungs 1..6, default 5 = rich): every body declares a pump count n; its strength is
   amp(n + r - 5) = 1 - PHI^-(n + r - 5), applied to opacity; at or below zero the body is not drawn at all.
   COLLISIONS: the planets (.sm-p) are js/emoji-collide.js bodies (as the top sweep's were). TAPS: any disc opens the 'sun' view.
   One rAF loop capped at PHI^-7 s, transforms + opacity only, off-screen bodies skipped, paused while hidden; reduced motion: one still frame. */
(function () {
  'use strict';
  var doc = document, root = window;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, TAU = 2 * Math.PI, MS = 1e3;   // phi; unit: a turn, ms per s
  var RM = root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // colours (anchor: true-colour imagery; cite in each line) and pump counts n (Fibonacci). Orbits, sizes, masses: js/solar-system.js.
  var LOOK = {
    mercury: '#a8a8a8,#5e5e5e', venus: '#f4e7c3,#c9a96b', mars: '#e2774a,#8f2f12',   // anchor: MESSENGER greys, Mariner 10 cloud deck, Viking rust
    jupiter: '#e9dcc0,#b98a5e,band', saturn: '#eadcb0,#b39867,band',                // anchor: Cassini belts and zones (Jupiter, Saturn)
    uranus: '#d2f1f4,#86c3cc', neptune: '#9bb8e6,#47669e', pluto: '#eadbc6,#9c7c62',  // anchor: Voyager 2 (Uranus, Neptune, 2024 true-colour), New Horizons (Pluto)
    io: '#f3e48a,#b8902f', europa: '#ece5d6,#ab9a80', ganymede: '#c9c0b2,#76695c', callisto: '#a99b88,#4e443b',   // anchor: Galileo true colour
    titan: '#e8bb6a,#9c6b2b', triton: '#ecdfd2,#a99c8f', charon: '#c9c3bd,#6f6a66' };   // anchor: Cassini haze, Voyager 2, New Horizons
  var GREY = '#d0d0d0,#6b6b6b';                                          // anchor: the Moon's grey (every other moon)
  var HALLEY = 0.96714;                                                   // cite: JPL Small-Body Database, 1P/Halley eccentricity
  var DEF = 5;                                                            // phi: intensity dial default rung (rich)
  function dial(id, def) { try { var d = JSON.parse(localStorage.getItem('dadSceneDials.v1') || '{}'); return d[id] != null ? +d[id] : def; } catch (e) { return def; } }
  function amp(n) { return n > 0 ? 1 - Math.pow(IP, n) : 0; }            // phi: the axes audit's amp(n)
  function kep(M, e) { var E = M, i; for (i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }   // unit: Newton steps (8 covers Halley's e)
  var tries = 0;
  function start() {
    var PL = root.PingLayer, SS = root.SolarSystem, LA = doc.querySelector('.pl-layer');
    if (!PL || !PL.anchors || !PL.anchors.sun || !PL.anchors.earth || !LA || !SS) { tries++; return setTimeout(start, MS * Math.pow(PHI, Math.min(tries, 5)) * IP); }   // phi: free-wheel wait for the ping layer + the model, growing gaps
    var A = PL.anchors;
    var css = '.sm-b{position:fixed;inset:0;pointer-events:none;overflow:hidden;overflow:clip;contain:strict}' +
      '.sm-n{position:absolute;left:0;top:0;line-height:1;will-change:transform,opacity;border-radius:50%}' +
      '.sm-m{will-change:auto}' +                                         // unit: moons are small and many: no layer of their own
      '.sm-ring{position:absolute;left:50%;top:50%;border-radius:50%;pointer-events:none;box-sizing:border-box;transform:translate(-50%,-50%)}';   // unit: centred on the disc
    var st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);
    // Layer B: one above the header / footer (measured), like the top sweep
    var LB = doc.createElement('div'); LB.className = 'sm-b'; LB.setAttribute('aria-hidden', 'true');
    var zt = 0; ['#q-head', '.q-head', '.foot'].forEach(function (q) { var e = doc.querySelector(q); if (e) { var v = parseInt(getComputedStyle(e).zIndex, 10); if (v > zt) zt = v; } });
    LB.style.zIndex = zt + 1; doc.body.appendChild(LB);                   // unit: one above the measured header / footer
    var ZS = +((A.sun && A.sun.z) || 6), Fq = SS.frame().q;              // unit: the Sun's z inside the ping layer (ZS); the orbit depth
    function paint(e, c, band) { c = c.split(',');
      e.style.background = band || c[2] ? 'radial-gradient(circle at ' + Math.pow(IP, 2) * 100 + '% ' + Math.pow(IP, 2) * 100 + '%,rgba(255,255,255,' + Math.pow(IP, 3) + '),transparent ' + IP * 100 + '%),repeating-linear-gradient(0deg,' + c[0] + ' 0 ' + Math.pow(IP, 3) * 100 + '%,' + c[1] + ' ' + Math.pow(IP, 3) * 100 + '% ' + Math.pow(IP, 2) * 100 + '%)'   // phi: belt / zone widths, a lit cap
        : 'radial-gradient(circle at ' + Math.pow(IP, 2) * 100 + '% ' + Math.pow(IP, 2) * 100 + '%,' + c[0] + ',' + c[1] + ')';   // phi: lit from the Sun's side
      e.style.boxShadow = 'inset -' + Math.pow(IP, 4) + 'em -' + Math.pow(IP, 4) + 'em ' + Math.pow(IP, 3) + 'em rgba(0,0,0,' + IP + ')'; }   // phi: night side shading
    var P = [];                                                           // drawn bodies: planets first, then their moons
    SS.order.forEach(function (id) {
      var b = SS.bodies[id]; if (id === 'earth' || id === 'moon') return;   // the PingLayer draws these two
      var e = doc.createElement('span'), moon = b.kind === 'moon'; e.className = 'sm-n ' + (moon ? 'sm-m' : 'sm-p') + ' sm-' + id;
      paint(e, LOOK[id] || GREY);
      if (b.ring) { var rg = doc.createElement('i'); rg.className = 'sm-ring'; var ro = b.ring[1] * 100;   // unit: percent of the disc; ring[1] = outer edge in planet radii, so x the diameter
        rg.style.width = ro + '%'; rg.style.height = ro * Fq + '%';      // the ring plane in the orbit's own depth (PHI^-2)
        rg.style.border = (b.ring[1] - b.ring[0]) / 2 + 'em solid rgba(234,220,176,' + IP + ')';   // unit: the band C..A in diameters (em = the disc); phi: alpha; anchor: Saturn's disc colour
        e.appendChild(rg); }
      LA.appendChild(e);
      P.push({ id: id, b: b, el: e, moon: moon, n: 3, z: null, op: -1, sz: -1, vis: true });   // phi: n = 3 (planet-level)
    });
    var BY = {}; P.forEach(function (p) { BY[p.id] = p; });
    var star = doc.createElement('span'); star.className = 'sm-n sm-dizzy'; star.textContent = '\uD83D\uDCAB'; star.style.borderRadius = '0'; LB.appendChild(star);
    var S = { el: star, M: TAU / 2, n: 2, op: -1, sz: -1, T: 0 };          // unit: starts at aphelion (the BL end, in view); phi: n = 2 (twinkle-level)
    var r = dial('intensity', DEF), pump = null;
    function k() { var Pp = root.PhiPumps; if (Pp && !pump) pump = Pp.node('solar', 3, 7, Math.pow(IP, 4), Pp.page, 21); try { return pump ? pump.out() : 1; } catch (e) { return 1; } }   // phi: 3 pumps, rungs 7.., depth PHI^-4
    function axisB() { var F = root.PhiAxes && PhiAxes.frame; if (F && F.w) return { x: F.b.x, y: F.b.y, end: PhiAxes.at(0, 1) };
      var w = innerWidth, h = innerHeight, L = Math.hypot(w, h); return { x: -w / L, y: h / L, end: { x: 0, y: h } }; }   // unit: TR -> BL fallback
    function put(o, x, y, size, sc, op, z, round) {
      if (o.sz !== size) { o.sz = size; o.el.style.width = o.el.style.height = round ? size + 'px' : ''; o.el.style.fontSize = size + 'px'; }
      if (o.op !== op) { o.op = op; o.el.style.opacity = op; o.el.style.display = op > 0 ? '' : 'none'; }
      if (z != null && o.z !== z) { o.z = z; o.el.style.zIndex = z; }
      o.el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(calc(-100% / 2),calc(-100% / 2)) scale(' + sc + ')';   // unit: centre on the point
    }
    function show(o, v) { if (o.vis !== v) { o.vis = v; o.el.style.visibility = v ? '' : 'hidden'; } }
    var OPA = IP;                                                         // phi: base opacity PHI^-1 (was PHI^-2; one rung up so the sweep reads, t289u 'be able to see it sweeping')
    var pos = {};
    function draw() {
      var F = SS.frame(), sun = A.sun, W = F.W, H = F.H, t = SS.clock(), node = F.node;
      pos = {};
      P.forEach(function (p) {
        var q = SS.at(p.id, t, F); pos[p.id] = q; p.x = q.x; p.y = q.y; p.front = q.front;
        var full = node * p.b.ks, reach = q.d * (p.b.ring ? p.b.ring[1] : 1) / 2;   // unit: the drawn radius (Saturn: its rings)
        if (!p.moon) { var sys = p.b.moons.length ? SS.bodies[p.b.moons[p.b.moons.length - 1]].kr * full / 2 * q.sc : 0;   // the outermost moon's reach
          p.sys = q.x + Math.max(reach, sys) > 0 && q.x - Math.max(reach, sys) < W && q.y + Math.max(reach, sys) > 0 && q.y - Math.max(reach, sys) < H; }
        var parent = p.moon ? BY[p.b.parent] : null;
        var on = q.x + reach > 0 && q.x - reach < W && q.y + reach > 0 && q.y - reach < H && (!parent || parent.sys);
        show(p, on); if (!on) return;
        var z = p.moon ? (parent.z != null ? parent.z : ZS) + (q.front ? 1 : -1) : (q.front ? ZS + ZS / 2 : ZS - ZS / 2);   // unit: in front of / behind the Sun; a moon +-1 round its planet
        put(p, q.x, q.y, full, q.sc, OPA * amp(p.n + r - DEF), z, true);   // unit: drawn diameter = full x its depth scale
      });
      var B = axisB(), ae = F.ae, d = Math.hypot(B.end.x - sun.x, B.end.y - sun.y), a = d / (1 + HALLEY), bb = a * Math.sqrt(1 - HALLEY * HALLEY);   // aphelion on the BL end of axis B
      var ux = (B.end.x - sun.x) / (d || 1), uy = (B.end.y - sun.y) / (d || 1), E2 = kep(S.M, HALLEY), cu = -(Math.cos(E2) - HALLEY), sv = Math.sin(E2);   // unit: +u toward the aphelion
      S.T = F.TO * Math.pow(a / ae, 3 / 2);                                // cite: Kepler III in screen units against the Earth's orbit
      S.x = sun.x + a * cu * ux - bb * sv * uy; S.y = sun.y + a * cu * uy + bb * sv * ux;
      put(S, S.x, S.y, node, 1, Math.pow(IP, 2) * amp(S.n + r - DEF), null, false);   // phi: Layer B ceiling PHI^-2 (it crosses text)
    }
    var raf = 0, last = 0, tl = 0, FRAME = MS * Math.pow(IP, 7);           // phi: frame cap PHI^-7 s
    function tick(t) { raf = 0; if (doc.hidden) return; if (t - last >= FRAME) { var dt = tl ? Math.min(t - tl, MS) / MS : 0, kk = k(); tl = t; last = t;   // unit: dt capped at a second
        SS.advance(dt * kk); S.M -= TAU * dt / (S.T / kk); draw(); }   // the model's clock runs on the solar pump; minus: the Earth's sense of travel
      raf = requestAnimationFrame(tick); }
    function go() { if (!raf && !doc.hidden && !RM) raf = requestAnimationFrame(tick); }
    draw(); go();
    if (root.Arrivals) P.forEach(function (p) { if (!p.moon) Arrivals.land(p.el, 'pop', 1); });   // rule 14: each planet arrives (after its first draw, so it sweeps up to its own opacity), then a pop
    doc.addEventListener('visibilitychange', function () { tl = 0; if (!doc.hidden) { r = dial('intensity', DEF); go(); } });
    addEventListener('resize', function () { requestAnimationFrame(draw); });
    var kids = {}; P.forEach(function (p) { if (!p.moon) kids[p.id] = { layer: 'A', moons: p.b.moons }; });
    kids.earth = { anchor: 'earth', layer: 'A', children: { moon: { anchor: 'moon', layer: 'A', with: ['satellite', 'astronaut'] } } }; kids.dizzy = { layer: 'B', axis: 'B' };
    root.SolarModel = {
      tree: { sun: { anchor: 'sun', layer: 'A', children: kids } },
      info: function () { return { intensity: r, clock: SS.clock(), planets: P.filter(function (p) { return !p.moon; }).map(function (p) { return { id: p.id, e: p.b.e, T: SS.period(p.id), front: p.front, x: p.x, y: p.y, op: p.op, size: p.sz, shown: p.vis }; }),
        moons: P.filter(function (p) { return p.moon; }).map(function (p) { return { id: p.id, parent: p.b.parent, x: p.x, y: p.y, front: p.front, shown: p.vis }; }),
        dizzy: { e: HALLEY, T: S.T, x: S.x, y: S.y, op: S.op }, layerBz: LB.style.zIndex }; } };
  }
  start();
})();
