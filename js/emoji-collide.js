/* EMOJI COLLISIONS (Danny 17:18 AWST 26 Oct 2026). Idle tier. Every moving emoji on the home page (lane critters and UFOs, the
   rocket, the header satellite, the satellite and astronaut round the Moon, the space-sweep ring, the top-sweep planets, the drawn
   falling-star streaks and the comet streak, by their glowing heads) is a circle the size of what is drawn right now. When two
   circles meet, both vanish and each is replaced, at its own rendered size, by one of five drawn effects:
     burst      a 💥 flash and sparks flung out           (the most violent hits)
     vaporise   it breaks into small copies of itself that scatter
     flames     it burns: a flickering 🔥, embers rising
     smoke      it goes up in grey puffs
     spin-out   it tumbles away, spinning faster, falling (glancing hits)
   The physics picks the effect: the closing speed in body sizes per second sets the violence (soft hit = smoke .. hard hit =
   burst), a glancing angle (relative velocity mostly across the line between them) spins them out, and the debris flies along
   each body's own velocity reflected off the contact line. A pump node ('collide') nudges the violence. After a pumped PHI^3 s
   the emoji comes back on its own path (it kept moving while hidden), with PHI s of grace so it cannot hit the same thing at once.
   Scenery that is meant to overlap (the Sun, the big Earth, the Moon group, front/behind orbit pairs) is skipped.
   The telescope and the dish (dishscope, Danny 19:02 AWST 26 Oct) come and go (js/ping-layer.js) and count while present, at their
   drawn size, same effect choice. A hit sends them away for a pumped PHI^5..PHI^6 s (PingLayer.away), then they arrive again the
   rule-14 way. The rocket's own pad and liftoff (until it has climbed PHI^-1 of the view from where it appeared) never count
   against them, so a launch beside the telescope cannot blow it up; a rocket higher in flight, or anything else crossing them, can.
   Cost: one rAF loop capped at PHI^-6 s, rects of ~20-40 elements, a spatial grid, a swept test (no tunnelling between ticks);
   effects are a few short WAAPI transform/opacity animations in one fixed layer. Reduced motion: whatever still moves just fades. */
(function () {
  'use strict';
  var doc = document, root = window;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, TAU = 2 * Math.PI, MS = 1e3;   // phi; unit: a turn, ms per s
  if (!doc.body || !Element.prototype.animate) return;
  var RM = root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SEL = ['.lane .it:not(.cli)', '#rk1 > i', '#q-head .sat', '.pl-sat > .pl-p', '.pl-ast > .pl-p', '.qs-op', '.tsl-p', '.rain i', '.es-comet', '.pl-scope > .pl-p', '.pl-dish > .pl-p'];
  var HEAD = { 'rain': 'left:50%;bottom:0', 'es-comet': 'right:0;top:0;width:1em;height:1em' };   // unit: where a streak's glowing head is drawn
  var TICK = MS * Math.pow(IP, 6), FIND = MS * PHI * PHI, BACK = Math.pow(PHI, 3), GRACE = PHI;   // phi: tick PHI^-6 s, rescan PHI^2 s, back after PHI^3 s, PHI s grace
  var RAD = Math.pow(IP, 1 / 2), MAXFX = 5, GAPS = PHI;                    // phi: circle PHI^-0.5 of the half-box (glyph ink, not padding), a new hit waits until fewer than 5 effect pieces (Fibonacci) are on screen, PHI s between hits
  var css = '.ec-gone{visibility:hidden!important}.ec-h{position:absolute;width:0;height:0;pointer-events:none;visibility:hidden}' +
    '.ec-l{position:fixed;inset:0;z-index:2147483646;pointer-events:none;overflow:hidden;contain:strict}' +   // unit: just under the launcher's top layer
    '.ec-l>*{position:absolute;left:0;top:0;line-height:1;will-change:transform,opacity;font-style:normal}' +
    '.ec-dot{border-radius:50%;background:radial-gradient(circle closest-side,#fff,#ffd700 38.2%,rgba(255,99,0,.618) 61.8%,transparent)}' +   // phi: 38.2 / 61.8 stops; anchor: white-hot to the Sun glow gold
    '.ec-puff{border-radius:50%;background:radial-gradient(circle closest-side,rgba(170,176,180,.618),rgba(120,126,130,.382) 61.8%,transparent)}';   // phi: stops + alphas; anchor: smoke grey, the rain's blue-grey
  var st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);
  var L = doc.createElement('div'); L.className = 'ec-l'; L.setAttribute('aria-hidden', 'true'); doc.body.appendChild(L);
  var pump = null;
  function k() { var P = root.PhiPumps; if (P && !pump) pump = P.node('collide', 3, 5, Math.pow(IP, 3), P.page, 89); try { return pump ? pump.out() : 1; } catch (e) { return 1; } }   // phi: 3 pumps, rungs 5.., depth PHI^-3

  // ---------- bodies ----------
  var B = [], seen = typeof WeakMap === 'function' ? new WeakMap() : null;
  function hideOf(el) { return el.classList.contains('pl-p') ? el.parentElement : el; }   // the PingLayer writes opacity on the outer node
  function kind(el) { return el.classList.contains('es-comet') ? 'es-comet' : (el.parentElement && el.parentElement.classList.contains('rain') ? 'rain' : ''); }
  function scan() {
    var list = [];
    SEL.forEach(function (s) { Array.prototype.forEach.call(doc.querySelectorAll(s), function (el) { if (list.indexOf(el) < 0) list.push(el); }); });
    B = list.map(function (el) {
      var b = seen && seen.get(el); if (b) return b;
      var kd = kind(el); b = { el: el, hide: hideOf(el), kd: kd, x: 0, y: 0, r: 0, t: 0, px: 0, py: 0, vx: 0, vy: 0, until: 0, gone: false,
        scen: (el.dataset && el.dataset.scen) || '', rk: !!(el.parentElement && el.parentElement.id === 'rk1') };   // scenery (telescope / dish), the rocket
      if (HEAD[kd]) { var h = doc.createElement('b'); h.className = 'ec-h'; h.style.cssText = HEAD[kd]; el.appendChild(h); b.head = h; }   // a zero-size marker at the drawn head
      if (seen) seen.set(el, b); return b;
    });
  }
  function measure(b, now) {
    var el = b.el; if (!el.isConnected) return false;
    var r = el.getBoundingClientRect(), x, y, rad;
    if (b.head) { var h = b.head.getBoundingClientRect(); x = h.left + h.width / 2; y = h.top + h.height / 2;
      rad = (b.kd === 'rain' ? el.offsetWidth * PHI * PHI : el.offsetHeight) / 2; }   // phi: the streak head glow is PHI^2 of its width; the comet head is 1em
    else { x = r.left + r.width / 2; y = r.top + r.height / 2; rad = Math.min(r.width, r.height) / 2 * RAD; }
    if (!r.width || !r.height || x < 0 || y < 0 || x > innerWidth || y > innerHeight) { b.t = 0; return false; }
    var cs = getComputedStyle(b.hide); if (cs.visibility === 'hidden' || +cs.opacity < Math.pow(IP, 3)) { b.t = 0; return false; }   // phi: too faint to count
    if (!b.t) { b.ox = x; b.oy = y; }                                      // unit: where it appeared this pass (the rocket: its pad)
    if (b.t) { var dt = (now - b.t) / MS; if (dt > 0) { b.vx = (x - b.x) / dt; b.vy = (y - b.y) / dt; } b.px = b.x; b.py = b.y; } else { b.px = x; b.py = y; b.vx = b.vy = 0; }
    (b.hist = b.hist || []).push([now, x, y]); while (b.hist.length > 34) b.hist.shift();   // phi: 34 samples (~PHI^2 s) of where it was
    b.x = x; b.y = y; b.r = rad; b.t = now; b.fs = b.head ? rad * 2 : Math.min(r.width, r.height); b.z = zOf(b);
    return true;
  }
  function zOf(b) { var n = b.hide; return n.classList.contains('pl-n') && !b.scen ? (+n.style.zIndex || 0) : null; }   // orbiters round the Moon: front (2) vs behind (0)
  function moving(a, c) { return a.px !== a.x || c.px !== c.x ? Math.hypot(a.vx - c.vx, a.vy - c.vy) > (a.r + c.r) * Math.pow(IP, 4) : false; }   // phi: they must be closing, at least PHI^-4 sizes a second (parked pairs never count)
  function companions(a, c, now) {
    if (a.el.dataset && a.el.dataset.ec && a.el.dataset.ec === c.el.dataset.ec) return true;   // marked pair (the lane rings: a moon round its Earth, a satellite round its planet)                                         // a designed pair (a moon round its planet, two orbit-mates) was already close PHI s ago
    var R = (a.r + c.r) * PHI * PHI, pa = past(a, now), pc = past(c, now);   // phi: within PHI^2 of touching
    return pa && pc && Math.hypot(pa[1] - pc[1], pa[2] - pc[2]) < R;
  }
  function past(b, now) { var h = b.hist, i; if (!h || !h.length || now - h[0][0] < PHI * MS) return null; for (i = h.length - 1; i >= 0; i--) if (now - h[i][0] >= PHI * MS) return h[i]; return null; }   // phi: the sample PHI s back
  function sameScene(a, c) { return a.z == null || c.z == null || a.z === c.z || !!(a.scen || c.scen); }   // the telescope / dish sit in no orbit scene
  function liftoff(a, c) { var r = a.rk ? a : c.rk ? c : null; return !!(r && (a.scen || c.scen) && r.oy - r.y < innerHeight * IP); }   // phi: the rocket's pad + first PHI^-1 of the view never hits scenery
  // swept test: closest approach of the two centres over the last tick (both moving in straight lines between samples)
  function hit(a, c) {
    var R = a.r + c.r, dx0 = c.px - a.px, dy0 = c.py - a.py, dx1 = c.x - a.x, dy1 = c.y - a.y, ex = dx1 - dx0, ey = dy1 - dy0;
    var ee = ex * ex + ey * ey, u = ee ? Math.max(0, Math.min(1, -(dx0 * ex + dy0 * ey) / ee)) : 1;
    var qx = dx0 + ex * u, qy = dy0 + ey * u; return qx * qx + qy * qy < R * R;
  }
  var raf = 0, last = 0, lastFind = 0, lastHit = 0, live = 0;
  function tick(now) {
    raf = 0; if (doc.hidden) return;
    if (now - last >= TICK) {
      last = now;
      if (now - lastFind > FIND) { lastFind = now; scan(); }
      var on = B.filter(function (b) { return !b.gone && now > b.until && measure(b, now); });
      var cell = 0; on.forEach(function (b) { cell = Math.max(cell, b.r * 2 + Math.hypot(b.x - b.px, b.y - b.py)); });   // unit: one cell holds the biggest swept circle
      if (cell && live < MAXFX && now - lastHit > GAPS * MS) {
        var G = {}, key = function (i, j) { return i + ',' + j; }, done = false;
        on.forEach(function (b, n) { var i = Math.floor(b.x / cell), j = Math.floor(b.y / cell), q = key(i, j); (G[q] = G[q] || []).push(n); b.ci = i; b.cj = j; });
        for (var n = 0; n < on.length && !done; n++) {
          var a = on[n];
          for (var di = -1; di <= 1 && !done; di++) for (var dj = -1; dj <= 1 && !done; dj++) {
            var g = G[key(a.ci + di, a.cj + dj)]; if (!g) continue;
            for (var m = 0; m < g.length; m++) { var c = on[g[m]]; if (g[m] <= n || !sameScene(a, c) || !moving(a, c) || !hit(a, c) || liftoff(a, c) || companions(a, c, now)) continue; collide(a, c, now); done = true; break; }
          }
        }
      }
    }
    raf = requestAnimationFrame(tick);
  }
  function go() { if (!raf && !doc.hidden) raf = requestAnimationFrame(tick); }
  doc.addEventListener('visibilitychange', function () { B.forEach(function (b) { b.t = 0; }); go(); });

  // ---------- the physics of one hit ----------
  var FX = ['smoke', 'flames', 'vaporise', 'burst'];                      // violence ladder, soft to hard
  var count = 0, made = { burst: 0, smoke: 0, flames: 0, vaporise: 0, spin: 0 }, lastInfo = null;
  function collide(a, c, now) {
    lastHit = now; count++;
    var nx = c.x - a.x, ny = c.y - a.y, nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;   // unit: contact normal a -> c
    var rvx = a.vx - c.vx, rvy = a.vy - c.vy, rv = Math.hypot(rvx, rvy);
    var size = a.r + c.r, w = 1 - Math.exp(-rv / (size * Math.pow(PHI, 3)) * k());   // phi: violence 0..1 from the closing speed in sizes per PHI^3 s (drift = smoke, the rocket = burst), pumped
    var glance = rv ? Math.abs(rvx * ny - rvy * nx) / rv : 0;            // unit: sine of the angle between the relative velocity and the normal
    var kindFx = glance > 1 - Math.pow(IP, 3) ? 'spin' : FX[Math.min(FX.length - 1, Math.floor(w * FX.length))];   // phi: glancing past 0.764 spins out
    lastInfo = { who: [label(a), label(c)], scen: a.scen || c.scen || '', t: now, fx: kindFx, violence: w, glance: glance, closing: rv, at: [a.x, a.y, c.x, c.y] };
    [a, c].forEach(function (b, i) {
      var sx = i ? 1 : -1, vn = b.vx * nx + b.vy * ny;                     // reflect the body's own velocity off the contact line
      var dx = b.vx - 2 * vn * nx, dy = b.vy - 2 * vn * ny, dl = Math.hypot(dx, dy);
      if (dl < 1) { dx = sx * nx; dy = sx * ny; dl = 1; }                  // unit: at rest, it is pushed straight off the other
      vanish(b, now);
      play(kindFx, b, dx / dl, dy / dl, w);
    });
  }
  function label(b) { return (b.el.className || b.el.tagName) + ' ' + (b.head ? '' : (b.el.textContent || '').trim().slice(0, 4)); }   // unit: a few UTF-16 units of the glyph, for info() only
  var spump = null;
  function away() { var P = root.PhiPumps; if (P && !spump) spump = P.node('collide:scenery', 3, 5, 1, null, 144); var m = 0; try { m = spump ? spump.modes() : 0; } catch (e) {}   // phi: 3 pumps, rungs 5.., Fibonacci seed
    return Math.pow(PHI, 5 + (1 + m) / 2); }                              // phi: PHI^5 .. PHI^6 s (11.1 .. 17.9 s), pumped
  function vanish(b, now) {
    b.gone = true; b.hide.classList.add('ec-gone');
    var s = BACK * k(); if (b.scen) { s = away(); if (root.PingLayer && PingLayer.away) PingLayer.away(b.scen, s); b.away = s; }   // scenery stays away longer, then arrives again
    setTimeout(function () { b.hide.classList.remove('ec-gone'); b.gone = false; b.t = 0; b.hist = []; b.until = performance.now() + GRACE * MS; }, s * MS);   // phi: back on its path after PHI^3 s (pumped), then PHI s grace
  }

  // ---------- effects (drawn, at the body's rendered size) ----------
  function bit(cls, txt, x, y, s) { var e = doc.createElement('i'); if (cls) e.className = cls; if (txt) { e.textContent = txt; e.style.fontSize = s + 'px'; } else { e.style.width = e.style.height = s + 'px'; } e.style.transform = 'translate(' + (x - s / 2) + 'px,' + (y - s / 2) + 'px)'; L.appendChild(e); return e; }
  function hold(fr) { if (fr.length !== 2 || fr[1].opacity !== 0) return fr; var m = {}; for (var p in fr[0]) m[p] = fr[0][p]; m.offset = IP;   // phi: stays solid to PHI^-1 of its life, then fades
    m.transform = undefined; delete m.transform; m.opacity = fr[0].opacity; return [fr[0], m, fr[1]]; }
  function fly(e, frames, ms, ease) { frames = hold(frames); live++; var an = e.animate(frames, { duration: ms, easing: ease || 'ease-out', fill: 'forwards' }); an.onfinish = an.oncancel = function () { live--; e.remove(); }; return an; }
  function T(x, y, s, r, sc) { return 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) rotate(' + (r || 0) + 'rad) scale(' + (sc == null ? 1 : sc) + ')'; }   // unit: centred on the point
  function glyphOf(b) { var t = (b.el.textContent || '').trim(); return /\p{Extended_Pictographic}/u.test(t) ? t : '\u2728'; }   // a drawn streak breaks into sparkles
  function play(fx, b, dx, dy, w) {
    made[fx]++;
    var x = b.x, y = b.y, S = Math.max(b.fs, 1), kk = k(), i, n, e, a, d;   // unit: the body's drawn size, at least a pixel
    if (RM) { e = bit('', glyphOf(b), 0, 0, S); fly(e, [{ transform: T(x, y), opacity: 1 }, { transform: T(x, y), opacity: 0 }], MS * IP); return; }   // phi: a plain fade
    if (fx === 'burst') {
      e = bit('', '\uD83D\uDCA5', 0, 0, S); fly(e, [{ transform: T(x, y, S, 0, IP * IP), opacity: 1 }, { transform: T(x, y, S, 0, PHI), opacity: 0 }], MS * kk);   // phi: flash grows PHI^-2 -> PHI over a second (PHI^0)
      for (i = 0, n = 8; i < n; i++) {                                     // phi: 8 sparks (Fibonacci), flung round the circle, biased along the debris line
        a = Math.atan2(dy, dx) + TAU * (i / n - 1 / 2) * IP; d = S * PHI * (1 + w) * (1 - Math.abs(i / n - 1 / 2));   // phi: spread PHI^-1 of a turn
        e = bit('ec-dot', '', 0, 0, S * IP * IP); fly(e, [{ transform: T(x, y), opacity: 1 }, { transform: T(x + Math.cos(a) * d, y + Math.sin(a) * d, 0, 0, IP), opacity: 0 }], MS * kk, 'cubic-bezier(0,' + IP + ',' + IP + ',1)');   // phi: sparks decelerate in the air
      }
    } else if (fx === 'vaporise') {
      var g = glyphOf(b);
      for (i = 0, n = 13; i < n; i++) {                                    // phi: 13 fragments (Fibonacci) on golden angles
        a = Math.atan2(dy, dx) + (i * TAU * IP * IP % TAU - TAU / 2) * IP; d = S * (IP + (i * IP % 1)) * PHI * (1 + w);   // phi: golden-angle spread, golden-sequence distances
        e = bit('', g, 0, 0, S * IP); fly(e, [{ transform: T(x, y), opacity: 1 }, { transform: T(x + Math.cos(a) * d, y + Math.sin(a) * d, 0, TAU * (i % 2 ? 1 : -1) * IP, IP * IP), opacity: 0 }], MS * PHI * kk);   // phi: fragments PHI^-1 the size, shrink as they go
      }
    } else if (fx === 'flames') {
      e = bit('', '\uD83D\uDD25', 0, 0, S);
      var fr = []; for (i = 0, n = 13; i <= n; i++) { var u = i / n, f = Math.sin(u * Math.PI); fr.push({ offset: u, transform: T(x, y - S * IP * IP * u, 0, (i % 2 ? 1 : -1) * TAU / 89 * f, IP + (1 - IP) * f * (1 + (i % 3 ? IP * IP : 0))), opacity: f < IP * IP && u > 1 / 2 ? f * PHI * PHI : 1 }); }   // phi: flicker, flame flares then dies down; 1/89 turn sway
      fly(e, fr, MS * PHI * PHI * kk, 'linear');                           // phi: burns PHI^2 s
      for (i = 0; i < 3; i++) { d = S * PHI * (1 + i * IP); e = bit('ec-dot', '', 0, 0, S * Math.pow(IP, 3));   // phi: 3 embers rising
        fly(e, [{ transform: T(x, y), opacity: 1 }, { transform: T(x + dx * S * IP * (i - 1), y - d, 0, 0, IP), opacity: 0 }], MS * PHI * (1 + i * IP) * kk); }
    } else if (fx === 'smoke') {
      for (i = 0, n = 5; i < n; i++) { d = S * PHI * (1 + i * IP);         // phi: 5 puffs, each higher and later
        e = bit('ec-puff', '', 0, 0, S * IP); fly(e, [{ transform: T(x, y, 0, 0, IP), opacity: 1 - Math.pow(IP, 3) }, { transform: T(x + dx * S * IP * (1 + i * IP), y - d, 0, 0, PHI * PHI), opacity: 0 }], MS * PHI * PHI * (1 + i * IP * IP) * kk, 'cubic-bezier(0,' + IP + ',' + IP + ',1)');   // phi: puffs swell PHI^2, drift with the debris line
      }
    } else {                                                               // spin-out: tumble away along the debris line, falling (projectile: steady across, gravity down)
      e = bit('', glyphOf(b), 0, 0, S); var fs = []; var spin = (dx >= 0 ? 1 : -1) * TAU * PHI * PHI * (1 + w);   // phi: PHI^2 turns, more for a harder hit
      for (i = 0, n = 21; i <= n; i++) { var v = i / n; fs.push({ offset: v, transform: T(x + dx * S * PHI * PHI * v, y + dy * S * PHI * v + innerHeight * IP * v * v, 0, spin * v * v, 1 - (1 - IP) * v), opacity: 1 - v * v * v }); }   // unit: across ~ t, gravity ~ t^2 (Newton); spin ~ t^2 (it spins up)
      fly(e, fs, MS * PHI * PHI * kk, 'linear');                           // phi: falls for PHI^2 s; the curve is in the keyframes
    }
  }
  root.EmojiCollide = { info: function () { return { bodies: B.length, hits: count, made: made, last: lastInfo, live: live }; },
    test: function (fx, x, y, s) { play(fx || 'burst', { x: x || innerWidth / 2, y: y || innerHeight / 2, fs: s || 32, el: { textContent: '\uD83D\uDEF8' } }, 1, 0, 1 - IP); } };   // unit: debug only, centre of the screen
  scan(); go();
})();
