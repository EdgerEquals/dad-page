/* ZOOM CAMERA, stage 1 (zoomcam1; Danny t307u 30 Oct 2026: "tie our view into the gravity model ... careening around
   like a pinball through all the orbits ... caught into the gravity well of another planet or moon, then flicked back out ... a bias so
   that we mostly are looking at that Sun ... sometimes as a planet comes past we get sucked into it, and that's how we fix the Zoom").
   Loaded late by js/solar-model.js after its first home draw (not under reduced motion: the still home frame stays). Decisions: Danny 30 Oct
   (62% home via a quiet spell; the viewing capsule; crashes as they are for now, a dial later; t325u). Plan: zoom-plan-2026-10-30.md.
   THE CAMERA IS A BODY: a massless probe in the real gravity of the Sun, 8 planets, Pluto and 21 moons (restricted n-body: it feels every
   cited GM in js/solar-system.js at its real place, it pulls nothing, so the cited ephemeris and the fixed Sun stay exact).
     integrator  kick-drift-kick leapfrog (velocity Verlet), step h = PHI^-6 of the smallest local dynamical time sqrt(d^3 / GM) over
                 every body (the rocket's own rule, 588966d), at most PHI^10 (~123) steps a frame (more needed -> the clock waits, never skips)
     gravity     exact point mass outside every body (a sphere's field); inside, the uniform-sphere field GM r / R^3 (never reached: the
                 capsule touches the surface first). Was Plummer softening with epsilon = R, which cut surface gravity by 2^1.5 (capsule work)
     collision   the viewing capsule (Apollo CM, cited below): above 9.1 m/s into a surface it breaks up and a new one starts at home; at or
                 below it bounces (normal speed x PHI^-1, rule 15: the lost energy is the hit's dispersion); a bound bounce ends at its next touch
     the bias    a low-thrust ENGINE (any direction, at most PHI^-2 of the Sun's pull where we are; a declared control choice, not data).
                 Outside every sphere of influence it steers us into a LANE beside the nearest planet's orbit: the planet's own ellipse
                 scaled by k = 1 -+ PHI^(1/2) Hill radii / r, a damped spring on the lane's moving point (w0 = PHI^2 x the planet's mean
                 motion, damping PHI^-1). The lane runs a little faster (inside) or slower (outside) than the planet (Kepler III), so the
                 planet comes to us. Between PHI x SOI and the SOI edge the engine fades out (smoothstep in log distance, rule 6); inside a
                 sphere of influence it is off: every capture, loop and fling is pure gravity. (A beta = 1 solar sail was tried first: it
                 cannot push sunward and lost the Earth lane, 67 -> 330 SOI radii in 40 model s; see the plan.)
   ZOOM FROM DISTANCE (no dial): depth in a sphere of influence (Laplace r = a (m/M)^(2/5)), w = smoothstep(log(r_soi/d) / log(PHI^3)):
     w = 0 at the SOI edge = the home view (Sun on PhiSun, the one true-scale km/px); w = 1 at PHI^-3 of the SOI = the body centred on screen
     with our distance to it at PHI^-1 of the half short side (km/px = d PHI / S, log-blended). Nested: a moon's SOI inside its planet's.
   TIME: one clock for everything. Home: PHI^34 x real. Deep in a well: one local dynamical time sqrt(d^3/GM) per model second (log-blended
     by w, never faster than home), so a pass plays at the same pace at Jupiter or at Phobos (Kepler III, the 3/2 power). */
(function (root) {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, LP = Math.log(PHI), MS = 1e3;
  var SS = root.SolarSystem; if (!SS) return;
  var B = SS.bodies, GMS = SS.GMS, RS = SS.sunRadius, AU = SS.AU;
  var STEP = Math.pow(IP, 6), CAP = Math.round(Math.pow(PHI, 10)), BAND = 3 * LP;   // phi: substep, max substeps a frame, the w band (PHI^3 of depth)
  var TPH = 0, LANE = IP * IP, W0 = PHI * PHI, ZETA = IP, REST = IP, THR = IP * IP;   // phi: lane offset (Hill radii), spring rate (x lane n), damping, restitution, engine cap (x local solar pull)
  var UNIT = 'soi', O = root.ZP_OPT || {}; if (O.UNIT) UNIT = O.UNIT; if (O.LANE) LANE = O.LANE; if (O.REST != null) REST = O.REST; if (O.W0) W0 = O.W0; if (O.THR) THR = O.THR; if (O.TPH != null) TPH = O.TPH;   // test overrides (the harness only)
  // THE QUIET SPELL (Danny 30 Oct 2026: "Go with about 62% home"): when a pass ends (the lens is back home) the engine keeps station -
  // the lane steps out to PHI^2 spheres of influence off the planet's orbit and stops closing on it (its phase tau is held), and the engine,
  // still capped at PHI^-2 of the Sun's pull, burns prograde inside the sphere of influence (along our speed relative to the planet, the
  // low-thrust spiral out; it never brakes, so it cannot help a capture) - until
  // home time has caught up with QUIET x the time spent in passes (viewer seconds, cumulative since load). A capture that outlasts
  // QUIET^-1 x the home time before it, while home is behind, starts the spell early, from inside the well (the prograde climb), so no
  // capture holds the view for good. Then the lane closes again from
  // where we are (on the side of the orbit that closes from here) and gravity does the rest. QUIET = PHI aims at a home share of PHI / (1 + PHI) = PHI^-1 (62%). That ratio is the
  // ONE free knob; every pass itself (capture, loops, fling) stays pure gravity.
  var QUIET = PHI, QOFF = PHI * PHI, HOMEW = Math.pow(IP, 6);            // phi: home : pass time; the station (x SOI off the orbit, past the engine's fade at PHI); "home" = lens weight below PHI^-6
  if (O.QUIET != null) QUIET = O.QUIET;
  // THE VIEWING CAPSULE (Danny t316u 30 Oct: "a viewing capsule that we're in and it has parameters so it can bounce off but if the impact
  // of the bounce is too strong ... disintegrate and starts again"). Modelled on the Apollo Command Module:
  //   radius  1.955 m   cite: base diameter 3.91 m (12 ft 10 in), Apollo CSM specifications (en.wikipedia.org/wiki/Apollo_command_and_service_module)
  //   mass    5560 kg   cite: same (12,250 lb); used for the impact energy dispersed (rule 15)
  //   VMAX    9.1 m/s   cite: the normal (vertical) touchdown speed the CM was drop-tested to, 30 ft/s: NASA Langley dynamic-model tests,
  //                     NTRS 19670027235 (38 g peak on water; on sand and hard clay-gravel the heat shield failed at that speed);
  //                     flight statistics NTRS 19720004141: mean normal impact 8.96 m/s, P(successful impact) = 0.98665
  //   REST    PHI^-1    no published rebound coefficient for a capsule: a declared phi choice (the same PHI^-1 as before)
  // A contact whose speed into the surface is above VMAX disintegrates the capsule (debris fades, nothing is reborn from it) and a new one
  // starts at home. At or below VMAX it bounces. If that bounce leaves it bound to the body (slower than the body's escape speed there) it
  // can never climb out by itself (the engine is off in a well), so its next touch of the same body ends the ride (stranded): no endless
  // re-hits. Surfaces: the Sun's photosphere and every body's mean radius (Jupiter .. Neptune: the 1-bar cloud tops, no surface to stand on;
  // any contact there is far above VMAX anyway), and Saturn's ring plane from the C ring's inner edge to the A ring's outer edge, the plane
  // taken from Enceladus's orbit (equatorial to 0.02 deg; its cited elements are in js/solar-system.js). Ring particles orbit at the local
  // circular speed, so there the impact speed is the capsule's whole speed relative to them (they strike every face).
  var CAPR = 1.955e-3, CAPM = 5560, VMAX = 9.1e-3, DEAD = PHI * PHI;     // unit: km, kg, km/s; phi: viewer seconds the debris shows before the new capsule
  if (O.VMAX) VMAX = O.VMAX;
  var IDS = SS.order.slice();
  function k32(k) { return 1 / (k * Math.sqrt(k)); }                  // k^-3/2 (Kepler III), sqrt form
  function len(a) { return Math.hypot(a[0], a[1], a[2]); }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function sm(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  IDS.forEach(function (id) {                                            // SOI (Laplace) and Hill radius from the cited a, e, GM
    var b = B[id], a, mu;
    if (b.kind === 'planet') { a = b.aAU * AU; mu = b.gm / GMS; } else { a = b.a; mu = b.gm / B[b.parent].gm; }
    b.soi = a * Math.pow(mu, 0.4); b.hill = a * (1 - b.e) * Math.cbrt(mu / 3); b.aKm = a;
  });
  var PLAN = IDS.filter(function (id) { return B[id].kind === 'planet'; });
  function pos(id, D) { return SS.helio(id, D); }
  function vel(id, D) { var a = pos(id, D - 3e4), b = pos(id, D + 3e4); return [(b[0] - a[0]) / 60, (b[1] - a[1]) / 60, (b[2] - a[2]) / 60]; }   // unit: km/s, central difference over a minute
  var P = { r: [0, 0, 0], v: [0, 0, 0], lane: null, hits: [], engine: 0, steps: 0, sub: 0, log: [], home: 0, pass: 0, quiet: false, wasPass: false, spells: 0, overdue: 0, hs: 0, hb: 0, pc: 0, dead: 0, bound: null, crashes: [], bounces: 0, strands: 0, rides: 1, debris: null };
  // gravity of every body (+ the engine outside the wells); out: acceleration km/s^2; also the smallest dynamical time (s)
  function acc(r, v, D, out) {
    var ax = 0, ay = 0, az = 0, tmin = Infinity, d2 = r[0] * r[0] + r[1] * r[1] + r[2] * r[2], e2 = RS * RS, s2 = Math.max(d2, e2), q = 1 / (s2 * Math.sqrt(s2));   // x^-3/2 by sqrt: IEEE-exact everywhere (Math.pow rounds differently across JIT tiers)
    ax -= GMS * r[0] * q; ay -= GMS * r[1] * q; az -= GMS * r[2] * q; tmin = Math.sqrt(d2 * Math.sqrt(d2) / GMS);
    var free = 1, wid = null;
    for (var i = 0; i < IDS.length; i++) { var b = B[IDS[i]], p = pos(IDS[i], D), dx = p[0] - r[0], dy = p[1] - r[1], dz = p[2] - r[2], dd = dx * dx + dy * dy + dz * dz;
      var s3 = Math.max(dd, b.R * b.R), k = b.gm / (s3 * Math.sqrt(s3)); ax += dx * k; ay += dy * k; az += dz * k;
      var t = Math.sqrt(dd * Math.sqrt(dd) / b.gm); if (t < tmin) tmin = t;
      var dn0 = Math.sqrt(dd), alt = dn0 - b.R - CAPR;                   // near a surface (within one radius) the step also resolves the time to reach it,
      if (alt < b.R) { var al0 = Math.max(alt, CAPR), tc = Math.sqrt(2 * al0 / (b.gm / dd)), bv = vel(IDS[i], D);   // free fall or the closing speed, so
        var vr = -((v[0] - bv[0]) * -dx + (v[1] - bv[1]) * -dy + (v[2] - bv[2]) * -dz) / dn0; if (vr > 0) tc = Math.min(tc, al0 / vr);   // a touchdown's speed is
        if (tc < tmin) tmin = tc; }                                      // the real one (floor: the capsule's own radius), not a step's overshoot
      if (b.kind === 'planet') { var dn = Math.sqrt(dd), fb = sm(Math.log(dn / b.soi) / LP); if (fb < free) { free = fb; wid = IDS[i]; } } }   // the engine fades from PHI x SOI down to the SOI edge
    var s = [0, 0, 0];
    if (free > 0 && P.lane) s = thrust(r, v, D, free);
    if (P.quiet && wid && free < 1) {                                    // the quiet spell, in a well: burn prograde (along our speed relative to the planet), the
      var u = sub(v, vel(wid, D)), ul = len(u), cq = (1 - free) * THR * GMS / d2, dw = len(sub(r, pos(wid, D)));   // low-thrust way to spiral out; same cap;
      if (ul > 0 && ul * ul < 2 * B[wid].gm / dw) for (var j = 0; j < 3; j++) s[j] += cq * u[j] / ul; }   // never brakes (cannot help a capture), and only while still bound (it never adds to a fling)
    out[0] = ax + s[0]; out[1] = ay + s[1]; out[2] = az + s[2]; P.engine = free; return tmin;
  }
  function thrust(r, v, D, free) {
    var st = laneAt(D), w0 = W0 * st.n, a = [0, 0, 0], i, rl = len(r), cap = THR * GMS / (rl * rl);   // the engine: any direction, at most THR of the Sun's pull here
    var e = sub(r, st.r), el = len(e), em = cap / (w0 * w0); if (el > em) for (i = 0; i < 3; i++) e[i] *= em / el;   // far off the lane the spring's pull is held at the cap, so the damping keeps working (no saturated wind-up)
    for (i = 0; i < 3; i++) a[i] = free * (-w0 * w0 * e[i] - 2 * ZETA * w0 * (v[i] - st.v[i]));   // the damped spring on the lane point
    var al = len(a);
    if (al > cap) for (i = 0; i < 3; i++) a[i] *= cap / al;
    return a;
  }
  // the lane: the planet's own orbit scaled by k (a similar ellipse, same shape and plane), a little inside (k < 1, faster by Kepler III) or
  // outside (k > 1, slower). Exact two-body scaling: lane(t) = k r_P(t + tau), its velocity k^-1/2 v_P(t + tau); tau closes at k^-3/2 - 1.
  function laneAt(D) {
    var L = P.lane, tau = L.tau0 + (L.hold ? 0 : (k32(L.k) - 1) * (D - L.D0) / MS), Dt = D + tau * MS, rp = pos(L.id, Dt), vp = vel(L.id, Dt), sv = 1 / Math.sqrt(L.k);
    return { r: [L.k * rp[0], L.k * rp[1], L.k * rp[2]], v: [sv * vp[0], sv * vp[1], sv * vp[2]], n: L.n * k32(L.k), tau: tau };
  }
  function pickLane(D) {                                            // the nearest planet's orbit; the side and phase that bring it to us
    var rl = len(P.r), best = null;
    PLAN.forEach(function (id) { var d = Math.abs(len(pos(id, D)) - rl); if (!best || d < best.d) best = { id: id, d: d }; });
    var id = best.id, b = B[id], rp = pos(id, D), vp = vel(id, D), rr = len(rp), side = rl < rr ? -1 : 1, k = 1 + side * LANE * b[UNIT] / rr, n = 2 * Math.PI / (b.Pyr * 365.25 * 86400);
    var u = [rp[0] / rr, rp[1] / rr, rp[2] / rr], h = [rp[1] * vp[2] - rp[2] * vp[1], rp[2] * vp[0] - rp[0] * vp[2], rp[0] * vp[1] - rp[1] * vp[0]], hl = len(h);
    var w = [(h[1] * u[2] - h[2] * u[1]) / hl, (h[2] * u[0] - h[0] * u[2]) / hl, (h[0] * u[1] - h[1] * u[0]) / hl];
    var th = Math.atan2(P.r[0] * w[0] + P.r[1] * w[1] + P.r[2] * w[2], P.r[0] * u[0] + P.r[1] * u[1] + P.r[2] * u[2]);   // + ahead of the planet
    var rate = k32(k) - 1, tau0 = th / n, T = 2 * Math.PI / n;
    if (tau0 * rate > 0) { side = -side; k = 1 + side * LANE * b[UNIT] / rr; }   // the lane only closes one way: take the side that closes from here
                                                                         // (was: go round a whole lap, up to ~50 min at Saturn - too long for ~62% home)
    P.lane = { id: id, k: k, n: n, tau0: tau0, D0: D, hold: false, side: side, u: b[UNIT] / rr };
    if (P.quiet) hold(D, true);
    return P.lane;
  }
  function hold(D, on) { var L = P.lane, tau = laneAt(D).tau; L.tau0 = tau; L.D0 = D; L.hold = on; L.k = 1 + L.side * (on ? QOFF : LANE) * L.u; }   // the quiet spell: keep station PHI^2 SOI off the planet's orbit / back to the near lane, same phase
  var SAT = B.saturn, RN = (function () { var m = B.enceladus; return [Math.sin(m.inc) * Math.sin(m.O), -Math.sin(m.inc) * Math.cos(m.O), Math.cos(m.inc)]; })();
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function contact(D, r0) {                                              // the first surface we touch this substep, or null
    if (len(P.r) < RS + CAPR) return { id: 'sun', p: [0, 0, 0], R: RS, u: [0, 0, 0] };
    for (var i = 0; i < IDS.length; i++) { var b = B[IDS[i]], p = pos(IDS[i], D); if (len(sub(P.r, p)) < b.R + CAPR) return { id: IDS[i], p: p, R: b.R, u: vel(IDS[i], D) }; }
    if (r0 && SAT.ring) {                                                // Saturn's ring plane, crossed between two substeps
      var ps = pos('saturn', D), a = sub(r0, ps), c = sub(P.r, ps), za = dot(a, RN), zc = dot(c, RN);
      if (za * zc <= 0 && za !== zc) { var f = za / (za - zc), x = [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f, a[2] + (c[2] - a[2]) * f], rho = len(x);
        if (rho >= SAT.ring[0] && rho <= SAT.ring[1]) { var vs = vel('saturn', D), vc = Math.sqrt(SAT.gm / rho), t = [RN[1] * x[2] - RN[2] * x[1], RN[2] * x[0] - RN[0] * x[2], RN[0] * x[1] - RN[1] * x[0]];
          return { id: 'ring', ring: true, p: ps, x: x, n: za > 0 ? RN : [-RN[0], -RN[1], -RN[2]], u: [vs[0] + t[0] / rho * vc, vs[1] + t[1] / rho * vc, vs[2] + t[2] / rho * vc] }; } } }
    return null;
  }
  function collide(D, r0) {                                              // out: true when the ride ended
    var c = contact(D, r0); if (!c) return false;
    var n, i; if (c.ring) n = c.n; else { n = sub(P.r, c.p); var d = len(n); n = [n[0] / d, n[1] / d, n[2] / d]; }
    var vr = sub(P.v, c.u), vn = dot(vr, n), vin = c.ring ? len(vr) : -vn;   // unit: km/s into the surface (rings: the whole speed relative to the particles)
    var hit = { id: c.id, D: D, vin: vin, E: 0.5 * CAPM * vin * vin * 1e6, vt: P.home + P.pass };   // vt: viewer seconds since load    // unit: J dispersed when it breaks (rule 15)
    P.hits.push(hit);
    if (vin > VMAX || c.id === 'sun' || P.bound === c.id) { hit.kind = vin > VMAX || c.id === 'sun' ? 'crash' : 'strand'; end(D, c, hit); return true; }
    hit.kind = 'bounce'; P.bounces++; hit.E = 0.5 * CAPM * vin * vin * (1 - REST * REST) * 1e6;
    if (vn < 0) for (i = 0; i < 3; i++) P.v[i] -= (1 + REST) * vn * n[i];
    if (c.ring) for (i = 0; i < 3; i++) P.r[i] = c.p[i] + c.x[i] + n[i] * CAPR;
    else for (i = 0; i < 3; i++) P.r[i] = c.p[i] + n[i] * (c.R + CAPR) * (1 + 1e-9);
    var gb = c.ring ? SAT : B[c.id], vv = sub(P.v, c.ring ? vel('saturn', D) : c.u);
    P.bound = dot(vv, vv) < 2 * gb.gm / len(sub(P.r, c.p)) ? c.id : null;   // bound: it cannot leave, the next touch ends the ride
    return false;
  }
  function end(D, c, hit) {                                              // the capsule breaks up (or is stranded): debris, then a new one at home
    P.dead = DEAD; P.crashes.push(hit); if (hit.kind === 'strand') P.strands++;
    P.debris = { id: c.ring ? 'saturn' : c.id, off: sub(P.r, c.p), D: D, kind: hit.kind, vin: hit.vin, t: 0, n: P.crashes.length };   // the wreck rides with the body it hit
  }
  // integrate the probe from date D0 to D1 (ms), leapfrog KDK with adaptive steps
  var a0 = [0, 0, 0], a1 = [0, 0, 0];
  function integrate(D0, D1) {
    var t = D0, n = 0, tm = acc(P.r, P.v, t, a0);
    while (t < D1 && n < CAP * 4) {
      var h = Math.min(STEP * tm, (D1 - t) / MS), i;
      var r0 = P.r.slice(); for (i = 0; i < 3; i++) { P.v[i] += a0[i] * h / 2; P.r[i] += P.v[i] * h; }
      t += h * MS; tm = acc(P.r, P.v, t, a1);
      for (i = 0; i < 3; i++) { P.v[i] += a1[i] * h / 2; a0[i] = a1[i]; }
      n++; if (collide(t, r0)) break;
    }
    P.steps += n; P.sub = n; return t;
  }
  // the clock: soft-min over every planet and moon of its local dynamical time sqrt(d^3/GM) per model second, against home (PHI^34);
  // far from every body it is the home clock, close in one local dynamical time per model second (no blend weights, so no jumps)
  function rateAt(r, D) {
    var T0 = SS.TIME, q = 0;
    for (var i = 0; i < IDS.length; i++) { var b = B[IDS[i]], p = pos(IDS[i], D), dx = p[0] - r[0], dy = p[1] - r[1], dz = p[2] - r[2], dd = dx * dx + dy * dy + dz * dz;
      var t = Math.sqrt(dd * Math.sqrt(dd) / b.gm) * Math.pow(PHI, TPH); q += (T0 / t) * (T0 / t); }
    return 1 / Math.sqrt(1 + q);
  }
  // the view: the chain of wells (a planet, then one of its moons), each with a target weight from depth; the lens eases toward it
  // (rule 6: no jumps): in quickly (PHI^-2 s, the grab), out slowly (PHI^0 s), so a loop poking out of a sphere of influence does not
  // throw the view home and back
  var V = { D: NaN }, WE = {}, lastD = NaN;
  function targets(D) {
    var T = {}, bestP = null;
    PLAN.forEach(function (id) { var p = pos(id, D), d = len(sub(P.r, p)); if (d < B[id].soi && (!bestP || d / B[id].soi < bestP.x)) bestP = { id: id, d: d, x: d / B[id].soi }; });
    if (bestP) { T[bestP.id] = sm(Math.log(1 / bestP.x) / BAND);
      B[bestP.id].moons.forEach(function (id) { var d = len(sub(P.r, pos(id, D))); if (d < B[id].soi) T[id] = Math.max(T[id] || 0, sm(Math.log(B[id].soi / d) / BAND)); }); }
    return T;
  }
  function ease(dtm) {                                                   // dtm: model seconds since the last ease
    var T = targets(SS.date()), k;
    for (k in T) if (!(k in WE)) WE[k] = 0;
    for (k in WE) { var tg = T[k] || 0, tau = tg > WE[k] ? IP * IP : 1; WE[k] += (tg - WE[k]) * (1 - Math.exp(-dtm / tau)); if (!T[k] && WE[k] < 1e-4) delete WE[k]; }
  }
  function view(F0, D) {
    if (V.D === D && V.W === F0.W && V.H === F0.H) return V;
    var S = Math.min(F0.W, F0.H) / 2, A = [F0.W / 2, F0.H / 2], k0 = F0.kmPerPx;
    var L = Math.log(k0), ax = F0.x, ay = F0.y, c = [0, 0, 0], chain = [], w = 0;
    var lv = Object.keys(WE).sort(function (a, b) { return (B[a].kind === 'moon') - (B[b].kind === 'moon'); });
    var top = lv.filter(function (id) { return B[id].kind === 'planet'; }).sort(function (a, b) { return WE[b] - WE[a]; })[0];
    lv = lv.filter(function (id) { return id === top || (B[id].kind === 'moon' && B[id].parent === top); });
    var mo = lv.filter(function (id) { return B[id].kind === 'moon'; }).sort(function (a, b) { return WE[b] - WE[a]; })[0];
    lv = lv.filter(function (id) { return B[id].kind === 'planet' || id === mo; });
    lv.forEach(function (id) {
      var p = pos(id, D), d = len(sub(P.r, p)), wl = WE[id], k = Math.exp(L);
      var sx = ax + (p[0] - c[0]) / k, sy = ay - (p[1] - c[1]) / k;     // the body's screen place in the view so far
      L = L + (Math.log(Math.max(d, B[id].R) * PHI / S) - L) * wl; ax = sx + (A[0] - sx) * wl; ay = sy + (A[1] - sy) * wl; c = p;
      chain.push({ id: id, d: d, soi: B[id].soi, w: wl }); w = Math.max(w, wl);
    });
    V = { D: D, W: F0.W, H: F0.H, kpp: Math.exp(L), x: ax, y: ay, c: c, rate: rateAt(P.r, D), chain: chain, w: w, rung: Math.log(k0 / Math.exp(L)) / LP, S: S };
    return V;
  }
  function frame(F0) { var v = view(F0, F0.D); var F = {}; for (var k in F0) F[k] = F0[k]; F.x = v.x; F.y = v.y; F.kmPerPx = v.kpp; F.cx = v.c[0]; F.cy = v.c[1]; F.zoom = v; return F; }
  var adv = SS.advance;
  function advance(dt) {                                                 // the one clock: home rate x the well's time factor; the probe integrates the same span
    if (P.dead > 0) return wreck(dt);
    var D0 = SS.date(), f = rateAt(P.r, D0);
    adv(dt * f); var D1 = SS.date(), t = integrate(D0, D1);
    if (t < D1 && !(P.dead > 0)) { adv(-(D1 - t) / MS / SS.TIME); }                       // ran out of substeps: the clock waits for the physics
    ease(dt * f > 0 ? dt : 0); var v = view(SS.baseFrame(), SS.date()), inW = Object.keys(targets(SS.date())).length > 0;
    if (!P.lane || (!inW && P.lastIn) || (!inW && !P.lane.hold && laneAt(t).tau * (k32(P.lane.k) - 1) > 0)) pickLane(t);   // after each pass (or a full lap) re-aim at the nearest lane
    var wl = 0; for (var id in WE) wl = Math.max(wl, WE[id]);
    if (wl < HOMEW) { P.home += dt; P.hs += dt; P.pc = 0; } else { if (!P.wasPass) { P.hb = P.hs; P.hs = 0; } P.pass += dt; P.pc += dt; }   // unit: viewer seconds
    if (wl < HOMEW && P.wasPass && !P.quiet) { P.quiet = true; P.spells++; hold(t, true); }           // a pass just ended (the lens is home): keep station
    if (wl >= HOMEW && !P.quiet && P.home < QUIET * P.pass && P.pc > P.hb / QUIET) { P.quiet = true; P.spells++; P.overdue++; hold(t, true); }   // a capture
      // that outlasts the home time before it (/ QUIET, the same ratio) while home is behind: the quiet spell starts in the well (prograde climb)
    if (P.quiet && P.home >= QUIET * P.pass) { P.quiet = false; pickLane(t); }                        // home has caught up: close again from where we are (the side that closes from here)
    if (!inW) P.bound = null; P.wasPass = wl >= HOMEW;
    P.lastIn = inW; return SS.clock();
  }
  function wreck(dt) {                                                   // the debris shows for DEAD viewer seconds, riding with the body; then home
    var f = rateAt(P.r, SS.date()); adv(dt * f);
    var W = P.debris, p = W.id === 'sun' ? [0, 0, 0] : pos(W.id, SS.date()); W.t += dt;
    for (var i = 0; i < 3; i++) P.r[i] = p[i] + W.off[i];
    ease(dt); view(SS.baseFrame(), SS.date());
    var wl = 0; for (var id in WE) wl = Math.max(wl, WE[id]); if (wl < HOMEW) P.home += dt; else P.pass += dt;
    P.dead -= dt; if (P.dead <= 0) { P.dead = 0; P.rides++; P.bound = null; spawn(); }
    return SS.clock();
  }
  var S0 = { id: 'saturn', gap: 22 };
  function spawn() {                                                     // a new capsule on the start's lane and gap; the counters carry on
    var D = SS.date(), b = B[S0.id], rr = len(pos(S0.id, D)), k = 1 - LANE * b[UNIT] / rr, n = 2 * Math.PI / (b.Pyr * 365.25 * 86400);
    P.lane = { id: S0.id, k: k, n: n, tau0: -(k32(k) - 1) * S0.gap * SS.TIME, D0: D, hold: false, side: -1, u: b[UNIT] / rr }; P.quiet = false;
    var st = laneAt(D); P.r = st.r; P.v = st.v; V.D = NaN; P.wasPass = true;   // the lens eases home from the wreck (WE fades: no jump, rule 6); the wreck counts as a pass's end
  }
  SS.advance = advance;
  // the start: on the lane of the planet chosen (solar-model starts the Saturn lane), PHI^5 home seconds before it reaches us
  function start(id, gapS) {
    var D = SS.date(), b = B[id], rr = len(pos(id, D)), k = 1 - LANE * b[UNIT] / rr, n = 2 * Math.PI / (b.Pyr * 365.25 * 86400);
    S0 = { id: id, gap: gapS }; P.lane = { id: id, k: k, n: n, tau0: -(k32(k) - 1) * gapS * SS.TIME, D0: D, hold: false, side: -1, u: b[UNIT] / rr };
    P.home = 0; P.pass = 0; P.quiet = false; P.wasPass = false; P.spells = 0; P.overdue = 0; P.hs = 0; P.hb = 0; P.pc = 0; P.dead = 0; P.bound = null; P.crashes = []; P.bounces = 0; P.strands = 0; P.rides = 1; P.debris = null;
    var st = laneAt(D); P.r = st.r; P.v = st.v; P.hits = []; P.steps = 0; V.D = NaN; WE = {};
  }
  root.ZoomCam = { on: false, probe: P, start: function (id, g) { start(id, g); root.ZoomCam.on = true; }, frame: frame, view: function () { return view(SS.baseFrame(), SS.date()); }, lane: function () { return P.lane; },
    screen: function () { var F = SS.frame(); return { x: F.x + (P.r[0] - F.cx) / F.kmPerPx, y: F.y - (P.r[1] - F.cy) / F.kmPerPx }; },
    consts: { QUIET: QUIET, QOFF: QOFF, CAPR: CAPR, CAPM: CAPM, VMAX: VMAX, DEAD: DEAD, STEP: STEP, CAP: CAP, LANE: LANE, W0: W0, ZETA: ZETA, REST: REST, THR: THR } };
})(typeof window !== 'undefined' ? window : globalThis);
