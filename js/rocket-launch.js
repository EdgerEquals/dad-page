/* ROCKET LAUNCHER (Danny 15:37 / 15:38, launch feel 16:26 AWST 26 Oct 2026). The first launch is the inline #rk1 in index.html
   (CSS only, paints with the page). Two nested elements, each ONE keyframe segment, so the timing curve is never restarted mid-flight
   (the 16:26 stall was a 50% keyframe re-applying ease-in to its second half):
     outer #rk1     rises: translateY, ease-in (convex, so vertical speed only grows)
     inner #rk1 > i drifts across: translateX + nose turn, cubic-bezier(PHI^-1, 0, 1, 1) (convex, a steeper ease-in)
   x grows faster than y late in the flight, so the path is a gentle curve that starts straight up, and with both components
   accelerating the speed only ever increases. This module adopts the element after the inline launch ends (off the top, so no jump)
   and relaunches every PHI^6 s with the SAME two curves via WAAPI; the start column and the bend come from the diagonal-axes frame
   (js/phi-axes.js: a point on axis B near its bottom-left end, the bend along A), depth and timing pumped. A damped tail wobble rides
   on the separate 'rotate' property (pivot at the nose), so it never touches the path's speed. Skipped while hidden; nothing under
   reduced motion. */
(function () {
  'use strict';
  var doc = document, root = window, el = doc.getElementById('rk1'), gl = el && el.firstElementChild;
  if (!el || !gl || !el.animate || (root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, TAU = 2 * Math.PI, MS = 1e3;   // phi; unit: a turn, ms per s
  var NOSE = -TAU / 8;                                                     // anchor: emoji artwork points up-right, an eighth turn
  var RISE = Math.pow(PHI, 3), GAP = Math.pow(PHI, 6);                     // phi: rise PHI^3 s, a launch every PHI^6 s
  var EY = 'ease-in', EX = 'cubic-bezier(' + IP + ',0,1,1)';               // phi: the inline curves, x a steeper ease-in (PHI^-1)
  var SY = 1 / (1 - Math.pow(IP, 9 / 5)), SX = PHI * PHI;                  // phi: end slopes of the two curves (ease-in x1 0.42 = PHI^-1.8, so 1.72; the PHI^-1 bezier gives PHI^2)
  var WOB = TAU / 89, WN = 3;                                              // phi: tail wobble 1/89 turn (Fibonacci), 3 swings
  var count = 1, pump = null;
  function k() { var P = root.PhiPumps; if (P && !pump) pump = P.node('rocket', 3, 6, Math.pow(IP, 4), P.page, 21); try { return pump ? pump.out() : 1; } catch (e) { return 1; } }   // phi: 3 pumps, rungs 6.., depth PHI^-4
  function launch() {
    if (doc.hidden) return later();
    count++;
    var A = root.PhiAxes, H = innerHeight, h = el.getBoundingClientRect().height || 1, kk = k();   // unit: measured box
    var side = Math.sin(count * TAU * IP);                                // phi: golden-angle drift, the bend's side and size vary slowly
    var x0 = A ? A.at(0, 1 - 2 * Math.pow(IP, 4)).x : innerWidth * Math.pow(IP, 4);   // axis B near its bottom-left end (= the inline PHI^-4 column)
    var bend = (A ? A.dir(Math.pow(IP, 5), 0).x : innerWidth * Math.pow(IP, 5)) * side * kk;   // phi: bend along axis A, PHI^-5 of its half, pumped depth
    var lean = Math.atan2(bend * SX, (H + h + h) * SY);                   // nose at the end = the path's final tangent
    el.getAnimations().forEach(function (a) { a.cancel(); }); gl.getAnimations().forEach(function (a) { a.cancel(); });
    el.style.animation = 'none'; gl.style.animation = 'none'; el.style.left = x0 + 'px';
    var D = RISE * MS * kk;
    el.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(' + (-H - h) + 'px)' }], { duration: D, easing: EY, fill: 'both' }).onfinish = later;   // unit: from below the bottom to above the top
    gl.animate([{ transform: 'rotate(' + NOSE + 'rad)' }, { transform: 'translateX(' + bend + 'px) rotate(' + (NOSE + lean) + 'rad)' }], { duration: D, easing: EX, fill: 'both' });
    gl.style.transformOrigin = '100% 0';                                  // unit: pivot at the nose (artwork's top-right corner)
    var wf = []; for (var i = 0; i <= 21; i++) { var u = i / 21; wf.push({ rotate: (WOB * Math.exp(-u * PHI * PHI) * Math.sin(TAU * WN * u)) + 'rad' }); }   // phi: 21 samples (Fibonacci), decay PHI^2
    gl.animate(wf, { duration: D, easing: 'linear', fill: 'both' });
  }
  var t = 0; function later() { clearTimeout(t); t = setTimeout(launch, GAP * MS * k()); }
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden && !t) later(); });
  var a = el.getAnimations ? el.getAnimations() : [];
  if (a.length && a[0].playState !== 'finished') a[0].finished.then(later, later); else later();   // adopt: wait out the inline first rise
  root.RocketLaunch = { info: function () { return { launches: count, rise: RISE, gap: GAP }; }, launch: launch };
})();
