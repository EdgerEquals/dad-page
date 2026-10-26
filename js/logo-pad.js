/* LOGO PAD (Danny 16:39 / 16:40 AWST 26 Oct 2026: "when I open my logo I can move the sign around and tie where I move it, all the degrees
   of freedom, into our fundamental axes going to each corner of the screen, like a Kaoss pad that modulates my FX" - the dashboard music's
   own effects). Loaded by js/logo-radio.js the first time the logo zoom opens (no cost before that).
   Drag the opened sign (touch or pointer). Its displacement is read in the PhiAxes frame (js/phi-axes.js): a along axis A (top-left ->
   bottom-right), b along axis B (top-right -> bottom-left), each -1 .. 1 at the corners; distance r and angle th are two more freedoms.
   So each corner is its own FX extreme, on top of the DJ's pumped values (js/dj-fx.js DadAutoDJ.fx.pad):
     top-left     filter opens to high-pass          bottom-right  filter closes to low-pass       filter = -sgn(a) |a|^PHI
     top-right    echo                               bottom-left   wash (reverb)                    echo = max(0,-b)^PHI, wash = max(0,b)^PHI
     distance     crush rises near the edges          crush = r^(PHI^2) x PHI^-1
     between axes flanger (strongest on the edge midpoints, where the two axes share the move)   flw = |sin 2 th| x r^PHI; sweep rate rises with r
   The FX glide (tau PHI^-4 s in the chain) so nothing zips; updates ride the frame clock. On release the sign springs home along the axes
   (damped spring, period PHI^-1 s, damping ratio PHI^-2: one small overshoot) and the FX follow it home to the pumped values.
   The sign answers in lockstep: --atom-r (the zoom's saturation / glow rung) and a ring-spread scale (up to PHI^-4) grow with r; it stays on
   screen and clear of the close X.
   A press that never moves past PHI^-5 of the sign's size is a tap and does exactly what it did before. While a drag runs, the radio is
   brought up from under the zoom (LogoRadio.release) so he hears what he is playing. API (tests): LogoPad.info() */
(function (root, doc) {
  'use strict';
  if (root.LogoPad) return;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, MS = 1e3;                        // phi: the golden ratio, the sole scaling factor
  var S = { a: 0, b: 0, drag: false, id: null, x0: 0, y0: 0, a0: 0, b0: 0, moved: false, raf: 0, t: 0, fig: null, sent: null };
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function fx() { var D = root.DadAutoDJ; return D && D.fx && D.fx.pad ? D.fx : null; }
  function frame() {                                                               // PhiAxes frame; before js/phi-axes.js lands, the true diagonals of the window
    if (root.PhiAxes && PhiAxes.frame && PhiAxes.frame.a.h) return PhiAxes.frame;
    var w = innerWidth, h = innerHeight, L = Math.sqrt(w * w + h * h) || 1;
    return { w: w, h: h, a: { x: w / L, y: h / L, h: L / 2 }, b: { x: -w / L, y: h / L, h: L / 2 } }; }
  function dirAB(a, b) { var F = frame(); return { x: a * F.a.h * F.a.x + b * F.b.h * F.b.x, y: a * F.a.h * F.a.y + b * F.b.h * F.b.y }; }
  function toAB(dx, dy) {                                                          // a screen displacement -> (a, b) in the axes frame
    var F = frame();
    var ax = F.a.x * F.a.h, ay = F.a.y * F.a.h, bx = F.b.x * F.b.h, by = F.b.y * F.b.h, det = ax * by - ay * bx;
    if (!det) return { a: 0, b: 0 }; return { a: (dx * by - dy * bx) / det, b: (ax * dy - ay * dx) / det };
  }
  function dof() { var r = clamp(Math.sqrt(S.a * S.a + S.b * S.b), 0, 1), th = Math.atan2(S.b, S.a); return { r: r, th: th }; }
  function mapping() {                                                             // every term a ratio or a phi curve of the position
    var d = dof(), a = S.a, b = S.b;
    return { filter: -Math.sign(a) * Math.pow(Math.abs(a), PHI), echo: Math.pow(Math.max(0, -b), PHI), wash: Math.pow(Math.max(0, b), PHI),
      crush: Math.pow(d.r, PHI * PHI) * IP, flw: Math.abs(Math.sin(2 * d.th)) * Math.pow(d.r, PHI), r: d.r };
  }
  function paint() {                                                               // the sign, in lockstep with the FX
    var f = S.fig; if (!f) return; var d = dof(), p = dirAB(S.a, S.b), F = frame(), k = 1 + d.r * Math.pow(IP, 4);   // phi: ring spread up to PHI^-4
    if (F && F.w) { var w = f.offsetWidth * k, h = f.offsetHeight * k, g = Math.min(F.w, F.h) * Math.pow(IP, 6), mx = Math.max(0, (F.w - w) / 2 - g), my = Math.max(0, (F.h - h) / 2 - g);   // phi: a PHI^-6 margin of the short side   // the sign stays on screen (the finger keeps going to the corners)
      var xb = doc.querySelector('.dmz-x'), top = xb ? xb.getBoundingClientRect().bottom : 0, cy = (F.cy != null ? F.cy : F.h / 2);   // and never covers the close X
      p = { x: clamp(p.x, -mx, mx), y: clamp(p.y, Math.min(my, Math.max(-my, top + h / 2 - cy)), my) }; }
    f.style.translate = p.x.toFixed(1) + 'px ' + p.y.toFixed(1) + 'px';            // unit: css px
    f.style.scale = String(k);
    f.style.setProperty('--atom-r', String(1 + d.r * PHI));                        // phi: excitation up to PHI rungs over the clean atom
  }
  function send(force) {
    var X = fx(); if (!X) return; var m = mapping(), o = S.sent, q = Math.pow(IP, 8);   // phi: skip changes under PHI^-8
    if (!force && o && ['filter', 'echo', 'wash', 'crush', 'flw'].every(function (k) { return Math.abs(m[k] - o[k]) < q; })) return;
    S.sent = m; try { X.pad(m); } catch (e) {}
  }
  function home() {                                                                // release: damped spring home along the axes, solved exactly
    cancelAnimationFrame(S.raf); var t0 = performance.now(), a0 = S.a, b0 = S.b;     // (closed form from the release point, so a slow or skipped frame never flings it)
    var w = 2 * Math.PI * PHI, z = IP * IP, wd = w * Math.sqrt(1 - z * z);          // phi: period PHI^-1 s, damping ratio PHI^-2
    (function step(now) {
      var t = (now - t0) / MS, e = Math.exp(-z * w * t), k = e * (Math.cos(wd * t) + z * w / wd * Math.sin(wd * t));
      S.a = a0 * k; S.b = b0 * k;
      if (e < Math.pow(IP, 10)) { S.a = S.b = 0; paint(); clear(); return; }      // phi: settled under PHI^-10
      paint(); send(); S.raf = requestAnimationFrame(step);
    })(t0);
  }
  function clear() {
    var f = S.fig; if (f) { f.style.translate = ''; f.style.scale = ''; f.style.removeProperty('--atom-r'); }
    S.sent = null; var X = fx(); if (X) try { X.pad(null); } catch (e) {}           // FX glide back to the DJ's own pumped values
  }
  function down(e) {
    var f = e.currentTarget; if (S.drag || (e.button && e.button !== 0)) return;
    [].forEach.call(f.querySelectorAll('img'), function (im) { im.draggable = false; im.style.setProperty('-webkit-user-drag', 'none'); });   // the zoom rebuilds its image on each open
    S.fig = f; S.id = e.pointerId; S.x0 = e.clientX; S.y0 = e.clientY; S.a0 = S.a; S.b0 = S.b; S.moved = false; S.drag = true;
  }
  function move(e) {
    if (!S.drag || e.pointerId !== S.id) return;
    var dx = e.clientX - S.x0, dy = e.clientY - S.y0, f = S.fig, sz = f.getBoundingClientRect().width || 1;
    if (!S.moved) { if (Math.sqrt(dx * dx + dy * dy) < sz * Math.pow(IP, 5)) return;   // phi: a tap until it moves PHI^-5 of the sign
      S.moved = true; cancelAnimationFrame(S.raf); try { f.setPointerCapture(S.id); } catch (er) {}
      try { root.LogoRadio && LogoRadio.release && LogoRadio.release(); } catch (er) {} }
    e.preventDefault();
    var v = toAB(dx, dy); S.a = clamp(S.a0 + v.a, -1, 1); S.b = clamp(S.b0 + v.b, -1, 1);
    if (!S.t) S.t = requestAnimationFrame(function () { S.t = 0; paint(); send(); });   // one update per frame
  }
  function up(e) {
    if (!S.drag || e.pointerId !== S.id) return; S.drag = false;
    if (!S.moved) return;                                                          // a tap: untouched
    try { S.fig.releasePointerCapture(S.id); } catch (er) {}
    var stop = function (ev) { ev.stopPropagation(); ev.preventDefault(); }; doc.addEventListener('click', stop, true); setTimeout(function () { doc.removeEventListener('click', stop, true); }, 0);   // the drag's own click never closes the zoom
    home();
  }
  function attach(fig) {
    if (!fig || fig.__pad) return; fig.__pad = 1; fig.style.touchAction = 'none'; fig.style.webkitUserSelect = fig.style.userSelect = 'none';
    fig.addEventListener('dragstart', function (e) { e.preventDefault(); });         // the logo image must not start a native image drag (it swallows the pointer)
    fig.style.setProperty('-webkit-user-drag', 'none');
    fig.addEventListener('pointerdown', down); fig.addEventListener('pointermove', move); fig.addEventListener('pointerup', up); fig.addEventListener('pointercancel', up);
  }
  function scan() { attach(doc.querySelector('.dmz .dmz-fig')); }
  scan();
  if (root.MutationObserver) new MutationObserver(function () { scan(); var o = doc.querySelector('.dmz'); if (o && o.hidden && (S.a || S.b)) { cancelAnimationFrame(S.raf); S.a = S.b = 0; S.drag = false; clear(); } })
    .observe(doc.body, { childList: true, attributes: true, subtree: true, attributeFilter: ['hidden'] });
  root.LogoPad = { info: function () { var d = dof(); return { a: S.a, b: S.b, r: d.r, th: d.th, drag: S.drag, moved: S.moved, map: mapping(), fx: fx() ? fx().padding : null }; } };
})(window, document);
