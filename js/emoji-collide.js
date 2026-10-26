/* EMOJI COLLISIONS (Danny 17:18 AWST 26 Oct 2026). Idle tier. Every moving emoji on the home page (lane critters and UFOs, the
   rocket, the header satellite, the satellite and astronaut round the Moon, the space-sweep ring, the top-sweep planets, the drawn
   falling-star streaks and the comet streak, by their glowing heads) is a circle the size of what is drawn right now. When two
   circles meet, both vanish and each is replaced, at its own rendered size, by one of five drawn effects:
     burst      a 💥 flash and sparks flung out           (the most violent hits)
     vaporise   it breaks into small copies of itself that scatter
     flames     it catches fire (firefx, Danny 19:10 AWST 26 Oct): a shimmering glow, five licking tongues in blackbody colours
                (4000 K root to 1000 K tips), embers that drift up and wink out, then it burns down into the smoke
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
   ROCKETHIT (Danny 19:42 / 19:44 AWST 26 Oct): hit circles are one rung tighter (PHI^-1.5 of the half-box; fewer hits). Every hit
   scatters energy: each emoji carries E (1 at rest); its effect and the emoji itself, knocked off along the debris line, both
   play at E and die away on a ringing envelope E e^(-PHI u)(1 - u)(1 + PHI^-1 cos 2 pi f t) / (1 + PHI^-1), size AND opacity,
   the emoji ringing PHI^2 times over its own (pumped) life, its effect PHI times as fast, so the two beat as they fade (no Hz, no key count: one key per tick). The knocked-off emoji stays live with E PHI^-1 and
   can hit something else (that one takes over its energy), a chain that dies by PHI^-1 per generation: it stops once E falls
   below PHI^-2, so at most three hits in a row. Burn-up is the end of the line (Danny 19:57): only spin-out, burst and smoke
   knock the emoji off live; flames and vaporise burn it up, its energy goes into the debris and fades, nothing follows.
   ENERGY CHAIN (rule 15): energy = drawn area x measured speed^2; each body's debris and effect spread with its share of the pair's energy. The rocket, when hit, spins out on fire: a flame rides it, drawn smoke follows
   over it at PHI^-1 of its path and a fireball blooms at the impact, trailing at PHI^-3 (so it is mostly left behind).
   ROCKETBOOM (Danny 20:23): every rocket hit gets the drawn fireball (never held by the hit gate), sized to the rocket's drawn size and
   energy at that moment; the spun-out rocket stays live (E PHI^-1, shrinking), so its next hit explodes smaller; the smoke follows it,
   sized to its size at every instant.
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
  var RAD = Math.pow(IP, 3 / 2), MAXFX = 5, GAPS = PHI;                    // phi: circle PHI^-1.5 of the half-box (rockethit: one rung tighter than PHI^-0.5, glyph ink), a new hit waits until fewer than 5 effect pieces (Fibonacci) are on screen, PHI s between hits
  var css = '.ec-gone{visibility:hidden!important}.ec-h{position:absolute;width:0;height:0;pointer-events:none;visibility:hidden}' +
    '.ec-l{position:fixed;inset:0;z-index:2147483646;pointer-events:none;overflow:hidden;contain:strict}' +   // unit: just under the launcher's top layer
    '.ec-l>*,.ec-g>*{position:absolute;left:0;top:0;line-height:1;will-change:transform,opacity;font-style:normal}.ec-g{width:0;height:0;transform-origin:0 0}' +   // unit: an effect group scales about the impact point
    '.ec-dot{border-radius:50%;background:radial-gradient(circle closest-side,#fff,#ffd700 38.2%,rgba(255,99,0,.618) 61.8%,transparent)}' +   // phi: 38.2 / 61.8 stops; anchor: white-hot to the Sun glow gold
    '.ec-fg{border-radius:50%;background:radial-gradient(circle closest-side,rgba(255,209,163,.854),rgba(255,137,18,.618) 38.2%,rgba(255,56,0,.236) 61.8%,transparent)}' +   // phi: stops + alphas; cite: blackbody 4000 K #ffd1a3, 2000 K #ff8912, 1000 K #ff3800 (Charity, vendian.org)
    '.ec-th,.ec-tc{border-radius:50% 50% 38.2% 38.2%/76.4% 76.4% 23.6% 23.6%;transform-origin:50% 100%}' +   // phi: a flame tongue, narrow tip, round root
    '.ec-th{background:radial-gradient(ellipse 50% 100% at 50% 100%,#ffd1a3,#ffa148 38.2%,#ff6d00 61.8%,rgba(255,56,0,0))}' +   // phi: stops; cite: blackbody 4000 K, 2500 K, 1500 K, 1000 K (Charity, vendian.org)
    '.ec-tc{background:radial-gradient(ellipse 50% 100% at 50% 100%,#ffa148,#ff6d00 38.2%,#ff3800 61.8%,rgba(255,56,0,0))}' +   // phi: stops; cite: blackbody 2500 K, 1500 K, 1000 K (cooler flank tongues)
    '.ec-em{border-radius:50%;background:radial-gradient(circle closest-side,#ff8912,#ff3800 61.8%,transparent)}' +   // phi: stop; cite: blackbody 2000 K -> 1000 K ember
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
      rad = (b.kd === 'rain' ? el.offsetWidth * PHI * PHI : el.offsetHeight) / 2 * IP; }   // phi: the streak head glow is PHI^2 of its width; the comet head is 1em
    else { x = r.left + r.width / 2; y = r.top + r.height / 2; rad = Math.min(r.width, r.height) / 2 * RAD; }
    if (!r.width || !r.height || x < 0 || y < 0 || x > innerWidth || y > innerHeight) { b.t = 0; return false; }
    var cs = b.virt ? null : getComputedStyle(b.hide); if (cs && (cs.visibility === 'hidden' || +cs.opacity < Math.pow(IP, 3))) { b.t = 0; return false; }   // phi: too faint to count
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
      DB = DB.filter(function (b) { return b.el.isConnected; });           // knocked-off emojis still flying
      var on = B.filter(function (b) { return !b.gone && now > b.until && measure(b, now); }).concat(DB.filter(function (b) { return now > b.until && measure(b, now); }));
      var open = live < MAXFX && now - lastHit > GAPS * MS;                 // the gate holds back fresh hits; a chain (a knocked-off emoji) is never held
      var cell = 0; on.forEach(function (b) { cell = Math.max(cell, b.r * 2 + Math.hypot(b.x - b.px, b.y - b.py)); });   // unit: one cell holds the biggest swept circle
      if (cell && (open || DB.length || on.some(function (b) { return b.rk; }))) {   // rocketboom: a rocket hit is never held back
        var G = {}, key = function (i, j) { return i + ',' + j; }, done = false;
        on.forEach(function (b, n) { var i = Math.floor(b.x / cell), j = Math.floor(b.y / cell), q = key(i, j); (G[q] = G[q] || []).push(n); b.ci = i; b.cj = j; });
        for (var n = 0; n < on.length && !done; n++) {
          var a = on[n];
          for (var di = -1; di <= 1 && !done; di++) for (var dj = -1; dj <= 1 && !done; dj++) {
            var g = G[key(a.ci + di, a.cj + dj)]; if (!g) continue;
            for (var m = 0; m < g.length; m++) { var c = on[g[m]]; if (g[m] <= n || (!open && !a.virt && !c.virt && !a.rk && !c.rk) || (a.pair && a.pair === c.pair) || !sameScene(a, c) || !moving(a, c) || !hit(a, c) || liftoff(a, c) || companions(a, c, now)) continue; collide(a, c, now); done = true; break; }
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
  var count = 0, made = { burst: 0, smoke: 0, flames: 0, vaporise: 0, spin: 0, rocket: 0 }, lastInfo = null;
  function collide(a, c, now) {
    lastHit = now; count++;
    var nx = c.x - a.x, ny = c.y - a.y, nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;   // unit: contact normal a -> c
    var rvx = a.vx - c.vx, rvy = a.vy - c.vy, rv = Math.hypot(rvx, rvy);
    var size = a.r + c.r, w = 1 - Math.exp(-rv / (size * Math.pow(PHI, 3)) * k());   // phi: violence 0..1 from the closing speed in sizes per PHI^3 s (drift = smoke, the rocket = burst), pumped
    var glance = rv ? Math.abs(rvx * ny - rvy * nx) / rv : 0;            // unit: sine of the angle between the relative velocity and the normal
    var kindFx = glance > 1 - Math.pow(IP, 3) ? 'spin' : FX[Math.min(FX.length - 1, Math.floor(w * FX.length))];   // phi: glancing past 0.764 spins out
    if (a.virt && !c.virt) c.E = a.E; if (c.virt && !a.virt) a.E = c.E;    // a knocked-off emoji hands its energy on
    var Ka = ke(a), Kc = ke(c), Kt = Ka + Kc;                              // rule 15: mass from the drawn size, energy = mass x speed^2
    var gen = Math.max(a.gen || 0, c.gen || 0) + 1, pair = ++pairs; gens[gen] = (gens[gen] || 0) + 1;
    lastInfo = { who: [label(a), label(c)], scen: a.scen || c.scen || '', t: now, fx: kindFx, violence: w, glance: glance, closing: rv, at: [a.x, a.y, c.x, c.y], gen: gen, E: [a.E || 1, c.E || 1], rocket: !!(a.rk || c.rk), K: [Ka, Kc] };
    [a, c].forEach(function (b, i) {
      var sx = i ? 1 : -1, vn = b.vx * nx + b.vy * ny;                     // reflect the body's own velocity off the contact line
      var dx = b.vx - 2 * vn * nx, dy = b.vy - 2 * vn * ny, dl = Math.hypot(dx, dy);
      if (dl < 1) { dx = sx * nx; dy = sx * ny; dl = 1; }                  // unit: at rest, it is pushed straight off the other
      vanish(b, now);
      var E = b.E || 1, g = Kt ? Math.sqrt(2 * (i ? Kc : Ka) / Kt) : 1; cur = null;   // unit: the debris spreads with its energy share (speed ~ sqrt(energy)), 1 when equal
      if (b.rk && !RM) { made.rocket++; rocket(b, dx / dl, dy / dl, w * g, E, gen, pair); return; }
      var life = MS * Math.pow(PHI, 3) * k();                              // phi: an effect's energy rings out over PHI^3 s (pumped)
      if (!RM) cur = group(b.x, b.y, E * g, life);
      play(kindFx, b, dx / dl, dy / dl, w); cur = null;
      if (!RM && KEEP[kindFx]) knock(b, dx / dl, dy / dl, w * g, E, gen, pair, kindFx === 'spin', true);   // burnupend (Danny 19:57): only a non-destructive hit knocks the emoji off live; flames/vaporise burn it up, its energy goes into the debris and fades, nothing comes after
    });
  }
  function label(b) { return (b.el.className || b.el.tagName) + ' ' + (b.head ? '' : (b.el.textContent || '').trim().slice(0, 4)); }   // unit: a few UTF-16 units of the glyph, for info() only
  var spump = null;
  function away() { var P = root.PhiPumps; if (P && !spump) spump = P.node('collide:scenery', 3, 5, 1, null, 144); var m = 0; try { m = spump ? spump.modes() : 0; } catch (e) {}   // phi: 3 pumps, rungs 5.., Fibonacci seed
    return Math.pow(PHI, 5 + (1 + m) / 2); }                              // phi: PHI^5 .. PHI^6 s (11.1 .. 17.9 s), pumped
  function vanish(b, now) {
    if (b.virt) { DB = DB.filter(function (q) { return q !== b; }); b.an && b.an.cancel(); return; }   // a knocked-off emoji ends here (its own effect plays)
    b.gone = true; b.hide.classList.add('ec-gone');
    var s = BACK * k(); if (b.scen) { s = away(); if (root.PingLayer && PingLayer.away) PingLayer.away(b.scen, s); b.away = s; }   // scenery stays away longer, then arrives again
    setTimeout(function () { b.hide.classList.remove('ec-gone'); b.gone = false; b.E = 1; b.t = 0; b.hist = []; b.until = performance.now() + GRACE * MS; }, s * MS);   // phi: back on its path after PHI^3 s (pumped), then PHI s grace
  }

  // ---------- effects (drawn, at the body's rendered size) ----------
  function bit(cls, txt, x, y, s) { var e = doc.createElement('i'); if (cls) e.className = cls; if (txt) { e.textContent = txt; e.style.fontSize = s + 'px'; } else { e.style.width = e.style.height = s + 'px'; } e.style.transform = 'translate(' + (x - s / 2) + 'px,' + (y - s / 2) + 'px)'; (cur || L).appendChild(e); return e; }
  function hold(fr) { if (fr.length !== 2 || fr[1].opacity !== 0) return fr; var m = {}; for (var p in fr[0]) m[p] = fr[0][p]; m.offset = IP;   // phi: stays solid to PHI^-1 of its life, then fades
    m.transform = undefined; delete m.transform; m.opacity = fr[0].opacity; return [fr[0], m, fr[1]]; }
  function fly(e, frames, ms, ease) { frames = hold(frames); live++; var an = e.animate(frames, { duration: ms, easing: ease || 'ease-out', fill: 'forwards' }); an.onfinish = an.oncancel = function () { live--; done(e); }; return an; }
  function T(x, y, s, r, sc) { return 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) rotate(' + (r || 0) + 'rad) scale(' + (sc == null ? 1 : sc) + ')'; }   // unit: centred on the point
  function glyphOf(b) { var t = (b.el.textContent || '').trim(); return /\p{Extended_Pictographic}/u.test(t) ? t : '\u2728'; }   // a drawn streak breaks into sparkles
  function puffs(x, y, S, dx, kk) { var i, n, d, e;
      for (i = 0, n = 5; i < n; i++) { d = S * PHI * (1 + i * IP);         // phi: 5 puffs, each higher and later
        e = bit('ec-puff', '', 0, 0, S * IP); fly(e, [{ transform: T(x, y, 0, 0, IP), opacity: 1 - Math.pow(IP, 3) }, { transform: T(x + dx * S * IP * (1 + i * IP), y - d, 0, 0, PHI * PHI), opacity: 0 }], MS * PHI * PHI * (1 + i * IP * IP) * kk, 'cubic-bezier(0,' + IP + ',' + IP + ',1)');   // phi: puffs swell PHI^2, drift with the debris line
      } }
  // ---------- fire (firefx, Danny 19:10 AWST 26 Oct: "the fire is a bit naf") ----------
  // Colour follows blackbody order, hottest at the root: cite: Mitchell Charity, 'What color is a blackbody?' (vendian.org, CIE 1964
  // 10-deg, sRGB): 4000 K #ffd1a3, 2500 K #ffa148, 2000 K #ff8912, 1500 K #ff6d00, 1000 K #ff3800. Hot tongues run 4000 K -> 1500 K,
  // the cooler outer tongues 2500 K -> 1000 K, the glow 4000 K -> 1000 K; then the existing smoke. Pieces: 1 glow, 5 tongues, 3 embers
  // (Fibonacci), all transform + opacity WAAPI in the effect layer. Every wobble is golden-sequence jitter, frac((i + seed) PHI).
  function jit(i, s) { var v = (i + s) * PHI; return 2 * (v - Math.floor(v)) - 1; }   // phi: golden-sequence noise, -1..1
  function burn(e, fr, ms, delay) { live++; var an = e.animate(fr, { duration: ms, delay: delay || 0, easing: 'linear', fill: 'both' }); an.onfinish = an.oncancel = function () { live--; done(e); }; return an; }
  function fire(b, x, y, S, dx, dy, w, kk) {
    var life = MS * Math.pow(PHI, 1 + w) * kk, H = S * Math.pow(PHI, w), base = y + S * IP * IP, i, j, n = 21, e, f;   // phi: burns PHI^(1+w) s (pumped), flames PHI^w of its drawn size; unit: root just below its centre
    function env(u) { return u < Math.pow(IP, 4) ? u / Math.pow(IP, 4) : Math.pow(Math.max(0, (1 - u) / (1 - Math.pow(IP, 4))), IP); }   // phi: catches in PHI^-4 of its life, then burns down
    e = bit('ec-fg', '', 0, 0, S * PHI); f = [];                            // glow: heat shimmer in its flicker
    for (i = 0; i <= n; i++) { var u = i / n, g = env(u); f.push({ offset: u, transform: T(x, base - H * IP * IP, 0, 0, (IP + (1 - IP) * g) * (1 + Math.pow(IP, 4) * jit(i, 1))), opacity: g * (1 - Math.pow(IP, 3) * (1 + jit(i, 2)) / 2) }); }   // phi: swells with the burn, PHI^-4 shimmer, PHI^-3 flicker
    burn(e, f, life);
    for (j = 0; j < 5; j++) {                                              // 5 tongues: 3 hot in the middle, 2 cooler flanks that catch later and die sooner
      var hot = j < 3, side = hot ? j - 1 : (j === 3 ? -1 : 1) * PHI, wd = S * (hot ? IP : IP * IP), ht = H * (hot ? PHI : 1);   // phi: tall hot tongues PHI x its flame height, flanks PHI^-1 of that
      var del = hot ? life * Math.pow(IP, 5) * j : life * Math.pow(IP, 3), dur = hot ? life - del : life * IP;   // phi: staggered catch
      e = doc.createElement('i'); e.className = hot ? 'ec-th' : 'ec-tc'; e.style.width = wd + 'px'; e.style.height = ht + 'px'; (cur || L).appendChild(e); f = [];
      for (i = 0; i <= n; i++) { var v = i / n, gg = env(v), lick = (1 + jit(i, j * PHI)) / 2;   // unit: 0..1 lick height this frame
        var px = x + side * S * Math.pow(IP, 3) + jit(i, j + IP) * S * Math.pow(IP, 4), py = base - lick * ht * Math.pow(IP, 4);   // phi: spaced PHI^-3 sizes apart, PHI^-4 sway, licks up PHI^-4 of its height
        f.push({ offset: v, transform: 'translate(' + px + 'px,' + py + 'px) translate(-50%,-100%) rotate(' + (jit(i, j) * TAU / 34 + dx * TAU / 89) + 'rad) scale(' + (gg * (1 - Math.pow(IP, 3) * lick)) + ',' + (gg * (IP * IP + (1 - IP * IP) * lick)) + ')',   // phi: 1/34 turn flicker, leans 1/89 turn with the debris; thin as it licks tall
          opacity: Math.min(1, gg * PHI) * (1 - Math.pow(IP, 4) * lick) }); }
      burn(e, f, dur, del);
    }
    for (j = 0; j < 3; j++) {                                              // 3 embers drift up, sway and wink out
      var d = H * PHI * (1 + j * IP), ed = life * (IP * IP + j * Math.pow(IP, 3)), el = life * IP;   // phi: each higher and later
      e = bit('ec-em', '', 0, 0, S * Math.pow(IP, 4)); f = [];
      for (i = 0; i <= 8; i++) { var q = i / 8; f.push({ offset: q, transform: T(x + (jit(i, j + 3) * IP + dx * q) * S * IP, base - d * q, 0, 0, 1 - IP * q), opacity: q > 0 && q < 1 ? (i % 3 ? 1 : IP) * (1 - q * q) : 0 }); }   // phi: sparks out of the fire, winks (every third frame dims to PHI^-1), fades as q^2
      burn(e, f, el, ed);
    }
    var gp = cur; setTimeout(function () { var o = cur; cur = gp && gp.isConnected ? gp : null; puffs(x, base - H * IP, S, dx, kk); cur = o; }, life * (1 - Math.pow(IP, 3)));   // phi: collapses into the smoke as the last PHI^-3 of the burn dies
  }
  // ---------- energy, ringing, chains, the rocket on fire (rockethit, Danny 19:42 / 19:44 AWST 26 Oct) ----------
  var cur = null, booms = [], DB = [], pairs = 0, gens = {}, RD = IP, RC = PHI * PHI, NR = 0;   // phi: ring depth PHI^-1; the knocked-off emoji rings PHI^2 times over its PHI^2 s life, its effect PHI x as fast (they beat); keys: one per tick
  function done(e) { var p = e.parentNode; e.remove(); if (p && p !== L && !p.firstChild && p._end) p.remove(); }
  function ring(E, u, c) { return E * Math.exp(-PHI * u) * (1 - u) * (1 + RD * Math.cos(TAU * c * u)) / (1 + RD); }   // phi: damped, ringing c times over its life; 1 at the hit for E = 1
  function keys(ms) { return Math.max(1, Math.ceil(ms / TICK)); }          // unit: one key per collide tick (PHI^-6 s) of the animation
  function group(x, y, E, ms) {                                            // the effect's pieces share one ringing envelope (size about the impact point + opacity)
    var g = doc.createElement('div'), f = [], i; g.className = 'ec-g'; L.appendChild(g);
    for (i = 0, NR = keys(ms); i <= NR; i++) { var u = i / NR, a = ring(E, u, RC * PHI * PHI); f.push({ offset: u, transform: 'translate(' + x + 'px,' + y + 'px) scale(' + a + ') translate(' + -x + 'px,' + -y + 'px)', opacity: Math.min(1, a) }); }
    g.animate(f, { duration: ms, easing: 'linear', fill: 'forwards' }).onfinish = function () { g._end = true; if (!g.firstChild) g.remove(); };
    return g;
  }
  function spinPath(x, y, dx, dy, S, w) { return function (v) { return [x + dx * S * PHI * PHI * v, y + dy * S * PHI * v + innerHeight * IP * v * v]; }; }   // unit: across ~ t, gravity ~ t^2 (the spin-out's projectile)
  var KEEP = { spin: 1, burst: 1, smoke: 1 };                                  // non-destructive outcomes: the emoji survives (and may chain); flames + vaporise are the end of the line
  function ke(b) { return b.r * b.r * (b.vx * b.vx + b.vy * b.vy); }           // rule 15: mass ~ drawn area (r^2), speed measured from its own motion
  function slidePath(x, y, dx, dy, S, w) { return function (v) { var q = 1 - (1 - v) * (1 - v), d = S * PHI * PHI * (1 + w) * q; return [x + dx * d, y + dy * d]; }; }   // phi: deflected PHI^2 (1 + w) sizes, slowing (ease-out)
  // the emoji knocked off: a drawn copy on the spin-out (or deflection) path, size + opacity on the ringing envelope at f; it stays live with E PHI^-1
  function knock(b, dx, dy, w, E, gen, pair, spin, live) {
    var S = Math.max(b.fs, 1), S0 = b.rk ? S / E : S, ms = MS * PHI * PHI * k(), P = (spin ? spinPath : slidePath)(b.x, b.y, dx, dy, S, w), sp = (dx >= 0 ? 1 : -1) * TAU * (spin ? PHI * PHI * (1 + w) : IP), e = bit('', glyphOf(b), 0, 0, S0), f = [], i;   // rocketboom: the rocket's copy starts at its drawn size and shrinks on its energy   // phi: spin-out PHI^2 turns, a deflection PHI^-1 turn
    for (i = 0, NR = keys(ms); i <= NR; i++) { var v = i / NR, p = P(v), a = ring(E, v, RC); f.push({ offset: v, transform: T(p[0], p[1], 0, sp * v * v, a), opacity: Math.min(1, a) }); }
    var an = fly(e, f, ms, 'linear');
    if (live && E * IP >= IP * IP) DB.push({ virt: true, el: e, hide: e, an: an, E: E * IP, gen: gen, pair: pair, rk: b.rk, kd: '', x: 0, y: 0, r: 0, t: 0, px: 0, py: 0, vx: 0, vy: 0, until: performance.now() + MS * Math.pow(IP, 3) });   // phi: live after PHI^-3 s, while E PHI^-1 >= PHI^-2
    return P;
  }
  function rocket(b, dx, dy, w, E, gen, pair) {                            // the rocket spins out on fire
    var S = Math.max(b.fs, 1), S0 = S / E, ms = MS * PHI * PHI * k(), x = b.x, y = b.y, P = knock(b, dx, dy, w, E, gen, pair, true, true), i, j, e, f;   // rocketboom (Danny 20:23): S = its drawn size now; the spun-out rocket stays live, E PHI^-1, smaller, and explodes again (smaller) if it hits
    booms.push({ S: S, E: E, x: x, y: y, gen: gen }); if (booms.length > 8) booms.shift();   // info(): the last explosions' drawn size + energy
    if (RM) return;
    e = doc.createElement('i'); e.className = 'ec-th'; e.style.width = S0 * IP + 'px'; e.style.height = S0 * PHI + 'px'; L.appendChild(e); f = [];   // phi: a flame rides it
    for (i = 0, NR = keys(ms); i <= NR; i++) { var v = i / NR, p = P(v), a = ring(E, v, RC); f.push({ offset: v, transform: 'translate(' + p[0] + 'px,' + (p[1] + S0 * a * IP * IP) + 'px) translate(-50%,-100%) rotate(' + jit(i, 1) * TAU / 34 + 'rad) scale(' + a * (1 - Math.pow(IP, 3) * (1 + jit(i, 2)) / 2) + ')', opacity: Math.min(1, a) }); }   // phi: 1/34 turn flicker, PHI^-3 lick
    burn(e, f, ms);
    var np = Math.round(PHI * PHI * (1 + E));                               // phi: puffs from the energy (5 at E = 1)
    for (j = 0; j < np; j++) {                                             // rocketboom: drawn smoke FOLLOWS the rocket, each puff PHI^-5 of the flight further behind, sized to the rocket's size now
      var lag = (j + 1) * Math.pow(IP, 5); e = bit('ec-puff', '', 0, 0, S0); f = [];
      for (i = 0, NR = keys(ms); i <= NR; i++) { var u = i / NR, tt = Math.max(0, u - lag), q = P(tt), a2 = ring(E, u, RC);   // unit: a2 = the rocket's own scale at this instant
        f.push({ offset: u, transform: T(q[0], q[1] - S0 * a2 * IP * (u - tt) / lag * IP, 0, 0, a2 * (1 + j * IP * IP)), opacity: Math.min(1, a2 / E) * (1 - Math.pow(IP, 3)) * Math.pow(IP, j * IP) }); }   // phi: rises PHI^-2 of the rocket's size, older puffs PHI^-2 wider and fainter
      burn(e, f, ms);
    }
    e = bit('ec-fg', '', 0, 0, S * PHI); f = [];                            // the fireball blooms at the impact and trails at PHI^-3
    for (i = 0, NR = keys(ms); i <= NR; i++) { var uu = i / NR, r = P(uu), a3 = ring(E, uu, RC * PHI), bl = uu < Math.pow(IP, 4) ? uu / Math.pow(IP, 4) : 1;   // phi: blooms over PHI^-4 of its life
      f.push({ offset: uu, transform: T(x + (r[0] - x) * Math.pow(IP, 3), y + (r[1] - y) * Math.pow(IP, 3), 0, 0, (IP * IP + (PHI - IP * IP) * bl) * a3), opacity: Math.min(1, a3 * PHI) }); }   // phi: PHI^-2 -> PHI of its size
    burn(e, f, ms);
    var ns = Math.round(PHI * (1 + E));                                     // phi: sparks from the energy (3 at E = 1)
    for (j = 0; j < ns; j++) { var an2 = TAU * (j / ns + IP), dd = S * PHI * (1 + w); e = bit('ec-dot', '', 0, 0, S * IP * IP);   // phi: 3 sparks off the fireball
      fly(e, [{ transform: T(x, y), opacity: 1 }, { transform: T(x + Math.cos(an2) * dd, y + Math.sin(an2) * dd, 0, 0, IP), opacity: 0 }], MS * k(), 'cubic-bezier(0,' + IP + ',' + IP + ',1)'); }
  }
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
    } else if (fx === 'flames') {                                          // real fire (firefx, Danny 19:10 AWST 26 Oct): glow + licking tongues + embers, burns down into the smoke
      fire(b, x, y, S, dx, dy, w, kk);
    } else if (fx === 'smoke') {
      puffs(x, y, S, dx, kk);
    } else {                                                               // spin-out: the emoji tumbles away (knock(), spin path) - here only a glancing scrape
      for (i = 0, n = Math.round(PHI * (1 + w)); i < n; i++) { a = Math.atan2(dy, dx) + Math.PI + (i - (n - 1) / 2) * TAU * Math.pow(IP, 5); d = S * (1 + i * IP);   // phi: 3 scrape sparks thrown back, 1/13 turn apart
        e = bit('ec-dot', '', 0, 0, S * Math.pow(IP, 3)); fly(e, [{ transform: T(x, y), opacity: 1 }, { transform: T(x + Math.cos(a) * d, y + Math.sin(a) * d, 0, 0, IP), opacity: 0 }], MS * IP * kk, 'cubic-bezier(0,' + IP + ',' + IP + ',1)'); }
    }
  }
  root.EmojiCollide = { info: function () { return { bodies: B.length, hits: count, made: made, last: lastInfo, live: live, debris: DB.length, gens: gens, booms: booms }; },
    chains: function () { return DB.map(function (q) { return { E: q.E, gen: q.gen, x: Math.round(q.x), y: Math.round(q.y) }; }); },   // debug: knocked-off emojis still live
    test: function (fx, x, y, s) { play(fx || 'burst', { x: x || innerWidth / 2, y: y || innerHeight / 2, fs: s || 32, el: { textContent: '\uD83D\uDEF8' } }, 1, 0, 1 - IP); } };   // unit: debug only, centre of the screen
  scan(); go();
})();
