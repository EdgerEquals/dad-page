/* home-windows.js: the content box (Danny 10:37 AWST 30 Oct 2026, t283u: "remove anything that's on the main content page ... I should be able
   to get to all of that by pressing on the actual thing on the screen like the logo ... anything that opens ... open in the content page in the
   boxes ... shrinking it a little bit so you can still see the background ... not fully transparent ... quite transparent").
   The content area (#home-main) is EMPTY by default: no logo card (js/first-content.js no longer loads), no windows, no animation tiles. What
   they opened is reached from the thing itself: the header mark (logo view), the faders button (Ed's desk), the weather chip, the beacon, the
   ticker, the footer tty, the footer phi (dial lab), and the animations by tapping them (js/anim-tiles.js).
   THE BOX: everything that opens (QuizPopups' panel, the logo view, Ed's desk, an animation's solo frame) sits in the content area's box, inset
   on every side by M = PHI^-6 of the viewport's short side (inside the safe areas), as a dark panel at PHI^-3 black with a PHI^-9 short-side
   blur, a palette hairline (#1F5478) and a soft cyan edge, so the background animations show around it and through it. Tap outside it or its
   x to close (the panels' and the logo view's own x; the desk's faders button, Esc, or a tap in the margin).
   THE FIT (kept from the windows version): #home-main is a fixed box from the header's bottom to the footer's top (measured, safe areas
   included), scrolling inside; header and footer stay put. --hm-top / --hm-h are what the box above is cut from.
   LOAD: tier 1, about 4 KB, no images, no timers (the six live peeks and their PHI^2 s timer are gone with the windows). */
(function (root, doc) {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2;
  function r(n) { return +Math.pow(PHI, n).toFixed(4); }                        // phi rung n as a CSS number
  var main = doc.getElementById('home-main');
  if (!main || doc.getElementById('cb-css')) return;
  var de = doc.documentElement, hd = doc.getElementById('q-head'), ft = doc.querySelector('.foot'), fq = 0;
  var S = 'min(100vw,100svh)';                                                  // anchor: the viewport's short side
  var M = 'calc(' + S + ' * ' + r(-6) + ')';                                    // phi: the margin of background left round the box
  var L = 'calc(env(safe-area-inset-left,0px) + ' + M + ')', R = 'calc(env(safe-area-inset-right,0px) + ' + M + ')';
  var TOP = 'calc(var(--hm-top,0px) + ' + M + ')', H = 'calc(var(--hm-h,100svh) - ' + M + ' * 2)';
  var BG = 'rgba(0,0,0,' + r(-3) + ')', BGL = 'rgba(238,244,248,' + r(-2) + ')';   // phi: PHI^-3 black (light theme: PHI^-2 of its own page colour)
  var BLUR = 'blur(calc(' + S + ' * ' + r(-9) + '))';
  var EDGE = 'border:1px solid rgba(31,84,120,' + r(-1) + ');border-radius:calc(' + S + ' * ' + r(-6) + ');' +
    'box-shadow:0 0 calc(' + S + ' * ' + r(-6) + ') rgba(10,242,255,' + r(-4) + ');-webkit-backdrop-filter:' + BLUR + ';backdrop-filter:' + BLUR + ';';
  var BOX = 'left:' + L + '!important;right:' + R + '!important;top:' + TOP + '!important;bottom:auto!important;' +
    'width:auto!important;max-width:none!important;height:' + H + '!important;max-height:none!important;box-sizing:border-box;background:' + BG + '!important;' + EDGE;
  var TXT = 'text-shadow:0 0 calc(' + S + ' * ' + r(-8) + ') #000,0 0 calc(' + S + ' * ' + r(-9) + ') #000;';   // readable over the moving background
  var css =
    // THE SCROLL REGION (fit fix, Kids Club fix.patch folded in): html/body stay overflow:hidden; #home-main is a fixed box between header and
    // footer and scrolls inside, its own bar hidden.
    '#home-main{position:fixed;left:0;right:0;top:var(--hm-top,0px);height:var(--hm-h,100svh);max-width:none;margin:0;box-sizing:border-box;' +
      'padding:0 max(env(safe-area-inset-right,0px),calc((100% - min(100%,860px)) / 2 + 18px)) calc(' + S + ' * ' + r(-4) + ') max(env(safe-area-inset-left,0px),calc((100% - min(100%,860px)) / 2 + 18px));' +
      'overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;scrollbar-width:none;touch-action:pan-y}' +
    '#home-main::-webkit-scrollbar{display:none}' +
    // QuizPopups' panel (weather, beacon, ticker, tty, footer lights, critters ...): placed by its own script next to its item; here it is the box.
    '.qp-pop{position:fixed;' + BOX + TXT + '}' +
    '.qp-pop .qp-term{background:rgba(0,0,0,' + r(-2) + ')}' +
    // The logo view (js/dad-mark-zoom.js): its full-screen dimmer becomes the box; the mark keeps its own tile, sized to the box.
    '.dmz{position:fixed;inset:auto;' + BOX + '}' +
    '.dmz-fig{width:min(calc(100vw - ' + M + ' * 2) * ' + r(-1 / 2) + ',' + H + ' * ' + r(-1 / 2) + ')!important;height:min(calc(100vw - ' + M + ' * 2) * ' + r(-1 / 2) + ',' + H + ' * ' + r(-1 / 2) + ')!important}' +
    '.dmz-x{top:calc(' + S + ' * ' + r(-6) + ')!important;right:calc(' + S + ' * ' + r(-6) + ')!important}' +
    // Ed's desk (js/dj-desk.js, a page in the content area, Danny 18:21 AWST 27 Oct): the area itself becomes the box; its strips go see-through.
    'html[data-desk]:not([data-desk-full]) #home-main{' + BOX + 'padding-left:calc(' + S + ' * ' + r(-7) + ');padding-right:calc(' + S + ' * ' + r(-7) + ')}' +
    'html #dj-desk{--dk-bg:rgba(0,0,0,' + r(-2) + ');--dk-pan:rgba(0,0,0,' + r(-3) + ');' + TXT + '}' +
    'html #dj-desk .dk-top{background:transparent}' +
    // An animation's solo view (js/anim-solo.js draws its own frame in the same place, from these variables).
    ':root{--cb-l:' + L + ';--cb-r:' + R + ';--cb-t:' + TOP + ';--cb-h:' + H + ';--cb-m:' + M + '}' +
    'html[data-theme="light"] .qp-pop,html[data-theme="light"] .dmz,html[data-theme="light"][data-desk]:not([data-desk-full]) #home-main{background:' + BGL + '!important}' +
    'html[data-theme="light"] .qp-pop,html[data-theme="light"] #dj-desk{text-shadow:none}' +
    '@media (prefers-reduced-motion:reduce){.qp-pop,.dmz{transition:none}}';
  var st = doc.createElement('style'); st.id = 'cb-css'; st.textContent = css; doc.head.appendChild(st);

  // the drifting code layer stays in the page's own z<0 stack (behind the scene layers), not inside the fixed scroll box
  var hc = main.querySelector('.home-code'); if (hc) main.parentNode.insertBefore(hc, main);

  // ---------- close by a tap outside the box ----------
  // QuizPopups already closes on a tap outside its panel. The logo view used to close on its dimmer, which is now the box: a tap outside it closes
  // it (the tap that lands on the header mark only closes, it does not reopen). Ed's desk: a tap in the margin round it (the content area's own
  // background, not the desk) closes it, like its faders button.
  var eat = null;
  doc.addEventListener('pointerdown', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var Z = root.LogoZoom;
    if (Z && Z.isOpen && Z.isOpen() && !t.closest('.dmz')) { Z.close(); eat = t.closest('.dad-zoom,button,a'); return; }
    if (de.hasAttribute('data-desk') && !de.hasAttribute('data-desk-full') && root.DjDesk && (t === main || !t.closest('#home-main,#q-head,#foot,.qp-pop,.dmz'))) { DjDesk.close(false); eat = 1; }
  }, true);
  doc.addEventListener('click', function (e) { var a = eat; eat = null; if (a && (a === 1 || (e.target && a.contains(e.target)))) { e.preventDefault(); e.stopPropagation(); } }, true);   // the closing tap does nothing else

  // ---------- fit: measure the box between header and footer ----------
  function fit() {
    fq = 0;
    var top = hd ? Math.max(0, hd.getBoundingClientRect().bottom) : 0, bot = ft ? ft.getBoundingClientRect().top : innerHeight;
    de.style.setProperty('--hm-top', top + 'px'); de.style.setProperty('--hm-h', Math.max(0, bot - top) + 'px');
  }
  function soon() { if (!fq) fq = requestAnimationFrame(fit); }
  fit(); addEventListener('resize', soon); addEventListener('orientationchange', soon);
  if (root.visualViewport) visualViewport.addEventListener('resize', soon);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(soon);
  if (root.ResizeObserver) { var ro = new ResizeObserver(soon); if (hd) ro.observe(hd); if (ft) ro.observe(ft); }
})(window, document);
