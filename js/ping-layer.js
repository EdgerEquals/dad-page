/* PING LAYER, first cut (Danny 12:07-12:16 / 13:04 AWST 26 Oct 2026). Tier 2. Middle layer (behind the content, like the scene).
     BIG EARTH  one big faint Earth, stationary, its face turning (Americas / Africa-Europe / Asia-Australia crossfade) once per
                sidereal day scaled onto the phi ladder (cite: NASA Earth fact sheet, sidereal rotation 23.9345 h), tilted by the
                obliquity (cite: Astronomical Almanac, 23.4397 deg).
     MOON GROUP top left, the mirror of the Sun anchor (x = PHI^-k, y = PHI^-k): tonight's real phase from the synodic month
                (cite: 29.530588861 d, new moon 2000-01-06 18:14 UTC), drawn as seen from Perth (southern sky, so mirrored).
                A satellite (ISS period, cite 5577.6 s) and an astronaut (Himawari period, cite 86163.7 s), each scaled onto its own
                phi rung, orbit it and pass behind (smaller, dimmer, under the Moon) and in front. They ping only in front and near
                their largest. A small Earth beside it shows the face under the Moon: sub-lunar longitude = Moon RA - GMST
                (cite: USNO GMST; Astronomical Almanac low-precision Moon), exposed raw as PingLayer.info().subLunarLon.
     SCOPE/DISH telescope bottom left and dish bottom right (phi positions above the footer), both aimed at the big Earth.
     PING CHAIN telescope -> Earth -> dish -> Moon group (-> satellite / astronaut if in front at peak), pulses on the emoji themselves
                (scale + opacity), routed only through members on screen. Hop delays: phi rungs, the dish -> Moon hop is the real
                Earth-Moon light time (cite: NASA mean distance 384,400 km / c 299,792.458 km/s = 1.282 s). The chain repeats every
                PHI^r s (sandbox dial 'pings', default rung 6), scaled by a 5-pump node under the page pump (PhiPumps) when loaded.
   Transforms + opacity only, one capped rAF loop (two orbiters), paused while hidden. Reduced motion: still, no pulses. */
(function () {
  'use strict';
  var doc = document, root = window;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, TAU = 2 * Math.PI, DEG = TAU / 360;   // phi; unit: a turn, a degree
  var MS = 1e3, PCT = 100, HOUR = 3600, DAY = 86400;                                      // unit: ms/s, percent, s/h, s/day
  var RM = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SUN = root.PhiSun || { k: 4, x: 1 - Math.pow(IP, 4), y: Math.pow(IP, 4) };          // phi: same rung as rule 13
  var SID = 23.9345 * HOUR;                         // cite: NASA Earth fact sheet, sidereal rotation period 23.9345 h
  var SYN = 29.530588861 * DAY;                     // cite: synodic month 29.530588861 d (orbit-ref-data)
  var NEWMOON = Date.UTC(2000, 0, 6, 18, 14);       // cite: reference new moon 2000-01-06 18:14 UTC (same epoch as ratio-pump)
  var ISS = 5577.6, HIMA = 86163.7;                 // cite: orbit-ref-data, ISS period 5577.6 s, Himawari geostationary 86163.7 s
  var LIGHT = 384400 / 299792.458;                  // cite: NASA mean Earth-Moon distance 384,400 km / SI c 299,792.458 km/s
  var OBL = 23.4397 * DEG;                          // cite: Astronomical Almanac, obliquity of the ecliptic 23.4397 deg
  var J2000 = Date.UTC(2000, 0, 1, 12);             // cite: J2000.0 epoch, 2000-01-01 12:00 TT (UTC within a minute)
  var SOUTH = true;                                  // anchor: the page's place is Perth (latitude -31.95), southern sky
  function rung(T, lo) { var n = Math.floor(Math.log(T) / Math.log(PHI)); return T * Math.pow(PHI, lo - n); }   // phi: T onto [PHI^lo, PHI^(lo+1))
  function fr(x) { return x - Math.floor(x); }
  function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function dial(id, def) { try { var d = JSON.parse(localStorage.getItem('dadSceneDials.v1') || '{}'); return d[id] != null ? +d[id] : def; } catch (e) { return def; } }

  // ---------- sky maths ----------
  function moonAge(now) { return ((now - NEWMOON) / MS % SYN + SYN) % SYN; }
  function subLunar(now) {                           // degrees east, -180..180
    var d = (now - J2000) / MS / DAY;
    var L = (218.316 + 13.176396 * d) * DEG, M = (134.963 + 13.064993 * d) * DEG, F = (93.272 + 13.229350 * d) * DEG;   // cite: Astronomical Almanac low-precision Moon
    var lam = L + 6.289 * DEG * Math.sin(M), bet = 5.128 * DEG * Math.sin(F);                                         // cite: Astronomical Almanac low-precision Moon
    var ra = Math.atan2(Math.sin(lam) * Math.cos(OBL) - Math.tan(bet) * Math.sin(OBL), Math.cos(lam));
    var gmst = (18.697375 + 24.065709824279 * d) * (TAU / 24);                                                         // cite: USNO GMST (hours since J2000, 24 h a turn)
    return wrap(ra - gmst) / DEG;
  }
  // three Earth faces, centres a third of a turn apart: Americas, Africa-Europe, Asia-Australia
  var FACE = ['\uD83C\uDF0E', '\uD83C\uDF0D', '\uD83C\uDF0F'], FC = [-TAU / 3 + TAU / 18, TAU / 18, TAU / 3 + TAU / 18];   // anchor: glyph faces (about -100, 20, 140 deg east)
  function faceW(lon) { var w = FC.map(function (c) { return Math.max(0, Math.cos(wrap(lon - c) * 3 / 4)); }), s = w[0] + w[1] + w[2] || 1; return w.map(function (v) { return v / s; }); }   // unit: zero a third of a turn away

  // ---------- DOM ----------
  var css = '.pl-layer{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;overflow:clip;contain:strict}' +
    '.pl-n{position:absolute;left:0;top:0;line-height:1;will-change:transform,opacity}' +
    '.pl-f{position:absolute;left:0;top:0;transition:opacity var(--fx) ease-in-out}' +
    '.pl-p{display:block}.pl-scope,.pl-dish{transition:opacity var(--fx) ease-in-out}';
  var st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);
  var Lr = doc.createElement('div'); Lr.className = 'pl-layer'; Lr.setAttribute('aria-hidden', 'true');
  function node(txt, cls) { var o = doc.createElement('span'), p = doc.createElement('span'); o.className = 'pl-n ' + (cls || ''); p.className = 'pl-p'; p.textContent = txt; o.appendChild(p); Lr.appendChild(o); return { o: o, p: p }; }
  function faces(cls) { var o = doc.createElement('span'); o.className = 'pl-n ' + cls; var p = doc.createElement('span'); p.className = 'pl-p'; p.style.position = 'relative';
    var f = FACE.map(function (g, i) { var e = doc.createElement('span'); e.className = 'pl-f'; e.textContent = g; if (!i) e.style.position = 'relative'; p.appendChild(e); return e; });
    o.appendChild(p); Lr.appendChild(o); return { o: o, p: p, f: f }; }
  var FX = Math.pow(PHI, 3);                                               // phi: face crossfade PHI^3 s
  Lr.style.setProperty('--fx', FX + 's');
  var big = faces('pl-big'), small = faces('pl-small');
  var PH = ['\uD83C\uDF11', '\uD83C\uDF12', '\uD83C\uDF13', '\uD83C\uDF14', '\uD83C\uDF15', '\uD83C\uDF16', '\uD83C\uDF17', '\uD83C\uDF18'];
  var moon = node(PH[0], 'pl-moon'), sat = node('\uD83D\uDEF0\uFE0F', 'pl-sat'), ast = node('\uD83E\uDDD1\u200D\uD83D\uDE80', 'pl-ast');
  var scope = node('\uD83D\uDD2D', 'pl-scope'), dish = node('\uD83D\uDCE1', 'pl-dish');

  var OP = Math.pow(IP, 2), OPB = Math.pow(IP, 4), PEAK = 1 - Math.pow(IP, 3);   // phi: node 0.382, big Earth 0.146, pulse peak 0.764
  var OPA = 1 - Math.pow(IP, 3);                                            // phi: telescope + dish one rung up, 0.764 (pumped)
  var G = {}, ORB = [
    { n: sat, T: rung(ISS, 3), ph: fr(IP), s: IP },                       // phi: satellite on rung 3 (4.2..6.9 s)
    { n: ast, T: rung(HIMA, 4), ph: fr(2 * IP), s: Math.pow(IP, 1 / 2) }];  // phi: astronaut on rung 4 (6.9..11.1 s)
  function measure() {
    var W = innerWidth, H = innerHeight, m = Math.min(W, H), ft = doc.querySelector('.foot'), fy = ft ? ft.getBoundingClientRect().top : H;
    G.fs = m * Math.pow(IP, 11 / 2);                                       // phi: node size PHI^-5.5 of the short side
    G.mx = W * Math.pow(IP, SUN.k); G.my = H * SUN.y;                      // rule 13 mirror: top left at PHI^-k
    G.ex = W / 2; G.ey = H * IP; G.bfs = m * Math.pow(IP, 2);              // phi: big Earth at the golden height, PHI^-2 of the short side
    G.rx = G.fs * PHI; G.ry = G.rx * Math.pow(IP, 2);                      // phi: orbit around the Moon
    var low = fy - G.fs * PHI;                                             // phi: one node-size x PHI above the footer
    G.sx = W * Math.pow(IP, 5); G.sy = low; G.dx = W * (1 - Math.pow(IP, 5)); G.dy = low;   // phi: near the bottom corners
    put(big, G.ex, G.ey, G.bfs, -OBL, opAim());                         // pingop (Danny 14:41): Earth + Moon group on the 1-PHI^-3 rung too
    put(moon, G.mx, G.my, G.fs, 0, opAim(), SOUTH);
    put(small, G.mx + G.fs * PHI, G.my + G.fs * IP, G.fs * IP, 0, opAim());
    put(scope, G.sx, G.sy, G.fs, 0, opAim()); put(dish, G.dx, G.dy, G.fs, 0, opAim());
    point();
  }
  // pingaim (Danny 14:04 AWST 26 Oct): both instruments point at the big Earth, angle read live from the laid-out boxes,
  // corrected for the glyph's own artwork direction; mirrored when that keeps the turn smaller (stays upright).
  var NATIVE = { scope: -TAU * 3 / 8, dish: -TAU / 8 };                   // anchor: Apple + Google artwork, telescope tube up-left, dish feed up-right
  function mid(e) { var r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
  function aimOne(n, a0) {
    var e = mid(big.o), t = Math.atan2(e[1] - n.y, e[0] - n.x);
    var r = wrap(t - a0), rf = wrap(t - (Math.PI - a0)), f = Math.abs(rf) < Math.abs(r);   // unit: half a turn mirrors the artwork
    put(n, n.x, n.y, G.fs, f ? rf : r, n.op, f);
  }
  function point() { aimOne(scope, NATIVE.scope); aimOne(dish, NATIVE.dish); }
  var apump = null;
  function opAim() { var P = root.PhiPumps; if (P && !apump) apump = P.node('pingaim', 3, 4, Math.pow(IP, 4), P.page, 3);   // phi: 3 pumps, rungs 4.., depth PHI^-4
    var k = 1; try { k = apump ? apump.out() : 1; } catch (e) {} return Math.min(1, OPA * k); }   // unit: opacity cap
  function put(n, x, y, fs, rot, op, flip) {
    n.o.style.fontSize = fs + 'px'; n.o.style.opacity = op; n.x = x; n.y = y; n.op = op;
    n.o.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(calc(-100% / 2),calc(-100% / 2)) rotate(' + rot + 'rad)' + (flip ? ' scaleX(-1)' : '');   // unit: centre on the point
  }
  function sky() {
    var now = Date.now(), age = moonAge(now), i = Math.round(age / SYN * PH.length) % PH.length;
    moon.p.textContent = PH[i];
    var lon = subLunar(now), w = faceW(lon * DEG); small.f.forEach(function (e, j) { e.style.opacity = w[j]; });
    G.lon = lon; G.age = age / DAY;
  }
  var t0 = performance.now(), TB = rung(SID, 8);                            // phi: big Earth turns once per rung-8 sidereal day (47..76 s)
  function spinBig(now) { var w = faceW(TAU * fr((now - t0) / MS / TB) - TAU / 2); big.f.forEach(function (e, j) { e.style.opacity = w[j]; }); }

  if (root.RhythmContinuity) RhythmContinuity.phase('scene:ping', function () { return (performance.now() - t0) / MS; }, function (t) { t0 = performance.now() - t * MS; });   // continuity: phase kept across reloads + time away
  // orbiters: rAF, capped
  function orbit(now) {
    var t = (now - t0) / MS;
    ORB.forEach(function (q) {
      var th = TAU * (t / q.T + q.ph), sn = Math.sin(th), sc = Math.pow(PHI, (sn - 1) * IP);   // phi: perspective, largest in front
      q.front = sn > 0; q.peak = sn > PEAK;
      var o = q.n.o.style; o.fontSize = (G.fs * q.s) + 'px'; o.zIndex = q.front ? 2 : 0; moon.o.style.zIndex = 1;
      o.transform = 'translate3d(' + (G.mx + G.rx * Math.cos(th)) + 'px,' + (G.my + G.ry * sn) + 'px,0) translate(calc(-100% / 2),calc(-100% / 2)) scale(' + sc + ')';   // unit: centre on the point
      o.opacity = (q.op || OPA) * sc * (q.front ? 1 : IP);                // phi: base 1-PHI^-3 (pumped), behind = one rung dimmer
    });
  }
  var raf = 0, last = 0, FRAME = MS * Math.pow(IP, 7);                      // phi: frame cap PHI^-7 s
  function tick(now) { raf = 0; if (doc.hidden) return; if (now - last >= FRAME) { last = now; orbit(now); } raf = requestAnimationFrame(tick); }
  function go() { if (!raf && !doc.hidden && !RM) raf = requestAnimationFrame(tick); }

  // ---------- ping chain ----------
  var pump = null;
  function pumpOut() { var P = root.PhiPumps; if (P && !pump) pump = P.node('ping', 5, 3, Math.pow(IP, 4), P.page, 2); try { return pump ? pump.out() : 1; } catch (e) { return 1; } }   // phi: 5 pumps (Fibonacci tree), rungs 3.., depth PHI^-4
  function onScreen(n) { var r = n.o.getBoundingClientRect(); return r.width > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight && +getComputedStyle(n.o).opacity > 0; }
  function pulse(n) {
    if (!n.p.animate) return;
    n.p.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(' + Math.pow(PHI, IP) + ')', opacity: 1 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: MS * Math.pow(PHI, 0) * pumpOut(), easing: 'ease-out' });   // phi: one-second pulse (PHI^0), pumped; opacity relative to the base
  }
  var hops = [[scope, Math.pow(PHI, 0)], [big, Math.pow(IP, 1)], [dish, LIGHT], [moon, Math.pow(IP, 2)]];   // phi rungs; dish -> Moon = light time (cite)
  var count = 0, RUNG = dial('pings', 6);                                 // phi: chain every PHI^6 = 17.9 s by default (sandbox dial)
  function chain() {
    if (doc.hidden) return later();
    count++; var at = 0;
    hops.forEach(function (h) { if (!onScreen(h[0])) return; at += h[1] * pumpOut(); setTimeout(function () { pulse(h[0]); }, at * MS); });
    setTimeout(function () { ORB.forEach(function (q) { if (q.front && q.peak && onScreen(q.n)) pulse(q.n); }); }, (at + Math.pow(IP, 2)) * MS);   // phi: orbiters answer only in front at peak
    later();
  }
  var cT = 0; function later() { clearTimeout(cT); cT = setTimeout(chain, Math.pow(PHI, RUNG) * pumpOut() * MS); }

  doc.body.appendChild(Lr); measure(); sky(); spinBig(performance.now());
  if (RM) { ORB.forEach(function (q) { q.ph = 1 / 4; }); orbit(t0); }      // unit: still, both in front (quarter turn)
  else { orbit(t0); go(); setInterval(function () { if (!doc.hidden) { sky(); spinBig(performance.now()); [scope, dish, big, moon, small].forEach(function (n) { n.op = opAim(); n.o.style.opacity = n.op; }); ORB.forEach(function (q) { q.op = opAim(); }); } }, Math.pow(PHI, 3) * MS); setTimeout(chain, Math.pow(PHI, 3) * MS); }   // phi: refresh + first ping after PHI^3 s
  addEventListener('resize', measure); addEventListener('orientationchange', measure);
  if (root.visualViewport) visualViewport.addEventListener('resize', measure);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(measure);                  // emoji font box settles after load
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden) go(); });
  root.PingLayer = { info: function () { return { subLunarLon: G.lon, moonAgeDays: G.age, phase: moon.p.textContent, bigEarthPeriod: TB, satT: ORB[0].T, astT: ORB[1].T,
    lightTime: LIGHT, pings: count, chainEvery: Math.pow(PHI, RUNG), front: ORB.map(function (q) { return !!q.front; }) }; }, ping: chain };
})();
