/* anim-tiles.js: one tile per background animation, beside Ed's logo card (Danny 10:08 AWST 27 Oct, t270u: "put on my dashboard a button
   for each one of the animations in the main content page ... just like how you've got my logo ... scroll down and see it large and press
   it ... move [the logo] over to the left ... another one can go next to it on the right").
   LAYOUT: the content section (.fc, js/first-content.js) becomes a grid; the logo card sits top left over 2 x 2 cells and the tiles flow
   to its right, then wrap in rows. Columns are auto-fill at PHI^-3 of the measured content unit (--fc-u / --hw-u, js/home-windows.js), gaps
   PHI^-6 of it, so an iPhone SE / 13 in portrait gets three columns and nothing spills. Same look as the logo card: transparent over black,
   palette hairline, cyan glow on hover / focus, press inside the PHI^-5 s tap rail.
   TILES ARE LABELS ONLY: an emoji glyph and a name, no images, no animation, about 3 KB. ONE TAP opens that animation alone, full screen,
   through js/anim-solo.js, which is fetched on the first tap only (or when the page opens with #anim=<key>). One tap closes it.
   DIRECT LINK: index.html#anim=<key> (e.g. #anim=rain for the falling stars) opens that animation as soon as the page has it. */
(function (root, doc) {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2;
  function r(n) { return +Math.pow(PHI, n).toFixed(4); }                              // phi rung n as a CSS number
  var V = 'anim1';                                                                    // cache key for js/anim-solo.js
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
  root.AnimTiles = { list: A.map(function (a) { return a[0]; }), open: open, pieces: PIECES, desk: function (st) { try { localStorage.setItem(KV, JSON.stringify(st)); } catch (e) {} deskApply(st); }, deskState: vload };
  (function () { var st = vload(); if (st && (st.m || st.s || st.sp)) { if (root.RatioPump) deskApply(st); else setTimeout(function () { deskApply(st); }, 0); } })();
  var U = 'var(--fc-u,var(--hw-u,min(100vw,100svh * ' + r(-1) + ')))';
  function u(n) { return 'calc(' + U + ' * ' + r(n) + ')'; }
  var T = r(-2) + 's';
  var css =
    '.fc{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,' + u(-3) + '),1fr));grid-auto-rows:1fr;gap:' + u(-6) + ';justify-content:start;' +
      'align-items:stretch;width:100%;max-width:min(100%,' + u(2) + ');margin-left:auto;margin-right:auto;box-sizing:border-box}' +
    '.fc>.fc-card{grid-column:span 2;grid-row:span 2;justify-content:center;width:100%;min-width:0}' +
    '.at-t{pointer-events:auto;-webkit-appearance:none;appearance:none;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;gap:' + u(-9) + ';min-width:0;max-width:100%;margin:0;padding:' + u(-7) + ';background:transparent;' +
      'border:1px solid rgba(31,84,120,' + r(-1) + ');border-radius:' + u(-6) + ';color:#9DBCCE;font:inherit;text-align:center;cursor:pointer;' +
      '-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:border-color ' + T + ' ease,box-shadow ' + T + ' ease,transform ' + r(-5) + 's ease}' +
    '.at-g{display:block;font-size:' + u(-5) + ';line-height:1;filter:drop-shadow(0 0 ' + u(-8) + ' rgba(10,242,255,' + r(-3) + '))}' +
    '.at-l{display:block;max-width:100%;font-size:calc(1rem * ' + r(-1 / 2) + ');line-height:' + r(-1 / 2) + ';letter-spacing:calc(1em * ' + r(-7) + ');' +
      'color:#85A6BB;overflow-wrap:normal;word-break:normal;-webkit-hyphens:manual;hyphens:manual}' +
    '@media (hover:hover){.at-t:hover{border-color:#0AF2FF;box-shadow:0 0 ' + u(-6) + ' rgba(10,242,255,' + r(-2) + ')}}' +
    '.at-t:active{transform:scale(' + (1 - r(-6)).toFixed(4) + ')}.at-t:focus{outline:none}' +
    '.at-t:focus-visible{border-color:#0AF2FF;box-shadow:0 0 0 1px #0AF2FF}' +
    'html[data-theme="light"] .at-t{border-color:rgba(31,84,120,' + r(-2) + ');color:#1F5478}html[data-theme="light"] .at-l{color:#143A57}' +
    '@media (prefers-reduced-motion:reduce){.at-t{transition:none}.at-t:active{transform:none}}';
  var st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);

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

  function build(sec) {
    if (sec.querySelector('.at-t')) return;
    A.forEach(function (a) {
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'at-t'; b.setAttribute('data-anim', a[0]);
      b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-label', 'Open the ' + a[2].toLowerCase() + ' animation');
      var g = doc.createElement('span'); g.className = 'at-g'; g.setAttribute('aria-hidden', 'true'); g.textContent = a[1];
      var l = doc.createElement('span'); l.className = 'at-l'; l.textContent = a[2];
      b.appendChild(g); b.appendChild(l); sec.appendChild(b);
      b.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        try { root.PhiAdapt && PhiAdapt.signal('anim-tiles', 't'); } catch (x) {}
        open(a[0], b);
      });
    });
  }
  function hash() { var m = /^#anim=([a-z]+)/.exec(location.hash || ''); return m ? m[1] : ''; }
  function fromHash() { var k = hash(); if (k && find(k) && !(root.AnimSolo && AnimSolo.current() === k)) open(k, doc.querySelector('.at-t[data-anim="' + k + '"]')); }
  root.addEventListener('hashchange', fromHash);
  var main = doc.getElementById('home-main');
  function attach() { var sec = doc.querySelector('.fc'); if (!sec) return false; build(sec); return true; }
  if (!attach() && main && root.MutationObserver) {                                   // the logo card's script may land after this one
    var mo = new MutationObserver(function () { if (attach()) mo.disconnect(); }); mo.observe(main, { childList: true });
  }
  fromHash();
})(window, document);
