/* ROCKET LAUNCHER (Danny 15:37 / 15:38 AWST 26 Oct 2026). The first launch is the inline #rk1 in index.html (CSS keyframe, paints with
   the page, no JS). This module adopts that element once its first rise ends, so there is no jump, and launches it again on a phi rung:
   bottom left, rising off the top on the very top layer, nose along the path (tangent of a very gentle curve whose bend and side vary
   slowly launch to launch), and a damped tail wobble (pivot at the nose). Transforms only (one WAAPI animation per launch), skipped while
   hidden, nothing under reduced motion. Never sideways: the curve's sideways travel is a PHI^-k fraction of the rise. */
(function () {
  'use strict';
  var doc = document, root = window, el = doc.getElementById('rk1');
  if (!el || !el.animate || (root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, TAU = 2 * Math.PI, MS = 1e3, PCT = 100;   // phi; unit: a turn, ms per s, percent
  var NOSE = -TAU / 8;                                                     // anchor: emoji artwork points up-right, an eighth turn
  var RISE = Math.pow(PHI, 3), GAP = Math.pow(PHI, 6), N = 34;             // phi: rise PHI^3 s, a launch every PHI^6 s; 34 keyframes (Fibonacci)
  var BEND = Math.pow(IP, 4), WOB = TAU / 55, WT = Math.pow(IP, 2), WN = 3;   // phi: bend PHI^-4 of the width at most; wobble 1/55 turn, decay PHI^-2 of the rise, 3 swings
  var count = 1, pump = null;
  function k() { var P = root.PhiPumps; if (P && !pump) pump = P.node('rocket', 3, 6, Math.pow(IP, 4), P.page, 21); try { return pump ? pump.out() : 1; } catch (e) { return 1; } }   // phi: 3 pumps, rungs 6.., depth PHI^-4
  function launch() {
    if (doc.hidden) return later();
    count++;
    var W = innerWidth, H = innerHeight, r = el.getBoundingClientRect(), h = r.height || 1;   // unit: measured box
    var side = Math.sin(count * TAU * IP), amp = BEND * W * side, f = [];   // phi: golden-angle drift, so bend and side vary slowly, never repeat
    for (var i = 0; i <= N; i++) {
      var u = i / N, e = u * u;                                            // unit: ease-in rise (accelerating), like the inline keyframe
      var y = h - e * (H + h + h), x = amp * Math.sin(Math.PI * u);         // unit: from just below the bottom to just above the top; half a sine of bend
      var dy = -2 * u * (H + h + h), dx = amp * Math.PI * Math.cos(Math.PI * u);   // unit: derivatives of the two above
      var tan = u ? Math.atan2(dx, -dy) : Math.atan2(amp * Math.PI, (H + h + h) * IP);   // nose along the velocity (from vertical); start leans to its first heading
      var wob = WOB * Math.exp(-u / WT) * Math.sin(TAU * WN * u);          // damped tail wobble
      f.push({ transform: 'translate(' + x + 'px,' + y + 'px) rotate(' + (NOSE + tan + wob) + 'rad)', offset: u });
    }
    el.style.animation = 'none'; el.style.transformOrigin = '100% 0';   // unit: pivot at the nose (artwork's top-right corner)
    el.animate(f, { duration: RISE * MS * k(), easing: 'linear', fill: 'both' }).onfinish = later;
  }
  var t = 0; function later() { clearTimeout(t); t = setTimeout(launch, GAP * MS * k()); }
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden && !t) later(); });
  var a = el.getAnimations ? el.getAnimations() : [];
  if (a.length && a[0].playState !== 'finished') a[0].finished.then(later, later); else later();   // adopt: wait out the inline first rise
  root.RocketLaunch = { info: function () { return { launches: count, rise: RISE, gap: GAP }; }, launch: launch };
})();
