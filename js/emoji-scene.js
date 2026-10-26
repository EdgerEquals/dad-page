/* HOME EMOJI SCENE, first cut (Danny 11:59 / 12:02 / 12:04 / 12:06 / 12:17 AWST 26 Oct 2026). Tier 2 (idle, after the anim gate).
   Replaces the home page's middle-layer theme (rainbows, thought clouds, glowing stars floating on one axis). Header, footer,
   the background loop and the space orbit suite's other three emojis are untouched.
     STARS   plain emoji (star, four-point star, glowing star), low opacity from a phi rung. Each spins on its OWN 3D axis: the axis
             vector steps by the golden angle per star (k x 137.5 deg) with a golden-sequence tilt, spin direction mixed by the
             golden sequence (not mirrored), spin period two phi rungs faster than the page's bg-spin slot. Each sweeps in and out
             in depth (scale + opacity) along its own orbit vector, period from the phi ladder, golden-angle phase, so no two are
             in step or opposite.
     CLOUDS  thought bubbles appear rarely: one every PHI^r s, r = the sandbox dial 'clouds' (dials.html, default rung 10 = 123 s).
             Each grows from small to an end size of min(viewport) x PHI^-3 (0.236, about a quarter); opacity is the SAME linear
             function of its size (full when small, zero at the end size), with a gentle breathe on a phi period on top.
     COMET   moved off the CSS ellipse onto one small rAF loop: crossing period PHI^(6 - moon/PHI) s (several rungs faster than
             the old PHI^(10 - moon/2) ring), opacity modulating on crossing x PHI and kept low (PHI^-5 .. PHI^-3), heading taken
             from the path's own velocity vector (atan2 of the derivative), so rotation and direction of travel are one parameter
             and the tail always trails. No half-turn any more.
   All numbers are phi steps, pump feeds (js/ratio-pump.js RatioPump.feeds(): moon, day) or unit/glyph anchors tagged below.
   The rAF loop is capped (one frame per PHI^-7 s), stops while the tab is hidden, and nothing moves under reduced motion. */
(function () {
  'use strict';
  var doc = document, root = window, de = doc.documentElement;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, TAU = 2 * Math.PI;      // phi: the golden ratio; unit: a full turn
  var GA = TAU * IP * IP;                                                // phi: the golden angle (137.5 deg)
  var MS = 1e3;                                                          // unit: ms per second
  var PCT = 100;                                                         // unit: percent
  var RM = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PT = root.PhiTiming;
  function fr(x) { return x - Math.floor(x); }
  function slot(n, e) { try { return PT.s(n); } catch (x) { return Math.pow(PHI, e); } }
  function feeds() { try { return root.RatioPump ? root.RatioPump.feeds() : {}; } catch (e) { return {}; } }
  function dial(id, def) { try { var d = JSON.parse(localStorage.getItem('dadSceneDials.v1') || '{}'); return d[id] != null ? +d[id] : def; } catch (e) { return def; } }
  var L = doc.createElement('div'); L.className = 'es-layer'; L.setAttribute('aria-hidden', 'true');

  // ---------- stars ----------
  var STAR = ['\u2B50', '\u2726', '\uD83C\uDF1F'];
  var NSTAR = 8;                                                         // phi: a Fibonacci count
  var SWEEP0 = slot('bg-float', 5);                                      // phi: the float slot the old stars used
  var SPIN = SWEEP0 * Math.pow(IP, 2);                                   // phi: spin two rungs faster than that slot
  var SWEEP = SWEEP0 * PHI;                                              // phi: depth sweep one rung slower than the float slot
  var OPS = Math.pow(IP, 4);                                             // phi: star opacity ceiling 0.146
  var YK = Math.pow(PHI, IP);                                            // phi: second golden-sequence step for y (unrelated to x)
  for (var k = 1; k <= NSTAR; k++) {
    var a = k * GA, o = doc.createElement('span'), w = doc.createElement('span'), s = doc.createElement('span');
    o.className = 'es-star'; w.className = 'es-sw'; s.className = 'es-sp'; s.textContent = STAR[k % STAR.length];
    var tsw = SWEEP * Math.pow(PHI, fr(k * IP)), tsp = SPIN * Math.pow(PHI, fr(k * YK));
    var st = o.style;
    st.setProperty('--x', (fr(k * IP) * PCT) + 'vw');          // unit: percent of the viewport
    st.setProperty('--y', (fr(k * YK) * PCT) + 'vh');          // unit: percent of the viewport
    st.setProperty('--fs', Math.pow(PHI, fr(k * IP * IP)) + 'rem');
    var ws = w.style, rr = Math.pow(IP, 3) * PCT;                         // phi: sweep reach PHI^-3 of the viewport (unit: percent)
    ws.setProperty('--vx', (Math.cos(a) * rr) + 'vmin'); ws.setProperty('--vy', (Math.sin(a) * rr) + 'vmin');
    ws.setProperty('--s0', Math.pow(IP, 2)); ws.setProperty('--o0', (OPS * Math.pow(IP, 2))); ws.setProperty('--o1', OPS);
    ws.setProperty('--tsw', tsw + 's'); ws.setProperty('--dsw', (-tsw * fr(k * IP * IP)) + 's');
    var ss = s.style;
    ss.setProperty('--ax', Math.cos(a)); ss.setProperty('--ay', Math.sin(a)); ss.setProperty('--az', fr(k * IP));
    ss.setProperty('--tsp', tsp + 's'); ss.setProperty('--dsp', (-tsp * fr(k * YK)) + 's');
    s.style.setProperty('animation-direction', fr(k * IP * YK) < IP ? 'normal' : 'reverse');
    w.appendChild(s); o.appendChild(w); L.appendChild(o);
  }

  // ---------- comet (rAF, heading = velocity) ----------
  var comet = doc.createElement('span'); comet.className = 'es-comet'; comet.textContent = '\u2604\uFE0F'; L.appendChild(comet);
  comet.style.fontSize = Math.pow(PHI, IP * IP) + 'rem';
  var GLYPH = TAU * 3 / 8;                                                 // anchor: glyph geometry, head toward screen down-left (3/8 turn, y down)
  var TILT = -TAU * Math.pow(IP, 6);                                     // phi: path tilt PHI^-6 turn (-20.2 deg, the old ring's -20 deg)
  var ph0 = fr(3 * IP);                                                  // phi: golden-sequence start phase (suite item 3)
  var band = { cx: 0, cy: 0, rx: 0, ry: 0 };
  function measure() {
    var h = doc.getElementById('q-head'), ft = doc.querySelector('.foot');
    var top = h ? Math.max(0, h.getBoundingClientRect().bottom) : 0, bot = ft ? ft.getBoundingClientRect().top : innerHeight;
    var H = Math.max(0, bot - top), W = innerWidth;
    var sun = root.PhiSun || { x: 1 - Math.pow(IP, 4), y: Math.pow(IP, 4) };   // rule 13: orbit centred on the shared Sun anchor
    band.cx = W * sun.x; band.cy = innerHeight * sun.y; band.rx = W * PHI; band.ry = (bot - band.cy) * IP;
  }
  function crossing() { var f = feeds(), m = f.moon != null ? f.moon : IP; return Math.pow(PHI, 6 - m * IP); }   // phi: rung 6, moon nudges faster
  var Tc = crossing(), t0 = performance.now(), last = 0, raf = 0, FRAME = MS * Math.pow(IP, 7);   // phi: frame cap PHI^-7 s
  if (root.RhythmContinuity) RhythmContinuity.phase('scene:comet', function () { return (performance.now() - t0) / MS; }, function (t) { t0 = performance.now() - t * MS; });   // continuity: phase kept across reloads + time away
  function place(now) {
    var t = (now - t0) / MS, th = TAU * (t / Tc + ph0), ca = Math.cos(TILT), sa = Math.sin(TILT);
    var u = band.rx * Math.cos(th), v = band.ry * Math.sin(th), du = -band.rx * Math.sin(th), dv = band.ry * Math.cos(th);
    var x = band.cx + u * ca - v * sa, y = band.cy + u * sa + v * ca, vx = du * ca - dv * sa, vy = du * sa + dv * ca;
    var head = Math.atan2(vy, vx) - GLYPH;
    var q = (1 + Math.sin(TAU * t / (Tc * PHI))) / 2;                    // unit: sine mapped to 0..1; period = crossing x PHI
    var op = Math.pow(IP, 5) + (Math.pow(IP, 3) - Math.pow(IP, 5)) * q;   // phi: depth tracks low, PHI^-5 .. PHI^-3
    comet.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) rotate(' + head + 'rad) scale(' + (IP + IP * IP * q) + ')';
    comet.style.opacity = op;
  }
  function tick(now) { raf = 0; if (doc.hidden) return; if (now - last >= FRAME) { last = now; place(now); } raf = requestAnimationFrame(tick); }
  function go() { if (!raf && !doc.hidden && !RM) raf = requestAnimationFrame(tick); }

  // ---------- clouds (rare, grow to a fade) ----------
  var CLOUD_RUNG = dial('clouds', 10);                                   // phi: rung 10 = 123 s between clouds (sandbox dial)
  var cN = 0, cT = 0;
  function cloud() {
    cT = 0; if (doc.hidden) return later();
    cN++; var c = doc.createElement('span'), b = doc.createElement('span'); c.className = 'es-cloud'; b.className = 'es-cb'; b.textContent = '\uD83D\uDCAD';
    var life = SWEEP * Math.pow(PHI, 2), cs = c.style;                     // phi: two rungs above the float slot
    cs.setProperty('--x', (fr(cN * IP + IP) * PCT) + 'vw'); cs.setProperty('--y', (fr(cN * YK + IP) * PCT) + 'vh');
    cs.setProperty('--end', (Math.pow(IP, 3) * PCT) + 'vmin');  // phi: end size PHI^-3 of the viewport (about a quarter)
    cs.setProperty('--s0', Math.pow(IP, 5)); cs.setProperty('--life', life + 's');
    b.style.setProperty('--br', (life * Math.pow(IP, 3)) + 's'); b.style.setProperty('--bd', Math.pow(IP, 3));
    c.appendChild(b); L.appendChild(c);
    c.addEventListener('animationend', function (e) { if (e.target === c && c.parentNode) c.parentNode.removeChild(c); });
    later();
  }
  function later() { if (!cT) cT = setTimeout(cloud, Math.pow(PHI, CLOUD_RUNG) * MS); }

  if (RM) {   // one still frame: stars where they sit, comet at its current spot, no clouds
    L.classList.add('es-still'); doc.body.appendChild(L); measure(); place(performance.now()); return;
  }
  doc.body.appendChild(L); measure(); go();
  setTimeout(cloud, Math.pow(PHI, CLOUD_RUNG) * MS * fr(IP * YK));          // phi: first cloud at a golden fraction of the gap
  addEventListener('resize', measure);
  doc.addEventListener('visibilitychange', function () { L.classList.toggle('es-paused', doc.hidden); if (!doc.hidden) go(); });
  doc.addEventListener('ratiopump:change', function () { var n = crossing(), now = performance.now(), t = (now - t0) / MS;   // keep the comet's phase
    t0 = now - t * (n / Tc) * MS; Tc = n; });
  root.EmojiScene = { info: function () { return { stars: NSTAR, spin: SPIN, sweep: SWEEP, cometCrossing: Tc, cloudEvery: Math.pow(PHI, CLOUD_RUNG), cloudRung: CLOUD_RUNG }; } };
})();
