/* PILL DANCE (Danny 30 Oct 11:15-11:23 AWST: faces, cartwheels, flips, bumps, 'don't have it wander too far'), CALM + ONE AT A TIME
   (pilldance1b, t294u: 'it just dances less ... when there's less energy and the more ambient beats ... Cascade up ... with the builds ...
   if there's a bass have it bounce to the bass ... when there's an emoji animation have the button disappear ... never do anything at the
   same time'). VISUAL ONLY, read-only: DadAutoDJ.track (arc, bpm, born, breakdown) + its context state ('interrupted' = off), PhiPumps
   ('collisions' swell, own node), EmojiCollide.info() (never 'collisions:boom'). Loaded by index.html the first time #dj-pill lights.
   - E = arc (PHI^-2..1 -> 0..1, breakdown x PHI^-2) + PHI^-2 x collisions; A = 1 - E. One tick on every beat of the track's own clock.
   - faces every beat x PHI^(2 + CALM A), moves every beat x PHI^(3 + CALM A) (x pump): CALM = 6 phi rungs from the peak (pilldance1's
     busyness) to the floor. No move below E = PHI^-2, doubles only above PHI^-1; calm swaps mostly return to the note.
   - hop on the beat: up between beats, lands with a PHI^-5 thump on it, PHI^-6..PHI^-2 of the button (--dd-amp also scales the CSS sway).
     No bass / kick read-out exists in the DJ, so the beat grid stands in for the bass.
   - drift x PHI^(-2A); collision bumps spring back over PHI s.
   - ONE VISIBLE AT A TIME: data-state pill | emoji | anim. The whole button fades out (beat x PHI^(1 - 2E)), switches while invisible,
     fades in: pill and emoji never show together; opacity only, so the tap target stays. one(state) is the door for a later anim layer.
   Reduced motion: no motion, the same fades. */
(function () {
  'use strict';
  var doc = document, root = window, pill = doc.getElementById('dj-pill');
  if (!pill || root.DjPillDance || !Element.prototype.animate) return;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, MS = 1e3, CALM = 6;
  var RM = root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pw = function (n) { return Math.pow(PHI, n); }, clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var frac = function (v) { return v - Math.floor(v); };
  var SOUND = ['\uD83D\uDD0A', '\uD83C\uDFB5', '\uD83C\uDFB6'];
  var FACES = [['\uD83D\uDE0C', '\uD83D\uDE42', '\uD83D\uDE0A'],
               ['\uD83D\uDE04', '\uD83D\uDE0E', '\uD83D\uDE06'],
               ['\uD83E\uDD29', '\uD83E\uDD73', '\uD83E\uDD2A']];
  var emo = doc.createElement('span'); emo.className = 'djp-emo'; emo.setAttribute('aria-hidden', 'true'); pill.appendChild(emo);
  var F = {}, on = false, k = 0, kM = 0, tick = 0, acc = { swap: 0, move: 0 }, drift = [], lastHits = null, box = null, hop = null, SZ = 0, paused = false;
  var st = { swaps: 0, moves: 0, combos: 0, bumps: 0, face: '', state: 'pill', E: 0, lastMove: '', ticks: 0, synced: false, fades: 0 };
  var node = null;
  function pump() { var P = root.PhiPumps; try { if (P && P.node && !node) node = P.node('dj-pill', 3, 2, pw(-3), P.page, 34); return node ? node.out() : 1; } catch (e) { return 1; } }
  function trk() { try { return root.DadAutoDJ && root.DadAutoDJ.track; } catch (e) { return null; } }
  function beat(t) { t = t || trk(); return t && t.bpm > 0 ? 60 / t.bpm : IP; }
  function phase(t) {
    if (F.phase != null) return frac(+F.phase); t = t || trk();
    return t && t.bpm > 0 && t.born > 0 ? frac((Date.now() - t.born) / MS / beat(t)) : null;
  }
  function heard() { try { var K = root.DadAutoDJ && root.DadAutoDJ._kit, c = K && K.ctx; return !c || c.state === 'running'; } catch (e) { return true; } }
  function energy() {
    if (F.E != null) return clamp(+F.E, 0, 1);
    var t = trk(), c = 0, a = F.arc != null ? +F.arc : t && t.arc > 0 ? t.arc : IP * IP, lo = IP * IP, x = clamp((a - lo) / (1 - lo), 0, 1);
    if (F.arc == null && t && t.breakdown) x *= IP * IP;
    try { var P = root.PhiPumps; c = P && P.subscribe ? +P.subscribe('collisions').get() || 0 : 0; } catch (e) {}
    return clamp(x + c * IP * IP, 0, 1);
  }
  function setE(E) { st.E = E; pill.style.setProperty('--dd-e', E.toFixed(3)); pill.style.setProperty('--dd-amp', pw(4 * E - 2).toFixed(3)); }
  function add(kf, o) { try { o.composite = 'add'; return pill.animate(kf, o); } catch (e) { return null; } }

  var V = { busy: false, next: null, an: null };
  function apply(s, g) { st.state = s; st.face = s === 'emoji' ? g : ''; emo.textContent = st.face; pill.setAttribute('data-state', s); }
  function op(a, b, ms, cb) {
    var old = V.an, an = null; try { an = pill.animate([{ opacity: a }, { opacity: b }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' }); } catch (e) {}
    if (old) old.cancel(); V.an = an; if (!an) return cb(); an.onfinish = function () { if (V.an === an) cb(); };
  }
  function one(s, g) { V.next = [s, s === 'emoji' ? g || SOUND[1] : '']; if (!V.busy) run(); }
  function run() {
    var n = V.next; V.next = null; if (!n || !on || (n[0] === st.state && n[1] === st.face)) return;
    var h = beat() * pw(1 - 2 * st.E) * MS; V.busy = true; st.fades++;
    op(1, 0, h, function () { apply(n[0], n[1]); op(0, 1, h, function () { V.busy = false; if (V.an) V.an.cancel(); V.an = null; run(); }); });
  }

  function swap(E) {
    k++; st.swaps++; var tier = E < IP * IP ? 0 : E < IP ? 1 : 2, pool = FACES[tier].concat(SOUND);
    if (st.state === 'emoji' && frac(k * IP) < pw(-1 - 2 * E)) return one('pill');
    var g = pool[Math.floor(frac(k * IP + 1 / 3) * pool.length)]; if (g === st.face) g = pool[(pool.indexOf(g) + 1) % pool.length];
    one('emoji', g);
  }

  var MOVES = ['rotateZ', 'rotateY', 'rotateX'], EZ = 'cubic-bezier(.382,0,.618,1)';
  function move(E) {
    kM++; var a = MOVES[Math.floor(frac(kM * IP) * 3)], d = beat() * pw(2 - E) * MS, sg = kM % 2 ? 1 : -1;
    add([{ transform: a + '(0turn)' }, { transform: a + '(' + sg + 'turn)' }], { duration: d, easing: EZ }); st.moves++; st.lastMove = a;
    if (E > IP && frac(kM * IP * IP) < E * IP) { var b = MOVES[(MOVES.indexOf(a) + 1 + (kM % 2)) % 3]; add([{ transform: b + '(0turn)' }, { transform: b + '(' + (-sg) + 'turn)' }], { duration: d * PHI, easing: EZ }); st.combos++; st.lastMove += '+' + b; }
  }

  function hopKF(E) { var h = SZ * pw(-4) * pw(4 * E - 2), s = 1 + pw(-5);
    return [{ transform: 'translateY(0px) scale(' + s + ')', offset: 0, easing: 'cubic-bezier(.236,.618,.382,1)' }, { transform: 'translateY(' + (-h) + 'px) scale(1)', offset: 1 / 2, easing: 'cubic-bezier(.618,0,.764,.382)' }, { transform: 'translateY(0px) scale(1)', offset: 1 }];
  }
  function hopSync(t, E) {
    if (RM) return; var b = beat(t) * MS, p = phase(t);
    if (!hop) { hop = add(hopKF(E), { duration: b, iterations: Infinity }); if (!hop) return; }
    else { try { hop.effect.setKeyframes(hopKF(E)); if (Math.abs(hop.effect.getTiming().duration - b) > 1) hop.effect.updateTiming({ duration: b }); } catch (e) {} }
    st.synced = p != null; if (p == null) return;
    var c = frac((hop.currentTime || 0) / b), err = frac(c - p + 1 / 2) - 1 / 2;
    if (Math.abs(err) > pw(-4)) hop.currentTime = p * b;
  }

  function driftAxis(i) {
    if (!on || RM || paused) return; var E = energy(), R = SZ * pw(-3) * (IP + IP * E) * pw(-2 * (1 - E)), p = beat() * pw(4 + i / 2) * MS, a = [R, R * IP, null][i];
    var f = i === 0 ? function (v) { return 'translateX(' + v + 'px)'; } : i === 1 ? function (v) { return 'translateY(' + v + 'px)'; } : function (v) { return 'rotate(' + v + 'turn)'; };
    if (i === 2) a = pw(-5) / 8 * (1 + E) * pw(-2 * (1 - E));
    var an = add([{ transform: f(0) }, { transform: f(a) }, { transform: f(0) }, { transform: f(-a) }, { transform: f(0) }], { duration: p, easing: 'linear' });
    if (an) { drift[i] = an; an.onfinish = function () { driftAxis(i); }; }
  }

  function bump(L) {
    var q = +L.q || IP, at = L.at || [], hx = (at[0] + at[2]) / 2, hy = (at[1] + at[3]) / 2; if (!box) box = pill.getBoundingClientRect();
    var cx = box.left + box.width / 2, cy = box.top + box.height / 2, dx = cx - hx, dy = cy - hy, dl = Math.hypot(dx, dy);
    if (!(dl > 0)) { dx = 0; dy = 1; dl = 1; }
    var span = Math.max(innerWidth, innerHeight) * IP, m = SZ * pw(-3) * PHI * (1 - Math.exp(-q * PHI * PHI)) * (F.near ? 1 : Math.exp(-dl / span));
    var ux = dx / dl * m, uy = dy / dl * m; st.bumps++; st.lastBump = [Math.round(ux * 10) / 10, Math.round(uy * 10) / 10];
    if (RM || !(m > 0)) return;
    add([{ transform: 'translate(0px,0px)', offset: 0 }, { transform: 'translate(' + ux + 'px,' + uy + 'px)', offset: pw(-3), easing: 'ease-in-out' },
      { transform: 'translate(' + (-ux * IP * IP) + 'px,' + (-uy * IP * IP) + 'px)', offset: IP }, { transform: 'translate(0px,0px)', offset: 1 }], { duration: PHI * MS, easing: 'ease-out' });
  }

  function beatTick() {
    if (!on) return; if (!heard()) { if (!paused) { paused = true; calm(); } tick = setTimeout(beatTick, beat() * MS); return; }
    if (paused) { paused = false; if (!RM) [0, 1, 2].forEach(driftAxis); }
    var t = trk(), E = energy(), A = 1 - E, pu = pump(); setE(E); st.ticks++;
    var C = root.EmojiCollide, I = null; try { I = C && C.info ? C.info() : null; } catch (e) {}
    if (I) { if (lastHits != null && I.hits > lastHits && I.last) bump(I.last); lastHits = I.hits; }
    if (!doc.hidden) {
      hopSync(t, E);
      acc.swap += 1 / (pw(2 + CALM * A) * pu); if (acc.swap >= 1) { acc.swap = 0; swap(E); }
      if (!RM && E >= IP * IP) { acc.move += 1 / (pw(3 + CALM * A) * pu); if (acc.move >= 1 && !V.busy) { acc.move = 0; move(E); } } else acc.move = 0;
    }
    var p = phase(t), w = p == null ? 1 : 1 - p; if (w < pw(-4)) w++; tick = setTimeout(beatTick, w * beat(t) * MS);
  }
  function start() {
    if (on) return; on = true; paused = false; SZ = pill.offsetWidth || 1; box = null; lastHits = null; acc.swap = acc.move = 0; setE(energy());
    pill.classList.add('dd-on'); apply('pill', ''); if (!RM) [0, 1, 2].forEach(driftAxis); beatTick();
  }
  function calm() {
    V.busy = false; V.next = null; if (V.an) V.an.cancel(); V.an = null;
    pill.getAnimations().forEach(function (a) { if (a.effect && a.effect.composite === 'add') a.cancel(); }); drift = []; hop = null; apply('pill', '');
  }
  function stop() { if (!on) return; on = false; paused = false; clearTimeout(tick); calm(); pill.classList.remove('dd-on'); }
  function sync() { pill.classList.contains('is-playing') ? start() : stop(); }
  new MutationObserver(sync).observe(pill, { attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', function () { box = null; SZ = pill.offsetWidth || 1; }, { passive: true });
  root.DjPillDance = { info: function () { var o = {}; for (var n in st) o[n] = st[n]; o.on = on; o.drift = drift.length; o.busy = V.busy; o.paused = paused; return o; },
    force: function (o) { F = o || {}; if (on) setE(energy()); },
    one: function (s, g) { one(s, g); },
    swap: function () { swap(energy()); }, move: function () { move(energy()); } };
  sync();
})();
