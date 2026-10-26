/* LOGO RADIO (Kids Club standard 'The logo tap starts the sound, the radio carries it on', Danny 16:3x AWST 26 Oct 2026).
   Pressing Ed's logo (the header mark or the logo card) creates or resumes the DJ's audio engine INSIDE that tap (iOS only lets sound
   start in a gesture) by pressing Ed's DJ for him, so its media bridge and Media Session start in the gesture too. While the logo zoom is
   open the radio runs silent under the logo's own sting and sound; when he closes the zoom the radio, Ed's DJ, fades up under the
   closing sting with an equal-power PHI s crossfade and carries on in the background. The DJ button controls and stops it as before;
   its deeper controls (the panel, pumps, knobs) stay closed unless he opens them. Nothing here touches js/dad-mark-zoom.js: the zoom's
   open / close are read from the header mark's aria-expanded, which the zoom sets for both the header mark and the logo card.
   While the radio is held silent, the logos' PageMusic.duck calls are remembered and applied when it fades up.
   API (tests): LogoRadio.info(), LogoRadio.holding */
(function (root, doc) {
  'use strict';
  if (root.LogoRadio) return;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, MS = 1e3;                        // phi: the golden ratio, the sole scaling factor
  var LOGO = '.dad-zoom[data-zoom="dad"], .fc-card';                              // anchor: the header mark and the logo card (js/first-content.js)
  var R = { holding: false, started: false, lastDuck: false, orig: null, log: [] };
  function dj() { return root.DadAutoDJ && root.DadAutoDJ._kit ? root.DadAutoDJ : null; }
  function note(m) { R.log.push([Date.now(), m]); if (R.log.length > 34) R.log.splice(0, 13); }   // phi: Fibonacci log window
  function duckNode() { var D = dj(); return D && D._kit.duck; }
  function ctx() { var D = dj(); return D && D._kit.ctx; }
  function hold() {                                                                // silent under the zoom; the logos' duck calls wait
    var g = duckNode(), c = ctx(); if (!g || !c) return;
    R.holding = true; var P = root.PageMusic;
    if (P && !R.orig) { R.orig = P.duck; R.lastDuck = !!P.ducked; P.duck = function (on) { R.lastDuck = !!on; }; }
    try { g.gain.cancelScheduledValues(c.currentTime); g.gain.setValueAtTime(0, c.currentTime); } catch (e) {}
  }
  function release() {                                                             // the zoom closed: the radio fades up under the closing sting
    if (!R.holding) return; R.holding = false;
    var P = root.PageMusic; if (P && R.orig) { P.duck = R.orig; R.orig = null; }
    var g = duckNode(), c = ctx(); if (!g || !c) return;
    var to = R.lastDuck ? IP : 1, t = c.currentTime;                              // rule 6: ducked x PHI^-1 if a logo is still sounding
    try { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0, t); var n = 13;                 // phi: PHI s equal-power crossfade in 13 ramps (Fibonacci), so a later duck call can still land
      for (var i = 1; i <= n; i++) g.gain.linearRampToValueAtTime(to * Math.sin(i / n * Math.PI / 2), t + PHI * i / n); } catch (e) {}
    note('radio up ' + (to === 1 ? 'full' : 'ducked'));
  }
  function tap(e) {                                                                // inside the gesture, before the logo's own click opens the zoom
    var el = e.target && e.target.closest ? e.target.closest(LOGO) : null; if (!el) return;
    var D = dj(), b = doc.getElementById('dj-play'); if (!D || !b) { note('tap: DJ not loaded'); return; }
    if (D.playing && !D.pending) { note('tap: radio already on'); return; }        // already playing: the logo ducks it as before
    try { b.click(); } catch (er) {}                                               // Ed's DJ: switch on (sound switch too), engine created / resumed now
    R.started = true; note('tap: radio started, ctx ' + (ctx() ? ctx().state : 'none'));
    hold();
  }
  doc.addEventListener('click', tap, true);
  function watch() {                                                               // zoom open / close from the header mark's aria-expanded
    var h = doc.querySelector('.dad-zoom[data-zoom="dad"]'); if (!h || !root.MutationObserver) return;
    var was = h.getAttribute('aria-expanded') === 'true';                         // the zoom sets 'false' when it first loads: only a real open -> close counts
    new MutationObserver(function () { var open = h.getAttribute('aria-expanded') === 'true'; if (open === was) return; was = open; note('zoom ' + (open ? 'open' : 'closed'));
      if (open) { if (R.started && !R.holding && dj() && dj().playing) hold(); } else { R.started = false; release(); } })
      .observe(h, { attributes: true, attributeFilter: ['aria-expanded'] });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', watch); else watch();
  root.LogoRadio = { get holding() { return R.holding; }, info: function () { var D = dj(); return { holding: R.holding, playing: !!(D && D.playing), ctx: ctx() ? ctx().state : 'none', duck: duckNode() ? duckNode().gain.value : null }; },
    log: function () { return R.log.map(function (l) { return new Date(l[0]).toTimeString().slice(0, 8) + ' ' + l[1]; }); } };
})(window, document);
