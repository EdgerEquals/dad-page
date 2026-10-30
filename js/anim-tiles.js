/* anim-tiles.js: the background animations' views, opened by tapping the animation itself (Danny 10:37 AWST 30 Oct 2026, t283u: "remove anything
   that's on the main content page ... I should be able to get to all of that by pressing on the actual thing on the screen"). Was one label
   tile per animation beside the logo card (Danny 10:08 AWST 27 Oct, t270u); the tiles are gone, the views and the desk side stay.
   ONE TAP on a piece of an animation (a falling-star streak, the comet, the rocket, the Sun or its planets, Earth / Moon / satellite / astronaut,
   the telescope or dish, a spinning star, the ring's planet / satellite / moon) opens that animation alone through js/anim-solo.js, fetched on
   the first such tap only, in the content box (js/home-windows.js). One tap closes it.
   DIRECT LINK: index.html#anim=<key> (e.g. #anim=rain for the falling stars) opens that animation as soon as the page has it. */
(function (root, doc) {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2, de = doc.documentElement;
  var V = 'cbox1';                                                                    // cache key for js/anim-solo.js
  var A = [                                                                           // key, glyph, name (keys = the #anim= link)
    ['rain', '\uD83C\uDF20', 'Falling stars'], ['comet', '\u2604\uFE0F', 'Comet'], ['rocket', '\uD83D\uDE80', 'Rocket'],
    ['critters', '\uD83D\uDC1E', 'Critters'], ['sun', '\u2600\uFE0F', 'Sun & planets'], ['earth', '\uD83C\uDF0D', 'Earth & Moon'],
    ['ping', '\uD83D\uDCE1', 'Dish ping'], ['sky', '\u2728', 'Star spin'], ['ring', '\uD83E\uDE90', 'Space ring'],
    ['matrix', '\uD83D\uDFE9', 'Matrix rain'], ['code', '\uD83D\uDCDC', 'Code drift'], ['loop', '\uD83C\uDF9E\uFE0F', 'Space loop']];
  // DESK, VISUAL SIDE (Danny 18:15 AWST 27 Oct 2026, Claude chat: 'a duplicate page but for the visual layer, again with visual reference to
  // the actual emoji that represent that node or the animation'): Ed's desk (js/dj-desk.js) sets per animation MUTE / SOLO (its pieces
  // hidden by visibility, so every clock and path keeps running and the collision engine skips them, as js/anim-solo.js does) and SPEED (a
  // rung PHI^r on its CSS animations through js/ratio-pump.js's per-element factors). Saved on this device ('dadDesk.visual.v1') and applied
  // here at every load. Pieces are each animation's own (anim-solo's map without the borrowed backdrops).
  // TODO: paused on mute once the shared clock lands (Phase 1): a muted animation is hidden but still runs, unlike 'asleep costs nothing'.
  var KV = 'dadDesk.visual.v1', PIECES = { rain: ['.rain'], comet: ['.es-comet'], rocket: ['#rk1', '.rb-l'], critters: ['#foot .note'], sun: ['.pl-sun', '.pl-small', '.sm-n', '.sm-b', '.tsl-layer'],
    earth: ['.pl-big', '.pl-moon', '.pl-sat', '.pl-ast'], ping: ['.pl-scope', '.pl-dish'], sky: ['.es-layer'], ring: ['.qs-layer'], matrix: ['#mxrain'], code: ['.home-code'], loop: ['#bgloop', '.bgloop-still'] };
  var vSt = null, vSp = {};
  function vload() { try { return JSON.parse(localStorage.getItem(KV) || '{}') || {}; } catch (e) { return {}; } }
  function deskApply(st) {
    st = st || vload(); var m = st.m || {}, so = st.s || {}, sp = st.sp || {}, any = Object.keys(so).some(function (k) { return so[k]; }), css = '';
    function hid(k) { return !!m[k] || (any && !so[k]); }
    Object.keys(PIECES).forEach(function (k) { if (hid(k)) css += PIECES[k].join(',') + '{visibility:hidden!important}'; });
    if (hid('sky') && !hid('comet')) css += '.es-comet:not(.ec-gone){visibility:visible!important}';   // the comet rides inside the star layer
    if (!vSt) { vSt = doc.createElement('style'); vSt.id = 'desk-visual'; doc.head.appendChild(vSt); } vSt.textContent = css;
    var RP = root.RatioPump, inf = RP && RP.info && RP.info(), slow = inf && inf.slow;
    if (slow) { Object.keys(PIECES).forEach(function (k) { var f = Math.pow(PHI, +sp[k] || 0), e = vSp[k]; if (!e) { if (f === 1) return; e = vSp[k] = [PIECES[k].join(','), f]; slow.push(e); } e[1] = f; }); try { RP.refresh(); } catch (e2) {} }
  }
  root.AnimTiles = { list: A.map(function (a) { return a[0]; }), open: open, hit: function (x, y) { var m = hit(x, y); return m && m[0]; }, pieces: PIECES, desk: function (st) { try { localStorage.setItem(KV, JSON.stringify(st)); } catch (e) {} deskApply(st); }, deskState: vload };
  (function () { var st = vload(); if (st && (st.m || st.s || st.sp)) { if (root.RatioPump) deskApply(st); else setTimeout(function () { deskApply(st); }, 0); } })();
  var wait = [], loading = 0;
  function solo(cb) {                                                                 // fetch js/anim-solo.js once, on demand
    if (root.AnimSolo) { cb(); return; }
    wait.push(cb); if (loading) return; loading = 1;
    var s = doc.createElement('script'); s.src = 'js/anim-solo.js?v=' + V; s.async = true;
    s.onload = function () { wait.splice(0).forEach(function (f) { if (root.AnimSolo) f(); }); };
    s.onerror = function () { loading = 0; wait.length = 0; };
    doc.head.appendChild(s);
  }
  function find(k) { for (var i = 0; i < A.length; i++) if (A[i][0] === k) return A[i]; return null; }
  function open(k, from) { var a = find(k); if (!a) return; solo(function () { root.AnimSolo.open(a[0], a[2], from); }); }

  // ON-SCREEN TAPS (Danny 10:37 AWST 30 Oct 2026, t283u: 'I should be able to get to all of that by pressing on the actual thing on the screen'):
  // the tiles are gone; a tap on the background that lands on (or near) one of an animation's own pieces opens that animation's view. The
  // pieces are pointer-events none, so they are found by their boxes: every leaf element of a piece (a glyph, a streak) that is showing; each
  // box is grown to at least T = PHI^-4 of the viewport's short side (a fingertip: Apple's 44 pt minimum target sits between PHI^-4 x 320 and
  // x 390), and the one whose centre is nearest the tap, measured in its own size, wins. Taps on buttons, links, fields, the ticker / tty /
  // footer items (QuizPopups) or an open box never get here. The full-screen textures (space loop, code drift, matrix rain) have no piece to
  // tap; they stay on Ed's desk (Visual) and their #anim= links.
  var TAPS = { rain: ['.rain>i'], comet: ['.es-comet'], rocket: ['#rk1>i'], sun: ['.pl-sun', '.pl-small', '.tsl-layer>*'],
    earth: ['.pl-big', '.pl-moon', '.pl-sat', '.pl-ast'], ping: ['.pl-scope', '.pl-dish'], sky: ['.es-layer>*:not(.es-comet)'], ring: ['.qs-layer>*'] };
  var ROOTS = /^(HTML|BODY|MAIN)$/;
  function showing(el) { if (el.classList && el.classList.contains('ec-gone')) return false; if (el.checkVisibility) return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    for (var p = el; p && p !== doc.body; p = p.parentElement) { var cs = getComputedStyle(p); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; } return true; }
  function leaves(el, out) { var c = el.children; if (!c.length) { out.push(el); return; } for (var i = 0; i < c.length; i++) leaves(c[i], out); }
  function hit(x, y) {
    var T = Math.min(innerWidth, innerHeight) * Math.pow(PHI, -4), best = null, bs = Infinity;                       // phi: the fingertip
    Object.keys(TAPS).forEach(function (k) {
      TAPS[k].forEach(function (sel) {
        var els = doc.querySelectorAll(sel), all = [];
        for (var i = 0; i < els.length; i++) leaves(els[i], all);
        all.forEach(function (el) {
          var b = el.getBoundingClientRect(); if (!b.width && !b.height) return;
          var w = Math.max(b.width, T), h = Math.max(b.height, T), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
          var dx = Math.abs(x - cx) / (w / 2), dy = Math.abs(y - cy) / (h / 2); if (dx > 1 || dy > 1) return;
          var sc = Math.max(dx, dy); if (sc < bs && showing(el)) { bs = sc; best = [k, el]; }
        });
      });
    });
    return best;
  }
  function boxOpen() { var q = doc.getElementById('qp-pop'), z = root.LogoZoom;
    return (q && !q.hidden) || (z && z.isOpen && z.isOpen()) || de.hasAttribute('data-desk') || de.hasAttribute('data-solo'); }
  var DN = null;                                                                       // where the tap went down, and whether a box was open then
  root.addEventListener('pointerdown', function (e) { DN = e.isPrimary ? [e.clientX, e.clientY, boxOpen()] : null; }, { passive: true, capture: true });   // window capture: before any box closes itself on this tap
  ['home-main', 'q-head', 'foot'].forEach(function (id) { var el = doc.getElementById(id); if (el) el.addEventListener('click', function () {}); });   // iOS sends a click from a plain element only when something on its path listens
  doc.addEventListener('click', function (e) {
    var t = e.target, d = DN; DN = null;
    if (e.defaultPrevented || !t || (d && d[2]) || boxOpen()) return;                   // that tap was closing a box
    if (!ROOTS.test(t.tagName) && t.closest && t.closest('button,a,input,label,select,textarea,[role],[tabindex],.qp-trig,#q-head .tick,#foot .tty')) return;
    if (t.closest && !ROOTS.test(t.tagName) && !t.closest('#q-head,#foot,#home-main')) return;
    var m = hit(e.clientX, e.clientY); if (!m) return;
    try { root.PhiAdapt && PhiAdapt.signal('anim-tap', 't'); } catch (x) {}
    open(m[0], null);
  });
  function hash() { var m = /^#anim=([a-z]+)/.exec(location.hash || ''); return m ? m[1] : ''; }
  function fromHash() { var k = hash(); if (k && find(k) && !(root.AnimSolo && AnimSolo.current() === k)) open(k, null); }
  root.addEventListener('hashchange', fromHash);
  fromHash();
})(window, document);
