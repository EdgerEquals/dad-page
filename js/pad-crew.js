/* PAD CREW, first cut (padcrew1; Danny t341u 16 Nov 2026): two original pixel-art
   workers come out after a rocket crash and busy themselves around the launch pad,
   then leave when the next launch starts. Loaded on the first crash only
   (js/rocket-launch.js stopLoop). Not Nintendo likenesses: overalls and caps in the
   page palette, a ladder prop, no moustaches, no M/L marks.
     FRAMES   media/pad-crew.webp, two 16 px rows of 8 frames, lossless; image-rendering
              pixelated, WAAPI steps() (as js/emoji-alive.js). Frame time PHI^-4 s.
     PLACE    the rocket's HOME pad (js/rocket-launch.js launch() x0, bottom of the view),
              never the wreck's current box. They wander a PHI^2-size of their drawn
              size about a point just beside the pad, opposite phases so they meet.
     COLLIDE  two nodes .pad-crew-w, data-ec padcrew-a / padcrew-b (different, so they
              can bump). js/emoji-collide.js lists them. pointer-events none.
     REDUCE   nothing loads or plays. */
(function () {
  'use strict';
  var doc = document, root = window;
  if (root.PadCrew) return;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, TAU = 2 * Math.PI, MS = 1e3;
  var RM = root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var N = 8, CELL = 16, FRAME = MS * Math.pow(IP, 4);                     // phi: PHI^-4 s a frame
  var SRC = 'media/pad-crew.webp?v=padcrew1';
  var css = '.pad-crew{position:fixed;inset:0;z-index:2147483645;pointer-events:none;overflow:hidden;contain:strict}' +
    '.pad-crew-w{position:absolute;left:0;top:0;overflow:hidden;line-height:0;contain:strict;' +
      'image-rendering:-webkit-optimize-contrast;image-rendering:pixelated;image-rendering:crisp-edges}' +
    '.pad-crew-s{position:absolute;left:0;top:0;height:100%;background-repeat:no-repeat;will-change:transform}';
  var st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);
  var L = null, W = [], raf = 0, on = false, want = false, t0 = 0, imgOk = false, fade = [];

  function pad() {
    var el = doc.getElementById('rk1'), A = root.PhiAxes;
    var L0 = A && A.frame ? A.frame.x0 : 0;
    var x0 = L0 + ((A && A.at ? A.at(0, 1 - 2 * Math.pow(IP, 4)).x : innerWidth * Math.pow(IP, 4)) - L0) / 2;
    var S0 = el ? (parseFloat(getComputedStyle(el).fontSize) || CELL * 2) : CELL * 2;
    var sc = Math.max(2, Math.round(S0 / CELL) || 2), S = CELL * sc;
    return { x0: x0, cx: x0 + S0 / 2, S: S, S0: S0 };
  }
  function range() {
    var p = pad(), half = p.S / 2, lo = half + 4, hi = innerWidth - half - 4;
    var amp = Math.min(Math.max(0, (hi - lo) / 2), Math.pow(PHI, 2) * p.S), mid = p.cx;
    if (mid - amp < lo) mid = lo + amp; if (mid + amp > hi) mid = hi - amp;
    return { mid: mid, amp: amp, y: innerHeight - p.S, S: p.S, cx: p.cx };
  }
  function layer() {
    if (L) return L;
    L = doc.createElement('div'); L.className = 'pad-crew'; L.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(L); return L;
  }
  function mount() {
    if (W.length) return;
    var i, o, s, row;
    for (i = 0; i < 2; i++) {
      o = doc.createElement('span'); o.className = 'pad-crew-w'; o.dataset.ec = i ? 'padcrew-b' : 'padcrew-a';
      s = doc.createElement('span'); s.className = 'pad-crew-s';
      s.style.width = (N * 100) + '%';
      s.style.backgroundImage = 'url(' + SRC + ')';
      row = i ? '100%' : '0%';
      s.style.backgroundSize = '100% 200%';
      s.style.backgroundPosition = '0 ' + row;
      o.appendChild(s); layer().appendChild(o);
      W.push({ o: o, s: s, an: null, x: 0, y: 0, dir: 1, row: i });
    }
  }
  function play(w) {
    if (w.an) { try { w.an.cancel(); } catch (e) {} }
    w.an = w.s.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }],
      { duration: N * FRAME, iterations: Infinity, easing: 'steps(' + N + ')' });
  }
  function place(w, x, y, dir) {
    w.x = x; w.y = y; w.dir = dir;
    w.o.style.transform = 'translate3d(' + (x - w.o.offsetWidth / 2) + 'px,' + y + 'px,0) scaleX(' + dir + ')';
  }
  function tick(now) {
    raf = 0; if (!on) return;
    var r = range(), T = Math.pow(PHI, 2) * MS, i, x, ph, vx;          // phi: a wander cycle PHI^2 s
    if (!t0) t0 = now;
    for (i = 0; i < W.length; i++) {
      ph = TAU * ((now - t0) / T) + (i ? Math.PI : 0);
      x = r.mid + r.amp * Math.sin(ph);
      vx = Math.cos(ph);
      W[i].o.style.width = W[i].o.style.height = r.S + 'px';
      place(W[i], x, r.y, vx >= 0 ? 1 : -1);
    }
    raf = requestAnimationFrame(tick);
  }
  function show(v) {
    W.forEach(function (w) { w.o.style.visibility = v ? 'visible' : 'hidden'; w.o.style.opacity = v ? '1' : '0'; });
    if (L) L.style.visibility = v ? 'visible' : 'hidden';
  }
  function arrive() {
    if (RM || !want || !imgOk) return;
    mount();
    fade.forEach(function (a) { try { a.cancel(); } catch (e) {} }); fade = [];
    var r = range();
    W.forEach(function (w, i) {
      w.o.classList.remove('ec-gone');
      w.o.style.width = w.o.style.height = r.S + 'px';
      place(w, r.mid + r.amp * (i ? 1 : -1), r.y, i ? -1 : 1);
      play(w);
    });
    show(true);
    W.forEach(function (w) {
      var a = w.o.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MS * IP, easing: 'ease-out' }); fade.push(a);
    });
    on = true; t0 = 0; if (!raf) raf = requestAnimationFrame(tick);
  }
  function leave() {
    if (!W.length) { on = false; return; }
    on = false; if (raf) cancelAnimationFrame(raf); raf = 0;
    fade.forEach(function (a) { try { a.cancel(); } catch (e) {} }); fade = [];
    W.forEach(function (w) {
      var a = w.o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: MS * IP, easing: 'ease-in', fill: 'forwards' });
      a.onfinish = a.oncancel = function () { w.o.style.visibility = 'hidden'; try { w.an && w.an.cancel(); } catch (e) {} };
      fade.push(a);
    });
  }

  function ready(cb) {
    if (imgOk) { cb(); return; }
    var im = new Image();
    im.onload = function () { imgOk = true; cb(); };
    im.onerror = function () { imgOk = false; };
    im.src = SRC;
  }

  root.PadCrew = {
    arrive: function () { want = true; if (RM) return; ready(arrive); },
    leave: function () { want = false; leave(); },
    info: function () {
      return { on: on, loaded: imgOk, frame: FRAME / MS, size: W[0] ? W[0].o.offsetWidth : 0,
        workers: W.map(function (w) { return { ec: w.o.dataset.ec, x: Math.round(w.x), y: Math.round(w.y), dir: w.dir, vis: w.o.style.visibility, op: w.o.style.opacity }; }) };
    }
  };
})();
