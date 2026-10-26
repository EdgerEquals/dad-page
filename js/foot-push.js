/* FOOTPUSH CRITTERS (Danny 26 Oct: the critters in the footer's bottom-right corner get more room, move noticeably faster and become
   the ACTIVE side of a tug-of-war with the bottom line's text; they push it left, it pushes back, they bounce off each other; about
   once a minute one side wins and celebrates, then it settles with the text fully readable, nothing cut off at the interface).
   Tier 2 (idle). Adds to the strip's own marquee, never replaces it:
     ROOM    the #fcr box is widened one phi rung (its own measured width x PHI), re-measured on resize / rotation.
     SPEED   the marquee runs two rungs faster: --phi-marquee x PHI^-2 (PHI^8 47 s -> PHI^6 17.9 s).
     PUSH    one contact coordinate d (px, + = critters into the text). Each side has a force made of its own pump node (3 phi modes
             under the page pump) times an outside feed (critters: the Moon's phase, the strip's own clock; text: the tide reading and
             the time of day, via PhiPumps.subscribe). The critters' mean force is PHI x the text's, so they lead. d follows the force
             difference on an underdamped phi spring (damping PHI^-2), so the two bounce off each other; at each critter crest a small
             kick. Reach = one critter glyph (the tug leans about PHI^-1 of it; a ratio of what is drawn, no px constants).
     ROUND   one round per PHI^8.5 s (59.8 s): the critters win if their force integrated over the round beat the text's by more than their usual PHI lead, otherwise the text wins, and celebrates for PHI^2 s
             (critters: one big shove PHI^2 x reach and a hop; text: shoves them back PHI^-1 x reach and the text hops), then a
             critically damped settle over PHI^3 s to d = 0: separate boxes again, the text fully readable.
   CSS `translate` only (the individual property, so foot-line.js's own transforms are untouched); one rAF capped at PHI^-7 s,
   paused while hidden; reduced motion: room only, no push, no hop. FootPush.info() reports the state. */
(function () {
  'use strict';
  var doc = document, root = window;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, TAU = 2 * Math.PI, MS = 1e3;   // phi; unit: a turn, ms per s
  var RM = root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fcr = doc.getElementById('fcr'), txt = doc.getElementById('footLine');
  if (!fcr || !txt) return;
  // ---------- room + speed ----------
  function room() { fcr.style.width = ''; var w = fcr.getBoundingClientRect().width; if (w) fcr.style.width = w * PHI + 'px'; }   // phi: one rung wider than its own CSS width
  function speed() { var tr = fcr.querySelector('.ct'); if (!tr) return; var m = parseFloat(getComputedStyle(doc.documentElement).getPropertyValue('--phi-marquee')) || Math.pow(PHI, 8);   // phi: the PHI^8 marquee clock
    tr.style.animationDuration = m * Math.pow(IP, 2) + 's'; }           // phi: two rungs faster
  room(); speed();
  var rq = 0; addEventListener('resize', function () { if (!rq) rq = requestAnimationFrame(function () { rq = 0; room(); }); });
  if (RM || !('translate' in doc.documentElement.style)) { root.FootPush = { info: function () { return { width: fcr.style.width, still: true }; } }; return; }
  // ---------- forces ----------
  var Pp = root.PhiPumps, nc = null, nt = null, feeds = {};
  function sub(n) { try { if (!feeds[n] && root.PhiPumps) feeds[n] = PhiPumps.subscribe(n); var v = feeds[n] ? feeds[n].get() : null; return v == null ? 0 : +v; } catch (e) { return 0; } }
  function pump(side) { var P = root.PhiPumps; if (!P) return 1;
    if (side === 'c' && !nc) nc = P.node('footpush-critters', 3, 2, IP * IP, P.page, 5);   // phi: 3 pumps, rungs 2.. (fast, they are the busy side), depth PHI^-2
    if (side === 't' && !nt) nt = P.node('footpush-text', 3, 3, IP * IP, P.page, 8);       // phi: 3 pumps, rungs 3.. (slower, the text answers), depth PHI^-2
    try { return (side === 'c' ? nc : nt).out(); } catch (e) { return 1; } }
  var t0 = performance.now();
  function force(side, t) {
    if (side === 'c') return PHI * pump('c') * (1 + Math.pow(IP, 2) * sub('moon') + Math.pow(IP, 3) * Math.sin(TAU * t / Math.pow(PHI, 2)));   // phi: lead PHI; moon feed PHI^-2; crest every PHI^2 s
    return pump('t') * (1 + Math.pow(IP, 2) * sub('tide') + Math.pow(IP, 3) * sub('daytime'));   // phi: tide feed PHI^-2, time of day PHI^-3
  }
  // ---------- spring ----------
  var d = 0, v = 0, ty = 0, vy = 0, last = 0, ROUND = Math.pow(PHI, 8.5), CEL = Math.pow(PHI, 2), SET = Math.pow(PHI, 3);   // phi: round 59.8 s, celebrate PHI^2 s, settle PHI^3 s
  var note = fcr.parentElement, free = 0, lastFree = -Infinity, shown = 0, SUB = Math.pow(IP, 7);   // phi: sub-step PHI^-7 s
  var round = { start: 0, ic: 0, it: 0, win: null, wins: { critters: 0, text: 0 } }, crest = 0;
  function reach() { var fs = parseFloat(getComputedStyle(fcr).fontSize) || parseFloat(getComputedStyle(doc.documentElement).fontSize); return fs; }   // unit: one critter glyph
  function step(t, dt) {
    var R = reach(), into = t - round.start, fc = force('c', t), ft = force('t', t), target, zeta, w = TAU / PHI;   // phi: spring period PHI s
    if (into < ROUND - CEL - SET) { round.ic += fc * dt; round.it += ft * dt; target = R * PHI * (fc - ft) / fc; zeta = IP * IP;   // the tug: underdamped, bouncing
      var c = Math.floor(t / Math.pow(PHI, 2)); if (c !== crest) { crest = c; v += R * PHI * fc / PHI; } }                    // phi: a kick at each critter crest
    else if (into < ROUND - SET) { if (!round.win) { round.win = round.ic >= round.it * PHI ? 'critters' : 'text';   /* phi: they always lead by PHI, so they win only on a round where they beat their own lead */ round.wins[round.win]++; hop(round.win); }
      target = round.win === 'critters' ? R * PHI * PHI : -R * IP; zeta = IP * IP; }                                         // phi: the winner's shove
    else { target = 0; zeta = 1; }                                                                                             // unit: critically damped settle
    if (into >= ROUND) { round.start = t; round.ic = round.it = 0; round.win = null; }
    var n = Math.ceil(dt / SUB), h = n ? dt / n : 0, i;                                                                            // semi-implicit Euler in PHI^-7 s sub-steps (stable at any frame gap)
    for (i = 0; i < n; i++) { v += (-w * w * (d - target) - 2 * zeta * w * v) * h; d += v * h;
      vy += (-w * w * ty - 2 * IP * w * vy) * h; ty += vy * h; }                                                              // phi: the hop decays on its own
    var settled = target === 0 && Math.abs(d) < Math.pow(IP, 8) * R && Math.abs(v) < Math.pow(IP, 8) * R;                   // phi: within PHI^-8 of a reach
    if (settled) d = v = 0;
    if (t - lastFree > IP) { lastFree = t; var nb = note.getBoundingClientRect(), tb = txt.getBoundingClientRect(); free = Math.max(0, tb.left + shown - nb.left); }   // phi: re-measure the text's free room every PHI^-1 s (items change)
    var dc = d, dtx = d > 0 ? Math.min(d, free) : 0; shown = dtx;                                                         // critters move by d; the text gives way only into its free room, beyond that the critters lean over its end
    fcr.style.translate = (-dc).toFixed(2) + 'px ' + (round.win === 'critters' ? ty : 0).toFixed(2) + 'px';
    txt.style.translate = (-dtx).toFixed(2) + 'px ' + (round.win === 'text' ? ty : 0).toFixed(2) + 'px';
  }
  function hop(who) { vy = -reach() * IP * TAU / PHI; }                                                                        // phi: an upward kick, about PHI^-1 of a glyph high
  var raf = 0, FRAME = MS * Math.pow(IP, 7);                               // phi: frame cap PHI^-7 s
  function tick(now) { raf = 0; if (doc.hidden) return; if (now - last >= FRAME) { var dt = last ? Math.min(now - last, MS * IP) / MS : 0; last = now; step((now - t0) / MS, dt); }   // unit: dt capped at PHI^-1 s
    raf = requestAnimationFrame(tick); }
  function go() { if (!raf && !doc.hidden) raf = requestAnimationFrame(tick); }
  doc.addEventListener('visibilitychange', function () { last = 0; if (!doc.hidden) go(); });
  round.start = -ROUND * IP * IP;                                          // phi: first win lands a golden fraction into the first minute
  go();
  root.FootPush = { info: function () { return { width: fcr.style.width, d: d, reach: reach(), round: { into: (performance.now() - t0) / MS - round.start, win: round.win, wins: round.wins }, critterDur: (fcr.querySelector('.ct') || {}).style ? fcr.querySelector('.ct').style.animationDuration : null }; } };
})();
