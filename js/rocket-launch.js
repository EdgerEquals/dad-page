/* ROCKET LAUNCHER (Danny 15:37 / 15:38, launch feel 16:26, real launch 17:00 AWST 26 Oct 2026). The first launch is the inline #rk1
   in index.html (CSS only, paints with the page); this module adopts it once that flight is off the top and relaunches every PHI^6 s
   with the SAME physics. A launch is:
     1. ignition on the pad (rockshake, Danny 19:40 AWST 26 Oct: "sit and just shake left or right a bit before it takes off and rotate
        very slightly only a couple of degrees and then as it takes off reduce the shake and reduce the wobble"): it sits on the pad for
        PHI^-2 of the climb time, shaking side to side (translate, alternating every key, golden-irregular, PHI^-4 em) with a slower
        rotation wobble of about a 144th of a turn (TAU/144 ~ 2.5 deg, period PHI^-2 s); both come up over the first PHI^-2 of the pad,
        hold, then from liftoff shrink smoothly to zero as (1 - u)^(PHI^2) over the first PHI^-1 of the climb. It rides on the separate
        'translate' / 'rotate' properties of the inner element, so it never adds to or fights the climb's transform.
     2. climb: constant thrust with mass loss (Tsiolkovsky rocket equation, v = ve ln(m0/m) - g t). Liftoff thrust/weight 1+PHI^-4 ~ 1.15
        (Saturn V 1.16) and a burn of 1-PHI^-3 ~ 76% of the mass (Saturn V S-IC ~73%), so the speed grows exponentially and the
        acceleration rises ~24x from the pad to the top: it creeps off the pad and exits ~5x faster than at mid-flight. Height follows
        cubic-bezier(.396,0,.745,.102), a fit to that solution (max error 1.4e-4 of the climb); one curve, so the speed can only rise.
     3. the Sun's pull (rocketblast, Danny 19:51 AWST: "it needs to orbit very slightly around the sun just enough to pull it off its
        straight vector"): the path bends toward the page Sun (js/phi-sun.js, top right) by PHI^-4 of the pad's horizontal distance to it,
        growing with the climb as height^PHI, nose along the path. It is sampled from the climb curve itself (55 keys, Fibonacci), so x
        always follows the height. History: 67ffa0c bent PHI^-4 of the width; a4d7940 cut it to PHI^-5 of axis A's half (inline 1.6vw)
        and 208c6e4 moved it to the very top (height^2), which together read as a straight line.
     4. liftoff blast: js/rocket-blast.js plays a drawn launch blast at the pad the moment the climb starts.
   Start column and drift come from the diagonal-axes frame (js/phi-axes.js); climb time, pad time and shake size are pumped.
   Skipped while hidden; nothing under reduced motion. */
(function () {
  'use strict';
  var doc = document, root = window, el = doc.getElementById('rk1'), gl = el && el.firstElementChild;
  if (!el || !gl || !el.animate || (root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, TAU = 2 * Math.PI, MS = 1e3;   // phi; unit: a turn, ms per s
  var NOSE = -TAU / 8;                                                     // anchor: emoji artwork points up-right, an eighth turn
  var RISE = Math.pow(PHI, 3), PAD = Math.pow(IP, 2), GAP = Math.pow(PHI, 6);   // phi: climb PHI^3 s, pad PHI^-2 of it (rockshake: sits and shakes a while), a launch every PHI^6 s
  var CLIMB = 'cubic-bezier(0.396,0,0.745,0.102)', CB = [0.396, 0, 0.745, 0.102];   // cite: Tsiolkovsky fit (thrust/weight 1+PHI^-4, burn 1-PHI^-3)
  var PULL = Math.pow(IP, 4), PK = 55;                                     // phi: bend PHI^-4 of the pad-to-Sun distance, grows as height^PHI; 55 keys (Fibonacci)
  var KEYS = 89, JX = Math.pow(IP, 4), WOB = TAU / 144, WP = Math.pow(IP, 2);   // phi: 89 keys (Fibonacci) over pad + PHI^-1 of the climb, PHI^-4 em sideways; wobble a 144th of a turn (Fibonacci), period PHI^-2 s
  var count = 1, pump = null;
  function k() { var P = root.PhiPumps; if (P && !pump) pump = P.node('rocket', 3, 6, Math.pow(IP, 4), P.page, 21); try { return pump ? pump.out() : 1; } catch (e) { return 1; } }   // phi: 3 pumps, rungs 6.., depth PHI^-4
  function fr(x) { return x - Math.floor(x); }
  function shake(amp, span) {                                              // pad shake + wobble, then shrink to zero with the climb; span = pad + PHI^-1 climb (ms)
    var f = [], L = PAD / (PAD + IP);                                       // phi: liftoff at the pad's share of the span (= PHI^-2 of it)
    for (var i = 0; i <= KEYS; i++) {
      var p = i / KEYS, e = p < L ? Math.min(1, Math.pow(p / (L * IP * IP), PHI)) : Math.pow(1 - (p - L) / (1 - L), PHI * PHI);   // phi: up over PHI^-2 of the pad (^PHI), hold, shrink (1-u)^PHI^2
      if (i === 0 || i === KEYS) e = 0;
      var sx = (i % 2 ? 1 : -1) * (IP + fr((i + count) * PHI) * IP * IP);  // phi: side to side, golden-irregular, alternating each key
      var sr = Math.sin(TAU * p * span / MS / WP) * (1 - fr((i + count) * IP * IP) * Math.pow(IP, 3));   // phi: slower wobble, PHI^-2 s period, golden-irregular size
      f.push({ offset: p, translate: (e * sx * JX * amp) + 'em 0', rotate: (e * sr * WOB * amp) + 'rad' });
    }
    return f;
  }
  function climbY(p) {                                                     // height fraction of the climb curve at time fraction p (cubic-bezier solve)
    var x1 = CB[0], y1 = CB[1], x2 = CB[2], y2 = CB[3], lo = 0, hi = 1, s = p, i;
    function bx(t) { return 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * t * t * (1 - t) + t * t * t; }
    for (i = 0; i < 34; i++) { s = (lo + hi) / 2; if (bx(s) < p) lo = s; else hi = s; }   // unit: bisection, 34 halvings
    return 3 * y1 * s * (1 - s) * (1 - s) + 3 * y2 * s * s * (1 - s) + s * s * s;
  }
  function path(bend, span) {                                               // x = bend * Y^PHI, nose along the tangent
    var f = [];
    for (var i = 0; i <= PK; i++) { var p = i / PK, Y = climbY(p), x = bend * Math.pow(Y, PHI), sl = bend * PHI * Math.pow(Y, PHI - 1) / span;   // unit: dx/dy of the path
      f.push({ offset: p, transform: 'translateX(' + x + 'px) rotate(' + (NOSE + Math.atan(sl)) + 'rad)' }); }
    return f;
  }
  function launch() {
    if (doc.hidden) return later();
    count++;
    var A = root.PhiAxes, H = innerHeight, h = el.getBoundingClientRect().height || 1, kk = k();   // unit: measured box
    var L0 = A ? A.frame.x0 : 0, x0 = L0 + ((A ? A.at(0, 1 - 2 * Math.pow(IP, 4)).x : innerWidth * Math.pow(IP, 4)) - L0) / 2;   // unit: half of the axis-B column's distance from the safe left edge (Danny 17:12; = the inline left)
    var sun = root.PhiSun ? PhiSun.x * innerWidth : innerWidth * (1 - Math.pow(IP, 5)), bend = (sun - x0) * PULL * kk;   // phi: pulled toward the Sun, PHI^-4 of the way across, pumped depth
    [el, gl].forEach(function (n) { n.getAnimations().forEach(function (a) { a.cancel(); }); n.style.animation = 'none'; });
    el.style.left = x0 + 'px';
    var D = RISE * MS * kk, S = D * PAD;                                  // pumped climb, pad PHI^-2 of it
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: S * IP * IP, easing: 'ease-out' });   // phi: rolls out onto the pad over PHI^-2 of the shake
    var up = el.animate([{ transform: 'none' }, { transform: 'translateY(' + (-H - h) + 'px)' }], { duration: D, delay: S, easing: CLIMB, fill: 'both' }); up.onfinish = later;
    gl.animate(path(bend, H + h), { duration: D, delay: S, easing: 'linear', fill: 'both' });   // the Sun's pull, sampled from the climb
    if (root.RocketBlast) RocketBlast.sync(up, el, kk);                    // liftoff blast at the pad
    gl.animate(shake(kk, S + D * IP), { duration: S + D * IP, easing: 'linear' });   // phi: shake spans the pad + PHI^-1 of the climb (= D), liftoff at S
  }
  var t = 0; function later() { clearTimeout(t); t = setTimeout(launch, GAP * MS * k()); }
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden && !t) later(); });
  var a = el.getAnimations ? el.getAnimations({ subtree: true }) : [];
  if (a.length) Promise.all(a.map(function (x) { return x.finished; })).then(later, later); else later();   // adopt: wait out the inline launch (climb + shake)
  root.RocketLaunch = { info: function () { return { launches: count, rise: RISE, pad: PAD, gap: GAP }; }, launch: launch };
})();
