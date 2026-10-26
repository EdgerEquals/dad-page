/* Scene dials (dials.html; Danny 12:04 AWST 26 Oct): how rarely the home page's thought clouds appear. One phi rung per step:
   a cloud every PHI^r s. Stored only in this browser under 'dadSceneDials.v1', which js/emoji-scene.js reads on the next home load.
   No network, no other storage, no names. */
(function () {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2;                                      // phi: the golden ratio
  var KEY = 'dadSceneDials.v1';
  var SPEC = { clouds: { def: 10, lo: 7, hi: 13 } };                     // phi: rungs; default 10 = one cloud per 123 s (rarer), range 29 s .. 521 s
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  Array.prototype.forEach.call(document.querySelectorAll('[data-scene-dial]'), function (t) {
    var id = t.getAttribute('data-scene-dial'), sp = SPEC[id]; if (!sp) return;
    var v = t.querySelector('[data-v]'), rg = t.querySelector('[data-rung]');
    function get() { var d = load(); return d[id] != null ? +d[id] : sp.def; }
    function show() { var r = get(), s = Math.pow(PHI, r); v.textContent = 'one every ' + (s < 60 ? Math.round(s) + ' s' : (s / 60).toFixed(1) + ' min');   // unit: seconds per minute
      rg.textContent = 'rung ' + r + (r === sp.def ? ' (default)' : ''); }
    Array.prototype.forEach.call(t.querySelectorAll('[data-sstep]'), function (b) {
      b.addEventListener('click', function () { var d = load(), r = get() + (+b.getAttribute('data-sstep')); if (r < sp.lo || r > sp.hi) return; d[id] = r; save(d); show(); });
    });
    show();
  });
})();
