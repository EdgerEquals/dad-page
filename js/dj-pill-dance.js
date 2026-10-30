/* PILL DANCE stage 1 (Danny 11:15 / 11:18 / 11:23 AWST 30 Oct 2026: 'the bouncing is just too stationary ... when there's collisions it can
   mostly bump ... consistent with everything else organic ... the intensity of the music ... the amount of energy in the music';
   'No ghost just don't have it wander too far'; 'use a combination of the speaker and the music note but we should look at the faces like
   the expressions ... the button swap itself with the emoji face kind of consistent with the energy of where the music is at ... he can spin
   as well and rotate like doing cartwheels ... spin horizontally ... spin vertically ... as the energy in the building and everything
   increases the frequency of it changing increases'). VISUAL ONLY: reads, never writes, the DJ (DadAutoDJ.track.arc / bpm / breakdown),
   PhiPumps ('collisions' swell + its own pump node) and EmojiCollide.info().hits / last (never 'collisions:boom', whose read clears it).
   Loaded by index.html the first time #dj-pill lights (.is-playing), so it costs nothing until the music is on; runs only while it is on.
   - energy E = the section arc (PHI^-2 .. 1 mapped to 0..1; a breakdown leans it down PHI^-2) + PHI^-2 x the collisions swell.
   - faces: every beat x PHI^(5 - 3E) s x the pump (about 4 s calm .. 1 s at the peak at 157 BPM) the note becomes an emoji face (or the
     speaker / notes) picked from E's tier on golden-angle steps, and now and then back to the note, behind one quick turn (the swap lands edge-on).
   - moves: every beat x PHI^(6 - 3E) s x the pump a cartwheel (Z), a horizontal flip (Y) or a vertical flip (X), lasting beat x PHI^(2-E);
     at higher E two at once (chance E x PHI^-1).
   - drift: three single-axis sines (x, y, lean) on golden periods beat x PHI^4 .. PHI^5, reach PHI^-3 of the button x (PHI^-1 + PHI^-1 E),
     each re-sized at its own zero crossing (no jumps); the CSS beat hop and sway (css/dj-buttons.css) grow with --dd-e = E.
   - bumps: a new collision anywhere pushes it away from the hit, PHI^-3 of the button x PHI x (1 - e^(-PHI^2 q)) x e^(-distance / PHI^-1
     of the screen), springing back over PHI s with a PHI^-2 overshoot.
   WAAPI transform animations with composite 'add' over the button's CSS perspective, so they stack and the compositor moves them;
   no layout reads except the button's box on a hit and on resize. Reduced motion: no motion, the faces cross-fade. */
(function () {
  'use strict';
  var doc = document, root = window, pill = doc.getElementById('dj-pill');
  if (!pill || root.DjPillDance || !Element.prototype.animate) return;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, MS = 1e3;              // phi; unit: ms per s
  var RM = root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pw = function (n) { return Math.pow(PHI, n); }, clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var frac = function (v) { return v - Math.floor(v); };
  var SOUND = ['\uD83D\uDD0A', '\uD83C\uDFB5', '\uD83C\uDFB6'];             // speaker, note, notes
  var FACES = [['\uD83D\uDE0C', '\uD83D\uDE42', '\uD83D\uDE0A'],           // calm: relieved, slight smile, smiling eyes
               ['\uD83D\uDE04', '\uD83D\uDE0E', '\uD83D\uDE06'],           // lifting: grin, sunglasses, laughing
               ['\uD83E\uDD29', '\uD83E\uDD73', '\uD83E\uDD2A']];          // peak: star-struck, party, zany
  var emo = doc.createElement('span'); emo.className = 'djp-emo'; emo.setAttribute('aria-hidden', 'true'); pill.appendChild(emo);
  var F = {}, on = false, k = 0, kM = 0, T = { swap: 0, move: 0, poll: 0, face: 0 }, drift = [], lastHits = null, box = null;
  var st = { swaps: 0, moves: 0, combos: 0, bumps: 0, face: '', E: 0, lastSwapAt: 0, lastMove: '' };
  var node = null;
  function pump() { var P = root.PhiPumps; try { if (P && P.node && !node) node = P.node('dj-pill', 3, 2, pw(-3), P.page, 34); return node ? node.out() : 1; } catch (e) { return 1; } }   // phi: 3 modes PHI^2.. s, depth PHI^-3
  function beat() { var t = null; try { t = root.DadAutoDJ && root.DadAutoDJ.track; } catch (e) {} return t && t.bpm > 0 ? 60 / t.bpm : IP; }   // unit: s per min; else PHI^-1 s, as the CSS
  function energy() {
    if (F.E != null) return clamp(+F.E, 0, 1);
    var t = null, c = 0; try { t = root.DadAutoDJ && root.DadAutoDJ.track; } catch (e) {}
    var a = F.arc != null ? +F.arc : t && t.arc > 0 ? t.arc : IP * IP, lo = IP * IP, x = clamp((a - lo) / (1 - lo), 0, 1);   // phi: the arc runs PHI^-2 .. 1
    if (F.arc == null && t && t.breakdown) x *= IP * IP;
    try { var P = root.PhiPumps; c = P && P.subscribe ? +P.subscribe('collisions').get() || 0 : 0; } catch (e) {}
    return clamp(x + c * IP * IP, 0, 1);
  }
  function setE(E) { st.E = E; pill.style.setProperty('--dd-e', E.toFixed(3)); }
  function size() { return pill.offsetWidth || 1; }                       // unit: the button's own size (layout-free after first read)
  var SZ = 0;
  function add(kf, ms, ease) { try { return pill.animate(kf, { duration: ms, easing: ease || 'ease-in-out', composite: 'add' }); } catch (e) { return null; } }
  // ---------- faces ----------
  function pickFace(E) {
    k++; var tier = E < IP * IP ? 0 : E < IP ? 1 : 2, pool = FACES[tier].concat(SOUND);
    if (st.face && frac(k * IP) < IP * IP * IP) return '';               // phi: now and then back to the note (chance PHI^-3)
    return pool[Math.floor(frac(k * IP + 1 / 3) * pool.length)];        // golden-angle steps through the pool
  }
  function show(f) { st.face = f; emo.textContent = f; pill.classList.toggle('dd-face', !!f); }
  function swap() {
    var E = energy(); setE(E); var f = pickFace(E); if (f === st.face) f = f ? '' : SOUND[1];
    st.swaps++; st.lastSwapAt = performance.now();
    if (RM) { show(f); return; }
    var d = beat() * PHI * MS;                                            // phi: a quarter turn (edge-on) at beat x PHI
    add([{ transform: 'rotateY(0turn)' }, { transform: 'rotateY(1turn)' }], d * 4, 'cubic-bezier(.382,0,.618,1)');   // unit: one whole turn, so it ends face-on; phi: easing handles
    clearTimeout(T.face); T.face = setTimeout(function () { if (on) show(f); }, d);   // swap while it is edge-on (never after the music stops)
  }
  // ---------- moves ----------
  var MOVES = ['rotateZ', 'rotateY', 'rotateX'];
  function move(E) {
    kM++; var a = MOVES[Math.floor(frac(kM * IP) * 3)], d = beat() * pw(2 - E) * MS, sg = kM % 2 ? 1 : -1;   // unit: three axes, alternate sides
    add([{ transform: a + '(0turn)' }, { transform: a + '(' + sg + 'turn)' }], d, 'cubic-bezier(.382,0,.618,1)'); st.moves++; st.lastMove = a;   // phi: easing handles at PHI^-2 / PHI^-1
    if (frac(kM * IP * IP) < E * IP) { var b = MOVES[(MOVES.indexOf(a) + 1 + (kM % 2)) % 3]; add([{ transform: b + '(0turn)' }, { transform: b + '(' + (-sg) + 'turn)' }], d * PHI, 'cubic-bezier(.382,0,.618,1)'); st.combos++; st.lastMove += '+' + b; }   // phi: the second, PHI slower
  }
  // ---------- drift (three single-axis sines, re-sized at each zero) ----------
  function driftAxis(i) {
    if (!on || RM) return; var E = energy(), R = SZ * pw(-3) * (IP + IP * E), p = beat() * pw(4 + i / 2) * MS, a = [R, R * IP, null][i];   // phi: reach, periods PHI^4, PHI^4.5, PHI^5 beats
    var f = i === 0 ? function (v) { return 'translateX(' + v + 'px)'; } : i === 1 ? function (v) { return 'translateY(' + v + 'px)'; } : function (v) { return 'rotate(' + v + 'turn)'; };
    if (i === 2) a = pw(-5) / 8 * (1 + E);                                // phi: lean, the sway's unit (1turn/8 x PHI^-5), up to twice it
    var an = add([{ transform: f(0) }, { transform: f(a) }, { transform: f(0) }, { transform: f(-a) }, { transform: f(0) }], p, 'linear');
    if (an) { drift[i] = an; an.onfinish = function () { driftAxis(i); }; }
  }
  // ---------- collision bumps ----------
  function poll() {
    if (!on) return; var C = root.EmojiCollide, I = null; try { I = C && C.info ? C.info() : null; } catch (e) {}
    if (I) { if (lastHits != null && I.hits > lastHits && I.last) bump(I.last); lastHits = I.hits; }
    T.poll = setTimeout(poll, beat() * MS);                               // phi: once a beat (PHI^-1 s without the DJ)
  }
  function bump(L) {
    var q = +L.q || IP, at = L.at || [], hx = (at[0] + at[2]) / 2, hy = (at[1] + at[3]) / 2; if (!box) box = pill.getBoundingClientRect();
    var cx = box.left + box.width / 2, cy = box.top + box.height / 2, dx = cx - hx, dy = cy - hy, dl = Math.hypot(dx, dy);
    if (!(dl > 0)) { dx = 0; dy = 1; dl = 1; }
    var span = Math.max(innerWidth, innerHeight) * IP, m = SZ * pw(-3) * PHI * (1 - Math.exp(-q * PHI * PHI)) * Math.exp(-dl / span);   // phi: reach, energy and distance falloff
    if (F.near) m = SZ * pw(-3) * PHI * (1 - Math.exp(-q * PHI * PHI));
    var ux = dx / dl * m, uy = dy / dl * m; st.bumps++; st.lastBump = [Math.round(ux * 10) / 10, Math.round(uy * 10) / 10];
    if (RM || !(m > 0)) return;
    add([{ transform: 'translate(0px,0px)', offset: 0 }, { transform: 'translate(' + ux + 'px,' + uy + 'px)', offset: pw(-3), easing: 'ease-in-out' },
      { transform: 'translate(' + (-ux * IP * IP) + 'px,' + (-uy * IP * IP) + 'px)', offset: IP }, { transform: 'translate(0px,0px)', offset: 1 }], PHI * MS, 'ease-out');   // phi: out by PHI^-3 of PHI s, PHI^-2 overshoot at PHI^-1
  }
  // ---------- schedulers ----------
  function every(name, fn, expo) {
    var go = function () { if (!on) return; if (!doc.hidden) fn(); var E = energy(); setE(E); T[name] = setTimeout(go, beat() * pw(expo - 3 * E) * pump() * MS); };   // phi: beat x PHI^(n - 3E), pumped
    T[name] = setTimeout(go, beat() * pw(expo - 3 * energy()) * pump() * MS * IP);   // phi: the first one sooner
  }
  function start() {
    if (on) return; on = true; SZ = size(); box = null; lastHits = null; setE(energy());
    every('swap', swap, 5); if (!RM) { every('move', function () { move(energy()); }, 6); [0, 1, 2].forEach(driftAxis); } poll();
  }
  function stop() {
    if (!on) return; on = false; Object.keys(T).forEach(function (n) { clearTimeout(T[n]); });
    pill.getAnimations().forEach(function (a) { if (a.effect && a.effect.composite === 'add') a.cancel(); }); drift = []; show('');
  }
  function sync() { pill.classList.contains('is-playing') ? start() : stop(); }
  new MutationObserver(sync).observe(pill, { attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', function () { box = null; SZ = size(); }, { passive: true });
  root.DjPillDance = { info: function () { var o = {}; for (var n in st) o[n] = st[n]; o.on = on; o.drift = drift.length; return o; },
    force: function (o) { F = o || {}; if (on) setE(energy()); },          // test: force the energy, arc or a near hit
    swap: swap, move: function () { move(energy()); } };
  sync();
})();
