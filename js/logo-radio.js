/* LOGO RADIO (Kids Club standard 'The logo tap starts the sound, the radio carries it on', Danny 16:3x AWST 26 Oct 2026).
   Pressing Ed's logo (the header mark or the logo card) creates or resumes the DJ's audio engine INSIDE that tap (iOS only lets sound
   start in a gesture) by pressing Ed's DJ for him, so its media bridge and Media Session start in the gesture too. While the logo zoom is
   open the radio plays one phi rung under the logo (shared.md Loudness, Danny 16:42 AWST: logo = music x PHI, music dips x PHI^-1 under
   it, both with free-wheel glides from B); when he closes the zoom the logo glides down to the radio level and out, and the radio carries
   on in the background. (16:42 fix: the first version held the radio SILENT under the zoom and faded it up from zero at close; that was
   the sudden jump to much louder Danny heard. The radio is never held silent now, so close is only the logo landing on the radio.) The DJ button controls and stops it as before;
   its deeper controls (the panel, pumps, knobs) stay closed unless he opens them. Nothing here touches js/dad-mark-zoom.js: the zoom's
   open / close are read from the header mark's aria-expanded, which the zoom sets for both the header mark and the logo card.
   API (tests): LogoRadio.info(), LogoRadio.holding */
(function (root, doc) {
  'use strict';
  if (root.LogoRadio) return;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, MS = 1e3;                        // phi: the golden ratio, the sole scaling factor
  var LOGO = '.dad-zoom[data-zoom="dad"], .fc-card';                              // anchor: the header mark and the logo card (js/first-content.js)
  var R = { holding: false, started: false, log: [] };
  function dj() { return root.DadAutoDJ && root.DadAutoDJ._kit ? root.DadAutoDJ : null; }
  function note(m) { R.log.push([Date.now(), m]); if (R.log.length > 34) R.log.splice(0, 13); }   // phi: Fibonacci log window
  function duckNode() { var D = dj(); return D && D._kit.duck; }
  function ctx() { var D = dj(); return D && D._kit.ctx; }
  function release() {}                                                           // kept for callers (js/logo-pad.js): the radio is never held now
  function tap(e) {                                                                // inside the gesture, before the logo's own click opens the zoom
    var el = e.target && e.target.closest ? e.target.closest(LOGO) : null; if (!el) return;
    var D = dj(), b = doc.getElementById('dj-play'); if (!D || !b) { note('tap: DJ not loaded'); return; }
    if (D.playing && !D.pending) { note('tap: radio already on'); return; }        // already playing: the logo ducks it as before
    try { b.click(); } catch (er) {}                                               // Ed's DJ: switch on (sound switch too), engine created / resumed now
    R.started = true; note('tap: radio started, ctx ' + (ctx() ? ctx().state : 'none'));
  }
  doc.addEventListener('click', tap, true);
  function watch() {                                                               // zoom open / close from the header mark's aria-expanded
    var h = doc.querySelector('.dad-zoom[data-zoom="dad"]'); if (!h || !root.MutationObserver) return;
    var was = h.getAttribute('aria-expanded') === 'true';                         // the zoom sets 'false' when it first loads: only a real open -> close counts
    new MutationObserver(function () { var open = h.getAttribute('aria-expanded') === 'true'; if (open === was) return; was = open; note('zoom ' + (open ? 'open' : 'closed'));
      if (open && !R.pad) { R.pad = 1; var sc = doc.createElement('script'); sc.src = 'js/logo-pad.js?v=1'; sc.async = true; doc.head.appendChild(sc); }   // the logo Kaoss pad loads on the first open only
      if (!open) R.started = false; })
      .observe(h, { attributes: true, attributeFilter: ['aria-expanded'] });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', watch); else watch();
  root.LogoRadio = { get holding() { return R.holding; }, release: release, info: function () { var D = dj(); return { holding: R.holding, playing: !!(D && D.playing), ctx: ctx() ? ctx().state : 'none', duck: duckNode() ? duckNode().gain.value : null }; },
    log: function () { return R.log.map(function (l) { return new Date(l[0]).toTimeString().slice(0, 8) + ' ' + l[1]; }); } };
})(window, document);
