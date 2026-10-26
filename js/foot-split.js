/* foot-split.js (Danny 14:33 AWST 26 Oct): the footer tty's line 3 (previous log line, #tprev) keeps its text compact on the left; the
   rolling readout from line 2 (.troll, quiz-tty2.js) moves to the right and stretches down over line 2 + line 3, each cell now two rows
   (label over value). The roll is translateY(-50%) of a two-cell stack, so its travel follows the new height by itself.
   Sizes are measured anchors (the bar, line 3 and the dial / theme buttons as laid out) and phi ratios. No DJ files touched. */
(function (root, doc) {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI;                        // phi: the golden ratio and its inverse
  var css = '.foot .tty .troll.fsx{position:absolute;flex:none;left:var(--fs-x);top:var(--fs-y);width:var(--fs-w);height:var(--fs-h);' +
    'justify-content:flex-end;gap:var(--fs-g);text-align:center;font-size:var(--fs-v);line-height:var(--fs-r);z-index:1}' +
    '.foot .tty .troll.fsx .trw{flex:0 1 auto}' +
    '.foot .tty .troll.fsx b{height:var(--fs-h);display:flex;flex-direction:column;justify-content:center;align-items:center;line-height:var(--fs-r)}' +
    '.foot .tty .troll.fsx u{display:block;font-size:var(--fs-l);line-height:var(--fs-r)}' +
    '.foot .tout .lp.fsx-l{max-width:var(--fs-lw);font-size:var(--fs-pf)}';
  var st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);
  var tty, bar, roll, prev, dls, raf = 0;
  function box(e) { return e.getBoundingClientRect(); }
  function fit() {
    raf = 0; if (!tty || !roll || !prev) return;
    var T = box(tty), B = box(bar), P = box(prev), D = dls ? box(dls) : null;
    var O = box(prev.parentNode), y = B.top - T.top, h = O.top + O.height / 2 - B.top;   // anchor: bar top to the end of line 3 (the log box's first of two rows)
    var right = (D && D.width ? D.left : B.right) - T.left - h * Math.pow(IP, 3);   // phi: a small gap before the dial button
    var g = h * Math.pow(IP, 2);                                          // phi: gap between cells
    var r = h / 2, v = r * Math.pow(IP, 1 / 2), l = r * IP;               // phi: half-height rows, value a half rung under the row, label one rung
    var s = tty.style;
    s.setProperty('--fs-y', y + 'px'); s.setProperty('--fs-h', h + 'px'); s.setProperty('--fs-g', g + 'px');
    s.setProperty('--fs-r', r + 'px'); s.setProperty('--fs-v', v + 'px'); s.setProperty('--fs-l', l + 'px');
    roll.classList.add('fsx'); s.setProperty('--fs-x', '0px'); s.setProperty('--fs-w', 'auto');
    var need = 0, cells = roll.querySelectorAll('.trw');
    Array.prototype.forEach.call(cells, function (c) { need += Math.max(c.scrollWidth, h * PHI); });   // phi: each cell at least PHI x its height
    need += g * Math.max(0, cells.length - 1);
    var w = Math.max(need, (right - (P.left - T.left)) * Math.pow(IP, 4));    // phi: at least PHI^-4 of the log line's width
    var x = right - w;
    s.setProperty('--fs-x', x + 'px'); s.setProperty('--fs-w', w + 'px');
    if (!prev._fs0) prev._fs0 = parseFloat(getComputedStyle(prev).fontSize);   // anchor: line 3's own font size as laid out
    s.setProperty('--fs-pf', prev._fs0 * Math.pow(IP, 1 / 4) + 'px');             // phi: a quarter rung more compact
    prev.classList.add('fsx-l'); s.setProperty('--fs-lw', Math.max(0, x - (P.left - T.left) - g) + 'px');   // unit: line 3 ends one gap before the box
  }
  function soon() { if (!raf) raf = requestAnimationFrame(fit); }
  function init() {
    tty = doc.getElementById('tty'); prev = doc.getElementById('tprev'); dls = doc.getElementById('dls');
    bar = tty && tty.querySelector('.ttybar'); roll = bar && bar.querySelector('.troll');
    if (!roll) { if (doc.readyState !== 'complete') return addEventListener('load', init, { once: true }); return; }
    fit();
    addEventListener('resize', soon); addEventListener('orientationchange', soon);
    if (root.visualViewport) visualViewport.addEventListener('resize', soon);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(soon);
    if (root.MutationObserver) new MutationObserver(soon).observe(roll, { childList: true });
    if (root.ResizeObserver) new ResizeObserver(soon).observe(prev.parentNode);   // quiz-tty2 rebuilds cells on the 600 px switch
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})(window, document);
