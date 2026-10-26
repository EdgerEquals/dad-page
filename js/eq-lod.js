/* eq-lod.js: ONE level-of-detail rendition of Ed's EdgerEquals mark, shared by the header mini mark and the logo window card (Danny 15:49
   AWST 26 Oct: "the same rendition ... progressive LOD"). The card mirrors the header <img> (js/first-content.js), so both show one stage.
   THE MARK IS AN ATOM (Danny 16:13 / 16:15): the rings are orbitals drawn from js/atom-ref-data.js (hydrogen by default, swappable):
     tilt  = space quantisation, cos(theta) = m / sqrt(l(l+1))  -> 2p m=+1 / m=-1 = 45 / 135 deg, so the rings cross at right angles
     size  = Bohr radius ratio n^2, shape = Sommerfeld b/a = (l+1)/n seen at the mark's viewing angle (PHI^-2, artwork), electron
             period = Bohr n^3 / Z^2 (speed 1/n).
   Clean and real first, then moving and evolving as the modulation ramps in (the same ramp the logo sound uses, js/logo-sting.js):
     0  first paint (no JS): the inline static silhouette in index.html.
     1  T1, ramp 0 (clean): the orbitals at their quantised tilts, an electron on each at its real relative speed, the = still.
     2  T2 idle, ramp 1 (modulated): Larmor-style precession seen edge-on (each ring's apparent shape and tilt wobble about the quantised
        value by a small pumped depth), glow layers, a faint probability-cloud shimmer (2p m=+-1 density is a torus about the field axis),
        the = breathing and its neon pulse; depths scaled by the page pump root (PhiPumps.page).        budget: + 9 elements
     full  only in the zoom on tap (js/dad-mark-zoom.js, Simmie's; ramp state is shared through window.AtomRamp).
   Continuity: animations start at the time already elapsed (negative delays), so a stage swap never jumps. Reduced motion: still.
   API: EqLOD.stage (0/1/2), EqLOD.t (ms after navigation start when each stage landed), EqLOD.svg(stage) (for tests). */
(function (W, doc) {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2;
  function p(n) { return Math.pow(PHI, n); }
  function f(x) { return +x.toFixed(3); }
  var hb = doc.querySelector('.q-head .dad-zoom'), hi = hb && hb.querySelector('.dad-mark');
  if (!hi || W.EqLOD) return;
  var T0 = null, api = { stage: 0, t: { 0: null, 1: null, 2: null }, svg: svg };
  try { var fp = performance.getEntriesByName('first-contentful-paint')[0] || performance.getEntriesByName('first-paint')[0]; api.t[0] = fp ? Math.round(fp.startTime) : null; } catch (e) {}
  W.EqLOD = api;
  var C = 32, BW = 64 * p(-2), BH = 64 * p(-5), GAP = BH / PHI;               // bars: phi ratios of the 64-unit box, centred on 32
  var yA = C - GAP / 2 - BH, yB = C + GAP / 2, xB = C - BW / 2;
  function orbitals() {   // js/atom-ref-data.js when loaded; otherwise the same physics for hydrogen 2p m=+1/-1 (cos theta = m / sqrt 2)
    try { if (W.AtomRef) return AtomRef.rings(); } catch (e) {}
    return [1, -1].map(function (m) { return { n: 2, l: 1, m: m, tiltDeg: Math.acos(m / Math.SQRT2) * 180 / Math.PI, size: 1, shape: 1, period: 1 }; });
  }
  function svg(st) {
    var e = T0 == null ? 0 : (performance.now() - T0) / 1000, d = function (T) { return '-' + f(e % T) + 's'; };
    var pg = 0; try { pg = W.PhiPumps && PhiPumps.page ? PhiPumps.page.modes() : 0; } catch (x) {}
    var ramp = st > 1 ? 1 : 0, pump = 1 + pg / PHI;
    var bd = p(-5) * pump * ramp, wd = p(-4) * pump * ramp;                  // breath and precession depths: zero while clean
    var TB = p(3 / 2), TL = p(5), TO = p(2), TC = p(5 / 2), RX = 29, VIEW = p(-2);   // RX: the mark's cited outer ring (64-unit art)
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><style>' +
      '.v{transform-box:view-box;transform-origin:32px 32px}' +
      (ramp ? '.b{animation:br ' + f(TB) + 's ease-in-out ' + d(TB) + ' infinite alternate}' +
        '@keyframes br{from{transform:scale(1,' + f(1 - bd) + ');opacity:' + f(1 - p(-3)) + '}to{transform:scale(1,' + f(1 + bd) + ');opacity:1}}' +
        '.pr{animation:pr ' + f(TL) + 's ease-in-out infinite alternate}' +
        '@keyframes pr{from{transform:rotate(' + f(-45 * wd) + 'deg) scale(1,' + f(1 - wd) + ')}to{transform:rotate(' + f(45 * wd) + 'deg) scale(1,' + f(1 + wd) + ')}}' +
        '.ng{animation:ng ' + f(TB * PHI) + 's ease-in-out ' + d(TB * PHI) + ' infinite alternate}@keyframes ng{from{opacity:' + f(p(-3)) + '}to{opacity:' + f(p(-1)) + '}}' +
        '.cl{animation:cl ' + f(TC) + 's ease-in-out ' + d(TC) + ' infinite alternate}@keyframes cl{from{opacity:' + f(p(-5)) + '}to{opacity:' + f(p(-3)) + '}}' : '') +
      '@media (prefers-reduced-motion:reduce){*{animation:none!important}animateMotion,animate{display:none}}</style><defs>' +
      '<linearGradient id="r1" x1="0" x2="1"><stop offset="0" stop-color="#1F5478"/><stop offset="' + f(p(-1)) + '" stop-color="#0AF2FF"/><stop offset="1" stop-color="#85A6BB"/></linearGradient>' +
      '<linearGradient id="r2" x1="1" x2="0"><stop offset="0" stop-color="#143A57"/><stop offset="' + f(p(-1)) + '" stop-color="#85A6BB"/><stop offset="1" stop-color="#0AF2FF"/></linearGradient>' +
      '<linearGradient id="em" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FFFD6"/><stop offset="' + f(p(-2)) + '" stop-color="#3DFFB0"/><stop offset="1" stop-color="#00C896"/></linearGradient>' +
      (ramp ? '<filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="' + f(PHI) + '"/></filter>' +
        '<radialGradient id="cg"><stop offset="0" stop-color="#0AF2FF" stop-opacity="0"/><stop offset="' + f(p(-1)) + '" stop-color="#9DBCCE"/><stop offset="1" stop-color="#0AF2FF" stop-opacity="0"/></radialGradient>' : '') +
      '</defs>';
    if (ramp) s += '<ellipse class="cl" cx="32" cy="32" rx="' + f(RX) + '" ry="' + f(RX * VIEW) + '" fill="url(#cg)"/>';   // 2p m=+-1 cloud: torus about the vertical field axis
    var O = orbitals(), grads = ['r1', 'r2'], widths = [PHI * p(1 / 2), PHI];
    function ring(o, i) {
      var rx = f(RX * o.size), ry = f(RX * o.size * o.shape * VIEW), rot = f(o.tiltDeg - 90), w = widths[i % 2], T = TO * o.period;
      var g = '<g transform="rotate(' + rot + ' 32 32)"><g class="v' + (ramp ? ' pr' : '') + '"' + (ramp ? ' style="animation-delay:-' + f((e + i * TL / 2) % TL) + 's"' : '') + '>';
      if (ramp) g += '<ellipse cx="32" cy="32" rx="' + rx + '" ry="' + ry + '" fill="none" stroke="#0AF2FF" stroke-width="' + f(w * PHI * PHI) + '" opacity="' + f(p(-3)) + '" filter="url(#gl)"/>';
      g += '<ellipse cx="32" cy="32" rx="' + rx + '" ry="' + ry + '" fill="none" stroke="url(#' + grads[i % 2] + ')" stroke-width="' + f(w) + '"/>';
      var path = 'M' + f(32 + +rx) + ',32 A' + rx + ',' + ry + ' 0 1,1 ' + f(32 - rx) + ',32 A' + rx + ',' + ry + ' 0 1,1 ' + f(32 + +rx) + ',32';
      var dir = o.m < 0 ? ' keyPoints="1;0" keyTimes="0;1" calcMode="linear"' : '';   // m sign = sense of rotation
      var T0r = T, beg = '-' + f((e + i * T0r / 2) % T0r) + 's';
      g += '<circle r="' + f(w * PHI) + '" fill="#E6FDFF"><animateMotion dur="' + f(T0r) + 's" begin="' + beg + '" repeatCount="indefinite"' + dir + ' path="' + path + '"/></circle>';
      return g + '</g></g>';
    }
    s += O.map(ring).join('');
    // the = stays upright, centred
    var bar = function (y) { return '<rect x="' + f(xB) + '" y="' + f(y) + '" width="' + f(BW) + '" height="' + f(BH) + '" rx="' + f(BH * p(-3)) + '"/>'; };
    if (ramp) s += '<g class="ng" fill="#00C896" filter="url(#gl)">' + bar(yA) + bar(yB) + '</g>';
    s += '<g class="v' + (ramp ? ' b' : '') + '" fill="url(#em)" stroke="#50FFB0" stroke-width="' + f(p(-2)) + '">' + bar(yA) + bar(yB) + '</g>' +
      '<g fill="#E6FFF4" opacity="' + f(p(-1)) + '"><rect x="' + f(xB + BH * p(-1)) + '" y="' + f(yA + BH * p(-2)) + '" width="' + f(BW - 2 * BH * p(-1)) + '" height="' + f(BH * p(-3)) + '"/>' +
      '<rect x="' + f(xB + BH * p(-1)) + '" y="' + f(yB + BH * p(-2)) + '" width="' + f(BW - 2 * BH * p(-1)) + '" height="' + f(BH * p(-3)) + '"/></g></svg>';
    return s;
  }
  function url(st) { return 'data:image/svg+xml,' + encodeURIComponent(svg(st)); }
  function set(st) {
    if (st <= api.stage) return;
    if (T0 == null) T0 = performance.now();
    hi.src = url(st); api.stage = st; api.t[st] = Math.round(performance.now());   // the card follows the header <img> (MutationObserver)
  }
  set(1);
  if (W.LoadTiers && LoadTiers.add) LoadTiers.add(2, function () { set(2); }, 'mark LOD 2', { id: 'dad-mark', w: 1 });   // w: about 1 KB of work, so the weight order runs it early in tier 2
  else W.addEventListener('load', function () { setTimeout(function () { set(2); }, Math.round(1000 * p(1))); });
})(window, document);
