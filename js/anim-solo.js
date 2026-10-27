/* anim-solo.js: shows ONE background animation on its own, full screen (Danny 10:08 AWST 27 Oct, t270u). Fetched by js/anim-tiles.js on
   the first tile tap or a #anim=<key> link, never at page load.
   HOW: <html data-solo="<key>"> hides every top-level layer of the page (visibility, so nothing reflows and every animation keeps its own
   clock and physics) and shows back only the pieces of that animation, over plain black. The real modules keep running; nothing is
   copied or re-drawn. Hidden things also drop out of the collision engine (js/emoji-collide.js skips anything not visible), so only the
   shown animation's own hits play, on the collision layer, which stays visible. Pieces a collision has just hidden (.ec-gone) stay hidden.
   CLOSE: one tap anywhere (or the X, or Escape) restores the page exactly. The address shows #anim=<key> while open, so the link can be
   kept and reopened. Text sizes from the reader's 1rem, everything else a phi rung of the viewport's short side or the safe areas. */
(function (root, doc) {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2, de = doc.documentElement;
  function r(n) { return +Math.pow(PHI, n).toFixed(4); }
  var S = {                                                                           // key: [shown pieces, pieces hidden inside them]
    rain: ['.rain'], comet: ['.es-comet'], rocket: ['#rk1', '.rb-l'], critters: ['#foot .note'],
    sun: ['.pl-sun', '.pl-small', '.sm-n', '.sm-b', '.tsl-layer'], earth: ['.pl-big', '.pl-moon', '.pl-sat', '.pl-ast'],
    ping: ['.pl-scope', '.pl-dish', '.pl-big', '.pl-moon'], sky: ['.es-layer', '', '.es-comet'], ring: ['.qs-layer'],
    matrix: ['#mxrain'], code: ['.home-code'], loop: ['#bgloop', '.bgloop-still']
  };
  var M = 'min(100vw,100svh)', T = r(-2) + 's';
  function u(n) { return 'calc(' + M + ' * ' + r(n) + ')'; }
  var css = 'html[data-solo],html[data-solo] body{background:#000!important}' +
    'html[data-solo] body>*,html[data-solo] body::before,html[data-solo] body::after{visibility:hidden!important}html[data-solo] body>.at-solo,html[data-solo] body>.ec-l{visibility:visible!important}' +
    '.at-solo{position:fixed;inset:0;z-index:2147483647;display:none;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:none;' +
      'font:inherit;color:#9DBCCE}' +
    'html[data-solo] .at-solo{display:block}' +
    '.at-bar{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;justify-content:space-between;gap:' + u(-6) + ';' +
      'padding:max(env(safe-area-inset-top,0px),' + u(-6) + ') max(env(safe-area-inset-right,0px),' + u(-6) + ') 0 max(env(safe-area-inset-left,0px),' + u(-6) + ');' +
      'animation:at-in ' + T + ' ease both}' +
    '.at-n{min-width:0;font-size:1rem;letter-spacing:calc(1em * ' + r(-6) + ');color:#9DBCCE;text-shadow:0 0 ' + u(-8) + ' rgba(10,242,255,' + r(-2) + ')}' +
    '.at-n small{display:block;font-size:calc(1rem * ' + r(-1 / 2) + ');letter-spacing:calc(1em * ' + r(-4) + ');text-transform:uppercase;color:#85A6BB}' +
    '.at-x{flex:none;-webkit-appearance:none;appearance:none;width:' + u(-4) + ';height:' + u(-4) + ';min-width:2.75rem;min-height:2.75rem;margin:0;padding:0;' +
      'border:1px solid #1F5478;border-radius:50%;background:rgba(0,0,0,' + r(-1) + ');color:#9DBCCE;font:inherit;font-size:1.25rem;line-height:1;cursor:pointer}' +
    '.at-x:focus{outline:none}.at-x:focus-visible,.at-x:hover{border-color:#0AF2FF;color:#0AF2FF}' +
    '@keyframes at-in{from{opacity:0}to{opacity:1}}@media (prefers-reduced-motion:reduce){.at-bar{animation:none}}';
  Object.keys(S).forEach(function (k) {
    var a = S[k], sel = 'html[data-solo="' + k + '"] ', show = [], hide = [], inner = false;
    a.forEach(function (s) { if (s === '') { inner = true; return; } (inner ? hide : show).push(sel + s + ':not(.ec-gone)'); });
    css += show.join(',') + '{visibility:visible!important}';
    if (hide.length) css += hide.join(',') + '{visibility:hidden!important}';
  });
  var st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);

  var box = doc.createElement('div'); box.className = 'at-solo'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  var bar = doc.createElement('div'); bar.className = 'at-bar';
  var nm = doc.createElement('div'); nm.className = 'at-n';
  var x = doc.createElement('button'); x.type = 'button'; x.className = 'at-x'; x.setAttribute('aria-label', 'Close'); x.textContent = '\u00D7';
  bar.appendChild(nm); bar.appendChild(x); box.appendChild(bar); doc.body.appendChild(box);
  var cur = '', back = null;
  function close() {
    if (!cur) return; cur = ''; de.removeAttribute('data-solo');
    if (/^#anim=/.test(location.hash)) try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {}
    if (back && back.focus) try { back.focus({ preventScroll: true }); } catch (e) {}
    back = null;
  }
  function open(k, name, from) {
    if (!S[k]) return;
    cur = k; back = from || doc.activeElement; de.setAttribute('data-solo', k);
    nm.textContent = name; var sm = doc.createElement('small'); sm.textContent = 'tap anywhere to close'; nm.appendChild(sm);
    box.setAttribute('aria-label', name + ' animation');
    bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
    if (location.hash !== '#anim=' + k) try { history.replaceState(history.state, '', '#anim=' + k); } catch (e) {}
    try { x.focus({ preventScroll: true }); } catch (e) {}
  }
  box.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); close(); });
  doc.addEventListener('keydown', function (e) { if (cur && (e.key === 'Escape' || e.key === 'Esc')) close(); });
  root.AnimSolo = { open: open, close: close, current: function () { return cur; }, keys: Object.keys(S) };
})(window, document);
