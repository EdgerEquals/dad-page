/* DIAL SANDBOX (dials.html; Danny via Kids Club, 22:07 AWST 25 Oct 2026). Tier 1 (defer). Test bench only.
   Models the three dials exactly as the Kids Club shared layer defines them ("Core standard: golden-ratio dials, one closed feedback
   loop" + "Season pumps standard") and as js/phi-dials.js builds them on the kids' pages (one data model, many faces, rule 4):
     ONE DIAL SHAPE  rung k has the value PHI^-k (1, .618, .382, .236, .146, .090, .056, .034); the rung after the last is closed (0).
                     One rung per step (x PHI up, / PHI down), never an invented value, only between floor and ceiling (rungs).
                     A step past floor or ceiling is not applied: it is shown as "a proposal to Danny", as on the live pages.
                     Danny's own floor / ceiling buttons are here too (the sandbox is his); moving one past the dial carries the dial along.
                     Every move glides (free-wheel rule 6: exponential approach, no snap) and is logged on the device for Undo.
     Dial 1 filter   share of each component's events passed from the visit into the long-term profile = v; share of the profile passed
                     up into the ratio summary = the top v of components; live events stay in memory and are never stored.
     Dial 2 pace     speed factor k = 1 + v - v(Danny's default rung) on the page's existing timing (RatioPump.setUser in the live build);
                     periods divide by k. Shown on Simmie's ladder (phi-timing rule 4: base-ladder slot x PHI^-1.5) and the load-tier gaps.
     Dial 3 season   strength v = each output's peak; out = v x PRODUCT S^(w (cos - 1) / 2) (js/season-pumps.js, the shared formula):
                     warmth on the year's timescale, rest calm on the day's (x the sun's rest share), then the WCAG safe-side floor.
   Starting rungs, floors and ceilings are Danny's rungs from js/phi-dials.js SPEC (t816u), so the sandbox opens where the live dials sit.
   PRIVATE + LOCAL: reads no usage record (phiAdapt.v1 is never touched), writes nothing to any kid's page, the shared layer or the network.
   The only storage is this sandbox's own key 'dadDialSandbox.v1' (positions, floors, ceilings, the Undo log). No names anywhere. */
(function () {
  "use strict";
  var doc = document, root = window;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI;                     // phi: the golden ratio, the sole scaling factor
  var CLOSED = 8;                                                      // anchor: Danny's ladder, 8 rungs then closed (t816u; same as js/phi-dials.js)
  var SPEC = {                                                         // anchor: Danny's rungs (js/phi-dials.js SPEC): def / ceiling / floor
    filter: { def: 2, ceil: 1, floor: 4 },         // anchor: Danny's rungs 0.382 ; up to 0.618, down to 0.146
    pace:   { def: 2, ceil: 1, floor: 3 },         // anchor: Danny's rungs factor 1 ; up to 1.236, down to 0.854
    season: { def: 4, ceil: 2, floor: CLOSED }     // anchor: Danny's rungs 0.146 ; up to 0.382, down to closed
  };
  var IDS = ["filter", "pace", "season"];
  var KEY = "dadDialSandbox.v1";
  var LOGMAX = 89;                                                     // phi: a Fibonacci size for the Undo log, as in js/phi-dials.js
  var HOURS = 24;                                                      // unit: hours per day
  var MS = 1e3;                                                        // unit: milliseconds per second (SI)
  var TAU_GLIDE = IP;                                                  // phi: glide time constant PHI^-1 s (each PHI^-1 s closes 1 - 1/e of the gap)
  var SIM = Math.pow(PHI, -1.5);                                       // phi-timing rule 4: Simmie's ladder = base-ladder slot x PHI^-1.5
  var LADDER = [2, 3, 5, 6].map(function (n) { return Math.pow(PHI, n) * SIM; });   // phi: exponents of phi-timing rules 3-4: cursor blink, Ask Dad glow, mission log, space set
  var GAPS = [3, 2, 1].map(function (n) { return Math.pow(IP, n); });  // phi: js/load-tiers.js golden gaps 0.236 / 0.382 / 0.618 s
  var SEASON_EVERY = Math.pow(PHI, 8);                                 // phi: clocks re-read every PHI^8 s while visible, as in js/phi-dials.js
  var RM = root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

  function val(r) { return r >= CLOSED ? 0 : Math.pow(IP, r); }
  function fx(n, d) { return (+n).toFixed(d == null ? 3 : d); }      // unit: display decimals (formatting only)
  function sec(s) { return s >= 10 ? fx(s, 1) + " s" : s >= 1 ? fx(s, 2) + " s" : fx(s, 3) + " s"; }   // unit: display decimals by size (formatting only)
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function fresh() { var s = { v: 1, d: {}, log: [] }; IDS.forEach(function (id) { var p = SPEC[id]; s.d[id] = { pos: p.def, ceil: p.ceil, floor: p.floor }; }); return s; }
  function ok(r) { return r === (r | 0) && r >= 0 && r <= CLOSED; }

  // ---------- this sandbox's own state (never the kids' record) ----------
  var S = fresh();
  try {
    var raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && raw.v === 1 && raw.d) IDS.forEach(function (id) { var x = raw.d[id];
      if (x && ok(x.pos) && ok(x.ceil) && ok(x.floor) && x.ceil <= x.pos && x.pos <= x.floor) S.d[id] = { pos: x.pos, ceil: x.ceil, floor: x.floor }; });
    if (raw && Array.isArray(raw.log)) S.log = raw.log.slice(-LOGMAX);
  } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  // ---------- moves ----------
  var notes = {};
  function note(id, t) { notes[id] = t; var el = q(id, "[data-note]"); if (el) el.textContent = t || ""; }
  function logMove(id, what) { S.log.push({ d: id, w: what, prev: id === "*" ? clone(S.d) : clone(S.d[id]) }); S.log = S.log.slice(-LOGMAX); }
  function step(id, dir) {                                             // dir +1 = one rung up (x PHI), -1 = one rung down (/ PHI)
    var d = S.d[id], to = d.pos - dir;
    if (to < 0 || to > CLOSED) { note(id, dir > 0 ? "Already at the top rung (1)." : "Already closed."); return; }
    if (to < d.ceil) { note(id, "Above the ceiling (" + lab(d.ceil) + "): on the live pages this becomes a proposal to Danny, not a move."); return; }
    if (to > d.floor) { note(id, "Below the floor (" + lab(d.floor) + "): on the live pages this becomes a proposal to Danny, not a move."); return; }
    logMove(id, "dial"); d.pos = to; note(id, ""); save(); render(id); glide(id);
  }
  function limit(id, which, dir) {                                     // Danny's floor / ceiling, one rung at a time
    var d = S.d[id], to = d[which] - dir;
    if (to < 0 || to > CLOSED) return;
    if (which === "ceil" && to > d.floor) return;
    if (which === "floor" && to < d.ceil) return;
    logMove(id, which); d[which] = to;
    var carried = false;
    if (d.pos < d.ceil) { d.pos = d.ceil; carried = true; }
    if (d.pos > d.floor) { d.pos = d.floor; carried = true; }
    note(id, carried ? "The dial moved with the " + (which === "ceil" ? "ceiling" : "floor") + "." : "");
    save(); render(id); glide(id);
  }
  function undo() {
    var m = S.log.pop(); if (!m) return;
    if (m.d === "*") S.d = m.prev; else S.d[m.d] = m.prev;
    save(); IDS.forEach(function (id) { note(id, ""); render(id); glide(id); });
  }
  function reset() { logMove("*", "reset"); IDS.forEach(function (id) { var p = SPEC[id]; S.d[id] = { pos: p.def, ceil: p.ceil, floor: p.floor }; note(id, ""); render(id); glide(id); }); save(); }

  // ---------- free-wheel glide (rule 6): the shown value approaches the rung smoothly; reduced motion: at once ----------
  var shown = {}, raf = {}, last = {};
  function glide(id) {
    var target = val(S.d[id].pos); if (shown[id] == null || RM.matches) { shown[id] = target; paint(id); return; }
    if (raf[id]) return;
    last[id] = 0;
    function frame(t) {
      var target = val(S.d[id].pos), dt = last[id] ? (t - last[id]) / MS : 0; last[id] = t;
      var gap = target - shown[id];
      if (Math.abs(gap) < Math.pow(IP, CLOSED + CLOSED)) { shown[id] = target; raf[id] = 0; paint(id); return; }   // phi: settles below PHI^-16
      shown[id] += gap * (1 - Math.exp(-dt / TAU_GLIDE));
      paint(id); raf[id] = root.requestAnimationFrame(frame);
    }
    raf[id] = root.requestAnimationFrame(frame);
  }

  // ---------- painting ----------
  function q(id, sel) { var t = doc.querySelector('[data-dial="' + id + '"]'); return t && t.querySelector(sel); }
  function lab(r) { return r >= CLOSED ? "closed" : fx(val(r)); }
  function rungFloat(v) {                                              // where a glide value sits on the ladder (for the marker)
    if (v <= 0) return CLOSED;
    var r = Math.log(v) / Math.log(IP), last7 = val(CLOSED - 1);
    if (v < last7) return (CLOSED - 1) + (1 - v / last7);              // between the last rung and closed: linear to 0
    return Math.max(0, r);
  }
  function render(id) {                                                // static parts: ladder cells, limits
    var d = S.d[id], lad = q(id, "[data-lad]"), lim = q(id, "[data-lims]"), html = "";
    for (var k = 0; k <= CLOSED; k++) html += '<span class="' + (k >= d.ceil && k <= d.floor ? "in" : "") + (k === d.pos ? " on" : "") + '" title="' + lab(k) + '"></span>';
    html += '<em style="left:' + (0.5 / (CLOSED + 1) * 100) + '%">1</em><em style="left:' + ((CLOSED + 0.5) / (CLOSED + 1) * 100) + '%">0</em><i data-mk></i>';   // unit: percent of the ladder; a cell's centre is half a cell
    lad.innerHTML = html;
    lim.innerHTML =
      '<span>Ceiling <button type="button" data-lim="ceil" data-dir="-1" aria-label="Ceiling down one rung">&divide;&phi;</button><b>' + lab(d.ceil) +
      '</b><button type="button" data-lim="ceil" data-dir="1" aria-label="Ceiling up one rung">&times;&phi;</button></span>' +
      '<span>Floor <button type="button" data-lim="floor" data-dir="-1" aria-label="Floor down one rung">&divide;&phi;</button><b>' + lab(d.floor) +
      '</b><button type="button" data-lim="floor" data-dir="1" aria-label="Floor up one rung">&times;&phi;</button></span>' +
      '<span>Danny\'s default <b>' + lab(SPEC[id].def) + '</b></span>';
    var r = q(id, "[data-rung]"); r.textContent = d.pos >= CLOSED ? "closed (after rung " + (CLOSED - 1) + ")" : "rung " + d.pos + " = \u03C6^-" + d.pos;
  }
  function set(id, key, text) { var el = q(id, '[data-r="' + key + '"]'); if (el) el.textContent = text; }
  function paint(id) {
    var v = shown[id], mk = q(id, "[data-mk]");
    q(id, "[data-v]").textContent = fx(v);
    if (mk) mk.style.left = ((rungFloat(v) + 0.5) / (CLOSED + 1) * 100) + "%";   // unit: percent of the ladder; a cell's centre is half a cell
    if (id === "filter") paintFilter(v); else if (id === "pace") paintPace(v); else paintSeason(v);
  }
  function paintFilter(v) {
    var t = doc.querySelector('[data-dial="filter"]');
    t.querySelector('[data-b="profile"]').style.setProperty("--s", v);
    t.querySelector('[data-b="summary"]').style.setProperty("--s", v * v);
    set("filter", "profile", "\u00D7" + fx(v)); set("filter", "summary", "\u00D7" + fx(v * v));
    set("filter", "p1", fx(v)); set("filter", "p2", "top " + fx(v)); set("filter", "p3", fx(v * v) + " (v\u00B2)");
  }
  function kOf(v) { return 1 + v - val(SPEC.pace.def); }               // js/phi-dials.js: speed factor on the page's existing timing
  function paintPace(v) {
    var k = kOf(v), d = S.d.pace;
    set("pace", "k", "\u00D7" + fx(k) + (fx(k) === fx(1) ? " steady" : k > 1 ? " quicker" : " gentler"));
    set("pace", "range", "\u00D7" + fx(kOf(val(d.floor))) + " \u2026 \u00D7" + fx(kOf(val(d.ceil))));
    LADDER.forEach(function (b, i) { set("pace", "t" + i, sec(b) + " \u2192 " + sec(b / k)); });
    set("pace", "gaps", GAPS.map(function (g) { return fx(g / k); }).join(" / ") + " s");
    var p = q("pace", "[data-pulse]"); if (p) p.style.setProperty("--pulse", (LADDER[0] / k) + "s");
    set("pace", "pulse", RM.matches ? "reduced motion: on the live pages the factor stays 1" : "cursor blink at this speed (" + sec(LADDER[0] / k) + ")");
  }
  var SP = null, sky = null;
  function seasonReady() { SP = root.SeasonPumps || null; if (SP) { readSky(); paintSeason(shown.season); } }
  function readSky() { try { sky = SP.clocks(new Date()); } catch (e) { sky = null; } }
  function rgb(s) { var m = String(s || "").match(/[\d.]+/g); return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : null; }   // unit: r, g, b channels
  function paintSeason(v) {
    if (!SP || !sky || v == null) return;
    var now = new Date(), warm = SP.output("warmth", v, now), calm = SP.output("calm", v, now);
    var cs = getComputedStyle(doc.body), f = SP.wcagFloor(rgb(cs.backgroundColor) || SP.WHITE, rgb(cs.color), warm, calm, CLOSED);
    set("season", "warm", "sepia " + fx(f.warm));
    set("season", "calm", "saturation \u00D7" + fx(1 - f.calm));
    set("season", "ws", fx(sky.warmthShare));
    set("season", "cs", fx(sky.calmShare) + " \u00D7 " + fx(sky.rest));
    set("season", "sun", fx(sky.sunHeight, 1) + "\u00B0 \u00B7 rest " + fx(sky.rest));
    set("season", "day", fx(sky.dayHours, 2) + " h \u00B7 " + fx(sky.dayRatio));
    set("season", "wcag", f.k ? f.k + " (tint \u00D7" + fx(Math.pow(IP, f.k)) + ")" : "0 (contrast kept)");
    var pal = q("season", "[data-pal]"); if (pal) { pal.style.setProperty("--w", f.warm); pal.style.setProperty("--sat", 1 - f.calm); }
    var tb = q("season", "[data-pumps]"), names = { m2: "M2 tide", s2: "S2 tide", springNeap: "Spring\u2013neap", perigee: "Perigee (anom. month)", year: "Year (day length)" };
    if (tb) tb.innerHTML = Object.keys(sky.pumps).map(function (id) { var p = sky.pumps[id];
      return "<tr><td>" + (names[id] || id) + "</td><td>" + (p.periodDays < 1 ? fx(p.periodDays * HOURS, 2) + " h" : fx(p.periodDays, 2) + " d") + "</td><td>" + fx(p.swing) +
        "</td><td>" + fx(p.cos, 2) + "</td><td>" + fx(p.wWarmth) + "</td><td>" + fx(p.wCalm) + "</td></tr>"; }).join("");
  }

  // ---------- wiring ----------
  doc.getElementById("tiles").addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button"); if (!b) return;
    var t = b.closest("[data-dial]"); if (!t) return; var id = t.getAttribute("data-dial");
    if (b.hasAttribute("data-step")) step(id, +b.getAttribute("data-step"));
    else if (b.hasAttribute("data-lim")) limit(id, b.getAttribute("data-lim"), +b.getAttribute("data-dir"));
  });
  doc.getElementById("dsUndo").addEventListener("click", undo);
  doc.getElementById("dsReset").addEventListener("click", reset);
  // follow the dashboard's theme if it changes in another tab (read only)
  root.addEventListener("storage", function (e) {
    if (e.key !== "dadQuizTheme") return;
    if (e.newValue === "light") doc.documentElement.setAttribute("data-theme", "light"); else doc.documentElement.removeAttribute("data-theme");
    if (SP) paintSeason(shown.season);
  });
  IDS.forEach(function (id) { render(id); glide(id); });
  if (root.SeasonPumps) seasonReady(); else root.addEventListener("load", seasonReady);
  // the sky moves on its own: re-read every PHI^8 s while visible (reduced motion: on load and on return only)
  setInterval(function () { if (SP && !doc.hidden && !RM.matches) { readSky(); paintSeason(shown.season); } }, Math.round(MS * SEASON_EVERY));
  doc.addEventListener("visibilitychange", function () { if (SP && !doc.hidden) { readSky(); paintSeason(shown.season); } });
  root.DialSandbox = { state: function () { return clone(S); }, shown: function () { return clone(shown); } };
})();
