/* first-content.js: the first content item on Dad's home screen (Danny 15:24 AWST 26 Oct: "create the first piece of content for my
   website and just have it be my logo page so if I press on that it goes to where I add my logo").
   ONE card in the content layer (#home-main): Dad's equals mark, live (it mirrors the header mark's <img>, so it shows the slim static
   mark at once and the animated head mark once tier 3 has swapped it in; no extra download), with the label "EdgerEquals" and "logo".
   TAP: opens Dad's logo view, the same LogoZoom 'dad' zoom the header mark opens (detailed mark, eq-physics equals, logo sound), growing
   from the card. If the zoom module has not loaded yet, the card presses the header mark, whose loader fetches it on demand.
   LAYERS: the card sits in the normal flow (z-index 1): the space loop, matrix rain, emoji scene, Sun/Earth and ping layers (fixed,
   z-index -1, pointer-events none) move behind it; the front orbit layer (z-index 4, pointer-events none) passes in front of it without
   taking taps. Transparent over black (footer principle: no dark-blue box), only a hairline and a soft cyan glow on hover/focus.
   Every size, alpha and time is a power of phi of a measured anchor (the viewport's short side) or of the page's PHI ladder.
   Loaded at tier 1 (after first paint), about 3 KB. Usage: a tap counts as a 'dad-mark' tap in PhiAdapt (on-device only). */
(function (root, doc) {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI;
  function p(n) { return Math.pow(PHI, n); }                                          // phi rung n
  function r(n) { return +p(n).toFixed(4); }                                          // rung as a CSS number
  var main = doc.getElementById('home-main'), hb = doc.querySelector('.q-head .dad-zoom'), hi = hb && hb.querySelector('.dad-mark');
  if (!main || !hb || !hi || doc.querySelector('.fc')) return;
  var U = 'min(100vw,100svh * ' + r(-1) + ')';                                       // anchor: the viewport's short side (height x PHI^-1 so wide screens stay calm)
  var T = r(-2) + 's';                                                                // PHI^-2 s: the zoom's own open time
  var css =
    '.fc{position:relative;z-index:1;display:flex;justify-content:center;margin-top:calc(' + U + ' * ' + r(-2) + ');pointer-events:none}' +
    '.fc-card{pointer-events:auto;-webkit-appearance:none;appearance:none;display:flex;flex-direction:column;align-items:center;' +
      'gap:calc(' + U + ' * ' + r(-8) + ');padding:calc(' + U + ' * ' + r(-6) + ') calc(' + U + ' * ' + r(-5) + ');margin:0;' +
      'background:transparent;border:1px solid rgba(31,84,120,' + r(-1) + ');border-radius:calc(' + U + ' * ' + r(-6) + ');' +
      'color:#9DBCCE;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;' +
      'transition:border-color ' + T + ' ease,box-shadow ' + T + ' ease,transform ' + T + ' ease}' +
    '.fc-mark{display:block;width:calc(' + U + ' * ' + r(-3) + ');height:calc(' + U + ' * ' + r(-3) + ');' +
      'filter:drop-shadow(0 0 calc(' + U + ' * ' + r(-8) + ') rgba(10,242,255,' + r(-3) + '))}' +
    '.fc-t{display:block;font-size:calc(1em * ' + r(0) + ');letter-spacing:calc(1em * ' + r(-6) + ');color:#9DBCCE;line-height:' + r(1) + '}' +
    '.fc-s{display:block;font-size:calc(1em * ' + r(-1) + ');letter-spacing:calc(1em * ' + r(-4) + ');text-transform:uppercase;color:#85A6BB}' +
    '@media (hover:hover){.fc-card:hover{border-color:#0AF2FF;box-shadow:0 0 calc(' + U + ' * ' + r(-6) + ') rgba(10,242,255,' + r(-2) + ')}}' +
    '.fc-card:active{transform:scale(' + (1 - r(-6)).toFixed(4) + ')}' +
    '.fc-card:focus{outline:none}.fc-card:focus-visible{border-color:#0AF2FF;box-shadow:0 0 0 calc(' + U + ' * ' + r(-9) + ') #0AF2FF}' +
    'html[data-theme="light"] .fc-card{border-color:rgba(31,84,120,' + r(-2) + ');color:#1F5478}' +
    'html[data-theme="light"] .fc-t{color:#1F5478}html[data-theme="light"] .fc-s{color:#143A57}' +
    '@media (prefers-reduced-motion:reduce){.fc-card{transition:none}.fc-card:active{transform:none}}';
  var st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);
  var sec = doc.createElement('section'); sec.className = 'fc'; sec.setAttribute('aria-label', 'Content');
  var b = doc.createElement('button'); b.type = 'button'; b.className = 'fc-card'; b.setAttribute('aria-haspopup', 'dialog');
  b.setAttribute('aria-label', "Open Dad's logo");
  var im = doc.createElement('img'); im.className = 'fc-mark'; im.alt = ''; im.decoding = 'async'; im.src = hi.src;
  var t = doc.createElement('span'); t.className = 'fc-t'; t.textContent = 'EdgerEquals';
  var s = doc.createElement('span'); s.className = 'fc-s'; s.textContent = 'logo';
  b.appendChild(im); b.appendChild(t); b.appendChild(s); sec.appendChild(b); main.appendChild(sec);
  // live mark: follow the header mark's src (slim static first, the animated head mark once tier 3 swaps it in; same cached file)
  if (root.MutationObserver) new MutationObserver(function () { if (im.src !== hi.src) im.src = hi.src; }).observe(hi, { attributes: true, attributeFilter: ['src'] });
  b.addEventListener('click', function (e) {
    e.preventDefault(); e.stopPropagation();
    try { root.PhiAdapt && PhiAdapt.signal('dad-mark', 't'); } catch (x) {}
    if (root.LogoZoom) { LogoZoom.open('dad', b); return; }
    hb.__zf = b; hb.click();                                                          // header loader fetches the zoom, then opens it from the card
  });
})(window, document);
