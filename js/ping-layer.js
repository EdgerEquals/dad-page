/* PING LAYER, first cut (Danny 12:07-12:16 / 13:04 AWST 26 Oct 2026). Tier 2. Middle layer (behind the content, like the scene).
     BIG EARTH  the real Earth's glyph layer (REAL EARTH + MOON below), its face turning (Americas / Africa-Europe / Asia-Australia crossfade) once per
                sidereal day scaled onto the phi ladder (cite: NASA Earth fact sheet, sidereal rotation 23.9345 h), tilted by the
                obliquity (cite: Astronomical Almanac, 23.4397 deg).
     MOON GROUP the real Moon (see REAL EARTH + MOON below) with tonight's real phase from the synodic month (cite: 29.530588861 d,
                new moon 2000-01-06 18:14 UTC; the model date while the model runs), drawn as seen from Perth (southern sky, so mirrored).
                A satellite (ISS period, cite 5577.6 s) and an astronaut (Himawari period, cite 86163.7 s), each scaled onto its own
                phi rung, orbit it and pass behind (smaller, dimmer, under the Moon) and in front. They ping only in front and near
                their largest. Sub-lunar longitude = Moon RA - GMST (cite: USNO GMST; Astronomical Almanac low-precision Moon), exposed
                raw as PingLayer.info().subLunarLon.
     SCOPE/DISH telescope bottom left and dish bottom right (phi positions above the footer), the telescope aims at the orbiting Earth, the dish at the Moon.
     PING CHAIN telescope -> Earth -> dish -> Moon group (-> satellite / astronaut if in front at peak), pulses on the emoji themselves
                (scale + opacity), routed only through members on screen. Hop delays: phi rungs, the dish -> Moon hop is the real
                Earth-Moon light time (cite: NASA mean distance 384,400 km / c 299,792.458 km/s = 1.282 s). The chain repeats every
                PHI^r s (sandbox dial 'pings', default rung 6), scaled by a 5-pump node under the page pump (PhiPumps) when loaded.
     SUN        (Danny 15:22 AWST 26 Oct) the Sun glyph sits on the shared anchor (window.PhiSun, rule 13), one pulse animation,
                clipped by the header and the right edge. (Its display Earth orbit ended with zoomcam2: the Earth is the real one.)
                The dish aims at the Moon anchor; telescope and dish render at full opacity (full-colour emoji, no pump dimming).
     COME + GO  (dishscope, Danny 19:02 AWST 26 Oct) the telescope and the dish each come and go on their own 3-pump node (rungs
                7.., 29 / 37 / 47 s modes, Fibonacci seeds 3 / 5 so they are never in step; no fixed period): present while the node's
                modes sit above a threshold (sandbox dial 'scenery', PHI^-3 a rung, default half the time, PHI^-5 hysteresis). They
                arrive and leave the rule-14 way (js/arrivals.js): opacity sweeps the phi rungs geometrically, PHI^(-n0 (1-u)), over
                PHI^(1+speed) s (scenery importance 2, the arrivals dials), then a PHI^-5 'pop'. js/emoji-collide.js counts them while
                present; a hit calls PingLayer.away(name, s) and they stay away that long (PHI^5..PHI^6 s, pumped) before coming back
                in, the next time their own node says present. Reduced motion: a plain CSS fade.
     REAL EARTH + MOON (zoomcam2; rules 16-17) these are the real Earth and Moon (js/solar-model.js places them, PingLayer.real),
                shown as these glyphs only in their emoji layer; as a dot or disc solar-model draws them (a ping: a brightness pulse).
   Transforms + opacity only, one capped rAF loop (orbiters + Earth orbit), paused while hidden. Reduced motion: still, no pulses. */
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
    '.pl-p{display:block}.pl-sun .pl-p{animation:plSun var(--sp) ease-in-out infinite alternate}@keyframes plSun{from{opacity:var(--s0)}to{opacity:1}}' +   // unit: full opacity at the crest
    '.pl-layer.pl-hid *{animation-play-state:paused}.pl-nm{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;opacity:0;pointer-events:none}.pl-scope,.pl-dish{transition:opacity var(--fx) ease-in-out}';   // unit: 100% = the Earth glyph box
  var st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);
  var Lr = doc.createElement('div'); Lr.className = 'pl-layer'; Lr.setAttribute('aria-hidden', 'true');
  function node(txt, cls) { var o = doc.createElement('span'), p = doc.createElement('span'); o.className = 'pl-n ' + (cls || ''); p.className = 'pl-p'; p.textContent = txt; o.appendChild(p); Lr.appendChild(o); return { o: o, p: p }; }
  function faces(cls) { var o = doc.createElement('span'); o.className = 'pl-n ' + cls; var p = doc.createElement('span'); p.className = 'pl-p'; p.style.position = 'relative';
    var f = FACE.map(function (g, i) { var e = doc.createElement('span'); e.className = 'pl-f'; e.textContent = g; if (!i) e.style.position = 'relative'; p.appendChild(e); return e; });
    o.appendChild(p); Lr.appendChild(o); return { o: o, p: p, f: f }; }
  var FX = Math.pow(PHI, 3);                                               // phi: face crossfade PHI^3 s
  Lr.style.setProperty('--fx', FX + 's');
  var sunN = node('\u2600\uFE0F', 'pl-sun'), big = faces('pl-big');
  sunN.o.style.setProperty('--sp', (SUN.loop || Math.pow(PHI, 4)) * IP + 's'); sunN.o.style.setProperty('--s0', 1 - Math.pow(IP, 3));   // phi: pulse one rung below the loop, floor 1-PHI^-3
  var PH = ['\uD83C\uDF11', '\uD83C\uDF12', '\uD83C\uDF13', '\uD83C\uDF14', '\uD83C\uDF15', '\uD83C\uDF16', '\uD83C\uDF17', '\uD83C\uDF18'];
  var moon = node(PH[0], 'pl-moon'), sat = node('\uD83D\uDEF0\uFE0F', 'pl-sat'), ast = node('\uD83E\uDDD1\u200D\uD83D\uDE80', 'pl-ast');
  sat.p.dataset.ec = ast.p.dataset.ec = 'moongroup';                        // emoji-collide: the Moon group is a designed pair (never a crash between its orbiters)
  var scope = node('\uD83D\uDD2D', 'pl-scope'), dish = node('\uD83D\uDCE1', 'pl-dish');
  scope.p.dataset.scen = 'scope'; dish.p.dataset.scen = 'dish';               // emoji-collide: scenery that joins the collisions while present

  var OP = Math.pow(IP, 2), OPB = Math.pow(IP, 4), PEAK = 1 - Math.pow(IP, 3);   // phi: node 0.382, big Earth 0.146, pulse peak 0.764
  var OPE = 1 - Math.pow(IP, 4);                                            // phi: big Earth one rung above the rest, 0.854 (pumped)
  var OPA = 1 - Math.pow(IP, 3);                                            // phi: telescope + dish one rung up, 0.764 (pumped)
  // ---------- anchor graph (Danny 15:06 AWST 26 Oct; same pattern as js/phi-sun.js, rule 13) ----------
  // Members bind to ANCHORS, never to coordinates. An anchor is a parent (a frame box or another anchor) plus ratios:
  //   of   'view' | 'content' (header bottom .. footer top) | another anchor's name
  //   at   [ax, ay]  box parent: fractions of its width / height from its top-left; point parent: multiples of its size from its centre
  //   off  [ox, oy]  extra shift in multiples of this anchor's OWN size (e.g. hang an Earth half off a corner)
  //   s    size ratio: of the parent box's short side (or sOf box), or of a point parent's size
  //   orb  [a, q, e]  instead of at: a moving point on a Kepler ellipse with the parent at a focus, semi-major a x view width,
  //                screen depth q x that, eccentricity e (mean anomaly advances evenly, so it dwells at the far end);
  //                its size is s x PHI^(sin - 1) (near point full, far point PHI^-2), drawn as a transform scale
  // resolve() walks the anchors in order once per layout / resize / move(); every member, aim angle and ping hop is DERIVED
  // from the resolved anchors, so moving one anchor (PingLayer.move('earth', {at: [...]})) makes all of its dependents follow.
  var ANCH = [
    ['sun',   { of: 'view',    at: [SUN.x, SUN.y], s: Math.pow(IP, 2), sOf: 'content' }],          // rule 13: the shared Sun, the size the big Earth had (PHI^-2)
    ['earth', { real: 'earth' }],                                         // zoomcam2: the real Earth (rule 16), placed by js/solar-model.js
    ['moon',  { real: 'moon', of: 'earth' }],                             // zoomcam2: the real Moon
    ['scope', { of: 'content', at: [Math.pow(IP, 4), 1], off: [0, -PHI], s: Math.pow(IP, 11 / 2), sOf: 'view' }],     // phi: bottom-left, PHI x its size above the footer
    ['dish',  { of: 'content', at: [1 - Math.pow(IP, 5), 1], off: [0, -PHI], s: Math.pow(IP, 11 / 2), sOf: 'view' }]  // phi: bottom-right, mirrored
  ];
  var ZS = 6;                                                                 // unit: the Sun's z (room for a child orbit and its orbiters on either side)
  var A = {}, SPEC = {}; ANCH.forEach(function (a) { SPEC[a[0]] = a[1]; });
  var MEM = [                                                                // member -> anchor, look, aim (derived)
    { n: sunN, a: 'sun', full: true },                                      // unit: the Sun at full opacity, its one animation is the pulse
    { n: big, a: 'earth', rot: -OBL, base: function () { return OPE; }, real: 1 },
    { n: moon, a: 'moon', flip: SOUTH, real: 1 },
    { n: scope, a: 'scope', aim: 'earth', native: -TAU * 3 / 8, full: true, sc: 'scope' },   // anchor: Apple + Google artwork, telescope tube up-left; follows the orbiting Earth
    { n: dish, a: 'dish', aim: 'moon', native: -TAU / 8, full: true, sc: 'dish' }];          // anchor: Apple + Google artwork, dish feed up-right; aims at the Moon (Danny 15:19)
  var ORB = [                                                                // orbiters bind to the Moon anchor: radius and size in its size
    { n: sat, a: 'moon', T: rung(ISS, 3), ph: fr(IP), s: IP },              // phi: satellite on rung 3 (4.2..6.9 s)
    { n: ast, a: 'moon', T: rung(HIMA, 4), ph: fr(2 * IP), s: Math.pow(IP, 1 / 2) }];   // phi: astronaut on rung 4 (6.9..11.1 s)
  var ORX = PHI, ORY = Math.pow(IP, 2);                                     // phi: orbit radius PHI x the Moon's size, depth PHI^-2
  function frame() {
    var W = innerWidth, H = innerHeight, hd = doc.getElementById('q-head'), ft = doc.querySelector('.foot');
    var top = hd ? Math.max(0, hd.getBoundingClientRect().bottom) : 0, bot = ft ? ft.getBoundingClientRect().top : H;
    A.view = { box: true, x0: 0, y0: 0, w: W, h: H }; A.content = { box: true, x0: 0, y0: top, w: W, h: bot - top };   // anchor: measured boxes
  }
  var REAL = {};
  function place(k) {
    var sp = SPEC[k], x, y, sz, sc = 1, z = null, fr0 = null;
    if (sp.real) { var R = REAL[k], S0 = A.sun || { x: 0, y: 0 };
      if (!R) { A[k] = { x: S0.x, y: S0.y, s: 0, s0: 0, sc: 1, front: false, z: ZS }; return; }   // unit: parked on the Sun until the model draws
      fr0 = !!R.front; z = k === 'earth' ? ZS + ZS * 2 / 3 : (A.earth && A.earth.z != null ? A.earth.z : ZS) + (fr0 ? ZS / 3 : -ZS / 3);   // unit: planets over the Sun glyph (as solar-model); the Moon +-ZS/3 round the Earth by ecliptic z
      A[k] = { x: R.x, y: R.y, s: R.d, s0: R.d, sc: 1, front: fr0, z: z };   // unit: the true drawn diameter (floored at a device pixel)
      if (k === 'moon') phase(); return; }
    var P = A[sp.of], S = sp.sOf ? A[sp.sOf] : P;
    sz = sp.s * (S.box ? Math.min(S.w, S.h) : S.s);
    if (P.box) { x = P.x0 + sp.at[0] * P.w; y = P.y0 + sp.at[1] * P.h; } else { x = P.x + sp.at[0] * P.s; y = P.y + sp.at[1] * P.s; }
    if (sp.off) { x += sp.off[0] * sz; y += sp.off[1] * sz; }
    A[k] = { x: x, y: y, s: sz * sc, s0: sz, sc: sc, front: fr0, z: z };
  }
  function opOf(m) { if (m.real) { var R = REAL[m.a]; if (!R || R.show !== 'glyph') return 0; }   // zoomcam2: the glyph only while it is the body's layer
    var o = m.full ? 1 : opAim(m.base ? m.base() : 0); return m.sc && SCN[m.sc] ? o * SCN[m.sc].v : o; }    // unit: full = opacity 1, times its come-and-go presence
  function putMem(m, opNow) {
    var a = A[m.a], rot = m.rot || 0, flip = !!m.flip;
    if (m.aim) {                                                             // aim derived from the two anchors, mirrored when that keeps the turn smaller
      var t = A[m.aim], th = Math.atan2(t.y - a.y, t.x - a.x), r = wrap(th - m.native), rf = wrap(th - (Math.PI - m.native));   // unit: half a turn mirrors the artwork
      flip = Math.abs(rf) < Math.abs(r); rot = flip ? rf : r;
    }
    put(m.n, a.x, a.y, a.s0 || a.s, rot, opNow == null ? opOf(m) : opNow, flip, a.sc);
    if (a.z != null) { var z = a.z; if (m.n.z !== z) { m.n.z = z; m.n.o.style.zIndex = z; } }   // in front of / behind the Sun (ZS), or its parent
  }
  var MOVING = [];                                                           // anchors that ride an orbit, plus everything that hangs off them
  function moving() { MOVING = []; ANCH.forEach(function (a) { var k = a[0], sp = SPEC[k]; if (sp.real || MOVING.indexOf(sp.of) >= 0) MOVING.push(k); }); }
  function resolve() {
    frame(); moving();
    ANCH.forEach(function (a) { place(a[0]); });
    MEM.forEach(function (m) { putMem(m); });
    sunN.o.style.zIndex = ZS;
    big.o.style.setProperty('--fx', '0s');                                    // unit: no CSS fade on the big Earth, its spin is continuous
    if (NM) NM.fit();
  }
  function move(name, ratios) { if (!SPEC[name]) return null; for (var k in ratios) SPEC[name][k] = ratios[k]; resolve(); return A[name]; }
  var apump = null;
  function opAim(base) { var P = root.PhiPumps; if (P && !apump) apump = P.node('pingaim', 3, 4, Math.pow(IP, 4), P.page, 3);   // phi: 3 pumps, rungs 4.., depth PHI^-4
    var k = 1; try { k = apump ? apump.out() : 1; } catch (e) {} return Math.min(1, (base || OPA) * k); }   // unit: opacity cap
  function put(n, x, y, fs, rot, op, flip, sc) {
    var f = fs + 'px'; if (n.fs !== f) { n.fs = f; n.o.style.fontSize = f; } if (n.op !== op) { n.op = op; n.o.style.opacity = op; } n.x = x; n.y = y;   // unit: write only on change
    n.o.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(calc(-100% / 2),calc(-100% / 2)) rotate(' + rot + 'rad)' + (sc && sc !== 1 ? ' scale(' + sc + ')' : '') + (flip ? ' scaleX(-1)' : '');   // unit: centre on the point
  }
  var G = {}, NM = null;
  function phase() {                                                         // tonight's phase for the moment shown (the model date when it runs)
    var D = root.SolarSystem && SolarSystem.date ? SolarSystem.date() : Date.now(), age = moonAge(D), i = Math.round(age / SYN * PH.length) % PH.length;
    if (moon.ph !== i) { moon.ph = i; moon.p.textContent = PH[i]; } G.age = age / DAY;
  }
  function sky() { phase(); G.lon = subLunar(Date.now()); }
  var t0 = performance.now(), TB = rung(SID, 8);                            // phi: big Earth turns once per rung-8 sidereal day (47..76 s)
  var spump = null, turns = 0, sLast = 0, TS = Math.pow(PHI, 6);         // phi: one globe turn per PHI^6 s (17.9 s), rate pumped
  function spinBig(now) {
    var P = root.PhiPumps; if (P && !spump) spump = P.node('pingspin', 3, 5, Math.pow(IP, 4), P.page, 5);   // phi: 3 pumps, rungs 5.., depth PHI^-4
    var k = 1; try { k = spump ? spump.out() : 1; } catch (e) {}
    if (sLast) turns += (now - sLast) / MS / (TS / k); sLast = now;      // unit: integrate the rate, so a pump change never jumps
    G.central = TAU * fr(turns) - TAU / 2; var gk = NM ? NM.glyph() : 1, w = faceW(G.central); big.f.forEach(function (e, j) { var v = Math.round(w[j] * gk * MS) / MS;   /* unit: thousandths */ if (e._w !== v) { e._w = v; e.style.opacity = v; } });
  }

  if (root.RhythmContinuity) RhythmContinuity.phase('scene:ping', function () { return (performance.now() - t0) / MS; }, function (t) { t0 = performance.now() - t * MS; });   // continuity: phase kept across reloads + time away
  // orbiters: rAF, capped
  function orbit(now) {
    var t = (now - t0) / MS;
    ORB.forEach(function (q) {
      var th = TAU * (t / q.T + q.ph), sn = Math.sin(th), sc = Math.pow(PHI, (sn - 1) * IP);   // phi: perspective, largest in front
      q.front = sn > 0; q.peak = sn > PEAK;
      var M = A[q.a], rx = M.s * ORX, o = q.n.o.style; o.fontSize = (M.s * q.s) + 'px'; var mz = M.z != null ? M.z : ZS; o.zIndex = mz + (q.front ? 1 : -1);
      o.transform = 'translate3d(' + (M.x + rx * Math.cos(th)) + 'px,' + (M.y + rx * ORY * sn) + 'px,0) translate(calc(-100% / 2),calc(-100% / 2)) scale(' + sc + ')';   // unit: centre on the point
      o.opacity = IP + ((q.op || OPA) - IP) * (1 + sn) / 2;                  // phi: floor PHI^-1 (far side), peak 1-PHI^-3 pumped (near side)
    });
  }
  function follow() {                                                         // zoomcam2: re-place the real bodies and everything aimed at or hung off them
    MOVING.forEach(place);
    MEM.forEach(function (m) { if (MOVING.indexOf(m.a) >= 0 || MOVING.indexOf(m.aim) >= 0) putMem(m, m.real ? opOf(m) : m.n.op); });
  }
  function real(k, st) { REAL[k] = st; if (RM || !raf) follow(); }          // js/solar-model.js, per draw: { on, x, y, d, front, show: 'glyph' | 'body' | 'off', el }
  // ---------- come and go (dishscope, Danny 19:02 AWST 26 Oct) ----------
  var SCN = { scope: { k: 'scope', n: scope, seed: 3 }, dish: { k: 'dish', n: dish, seed: 5 } };   // phi: Fibonacci seeds 3 / 5, so their phases are a golden step apart (measured: both out together 26% of the time, as if independent)
  var THR = -dial('scenery', 0) * Math.pow(IP, 3), HYS = Math.pow(IP, 5);   // phi: threshold PHI^-3 a dial rung (0 = present half the time), PHI^-5 hysteresis
  var N0 = dial('arrstart', 5), DUR = Math.pow(PHI, 1 + dial('arrspeed', 0)) * MS;   // phi: rule 14 sweep from PHI^-n0 over PHI^(i-1+speed) s, scenery i = 2
  var POP = [{ transform: 'scale(1)' }, { transform: 'scale(' + (1 + Math.pow(IP, 5)) + ')' }, { transform: 'scale(1)' }];   // phi: arrivals' PHI^-5 pop
  function pnode(q) { var P = root.PhiPumps; if (P && !q.pn) q.pn = P.node('come:' + q.k, 3, 7, 1, null, q.seed); return q.pn; }   // phi: 3 pumps, rungs 7.. (29, 37, 47 s)
  function want(q, now) { if (now < q.block) return false; var p = pnode(q); if (!p) return true; var m = 0; try { m = p.modes(); } catch (e) { return true; }
    return m > THR + (q.on ? -HYS : HYS); }
  function presence(now) {
    for (var k in SCN) { var q = SCN[k], w = want(q, now), v, u;
      if (q.on == null) { q.on = w; q.v = w ? 1 : 0; q.at = now - DUR; q.landed = true; }   // unit: at load the layer's own arrival brings it in
      if (w !== q.on) { q.on = w; q.v0 = q.v; q.at = now; q.landed = !w; if (w) q.arr++; }
      u = Math.min(1, (now - q.at) / DUR);
      if (RM) v = q.on ? 1 : 0;                                            // unit: reduced motion, the CSS transition is the plain fade
      else if (q.on) { var u0 = q.v0 > 0 ? Math.max(0, 1 + Math.log(q.v0) / Math.log(PHI) / N0) : 0, uu = u0 + (1 - u0) * u; v = Math.pow(PHI, -N0 * (1 - uu)); }   // phi: geometric climb, from wherever it was
      else v = u >= 1 ? 0 : q.v0 * Math.pow(PHI, -N0 * u);                   // phi: geometric fade down the same rungs
      if (q.on && u >= 1 && !q.landed) { q.landed = true; if (!RM && q.n.p.animate) try { q.n.p.animate(POP, { duration: MS * PHI, easing: 'ease-out', composite: 'add' }); } catch (e) {} }   // phi: PHI s landing gesture
      q.v = v; var op = Math.round(v * MS) / MS;                              // unit: thousandths
      if (q.n.op !== op) { q.n.op = op; q.n.o.style.opacity = op; q.n.o.style.visibility = op ? '' : 'hidden'; }
      if (q.on && !q.was) q.since = now; if (!q.on && q.was) q.shown += now - q.since; q.was = q.on;
    }
  }
  function away(k, s) { var q = SCN[k]; if (!q) return false; var now = performance.now(); q.block = now + s * MS; q.hits++; q.on = false; q.v = q.v0 = 0; q.at = now - DUR; q.landed = true;
    q.n.op = 0; q.n.o.style.opacity = 0; q.n.o.style.visibility = 'hidden'; return true; }   // unit: gone at once (the collision effect plays in its place)
  for (var sk in SCN) { SCN[sk].block = 0; SCN[sk].arr = 0; SCN[sk].hits = 0; SCN[sk].shown = 0; SCN[sk].v = 1; if (!RM) SCN[sk].n.o.style.transition = 'none'; }   // unit: per-frame sweep replaces the CSS fade
  var raf = 0, last = 0, FRAME = MS * Math.pow(IP, 7);                      // phi: frame cap PHI^-7 s
  function tick(now) { raf = 0; if (doc.hidden) return; if (now - last >= FRAME) { last = now; follow(); orbit(now); spinBig(now); presence(now); if (NM) NM.frame(now); } raf = requestAnimationFrame(tick); }
  function go() { if (!raf && !doc.hidden && !RM) raf = requestAnimationFrame(tick); }

  // ---------- ping chain ----------
  var pump = null;
  function pumpOut() { var P = root.PhiPumps; if (P && !pump) pump = P.node('ping', 5, 3, Math.pow(IP, 4), P.page, 2); try { return pump ? pump.out() : 1; } catch (e) { return 1; } }   // phi: 5 pumps (Fibonacci tree), rungs 3.., depth PHI^-4
  var RN = { earth: big, moon: moon };
  function realOf(n) { for (var k in RN) if (RN[k] === n) return k; return null; }
  function onScreen(n) { var rk = realOf(n); if (rk) { var R = REAL[rk]; return !!(R && R.on); }   // zoomcam2: the real body is on screen (glyph, dot or disc)
    var r = n.o.getBoundingClientRect(); return r.width > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight && +getComputedStyle(n.o).opacity > 0; }
  function pulse(n) {
    var rk = realOf(n), R = rk && REAL[rk];
    if (R && R.show !== 'glyph') { if (R.el && R.el.animate) R.el.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(' + PHI * PHI + ')' }, { filter: 'brightness(1)' }],
      { duration: MS * pumpOut(), easing: 'ease-out' }); return; }        // phi: a dot or disc answers with a PHI^2 brightness pulse, one second, pumped
    if (!n.p.animate) return;
    n.p.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(' + Math.pow(PHI, IP) + ')', opacity: 1 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: MS * Math.pow(PHI, 0) * pumpOut(), easing: 'ease-out' });   // phi: one-second pulse (PHI^0), pumped; opacity relative to the base
  }
  var BY = { scope: scope, earth: big, dish: dish, moon: moon };
  var ROUTE = [['scope', Math.pow(PHI, 0)], ['earth', Math.pow(IP, 1)], ['dish', LIGHT], ['moon', Math.pow(IP, 2)]];   // phi rungs; dish -> Moon = light time (cite); hops named by anchor
  var hops = ROUTE.map(function (h, i) { return [BY[h[0]], h[1], h[0], i ? ROUTE[i - 1][0] : null]; });
  var count = 0, RUNG = dial('pings', 6);                                 // phi: chain every PHI^6 = 17.9 s by default (sandbox dial)
  function chain() {
    if (doc.hidden) return later();
    count++; var at = 0;
    hops.forEach(function (h) { if (!onScreen(h[0])) return; at += h[1] * pumpOut(); setTimeout(function () { pulse(h[0]); if (h[2] === 'earth' && NM && REAL.earth && REAL.earth.show === 'glyph') NM.ping(h[3]); }, at * MS); });
    setTimeout(function () { ORB.forEach(function (q) { if (q.front && q.peak && onScreen(q.n)) pulse(q.n); }); }, (at + Math.pow(IP, 2)) * MS);   // phi: orbiters answer only in front at peak
    later();
  }
  var cT = 0; function later() { clearTimeout(cT); cT = setTimeout(chain, Math.pow(PHI, RUNG) * pumpOut() * MS); }


  // ---------- node-map Earth (Danny 14:54 AWST 26 Oct) ----------
  // One inline SVG over the big Earth, built once: 13 nodes (the pump tree's Fibonacci count) on a golden-spiral sphere, linked to
  // their spiral neighbours (+1, +5: Fibonacci steps), turning with the face crossfade. When a ping reaches the Earth the glyph glides
  // down and the map glides up (one free-wheel mix, never a gate), nodes light in order along the incoming hop like a packet route,
  // then the mix glides back to the plain rotating Earth. Transform-free: attributes + opacity only, updated only while visible.
  NM = (function () {
    var SV = 'http://www.w3.org/2000/svg', N = 13, GA = TAU * Math.pow(IP, 2), R = 1 - Math.pow(IP, 5);   // phi: 13 nodes, golden angle, disc radius in the box
    var LINK = [1, 5], NR = Math.pow(IP, 6), LW = Math.pow(IP, 8);         // phi: links to spiral neighbours; node radius, link width (box units)
    var TAUM = IP, TAUL = Math.pow(IP, 2), STEP = Math.pow(IP, 4), HOLD = Math.pow(PHI, 1);   // phi: mix glide, node glow, hop step, hold (s)
    var CY = '#0AF2FF', EM = '#2ECC71';                                    // anchor: palette accent cyan + Dad's emerald
    var svg = doc.createElementNS(SV, 'svg'); svg.setAttribute('viewBox', '-1 -1 2 2'); svg.setAttribute('class', 'pl-nm'); svg.setAttribute('aria-hidden', 'true');   // unit: box from -1 to 1
    var rim = doc.createElementNS(SV, 'circle'); rim.setAttribute('r', R); rim.setAttribute('fill', 'none'); rim.setAttribute('stroke', CY); rim.setAttribute('stroke-width', LW); rim.setAttribute('stroke-opacity', IP); svg.appendChild(rim);
    var P = [], L = [], i, j;
    for (i = 0; i < N; i++) { var y = 1 - 2 * (i + 1 / 2) / N; P.push({ y: y, r: Math.sqrt(1 - y * y), lon: i * GA, at: -1 }); }   // unit: Fibonacci sphere
    for (i = 0; i < N; i++) LINK.forEach(function (d) { if (i + d < N) { var l = doc.createElementNS(SV, 'line'); l.setAttribute('stroke', EM); l.setAttribute('stroke-width', LW); svg.appendChild(l); L.push({ a: i, b: i + d, e: l }); } });
    P.forEach(function (p) { p.h = doc.createElementNS(SV, 'circle'); p.h.setAttribute('fill', 'none'); p.h.setAttribute('stroke', EM); p.h.setAttribute('stroke-width', LW * PHI); svg.appendChild(p.h);
      p.c = doc.createElementNS(SV, 'circle'); p.c.setAttribute('fill', CY); svg.appendChild(p.c); });
    big.o.appendChild(svg);
    var m = 0, T = 0, last = 0, rel = 0, sp = null;
    function pk() { var Pp = root.PhiPumps; if (Pp && !sp) sp = Pp.node('pingnode', 3, 4, Math.pow(IP, 4), Pp.page, 8); try { return sp ? sp.out() : 1; } catch (e) { return 1; } }   // phi: 3 pumps, rungs 4.., depth PHI^-4
    function proj(p) { var l = p.lon - (G.central || 0); return { x: p.r * Math.sin(l) * R, y: -p.y * R, z: p.r * Math.cos(l) }; }   // unit: north up, z > 0 faces us
    function ping(from) {
      var now = performance.now() / MS, k = pk(), src = A[from || 'scope'], e = A.earth;
      var dx = e.x - src.x, dy = e.y - src.y, c = Math.cos(OBL), s = Math.sin(OBL), lx = dx * c + dy * s, ly = -dx * s + dy * c;   // unit: into the Earth's tilted frame
      var order = P.map(function (p, i) { var q = proj(p); return { i: i, d: q.x * lx + q.y * ly - (q.z > 0 ? 0 : PHI) }; }).sort(function (a, b) { return a.d - b.d; });   // phi: near side first, back side after
      order.forEach(function (o, r) { P[o.i].at = now + TAUM * k + r * STEP * k; });   // phi: route starts once the map is up, one step per hop
      T = 1; rel = now + TAUM * k + N * STEP * k + HOLD * k;                 // phi: hold, then glide back
    }
    function frame(nowMs) {
      var now = nowMs / MS, dt = last ? Math.min(now - last, 1) : 0; last = now;   // unit: dt capped at a second
      if (T && now > rel) T = 0;
      m += (T - m) * (1 - Math.exp(-dt / (TAUM * pk())));                   // free-wheel glide toward the target (rule 6)
      if (m < Math.pow(IP, 12) && !T) { if (svg._on) { svg._on = 0; svg.style.opacity = 0; } m = 0; return; }   // phi: settled, skip work
      svg._on = 1; svg.style.opacity = m;
      var Q = P.map(proj);
      var Gl = [];
      P.forEach(function (p, i) { var q = Q[i], d = now - p.at, g = p.at > 0 && d > 0 ? (d / TAUL) * Math.exp(1 - d / TAUL) : 0; Gl[i] = g;   // unit: smooth rise-and-fall bump, peak 1
        var base = q.z > 0 ? IP : Math.pow(IP, 4);                           // phi: far side faint
        p.c.setAttribute('cx', q.x); p.c.setAttribute('cy', q.y); p.c.setAttribute('r', NR * (1 + g * PHI)); p.c.setAttribute('opacity', base + (1 - base) * g);
        p.h.setAttribute('cx', q.x); p.h.setAttribute('cy', q.y); p.h.setAttribute('r', NR * (1 + g) * PHI * PHI); p.h.setAttribute('opacity', g * (q.z > 0 ? 1 : IP)); });
      L.forEach(function (l) { var a = Q[l.a], b = Q[l.b]; l.e.setAttribute('x1', a.x); l.e.setAttribute('y1', a.y); l.e.setAttribute('x2', b.x); l.e.setAttribute('y2', b.y);
        var lb = a.z > 0 && b.z > 0 ? Math.pow(IP, 2) : Math.pow(IP, 5), lg = Math.min(Gl[l.a], Gl[l.b]); l.e.setAttribute('opacity', lb + (1 - lb) * lg); });   // phi: link base, lights with both ends
    }
    return { ping: ping, frame: frame, mix: function () { return m; }, glyph: function () { return 1 - m * (1 - Math.pow(IP, 2)); }, fit: function () {} };   // phi: glyph glides down to PHI^-2
  })();
  doc.body.appendChild(Lr); resolve(); sky(); spinBig(performance.now());
  if (RM) { ORB.forEach(function (q) { q.ph = 1 / 4; }); orbit(t0); presence(performance.now()); setInterval(function () { if (!doc.hidden) presence(performance.now()); }, MS); }      // unit: still, both in front (quarter turn); come and go checked once a second
  else { orbit(t0); go(); setInterval(function () { if (!doc.hidden) { sky(); spinBig(performance.now()); MEM.forEach(function (m) { var v = opOf(m); if (m.n.op !== v) { m.n.op = v; m.n.o.style.opacity = v; } }); ORB.forEach(function (q) { q.op = opAim(); }); } }, Math.pow(PHI, 3) * MS); setTimeout(chain, Math.pow(PHI, 3) * MS); }   // phi: refresh + first ping after PHI^3 s
  var rq = 0; function soon() { if (!rq) rq = requestAnimationFrame(function () { rq = 0; resolve(); }); }
  addEventListener('resize', soon); addEventListener('orientationchange', soon);
  if (root.visualViewport) visualViewport.addEventListener('resize', soon);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(soon);
  if (root.ResizeObserver) { var ro = new ResizeObserver(soon), hh = doc.getElementById('q-head'), ff = doc.querySelector('.foot'); if (hh) ro.observe(hh); if (ff) ro.observe(ff); }                  // emoji font box settles after load
  doc.addEventListener('visibilitychange', function () { Lr.classList.toggle('pl-hid', doc.hidden); oLast = 0; if (!doc.hidden) go(); });
  root.PingLayer = { info: function () { return { subLunarLon: G.lon, moonAgeDays: G.age, phase: moon.p.textContent, bigEarthPeriod: TB, satT: ORB[0].T, astT: ORB[1].T,
    lightTime: LIGHT, pings: count, chainEvery: Math.pow(PHI, RUNG), front: ORB.map(function (q) { return !!q.front; }), nodeMap: NM ? NM.mix() : null, real: { earth: REAL.earth ? REAL.earth.show : null, moon: REAL.moon ? REAL.moon.show : null, front: A.earth ? A.earth.front : null },
    scenery: Object.keys(SCN).map(function (k) { var q = SCN[k], now = performance.now(); return { k: k, on: q.on, v: q.v, arrivals: q.arr, hits: q.hits, awayLeft: Math.max(0, (q.block - now) / MS), shownS: (q.shown + (q.on ? now - q.since : 0)) / MS, modes: q.pn ? q.pn.modes() : null, thr: THR }; }) }; }, ping: chain, away: away, real: real, anchors: A, spec: SPEC, move: move, resolve: resolve };
})();
