/* FOOTBOUNCE (Danny 21:39 AWST 26 Oct, t257u: 'allow them to bounce around a bit between themselves so sometimes they're all pushing
   together but sometimes they're bouncing back-and-forth and give them a little bit more room ... bounce and build their way out of the
   corner and eventually take over the whole text bar and celebrate'). Replaces the single tug coordinate below with a pack of critters:
     ROOM     the corner box is PHI^2 x its CSS width (was PHI x).
     PACK     round(PHI^3) = 4 critters from the strip's own Moon-ordered row, each its own body on the bottom line (overlay, translate
              only; the strip's marquee keeps running underneath, hidden, so its Moon refill and the popup are unchanged).
     DRIVE    each critter swings on the critter crest (PHI^2 s) with a lean into the text of PHI^-1 x coherence of the swing; its phase is
              (1 - coherence) x i golden angles. Coherence rides the breath slot B = PHI^5 s x the critter pump: in phase = they all push
              together, out of phase = they bounce back and forth off each other (restitution PHI^-1, a little hop on a hard knock).
     BUILD    the frontier X (0 = the corner, 1 = the whole bar) grows by PHI^-7 per s x (critter force x (PHI^-1 + PHI^-2 coherence)
              - text force) / text force, the same two pumped forces as the tug (critters lead by PHI; moon / tide / time of day feeds),
              so they gain most while pushing together and the text can push back. Text under the pack dims to at most PHI^-2.
     CELEBRATE at X = 1: PHI^2 s, they spread to even slots along the bar and hop in a wave (PHI^-3 s apart, twice, PHI^-1 s apart).
     HOME     then the frontier relaxes back (tau PHI s, PHI^3 s) and the next build starts from the corner.
   Was: FOOTPUSH CRITTERS (Danny 26 Oct: the critters in the footer's bottom-right corner get more room, move noticeably faster and become
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
  function room() { fcr.style.width = ''; var w = fcr.getBoundingClientRect().width; if (w) fcr.style.width = w * PHI * PHI + 'px'; }   // phi: two rungs wider than its own CSS width (footbounce: one more rung of room)
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
  function reach() { var fs = parseFloat(getComputedStyle(fcr).fontSize) || parseFloat(getComputedStyle(doc.documentElement).fontSize); return fs; }   // unit: one critter glyph
  // ---------- pack ----------
  var note = fcr.parentElement, track = fcr.querySelector('.ct'), GA = TAU * IP * IP, N = Math.round(Math.pow(PHI, 3));   // phi: golden angle; pack of round(PHI^3)
  var CREST = Math.pow(PHI, 2), BREATH = Math.pow(PHI, 5), BUILD = Math.pow(IP, 7), CEL = Math.pow(PHI, 2), SET = Math.pow(PHI, 3), SUB = Math.pow(IP, 7);   // phi: crest, breath slot, build rate, celebrate, settle, sub-step
  var tx = 0, tv = 0, push = { on: false, n: 0, resp: 0, open: [] }, w = TAU / PHI, layer = null, C = [], X = 0, phase = 'build', pt0 = 0, geo = null, lastGeo = -Infinity, coh = 0, stats = { takeovers: 0, knocks: 0 };   // phi: body frequency (period PHI s)
  function glyphs() { var sp = fcr.querySelector('.ct>span'), a = sp ? sp.textContent.split(' ').filter(Boolean) : []; return a.length ? a : ['\uD83D\uDC1E']; }
  function build() {
    if (getComputedStyle(note).position === 'static') note.style.position = 'relative';
    layer = doc.createElement('span'); layer.className = 'fcb'; layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:1';
    var g = glyphs(), cs = getComputedStyle(fcr);
    for (var i = 0; i < N; i++) { var e = doc.createElement('span'); e.textContent = g[i % g.length];
      e.style.cssText = 'position:absolute;top:0;left:0;white-space:nowrap;line-height:' + cs.lineHeight + ';font-size:' + cs.fontSize + ';will-change:transform';
      layer.appendChild(e); C.push({ el: e, x: 0, v: 0, y: 0, vy: 0, hop: [] }); }
    note.appendChild(layer); if (track) track.style.visibility = 'hidden';
  }
  function regive() { var g = glyphs(); C.forEach(function (c, i) { c.el.textContent = g[i % g.length]; }); }
  function measure(t) {                                                    // geometry in px, re-read every PHI^-1 s (layout and the line change)
    if (geo && t - lastGeo < IP) return geo; lastGeo = t;
    var nb = note.getBoundingClientRect(), hb = fcr.getBoundingClientRect(), gw = C.length ? C[0].el.getBoundingClientRect().width : 0;
    geo = { home: hb.width, reach: hb.left - nb.left, left: hb.right - nb.left, top: hb.top - nb.top, gw: gw || reach() };
    return geo;
  }
  function knock(a, b) {                                                   // equal masses, restitution PHI^-1
    var rel = a.v - b.v; if (rel <= 0) return; var e = IP, va = a.v, vb = b.v;
    a.v = ((1 - e) * va + (1 + e) * vb) / 2; b.v = ((1 + e) * va + (1 - e) * vb) / 2; if (rel > reach() * w * Math.pow(IP, 4)) stats.knocks++;   // phi: count a real knock, not resting contact
    var R = reach(), hard = R * w * IP * IP; if (rel > hard) { var k = Math.min(rel * IP * IP * IP, R * w * IP); a.vy -= k; b.vy -= k; } }   // phi: a hop only on a hard knock, at most PHI^-1 of a glyph's swing
  // PUSH -> RESPONSE (Danny 21:42 AWST, t259u: 'it doesn't respond every time'). Before, the text only gave way into its 'free room'
  // (its left edge minus the line's left edge), which is zero because the readout starts flush left, so most pushes moved nothing and only a
  // round's end hop showed. Now every contact of the lead critter with the text (one per touch, counted inside the PHI^-7 s sub-steps, so a
  // frame gap can't skip it; no cooldown, a new push adds to a recoil still running) kicks the text's own recoil spring by the push:
  // PHI^-1 of the critter's speed, at least PHI^-3 of a glyph's swing, so the gentlest push still shows and a hard one shows more.
  function shove(vc, R) { if (push.on) return; push.on = true; push.n++; push.open.push({ t: tNow, b: tx }); tv += Math.max(vc * IP, R * w * Math.pow(IP, 3)); }
  var tNow = 0, last = 0;
  function step(t, dt) { tNow = t;
    var G = measure(t), R = reach(), gw = G.gw, span = G.home + X * G.reach, fc = force('c', t), ft = force('t', t);
    coh = Math.max(0, Math.min(1, pump('c') * (1 + Math.sin(TAU * t / BREATH)) / 2));
    var into = t - pt0;
    if (phase === 'build') { X += BUILD * (fc * (IP + IP * IP * coh) - ft) / ft * dt; X = Math.max(0, Math.min(1, X));
      if (X >= 1) { phase = 'cel'; pt0 = t; stats.takeovers++; C.forEach(function (c, i) { c.hop = [i * Math.pow(IP, 3), IP + i * Math.pow(IP, 3)]; }); } }
    else if (phase === 'cel') { if (into >= CEL) { phase = 'home'; pt0 = t; } }
    else if (phase === 'home') { X *= Math.exp(-dt / PHI); if (into >= SET) { X = 0; phase = 'build'; pt0 = t; regive(); } }   // phi: tau PHI s over PHI^3 s
    var A = R * w * w * IP, z = IP * IP, n = Math.ceil(dt / SUB), h = n ? dt / n : 0, i, j;   // phi: drive PHI^-1 of a glyph x w^2; damping PHI^-2
    for (j = 0; j < n; j++) {
      tv += (-w * w * tx - 2 * IP * w * tv) * h; tx += tv * h;                // the text's own recoil spring (period PHI s, damping PHI^-1)
      for (i = 0; i < C.length; i++) { var c = C[i], a;
        if (phase === 'cel') a = -w * w * (c.x - (i + 1 / 2) * (span - gw) / C.length) - 2 * IP * w * c.v;   // even slots along the whole bar
        else a = A * (Math.sin(TAU * t / CREST + (1 - coh) * i * GA) + IP * coh) - 2 * z * w * c.v;      // swing + a lean into the text that only comes with coherence (apart, they just bounce)
        c.v += a * h; c.x += c.v * h;
        c.vy += (-w * w * c.y - 2 * IP * w * c.vy) * h; c.y += c.vy * h; }
      for (i = 0; i < C.length; i++) { var q = C[i];                      // walls: the corner (x = 0) and the frontier (span)
        if (q.x < 0) { q.x = 0; if (q.v < 0) q.v = -q.v * IP; }
        if (q.x > span - gw) { q.x = span - gw; if (q.v > 0) { if (i === C.length - 1) shove(q.v, R); q.v = -q.v * IP; } }
        else if (i === C.length - 1 && q.x < span - gw - gw * Math.pow(IP, 3)) push.on = false; }   // phi: contact ends once the lead critter is PHI^-3 of a glyph clear
      for (i = 0; i + 1 < C.length; i++) { var p0 = C[i], p1 = C[i + 1];  // neighbours never pass: a glyph apart, then they knock
        if (p1.x - p0.x < gw) { var mid = (p0.x + p1.x) / 2; p0.x = mid - gw / 2; p1.x = mid + gw / 2; knock(p0, p1); } }
    }
    if (phase === 'cel') C.forEach(function (c) { while (c.hop.length && into >= c.hop[0]) { c.hop.shift(); c.vy -= R * IP * TAU / PHI; } });   // phi: the old hop kick
    for (i = 0; i < C.length; i++) C[i].el.style.transform = 'translate(' + (G.left - gw - C[i].x).toFixed(2) + 'px,' + (G.top + C[i].y).toFixed(2) + 'px)';
    var over = G.reach > 0 ? Math.max(0, C.length ? (C[C.length - 1].x + gw - G.home) / G.reach : 0) : 0;
    var vis = R * Math.pow(IP, 5);                                         // phi: 'visible' = the text moved PHI^-5 of a glyph from where the push found it
    push.open = push.open.filter(function (o) { if (Math.abs(tx - o.b) >= vis) { push.resp++; return false; } return t - o.t < PHI; });   // phi: a response must show within PHI s
    txt.style.translate = (-tx).toFixed(2) + 'px 0px';
    txt.style.opacity = (1 - Math.min(1, over) * (1 - IP * IP)).toFixed(3);   // phi: text under the pack dims to PHI^-2 at most
  }
  var raf = 0, FRAME = MS * Math.pow(IP, 7);                               // phi: frame cap PHI^-7 s
  function tick(now) { raf = 0; if (doc.hidden) return; if (now - last >= FRAME) { var dt = last ? Math.min(now - last, MS * IP) / MS : 0; last = now; step((now - t0) / MS, dt); }   // unit: dt capped at PHI^-1 s
    raf = requestAnimationFrame(tick); }
  function go() { if (!raf && !doc.hidden) raf = requestAnimationFrame(tick); }
  doc.addEventListener('visibilitychange', function () { last = 0; if (!doc.hidden) go(); });
  build(); C.forEach(function (c, i) { c.x = i * (reach()); }); go();
  root.FootPush = { info: function () { return { width: fcr.style.width, phase: phase, X: X, coh: coh, takeovers: stats.takeovers, knocks: stats.knocks, pushes: push.n, responses: push.resp, pending: push.open.length, tx: tx, xs: C.map(function (c) { return Math.round(c.x); }), geo: geo }; }, _jump: function (x) { X = x; } };   // _jump: tests only
})();
