/* SOLAR SYSTEM MODEL (solarsys1; Danny 11:10 AWST 30 Oct 2026, t289u: "model all the planets as animations ... build out their complete
   solar system ... see it sweeping through the screen again with the sun at the centre, so we have a complete gravity and position model
   of the solar system including all its moons"). Tier 2, numbers only (no DOM): js/solar-model.js draws it, gravity reads it.
   ONE TREE round the shared Sun (window.PhiSun through the PingLayer 'sun' anchor, rule 13): 8 planets + Pluto, and 21 major moons
   (the Moon; Phobos, Deimos; Io, Europa, Ganymede, Callisto; Mimas, Enceladus, Tethys, Dione, Rhea, Titan, Iapetus; Miranda, Ariel,
   Umbriel, Titania, Oberon; Triton; Charon). The ~270 small moons (mostly < 50 km, irregular, far out) are left for later.
   CITED DATA (rule 11, the only fixed numbers here):
     planets  a (AU), e, mean longitude L, longitude of perihelion w (deg), L rate (deg / Julian century): JPL, E. M. Standish,
              "Approximate Positions of the Planets", table 1 (1800-2050), J2000. Mean radius (km) and Sun / planet mass ratio:
              NASA NSSDC planetary fact sheets (nssdc.gsfc.nasa.gov/planetary/factsheet), JPL DE440 GM ratios.
     moons    a (km), e, sidereal period (d), mean radius (km), GM (km^3 s^-2): JPL SSD planetary satellite mean elements and
              physical parameters (ssd.jpl.nasa.gov/sats/elem, ssd.jpl.nasa.gov/sats/phys_par). Parent GM: same table.
     Starting place: each planet's real mean anomaly today (Standish); moons start on golden-angle phases (rule 2) for now.
   DISPLAY COMPRESSION (one exponent, C = PHI^-2, the size law js/solar-model.js already used): every real ratio x is drawn as x^C.
     distance  screen semi-major = the Earth's screen semi-major (PingLayer 'earth' orbit) x a_AU^C; a moon sits at its planet's
               drawn radius x (a / R_planet)^C; Saturn's rings the same way (ring radius / R)^C.
     size      drawn diameter = the PingLayer node x PHI x (R / R_earth)^C (unchanged law).
     mass      mu = (m / M_sun)^C, so Jupiter PHI^-5.5, Earth PHI^-10.1 (the research's rungs); a moon's mu is its planet's x (m / m_p)^C.
     period    ONE screen gravity: GM_sun = 4 pi^2 ae^3 / TO^2 from the Earth's on-screen orbit (ae px, TO s); every orbit's period is
               Kepler III on its own screen semi-major round its parent's screen GM (planets: TO x a_AU^(3C/2)). So the drawn orbits
               ARE the gravity model: at(id, t) is where a body is, mass(id) what it pulls with, in the same pixels and seconds.
   The Earth and the Moon are drawn by js/ping-layer.js (its own orbit and the Moon group); their at() reads those anchors (plain numbers).
   Planets keep scripted (analytic Kepler) orbits: no n-body, the Sun never moves (rule 13). */
(function (root) {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, TAU = 2 * Math.PI, DEG = TAU / 360, MS = 1e3;   // phi; unit: a turn, a degree, ms per s
  var C = IP * IP;                                                       // phi: the one display compression exponent PHI^-2
  var J2000 = Date.UTC(2000, 0, 1, 12), CENT = 36525 * 86400 * MS;       // cite: J2000.0 epoch; unit: a Julian century in ms
  var RE = 6371.0, AU = 149597870.7;                                     // cite: NSSDC Earth mean radius (km); IAU 2012 astronomical unit (km)
  var SENSE = -1;                                                        // unit: the Earth's on-screen sense of travel (left to right on the near side)
  // cite: Standish table 1 (a, e, L, w, dL); NSSDC mean radius km (r); Sun / planet mass (sm, DE440); colours in js/solar-model.js
  var PL = [
    ['mercury', 0.38709927, 0.20563593, 252.25032350, 77.45779628, 149472.67411175, 2439.7, 6023657.9],
    ['venus',   0.72333566, 0.00677672, 181.97909950, 131.60246718, 58517.81538729, 6051.8, 408523.72],
    ['earth',   1.00000261, 0.01671123, 100.46457166, 102.93768193, 35999.37244981, 6371.0, 332946.05],
    ['mars',    1.52371034, 0.09339410, -4.55343205, -23.94362959, 19140.30268499, 3389.5, 3098703.6],
    ['jupiter', 5.20288700, 0.04838624, 34.39644051, 14.72847983, 3034.74612775, 69911, 1047.3486],
    ['saturn',  9.53667594, 0.05386179, 49.95424423, 92.59887831, 1222.49362201, 58232, 3497.9018],
    ['uranus',  19.18916464, 0.04725744, 313.23810451, 170.95427630, 428.48202785, 25362, 22902.94],
    ['neptune', 30.06992276, 0.00859048, -55.12002969, 44.96476227, 218.45945325, 24622, 19412.26],
    ['pluto',   39.48211675, 0.24882730, 238.92903833, 224.06891629, 145.20780515, 1188.3, 136045556]];
  // cite: JPL SSD satellite mean elements + physical parameters: parent, a (km), e, sidereal period (d), mean radius (km), GM (km^3/s^2), retrograde
  var MO = [
    ['moon', 'earth', 384400, 0.0554, 27.322, 1737.4, 4902.80],
    ['phobos', 'mars', 9376, 0.0151, 0.3189, 11.08, 7.087e-4], ['deimos', 'mars', 23458, 0.0002, 1.2624, 6.2, 9.6e-5],
    ['io', 'jupiter', 421800, 0.0041, 1.769, 1821.6, 5959.92], ['europa', 'jupiter', 671100, 0.0094, 3.551, 1560.8, 3202.74],
    ['ganymede', 'jupiter', 1070400, 0.0013, 7.155, 2631.2, 9887.83], ['callisto', 'jupiter', 1882700, 0.0074, 16.69, 2410.3, 7179.29],
    ['mimas', 'saturn', 185539, 0.0196, 0.942, 198.2, 2.5026], ['enceladus', 'saturn', 238042, 0.0047, 1.370, 252.1, 7.2027],
    ['tethys', 'saturn', 294672, 0.0001, 1.888, 531.0, 41.21], ['dione', 'saturn', 377415, 0.0022, 2.737, 561.4, 73.116],
    ['rhea', 'saturn', 527068, 0.0002, 4.518, 763.5, 153.94], ['titan', 'saturn', 1221865, 0.0288, 15.945, 2574.7, 8978.14],
    ['iapetus', 'saturn', 3560854, 0.0293, 79.33, 734.3, 120.52],
    ['miranda', 'uranus', 129900, 0.0013, 1.413, 235.8, 4.3], ['ariel', 'uranus', 190900, 0.0012, 2.520, 578.9, 83.46],
    ['umbriel', 'uranus', 266000, 0.0039, 4.144, 584.7, 85.09], ['titania', 'uranus', 436300, 0.0011, 8.706, 788.9, 226.94],
    ['oberon', 'uranus', 583500, 0.0014, 13.463, 761.4, 205.32],
    ['triton', 'neptune', 354759, 0.0000, 5.877, 1353.4, 1427.6, 1],
    ['charon', 'pluto', 19591, 0.0002, 6.387, 606.0, 105.88]];
  var GMP = { earth: 398600.435, mars: 42828.37, jupiter: 126686531.9, saturn: 37931206.2, uranus: 5793951.3, neptune: 6835100, pluto: 869.6 };   // cite: JPL SSD parent GM (km^3/s^2)
  var RING = { saturn: [74658, 136775] };                               // cite: NSSDC Saturn rings fact sheet, C ring inner .. A ring outer edge (km)
  var TILT = { uranus: 97.77 * DEG };                                    // cite: NSSDC Uranus fact sheet, obliquity 97.77 deg (its moons circle nearly pole-on)
  var now0 = Date.now(), B = {}, ORDER = [];
  PL.forEach(function (p, i) {
    var b = { id: p[0], kind: 'planet', parent: 'sun', aAU: p[1], e: p[2], R: p[6], mSun: 1 / p[7], i: i };
    b.M0 = (p[3] - p[4] + p[5] * (now0 - J2000) / CENT) * DEG;           // cite: mean anomaly today = L - w (Standish)
    b.ka = Math.pow(p[1], C); b.mu = Math.pow(b.mSun, C); b.rung = Math.log(b.mu) / Math.log(PHI);   // phi: compressed distance and mass
    b.ks = PHI * Math.pow(p[6] / RE, C);                                 // phi: drawn diameter in nodes (solar-model's law)
    if (RING[p[0]]) b.ring = RING[p[0]].map(function (r) { return Math.pow(r / p[6], C); });
    if (TILT[p[0]]) b.tilt = TILT[p[0]];
    b.moons = []; B[b.id] = b; ORDER.push(b.id);
  });
  MO.forEach(function (m, j) {
    var P = B[m[1]], b = { id: m[0], kind: 'moon', parent: m[1], aKm: m[2], e: m[3], Pd: m[4], R: m[5], retro: !!m[7], j: j };
    b.kr = Math.pow(m[2] / P.R, C);                                      // phi: screen distance in the planet's drawn radii
    b.ks = PHI * Math.pow(m[5] / RE, C);                                 // phi: drawn diameter in nodes (same law as the planets)
    b.mu = P.mu * Math.pow(m[6] / GMP[m[1]], C); b.rung = Math.log(b.mu) / Math.log(PHI);   // phi: compressed mass
    b.M0 = TAU * ((P.moons.length + 1) * IP % 1);                         // phi: golden-angle start phase round its planet (rule 2)
    P.moons.push(b.id); B[b.id] = b; ORDER.push(b.id);
  });
  var clock = 0, TO0 = 0;                                                         // unit: model seconds (pumped by the drawer), 0 = page load
  function kep(M, e) { var E = M, i; for (i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }   // unit: Newton steps
  // the screen frame: everything in the Earth's on-screen orbit units (PingLayer), recomputed per call (cheap; follows resizes)
  function frame() {
    var PLy = root.PingLayer, A = PLy && PLy.anchors, sp = PLy && PLy.spec && PLy.spec.earth, W = (A && A.view && A.view.w) || innerWidth, H = innerHeight;
    var orb = (sp && sp.orb) || [Math.pow(IP, 3 / 2), IP * IP, IP];       // phi: PingLayer's own rungs as the fallback
    var s = (A && A.sun) || (root.PhiSun ? PhiSun.px() : { x: W, y: 0 });
    if (!TO0 && PLy && PLy.info) TO0 = (PLy.info().orbit || {}).period;   // read once: the PingLayer's TO is a fixed rung (its info() is heavy)
    var TO = TO0 || Math.pow(PHI, 8);                                   // phi: the Earth's on-screen orbit period
    var ae = orb[0] * W, node = (A && A.moon && (A.moon.s0 || A.moon.s)) || Math.min(W, H) * Math.pow(IP, 5.5);   // phi: the PingLayer node
    return { x: s.x, y: s.y, W: W, H: H, ae: ae, q: orb[1], eE: orb[2], TO: TO, node: node, GM: TAU * TAU * ae * ae * ae / (TO * TO) };   // cite: Kepler III, GM = 4 pi^2 a^3 / T^2
  }
  function GMof(id, F) { var b = B[id]; return b ? F.GM * b.mu : F.GM; }
  function period(id, F) {                                               // screen Kepler III round the parent's screen GM
    var b = B[id]; F = F || frame();
    if (b.kind === 'planet') return b.id === 'earth' ? F.TO : F.TO * Math.pow(b.aAU, 3 * C / 2);
    var a = b.kr * B[b.parent].ks * F.node / 2; return TAU * Math.sqrt(a * a * a / GMof(b.parent, F));
  }
  // at(id, t): where a body is drawn at model time t (default now), in CSS px: x, y, depth sn (-1 far .. 1 near), scale sc, diameter d, front
  function at(id, t, F) {
    var b = B[id]; if (!b) return null; F = F || frame(); t = t == null ? clock : t;
    var A = root.PingLayer && PingLayer.anchors;
    if ((id === 'earth' || id === 'moon') && A && A[id]) { var g = A[id]; return { id: id, x: g.x, y: g.y, sn: g.front ? 1 : -1, sc: g.sc || 1, d: g.s, front: !!g.front, drawn: 'ping-layer' }; }
    if (b.kind === 'planet') {
      var E = kep(b.M0 + SENSE * TAU * t / period(id, F), b.e), sn = Math.sin(E), ra = F.ae * b.ka, sc = Math.pow(PHI, sn - 1);   // phi: the Earth's depth law
      return { id: id, x: F.x + ra * (Math.cos(E) - b.e), y: F.y + ra * F.q * sn, sn: sn, sc: sc, d: F.node * b.ks * sc, front: sn > 0 };
    }
    var P = at(b.parent, t, F), PB = B[b.parent], E2 = kep(b.M0 + (b.retro ? -SENSE : SENSE) * TAU * t / period(id, F), b.e), s2 = Math.sin(E2);
    var r = b.kr * PB.ks * F.node / 2 * P.sc, dx = r * (Math.cos(E2) - b.e), dy = r * F.q * s2, c = Math.cos(PB.tilt || 0), s = Math.sin(PB.tilt || 0);
    var sc2 = P.sc * Math.pow(PHI, (s2 - 1) * IP);                       // phi: the parent's depth x its own, gentler (PingLayer's moon law)
    return { id: id, x: P.x + dx * c - dy * s, y: P.y + dx * s + dy * c, sn: s2, sc: sc2, d: F.node * b.ks * sc2, front: s2 > 0, parent: b.parent };
  }
  root.SolarSystem = {
    C: C, bodies: B, order: ORDER, frame: frame, at: at, period: function (id) { return period(id); },
    mass: function (id) { return GMof(id, frame()); },                   // screen GM (px^3 / s^2) for gravity
    clock: function () { return clock; }, advance: function (dt) { clock += dt; return clock; },
    info: function () { var F = frame(); return { C: C, GMsun: F.GM, TO: F.TO, ae: F.ae, bodies: ORDER.map(function (id) { var b = B[id], p = at(id, null, F);
      return { id: id, kind: b.kind, parent: b.parent, rung: +b.rung.toFixed(2), T: +period(id, F).toFixed(2), x: p.x, y: p.y, d: p.d, front: p.front }; }) }; } };
})(window);
