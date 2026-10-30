/* Zoom camera (stage 1): the view is a viewing capsule (Apollo CM) flown through the real gravity of js/solar-system.js, with a quiet spell
   after each pass (about 62% home). Design, citations and the phi choices: docs/zoom-camera.md. Loaded late by js/solar-model.js. */
(function (root) {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, LP = Math.log(PHI), MS = 1e3;
  var SS = root.SolarSystem; if (!SS) return;
  var B = SS.bodies, GMS = SS.GMS, RS = SS.sunRadius, AU = SS.AU;
  var STEP = Math.pow(IP, 6), CAP = Math.round(Math.pow(PHI, 10)), BAND = 3 * LP;
  var LANE = IP * IP, W0 = PHI * PHI, ZETA = IP, REST = IP, THR = IP * IP;
  var QUIET = PHI, QOFF = PHI * PHI, HOMEW = Math.pow(IP, 6);
  var CAPR = 1.955e-3, VMAX = 9.1e-3, DEAD = PHI * PHI;
  var IDS = SS.order.slice();
  function k32(k) { return 1 / (k * Math.sqrt(k)); }
  function len(a) { return Math.hypot(a[0], a[1], a[2]); }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function sm(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  IDS.forEach(function (id) {
    var b = B[id], a, mu;
    if (b.kind === 'planet') { a = b.aAU * AU; mu = b.gm / GMS; } else { a = b.a; mu = b.gm / B[b.parent].gm; }
    b.soi = a * Math.pow(mu, 0.4); b.hill = a * (1 - b.e) * Math.cbrt(mu / 3); b.aKm = a;
  });
  var PLAN = IDS.filter(function (id) { return B[id].kind === 'planet'; });
  function pos(id, D) { return SS.helio(id, D); }
  function vel(id, D) { var a = pos(id, D - 3e4), b = pos(id, D + 3e4); return [(b[0] - a[0]) / 60, (b[1] - a[1]) / 60, (b[2] - a[2]) / 60]; }
  var P = { r: [0, 0, 0], v: [0, 0, 0], lane: null, hits: [], sub: 0, home: 0, pass: 0, quiet: false, wasPass: false, hs: 0, hb: 0, pc: 0, dead: 0, bound: null, crashes: [], bounces: 0, debris: null };
  function acc(r, v, D, out) {
    var ax = 0, ay = 0, az = 0, tmin = Infinity, d2 = r[0] * r[0] + r[1] * r[1] + r[2] * r[2], e2 = RS * RS, s2 = Math.max(d2, e2), q = 1 / (s2 * Math.sqrt(s2));
    ax -= GMS * r[0] * q; ay -= GMS * r[1] * q; az -= GMS * r[2] * q; tmin = Math.sqrt(d2 * Math.sqrt(d2) / GMS);
    var free = 1, wid = null;
    for (var i = 0; i < IDS.length; i++) { var b = B[IDS[i]], p = pos(IDS[i], D), dx = p[0] - r[0], dy = p[1] - r[1], dz = p[2] - r[2], dd = dx * dx + dy * dy + dz * dz;
      var s3 = Math.max(dd, b.R * b.R), k = b.gm / (s3 * Math.sqrt(s3)); ax += dx * k; ay += dy * k; az += dz * k;
      var t = Math.sqrt(dd * Math.sqrt(dd) / b.gm); if (t < tmin) tmin = t;
      var dn0 = Math.sqrt(dd), alt = dn0 - b.R - CAPR;
      if (alt < b.R) { var al0 = Math.max(alt, CAPR), tc = Math.sqrt(2 * al0 / (b.gm / dd)), bv = vel(IDS[i], D);
        var vr = -((v[0] - bv[0]) * -dx + (v[1] - bv[1]) * -dy + (v[2] - bv[2]) * -dz) / dn0; if (vr > 0) tc = Math.min(tc, al0 / vr);
        if (tc < tmin) tmin = tc; }
      if (b.kind === 'planet') { var dn = Math.sqrt(dd), fb = sm(Math.log(dn / b.soi) / LP); if (fb < free) { free = fb; wid = IDS[i]; } } }
    var s = [0, 0, 0];
    if (free > 0 && P.lane) s = thrust(r, v, D, free);
    if (P.quiet && wid && free < 1) {
      var u = sub(v, vel(wid, D)), ul = len(u), cq = (1 - free) * THR * GMS / d2, dw = len(sub(r, pos(wid, D)));
      if (ul > 0 && ul * ul < 2 * B[wid].gm / dw) for (var j = 0; j < 3; j++) s[j] += cq * u[j] / ul; }
    out[0] = ax + s[0]; out[1] = ay + s[1]; out[2] = az + s[2]; return tmin;
  }
  function thrust(r, v, D, free) {
    var st = laneAt(D), w0 = W0 * st.n, a = [0, 0, 0], i, rl = len(r), cap = THR * GMS / (rl * rl);
    var e = sub(r, st.r), el = len(e), em = cap / (w0 * w0); if (el > em) for (i = 0; i < 3; i++) e[i] *= em / el;
    for (i = 0; i < 3; i++) a[i] = free * (-w0 * w0 * e[i] - 2 * ZETA * w0 * (v[i] - st.v[i]));
    var al = len(a);
    if (al > cap) for (i = 0; i < 3; i++) a[i] *= cap / al;
    return a;
  }
  function laneAt(D) {
    var L = P.lane, tau = L.tau0 + (L.hold ? 0 : (k32(L.k) - 1) * (D - L.D0) / MS), Dt = D + tau * MS, rp = pos(L.id, Dt), vp = vel(L.id, Dt), sv = 1 / Math.sqrt(L.k);
    return { r: [L.k * rp[0], L.k * rp[1], L.k * rp[2]], v: [sv * vp[0], sv * vp[1], sv * vp[2]], n: L.n * k32(L.k), tau: tau };
  }
  function pickLane(D) {
    var rl = len(P.r), best = null;
    PLAN.forEach(function (id) { var d = Math.abs(len(pos(id, D)) - rl); if (!best || d < best.d) best = { id: id, d: d }; });
    var id = best.id, b = B[id], rp = pos(id, D), vp = vel(id, D), rr = len(rp), side = rl < rr ? -1 : 1, k = 1 + side * LANE * b.soi / rr, n = 2 * Math.PI / (b.Pyr * 365.25 * 86400);
    var u = [rp[0] / rr, rp[1] / rr, rp[2] / rr], h = [rp[1] * vp[2] - rp[2] * vp[1], rp[2] * vp[0] - rp[0] * vp[2], rp[0] * vp[1] - rp[1] * vp[0]], hl = len(h);
    var w = [(h[1] * u[2] - h[2] * u[1]) / hl, (h[2] * u[0] - h[0] * u[2]) / hl, (h[0] * u[1] - h[1] * u[0]) / hl];
    var th = Math.atan2(P.r[0] * w[0] + P.r[1] * w[1] + P.r[2] * w[2], P.r[0] * u[0] + P.r[1] * u[1] + P.r[2] * u[2]);
    var rate = k32(k) - 1, tau0 = th / n, T = 2 * Math.PI / n;
    if (tau0 * rate > 0) { side = -side; k = 1 + side * LANE * b.soi / rr; }
    P.lane = { id: id, k: k, n: n, tau0: tau0, D0: D, hold: false, side: side, u: b.soi / rr };
    if (P.quiet) hold(D, true);
    return P.lane;
  }
  function hold(D, on) { var L = P.lane, tau = laneAt(D).tau; L.tau0 = tau; L.D0 = D; L.hold = on; L.k = 1 + L.side * (on ? QOFF : LANE) * L.u; }
  var SAT = B.saturn, RN = (function () { var m = B.enceladus; return [Math.sin(m.inc) * Math.sin(m.O), -Math.sin(m.inc) * Math.cos(m.O), Math.cos(m.inc)]; })();
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function contact(D, r0) {
    if (len(P.r) < RS + CAPR) return { id: 'sun', p: [0, 0, 0], R: RS, u: [0, 0, 0] };
    for (var i = 0; i < IDS.length; i++) { var b = B[IDS[i]], p = pos(IDS[i], D); if (len(sub(P.r, p)) < b.R + CAPR) return { id: IDS[i], p: p, R: b.R, u: vel(IDS[i], D) }; }
    if (r0 && SAT.ring) {
      var ps = pos('saturn', D), a = sub(r0, ps), c = sub(P.r, ps), za = dot(a, RN), zc = dot(c, RN);
      if (za * zc <= 0 && za !== zc) { var f = za / (za - zc), x = [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f, a[2] + (c[2] - a[2]) * f], rho = len(x);
        if (rho >= SAT.ring[0] && rho <= SAT.ring[1]) { var vs = vel('saturn', D), vc = Math.sqrt(SAT.gm / rho), t = [RN[1] * x[2] - RN[2] * x[1], RN[2] * x[0] - RN[0] * x[2], RN[0] * x[1] - RN[1] * x[0]];
          return { id: 'ring', ring: true, p: ps, x: x, n: za > 0 ? RN : [-RN[0], -RN[1], -RN[2]], u: [vs[0] + t[0] / rho * vc, vs[1] + t[1] / rho * vc, vs[2] + t[2] / rho * vc] }; } } }
    return null;
  }
  function collide(D, r0) {
    var c = contact(D, r0); if (!c) return false;
    var n, i; if (c.ring) n = c.n; else { n = sub(P.r, c.p); var d = len(n); n = [n[0] / d, n[1] / d, n[2] / d]; }
    var vr = sub(P.v, c.u), vn = dot(vr, n), vin = c.ring ? len(vr) : -vn;
    var hit = { id: c.id, D: D, vin: vin, vt: P.home + P.pass };
    P.hits.push(hit);
    if (vin > VMAX || c.id === 'sun' || P.bound === c.id) { hit.kind = vin > VMAX || c.id === 'sun' ? 'crash' : 'strand'; end(D, c, hit); return true; }
    hit.kind = 'bounce'; P.bounces++;
    if (vn < 0) for (i = 0; i < 3; i++) P.v[i] -= (1 + REST) * vn * n[i];
    if (c.ring) for (i = 0; i < 3; i++) P.r[i] = c.p[i] + c.x[i] + n[i] * CAPR;
    else for (i = 0; i < 3; i++) P.r[i] = c.p[i] + n[i] * (c.R + CAPR) * (1 + 1e-9);
    var gb = c.ring ? SAT : B[c.id], vv = sub(P.v, c.ring ? vel('saturn', D) : c.u);
    P.bound = dot(vv, vv) < 2 * gb.gm / len(sub(P.r, c.p)) ? c.id : null;
    return false;
  }
  function end(D, c, hit) {
    P.dead = DEAD; P.crashes.push(hit);
    P.debris = { id: c.ring ? 'saturn' : c.id, off: sub(P.r, c.p), D: D, kind: hit.kind, vin: hit.vin, t: 0 };
  }
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
    P.sub = n; return t;
  }
  function rateAt(r, D) {
    var T0 = SS.TIME, q = 0;
    for (var i = 0; i < IDS.length; i++) { var b = B[IDS[i]], p = pos(IDS[i], D), dx = p[0] - r[0], dy = p[1] - r[1], dz = p[2] - r[2], dd = dx * dx + dy * dy + dz * dz;
      var t = Math.sqrt(dd * Math.sqrt(dd) / b.gm); q += (T0 / t) * (T0 / t); }
    return 1 / Math.sqrt(1 + q);
  }
  var V = { D: NaN }, WE = {}, lastD = NaN;
  function targets(D) {
    var T = {}, bestP = null;
    PLAN.forEach(function (id) { var p = pos(id, D), d = len(sub(P.r, p)); if (d < B[id].soi && (!bestP || d / B[id].soi < bestP.x)) bestP = { id: id, d: d, x: d / B[id].soi }; });
    if (bestP) { T[bestP.id] = sm(Math.log(1 / bestP.x) / BAND);
      B[bestP.id].moons.forEach(function (id) { var d = len(sub(P.r, pos(id, D))); if (d < B[id].soi) T[id] = Math.max(T[id] || 0, sm(Math.log(B[id].soi / d) / BAND)); }); }
    return T;
  }
  function ease(dtm) {
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
      var sx = ax + (p[0] - c[0]) / k, sy = ay - (p[1] - c[1]) / k;
      L = L + (Math.log(Math.max(d, B[id].R) * PHI / S) - L) * wl; ax = sx + (A[0] - sx) * wl; ay = sy + (A[1] - sy) * wl; c = p;
      chain.push({ id: id, d: d, soi: B[id].soi, w: wl }); w = Math.max(w, wl);
    });
    V = { D: D, W: F0.W, H: F0.H, kpp: Math.exp(L), x: ax, y: ay, c: c, rate: rateAt(P.r, D), chain: chain, w: w, rung: Math.log(k0 / Math.exp(L)) / LP, S: S };
    return V;
  }
  function frame(F0) { var v = view(F0, F0.D); var F = {}; for (var k in F0) F[k] = F0[k]; F.x = v.x; F.y = v.y; F.kmPerPx = v.kpp; F.cx = v.c[0]; F.cy = v.c[1]; F.zoom = v; return F; }
  var adv = SS.advance;
  function advance(dt) {
    if (P.dead > 0) return wreck(dt);
    var D0 = SS.date(), f = rateAt(P.r, D0);
    adv(dt * f); var D1 = SS.date(), t = integrate(D0, D1);
    if (t < D1 && !(P.dead > 0)) { adv(-(D1 - t) / MS / SS.TIME); }
    ease(dt * f > 0 ? dt : 0); var v = view(SS.baseFrame(), SS.date()), inW = Object.keys(targets(SS.date())).length > 0;
    if (!P.lane || (!inW && P.lastIn) || (!inW && !P.lane.hold && laneAt(t).tau * (k32(P.lane.k) - 1) > 0)) pickLane(t);
    var wl = 0; for (var id in WE) wl = Math.max(wl, WE[id]);
    if (wl < HOMEW) { P.home += dt; P.hs += dt; P.pc = 0; } else { if (!P.wasPass) { P.hb = P.hs; P.hs = 0; } P.pass += dt; P.pc += dt; }
    if (wl < HOMEW && P.wasPass && !P.quiet) { P.quiet = true; hold(t, true); }
    if (wl >= HOMEW && !P.quiet && P.home < QUIET * P.pass && P.pc > P.hb / QUIET) { P.quiet = true; hold(t, true); }
    if (P.quiet && P.home >= QUIET * P.pass) { P.quiet = false; pickLane(t); }
    if (!inW) P.bound = null; P.wasPass = wl >= HOMEW;
    P.lastIn = inW; return SS.clock();
  }
  function wreck(dt) {
    var f = rateAt(P.r, SS.date()); adv(dt * f);
    var W = P.debris, p = W.id === 'sun' ? [0, 0, 0] : pos(W.id, SS.date()); W.t += dt;
    for (var i = 0; i < 3; i++) P.r[i] = p[i] + W.off[i];
    ease(dt); view(SS.baseFrame(), SS.date());
    var wl = 0; for (var id in WE) wl = Math.max(wl, WE[id]); if (wl < HOMEW) P.home += dt; else P.pass += dt;
    P.dead -= dt; if (P.dead <= 0) { P.dead = 0; P.bound = null; spawn(); }
    return SS.clock();
  }
  var S0 = { id: 'saturn', gap: 22 };
  function spawn() {
    var D = SS.date(), b = B[S0.id], rr = len(pos(S0.id, D)), k = 1 - LANE * b.soi / rr, n = 2 * Math.PI / (b.Pyr * 365.25 * 86400);
    P.lane = { id: S0.id, k: k, n: n, tau0: -(k32(k) - 1) * S0.gap * SS.TIME, D0: D, hold: false, side: -1, u: b.soi / rr }; P.quiet = false;
    var st = laneAt(D); P.r = st.r; P.v = st.v; V.D = NaN; P.wasPass = true;
  }
  SS.advance = advance;
  function start(id, gapS) {
    var D = SS.date(), b = B[id], rr = len(pos(id, D)), k = 1 - LANE * b.soi / rr, n = 2 * Math.PI / (b.Pyr * 365.25 * 86400);
    S0 = { id: id, gap: gapS }; P.lane = { id: id, k: k, n: n, tau0: -(k32(k) - 1) * gapS * SS.TIME, D0: D, hold: false, side: -1, u: b.soi / rr };
    P.home = 0; P.pass = 0; P.quiet = false; P.wasPass = false; P.hs = 0; P.hb = 0; P.pc = 0; P.dead = 0; P.bound = null; P.crashes = []; P.bounces = 0; P.debris = null;
    var st = laneAt(D); P.r = st.r; P.v = st.v; P.hits = []; V.D = NaN; WE = {};
  }
  root.ZoomCam = { on: false, probe: P, start: function (id, g) { start(id, g); root.ZoomCam.on = true; }, frame: frame, view: function () { return view(SS.baseFrame(), SS.date()); }, lane: function () { return P.lane; }, };
})(typeof window !== 'undefined' ? window : globalThis);
