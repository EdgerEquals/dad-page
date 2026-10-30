/* ROCKET LIFTOFF BLAST (rocketblast, Danny 19:51 AWST 26 Oct 2026: "add one of your animations to the point where it actually takes off so
   there's an explosion and then it takes off"). At the end of the pad time a drawn launch blast plays at the pad, under the rocket, and the
   rocket climbs out of it. The pieces are the drawn effects of js/emoji-collide.js (its burst glow + sparks, the firefx tongues from 28c89c1
   and its smoke puffs), same gradients, same blackbody colours, same golden-sequence jitter, but in this file's own small layer so it never
   touches the collision engine (which loads later and is being worked on separately). 1 glow, 5 tongues, 8 sparks, 5 puffs (Fibonacci),
   transform + opacity WAAPI only, removed when done. It syncs to the climb animation itself (the inline #rk1 'rkY' keyframe on the first
   launch, js/rocket-launch.js's WAAPI climb after), so it fires exactly at liftoff. Nothing under reduced motion or with no WAAPI. */
(function () {
  'use strict';
  var doc = document, root = window;
  if (!doc.body || !Element.prototype.animate || (root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, TAU = 2 * Math.PI, MS = 1e3;   // phi; unit: a turn, ms per s
  var css = '.rb-l{position:fixed;inset:0;z-index:2147483646;pointer-events:none;overflow:hidden;contain:strict}' +   // unit: just under the launcher's top layer
    '.rb-l>i{position:absolute;left:0;top:0;will-change:transform,opacity;font-style:normal}' +
    // the following five are js/emoji-collide.js's drawn pieces (copied, not shared, so neither file waits on the other)
    '.rb-dot{border-radius:50%;background:radial-gradient(circle closest-side,#fff,#ffd700 38.2%,rgba(255,99,0,.618) 61.8%,transparent)}' +   // phi: 38.2 / 61.8 stops; anchor: white-hot to the Sun glow gold
    '.rb-fg{border-radius:50%;background:radial-gradient(circle closest-side,rgba(255,209,163,.854),rgba(255,137,18,.618) 38.2%,rgba(255,56,0,.236) 61.8%,transparent)}' +   // cite: blackbody 4000 K #ffd1a3, 2000 K #ff8912, 1000 K #ff3800 (Charity, vendian.org)
    '.rb-th,.rb-tc{border-radius:50% 50% 38.2% 38.2%/76.4% 76.4% 23.6% 23.6%;transform-origin:50% 100%}' +   // phi: a flame tongue, narrow tip, round root
    '.rb-th{background:radial-gradient(ellipse 50% 100% at 50% 100%,#ffd1a3,#ffa148 38.2%,#ff6d00 61.8%,rgba(255,56,0,0))}' +   // cite: blackbody 4000 K, 2500 K, 1500 K, 1000 K
    '.rb-tc{background:radial-gradient(ellipse 50% 100% at 50% 100%,#ffa148,#ff6d00 38.2%,#ff3800 61.8%,rgba(255,56,0,0))}' +   // cite: blackbody 2500 K, 1500 K, 1000 K
    '.rb-puff{border-radius:50%;background:radial-gradient(circle closest-side,rgba(170,176,180,.618),rgba(120,126,130,.382) 61.8%,transparent)}';   // anchor: smoke grey, the rain's blue-grey
  var L = null, n = 0, fired = [];
  function layer() { if (L) return L; var st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);
    L = doc.createElement('div'); L.className = 'rb-l'; L.setAttribute('aria-hidden', 'true'); doc.body.appendChild(L); return L; }
  function jit(i, s) { var v = (i + s) * PHI; return 2 * (v - Math.floor(v)) - 1; }   // phi: golden-sequence noise, -1..1 (as emoji-collide)
  function T(x, y, r, sx, sy) { return 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) rotate(' + (r || 0) + 'rad) scale(' + sx + ',' + (sy == null ? sx : sy) + ')'; }
  function piece(cls, w, h) { var e = doc.createElement('i'); e.className = cls; e.style.width = w + 'px'; e.style.height = h + 'px'; layer().appendChild(e); return e; }
  function run(e, fr, ms, delay, ease) { var a = e.animate(fr, { duration: ms, delay: delay || 0, easing: ease || 'linear', fill: 'both' }); a.onfinish = a.oncancel = function () { e.remove(); }; return a; }
  function blast(x, y, S, kk) {                                            // x, y: the pad (rocket's base centre); S: the rocket's drawn size
    var life = MS * kk, i, j, f, e, s = ++n;                               // phi: the blast lives PHI^0 s (pumped with the climb)
    function env(u) { return u < Math.pow(IP, 4) ? u / Math.pow(IP, 4) : Math.pow(Math.max(0, (1 - u) / (1 - Math.pow(IP, 4))), IP); }   // phi: catches in PHI^-4, then burns down (firefx)
    e = piece('rb-fg', S * PHI * PHI, S * PHI * PHI);                      // flash: the burst's glow, PHI^2 sizes, swells PHI^-2 -> PHI
    run(e, [{ transform: T(x, y - S * IP * IP, 0, IP * IP), opacity: 1 }, { offset: IP * IP, transform: T(x, y - S * IP * IP, 0, 1), opacity: 1 }, { transform: T(x, y - S * IP, 0, PHI), opacity: 0 }], life * PHI, 0, 'ease-out');
    for (j = 0; j < 5; j++) {                                              // 5 tongues round the base: 3 hot straight down the middle, 2 cooler flanks flaring out along the ground
      var hot = j < 3, side = hot ? j - 1 : (j === 3 ? -1 : 1), wd = S * (hot ? IP : IP * IP), ht = S * (hot ? PHI : 1), lean = hot ? side * TAU / 34 : side * TAU / 8;   // phi: hot PHI sizes tall; flanks lean an eighth turn
      e = piece(hot ? 'rb-th' : 'rb-tc', wd, ht); f = [];
      for (i = 0; i <= 13; i++) { var v = i / 13, g = env(v), lick = (1 + jit(i, j * PHI + s)) / 2;   // phi: 13 frames (Fibonacci)
        f.push({ offset: v, transform: 'translate(' + (x + side * S * Math.pow(IP, 3) + jit(i, j + IP) * S * Math.pow(IP, 4)) + 'px,' + (y + S * IP * IP) + 'px) translate(-50%,-100%) rotate(' + (lean + jit(i, j) * TAU / 34) + 'rad) scale(' + (g * (1 - Math.pow(IP, 3) * lick)) + ',' + (g * (IP * IP + (1 - IP * IP) * lick)) + ')',
          opacity: Math.min(1, g * PHI) * (1 - Math.pow(IP, 4) * lick) }); }   // phi: as firefx: PHI^-3 / PHI^-4 lick, 1/34 turn flicker
      run(e, f, hot ? life : life * IP, hot ? life * Math.pow(IP, 5) * j : 0);
    }
    for (i = 0; i < 8; i++) {                                              // 8 sparks (Fibonacci) flung out low along the pad, the burst's sparks
      var a = -TAU / 4 + (i / 7 - 1 / 2) * (TAU / 2) * (1 - Math.pow(IP, 4)), d = S * PHI * PHI * (IP + (1 + jit(i, s)) / 2 * IP * IP);   // phi: fan just above the ground line; PHI^2 sizes out
      e = piece('rb-dot', S * IP * IP, S * IP * IP);
      run(e, [{ transform: T(x, y, 0, 1), opacity: 1 }, { offset: IP, opacity: 1 }, { transform: T(x + Math.cos(a) * d, y + Math.sin(a) * d * IP, 0, IP), opacity: 0 }], life, life * Math.pow(IP, 4), 'cubic-bezier(0,' + IP + ',' + IP + ',1)');   // phi: decelerate in the air (as the burst)
    }
    for (i = 0; i < 5; i++) {                                              // 5 smoke puffs roll out both ways along the ground and rise, the exhaust cloud the rocket climbs out of
      var sd = i % 2 ? 1 : -1, out = S * PHI * (1 + i * IP), up = S * IP * (1 + i * IP * IP);   // phi: each further out and higher
      e = piece('rb-puff', S * IP, S * IP);
      run(e, [{ transform: T(x, y, 0, IP), opacity: 1 - Math.pow(IP, 3) }, { transform: T(x + sd * out, y - up, 0, PHI * PHI), opacity: 0 }], life * PHI * PHI * (1 + i * IP * IP), life * Math.pow(IP, 3) * (1 + i * IP), 'cubic-bezier(0,' + IP + ',' + IP + ',1)');   // phi: swell PHI^2, PHI^2 s
    }
    fired.push({ at: Math.round(performance.now()), x: Math.round(x), y: Math.round(y), size: Math.round(S) });
  }
  function pad(el) { var r = el.getBoundingClientRect(), S = parseFloat(getComputedStyle(el).fontSize) || r.height; return { x: r.left + r.width / 2, y: r.bottom, S: S }; }
  function sync(climb, el, kk) {                                           // fire at the climb's start (the end of its delay = liftoff)
    if (!climb) return;
    var go = function () { var t = climb.currentTime, dl = climb.effect.getTiming().delay || 0; if (t == null) return;
      var wait = dl - t; if (wait < -MS * Math.pow(IP, 2)) return;      // phi: missed by more than PHI^-2 s (tab was hidden) -> skip
      setTimeout(function () { if (doc.hidden || climb.playState === 'idle') return; var p = pad(el); blast(p.x, p.y, p.S, kk || 1); }, Math.max(0, wait)); };
    (climb.ready || Promise.resolve()).then(go, function () {});
  }
  function adopt() {                                                       // the inline first launch (CSS keyframe rkY on #rk1)
    var el = doc.getElementById('rk1'); if (!el || !el.getAnimations) return;
    var a = el.getAnimations().filter(function (x) { return x.animationName === 'rkY'; })[0]; if (a) sync(a, el, 1);
  }
  root.RocketBlast = { sync: sync, blast: blast, info: function () { return { fired: fired.slice() }; }, note: function (f) { fired.push(f); }, kit: { piece: piece, run: run, T: T, jit: jit } };   // launchbooms: js/rocket-launch.js draws the climb explosions with these pieces in this layer and notes them here (footpush reads fired)
  adopt();
})();
