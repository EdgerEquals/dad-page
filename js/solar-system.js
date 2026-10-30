/* SOLAR SYSTEM MODEL, TRUE SCALE (solarsys4; Danny 11:4x AWST 30 Oct 2026, t296u: "Everything should be at true distances. We shouldn't
   be making anything up ... reach for the exact data cause it's a physics model ... all tied back to what ratio we're tying, which at the
   moment is the Golden ratio ... rework the whole solar system and the moons ... the Sun's meant to be in the top right of the screen ...
   everything should be rotating around that"). Was solarsys1 (af3ccc8): distance, size, mass, rings all compressed by x^(PHI^-2), moons on
   golden-angle phases, moon orbits drawn wider than real. Now NOTHING physical is compressed or invented. Tier 2, numbers only (no DOM);
   js/solar-model.js draws it.
   ONE TREE round the Sun, fixed on the shared anchor (window.PhiSun via the PingLayer 'sun' anchor, rule 13; it never moves or sweeps):
   8 planets + Pluto, and 21 major moons (the Moon; Phobos, Deimos; Io, Europa, Ganymede, Callisto; Mimas, Enceladus, Tethys, Dione, Rhea,
   Titan, Iapetus; Miranda, Ariel, Umbriel, Titania, Oberon; Triton; Charon).
   PHYSICS (real, rule 11; every number below is cited):
     planets  heliocentric Keplerian ellipses in 3-D, mean ecliptic + equinox J2000: a, e, I, L, long. perihelion, long. node and their
              rates per Julian century. cite: JPL, E. M. Standish, "Keplerian Elements for Approximate Positions of the Major Planets",
              table 1 (1800-2050 AD), ssd.jpl.nasa.gov/planets/approx_pos.html; Pluto from the same table's earlier edition (it carried
              Pluto). 'earth' there is the Earth-Moon barycentre; the Earth is placed off it by the Moon (DE440 GM ratio).
     moons    planetocentric osculating elements a, e, i, node, w, M and period, ecliptic + equinox J2000, epoch 2026-10-30 00:00 TDB.
              cite: JPL Horizons (queried 30 Oct 2026; satellite ephemerides MAR099, JUP365, SAT441, URA182, NEP098, PLU060). Each moon is a
              two-body Kepler ellipse round its real planet's real position (no golden-angle phases, no widened orbits). Measured against
              Horizons vectors at 04:00 UTC: every moon within 0.13 deg of direction. No precession or resonance terms, so over long
              accelerated runs the moons' phases drift from the true ephemeris (sub-pixel at this scale).
     masses   GM (km^3 s^-2): Sun and planet ratios from JPL DE440 (ssd.jpl.nasa.gov/planets/phys_par.html), moons from JPL SSD satellite
              physical parameters (ssd.jpl.nasa.gov/sats/phys_par). Real, uncompressed: gm(id) km^3/s^2, mass(id) kg (CODATA 2018 G).
     radii    mean radius (km): NASA NSSDC fact sheets (planets), JPL SSD satellite physical parameters (moons), IAU 2015 nominal Sun.
     rings    Saturn: C ring inner .. A ring outer edge (km), NSSDC Saturn rings fact sheet.
   THE THREE DISPLAY CHOICES (the only non-data numbers; phi-tied, rule 2; zoom will later change SCALE only):
     SCALE    one linear km -> CSS px for EVERY distance (planet orbits and moon orbits alike): the outermost body's aphelion (Pluto,
              a (1 + e) from its elements) maps to PHI^-1 of the distance from the Sun (PhiSun) to the farthest screen corner.
              kmPerPx = Q_pluto / (PHI^-1 x d_corner). (iPhone 13 portrait: ~1.5e7 km per px, the Earth ~10 px from the Sun.)
     TIME     one global acceleration, TIME = PHI^34 (~1.275e7): one model second = PHI^34 real seconds, every orbit keeps its real
              period (an Earth year ~2.5 s, Jupiter ~29 s, Neptune ~6.8 min). The clock starts at the real date at page load.
     VIEW     face-on from ecliptic north (orthographic, no tilt): ecliptic longitude 0 (the March equinox) points right, 90 up, so every
              planet goes round anticlockwise as from above the Earth's north pole. Depth (ecliptic z) only orders in front / behind.
   Sizes are NOT physics here: at this scale every body is sub-pixel (the Sun's own radius ~0.05 px), so js/solar-model.js draws each at
   max(true diameter, one device pixel), the smallest renderable dot, a display floor (frame().floor), until the zoom work sets sizes. */
(function (root) {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, TAU = 2 * Math.PI, DEG = TAU / 360, MS = 1e3;   // phi; unit: a turn, a degree, ms per s
  var TIME = Math.pow(PHI, 34);                                          // phi: the one global time acceleration (real s per model s)
  var REACH = IP;                                                        // phi: outermost aphelion at PHI^-1 of the Sun -> far corner distance
  var J2000 = Date.UTC(2000, 0, 1, 12), CENT = 36525 * 86400 * MS, DAYMS = 86400 * MS, YRMS = 365.25 * DAYMS;   // cite: J2000.0 (TDB ~ UTC + 69 s, ignored); Julian century / day / year
  var AU = 149597870.7;                                                  // cite: IAU 2012 astronomical unit (km)
  var G = 6.67430e-20;                                                   // cite: CODATA 2018 gravitational constant (km^3 kg^-1 s^-2)
  var GMS = 132712440041.279419, RSUN = 695700;                          // cite: JPL DE440 GM Sun (km^3/s^2); IAU 2015 nominal solar radius (km)
  // cite: Standish table 1: a (AU), e, I, L, long.peri, long.node (deg) / then rates per century; NSSDC mean radius km; DE440 Sun / planet(+moons) mass ratio
  var PL = [
    ['mercury', 0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593, 0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081, 2439.7, 6023657.9],
    ['venus',   0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255, 0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418, 6051.8, 408523.72],
    ['earth',   1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0, 6371.0, 332946.05],
    ['mars',    1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343, 3389.5, 3098703.6],
    ['jupiter', 5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106, 69911, 1047.3486],
    ['saturn',  9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794, 58232, 3497.9018],
    ['uranus',  19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503, -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589, 25362, 22902.94],
    ['neptune', 30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574, 0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664, 24622, 19412.26],
    ['pluto',   39.48211675, 0.24882730, 17.14001206, 238.92903833, 224.06891629, 110.30393684, -0.00031596, 0.00005170, 0.00004818, 145.20780515, -0.04062942, -0.01183482, 1188.3, 136045556]];
  // cite: JPL Horizons (ssd.jpl.nasa.gov/horizons), osculating planetocentric elements, ecliptic + mean equinox J2000, epoch 2026-10-30 00:00 TDB
  //       (queried 30 Oct 2026; MAR099, JUP365, SAT441, URA182, NEP098, PLU060, DE440/LE440): id, parent, a (km), e, i, node, w, M (deg), period (s);
  //       then JPL SSD satellite physical parameters (ssd.jpl.nasa.gov/sats/phys_par): GM (km^3/s^2), mean radius (km)
  var MO = [
    ['moon', 'earth', 382567.113, 0.0476542, 5.0418127, 326.65671, 101.50835, 18.263211, 2340549.38, 4902.800, 1737.4],
    ['phobos', 'mars', 9377.78841, 0.014817, 25.633597, 82.915486, 288.11528, 232.44681, 27571.7741, 0.0007087, 11.08],
    ['deimos', 'mars', 23458.278, 0.000371641, 24.11617, 81.576739, 40.519231, 17.202618, 109083.299, 0.0000962, 6.2],
    ['io', 'jupiter', 422021.524, 0.00376304, 2.2291389, 338.39189, 16.161871, 230.18515, 153040.484, 5959.91547, 1821.49],
    ['europa', 'jupiter', 671311.887, 0.00913743, 2.0722161, 326.21782, 218.33926, 108.35715, 307040.498, 3202.71210, 1560.80],
    ['ganymede', 'jupiter', 1070340.65, 0.00242705, 2.3437327, 339.05807, 1.8265388, 76.207513, 618131.288, 9887.83275, 2631.20],
    ['callisto', 'jupiter', 1883177.65, 0.00716172, 1.9524441, 336.75269, 35.410241, 111.16446, 1442577.91, 7179.28340, 2410.30],
    ['mimas', 'saturn', 186027.772, 0.0209825, 28.874321, 172.34233, 183.5479, 305.12848, 81855.5636, 2.50349, 198.20],
    ['enceladus', 'saturn', 238415.397, 0.00590509, 28.043787, 169.53286, 192.01383, 328.40338, 118763.49, 7.21037, 252.10],
    ['tethys', 'saturn', 294974.761, 0.00095973, 28.23514, 171.80563, 308.81009, 353.13167, 163440.09, 41.21353, 531.10],
    ['dione', 'saturn', 377652.397, 0.00219549, 28.02583, 169.5512, 261.53442, 280.43872, 236766.084, 73.11607, 561.40],
    ['rhea', 'saturn', 527226.987, 0.000683173, 28.276077, 169.96318, 169.67452, 205.06507, 390550.42, 153.94175, 763.50],
    ['titan', 'saturn', 1221940.44, 0.0287868, 27.705303, 169.08091, 178.37883, 330.11555, 1377860.36, 8978.13710, 2574.76],
    ['iapetus', 'saturn', 3561914.64, 0.0293279, 16.974207, 138.8675, 231.97592, 31.594804, 6858136.32, 120.51511, 734.30],
    ['miranda', 'uranus', 129871.359, 0.00148103, 97.919969, 163.18378, 58.197294, 331.50492, 122169.387, 4.3, 235.8],
    ['ariel', 'uranus', 190944.36, 0.00046576, 97.718227, 167.66592, 231.58324, 221.57072, 217795.849, 83.5, 578.9],
    ['umbriel', 'uranus', 266004.303, 0.00388954, 97.714627, 167.72538, 71.051827, 319.81333, 358114.797, 85.1, 584.7],
    ['titania', 'uranus', 436339.177, 0.00239877, 97.762015, 167.64384, 261.77325, 196.57426, 752350.886, 226.9, 788.9],
    ['oberon', 'uranus', 583376.394, 0.00171332, 97.905786, 167.70812, 152.43715, 121.874, 1163075.01, 205.3, 761.4],
    ['triton', 'neptune', 354767.939, 0.000132403, 129.12494, 222.88002, 120.22883, 69.282714, 507783.52, 1428.49546, 1352.60],
    ['charon', 'pluto', 19595.7628, 0.000160641, 112.88777, 227.39308, 172.37115, 177.13575, 551855.893, 106.1, 606.0]];
  var RING = { saturn: [74658, 136775] };                               // cite: NSSDC Saturn rings fact sheet, C ring inner .. A ring outer edge (km)
  var GME = 398600.435436, GMM = 4902.800066;                            // cite: JPL DE440 GM Earth, GM Moon (km^3/s^2)
  var EPOCH = Date.UTC(2026, 9, 30) - 69184;                             // cite: the Horizons epoch 2026-10-30 00:00 TDB in UTC (TDB - UTC = 69.184 s)
  var now0 = Date.now(), B = {}, ORDER = [];
  function kep(M, e) { var E = M + e * Math.sin(M), i; for (i = 0; i < 12; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }   // unit: Newton steps
  function wrap(a) { a %= TAU; return a < 0 ? a + TAU : a; }
  // perifocal ellipse rotated by node O, inclination i, argument of periapsis w into the reference frame (km or AU in, same out)
  function orbit(a, e, i, O, w, M) {
    var E = kep(wrap(M), e), xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    var cO = Math.cos(O), sO = Math.sin(O), ci = Math.cos(i), si = Math.sin(i), cw = Math.cos(w), sw = Math.sin(w);
    return [(cO * cw - sO * sw * ci) * xp + (-cO * sw - sO * cw * ci) * yp, (sO * cw + cO * sw * ci) * xp + (-sO * sw + cO * cw * ci) * yp, (sw * si) * xp + (cw * si) * yp];
  }
  PL.forEach(function (p, i) {
    var b = { id: p[0], kind: 'planet', parent: 'sun', el: p.slice(1, 13), R: p[13], gm: GMS / p[14], i: i };
    b.aAU = p[1]; b.e = p[2]; b.Q = p[1] * (1 + p[2]) * AU;              // unit: aphelion (km)
    b.Pyr = 360 / p[10] * 100;                                            // cite: sidereal period from the L rate (years)
    if (p[0] === 'earth') b.gm = GME;                                     // the Earth alone (the table ratio is Earth + Moon)
    if (RING[p[0]]) b.ring = RING[p[0]];
    b.moons = []; B[b.id] = b; ORDER.push(b.id);
  });
  MO.forEach(function (m, j) {
    var P = B[m[1]], b = { id: m[0], kind: 'moon', parent: m[1], a: m[2], e: m[3], inc: m[4] * DEG, O: m[5] * DEG, w: m[6] * DEG, M0: m[7] * DEG,
      Ps: m[8], n: TAU / (m[8] * MS), gm: m[9], R: m[10], j: j };            // unit: mean motion (rad per ms) from the osculating period: two-body Kepler round the real planet
    P.moons.push(b.id); B[b.id] = b; ORDER.push(b.id);
  });
  var QMAX = 0; ORDER.forEach(function (id) { if (B[id].Q > QMAX) QMAX = B[id].Q; });   // the outermost aphelion (Pluto)
  var clock = 0;                                                         // unit: model seconds since page load
  function dateOf(t) { return now0 + (t == null ? clock : t) * TIME * MS; }   // unit: the simulated real date (ms since 1970 UTC)
  // heliocentric ecliptic J2000 position (km), real, at date D
  var memo = { D: NaN, v: {} };
  function helio(id, D) {
    if (memo.D !== D) { memo.D = D; memo.v = {}; }
    if (memo.v[id]) return memo.v[id];
    var b = B[id], v;
    if (b.kind === 'planet') {
      var T = (D - J2000) / CENT, el = b.el, a = el[0] + el[6] * T, e = el[1] + el[7] * T, I = (el[2] + el[8] * T) * DEG, L = (el[3] + el[9] * T) * DEG,
        wb = (el[4] + el[10] * T) * DEG, O = (el[5] + el[11] * T) * DEG;   // cite: Standish: w = long.peri - node, M = L - long.peri
      v = orbit(a * AU, e, I, O, wb - O, L - wb);
      if (id === 'earth') { var m = rel('moon', D), k = GMM / (GME + GMM); v = [v[0] - k * m[0], v[1] - k * m[1], v[2] - k * m[2]]; }   // the Earth = barycentre - Moon x mu_M / (mu_E + mu_M)
    } else { var p = helio(b.parent, D), r = rel(id, D); v = [p[0] + r[0], p[1] + r[1], p[2] + r[2]]; }
    memo.v[id] = v; return v;
  }
  function rel(id, D) {                                                  // a moon's planetocentric ecliptic J2000 position (km): its osculating ellipse
    var b = B[id]; return orbit(b.a, b.e, b.inc, b.O, b.w, b.M0 + b.n * (D - EPOCH));
  }
  // the screen frame: the fixed Sun (PingLayer 'sun' anchor = PhiSun) and the one scale, recomputed per call (cheap; follows resizes)
  function frame() {
    if (root.ZoomCam && ZoomCam.on) return ZoomCam.frame(baseFrame());   // zoomcam1: the camera body's view (js/zoom-camera.js), else the home frame
    return baseFrame();
  }
  function baseFrame() {
    var PLy = root.PingLayer, A = PLy && PLy.anchors, W = (A && A.view && A.view.w) || innerWidth, H = innerHeight;
    var s = (A && A.sun) || (root.PhiSun ? PhiSun.px() : { x: W, y: 0 });
    var dc = Math.max(Math.hypot(s.x, s.y), Math.hypot(W - s.x, s.y), Math.hypot(s.x, H - s.y), Math.hypot(W - s.x, H - s.y));   // unit: Sun -> farthest corner
    var kpp = QMAX / (REACH * dc), dpr = root.devicePixelRatio || 1;
    return { x: s.x, y: s.y, W: W, H: H, kmPerPx: kpp, corner: dc, floor: 1 / dpr, dpr: dpr, D: dateOf() };
  }
  // at(id, t): where a body is drawn at model time t (default now), CSS px: x, y, z (km, + toward ecliptic north), true diameter dt, drawn d
  function at(id, t, F) {
    var b = B[id]; if (!b) return null; F = F || frame();
    var D = t == null ? dateOf() : dateOf(t), v = helio(id, D), dTrue = 2 * b.R / F.kmPerPx;
    var cx = F.cx || 0, cy = F.cy || 0, o = { id: id, x: F.x + (v[0] - cx) / F.kmPerPx, y: F.y - (v[1] - cy) / F.kmPerPx, z: v[2], km: v, dt: dTrue, d: Math.max(dTrue, F.floor), sc: 1, front: v[2] >= 0, date: D };
    if (b.kind === 'moon') { var pv = helio(b.parent, D); o.parent = b.parent; o.front = v[2] >= pv[2]; }
    return o;
  }
  function lon(id, t) { var v = helio(id, dateOf(t)); return wrap(Math.atan2(v[1], v[0])) / DEG; }   // unit: heliocentric ecliptic longitude (deg)
  function period(id) { var b = B[id]; return (b.kind === 'planet' ? b.Pyr * YRMS : b.Ps * MS) / MS / TIME; }   // unit: model seconds per real orbit
  function screenGM(id, F) { F = F || frame(); var g = id === 'sun' ? GMS : B[id].gm, k = F.kmPerPx; return g / (k * k * k) * TIME * TIME; }   // unit: px^3 per model s^2 (same km/px, same TIME)
  root.SolarSystem = {
    helio: function (id, D) { return helio(id, D); }, baseFrame: function () { return baseFrame(); }, GMS: GMS, G: G,   // zoomcam1: raw km positions at a date, the home frame
    PHI_TIME: 34, TIME: TIME, REACH: REACH, bodies: B, order: ORDER, frame: frame, at: at, lon: lon, period: period, date: dateOf,
    gm: function (id) { return id === 'sun' ? GMS : B[id].gm; },          // real GM (km^3/s^2)
    mass: function (id) { return (id === 'sun' ? GMS : B[id].gm) / G; },  // real mass (kg)
    screenGM: function (id) { return screenGM(id); }, sunRadius: RSUN, AU: AU,
    clock: function () { return clock; }, advance: function (dt) { clock += dt; return clock; },
    info: function () { var F = frame(); return { kmPerPx: F.kmPerPx, corner: F.corner, sun: { x: F.x, y: F.y }, floor: F.floor, time: 'PHI^34', TIME: TIME, date: new Date(F.D).toISOString(),
      bodies: ORDER.map(function (id) { var b = B[id], p = at(id, null, F);
        return { id: id, kind: b.kind, parent: b.parent, lon: b.kind === 'planet' ? +lon(id).toFixed(3) : null, T: +period(id).toFixed(4), x: p.x, y: p.y, dTrue: p.dt, d: p.d, front: p.front,
          on: p.x >= 0 && p.x <= F.W && p.y >= 0 && p.y <= F.H }; }) }; } };
})(window);
