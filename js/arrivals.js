/* ARRIVALS (Danny's load-experience rule, 26 Oct 2026; rule 14 in adaptive-phi-principle.md). Tiny, deferred (tier 1), no rAF unless
   something is arriving. Everything that loads arrives instead of popping in:
     SWEEP   from the lowest phi rung up: opacity AND the speed of its own CSS / WAAPI animations start at PHI^-n0 and climb the rungs
             geometrically (value = PHI^(-n0 (1 - u)), u = 0..1) until settled at 1, so the eye catches it while heavier parts load.
     LAND    then a gesture matched to the element: pop (a PHI^-5 scale overshoot), bounce (a PHI^-2 em hop, decaying by PHI per hop),
             bang (a quick PHI^-3 swell and flash), soft (no gesture, just settles).
     WHEN    start = its own load slot (LoadTiers already orders tier 2 by weight); arrivals that land together are staggered by golden
             fractions of PHI^-g s. DURATION follows importance to the site's function: PHI^(i - 1 + speed) s, so the footer's bottom line
             (i = 5, PHI^4 = 6.9 s) arrives slowest and gets read; scenery (i = 1..2) arrives in PHI^0..PHI^1 s.
     DIALS   dials.html tiles 8-10: speed (rung shift), stagger g, starting rung n0. Stored on this device only ('dadSceneDials.v1').
   Elements: a registry of selectors (first appearance only, a node never arrives twice); modules may also call Arrivals.land(el, gesture, i).
   Transform + opacity WAAPI only, never on the element's own transform (composite on a fresh animation that ends at the natural state).
   Reduced motion: nothing (things simply appear). Arrivals.info() lists what arrived and when. */
(function () {
  'use strict';
  var doc = document, root = window;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, MS = 1e3;              // phi; unit: ms per s
  var RM = root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function dial(id, def) { try { var d = JSON.parse(localStorage.getItem('dadSceneDials.v1') || '{}'); return d[id] != null ? +d[id] : def; } catch (e) { return def; } }
  var SPEED = dial('arrspeed', 0), GAP = Math.pow(IP, dial('arrstagger', 2)), N0 = dial('arrstart', 5);   // phi: rung shift 0, stagger PHI^-2 s, start PHI^-5
  var REG = [                                                             // selector, gesture, importance (1 scenery .. 5 the site's function)
    ['.foot > .note', 'bounce', 5],                                     // .ttybody (the chat box) moved to the inline assemble-in (loadfirst, Danny 18:57 AWST 26 Oct): 1 s once, not 4.2 s              // the footer's reading lines arrive slowest (Danny: the chat line); the bottom line's row,
                                                                          // not #footLine itself (foot-line.js fades that one per item), critters ride along
    ['.pl-layer', 'soft', 2], ['.sm-b', 'pop', 1], ['.tsl-layer', 'soft', 1], ['.es-layer', 'bang', 1], ['.qs-layer', 'soft', 1],
    ['#mxrain', 'soft', 1]];
  var seen = typeof WeakSet === 'function' ? new WeakSet() : null, log = [], k = 0, lastAt = 0, t0 = performance.now();
  var FR = 8;                                                             // unit: keyframes per sweep (enough for a smooth geometric climb)
  function sweep(n0) { var f = [], i; for (i = 0; i <= FR; i++) f.push(Math.pow(PHI, -n0 * (1 - i / FR))); return f; }   // phi: PHI^(-n0 (1 - u))
  function gesture(g, el) {
    if (g === 'pop') return [{ transform: 'scale(1)' }, { transform: 'scale(' + (1 + Math.pow(IP, 5)) + ')' }, { transform: 'scale(1)' }];   // phi: PHI^-5 overshoot
    if (g === 'bang') return [{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(' + (1 + Math.pow(IP, 3)) + ')', filter: 'brightness(' + PHI + ')', offset: Math.pow(IP, 3) }, { transform: 'scale(1)', filter: 'brightness(1)' }];   // phi: quick swell + flash
    if (g === 'bounce') { var h = Math.pow(IP, 2), f = [{ transform: 'translateY(0)' }], j; for (j = 0; j < 3; j++) { f.push({ transform: 'translateY(' + (-h * Math.pow(IP, j)) + 'em)' }); f.push({ transform: 'translateY(0)' }); } return f; }   // phi: hop PHI^-2 em, each hop PHI^-1 of the last; unit: 3 hops
    return null;
  }
  function land(el, g, imp) {
    if (RM || !el || !el.animate || (seen && seen.has(el))) return; if (seen) seen.add(el);
    var now = performance.now(), D = Math.pow(PHI, imp - 1 + SPEED) * MS;   // phi: duration by importance
    var at = Math.max(0, lastAt + GAP * MS * (1 + (k * IP) % 1) - now); lastAt = now + at; k++;   // phi: golden-fraction stagger after the previous arrival
    var base = 1; try { base = +getComputedStyle(el).opacity; if (!(base >= 0)) base = 1; } catch (e) {}   // its own opacity (the rain sits at 0.2): sweep up to that, not past it
    var ops = sweep(N0).map(function (o) { return { opacity: o * base }; });
    try { el.animate(ops, { duration: D, delay: at, easing: 'linear', fill: 'backwards' }); } catch (e) {}
    var G = gesture(g, el), ADD = root.KeyframeEffect && 'composite' in KeyframeEffect.prototype;
    if (G && (ADD || !el.style.transform)) { try { el.animate(G, { duration: MS * PHI, delay: at + D, easing: 'ease-out', composite: 'add' }); } catch (e) {} }   // phi: gesture lasts PHI s; added on top of its own transform (skipped where that is unsupported and it has one)
    rates(el, at, D);
    log.push({ el: el.id || el.className, g: g, imp: imp, at: Math.round(now - t0 + at), ms: Math.round(D) });
  }
  // frequency sweep for the element's own CSS / WAAPI animations (one capped timer per arrival, gone when settled)
  function rates(el, at, D) {
    if (!el.getAnimations) return; var start = performance.now() + at, step = MS * Math.pow(IP, 7), list = null, n = 0;   // phi: PHI^-7 s steps
    var id = setInterval(function () { var u = (performance.now() - start) / D; if (u < 0) u = 0; var r = u >= 1 ? 1 : Math.pow(PHI, -N0 * (1 - u));
      if (!list || ++n % 13 === 0) { try { list = el.getAnimations({ subtree: true }); } catch (e) { list = []; } }   // loadfirst: re-query every Fibonacci 13th step, not every step (each query forced a style recalc)
      list.forEach(function (a) { if (a.effect && a.effect.getTiming && a.effect.getTiming().duration === 'auto') return; try { if (a.updatePlaybackRate) a.updatePlaybackRate(r); else a.playbackRate = r; } catch (e) {} });
      if (u >= 1) clearInterval(id); }, step);
  }
  function check(n) { if (n.nodeType !== 1) return; for (var i = 0; i < REG.length; i++) { try { if (n.matches(REG[i][0])) return land(n, REG[i][1], REG[i][2]); } catch (e) {} } }
  function scan() { REG.forEach(function (r) { Array.prototype.forEach.call(doc.querySelectorAll(r[0]), function (n) { land(n, r[1], r[2]); }); }); }
  if (!RM && root.MutationObserver) new MutationObserver(function (ms) { ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, check); }); }).observe(doc.body || doc.documentElement, { childList: true });
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', scan); else scan();
  root.Arrivals = { land: land, info: function () { return { speed: SPEED, gap: GAP, start: N0, arrived: log.slice() }; } };
})();
