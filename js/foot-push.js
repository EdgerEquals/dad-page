/* FOOTSPEEDS (Danny 10:07 AWST 27 Oct, t269u: 'have the one on the left moving the fastest and the one on the right moving the slowest
   but each time they bump each of their species accelerates'; 'put that in a box ... a hard boundary between the text and the first emoji
   that's pushing on it'; 'add those emojis to the Cascade ... when there's any explosion he should explode himself and bounce back and hit
   the next one and he explodes').
     SPEEDS   critter i (0 = the rightmost, in the corner .. 3 = the lead, against the text) runs at s_i = PHI^(i - 3/2): neighbours one phi
              rung apart, the lead PHI^3 x the rear. Its swing frequency x s_i, its drive x s_i^2 (so its speed rises with s_i). Each real
              knock steps both critters' own speed up by PHI^(PHI^-4) (bounded at PHI^2), decaying back with tau PHI^2 s (gone within a
              breath, PHI^5 s), so bumping makes them faster and it never runs away. Phases are integrated, so a speed change never jumps.
     BOX      the bottom-line readout (#footLine) is a slim box in Dad's palette (ring #1F5478 dark / #85A6BB light, PHI^-1 backing). Its
              right edge is a hard wall: no critter is ever drawn over it. The lead hits the wall and bounces (restitution PHI^-1); the box
              recoils on its own spring (period PHI s) and springs back into them. No more dimming text under the pack.
     SQUASH   the frontier X (0..1) now squashes the box: its width is W0 (1 - X (1 - PHI^-2)), so at X = 1 it is PHI^-2 of its width, the
              text clipped inside it (the readout's own glide shows long text), the freed width given back as margin so the corner stays put.
              X grows only while the lead is pushing on the wall (x PHI on contact, x PHI^-1 off it), so the text pushes back when they stop.
     BREAKOUT at X = 1 they celebrate in the room they won (PHI^2 s), then hop up onto the box's roof and run along it to its left end, by
              the rocket's pad, a glyph x PHI apart, lead first. They wait there up to PHI^7 s (a launch comes every PHI^6 s).
     CASCADE  any explosion within PHI^3 of its size (or a critter's) from the lead - the rocket's liftoff blast (RocketBlast) or any hit in
              the collision engine (EmojiCollide) - sets the lead off: it explodes (the engine's own burst + collision smoke, sized to the
              critter), bounces back at PHI^2 glyphs a second, shrinking and fading, hits the next critter, which explodes and bounces in
              turn, down the chain. Then they respawn in the corner (fade in over PHI s) and the box springs back to full width.
   Read only: this file polls RocketBlast.info() / EmojiCollide.info() every PHI^-4 s; it never changes either engine.
   Was: FOOTBOUNCE (Danny 21:39 AWST 26 Oct, t257u: 'allow them to bounce around a bit between themselves so sometimes they're all pushing
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
  // ---------- the box (footspeeds): slim ring in Dad's palette, a translucent backing so the text reads over anything ----------
  var bst = doc.createElement('style');
  bst.textContent = '#footLine.fp-box{box-sizing:border-box;padding:0 .382em;border-radius:.382em;background:rgba(0,0,0,.618);box-shadow:inset 0 0 0 1px var(--dpc-border-hi,#1F5478)}' +   // phi: padding + radius PHI^-2 em, backing PHI^-1; anchor: Dad palette border-hi #1F5478
    'html[data-theme="light"] #footLine.fp-box{background:rgba(246,250,252,.618);box-shadow:inset 0 0 0 1px #85A6BB}' +   // anchor: light footer #F6FAFC, Dad palette #85A6BB
    'html[data-solo="critters"] .fcb{visibility:visible!important}';   // the critters' own layer sits in the footer (it climbs onto the box's roof), so the animation tile's solo view shows it with the bottom line
  doc.head.appendChild(bst); txt.classList.add('fp-box');
  // ---------- room + speed ----------
  function room() { fcr.style.width = ''; var w = fcr.getBoundingClientRect().width; if (w) fcr.style.width = w * PHI * PHI + 'px'; }   // phi: two rungs wider than its own CSS width (footbounce: one more rung of room)
  function speed() { var tr = fcr.querySelector('.ct'); if (!tr) return; var m = parseFloat(getComputedStyle(doc.documentElement).getPropertyValue('--phi-marquee')) || Math.pow(PHI, 8);   // phi: the PHI^8 marquee clock
    tr.style.animationDuration = m * Math.pow(IP, 2) + 's'; }           // phi: two rungs faster
  room(); speed();
  var rq = 0, needW = true; addEventListener('resize', function () { if (!rq) rq = requestAnimationFrame(function () { rq = 0; fsC = 0; room(); needW = true; geo = null; }); });
  if (RM || !('translate' in doc.documentElement.style)) { root.FootPush = { info: function () { return { width: fcr.style.width, still: true, box: true }; } }; return; }
  // ---------- forces ----------
  var nc = null, nt = null, feeds = {};
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
  var fsC = 0; function reach() { if (!fsC) fsC = parseFloat(getComputedStyle(fcr).fontSize) || parseFloat(getComputedStyle(doc.documentElement).fontSize); return fsC; }   // unit: one critter glyph; LOAD (Danny 14:15 AWST 28 Oct, audio dropouts): read once and on resize, not several times a frame (each read forced a style recalc; ~9% of the page's main thread)
  // ---------- pack ----------
  var note = fcr.parentElement, host = note.parentElement || note, track = fcr.querySelector('.ct'), GA = TAU * IP * IP, N = Math.round(Math.pow(PHI, 3));   // phi: golden angle; pack of round(PHI^3)
  var CREST = Math.pow(PHI, 2), BREATH = Math.pow(PHI, 5), BUILD = Math.pow(IP, 7), CEL = Math.pow(PHI, 2), SET = Math.pow(PHI, 3), SUB = Math.pow(IP, 7), WAIT = Math.pow(PHI, 7), POLL = Math.pow(IP, 4);   // phi: crest, breath slot, build rate, celebrate, settle, sub-step, wait by the pad, explosion poll
  var STEP = Math.log(PHI) * Math.pow(IP, 4), CAP = 2 * Math.log(PHI), BTAU = Math.pow(PHI, 2);   // phi: a knock adds PHI^(PHI^-4) to a critter's speed, capped at PHI^2, decaying with tau PHI^2 s
  function rung(i) { return Math.pow(PHI, i - (N - 1) / 2); }              // phi: critter i's speed rung, neighbours one rung apart, the lead (i = N-1) fastest
  var tx = 0, tv = 0, push = { on: false, n: 0, resp: 0, open: [] }, w = TAU / PHI, layer = null, C = [], X = 0, phase = 'build', pt0 = 0, geo = null, lastGeo = -Infinity, coh = 0;   // phi: body frequency (period PHI s)
  var stats = { takeovers: 0, knocks: 0, breakouts: 0, chains: 0, booms: 0, events: 0, waitsOut: 0, minGap: Infinity };
  var seg = [], tail = txt, W0 = 0, sqA = 0, txA = 0, ml = 0, mLA = 0, chainLog = [];
  function glyphs() { var sp = fcr.querySelector('.ct>span'), a = sp ? sp.textContent.split(' ').filter(Boolean) : []; return a.length ? a : ['\uD83D\uDC1E']; }
  function build() {
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    layer = doc.createElement('span'); layer.className = 'fcb'; layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:1';
    var g = glyphs(), cs = getComputedStyle(fcr);
    for (var i = 0; i < N; i++) { var e = doc.createElement('span'); e.textContent = g[i % g.length];
      e.style.cssText = 'position:absolute;top:0;left:0;white-space:nowrap;line-height:' + cs.lineHeight + ';font-size:' + cs.fontSize + ';will-change:transform,opacity';
      layer.appendChild(e); C.push({ el: e, x: 0, v: 0, y: 0, vy: 0, hop: [], side: 'R', ph: 0, bo: 0, sp: 0, st: 'live', age: 0, born: -Infinity, op: 1, sc: 1, rot: 0 }); }
    host.appendChild(layer); if (track) track.style.visibility = 'hidden';
  }
  function regive() { var g = glyphs(); C.forEach(function (c, i) { c.el.textContent = g[i % g.length]; }); }
  function segs() {                                                        // the box and whatever text sits between it and the critters (the credit on wide screens)
    var a = [txt], e = txt.nextElementSibling; tail = txt;
    while (e && e !== fcr) { if (e.offsetWidth) { a.push(e); tail = e; } e = e.nextElementSibling; }
    seg = a; }
  function natural() {                                                     // the box's own width, measured with nothing squashing it (each build and on resize)
    seg.forEach(function (e) { e.style.marginRight = ''; }); txt.style.flex = ''; segs();
    W0 = txt.getBoundingClientRect().width; sqA = 0; needW = false; geo = null; C.forEach(function (c) { c.gl = null; }); }   // (the gap check restarts: the box was just re-laid out)
  function sqz() { return W0 * Math.max(0, Math.min(1, X)) * (1 - IP * IP); }   // phi: at X = 1 the box is PHI^-2 of its width
  function measure(t) {                                                    // geometry in px, re-read every PHI^-1 s (layout and the line change)
    if (geo && t - lastGeo < IP) return geo; lastGeo = t;
    var lr = layer.getBoundingClientRect(), hb = fcr.getBoundingClientRect(), tb = tail.getBoundingClientRect(), bb = txt.getBoundingClientRect(), nb = note.getBoundingClientRect();
    var g0 = C.length ? C[0].el.getBoundingClientRect() : null, gw = (g0 && g0.width) || reach(), gh = (g0 && g0.height) || gw;
    geo = { home: hb.width, reach: hb.left - nb.left, fr: hb.right, left: hb.right - lr.left, top: hb.top - lr.top, gw: gw, gh: gh, lx: lr.left, ly: lr.top,
      tailR0: tb.right + txA + sqA - mLA,                                       // unit: the tail's right edge, unrecoiled and unsquashed (viewport px)
      boxL0: bb.left + txA - mLA, boxT: bb.top - lr.top, gap: gw * Math.pow(IP, 3) };   // phi: the hard wall keeps PHI^-3 of a glyph clear of the box
    return geo;
  }
  function wallX(G, sq, mL) { return G.fr - G.gw - (G.tailR0 - sq + mL - tx) - G.gap; }   // the furthest a critter in the corner room may go (its x): the box squashed sq, stepped aside mL, recoiled tx
  function bump(c) { c.bo = Math.min(CAP, c.bo + STEP); }                  // footspeeds: a knock makes this critter faster
  function knock(a, b) {                                                   // equal masses, restitution PHI^-1
    var rel = a.v - b.v; if (rel <= 0) return; var e = IP, va = a.v, vb = b.v;
    a.v = ((1 - e) * va + (1 + e) * vb) / 2; b.v = ((1 + e) * va + (1 - e) * vb) / 2;
    if (rel > reach() * w * Math.pow(IP, 4)) { stats.knocks++; bump(a); bump(b); }   // phi: a real knock, not resting contact, speeds both up
    var R = reach(), hard = R * w * IP * IP; if (rel > hard) { var k = Math.min(rel * IP * IP * IP, R * w * IP); a.vy -= k; b.vy -= k; } }   // phi: a hop only on a hard knock, at most PHI^-1 of a glyph's swing
  // PUSH -> RESPONSE (t259u): every contact of the lead with the box kicks the box's recoil spring by PHI^-1 of the closing speed, at least
  // PHI^-3 (at most PHI^-1) of a glyph's swing; FootPush.info() counts pushes vs visible responses.
  function shove(vc, R) { if (push.on) return; push.on = true; push.n++; push.open.push({ t: tNow, b: tx }); tv += Math.min(Math.max(vc * IP, R * w * Math.pow(IP, 3)), R * w * IP); }   // phi: PHI^-3 .. PHI^-1 of a glyph's swing, so the box never jumps out of the bar
  // ---------- explosions near the lead (read only from the two engines) ----------
  var seenRB = -1, seenEC, lastPoll = -Infinity;
  function events() {
    var ev = [], RB = root.RocketBlast, EC = root.EmojiCollide, i;
    try { if (RB && RB.info) { var f = RB.info().fired || []; if (seenRB < 0) seenRB = f.length; for (i = seenRB; i < f.length; i++) ev.push({ x: f[i].x, y: f[i].y, S: f[i].size, src: 'rocket' }); seenRB = f.length; } } catch (e) {}
    try { if (EC && EC.info) { var l = EC.info().last; if (seenEC === undefined) seenEC = l ? l.t : null;
      else if (l && l.t !== seenEC) { seenEC = l.t; ev.push({ x: (l.at[0] + l.at[2]) / 2, y: (l.at[1] + l.at[3]) / 2, S: Math.hypot(l.at[2] - l.at[0], l.at[3] - l.at[1]), src: 'collide' }); } } } catch (e) {}
    return ev; }
  function centre(G, c) { return [G.lx + G.left - G.gw - c.x + G.gw / 2, G.ly + G.top + c.y + G.gh / 2]; }
  function explode(G, c, i) {                                              // the engine's own burst + collision smoke, sized to the critter
    var p = centre(G, c), EC = root.EmojiCollide, RB = root.RocketBlast, s = G.gw;
    if (EC && EC.test) { EC.test('burst', p[0], p[1], s); EC.test('smoke', p[0], p[1], s); }
    else if (RB && RB.blast) { RB.blast(p[0], p[1] + G.gh / 2, s, 1); try { seenRB = RB.info().fired.length; } catch (e) {} }   // fallback: the liftoff blast, sized to the critter (not counted as a new event)
    c.st = 'fly'; c.age = 0; c.v = -G.gw * PHI * PHI; c.vy = 0; stats.booms++; chainLog.push({ i: i, t: +tNow.toFixed(3), x: Math.round(p[0]), y: Math.round(p[1]) });   // phi: it bounces back at PHI^2 glyphs a second
  }
  function startChain(G, ev) { phase = 'chain'; pt0 = tNow; stats.chains++; chainLog = []; explode(G, C[C.length - 1], C.length - 1); chainLog[0].by = ev.src; }
  // ---------- the step ----------
  var tNow = 0, last = 0;
  function step(t, dt) { tNow = t;
    if (needW) natural();
    var G = measure(t), R = reach(), gw = G.gw, fc = force('c', t), ft = force('t', t), i, j, eps = gw * Math.pow(IP, 3);   // phi: PHI^-3 of a glyph = 'there'
    coh = Math.max(0, Math.min(1, pump('c') * (1 + Math.sin(TAU * t / BREATH)) / 2));
    var into = t - pt0, lead = C[C.length - 1], yR = G.boxT - G.gh - G.top - gw * Math.pow(IP, 4), xL = G.fr - gw - G.boxL0;   // phi: the roof sits PHI^-4 of a glyph above the box; xL = the box's left end, by the pad
    var allUp = C.every(function (c) { return c.y < yR + eps; }), allOn = function (sd) { return C.every(function (c) { return c.side === sd && Math.abs(c.y) < eps; }); };
    if (phase !== 'chain' && t - lastPoll >= POLL) { lastPoll = t;
      var ev = events(), lc = centre(G, lead);
      for (i = 0; i < ev.length; i++) { stats.events++; if (Math.hypot(ev[i].x - lc[0], ev[i].y - lc[1]) < Math.pow(PHI, 3) * Math.max(ev[i].S || 0, gw)) { startChain(G, ev[i]); into = 0; break; } } }   // phi: 'near' = within PHI^3 of the explosion's (or a critter's) size
    if (phase === 'build') { X += BUILD * (fc * (IP + IP * IP * coh) * (push.on ? PHI : IP) - ft) / ft * dt; X = Math.max(0, Math.min(1, X));   // phi: they gain only while pushing on the box
      if (X >= 1) { phase = 'cel'; pt0 = t; stats.takeovers++; C.forEach(function (c, k) { c.hop = [k * Math.pow(IP, 3), IP + k * Math.pow(IP, 3)]; }); } }
    else if (phase === 'cel') { if (into >= CEL) { phase = 'out'; pt0 = t; stats.breakouts++; } }
    else if (phase === 'out') { if (allOn('L') && Math.abs(lead.x - xL) < gw * IP * IP) { phase = 'wait'; pt0 = t; } }   // phi: all down in the room by the pad, lead at the far end
    else if (phase === 'wait') { if (into >= WAIT) { phase = 'back'; pt0 = t; stats.waitsOut++; } }
    else if (phase === 'back') { if (allOn('R') && ml < eps / gw) { phase = 'home'; pt0 = t; } }
    else if (phase === 'chain') { if (C.every(function (c) { return c.st === 'gone'; })) { phase = 'home'; pt0 = t;
        C.forEach(function (c, k) { c.st = 'live'; c.side = 'R'; c.x = k * gw; c.v = 0; c.y = 0; c.vy = 0; c.bo = 0; c.born = t; c.sc = 1; c.rot = 0; c.hop = []; }); regive(); } }   // respawn in the corner
    else if (phase === 'home') { X *= Math.exp(-dt / PHI); if (into >= SET) { X = 0; phase = 'build'; pt0 = t; regive(); needW = true; } }   // phi: tau PHI s over PHI^3 s
    // the box steps aside (breakout): once everyone is up on its roof it slides right by N PHI glyphs, opening a room at its left end by the pad
    var mt = (phase === 'out' && allUp) || phase === 'wait' || (phase === 'chain' && ml > 0) || (phase === 'back' && !allUp && C.some(function (c) { return c.side === 'L'; })) ? 1 : 0;
    if (phase === 'out' && !allUp) mt = ml;                                // hold until everyone is up
    ml += (mt - ml) * (1 - Math.exp(-dt * PHI * PHI)); if (Math.abs(mt - ml) < Math.pow(IP, 8)) ml = mt;   // phi: eases over ~PHI^-2 s
    var mL = ml * C.length * PHI * gw, sq = sqz(), A = R * w * w * IP, z = IP * IP, n = Math.ceil(dt / SUB), h = n ? dt / n : 0;   // phi: the left room = N PHI glyphs; drive PHI^-1 of a glyph x w^2; damping PHI^-2
    var xLB = G.fr - (G.boxL0 + mL) + G.gap, roam = phase === 'out' || phase === 'wait' || phase === 'back';   // xLB: the nearest a critter in the left room may come to the box (its x)
    for (j = 0; j < n; j++) {
      tv += (-w * w * tx - 2 * IP * w * tv) * h; tx += tv * h;                // the box's own recoil spring (period PHI s, damping PHI^-1)
      var xw = wallX(G, sq, mL);
      for (i = 0; i < C.length; i++) { var c = C[i], s = rung(i) * Math.exp(c.bo), a, onRoof = c.y < yR + eps, tgt, yt = 0;
        c.bo *= Math.exp(-h / BTAU);
        if (c.st === 'gone') continue;
        if (c.st === 'fly') { c.age += h; c.x += c.v * h; c.sc = Math.max(IP, 1 - c.age * IP); c.op = Math.max(0, 1 - c.age / PHI); c.rot += c.v / gw * h;   // phi: shrinks to PHI^-1, fades over PHI s, rolls as it flies
          var nx = C[i - 1]; if (nx && nx.st === 'live' && c.x - nx.x < gw) { explode(G, nx, i - 1); c.st = 'gone'; }
          else if (c.side === 'L' && c.y > yR + eps && c.x < xLB) { tv -= Math.abs(c.v) * IP; c.st = 'gone'; }   // the last one hits the box's left side: the box recoils
          else if (c.op <= 0 || c.x < -gw) c.st = 'gone'; continue; }
        if (phase === 'chain') { c.v *= Math.exp(-h * w); c.x += c.v * h; continue; }   // the dominoes wait for the hit
        c.ph += TAU * s / CREST * h;                                       // phi: its own swing, s x the crest frequency
        if (phase === 'cel') a = -w * w * (c.x - (i + 1 / 2) * xw / C.length) - 2 * IP * w * c.v;   // even slots across the room they won
        else if (roam) { var ws = w * Math.sqrt(rung(i));                  // phi: each runs at the root of its rung
          if (phase === 'back') { tgt = (i + 1 / 2) * xw / C.length; if (c.side === 'L' && !onRoof) tgt = Math.max(tgt, xLB); yt = c.side === 'L' ? yR : 0; }   // up first, then right along the roof, then down into the corner room
          else { tgt = xL - (C.length - 1 - i) * gw * PHI; if (c.side === 'R' && !onRoof) tgt = Math.min(tgt, xw); yt = c.side === 'R' ? yR : 0; }   // phi: a glyph x PHI apart, lead at the far end; nobody crosses the wall until it is up
          a = -ws * ws * (c.x - tgt) - 2 * IP * ws * c.v + A * IP * IP * Math.sin(c.ph); }   // phi: a PHI^-2 swing while it runs / waits
        else a = A * s * s * (Math.sin(c.ph + (1 - coh) * i * GA) + IP * coh) - 2 * z * w * c.v;   // footspeeds: drive x s^2, a lean into the box only with coherence
        c.v += a * h; c.x += c.v * h;
        if (roam && onRoof) { if (phase !== 'back' && c.side === 'R' && ml >= 1 && c.x >= xLB) c.side = 'L'; if (phase === 'back' && c.side === 'L' && ml <= 0 && c.x <= xw) c.side = 'R'; }   // drops into the room it is over
        c.vy += (-w * w * (c.y - yt) - 2 * IP * w * c.vy) * h; c.y += c.vy * h;
        c.sp += (Math.abs(c.v) - c.sp) * h / BTAU; }                       // unit: running mean speed, px/s
      if (phase !== 'chain') {
        for (i = 0; i + 1 < C.length; i++) { var p0 = C[i], p1 = C[i + 1];  // neighbours never pass: a glyph apart, then they knock
          if (p1.x - p0.x < gw) { var mid = (p0.x + p1.x) / 2; p0.x = mid - gw / 2; p1.x = mid + gw / 2; knock(p0, p1); } }
        var lineLead = -1, lw = xw;                                        // the hard walls: anyone not up on the roof stays clear of the box
        for (i = C.length - 1; i >= 0; i--) { var q = C[i]; if (q.side !== 'R' || q.y < yR + eps) continue;
          if (q.x > lw) { q.x = lw; var vr = q.v - tv; if (vr > 0) { if (lineLead < 0) shove(vr, R); q.v = tv - vr * IP; } }
          if (lineLead < 0) { lineLead = i; if (q.x < lw - eps) push.on = false; } lw = q.x - gw; }   // phi: contact ends once the lead is PHI^-3 of a glyph clear; the next one stops a glyph behind
        var lb = xLB;                                                      // the room by the pad: the box's left side ... the bar's left end
        for (i = 0; i < C.length; i++) { var u = C[i]; if (u.side !== 'L' || u.y < yR + eps) continue;
          if (u.x < lb) { u.x = lb; if (u.v < 0) u.v = -u.v * IP; } if (u.x > xL) { u.x = xL; if (u.v > 0) u.v = -u.v * IP; } lb = u.x + gw; }
        for (i = 0; i < C.length; i++) { var r0 = C[i]; if (r0.x < 0) { r0.x = 0; if (r0.v < 0) r0.v = -r0.v * IP; } }   // the corner
      }
    }
    if (phase === 'cel') C.forEach(function (c) { while (c.hop.length && into >= c.hop[0]) { c.hop.shift(); c.vy -= R * IP * TAU / PHI; } });   // phi: the old hop kick
    var tb = txt.getBoundingClientRect();                                  // measured (last frame's layout): the closest any critter beside the box came to it
    for (i = 0; i < C.length; i++) { var cc = C[i], L = G.left - gw - cc.x, fade = Math.min(1, (t - cc.born) / PHI);   // phi: a respawn fades in over PHI s
      cc.el.style.transform = 'translate(' + L.toFixed(2) + 'px,' + (G.top + cc.y).toFixed(2) + 'px) rotate(' + cc.rot.toFixed(3) + 'rad) scale(' + (cc.st === 'fly' ? cc.sc : (IP + (1 - IP) * fade)).toFixed(3) + ')';
      cc.el.style.opacity = (cc.st === 'gone' ? 0 : cc.st === 'fly' ? cc.op : fade).toFixed(3);
      var gl = cc.gl, gt = cc.gt;                                         // where it was drawn last frame, against the box as laid out last frame (same frame)
      if (gl != null && cc.lv && gt + G.gh * (1 - Math.pow(IP, 4)) > tb.top && gt < tb.bottom) { var gap = gl > tb.left + tb.width / 2 ? gl - tb.right : tb.left - (gl + gw);   // phi: a glyph's ink starts PHI^-4 above its line box bottom
        if (gap < stats.minGap) { stats.minGap = gap; stats.worst = { phase: phase, i: i, side: cc.side, x: Math.round(cc.x), y: +cc.y.toFixed(1), box: [Math.round(tb.left), Math.round(tb.right)] }; } }
      cc.gl = G.lx + L; cc.gt = G.ly + G.top + cc.y; cc.lv = cc.st === 'live'; }
    var vis = R * Math.pow(IP, 5);                                         // phi: 'visible' = the box moved PHI^-5 of a glyph from where the push found it
    push.open = push.open.filter(function (o) { if (Math.abs(tx - o.b) >= vis) { push.resp++; return false; } return t - o.t < PHI; });   // phi: a response must show within PHI s
    var sqr = Math.round(sq * 100) / 100, mlr = Math.round(mL * 100) / 100;   // unit: 0.01 px steps, so the layout is only touched when it changes
    if (sqr !== sqA) { txt.style.flex = '0 0 ' + Math.max(0, W0 - sqr).toFixed(2) + 'px'; tail.style.marginRight = sqr.toFixed(2) + 'px'; sqA = sqr; }   // the freed width goes to the margin, so the corner never moves
    seg.forEach(function (e) { e.style.translate = (mlr - tx).toFixed(2) + 'px 0px'; }); txA = tx; mLA = mlr;   // step-aside + recoil ride on translate only (no layout)
  }
  var raf = 0, FRAME = MS * Math.pow(IP, 7);                               // phi: frame cap PHI^-7 s
  function tick(now) { raf = 0; if (doc.hidden) return; if (now - last >= FRAME) { var dt = last ? Math.min(now - last, MS * IP) / MS : 0; last = now; step((now - t0) / MS, dt); }   // unit: dt capped at PHI^-1 s
    raf = requestAnimationFrame(tick); }
  function go() { if (!raf && !doc.hidden) raf = requestAnimationFrame(tick); }
  doc.addEventListener('visibilitychange', function () { last = 0; if (!doc.hidden) go(); });
  build(); segs(); C.forEach(function (c, i) { c.x = i * (reach()); }); go();
  root.FootPush = { info: function () { return { width: fcr.style.width, phase: phase, X: X, coh: coh, takeovers: stats.takeovers, knocks: stats.knocks, pushes: push.n, responses: push.resp, pending: push.open.length, tx: tx,
      xs: C.map(function (c) { return Math.round(c.x); }), side: C.map(function (c) { return c.side; }), ml: ml, ys: C.map(function (c) { return Math.round(c.y); }), st: C.map(function (c) { return c.st; }), rungs: C.map(function (c, i) { return rung(i); }),
      boost: C.map(function (c) { return Math.exp(c.bo); }), speeds: C.map(function (c) { return c.sp; }), W0: W0, box: sqA, stats: stats, chain: chainLog, geo: geo }; },
    _jump: function (x) { X = x; }, _phase: function (p) { phase = p; pt0 = tNow; } };   // tests only
})();
