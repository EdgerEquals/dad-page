/* TOP SWEEP LAYER + SUN (Danny 12:36 / 12:38 AWST 26 Oct 2026). Tier 2 (animation tier). One faint layer ABOVE everything
   (header and footer included; z-index measured from them, one above), pointer-events none.
     PLANETS  emoji with clear backgrounds orbit the shared Sun anchor (window.PhiSun, rule 13) in the same perspective as the
              background loop: near side lower, larger and brighter, far side small and dim and behind the Sun. Orbital periods
              are whole loops (Fibonacci counts of PhiSun.loop) so the layer stays in step with the video; orbit sizes follow
              Kepler III from those periods (a ~ T^(2/3)). The clock locks softly onto the video's currentTime while it plays.
              Wave (tilt wobble) and spin come from the same SKY constants the render uses (sweep, spinTurnsExp).
     SUN      a sun emoji exactly over the video's Sun: opacity pulses 0 .. 1 - PHI^-3 (the rung nearest 0.8 that Danny asked
              about, 0.764; 1 - PHI^-4 is 0.854), period = loop x PHI^-1, with a cheap radiate: a glow disc behind it breathing in
              scale and opacity (transform + opacity only).
   Dial 'topsweep' (dials.html): faintness rung r, planet opacity ceiling PHI^-r. Reduced motion: one still frame, no pulse. */
(function () {
  'use strict';
  var doc = document, root = window, de = doc.documentElement;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, TAU = 2 * Math.PI;      // phi: the golden ratio; unit: a full turn
  var MS = 1e3, PCT = 100;                                               // unit: ms per second; unit: percent
  var RM = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SUN = root.PhiSun || { x: 1 - Math.pow(IP, 4), y: Math.pow(IP, 4), loop: Math.pow(PHI, 4), sweep: Math.pow(PHI, 1), sky: { spinTurnsExp: 3 } };   // phi: fallback = the same rungs
  var LOOP = SUN.loop, SWEEP = SUN.sweep, SPINX = SUN.sky.spinTurnsExp;
  function dial(id, def) { try { var d = JSON.parse(localStorage.getItem('dadSceneDials.v1') || '{}'); return d[id] != null ? +d[id] : def; } catch (e) { return def; } }
  function fr(x) { return x - Math.floor(x); }
  var FAINT = Math.pow(IP, dial('topsweep', 3));                         // phi: planet opacity ceiling PHI^-3 by default
  var CEIL = 1 - Math.pow(IP, 3);                                        // phi: sun pulse ceiling 0.764 (nearest rung to 0.8)

  var css = '.tsl-layer{position:fixed;inset:0;pointer-events:none;overflow:hidden;contain:strict}' +
    '.tsl-p{position:absolute;left:0;top:0;line-height:1;opacity:0;will-change:transform,opacity;margin:calc(-1em / 2) 0 0 calc(-1em / 2)}' +
    '.tsl-sun{position:absolute;left:calc(var(--sun-x) * 100%);top:calc(var(--sun-y) * 100%);width:0;height:0}' +   // unit: percent of the box (100% whole, 50% radius = circle, half = centring)
    '.tsl-g,.tsl-s{position:absolute;left:0;top:0;line-height:1;transform:translate(calc(-100% / 2),calc(-100% / 2))}' +   // unit: percent of the box (100% whole, 50% radius = circle, half = centring)
    '.tsl-s{opacity:0;animation:tsPulse var(--per) ease-in-out infinite alternate}' +
    '.tsl-g{width:var(--gw);height:var(--gw);border-radius:50%;background:radial-gradient(circle closest-side,white,gold,transparent);' +   // unit: percent of the box (100% whole, 50% radius = circle, half = centring)
      'opacity:0;animation:tsGlow var(--per) ease-in-out infinite alternate}' +
    '@keyframes tsPulse{from{opacity:0}to{opacity:var(--ceil)}}' +
    '@keyframes tsGlow{from{opacity:0;transform:translate(calc(-100% / 2),calc(-100% / 2)) scale(var(--g0))}to{opacity:var(--gc);transform:translate(calc(-100% / 2),calc(-100% / 2)) scale(1)}}' +   // unit: percent of the box (100% whole, 50% radius = circle, half = centring)
    '.tsl-layer.tsl-paused *,body.paused .tsl-layer *{animation-play-state:paused!important}' +
    '.tsl-layer.tsl-still *{animation:none!important}.tsl-layer.tsl-still .tsl-s{opacity:var(--ceil)}.tsl-layer.tsl-still .tsl-g{opacity:var(--gc)}';
  var st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);   // unit: 50% radius = a circle; 100% = the box

  var L = doc.createElement('div'); L.className = 'tsl-layer'; L.setAttribute('aria-hidden', 'true');
  function zTop() { var z = 0; ['.q-head', '.foot', '#q-head'].forEach(function (q) { var e = doc.querySelector(q); if (e) { var v = parseInt(getComputedStyle(e).zIndex, 10); if (v > z) z = v; } }); return z + 1; }   // anchor: one above the measured header/footer

  // sun
  var sun = doc.createElement('span'), g = doc.createElement('span'), s = doc.createElement('span');
  sun.className = 'tsl-sun'; g.className = 'tsl-g'; s.className = 'tsl-s'; s.textContent = '\u2600\uFE0F';
  var ss = sun.style, PER = LOOP * IP;                                   // phi: pulse period one rung below the loop
  ss.setProperty('--per', PER + 's'); ss.setProperty('--ceil', CEIL); ss.setProperty('--gc', CEIL * IP);
  ss.setProperty('--g0', IP); ss.setProperty('--gw', (Math.pow(IP, 4) * PCT) + 'vmin');   // phi: glow disc PHI^-4 of the viewport
  s.style.fontSize = (Math.pow(IP, 6) * PCT) + 'vmin';                    // phi: sun glyph PHI^-6 of the viewport
  sun.appendChild(g); sun.appendChild(s); L.appendChild(sun);

  // planets: periods = Fibonacci loops, radii by Kepler III
  var DEF = [['\uD83E\uDE90', 2], ['\uD83C\uDF11', 3], ['\uD83C\uDF15', 5]];   // phi: Fibonacci loop counts (ringed planet, dark and bright moon-planets)
  var P = DEF.map(function (d, i) {
    var e = doc.createElement('span'); e.className = 'tsl-p'; e.textContent = d[0]; L.appendChild(e);
    return { e: e, T: LOOP * d[1], k: Math.pow(d[1] / DEF[0][1], 2 / 3),   // cite: Kepler III, a ~ T^(2/3)
      ph: fr((i + 1) * IP), spin: i ? Math.pow(PHI, SPINX - 3) * (i % 2 ? 1 : -1) : 0, front: null };   // phi: turns per pass; ringed one only wobbles
  });
  var G = { cx: 0, cy: 0, a: 0, b: 0, fs: 0 };
  function measure() {
    var W = innerWidth, H = innerHeight; G.cx = W * SUN.x; G.cy = H * SUN.y;
    G.a = W * IP; G.b = G.a * (H / W) * IP;                               // phi: base orbit PHI^-1 of the width, depth squash by the aspect x PHI^-1
    G.fs = Math.min(W, H) * Math.pow(IP, 5);                              // phi: near-side planet size PHI^-5 of the viewport
    P.forEach(function (p) { p.e.style.fontSize = G.fs + 'px'; });
    L.style.zIndex = zTop();
  }
  var vid = doc.getElementById('bgloop'), t0 = performance.now(), raf = 0, last = 0, FRAME = MS * Math.pow(IP, 7);   // phi: frame cap PHI^-7 s
  function clock(now) {
    var t = (now - t0) / MS;
    if (vid && !vid.paused && vid.readyState > 1) {                      // soft lock onto the video loop (rule 13: one timeline)
      var d = vid.currentTime - (t - Math.floor(t / LOOP) * LOOP);
      if (d > LOOP / 2) d -= LOOP; if (d < -LOOP / 2) d += LOOP;
      t0 -= d * Math.pow(IP, 3) * MS; t = (now - t0) / MS;
    }
    return t;
  }
  function place(now) {
    var t = clock(now), wave = Math.sin(TAU * t / (SWEEP * PHI)) * Math.pow(IP, 4);   // phi: wave period = sweep x PHI, amplitude PHI^-4 rad
    P.forEach(function (p) {
      var th = -TAU * (t / p.T + p.ph), sn = Math.sin(th), a = G.a * p.k, b = G.b * p.k;
      var x = G.cx + a * Math.cos(th), y = G.cy + b * sn, sc = Math.pow(PHI, (sn - 1) * PHI);   // phi: perspective, near side full size
      var rot = p.spin ? TAU * p.spin * t / (p.T / 2) : wave - TAU * Math.pow(IP, 6);    // phi: ringed planet tilt PHI^-6 turn + wave
      p.e.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) rotate(' + rot + 'rad) scale(' + sc + ')';
      p.e.style.opacity = FAINT * sc;
      var f = sn >= 0; if (f !== p.front) { p.front = f; p.e.style.zIndex = f ? 2 : 0; }   // unit: in front of / behind the sun (z 1)
    });
  }
  function tick(now) { raf = 0; if (doc.hidden) return; if (now - last >= FRAME) { last = now; place(now); } raf = requestAnimationFrame(tick); }
  function go() { if (!raf && !doc.hidden && !RM) raf = requestAnimationFrame(tick); }
  sun.style.zIndex = 1;
  doc.body.appendChild(L); measure(); place(performance.now());
  if (RM) { L.classList.add('tsl-still'); return; }
  go();
  addEventListener('resize', measure);
  doc.addEventListener('visibilitychange', function () { L.classList.toggle('tsl-paused', doc.hidden); if (!doc.hidden) go(); });
  root.TopSweep = { info: function () { return { loop: LOOP, sweep: SWEEP, faint: FAINT, sunCeil: CEIL, sunPeriod: PER,
    planets: P.map(function (p) { return { T: p.T, a: G.a * p.k, front: p.front }; }), z: L.style.zIndex }; } };
})();
