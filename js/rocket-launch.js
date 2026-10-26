/* ROCKET LAUNCHER (Danny 15:37 / 15:38, launch feel 16:26, real launch 17:00 AWST 26 Oct 2026). The first launch is the inline #rk1
   in index.html (CSS only, paints with the page); this module adopts it once that flight is off the top and relaunches every PHI^6 s
   with the SAME physics. A launch is:
     1. ignition on the pad: the rocket sits still while a jitter builds up (envelope rising as (t/T)^PHI, like engines throttling up
        against the hold-downs), peaks at liftoff, then damps out over the first PHI^-1 of the shake. It rides on the separate
        'translate' / 'rotate' properties of the inner element, so it never adds to or fights the climb's transform.
     2. climb: constant thrust with mass loss (Tsiolkovsky rocket equation, v = ve ln(m0/m) - g t). Liftoff thrust/weight 1+PHI^-4 ~ 1.15
        (Saturn V 1.16) and a burn of 1-PHI^-3 ~ 76% of the mass (Saturn V S-IC ~73%), so the speed grows exponentially and the
        acceleration rises ~24x from the pad to the top: it creeps off the pad and exits ~5x faster than at mid-flight. Height follows
        cubic-bezier(.396,0,.745,.102), a fit to that solution (max error 1.4e-4 of the climb); the sideways drift is height^2 (a gentle
        gravity turn, fit .748,0,.842,0), so the path starts straight up and only bends near the top. One curve each, no keyframes in
        between, so the speed can only rise.
   Start column and drift come from the diagonal-axes frame (js/phi-axes.js); climb time, pad time and shake size are pumped.
   Skipped while hidden; nothing under reduced motion. */
(function () {
  'use strict';
  var doc = document, root = window, el = doc.getElementById('rk1'), gl = el && el.firstElementChild;
  if (!el || !gl || !el.animate || (root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, TAU = 2 * Math.PI, MS = 1e3;   // phi; unit: a turn, ms per s
  var NOSE = -TAU / 8;                                                     // anchor: emoji artwork points up-right, an eighth turn
  var RISE = Math.pow(PHI, 3), PAD = Math.pow(IP, 3), GAP = Math.pow(PHI, 6);   // phi: climb PHI^3 s, pad PHI^-3 of it, a launch every PHI^6 s
  var CLIMB = 'cubic-bezier(0.396,0,0.745,0.102)', DRIFT = 'cubic-bezier(0.748,0,0.842,0)';   // cite: Tsiolkovsky fit (thrust/weight 1+PHI^-4, burn 1-PHI^-3), drift = height^2
  var KEYS = 34, JX = Math.pow(IP, 4), JR = PHI;                           // phi: 34 jitter keys (Fibonacci), PHI^-4 em sideways, PHI deg
  var count = 1, pump = null;
  function k() { var P = root.PhiPumps; if (P && !pump) pump = P.node('rocket', 3, 6, Math.pow(IP, 4), P.page, 21); try { return pump ? pump.out() : 1; } catch (e) { return 1; } }   // phi: 3 pumps, rungs 6.., depth PHI^-4
  function fr(x) { return x - Math.floor(x); }
  function shake(amp) {                                                     // ignition jitter: liftoff at PHI^-1 of it
    var f = [];
    for (var i = 0; i <= KEYS; i++) {
      var p = i / KEYS, e = p <= IP ? Math.pow(p / IP, PHI) : Math.pow(1 - (p - IP) / (1 - IP), PHI * PHI);   // phi: rise ^PHI, damp ^PHI^2
      if (i === 0 || i === KEYS) e = 0;
      var sx = (i % 2 ? 1 : -1) * (IP + fr((i + count) * PHI) * IP * IP), sr = (i % 2 ? -1 : 1) * (IP + fr((i + count) * IP * IP) * IP);   // phi: golden-irregular, alternating
      f.push({ offset: p, translate: (e * sx * JX * amp) + 'em 0', rotate: (e * sr * JR * amp) + 'deg' });
    }
    return f;
  }
  function launch() {
    if (doc.hidden) return later();
    count++;
    var A = root.PhiAxes, H = innerHeight, h = el.getBoundingClientRect().height || 1, kk = k();   // unit: measured box
    var side = Math.sin(count * TAU * IP);                                // phi: golden-angle drift, the bend's side and size vary slowly
    var L0 = A ? A.frame.x0 : 0, x0 = L0 + ((A ? A.at(0, 1 - 2 * Math.pow(IP, 4)).x : innerWidth * Math.pow(IP, 4)) - L0) / 2;   // unit: half of the axis-B column's distance from the safe left edge (Danny 17:12; = the inline left)
    var bend = (A ? A.dir(Math.pow(IP, 5), 0).x : innerWidth * Math.pow(IP, 5)) * side * kk;   // phi: drift along axis A, PHI^-5 of its half, pumped depth
    var lean = Math.atan2(2 * bend, H + h);                               // unit: drift = height^2, so its end slope is 2 x bend / climb
    [el, gl].forEach(function (n) { n.getAnimations().forEach(function (a) { a.cancel(); }); n.style.animation = 'none'; });
    el.style.left = x0 + 'px';
    var D = RISE * MS * kk, S = D * PAD;                                  // pumped climb, pad PHI^-3 of it
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: S * IP * IP, easing: 'ease-out' });   // phi: rolls out onto the pad over PHI^-2 of the shake
    el.animate([{ transform: 'none' }, { transform: 'translateY(' + (-H - h) + 'px)' }], { duration: D, delay: S, easing: CLIMB, fill: 'both' }).onfinish = later;
    gl.animate([{ transform: 'rotate(' + NOSE + 'rad)' }, { transform: 'translateX(' + bend + 'px) rotate(' + (NOSE + lean) + 'rad)' }], { duration: D, delay: S, easing: DRIFT, fill: 'both' });
    gl.animate(shake(kk), { duration: S * PHI, easing: 'linear' });       // phi: shake runs S*PHI, liftoff at S
  }
  var t = 0; function later() { clearTimeout(t); t = setTimeout(launch, GAP * MS * k()); }
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden && !t) later(); });
  var a = el.getAnimations ? el.getAnimations({ subtree: true }) : [];
  if (a.length) Promise.all(a.map(function (x) { return x.finished; })).then(later, later); else later();   // adopt: wait out the inline launch (climb + shake)
  root.RocketLaunch = { info: function () { return { launches: count, rise: RISE, pad: PAD, gap: GAP }; }, launch: launch };
})();
