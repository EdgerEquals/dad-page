/* SOLAR MODEL, the drawer (solarsystem 26 Oct; solarsys1, Danny 11:10 AWST 30 Oct 2026, t289u: "model all the planets as animations
   ... build out their complete solar system now ... see it sweeping through the screen again with the sun at the centre ... a complete
   gravity and position model of the solar system including all its moons"). Tier 2, after js/ping-layer.js and js/solar-system.js.
   solarsys4 (Danny t296u, "everything should be at true distances ... nothing's meant to be made up"): draws js/solar-system.js at TRUE
   SCALE round the fixed Sun (rule 13; the Sun never moves, nothing sweeps): one km -> px scale, real 3-D Kepler ellipses, real places today.
     ☀️ sun (PingLayer anchor 'sun', the shared PhiSun; its glyph is the PingLayer's display size, NOT the true Sun, ~0.05 px here)   root
       ☿ ♀ 🜨 ♂ ♃ ♄ ♅ ♆ + Pluto and their 21 major moons (the Moon included): dots at their true places, face-on from ecliptic north   Layer A
         DISPLAY FLOOR (not physics): each dot is max(true diameter, one device pixel); at this scale every body is far below a pixel,
         so all of them draw at the floor. Saturn's ring the same (its true outer radius, floored). Sizes wait for the zoom work.
       (the PingLayer's big decorative Earth + Moon group still ride their own display orbit in js/ping-layer.js; not this model)
       💫 a long ellipse along axis B (TR -> BL), Sun at its focus            Layer B (over everything, header and footer included)
   The 💫 stays a display comet: Halley's eccentricity (cite: JPL SBDB 1P/Halley e = 0.96714), aphelion on the BL end of axis B, its
   period by Kepler III against the real Earth's orbit at the same scale and time factor (not the real Halley's place).
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
    titan: '#e8bb6a,#9c6b2b', triton: '#ecdfd2,#a99c8f', charon: '#c9c3bd,#6f6a66',   // anchor: Cassini haze, Voyager 2, New Horizons
    earth: '#8fb6e8,#2d5a9a' };                                          // anchor: Blue Marble (oceans, cloud)
  var GREY = '#d0d0d0,#6b6b6b';                                          // anchor: the Moon's grey (every other moon)
  var HALLEY = 0.96714;                                                   // cite: JPL Small-Body Database, 1P/Halley eccentricity
  var DEF = 5;                                                            // phi: intensity dial default rung (rich)
  function dial(id, def) { try { var d = JSON.parse(localStorage.getItem('dadSceneDials.v1') || '{}'); return d[id] != null ? +d[id] : def; } catch (e) { return def; } }
  function amp(n) { return n > 0 ? 1 - Math.pow(IP, n) : 0; }            // phi: the axes audit's amp(n)
  function kep(M, e) { var E = M, i; for (i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }   // unit: Newton steps (8 covers Halley's e)
  var tries = 0, ZP = !RM, zpLoad = 0;
  function start() {
    var PL = root.PingLayer, SS = root.SolarSystem, LA = doc.querySelector('.pl-layer');
    if (!PL || !PL.anchors || !PL.anchors.sun || !PL.anchors.earth || !LA || !SS) { tries++; return setTimeout(start, MS * Math.pow(PHI, Math.min(tries, 5)) * IP); }   // phi: free-wheel wait for the ping layer + the model, growing gaps
    var A = PL.anchors;
    var css = '.sm-b{position:fixed;inset:0;pointer-events:none;overflow:hidden;overflow:clip;contain:strict}' +
      '.sm-n{position:absolute;left:0;top:0;line-height:1;will-change:transform,opacity;border-radius:50%}' +
      '.sm-m{will-change:auto}' +                                         // unit: moons are small and many: no layer of their own
      '.sm-g{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);line-height:1;font-weight:400;white-space:nowrap}' +
      '.sm-ring{position:absolute;left:50%;top:50%;border-radius:50%;pointer-events:none;box-sizing:border-box;transform:translate(-50%,-50%)}';   // unit: centred on the disc
    var st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);
    // Layer B: one above the header / footer (measured), like the top sweep
    var LB = doc.createElement('div'); LB.className = 'sm-b'; LB.setAttribute('aria-hidden', 'true');
    var zt = 0; ['#q-head', '.q-head', '.foot'].forEach(function (q) { var e = doc.querySelector(q); if (e) { var v = parseInt(getComputedStyle(e).zIndex, 10); if (v > zt) zt = v; } });
    LB.style.zIndex = zt + 1; doc.body.appendChild(LB);                   // unit: one above the measured header / footer
    var ZS = +((A.sun && A.sun.z) || 6);                                 // unit: the Sun's z inside the ping layer (ZS)
    function paint(e, c, band) { c = c.split(',');
      e.style.background = band || c[2] ? 'radial-gradient(circle at ' + Math.pow(IP, 2) * 100 + '% ' + Math.pow(IP, 2) * 100 + '%,rgba(255,255,255,' + Math.pow(IP, 3) + '),transparent ' + IP * 100 + '%),repeating-linear-gradient(0deg,' + c[0] + ' 0 ' + Math.pow(IP, 3) * 100 + '%,' + c[1] + ' ' + Math.pow(IP, 3) * 100 + '% ' + Math.pow(IP, 2) * 100 + '%)'   // phi: belt / zone widths, a lit cap
        : 'radial-gradient(circle at ' + Math.pow(IP, 2) * 100 + '% ' + Math.pow(IP, 2) * 100 + '%,' + c[0] + ',' + c[1] + ')';   // phi: lit from the Sun's side
      e.style.boxShadow = 'inset -' + Math.pow(IP, 4) + 'em -' + Math.pow(IP, 4) + 'em ' + Math.pow(IP, 3) + 'em rgba(0,0,0,' + IP + ')'; }   // phi: night side shading
    var P = [];                                                           // drawn bodies: planets first, then their moons
    SS.order.forEach(function (id) {
      var b = SS.bodies[id];
      var e = doc.createElement('span'), moon = b.kind === 'moon'; e.className = 'sm-n ' + (moon ? 'sm-m' : 'sm-p') + ' sm-' + id;
      paint(e, LOOK[id] || GREY);
      if (b.ring) { var rg = doc.createElement('i'); rg.className = 'sm-ring';   // sized per frame in draw(): its true outer diameter, floored like the discs
        rg.style.borderStyle = 'solid'; rg.style.borderColor = 'rgba(234,220,176,' + IP + ')';   // phi: alpha; anchor: Saturn's disc colour
        e.appendChild(rg); }
      LA.appendChild(e);
      P.push({ id: id, b: b, el: e, ring: rg || null, moon: moon, n: 3, z: null, op: -1, sz: -1, rs: -1, vis: true });   // phi: n = 3 (planet-level)
    });
    var BY = {}; P.forEach(function (p) { BY[p.id] = p; });
    var star = doc.createElement('span'); star.className = 'sm-n sm-dizzy'; star.textContent = '\uD83D\uDCAB'; star.style.borderRadius = '0'; LB.appendChild(star);
    var S = { el: star, M: TAU / 2, n: 2, op: -1, sz: -1, T: 0 };          // unit: starts at aphelion (the BL end, in view); phi: n = 2 (twinkle-level)
    var r = dial('intensity', DEF);                                       // (the solar pump no longer scales the clock: ONE global time factor, js/solar-system.js)
    function axisB() { var F = root.PhiAxes && PhiAxes.frame; if (F && F.w) return { x: F.b.x, y: F.b.y, end: PhiAxes.at(0, 1) };
      var w = innerWidth, h = innerHeight, L = Math.hypot(w, h); return { x: -w / L, y: h / L, end: { x: 0, y: h } }; }   // unit: TR -> BL fallback
    function put(o, x, y, size, sc, op, z, round) {
      if (o.sz !== size) { o.sz = size; o.el.style.width = o.el.style.height = round ? size + 'px' : ''; o.el.style.fontSize = size + 'px'; }
      if (o.op !== op) { o.op = op; o.el.style.opacity = op; o.el.style.display = op > 0 ? '' : 'none'; }
      if (z != null && o.z !== z) { o.z = z; o.el.style.zIndex = z; }
      o.el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(calc(-100% / 2),calc(-100% / 2)) scale(' + sc + ')';   // unit: centre on the point
    }
    function show(o, v) { if (o.vis !== v) { o.vis = v; o.el.style.visibility = v ? '' : 'hidden'; } }
    // the zoom camera's parts (layers by apparent size, debris, home fade): docs/zoom-camera.md
    var EMO = { sun: '\u2600\uFE0F', earth: '\uD83C\uDF0D', moon: '\uD83C\uDF15', mars: '\uD83D\uDD34', jupiter: '\uD83D\uDFE0', saturn: '\uD83E\uDE90', venus: '\uD83D\uDFE1',
      uranus: '\uD83D\uDD35', neptune: '\uD83D\uDD35', mercury: '\uD83C\uDF11', pluto: '\u26AA' };
    function lvl(p) { var Z = root.ZoomCam; if (!Z || !Z.on) return 0; var bp = SS.helio(p.id, SS.date()), r = Z.probe.r, al = p.b.R / Math.hypot(bp[0] - r[0], bp[1] - r[1], bp[2] - r[2]), g = Math.log(1 / al) / Math.log(PHI);
      return g > 10 ? 0 : g > 7 ? 1 : g > 4 ? 2 : 3; }
    function lod(p, q, F) {
      var D = q.d, L = lvl(p), fs = Math.max(D, F.floor), e = p.el, k;
      if (L < 2) { k = fs < Math.pow(PHI, 3) ? 'dot' : 'e:' + fs.toFixed(1); if (p.lk === k) return;
        if (k === 'dot') { if (p.g) p.g.style.display = 'none'; if (p.lk && p.lk.charAt(0) !== 'd') { paint(e, LOOK[p.id] || GREY); e.style.backgroundBlendMode = ''; } p.lk = k; return; }
        if (!p.g) { p.g = doc.createElement('b'); p.g.className = 'sm-g'; p.g.textContent = EMO[p.id] || '\uD83C\uDF11'; e.insertBefore(p.g, e.firstChild); }
        p.g.style.display = ''; p.g.style.fontSize = fs.toFixed(1) + 'px'; e.style.background = 'none'; e.style.boxShadow = 'none'; p.lk = k; return; }
      if (p.g) p.g.style.display = 'none';
      var st = D < Math.pow(PHI, 5) ? 1 : 2;
      var sx = F.x + (0 - (F.cx || 0)) / F.kmPerPx - q.x, sy = F.y + (F.cy || 0) / F.kmPerPx - q.y, sl = Math.hypot(sx, sy) || 1;
      var hx = 50 + 50 * IP * sx / sl, hy = 50 + 50 * IP * sy / sl, key = st + ':' + Math.round(hx / 5) + ':' + Math.round(hy / 5);
      if (p.lk === key) return; p.lk = key;
      var c = (LOOK[p.id] || GREY).split(',');
      var lit = 'radial-gradient(circle at ' + hx + '% ' + hy + '%,' + c[0] + ',' + c[1] + ' ' + IP * 100 + '%,rgba(0,0,0,' + (1 - Math.pow(IP, 3)) + ') 100%)';
      e.style.background = st === 2 && c[2] ? lit + ',repeating-linear-gradient(0deg,' + c[0] + ' 0 ' + Math.pow(IP, 3) * 100 + '%,' + c[1] + ' ' + Math.pow(IP, 3) * 100 + '% ' + Math.pow(IP, 2) * 100 + '%)' : lit;
      e.style.backgroundBlendMode = st === 2 && c[2] ? 'multiply' : '';
      e.style.boxShadow = 'none';
    }
    var zpSt = null;
    function zpDraw(F) {
      var Z = root.ZoomCam, v = F.zoom; if (!Z || !v) return;
      if (!zpSt) { zpSt = doc.createElement('style'); zpSt.textContent = '.pl-layer .pl-n:not(.sm-n){filter:opacity(var(--zp-home,1))}'; doc.head.appendChild(zpSt); }
      doc.documentElement.style.setProperty('--zp-home', (1 - v.w).toFixed(3));
      var pr = Z.probe.r, cx = F.cx || 0, cy = F.cy || 0, x = F.x + (pr[0] - cx) / F.kmPerPx, y = F.y - (pr[1] - cy) / F.kmPerPx;
      zpFx(Z.probe, x, y);
    }
    var zpBits = null;
    function zpFx(Pr, x, y) {
      var DEAD = PHI * PHI, S = Math.pow(PHI, 4), i, e;
      if (!zpBits) { zpBits = []; for (i = 0; i < 14; i++) { e = doc.createElement('span'); e.className = 'sm-n zp-bit';
        e.style.cssText = i ? 'width:3px;height:3px;background:#7ff;box-shadow:0 0 4px #7ff;z-index:' + (ZS * 3) : 'font-size:' + S + 'px;line-height:1;z-index:' + (ZS * 3);
        if (!i) e.textContent = '\uD83D\uDCA5'; e.style.visibility = 'hidden'; LA.appendChild(e); zpBits.push(e); } }
      var W = Pr.dead > 0 && Pr.debris, h = Pr.hits[Pr.hits.length - 1], vt = Pr.home + Pr.pass, bt = h && h.kind === 'bounce' ? vt - h.vt : 1e9;
      for (i = 0; i < 14; i++) zpBits[i].style.visibility = 'hidden';
      if (W) { var u = Math.min(W.t / DEAD, 1), op = 1 - u;
        if (W.kind === 'strand') return;
        var fu = Math.min(W.t, 1), fs = Math.pow(PHI, -2 + 3 * fu);
        zpBits[0].style.visibility = ''; zpBits[0].style.opacity = (1 - fu).toFixed(3); zpBits[0].style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%) scale(' + fs.toFixed(3) + ')';
        var ease = 1 - Math.pow(1 - u, 3);
        for (i = 1; i < 14; i++) { var a = i * 2 * Math.PI * IP * IP, d = S * (IP + (i * IP % 1)) * PHI * PHI * ease;
          zpBits[i].style.visibility = ''; zpBits[i].style.opacity = op.toFixed(3);
          zpBits[i].style.transform = 'translate3d(' + (x + Math.cos(a) * d).toFixed(1) + 'px,' + (y + Math.sin(a) * d).toFixed(1) + 'px,0) translate(-50%,-50%) scale(' + (1 - u * IP).toFixed(3) + ')'; }
        return; }
      if (bt < IP) for (i = 1; i < 4; i++) { var ua = bt / IP, aa = i * 2 * Math.PI / 3, dd = S * ua;
        zpBits[i].style.visibility = ''; zpBits[i].style.opacity = (1 - ua).toFixed(3); zpBits[i].style.transform = 'translate3d(' + (x + Math.cos(aa) * dd).toFixed(1) + 'px,' + (y + Math.sin(aa) * dd).toFixed(1) + 'px,0) translate(-50%,-50%)'; }
    }
    var OPA = 1;                                                          // phi: base opacity PHI^0 (was PHI^-1): the one-device-pixel dots need all of it to be found at all
    var pos = {};
    function draw() {
      var F = SS.frame(), sun = A.sun, W = F.W, H = F.H, t = SS.clock();
      pos = {};
      P.forEach(function (p) {
        var q = SS.at(p.id, t, F); pos[p.id] = q; p.x = q.x; p.y = q.y; p.front = q.front;
        var reach = q.d / 2, on = q.x + reach > 0 && q.x - reach < W && q.y + reach > 0 && q.y - reach < H;   // unit: off-screen at true distance = simply not drawn
        show(p, on); if (!on) return;
        var parent = p.moon ? BY[p.b.parent] : null;
        var z = p.moon ? (parent.z != null ? parent.z : ZS + ZS / 2) + (q.front ? 1 : -1) : ZS + ZS / 2;   // unit: planets over the Sun glyph (nothing is behind the true Sun disc at this scale); a moon +-1 round its planet by ecliptic z
        if (p.ring) { var rd = Math.max(2 * p.b.ring[1] / F.kmPerPx, F.floor); if (p.rs !== rd) { p.rs = rd; p.ring.style.width = p.ring.style.height = rd + 'px'; p.ring.style.borderWidth = Math.max(rd * (p.b.ring[1] - p.b.ring[0]) / p.b.ring[1] / 2, F.floor / 2) + 'px'; } }   // unit: the ring's true outer diameter and C..A band, floored
        put(p, q.x, q.y, q.d, 1, OPA * amp(p.n + r - DEF), z, true);     // unit: drawn diameter = max(true, one device pixel)
        if (ZP) lod(p, q, F);
      });
      if (ZP) zpDraw(F);
      var B = axisB(), ae = SS.bodies.earth.aAU * SS.AU / F.kmPerPx, d = Math.hypot(B.end.x - sun.x, B.end.y - sun.y), a = d / (1 + HALLEY), bb = a * Math.sqrt(1 - HALLEY * HALLEY);   // aphelion on the BL end of axis B
      var ux = (B.end.x - sun.x) / (d || 1), uy = (B.end.y - sun.y) / (d || 1), E2 = kep(S.M, HALLEY), cu = -(Math.cos(E2) - HALLEY), sv = Math.sin(E2);   // unit: +u toward the aphelion
      S.T = SS.period('earth') * Math.pow(a / ae, 3 / 2);                  // cite: Kepler III against the real Earth's orbit (same km / px, same time factor)
      S.x = sun.x + a * cu * ux - bb * sv * uy; S.y = sun.y + a * cu * uy + bb * sv * ux;
      var node = (A.moon && (A.moon.s0 || A.moon.s)) || Math.min(W, H) * Math.pow(IP, 5.5);   // phi: the PingLayer node (the 💫's glyph size, display)
      put(S, S.x, S.y, node, 1, Math.pow(IP, 2) * amp(S.n + r - DEF) * (F.zoom ? 1 - F.zoom.w : 1), null, false);   // phi: Layer B ceiling PHI^-2 (it crosses text)
    }
    var raf = 0, last = 0, tl = 0, FRAME = MS * Math.pow(IP, 7);           // phi: frame cap PHI^-7 s
    function tick(t) { raf = 0; if (doc.hidden) return; if (t - last >= FRAME) { var dt = tl ? Math.min(t - tl, MS) / MS : 0; tl = t; last = t;   // unit: dt capped at a second
        SS.advance(dt); S.M -= TAU * dt / S.T; draw(); }                 // one global time factor (no pump); minus: clockwise, retrograde like the real Halley (cite: JPL SBDB i = 162.2 deg)
      raf = requestAnimationFrame(tick); }
    function go() { if (!raf && !doc.hidden && !RM) raf = requestAnimationFrame(tick); }
    function zpGo() { if (root.ZoomCam && !ZoomCam.on) { ZoomCam.start('saturn', 24); draw(); } }
    if (ZP) { if (root.ZoomCam) zpGo(); else if (!zpLoad) { zpLoad = 1; var zs = doc.createElement('script'); zs.src = 'js/zoom-camera.js?v=zoomtrim1'; zs.async = true; zs.onload = zpGo; doc.head.appendChild(zs); } }
    draw(); go();
    if (root.Arrivals) P.forEach(function (p) { if (!p.moon) Arrivals.land(p.el, 'pop', 1); });   // rule 14: each planet arrives (after its first draw, so it sweeps up to its own opacity), then a pop
    doc.addEventListener('visibilitychange', function () { tl = 0; if (!doc.hidden) { r = dial('intensity', DEF); go(); } });
    addEventListener('resize', function () { requestAnimationFrame(draw); });
    var kids = {}; P.forEach(function (p) { if (!p.moon) kids[p.id] = { layer: 'A', moons: p.b.moons }; });
    kids.bigEarth = { anchor: 'earth', layer: 'A', display: 'ping-layer orbit', children: { moon: { anchor: 'moon', layer: 'A', with: ['satellite', 'astronaut'] } } }; kids.dizzy = { layer: 'B', axis: 'B' };
    root.SolarModel = {
      tree: { sun: { anchor: 'sun', layer: 'A', children: kids } },
      info: function () { return { intensity: r, clock: SS.clock(), date: new Date(SS.date()).toISOString(), kmPerPx: SS.frame().kmPerPx, planets: P.filter(function (p) { return !p.moon; }).map(function (p) { return { id: p.id, e: p.b.e, T: SS.period(p.id), front: p.front, x: p.x, y: p.y, op: p.op, size: p.sz, shown: p.vis }; }),
        moons: P.filter(function (p) { return p.moon; }).map(function (p) { return { id: p.id, parent: p.b.parent, x: p.x, y: p.y, front: p.front, shown: p.vis }; }),
        dizzy: { e: HALLEY, T: S.T, x: S.x, y: S.y, op: S.op }, layerBz: LB.style.zIndex }; } };
  }
  start();
})();
