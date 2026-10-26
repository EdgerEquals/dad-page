/* Scene dials (dials.html; Danny 12:04 AWST 26 Oct): how rarely the home page's thought clouds appear (plus the top sweep, ping chain and, since solarsystem, the solar-model INTENSITY). One phi rung per step:
   a cloud every PHI^r s. Stored only in this browser under 'dadSceneDials.v1', which js/emoji-scene.js reads on the next home load.
   No network, no other storage, no names. */
(function () {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2;                                      // phi: the golden ratio
  var KEY = 'dadSceneDials.v1';
  var PCT = 100;                                                         // unit: percent
  var SPEC = { clouds: { def: 10, lo: 7, hi: 13, fmt: 'every' },          // phi: rungs; default 10 = one cloud per 123 s (rarer), range 29 s .. 521 s
    topsweep: { def: 3, lo: 2, hi: 5, fmt: 'faint' },                    // phi: top-sweep planet peak opacity 1 - PHI^-(hi+1-r), default 0.764
    pings: { def: 6, lo: 4, hi: 9, fmt: 'every' },                       // phi: ping chain every PHI^r s, default 17.9 s
    intensity: { def: 5, lo: 1, hi: 6, fmt: 'amp', n: 3 },
    arrspeed: { def: 0, lo: -2, hi: 2, fmt: 'dur' },                     // phi: arrivals duration x PHI^r (rule 14; js/arrivals.js)
    arrstagger: { def: 2, lo: 0, hi: 4, fmt: 'gap' },                    // phi: arrivals stagger PHI^-r s
    arrstart: { def: 5, lo: 2, hi: 8, fmt: 'start' } };                  // phi: arrivals start at PHI^-r of full            // phi: solar-model strength amp(n + r - 5), n = a planet's 3 pumps; default 5 = rich, 1 = off (js/solar-model.js)
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  Array.prototype.forEach.call(document.querySelectorAll('[data-scene-dial]'), function (t) {
    var id = t.getAttribute('data-scene-dial'), sp = SPEC[id]; if (!sp) return;
    var v = t.querySelector('[data-v]'), rg = t.querySelector('[data-rung]');
    function get() { var d = load(); return d[id] != null ? +d[id] : sp.def; }
    function show() { var r = get(), s = Math.pow(PHI, r); if (sp.fmt === 'dur') v.textContent = 'x ' + Math.pow(PHI, r).toFixed(2) + ' (footer line ' + Math.pow(PHI, 4 + r).toFixed(1) + ' s)'; else if (sp.fmt === 'gap') v.textContent = Math.pow(PHI, -r).toFixed(2) + ' s apart'; else if (sp.fmt === 'start') v.textContent = 'from ' + Math.round(PCT * Math.pow(PHI, -r)) + '%'; else if (sp.fmt === 'amp') { var g = sp.n + r - sp.def; v.textContent = g > 0 ? 'strength ' + Math.round(PCT * (1 - Math.pow(PHI, -g))) + '%' : 'off'; } else if (sp.fmt === 'faint') v.textContent = 'opacity ' + Math.round(PCT * (1 - Math.pow(PHI, r - sp.hi - 1))) + '%'; else v.textContent = 'one every ' + (s < 60 ? Math.round(s) + ' s' : (s / 60).toFixed(1) + ' min');   // unit: seconds per minute
      rg.textContent = 'rung ' + r + (r === sp.def ? ' (default)' : ''); }
    Array.prototype.forEach.call(t.querySelectorAll('[data-sstep]'), function (b) {
      b.addEventListener('click', function () { var d = load(), r = get() + (+b.getAttribute('data-sstep')); if (r < sp.lo || r > sp.hi) return; d[id] = r; save(d); show(); });
    });
    show();
  });
})();
