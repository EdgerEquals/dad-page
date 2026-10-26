/* ATOM REFERENCE DATA (Danny 16:13 / 16:15 AWST 26 Oct 2026: "the logo is an atom, so use real orbital data"; work backwards from a real
   atom). A DOCUMENTED EXCEPTION to the no-fixed-params rule (rule 11), like js/bird-ref-data.js: the constants below are cited physical
   values. Code that uses them (js/eq-lod.js, js/logo-sting.js) only ever takes RATIOS of them, then lets pumps ride on top at small depth.
   Default element: hydrogen. Swap with AtomRef.use('He+') or <html data-atom="He+">; any hydrogen-like entry works through the Rydberg
   formula, and every element keeps its own NIST line list for checking.
   SOURCES
   [1] CODATA 2018 recommended values, NIST (physics.nist.gov/cuu/Constants): Rydberg constant R_inf = 10973731.568160 m^-1,
       speed of light c = 299792458 m/s (exact), proton-electron mass ratio 1836.15267343, alpha particle-electron mass ratio 7294.29954142.
   [2] NIST Atomic Spectra Database, H I lines (Kramida, Ralchenko, Reader & NIST ASD Team), vacuum wavelengths, nm:
       Lyman-alpha 121.567, Balmer H-alpha 656.461, H-beta 486.272, H-gamma 434.169, H-delta 410.294, Paschen-alpha 1875.61.
       NIST ASD He II: 2->1 30.378, 3->2 (Balmer-alpha of He+) 164.043, 4->3 468.71 (air 468.57).
   [3] Rydberg formula with reduced mass: 1/lambda = R_inf * Z^2 / (1 + m_e/M) * (1/n1^2 - 1/n2^2)  (Griffiths, Introduction to Quantum
       Mechanics, 3rd ed., sec. 4.2; Bransden & Joachain, Physics of Atoms and Molecules, ch. 3).
   [4] Space quantisation of orbital angular momentum: |L| = sqrt(l(l+1)) hbar, L_z = m hbar, so cos(theta) = m / sqrt(l(l+1))
       (Griffiths sec. 4.3; the vector model in Eisberg & Resnick, Quantum Physics, ch. 7). For 2p, m = +-1: theta = 45 / 135 deg.
   [5] Bohr model scalings: r_n = n^2 a0 / Z, v_n = Z alpha c / n, orbital period T_n proportional to n^3 / Z^2 (Bohr 1913; Eisberg &
       Resnick ch. 4). Sommerfeld ellipses: minor/major axis b/a = k/n with k = l + 1 (Sommerfeld 1916; Eisberg & Resnick ch. 4).
   [6] Pitch: optical frequencies are moved into hearing by a whole number of OCTAVES (x 2^-k), so every line ratio stays exact. */
(function (W) {
  'use strict';
  var NIST = Object.freeze({ Rinf: 10973731.568160, c: 299792458 });                   // [1]
  var EL = Object.freeze({
    H: Object.freeze({ name: 'hydrogen', Z: 1, massRatio: 1836.15267343,                 // [1] nucleus mass / electron mass
      // the two rings: the 2p orbitals with m = +1 and m = -1 (the first states with orbital angular momentum), quantised at 45 / 135 deg
      rings: Object.freeze([Object.freeze({ n: 2, l: 1, m: 1 }), Object.freeze({ n: 2, l: 1, m: -1 })]),
      // lines heard (lower n1 <- upper n2), in order of importance for the cascade; ref = the line the octave shift is chosen on
      lines: Object.freeze([[2, 3], [2, 4], [3, 4], [2, 5], [1, 2], [2, 6]]), ref: [2, 3],
      nistNm: Object.freeze({ '1-2': 121.567, '2-3': 656.461, '2-4': 486.272, '2-5': 434.169, '2-6': 410.294, '3-4': 1875.61 }),   // [2]
      // relative line strengths, Einstein A (10^8 s^-1), NIST ASD H I: Ly-a 4.6986, H-a 0.44101, H-b 0.084193, H-g 0.025304, H-d 0.0097320, Pa-a 0.089860
      A: Object.freeze({ '1-2': 4.6986, '2-3': 0.44101, '2-4': 0.084193, '2-5': 0.025304, '2-6': 0.0097320, '3-4': 0.089860 }) }),
    'He+': Object.freeze({ name: 'helium ion', Z: 2, massRatio: 7294.29954142,
      rings: Object.freeze([Object.freeze({ n: 2, l: 1, m: 1 }), Object.freeze({ n: 3, l: 2, m: 1 })]),
      lines: Object.freeze([[3, 4], [2, 3], [3, 5], [4, 5], [1, 2], [2, 4]]), ref: [3, 4],
      nistNm: Object.freeze({ '1-2': 30.378, '2-3': 164.043, '3-4': 468.71 }), A: Object.freeze({}) })
  });
  var cur = 'H';
  try { var d = W.document && W.document.documentElement.getAttribute('data-atom'); if (d && EL[d]) cur = d; } catch (e) {}
  function el() { return EL[cur]; }
  // optical frequency of the n2 -> n1 line, Hz [3]
  function lineHz(n1, n2, k) {
    var e = el(), R = NIST.Rinf / (1 + 1 / e.massRatio);
    return NIST.c * R * e.Z * e.Z * (1 / (n1 * n1) - 1 / (n2 * n2));
  }
  // whole-octave shift that brings the reference line nearest to the page's concert pitch (A4 = 440 Hz, ISO 16) [6]
  function octaves() { var r = el().ref; return Math.round(Math.log(lineHz(r[0], r[1]) / 440) / Math.LN2); }
  // audible lines: [{hz, ratio to the reference line, weight (Einstein A ratio to the reference, 1 if not tabled)}]
  function audio(count) {
    var e = el(), k = octaves(), r = e.ref, f0 = lineHz(r[0], r[1]), a0 = e.A[r.join('-')];
    return e.lines.slice(0, count || e.lines.length).map(function (L) {
      var hz = lineHz(L[0], L[1]), key = L.join('-');
      return { n1: L[0], n2: L[1], hz: hz * Math.pow(2, -k), ratio: hz / f0, weight: (a0 && e.A[key]) ? e.A[key] / a0 : 1 };
    });
  }
  // orbital rings for the drawing: tilt from space quantisation [4], size n^2 [5], Sommerfeld shape [5], period n^3 / Z^2 [5]
  function rings() {
    var e = el(), nMax = Math.max.apply(null, e.rings.map(function (o) { return o.n; }));
    return e.rings.map(function (o) {
      var cos = o.m / Math.sqrt(o.l * (o.l + 1));
      return { n: o.n, l: o.l, m: o.m, tiltDeg: Math.acos(cos) * 180 / Math.PI, size: (o.n * o.n) / (nMax * nMax),
               shape: (o.l + 1) / o.n, period: Math.pow(o.n / nMax, 3) / (e.Z * e.Z), speed: (nMax / o.n) * e.Z };
    });
  }
  W.AtomRef = Object.freeze({ NIST: NIST, elements: EL, get element() { return cur; },
    use: function (k) { if (EL[k]) cur = k; return cur; }, lineHz: lineHz, octaves: octaves, audio: audio, rings: rings });
})(window);
