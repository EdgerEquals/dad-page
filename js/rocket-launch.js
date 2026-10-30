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
     5. launchbooms (Danny 09:02 AWST 30 Oct, t278u: 'Explosions shouldn't be a fixed number ... anywhere between no extra ones and three
        extra ones and have them fire with the density towards the start of it so there's a larger gap between each time of fires'; t254u
        26 Oct: more explosions as it climbs, each with the trailing collision smoke, smaller as it climbs). After the liftoff blast
        (explosion 0) each launch adds n = 0..3 extra explosions in the air, n from a pump node ('rocket:booms', 3 modes on PHI^5.. s, read
        at liftoff, their mean stretched by PHI so the whole range is reached). Gaps grow in phi steps: extra j fires PHI^(j-5) of the climb
        time after the one before (PHI^-4, PHI^-3, PHI^-2: dense near the pad, wider further out), at the rocket where it is drawn then.
        Each is one PHI^-1 step smaller than the last (S PHI^-j, S = the rocket's drawn size): the burst glow, Fibonacci-fewer sparks and
        smoke puffs (5, 3, 2) drawn with js/rocket-blast.js's pieces in its layer; the smoke FOLLOWS the rocket on its own path, each puff
        PHI^-5 of the smoke's life further behind (as rocketboom c349097), swelling and fading, on one rAF loop only while puffs live.
        Skipped once the rocket is hit (hidden) or the tab is hidden. The inline first launch gets them too (picked up when this file loads).
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
    booms(up, kk);                                                         // launchbooms: 0..3 more on the climb
    gl.animate(shake(kk, S + D * IP), { duration: S + D * IP, easing: 'linear' });   // phi: shake spans the pad + PHI^-1 of the climb (= D), liftoff at S
  }
  // ---------- launchbooms: 0..3 extra explosions on the climb ----------
  var FIB = [1, 1, 2, 3, 5, 8], NX = 3, bp = null, plans = [], SM = [], sraf = 0, HS = [];   // spec: Danny t278u 'between no extra ones and three extra ones' (NX = 3); Fibonacci piece counts
  function extras() { var P = root.PhiPumps, m = null; if (P && !bp) bp = P.node('rocket:booms', 3, 5, 1, P.page, 34);   // phi: 3 pumps, rungs PHI^5.. s (11 s+, about a launch apart), Fibonacci seed
    try { m = bp ? bp.modes() : null; } catch (e) {}
    if (m == null) m = 2 * fr(count * IP) - 1;                             // phi: no pumps: the golden sequence of the launch number
    return Math.max(0, Math.min(NX, Math.round(NX / 2 * (1 + Math.max(-1, Math.min(1, m * PHI)))))); }   // phi: the modes' mean stretched by PHI, mapped onto 0..3
  function tail() { var r = gl.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 * (1 + IP), S: parseFloat(getComputedStyle(el).fontSize) || r.height, on: r.width > 0 && getComputedStyle(gl).visibility !== 'hidden' }; }   // phi: the exhaust, PHI^-1 of the half-box below its centre; hidden = hit by emoji-collide
  function at(t) { for (var i = HS.length - 1; i >= 0; i--) if (HS[i][0] <= t) return HS[i]; return HS[0]; }
  function smoke(now) { sraf = 0; var p = tail(), K = RocketBlast.kit; HS.push([now, p.x, p.y]); while (HS.length > 144) HS.shift();   // phi: 144 samples (Fibonacci) of where it was
    SM = SM.filter(function (q) { var u = (now - q.t0) / q.life; if (u >= 1 || !q.e.isConnected) { q.e.remove(); return false; }
      var h = now - q.lag > q.t0 ? at(now - q.lag) : null;               // unit: its place on the rocket's path, lag behind (the boom point until the path gets there)
      q.e.style.transform = K.T(h ? h[1] : q.x, (h ? h[2] : q.y) - q.S * IP * u, 0, IP + (PHI - IP) * Math.sqrt(u)); q.e.style.opacity = (1 - Math.pow(IP, 3)) * (1 - u) * Math.pow(IP, q.k * IP);   // phi: rises PHI^-1 of its size, swells PHI^-1 -> PHI, older puffs fainter
      return true; });
    if (SM.length && !doc.hidden) sraf = requestAnimationFrame(smoke); else { SM.forEach(function (q) { q.e.remove(); }); SM = []; HS = []; } }
  function boom(j, kk, ln) {                                               // extra explosion j (1..3) at the rocket, PHI^-j of its size
    var B = root.RocketBlast, K = B && B.kit, p = tail(); if (!K || !p.on || doc.hidden) return;
    var S = p.S * Math.pow(IP, j), life = MS * kk, x = p.x, y = p.y, i, e, c = FIB[5 - j], now = performance.now();   // phi: one PHI^-1 step smaller each time; 5, 3, 2 pieces
    e = K.piece('rb-fg', S * PHI * PHI, S * PHI * PHI);                    // the burst glow blooms PHI^-2 -> 1 -> PHI and fades, left behind as it climbs
    K.run(e, [{ transform: K.T(x, y, 0, IP * IP), opacity: 1 }, { offset: IP * IP, transform: K.T(x, y, 0, 1), opacity: 1 }, { transform: K.T(x, y, 0, PHI), opacity: 0 }], life, 0, 'ease-out');
    for (i = 0; i < c; i++) { var a = TAU * (i / c + K.jit(i, ln + j) * IP * IP), d = S * PHI * (IP + (1 + K.jit(i, j)) / 2 * IP);   // phi: sparks round the circle, golden jitter, about PHI sizes out
      e = K.piece('rb-dot', S * IP * IP, S * IP * IP);
      K.run(e, [{ transform: K.T(x, y, 0, 1), opacity: 1 }, { transform: K.T(x + Math.cos(a) * d, y + Math.sin(a) * d, 0, IP), opacity: 0 }], life * IP, 0, 'cubic-bezier(0,' + IP + ',' + IP + ',1)'); }   // phi: decelerate in the air
    if (!HS.length) HS.push([now, x, y]);
    for (i = 0; i < c; i++) { var sl = life * PHI * PHI; e = K.piece('rb-puff', S * IP, S * IP); e.style.opacity = 0; e.style.transform = K.T(x, y, 0, IP);   // phi: smoke lives PHI^2 s (pumped)
      SM.push({ e: e, t0: now, life: sl, lag: (i + 1) * Math.pow(IP, 5) * sl, x: x, y: y, S: S, k: i }); }   // phi: each puff PHI^-5 of its life further behind on the rocket's path (rocketboom)
    if (!sraf) sraf = requestAnimationFrame(smoke);
    if (B.note) B.note({ at: Math.round(now), x: Math.round(x), y: Math.round(y), size: Math.round(S), j: j, launch: ln });   // footpush reads fired: a boom near the lead sets the critters off
  }
  function booms(climb, kk) {                                              // from liftoff (the end of the climb's delay): n extras, gap j = PHI^(j-5) x the climb time
    if (!climb || !climb.effect) return;
    (climb.ready || Promise.resolve()).then(function () {
      var tm = climb.effect.getTiming(), D = +tm.duration || RISE * MS * kk, wait = (tm.delay || 0) - (climb.currentTime || 0), nx = extras(), ln = count, t = 0, ts = [], j;   // phi: the climb time (PHI^3 s pumped) if unknown
      for (j = 1; j <= nx; j++) { t += D * Math.pow(IP, 5 - j); ts.push(Math.round(t)); if (wait + t > 0) (function (j) { setTimeout(function () { if (climb.playState !== 'idle') boom(j, kk, ln); }, wait + t); })(j); }   // phi: gaps PHI^-4, PHI^-3, PHI^-2 of the climb (growing); a boom already past (late load) is skipped
      plans.push({ launch: ln, extras: nx, at: ts, climb: Math.round(D) }); if (plans.length > 13) plans.shift();
    }, function () {}); }
  var t = 0; function later() { clearTimeout(t); t = setTimeout(launch, GAP * MS * k()); }
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden && !t) later(); });
  var a = el.getAnimations ? el.getAnimations({ subtree: true }) : [];
  if (a.length) Promise.all(a.map(function (x) { return x.finished; })).then(later, later); else later();   // adopt: wait out the inline launch (climb + shake)
  a.forEach(function (x) { if (x.animationName === 'rkY') booms(x, 1); });   // launchbooms: the inline first launch's climb gets its extras too
  root.RocketLaunch = { info: function () { return { launches: count, rise: RISE, pad: PAD, gap: GAP, booms: plans.slice(), smoke: SM.length }; }, launch: launch };
})();
