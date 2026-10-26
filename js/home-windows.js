/* home-windows.js: windows into what is already on Ed's page (Danny 15:47 AWST 26 Oct: "start building some windows on it ... into
   everything I've already got built into my page ... be quirky"). Six cards under the logo card, each a tiny live peek at something
   the header or footer already runs, and a tap opens the real thing with its own existing opener (no new features, no new requests):
     DJ booth     the DJ's beat (bars on --djb-beat, set by js/quiz-dj-pill.js) + bpm / on-off   -> the DJ pill's pop-up (#dj-pill)
     Sky window   moon phase (computed here) + the header weather chip (#wx)                       -> the weather panel (QuizPopups '#wx')
     Ground ctl   the footer tty's latest line (#tcur), typed out                                  -> the tty panel (QuizPopups '.foot .tout')
     Rebella      the #beacon state: LIVE / CHECKING / DOWN, with a heartbeat trace                -> the Rebella status panel (QuizPopups '#beacon')
     Fact drip    one fun fact from the header ticker (#ttrack), dripping in                      -> the fun-facts panel (QuizPopups '.tick .tview')
     Dial lab     a mini phi dial whose needle rides the page pump root (PhiPumps.page)           -> dials.html (the dial sandbox, loaded only on tap)
   STANDARDS (Kids Club shared.md, 26 Oct): structure stays still, only the small peeks move (pump-scaled, no cross-screen motion until the
   shared corner-axes module lands); press feedback inside the 0.1 s tap rail (PHI^-5 s); text sizes from the reader's 1rem.
   LOAD: shells at tier 1 (this file, a few KB, no images); live peeks start at tier 2 (idle) and refresh on ONE timer of PHI^2 s,
   paused while the page is hidden; anything heavy (DJ engine, dial page, panels) is what the tap opens.
   LAYERS: same as the logo card: normal flow, z-index 1, transparent over black (no dark-blue box), hairline + cyan focus glow;
   the scene, ping and rain layers (fixed, z -1, pointer-events none) move behind, nothing covers the taps.
   Sizes, gaps and times are powers of phi of one anchor (the viewport's short side) or of the page ladder. Shown name: Ed. */
(function (root, doc) {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2;
  function r(n) { return +Math.pow(PHI, n).toFixed(4); }                        // phi rung n as a CSS number
  var main = doc.getElementById('home-main');
  if (!main || doc.querySelector('.hw')) return;
  var $ = function (id) { return doc.getElementById(id); };
  var U = 'var(--hw-u,min(100vw,100svh * ' + r(-1) + '))', G = 'calc(' + U + ' * ' + r(-6) + ')';   // anchor: the measured content box (fit() below)
  function u(n) { return 'calc(' + U + ' * ' + r(n) + ')'; }
  var css =
    // THE SCROLL REGION (fit fix, Kids Club fix.patch folded in; standard 'every screen fits the smallest phone, in its measured space'):
    // html/body stay overflow:hidden (whiteline 3: no root scroll indicator, no white line); #home-main becomes a fixed box from the
    // header's bottom to the footer's top (measured, safe areas included) and scrolls inside, its own bar hidden. Header and footer stay put.
    '#home-main{position:fixed;left:0;right:0;top:var(--hm-top,0px);height:var(--hm-h,100svh);max-width:none;margin:0;box-sizing:border-box;' +
      'padding:0 max(env(safe-area-inset-right,0px),calc((100% - min(100%,860px)) / 2 + 18px)) ' + u(-4) + ' max(env(safe-area-inset-left,0px),calc((100% - min(100%,860px)) / 2 + 18px));' +
      'overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;scrollbar-width:none;touch-action:pan-y}' +
    '#home-main::-webkit-scrollbar{display:none}' +
    // FIT (Danny 16:25 AWST 26 Oct: on his iPhone in portrait the windows spilled off both edges): every box is border-box and never
    // wider than its container; a track can never ask for more than 100% of the row; portrait is two equal columns of the measured
    // content width, one column when that is under PHI^6 rem (big text / page zoom). Nothing is hidden: html/body overflow is unchanged.
    '.hw,.hw-w,.fc,.fc-card{box-sizing:border-box;max-width:100%}' +
    '.hw{position:relative;z-index:1;display:grid;gap:' + G + ';margin:' + u(-5) + ' auto 0;width:100%;max-width:min(100%,calc(' + U + ' * ' + r(2) + '));' +
      'grid-template-columns:repeat(auto-fill,minmax(min(100%,max(' + u(-2) + ',calc((100% - ' + G + ' * 2) / 3))),1fr));pointer-events:none}' +
    '@media (orientation:portrait){.hw{grid-template-columns:repeat(2,minmax(0,1fr))}}' +
    '@media (orientation:portrait) and (max-width:' + r(6) + 'rem){.hw{grid-template-columns:minmax(0,1fr)}}' +
    '.hw-w{pointer-events:auto;-webkit-appearance:none;appearance:none;position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:' + u(-8) + ';' +
      'width:100%;min-width:0;margin:0;padding:' + u(-6) + ';background:transparent;border:1px solid rgba(31,84,120,' + r(-1) + ');border-radius:' + u(-6) + ';' +
      'color:#9DBCCE;font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent;overflow:hidden;' +
      'transition:border-color ' + r(-2) + 's ease,box-shadow ' + r(-2) + 's ease,transform ' + r(-5) + 's ease}' +
    '@media (hover:hover){.hw-w:hover{border-color:#0AF2FF;box-shadow:0 0 ' + u(-6) + ' rgba(10,242,255,' + r(-2) + ')}}' +
    '.hw-w:active{transform:scale(' + (1 - r(-6)).toFixed(4) + ')}.hw-w:focus{outline:none}.hw-w:focus-visible{border-color:#0AF2FF;box-shadow:0 0 0 1px #0AF2FF}' +
    '.hw-p{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:' + u(-3) + ';overflow:hidden;' +
      'font-size:calc(' + U + ' * ' + r(-5) + ');line-height:1}' +
    '.hw-t{display:block;max-width:100%;font-size:1rem;letter-spacing:calc(1em * ' + r(-7) + ');color:#9DBCCE;white-space:normal;overflow-wrap:anywhere}' +
    '.hw-s{display:block;width:100%;font:calc(1rem * ' + r(-1 / 2) + ')/' + r(1) + ' ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#85A6BB;' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:calc(1em * ' + r(1) + ')}' +
    // DJ: five bars on the DJ's own beat (--djb-beat), golden-angle offsets
    '.hw-eq{display:flex;align-items:flex-end;gap:' + u(-9) + ';height:' + u(-4) + '}' +
    '.hw-eq i{display:block;width:' + u(-7) + ';height:100%;background:linear-gradient(#0AF2FF,#1F5478);border-radius:' + u(-9) + ';transform-origin:50% 100%;' +
      'transform:scaleY(' + r(-3) + ');animation:hw-bar var(--djb-beat,' + r(0) + 's) ease-in-out infinite alternate;animation-play-state:paused}' +
    '.hw-dj.on .hw-eq i{animation-play-state:running}' +
    '@keyframes hw-bar{to{transform:scaleY(1)}}' +
    // Rebella: heartbeat trace scrolling on the status-blink rung; colour follows the beacon state
    '.hw-hb{width:100%;height:100%;color:#2A8FA3}.hw-rb.live .hw-hb{color:var(--mx-r,#FF0033)}.hw-rb.chk .hw-hb{color:#F2A541}.hw-rb.down .hw-hb{color:#FF4D4D}' +
    '.hw-hb path{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:60 140;animation:hw-ecg var(--phi-cursor,' + r(1) + 's) linear infinite}' +
    '.hw-hb path.b{stroke-dasharray:none;animation:none;opacity:' + r(-3) + '}.hw-rb.down .hw-hb path{animation:none;stroke-dasharray:none}' +
    '@keyframes hw-ecg{from{stroke-dashoffset:200}to{stroke-dashoffset:0}}' +
    '.hw-rb.live .hw-s b{color:var(--mx-r,#FF0033);animation:liveblink var(--phi-cursor,' + r(1) + 's) steps(1,end) infinite}' +
    '.hw-rb .hw-s b{font-weight:700}' +
    // Ground control: matrix-green tty line with a block cursor
    '.hw-gc .hw-p{justify-content:flex-start;font:calc(1rem * ' + r(-1 / 2) + ')/' + r(1) + ' ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#00FF41;' +
      'text-align:left;white-space:normal;align-items:flex-end;word-break:break-word}' +
    '.hw-gc .hw-p::after{content:"";display:inline-block;width:calc(1em * ' + r(-1) + ');height:1em;margin-left:calc(1em * ' + r(-4) + ');background:#00FF41;' +
      'animation:liveblink var(--phi-cursor,' + r(1) + 's) steps(1,end) infinite}' +
    // Fact drip: the fact fades in word-by-word
    '.hw-fd .hw-p{font-size:calc(1rem * ' + r(-1 / 2) + ');line-height:' + r(1) + ';color:#9DBCCE;text-align:left;justify-content:flex-start;align-items:flex-start;' +
      '-webkit-mask-image:linear-gradient(#000 ' + Math.round(100 * r(-1)) + '%,transparent);mask-image:linear-gradient(#000 ' + Math.round(100 * r(-1)) + '%,transparent)}' +
    '.hw-fd .hw-p span{opacity:0;animation:hw-in ' + r(-1) + 's ease forwards}' +
    '@keyframes hw-in{to{opacity:1}}' +
    // Dial lab: a phi dial; the needle rides PhiPumps (or a slow golden sway until the pumps load)
    '.hw-dial{width:' + u(-3) + ';height:' + u(-3) + '}' +
    '.hw-dial .n{transform-origin:50px 50px;transform:rotate(var(--hw-a,0deg));transition:transform ' + r(2) + 's cubic-bezier(' + r(-3) + ',' + (1 - r(-4)).toFixed(4) + ',' + r(-3) + ',1)}' +
    // Sky: moon + weather side by side
    '.hw-sky .hw-p{gap:' + u(-6) + '}.hw-sky .m{filter:drop-shadow(0 0 ' + u(-7) + ' rgba(157,188,206,' + r(-2) + '))}' +
    'html[data-theme="light"] .hw-s,html[data-theme="light"] .hw-fd .hw-p{color:#143A57}html[data-theme="light"] .hw-gc .hw-p{color:#1E8A44}' +
    '@media (prefers-reduced-motion:reduce){.hw-w{transition:none}.hw-eq i,.hw-hb path,.hw-fd .hw-p span,.hw-gc .hw-p::after,.hw-rb.live .hw-s b{animation:none!important}' +
      '.hw-fd .hw-p span{opacity:1}.hw-dial .n{transition:none}}';
  var st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);

  var NS = 'http://www.w3.org/2000/svg';
  var W = [
    { k: 'dj', t: "Ed's DJ booth", s: 'decks asleep \u00b7 tap to wake', p: '<span class="hw-eq">' + '<i></i><i></i><i></i><i></i><i></i>' + '</span>',
      go: function () { var b = $('dj-pill'); if (b) b.click(); } },
    { k: 'sky', t: 'Sky over Perth', s: '\u2026', p: '<span class="m" aria-hidden="true">\uD83C\uDF15</span><span class="w" aria-hidden="true"></span>',
      go: function () { pop('#wx'); } },
    { k: 'gc', t: 'Ground control', s: 'simmie$ listening', p: '',
      go: function () { pop('.foot .tout'); } },
    { k: 'rb', t: "Rebella's pulse", s: '<b>\u2026</b>', p: '<svg class="hw-hb" viewBox="0 0 200 50" preserveAspectRatio="none" aria-hidden="true">' +
        '<path class="b" d="M0 25H60l8-16 10 32 8-24 6 8H200"/><path pathLength="200" d="M0 25H60l8-16 10 32 8-24 6 8H200"/></svg>',
      go: function () { pop('#beacon'); } },
    { k: 'fd', t: 'Fact drip', s: 'from Ed, one drop at a time', p: '',
      go: function () { pop('.tick .tview'); } },
    { k: 'dl', t: '\u03c6 dial lab', s: 'twiddle the golden knobs', p: '<svg class="hw-dial" viewBox="0 0 100 100" aria-hidden="true">' +
        '<circle cx="50" cy="50" r="44" fill="none" stroke="#1F5478" stroke-width="2"/><circle cx="50" cy="50" r="44" fill="none" stroke="#0AF2FF" stroke-width="2" stroke-dasharray="172 277" transform="rotate(135 50 50)" opacity="' + r(-1) + '"/>' +
        '<g class="n"><line x1="50" y1="50" x2="50" y2="14" stroke="#0AF2FF" stroke-width="3" stroke-linecap="round"/></g><circle cx="50" cy="50" r="6" fill="#0AF2FF"/>' +
        '<text x="50" y="80" text-anchor="middle" font-size="16" fill="#85A6BB" font-family="serif">\u03c6</text></svg>',
      go: function () { location.href = 'dials.html'; } }
  ];
  function pop(sel) { try { if (root.QuizPopups) QuizPopups.open(sel); } catch (e) {} }
  var grid = doc.createElement('section'); grid.className = 'hw'; grid.setAttribute('aria-label', "Windows into Ed's page");
  var el = {};
  W.forEach(function (w) {
    var b = doc.createElement('button'); b.type = 'button'; b.className = 'hw-w hw-' + w.k;
    b.innerHTML = '<span class="hw-p">' + w.p + '</span><span class="hw-t">' + w.t + '</span><span class="hw-s">' + w.s + '</span>';
    b.setAttribute('aria-label', w.t.replace('\u03c6', 'phi') + ', opens it');
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); try { root.PhiAdapt && PhiAdapt.signal('home-' + w.k, 't'); } catch (x) {} w.go(); });
    el[w.k] = b; grid.appendChild(b);
  });
  main.appendChild(grid);
  // the SVG previews use their own viewBox units (artwork coordinates, not page sizes)

  // the drifting code layer stays in the page's own z<0 stack (behind the scene layers), not inside the new fixed scroll box
  var hc = main.querySelector('.home-code'); if (hc) main.parentNode.insertBefore(hc, main);
  // ---------- fit: measure the box between header and footer, anchor U on it, keep the logo card inside it ----------
  // portrait viewport: U = the box's short side; landscape viewport: the larger of box height x PHI^-1 and width x PHI^-2 (so short landscape phones keep
  // readable windows and simply scroll). The logo card then steps its own unit (--fc-u) down the phi ladder until it fits the box
  // with PHI^-3 of it free. Re-fit on resize, rotation, Safari bar changes, font load, and when the header/footer/content change size.
  var de = doc.documentElement, hd = $('q-head'), ft = doc.querySelector('.foot'), fq = 0;
  function fit() {
    fq = 0;
    var top = hd ? Math.max(0, hd.getBoundingClientRect().bottom) : 0, bot = ft ? ft.getBoundingClientRect().top : innerHeight;
    var cs = getComputedStyle(main), w = Math.max(0, main.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) || de.clientWidth;   // the measured CONTENT width
    // fit2 (Ed 17:03 AWST 26 Oct, 'still too big in portrait'): in portrait the box is about square on a small phone (header + footer take ~PHI^-2
    // of the height), so U = the whole short side made the card and every window about half the visible box: one card and two half windows per
    // screen, the home 2.5 screens tall. Portrait now starts one rung down (short side x PHI^-1) and keeps stepping down half a rung until the
    // logo card AND the whole first row of windows are on the first screen. Landscape is unchanged.
    var portrait = de.clientWidth <= innerHeight, h = Math.max(0, bot - top), uu = portrait ? Math.min(w, h) / PHI : Math.max(h / PHI, w * Math.pow(PHI, -2));   // orientation from the viewport, size from the box
    de.style.setProperty('--hm-top', top + 'px'); de.style.setProperty('--hm-h', h + 'px');
    var card = doc.querySelector('.fc-card');
    var room = h * (1 - Math.pow(PHI, -3)), cu, n, k;                                       // phi: keep PHI^-3 of the box free
    var rem = parseFloat(getComputedStyle(de).fontSize), floor = rem * PHI * PHI / Math.pow(PHI, -3);   // the mark never drops under PHI^2 rem (text is the reader's, it does not shrink)
    for (k = 0; k < 4; k++) {                                                                // unit: 4 half-rungs is ample
      de.style.setProperty('--hw-u', uu + 'px'); cu = uu;
      if (card) for (n = 0; n < 8; n++) { de.style.setProperty('--fc-u', cu + 'px'); if (card.offsetHeight <= room && card.offsetWidth <= w * (1 - Math.pow(PHI, -3))) break; if (cu / PHI < floor) break; cu /= PHI; }   // unit: 8 rungs is ample
      if (!portrait) break;
      var w0 = grid.firstElementChild, fr = w0 ? w0.getBoundingClientRect().bottom - main.getBoundingClientRect().top + main.scrollTop : 0;   // first row bottom, in the scroll box's own coordinates
      if (!w0 || fr <= h || uu / Math.sqrt(PHI) < floor) break;
      uu /= Math.sqrt(PHI);                                                                  // phi: half a rung down
    }
  }
  function soon() { if (!fq) fq = requestAnimationFrame(fit); }
  fit(); addEventListener('resize', soon); addEventListener('orientationchange', soon);
  if (root.visualViewport) visualViewport.addEventListener('resize', soon);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(soon);
  if (root.ResizeObserver) { var ro = new ResizeObserver(soon); if (hd) ro.observe(hd); if (ft) ro.observe(ft); }
  if (root.MutationObserver) new MutationObserver(soon).observe(main, { childList: true });   // the logo card may arrive after this file

  // ---------- live peeks (tier 2, idle) ----------
  // Moon age from the 2000-01-06 18:14 UTC new moon, synodic month 29.530588853 d = 2551442877 ms (Meeus, Astronomical Algorithms; the
  // same reference js/quiz-popups.js and js/phi-pumps.js use). Eight phases, northern-sky emoji order (Perth sees them mirrored; the
  // emoji is the phase NAME, as in the footer critters panel).
  var SYN = 2551442877, NEWM = Date.UTC(2000, 0, 6, 18, 14), MOON = ['\uD83C\uDF11', '\uD83C\uDF12', '\uD83C\uDF13', '\uD83C\uDF14', '\uD83C\uDF15', '\uD83C\uDF16', '\uD83C\uDF17', '\uD83C\uDF18'];
  var NAMES = ['new moon', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full moon', 'waning gibbous', 'last quarter', 'waning crescent'];
  function txt(e) { return e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function set(k, s) { var e = el[k] && el[k].querySelector('.hw-s'); if (e && e.textContent !== s) e.textContent = s; }
  var lastGc = '', lastFact = -1, factN = 0;
  function tick() {
    if (doc.hidden) return;
    // DJ
    var pill = $('dj-pill'), on = !!(pill && pill.classList.contains('is-playing')), t = null;
    try { t = root.DadAutoDJ && DadAutoDJ.track; } catch (e) {}
    el.dj.classList.toggle('on', on);
    set('dj', on ? (t && t.bpm ? 'spinning ' + (t.genre ? t.genre + ' ' : '') + '@ ' + Math.round(t.bpm) + ' bpm' : 'spinning') : 'decks asleep \u00b7 tap to wake');
    // Sky
    var a = (((Date.now() - NEWM) % SYN) + SYN) % SYN, ph = Math.floor(a / SYN * 8 + 1 / 2) % 8;
    var m = el.sky.querySelector('.m'), w = el.sky.querySelector('.w'), wi = txt($('wxIcon')), wt = txt($('wxText'));
    if (m.textContent !== MOON[ph]) m.textContent = MOON[ph];
    if (w.textContent !== wi) w.textContent = wi;
    set('sky', NAMES[ph] + (wt ? ' \u00b7 ' + wt.replace(/^Perth\s*/, '') : ''));
    // Ground control: type the newest tty line out
    var g = txt($('tcur'));
    if (g && g !== lastGc) { lastGc = g; typeOut(el.gc.querySelector('.hw-p'), g); set('gc', 'simmie$ ' + (txt($('tprev')) || 'listening')); }
    // Rebella
    var bc = $('beacon'), cls = bc ? (bc.classList.contains('live') ? 'live' : bc.classList.contains('down') ? 'down' : 'chk') : 'chk';
    el.rb.classList.remove('live', 'chk', 'down'); el.rb.classList.add(cls);
    var sb = el.rb.querySelector('.hw-s b'), word = txt(bc && bc.querySelector('.bs')) || '\u2026';
    if (sb && sb.textContent !== word) sb.textContent = word;
    // Fact drip: a new fact every PHI^3 ticks of this timer
    var facts = doc.querySelectorAll('#ttrack .ts'); if (!facts.length) facts = doc.querySelectorAll('#ttrack>span');
    if (facts.length && (lastFact < 0 || factN++ % Math.round(r(3)) === 0)) {
      var i = Math.floor(Math.random() * facts.length); if (i !== lastFact || facts.length === 1) { lastFact = i; drip(el.fd.querySelector('.hw-p'), txt(facts[i]).replace(/^"|"$/g, '')); }
    }
    // Dial lab: the page pump root, -1..1 -> +-135 deg (the dial's arc)
    var v = null; try { v = root.PhiPumps && PhiPumps.page ? PhiPumps.page.modes() : null; } catch (e) {}
    if (v == null) v = Math.sin(Date.now() / 1000 / r(4) * 2 * Math.PI);           // golden sway on PHI^4 s until the pumps load
    el.dl.querySelector('.hw-dial').style.setProperty('--hw-a', Math.round(v * 135) + 'deg');
  }
  var typeT = 0;
  function typeOut(box, s) {
    clearInterval(typeT); var n = 0, step = Math.max(1, Math.round(s.length / Math.pow(PHI, 4)));
    typeT = setInterval(function () { n = Math.min(s.length, n + step); box.textContent = s.slice(0, n); if (n >= s.length) clearInterval(typeT); }, Math.round(1000 * r(-4)));
  }
  function drip(box, s) {
    box.textContent = ''; s.split(' ').slice(0, 21).forEach(function (wd, i) {
      var sp = doc.createElement('span'); sp.textContent = wd + ' '; sp.style.animationDelay = (i * r(-4)).toFixed(3) + 's'; box.appendChild(sp);
    });
  }
  var timer = 0;
  function startPeeks() { tick(); clearInterval(timer); timer = setInterval(tick, Math.round(1000 * r(2))); }
  if (root.LoadTiers && LoadTiers.add) LoadTiers.add(2, startPeeks, 'home windows peeks', { id: 'home-windows' });
  else root.addEventListener('load', startPeeks);
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden) tick(); });
})(window, document);
