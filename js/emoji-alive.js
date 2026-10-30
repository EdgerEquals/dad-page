/* EMOJI ALIVE, trial (Danny 09:06 AWST 30 Oct 2026: 'build the animated emoji trial with the four emojis first, stickers later'; his picks via
   Kids Club 21:43 AWST 26 Oct: rocket, butterfly, dolphin, Earth; 21:49 option A: 'Animate only in bursts after a hit, promotion or tap, then
   ease back to still'). Loaded on demand by js/emoji-collide.js at the first burst; nothing here or in media/emoji-alive/ loads before that.
     LIFT     a hit (emoji-collide's collide(), both the emoji and its knocked-off copy), a promotion (document event 'emoji:promote',
              detail {el, share}) or a tap lifts that emoji's aliveness by cap x min(1, 2 x its kinetic-energy share) (rule 15: the shares
              come from emoji-collide's energy = drawn area x speed^2; an even split or better = a full lift; a tap = an even split).
     CAP      by layer, measured at run time from the outermost stacking z: front (header and above) 1, middle (content, footer) PHI^-1,
              back (behind the content) PHI^-2.
     DECAY    PHI^-1 each breath B = PHI^5 s (11.09 s), in steps; below PHI^-2 the plain still emoji shows. Over the last PHI^-3 of a breath
              before that the playback slows to a stop (sine ease), then the still glyph cross-fades back in over PHI^-1 s.
     SPEED    PHI^(2m - 1), m = the page's master pump ratio (js/ratio-pump.js RatioPump.master(): the calmest feed of weather, Moon, time
              of day; read only): PHI^-1 when calm .. PHI when lively.
     BUDGET   at most floor(PHI^3) = 4 animating at once on a phone (touch / no hover), floor(PHI^4) = 6 on a desktop; a stronger lift
              retires the weakest, a weaker one is refused.
     SWAP     in place, no layout shift: the glyph's text node moves into an inline span made invisible (visibility, so it keeps its box),
              and a frame strip of the same size sits over it (absolute, pointer-events none, inherits the owner's opacity, transform and
              visibility, so emoji-collide's hide and the solo view still work). A static owner gets position:relative while animating.
              Taps never stop here: the listener in emoji-collide.js is passive and nothing calls preventDefault.
     REDUCED MOTION  nothing loads; every emoji stays still.
   Frames: Noto Animated Emoji by Google (https://googlefonts.github.io/noto-emoji-files/, source
   fonts.gstatic.com/s/e/notoemoji/latest/<codepoint>/512.webp), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
   Changed: resized to 96 px and laid out as one horizontal strip at every second source frame (tools/emoji-alive-strips.py); see
   media/emoji-alive/LICENSE.md. */
(function () {
  'use strict';
  var doc = document, root = window;
  if (root.EmojiAlive) return;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, MS = 1e3, TAU = 2 * Math.PI;   // phi; unit: ms per s, a full turn
  var RM = root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var B = Math.pow(PHI, 5) * MS;                                          // phi: one breath, PHI^5 s
  var STILL = IP * IP;                                                    // phi: below PHI^-2 the plain emoji shows
  var EASE = B * Math.pow(IP, 3), FADE = MS * IP, TICK = MS * Math.pow(IP, 4);   // phi: slow to a stop over PHI^-3 of a breath, cross-fade PHI^-1 s, tick PHI^-4 s
  var PHONE = !!(root.matchMedia && matchMedia('(hover: none), (pointer: coarse)').matches);
  var MAXN = Math.floor(Math.pow(PHI, PHONE ? 3 : 4));                  // phi: 4 on a phone, 6 on a desktop
  var DIR = 'media/emoji-alive/';
  var STRIP = {                                                           // anchor: each strip's own frame count; every frame is 2 x the source's 30 ms frame
    '\uD83D\uDE80': ['1f680', 10], '\uD83E\uDD8B': ['1f98b', 42], '\uD83D\uDC2C': ['1f42c', 26], '\uD83C\uDF0D': ['1f30d', 40] };
  var FRAME = 2 * 30;                                                     // anchor: ms per strip frame (the source's 30 ms frame, every second one kept)
  var css = '.ea-g{visibility:hidden}.ea-v{position:absolute;overflow:hidden;pointer-events:none;line-height:0;contain:strict}' +
    '.ea-s{position:absolute;left:0;top:0;height:100%;background-repeat:no-repeat;background-size:100% 100%;will-change:transform}';
  var st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);
  var A = [], img = {}, stats = { lifts: 0, refused: 0, retired: 0, shown: 0, peak: 0, loads: 0 };
  var timer = 0;

  function code(el) { var t = (el && el.textContent || '').replace(/\uFE0F/g, '').trim(); return STRIP[t] ? t : null; }
  function own(n) { for (var i = 0; i < n.childNodes.length; i++) if (n.childNodes[i].nodeType === 3 && n.childNodes[i].nodeValue.trim()) return true; return false; }
  function leaf(el) { var n = el; while (n && !own(n) && n.children.length === 1) n = n.children[0]; return n; }   // the element that holds the glyph's own text
  function layer(el) {                                                    // 0 front, 1 middle, 2 back: the outermost stacking z under the body
    var z = 0, p = el, h = doc.getElementById('q-head'), hz = h ? (parseInt(getComputedStyle(h).zIndex, 10) || 0) : 0;
    for (; p && p !== doc.body && p !== doc.documentElement; p = p.parentElement) { var cs = getComputedStyle(p); if (cs.position !== 'static' && cs.zIndex !== 'auto') z = parseInt(cs.zIndex, 10) || 0; }
    return z < 0 ? 2 : (hz > 0 && z >= hz) ? 0 : 1;
  }
  function speed() { var m = null; try { var M = root.RatioPump && RatioPump.master(); m = M && typeof M.ratio === 'number' ? M.ratio : null; } catch (e) {}
    if (m == null || !(m >= 0)) m = 1 / 2; m = Math.min(1, m); return Math.pow(PHI, 2 * m - 1); }   // phi: PHI^-1 .. PHI; unit: no pump = the middle (1)
  function lvl(o, now) { return o.a0 * Math.pow(IP, Math.floor((now - o.t0) / B)); }
  function endAt(o) { var n = 0; while (o.a0 * Math.pow(IP, n) >= STILL * (1 - 1e-9)) n++; return o.t0 + n * B; }   // unit: float guard so a lift of exactly PHI^-2 holds one breath
  function find(el) { for (var i = 0; i < A.length; i++) if (A[i].el === el) return A[i]; return null; }
  function live() { return A.filter(function (o) { return o.phase !== 'out'; }); }
  function sheet(c, cb) { var k = STRIP[c][0], m = img[k];
    if (m && m.ok) return cb(true); if (!m) { m = img[k] = { ok: false, q: [] }; var im = new Image(); stats.loads++;
      im.onload = function () { m.ok = true; m.q.splice(0).forEach(function (f) { f(true); }); }; im.onerror = function () { m.q.splice(0).forEach(function (f) { f(false); }); delete img[k]; };
      im.src = DIR + k + '.webp'; m.im = im; }
    m.q.push(cb); }

  function lift(el, share, why) {
    if (RM || !el || !el.isConnected) return 0;
    el = leaf(el); var c = code(el); if (!c) return 0;
    var now = performance.now(), o = find(el), L = o ? o.layer : layer(el), cap = Math.pow(IP, L);
    var up = cap * Math.min(1, 2 * (share == null ? 1 / 2 : Math.max(0, +share) || 0));   // unit: twice the share, so an even split is a full lift
    var a = Math.min(cap, (o && o.phase !== 'out' ? lvl(o, now) : 0) + up);
    stats.lifts++;
    if (a < STILL * (1 - 1e-9)) return 0;                                 // too small a lift: it stays still
    if (o && o.phase !== 'out') { o.a0 = a; o.t0 = now; o.why = why; return a; }
    var on = live();
    if (on.length >= MAXN) {
      var w = on.slice().sort(function (p, q) { return lvl(p, now) - lvl(q, now) || p.t0 - q.t0; })[0];
      if (lvl(w, now) >= a) { stats.refused++; return 0; }
      stats.retired++; out(w, true);
    }
    if (o) drop(o);                                                       // fading out: start again cleanly
    o = { el: el, c: c, layer: L, a0: a, t0: now, why: why, phase: 'load' }; A.push(o);
    stats.peak = Math.max(stats.peak, live().length);
    sheet(c, function (ok) { if (!ok || o.phase !== 'load') { if (!ok) drop(o); return; } mount(o); });
    go(); return a;
  }

  function mount(o) {
    var el = o.el, tn = null, i;
    if (!el.isConnected) return drop(o);
    for (i = 0; i < el.childNodes.length; i++) if (el.childNodes[i].nodeType === 3 && el.childNodes[i].nodeValue.trim()) { tn = el.childNodes[i]; break; }
    if (!tn) return drop(o);
    var g = doc.createElement('span'); g.className = 'ea-g'; el.insertBefore(g, tn); g.appendChild(tn);
    if (getComputedStyle(el).position === 'static') { o.pos = el.style.position; el.style.position = 'relative'; o.rel = true; }
    var s = g.offsetWidth || g.offsetHeight, v = doc.createElement('span'), sp = doc.createElement('span'), n = STRIP[o.c][1];
    v.className = 'ea-v'; v.setAttribute('aria-hidden', 'true');
    v.style.cssText = 'left:' + g.offsetLeft + 'px;top:' + (g.offsetTop + (g.offsetHeight - s) / 2) + 'px;width:' + s + 'px;height:' + s + 'px';   // unit: a square the glyph's width, centred on its line box
    sp.className = 'ea-s'; sp.style.width = (n * 100) + '%'; sp.style.backgroundImage = 'url(' + DIR + STRIP[o.c][0] + '.webp)';   // unit: n frames side by side
    v.appendChild(sp); el.appendChild(v);
    o.g = g; o.v = v; o.sp = sp; o.phase = 'run'; stats.shown++;
    o.an = sp.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }], { duration: n * FRAME, iterations: Infinity, easing: 'steps(' + n + ')' });
    o.an.playbackRate = speed();
  }

  function out(o, quick) {                                               // ease back to the still glyph
    if (o.phase === 'out') return; if (o.phase === 'load' || !o.v) { o.phase = 'out'; return drop(o); }
    o.phase = 'out'; var ms = quick ? FADE * IP : FADE;                   // phi: a retired one fades PHI^-1 faster
    try { o.an.pause(); } catch (e) {}
    o.g.classList.remove('ea-g');                                      // the glyph shows again (still inherits the owner's own hide)
    var f1 = o.v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
    o.g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms });
    f1.onfinish = f1.oncancel = function () { drop(o); };
  }

  function drop(o) {
    var i = A.indexOf(o); if (i >= 0) A.splice(i, 1); o.phase = 'out';
    try { o.an && o.an.cancel(); } catch (e) {}
    if (o.v && o.v.parentNode) o.v.parentNode.removeChild(o.v);
    if (o.g && o.g.parentNode) { var p = o.g.parentNode; while (o.g.firstChild) p.insertBefore(o.g.firstChild, o.g); p.removeChild(o.g); }
    if (o.rel) o.el.style.position = o.pos || '';
    o.v = o.g = o.sp = o.an = null;
  }

  function tick() {
    timer = 0; var now = performance.now(), sp = speed();
    A.slice().forEach(function (o) {
      if (!o.el.isConnected || (o.g && !o.g.isConnected) || (o.g && !o.g.firstChild)) return drop(o);   // its owner went or rewrote its text
      if (o.phase !== 'run') return;
      var rem = endAt(o) - now;
      if (rem <= 0) return out(o);
      var e = Math.min(1, rem / EASE), r = sp * Math.sin(e * TAU / 4);   // unit: a quarter sine, full speed until the last PHI^-3 of a breath
      if (Math.abs(o.an.playbackRate - r) > 1e-3) { try { o.an.updatePlaybackRate ? o.an.updatePlaybackRate(r) : (o.an.playbackRate = r); } catch (x) { o.an.playbackRate = r; } }
    });
    go();
  }
  function go() { if (!timer && A.length) timer = setTimeout(tick, TICK); }
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden) go(); });

  root.EmojiAlive = {
    lift: lift,
    info: function () { var now = performance.now(); return { max: MAXN, phone: PHONE, speed: speed(), stats: stats, loaded: Object.keys(img).filter(function (k) { return img[k].ok; }),
      active: A.map(function (o) { return { c: o.c, layer: o.layer, level: lvl(o, now), phase: o.phase, why: o.why, rate: o.an ? o.an.playbackRate : 0, endsIn: (endAt(o) - now) / MS }; }) }; },
    stillAll: function () { A.slice().forEach(function (o) { out(o, true); }); }   // debug: ease every one back now
  };
})();
