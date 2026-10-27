/* ED'S DESK (Danny 18:00-18:21 AWST 27 Oct 2026, Claude chat: 'Can u pls build the panel now. Remove mood buttons. Keep the architecture but
   I don't want it on my panel just the literal dial'; 'I want a mute and solo button like a desk and an effects send'; 'Build everything
   else except the animation'; 'Remember I want the panel to open as a page on the main content window'). Loaded on the first tap of the
   faders button (#dj-edit) or the DJ booth tile, never at page load.
   A PAGE in the main content area (#home-main scrolls it; header and footer stay), two tabs: SOUND (this file) and VISUAL (the same desk
   for the animations, see VISUAL below). Close: the faders button again or Esc (no title bar since Danny 18:43 'Remove this part'). Nothing on it drags (Danny avoids drag and
   double-tap on touch): a fader moves one step per tap on its arrows, or jumps to the step under a tap on its track; switches are taps.
   THE RULE (docs/electrical-model.md): no fader multiplies a node's amplitude. Every fader is one of the five parts and says so with a
   letter: R rung, C coupling, V threshold (strike voltage), L loss, N pump count. No channel volume faders. The three amount dials that
   still fail (crash amount, presence peak, balance depth) are not here until they are rebuilt as pump counts.
   Cap = his setting; the bar behind it = live (what the pumps / the track's energy make of it now, or the channel's notes in the last
   beat), refreshed once a beat with transform only. Strips fold (state kept on this device). Every move is logged on this device with its
   time (mutes and solos too, as arrangement events) so after weeks the record shows where he settles. */
(function (root, doc) {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2, IPH = 1 / PHI, MS = 1e3, SPM = 60;   // phi: the golden ratio; unit: ms per s, s per minute
  var de = doc.documentElement, KUI = 'dadDesk.ui.v2', KH = 'dadDesk.hist.v1', HMAX = 1597;   // unit: history entries kept (a Fibonacci count)
  var CSS = 'css/dj-desk.css?v=multi1';
  function P(n) { return Math.pow(PHI, n); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ld(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function sv(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function E(tag, cls, txt) { var n = doc.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function DJ() { return root.DadAutoDJ; }
  function DK() { var d = DJ(); return d && d.desk; }
  var UI = ld(KUI, { fold: {}, tab: 'sound' });                         // every strip starts closed (Danny 19:06 AWST 27 Oct: 'By default have all of them closed and I will open as I need'); v2 drops the old saved state once
  function folded(id) { return UI.fold[id] == null ? true : !!UI.fold[id]; }
  function log(id, v) { var h = ld(KH, []); h.push([Date.now(), id, typeof v === 'number' ? +v.toFixed(4) : v]); if (h.length > HMAX) h.splice(0, h.length - HMAX); sv(KH, h); }

  // ---------- ladders: golden steps over an open range, the default always a step ----------
  function gl(lo, hi, def) { var a = [lo, def - (def - lo) * IPH, def - (def - lo) * IPH * IPH, def, def + (hi - def) * IPH * IPH, def + (hi - def) * IPH, hi];   // phi: steps close in toward the default
    return a.filter(function (v, i) { return i === 0 || Math.abs(v - a[i - 1]) > 1e-9; }); }
  var CPL = [0, IPH * IPH, IPH, 1, PHI, PHI * PHI];                       // phi: coupling rungs, off .. PHI^2 (1 = as now)
  function cplLab(v) { return v === 0 ? 'off' : Math.abs(v - 1) < 1e-9 ? 'as now' : v.toFixed(2); }
  function num(v) { return Math.abs(v) >= 10 ? v.toFixed(0) : Math.abs(v) >= 1 ? v.toFixed(2).replace(/0$/, '') : v.toFixed(2); }

  // ---------- the faders ----------
  // spec: { id, name, k (R C V L N), L (ladder values), lab (fn v -> label), get (), set (v), live () -> 0..1 or null, grey: hint }
  var FD = [], MIX = [];
  function near(L, v) { var b = 0; for (var i = 1; i < L.length; i++) if (Math.abs(L[i] - v) < Math.abs(L[b] - v)) b = i; return b; }
  function fader(f) {
    var w = E('div', 'dk-f' + (f.grey ? ' is-grey' : '')), nm = E('div', 'dk-nm', f.name), up = E('button', 'dk-ar', '▲'), dn = E('button', 'dk-ar', '▼'),
        tr = E('div', 'dk-trk'), mt = E('div', 'dk-mt'), mb = E('i'), slot = E('span', 'dk-slot'), cap = E('span', 'dk-cap'), kd = E('span', 'dk-k', f.k), val = E('div', 'dk-val');
    up.type = dn.type = 'button'; up.setAttribute('aria-label', f.name + ' up a step'); dn.setAttribute('aria-label', f.name + ' down a step');
    mt.appendChild(mb); tr.appendChild(mt); tr.appendChild(slot); tr.appendChild(cap); tr.appendChild(kd);
    tr.setAttribute('role', 'slider'); tr.setAttribute('tabindex', f.grey ? '-1' : '0'); tr.setAttribute('aria-label', f.name);
    w.appendChild(nm); w.appendChild(up); w.appendChild(tr); w.appendChild(dn); w.appendChild(val);
    var h = E('div', 'dk-hint'); w.appendChild(h);
    function greyNow() { var g = f.greyFn ? f.greyFn() : f.grey; w.classList.toggle('is-grey', !!g); h.textContent = g || ''; h.hidden = !g; up.disabled = dn.disabled = !!g; tr.setAttribute('tabindex', g ? '-1' : '0'); return g; }
    var n = f.L.length;
    function idx() { var v = f.get(); return v == null ? near(f.L, f.def != null ? f.def : f.L[0]) : near(f.L, v); }
    function paint() { greyNow(); var i = idx(), y = n > 1 ? i / (n - 1) : 0; cap.style.bottom = 'calc((100% - var(--dk-capr)) * ' + y.toFixed(4) + ' + var(--dk-pad))';
      val.textContent = f.lab(f.L[i]); tr.setAttribute('aria-valuenow', String(i)); tr.setAttribute('aria-valuetext', val.textContent); tr.setAttribute('aria-valuemin', '0'); tr.setAttribute('aria-valuemax', String(n - 1)); }
    function to(i) { if (greyNow()) return; i = clamp(i, 0, n - 1); if (i === idx()) return; f.set(f.L[i]); log(f.id, f.L[i]); paint(); }
    up.addEventListener('click', function () { to(idx() + 1); }); dn.addEventListener('click', function () { to(idx() - 1); });
    tr.addEventListener('click', function (e) { var r = tr.getBoundingClientRect(); if (!r.height) return; to(Math.round((1 - clamp((e.clientY - r.top) / r.height, 0, 1)) * (n - 1))); });   // a tap jumps to the nearest step
    tr.addEventListener('keydown', function (e) { if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); to(idx() + 1); } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); to(idx() - 1); } });
    paint();
    var o = { el: w, paint: paint, meter: function () { if (!f.live) { mt.style.visibility = 'hidden'; return; } var x = f.live(); if (x == null || !isFinite(x)) { mt.style.visibility = 'hidden'; return; } mt.style.visibility = ''; mb.style.transform = 'scaleY(' + clamp(x, 0, 1).toFixed(3) + ')'; }, f: f };
    FD.push(o); return o;
  }
  function sw(lab, on, click, cls) { var b = E('button', 'dk-sw' + (cls ? ' ' + cls : ''), lab); b.type = 'button'; b.setAttribute('aria-pressed', on() ? 'true' : 'false');
    b.addEventListener('click', function () { click(); b.setAttribute('aria-pressed', on() ? 'true' : 'false'); }); b._sync = function () { b.setAttribute('aria-pressed', on() ? 'true' : 'false'); }; return b; }

  // ---------- strips ----------
  var SW = [];
  function strip(host, id, title, note) {
    var s = E('section', 'dk-s'), h = E('button', 'dk-sh'), b = E('div', 'dk-sb'); h.type = 'button';
    var t = E('b', null, title); h.appendChild(t); if (note) h.appendChild(E('small', null, note)); h.appendChild(E('span', 'dk-fold', '▾'));
    s.setAttribute('data-strip', id); if (folded(id)) s.classList.add('is-folded'); h.setAttribute('aria-expanded', folded(id) ? 'false' : 'true');
    h.addEventListener('click', function () { var f = !s.classList.contains('is-folded'); s.classList.toggle('is-folded', f); h.setAttribute('aria-expanded', f ? 'false' : 'true'); UI.fold[id] = f ? 1 : 0; sv(KUI, UI); });
    s.appendChild(h); s.appendChild(b); host.appendChild(s); return b;
  }
  function tools(host, list) {                                            // reset + dice for a bank of faders
    var row = E('div', 'dk-tools'), rs = E('button', 'dk-mini', 'reset'), dc = E('button', 'dk-mini', '🎲'); rs.type = dc.type = 'button';
    dc.setAttribute('aria-label', 'Roll these faders'); rs.addEventListener('click', function () { list.forEach(function (o) { if (o.f.grey || o.f.def == null) return; o.f.set(o.f.def); o.paint(); }); log('reset', list.map(function (o) { return o.f.id; }).join(',')); });
    dc.addEventListener('click', function () { var s0 = Date.now() * IPH; list.forEach(function (o, j) { if (o.f.grey) return; var x = (s0 + j) * IPH; x -= Math.floor(x); var i = Math.floor(x * o.f.L.length); o.f.set(o.f.L[i]); o.paint(); }); log('roll', list.map(function (o) { return o.f.id; }).join(',')); });
    row.appendChild(dc); row.appendChild(rs); host.appendChild(row);
  }
  function bank(host, specs) { var b = E('div', 'dk-bank'), list = specs.map(function (f) { var o = fader(f); b.appendChild(o.el); return o; }); host.appendChild(b); return list; }

  // ---------- the SOUND page ----------
  var CHN = { drums: 'drums', bass: 'bass', chords: 'chords', arp: 'arp', pad: 'pad', lead: 'lead', answer: 'answer', voice: 'voice' };
  function sendLab(i) { return ['off', '▁', '▂', '▃', '▅', 'full'][i] || String(i); }
  function soundPage(host) {
    var D = DK(), d = DJ(); if (!D) { host.appendChild(E('p', 'dk-note', 'The DJ is still loading. Tap the music button first, then open the desk again.')); return; }
    var mx = D.mx, SL = D.SENDL;
    // MIXER
    var m = strip(host, 'mixer', 'Mixer', 'mute · solo · echo + wash sends'), grid = E('div', 'dk-mix');
    D.CHS.forEach(function (ch) {
      var c = E('div', 'dk-ch'), top = E('div', 'dk-chn', CHN[ch]), ms = E('div', 'dk-ms'), meter = E('div', 'dk-chm'), mi = E('i'), sends = E('div', 'dk-snds');
      meter.appendChild(mi); c.appendChild(top);
      ms.appendChild(sw('M', function () { return !!D.mx.m[ch]; }, function () { var v = !D.mx.m[ch]; D.mute(ch, v); log('mute.' + ch, v ? 1 : 0); }, 'dk-m'));
      ms.appendChild(sw('S', function () { return !!D.mx.s[ch]; }, function () { var v = !D.mx.s[ch]; D.solo(ch, v); log('solo.' + ch, v ? 1 : 0); }, 'dk-so'));
      c.appendChild(ms);
      ['e', 'w'].forEach(function (k) { var L = SL.map(function (_, i) { return i; });
        var o = fader({ id: 'send.' + k + '.' + ch, name: k === 'e' ? 'echo' : 'wash', k: 'C', L: L, def: 0, lab: sendLab, get: function () { return (k === 'e' ? D.mx.e : D.mx.w)[ch] | 0; }, set: function (v) { D.send(ch, k, v); } });
        o.el.classList.add('dk-mini-f'); sends.appendChild(o.el); });
      var row = E('div', 'dk-chr'); row.appendChild(meter); row.appendChild(sends); c.appendChild(row); grid.appendChild(c);
      FD.push({ el: c, paint: function () { c.querySelectorAll('.dk-sw').forEach(function (b) { if (b._sync) b._sync(); }); c.classList.toggle('is-off', !D.on(ch)); },
        meter: null, f: { id: 'ch.' + ch } });
      MIX.push({ ch: ch, mi: mi, v: 0 });
    });
    m.appendChild(grid);
    // STYLE
    var st = strip(host, 'style', 'Style'), row = E('div', 'dk-sws');
    ['auto', 'random'].concat(D.genres).forEach(function (gk) { row.appendChild(sw(gk, function () { return (D.pick || 'auto') === gk; }, function () { D.setPick(gk === 'auto' ? null : gk); log('style', gk); row.querySelectorAll('.dk-sw').forEach(function (b) { b._sync(); }); })); });   // auto = the pumps choose; random = chance, each new track (Danny 18:53)
    st.appendChild(row);
    // CHANGES (Danny 18:55-18:59 AWST 27 Oct: 'Can the transition happen faster when I change a parameter?' ... 'build it as dials so that I
    // can adjust it ... from my usage data ... where I generally land'): how a change made here lands; the DJ's own changes keep the radio pacing
    var cg = strip(host, 'changes', 'Changes', 'how fast your changes land');
    var BB = [1, 2, 3, 5, 8, 0], FDL = [IPH, 1, PHI, PHI * PHI, PHI * PHI * PHI, PHI * PHI * PHI * PHI, 0], DPL = [0, P(-4), P(-3), P(-2), IPH, 1, -1];
    var cl = bank(cg, [{ id: 'dial.dkBars', name: 'build', k: 'R', L: BB, def: 1, lab: function (v) { return v === 0 ? 'radio' : v + (v === 1 ? ' bar' : ' bars'); }, get: function () { return D.dial('dkBars'); }, set: function (v) { D.dial('dkBars', v); } },
      { id: 'dial.dkFade', name: 'fade', k: 'R', L: FDL, def: PHI, lab: function (v) { return v === 0 ? 'style' : v.toFixed(1) + ' s'; }, get: function () { return D.dial('dkFade'); }, set: function (v) { D.dial('dkFade', v); } },
      { id: 'dial.dkDepth', name: 'sweep', k: 'C', L: DPL, def: -1, lab: function (v) { return v < 0 ? 'auto' : v === 0 ? 'none' : v === 1 ? 'full' : v.toFixed(2); }, get: function () { return D.dial('dkDepth'); }, set: function (v) { D.dial('dkDepth', v); } }]);
    var nowRow = E('div', 'dk-sws'); cg.appendChild(E('div', 'dk-sub', 'harmony + melody faders'));
    [['next track', 0], ['now', 1]].forEach(function (x) { nowRow.appendChild(sw(x[0], function () { return (D.dial('dkNow') | 0) === x[1]; }, function () { D.dial('dkNow', x[1]); log('dial.dkNow', x[1]); nowRow.querySelectorAll('.dk-sw').forEach(function (b) { b._sync(); }); })); });
    cg.appendChild(nowRow); tools(cg, cl);
    // DRUMS
    var rd = function (k, name, kind, lo, hi, def, live) { return { id: 'rd.' + k, name: name, k: kind, L: gl(lo, hi, def), def: def, lab: function (v) { return v === def ? 'mid' : num(v); }, get: function () { return D.rd(k); }, set: function (v) { D.rd(k, v); }, live: live }; };
    var lv = function () { return D.live() || {}; }, rp = function (k) { return function () { var r = lv().rp; return r && r[k] != null ? r[k] : null; }; };
    var dr = strip(host, 'drums', 'Drums');
    var dl = bank(dr, [rd('energy', 'energy', 'V', -1, 1, 0, function () { var e = lv().e; return e == null ? null : e; }), rd('vary', 'vary', 'C', 0, 1, 1 / 2), rd('reach', 'reach', 'C', 0, 1, 1 / 2),
      rd('rest', 'rests', 'L', 0, 1, 1 / 2, rp('spc')), rd('stop', 'stops', 'V', 0, 1, 1 / 2), rd('contrast', 'contrast', 'R', 0, 1, 1 / 2), rd('roll', 'rolls', 'N', 0, 1, 1 / 2),
      rd('laid', 'laid back', 'R', 0, 1, 1 / 2), rd('ghost', 'ghosts', 'N', 0, 1, 1 / 2, rp('ghost')),
      { id: 'dial.c808', name: '808 character', k: 'R', L: [0, IPH, 1, PHI, PHI * PHI], def: 1, lab: function (v) { return ['off', 'less', 'normal', 'more', 'max'][near([0, IPH, 1, PHI, PHI * PHI], v)]; }, get: function () { return D.dial('c808'); }, set: function (v) { D.dial('c808', v); } }]);
    tools(dr, dl);
    // HARMONY
    var dial = function (k, name, kind, lo, hi, def, lab) { return { id: 'dial.' + k, name: name, k: kind, L: gl(lo, hi, def), def: def, lab: lab || function (v) { return Math.abs(v - def) < 1e-9 ? 'mid' : num(v); }, get: function () { return D.dial(k); }, set: function (v) { D.dial(k, v); } }; };
    var hm = strip(host, 'harmony', 'Harmony');
    var hl = bank(hm, [dial('modeR', 'mode range', 'R', 1 / 2, 3, (1 / 2 + 3) / 2), dial('modeLo', 'dark end', 'V', -5, -4, (-4 - 5) / 2, function (v) { return v <= -5 + 1e-9 ? 'locrian' : v >= -4 - 1e-9 ? 'phrygian' : num(v); }),
      dial('loopLo', 'shortest loop', 'R', 0, 1, 1 / 2, function (v) { return Math.pow(2, v).toFixed(1) + ' ch'; }), dial('loopHi', 'longest loop', 'R', 2, 3, 5 / 2, function (v) { return Math.pow(2, v).toFixed(1) + ' ch'; }),
      dial('hrLo', 'fastest chord', 'R', -1, 0, -1 / 2, function (v) { return Math.pow(2, v).toFixed(2) + ' bar'; }), dial('hrHi', 'slowest chord', 'R', 1, 2, 3 / 2, function (v) { return Math.pow(2, v).toFixed(1) + ' bar'; }),
      dial('rho0', 'root motion, calm', 'C', 1 / 2, 1, 3 / 4), dial('rho1', 'root motion, driving', 'C', -1, -1 / 2, -3 / 4)]);
    tools(hm, hl);
    // PAD (Danny 19:58 AWST 27 Oct, Claude chat: the electro pad as a stab, a pluck or a gated pad? 'All'): the shapes are switches, any set
    // layers (as the transitions); auto lets the energy pick, random draws one or two per track. The faders move every shape in rungs from
    // its own; gate rate in powers of two (1/32 .. 1/4), gate open the share of each chop (a threshold).
    var pd = strip(host, 'pad', 'Pad', "electro's Juno pad · steps are rungs from each shape's own");
    var PMS = [['auto', 0], ['swell', 1], ['stab', 2], ['pluck', 4], ['gate', 8], ['random', -1]], pmw = E('div', 'dk-sws');
    var pmOn = function (b) { var m = D.dial('padM') | 0; return b <= 0 ? m === b : m > 0 && !!(m & b); };
    PMS.forEach(function (x) { pmw.appendChild(sw(x[0], function () { return pmOn(x[1]); }, function () { var m = D.dial('padM') | 0, b = x[1]; m = b <= 0 ? b : m > 0 ? m ^ b : b; D.dial('padM', m); log('dial.padM', m); pmw.querySelectorAll('.dk-sw').forEach(function (q) { q._sync(); }); })); });
    pd.appendChild(E('div', 'dk-sub', 'shape · pick any set')); pd.appendChild(pmw);
    var rg = function (v) { return Math.abs(v) < 1e-9 ? 'own' : (v > 0 ? '+' : '') + num(v); };
    var pfl = bank(pd, [dial('padA', 'attack', 'R', -3, 3, 0, rg), dial('padD', 'decay', 'R', -3, 3, 0, rg), dial('padS', 'hold loss', 'L', -3, 3, 0, rg), dial('padR', 'release', 'R', -3, 3, 0, rg), dial('padF', 'filter snap', 'R', -2, 2, 0, rg),
      { id: 'dial.padG', name: 'gate rate', k: 'R', L: [-1, 0, 1, 2], def: 0, lab: function (v) { return ['1/32', '1/16', '1/8', '1/4'][Math.round(v) + 1] || num(v); }, get: function () { return D.dial('padG'); }, set: function (v) { D.dial('padG', v); } },
      { id: 'dial.padO', name: 'gate open', k: 'V', L: [Math.pow(IPH, 3), IPH * IPH, IPH, 1 - Math.pow(IPH, 3), 1 - Math.pow(IPH, 4)], def: IPH, lab: function (v) { return Math.round(v * 100) + '%'; }, get: function () { return D.dial('padO'); }, set: function (v) { D.dial('padO', v); } }]);
    tools(pd, pfl);
    // MELODY
    var me = strip(host, 'melody', 'Melody', 'motif memory · call and response');
    var ml = bank(me, [dial('recall', 'recall', 'C', 0, 1, IPH, function (v) { return Math.round(v * 100) + '%'; }), dial('resp', 'answer', 'C', 0, 1, IPH, function (v) { return Math.round(v * 100) + '%'; })]);
    tools(me, ml);
    // EFFECTS (the returns; the knobs of js/dj-fx.js: a step is a nudge from the live value, as the old chips)
    var ef = strip(host, 'effects', 'Effects', 'returns · the bar = where the pumps have it');
    var FXK = [['roll', 'roll', 'R', ['off', '1/2', '1/3', '1/5', '1/8']], ['filter', 'filter', 'R', ['low ◀◀', 'low ◀', 'open', 'high ▶', 'high ▶▶']], ['echo', 'echo', 'C', ['off', 'touch', 'some', 'lots', 'max']], ['wash', 'wash', 'C', ['off', 'touch', 'some', 'lots', 'max']], ['crush', 'crush', 'V', ['off', 'touch', 'some', 'lots', 'max']]];
    var fxe = function (k) { var F = d && d.fx, e = F && F.eff; return e && e[k] ? e[k] : null; };
    var fl = bank(ef, FXK.map(function (x) { var L = x[3].map(function (_, i) { return i; });
      return { id: 'fx.' + x[0], name: x[1], k: x[2], L: L, def: null, lab: function (i) { return x[3][i]; }, get: function () { var e = fxe(x[0]); return e ? e.i : null; }, set: function (i) { var F = d && d.fx; if (F && F.set) F.set(x[0], i); },
        live: function () { var e = fxe(x[0]); return e && e.li != null ? e.li / (L.length - 1) : null; } }; }));
    var tx = E('div', 'dk-sws'), TX = ['auto', 'techno cut', 'trance build', 'echo out', 'scatter roll', 'flanger wash', 'random'];
    // MULTI-SELECT (Danny 19:13 AWST 27 Oct: 'select more than one and the random button for that should do the same'): the five styles
    // toggle, any set plays together; auto and random stand alone (random draws a set at each change, up to the 'random picks' count).
    var txOn = function (i) { var F = d && d.fx, e = fxe('trans'), h = e ? e.i | 0 : 0; if (i === 0 || i === TX.length - 1) return h === i; return h > 0 && h < TX.length - 1 && !!F && (F.tset || []).indexOf(i) >= 0; };
    TX.forEach(function (lab, i) { tx.appendChild(sw(lab, function () { return txOn(i); }, function () { var F = d && d.fx; if (F && F.trans) F.trans(i, i > 0 && i < TX.length - 1); else if (F && F.set) F.set('trans', i); log('fx.trans', F && F.tset ? (txOn(0) ? 0 : txOn(TX.length - 1) ? TX.length - 1 : F.tset.join('+')) : i); tx.querySelectorAll('.dk-sw').forEach(function (b) { b._sync(); }); })); });
    ef.appendChild(E('div', 'dk-sub', 'transition · pick any set')); ef.appendChild(tx);
    TXL = E('div', 'dk-hint dk-txl'); ef.appendChild(TXL);
    bank(ef, [{ id: 'fx.tn', name: 'random picks', k: 'N', L: [1, 2, 3, 4, 5], def: 3, lab: function (v) { return 'up to ' + v; }, get: function () { var F = d && d.fx; return F && F.tn ? F.tn() : 3; }, set: function (v) { var F = d && d.fx; if (F && F.tn) F.tn(v); } }]);   // pump count: how many styles random may combine
    var fxr = E('div', 'dk-tools'), fb = E('button', 'dk-mini', '🎲'), fbk = E('button', 'dk-mini', 'back to live'); fb.type = fbk.type = 'button';
    fb.addEventListener('click', function () { var F = d && d.fx; if (F && F.random) F.random(); log('fx.roll', 1); setTimeout(paintAll, 60); });
    fbk.addEventListener('click', function () { var F = d && d.fx; if (F && F.back) F.back(); log('fx.live', 1); setTimeout(paintAll, 60); });
    fxr.appendChild(fb); fxr.appendChild(fbk); ef.appendChild(fxr);
    // VOICE
    var vo = strip(host, 'voice', 'Voice');
    var vd = function (k, name, kind, lo, hi, def) { return { id: 'voice.' + k, name: name, k: kind, L: gl(lo, hi, def), def: def, lab: function (v) { return Math.abs(v - def) < 1e-9 ? 'mid' : num(v); }, get: function () { var V = d && d.voice; return V && V.dial ? V.dial(k) : null; }, set: function (v) { var V = d && d.voice; if (V && V.dial) { V.dial(k, v); var R = root.RhythmContinuity; if (R && R.save) try { R.save(); } catch (e) {} } } }; };
    var vl = bank(vo, [vd('floor', 'floor', 'V', P(-4), P(-2), P(-3)), vd('club', 'club', 'C', 1, PHI * PHI, PHI), vd('tc', 'timing', 'R', 1 / 3, 2 / 3, 1 / 2), vd('nw', 'width', 'C', 0, IPH, IPH / 2), vd('soar', 'soar', 'R', IPH, PHI, 1), vd('vib', 'vibrato', 'R', IPH, PHI, 1)]);
    tools(vo, vl);
    // SKY (the collision pump into the music)
    var sk = strip(host, 'sky', 'Sky', 'emoji crashes in the music');
    var kl = bank(sk, [dial('colT', 'swell', 'R', P(4), P(6), P(5), function (v) { return v.toFixed(1) + ' s'; }), dial('colW', 'booms vs debris', 'C', IPH, PHI, 1), dial('colF', 'fill-out', 'C', 0, 1, IPH)]);
    tools(sk, kl);
    // MEMORY
    var mm = strip(host, 'memory', 'Memory', 'how long a reload remembers the track');
    bank(mm, [{ id: 'rk', name: 'resume', k: 'L', L: gl(3, 7, 5), def: 5, lab: function (v) { return 'rung ' + num(v); }, get: function () { return D.rk(); }, set: function (v) { D.rk(v); } }]);
    // RACKS (box mute / solo, electro's instruments)
    var rk = strip(host, 'racks', 'Racks', 'electro · each box on its own');
    var RK = [['808', '808', ['driftbox', 'ours', 'sub', 'snap']], ['303', '303', ['driftbox', 'ours', 'drive']], ['dx', 'DX7 lead', ['DX7 bell', 'our bell', 'DX7 tine']], ['jup', 'Jupiter stabs', ['Jupiter', 'old stab', 'unison']], ['juno', 'Juno arp + pad', ['chorus I', 'dry', 'chorus II']]];
    RK.forEach(function (r) { var box = E('div', 'dk-rack'); box.appendChild(E('div', 'dk-sub', r[1]));
      var g = E('div', 'dk-boxes'); r[2].forEach(function (lab, u) { var b = E('div', 'dk-box'), bm = D.mx.b; b.appendChild(E('span', null, lab));
        var mb2 = sw('M', function () { var x = D.mx.b[r[0]]; return !!(x && x.m[u]); }, function () { var x = D.mx.b[r[0]], v = !(x && x.m[u]); D.boxSet(r[0], u, 'm', v); log('box.' + r[0] + '.' + u + '.m', v ? 1 : 0); }, 'dk-m');
        var sb = sw('S', function () { var x = D.mx.b[r[0]]; return !!(x && x.s[u]); }, function () { var x = D.mx.b[r[0]], v = !(x && x.s[u]); D.boxSet(r[0], u, 's', v); log('box.' + r[0] + '.' + u + '.s', v ? 1 : 0); }, 'dk-so');
        b.appendChild(mb2); b.appendChild(sb); g.appendChild(b); }); box.appendChild(g); rk.appendChild(box); });
    // SYSTEM (couplings; Danny 18:19 AWST 27 Oct 'Yea': the live ones work, the rest greyed with what they are waiting for)
    var sy = strip(host, 'system', 'System', 'couplings · how strongly each source steers');
    var cp = function (k, name, live) { return { id: 'dial.' + k, name: name, k: 'C', L: CPL, def: 1, lab: cplLab, get: function () { return D.dial(k); }, set: function (v) { D.dial(k, v); }, live: live }; };
    var gr = function (name, k, def, hint) { return { id: 'grey.' + name, name: name, k: k, L: CPL, def: def, lab: cplLab, get: function () { return def; }, set: function () {}, grey: hint }; };
    sy.appendChild(E('div', 'dk-sub', 'inputs'));
    var s1 = bank(sy, [cp('cpSky', 'sky → music'), cp('cpTime', 'time → music'),
      gr('mood → music', 'C', 1, 'when Simmie’s mood tag is wired to this page'), gr('urgency → music', 'C', 1, 'when messages reach this page')]);
    sy.appendChild(E('div', 'dk-sub', 'bridges'));
    var s2 = bank(sy, [cp('cpCol', 'collisions → music', function () { return D.colc; }),
      gr('music → visuals', 'C', 1, 'today: the DJ button glow only; a real coupling when the cascade’s audio→visual bridge lands')]);
    sy.appendChild(E('div', 'dk-sub', 'cascade'));
    bank(sy, [gr('taps → energy', 'C', IPH * IPH, 'with the energy model (Phase 2)'), gr('self-sustain', 'N', 1, 'pumps on the loop; loop gain 1 = sustains (Phase 2)'), gr('busy cap', 'V', PHI, 'the zener knee over the strike (Phase 2)')]);
    tools(sy, s1.concat(s2));
  }

  // ---------- VISUAL page (Danny 18:15 AWST 27 Oct: 'a duplicate page but for the visual layer, again with visual reference to the actual
  // emoji'; 18:17 my answer he took, 'Yea': the music desk's shape now, grouped by domain, the layer-stack view once the cascade exists) ----------
  // Mixer: one channel per animation with its own emoji: M / S (its pieces hidden, clocks keep running) and SPEED, a rung PHI^r on its CSS
  // animations (js/anim-tiles.js applies it at every load). An animation that moves on its own JavaScript clock shows its speed fader
  // greyed (it does not listen to CSS rates). Scene and arrivals: the dial-lab rungs (js/scene-dials.js storage), seen on the next load.
  var VCH = [['sky', 'Sky', [['sun', '☀️', 'sun & planets'], ['earth', '🌍', 'earth & moon'], ['comet', '☄️', 'comet'], ['rain', '🌠', 'falling stars'], ['sky', '✨', 'star spin'], ['ring', '🪐', 'space ring']]],
    ['machine', 'Machine', [['rocket', '🚀', 'rocket'], ['ping', '📡', 'dish ping'], ['matrix', '🟩', 'matrix rain'], ['code', '📜', 'code drift'], ['loop', '🎞️', 'space loop']]],
    ['ground', 'Ground', [['critters', '🐞', 'critters']]]];
  var SPD = [-2, -1, 0, 1, 2];                                            // phi: speed rungs, x PHI^-2 .. x PHI^2
  function vst() { var A = root.AnimTiles, st = A && A.deskState ? A.deskState() : {}; st.m = st.m || {}; st.s = st.s || {}; st.sp = st.sp || {}; return st; }
  function vput(st) { var A = root.AnimTiles; if (A && A.desk) A.desk(st); }
  function cssMoves(k) { var A = root.AnimTiles, P = A && A.pieces && A.pieces[k]; if (!P || !doc.getAnimations) return false; var sel = P.join(',');
    return doc.getAnimations().some(function (a) { var t = a.effect && a.effect.target; return a.animationName != null && t && t.closest && t.closest(sel); }); }
  function visualPage(host) {
    if (!root.AnimTiles || !root.AnimTiles.desk) { host.appendChild(E('p', 'dk-note', 'The animations are still loading. Open the desk again in a moment.')); return; }
    var m = strip(host, 'vmixer', 'Mixer', 'mute · solo · speed, per animation');
    VCH.forEach(function (dom) { m.appendChild(E('div', 'dk-sub', dom[1])); var g = E('div', 'dk-mix');
      dom[2].forEach(function (a) { var k = a[0], c = E('div', 'dk-ch'), em = E('span', 'dk-emo', a[1]), nm = E('div', 'dk-chn', a[2]), ms = E('div', 'dk-ms');
        c.appendChild(em); c.appendChild(nm);
        ms.appendChild(sw('M', function () { return !!vst().m[k]; }, function () { var st = vst(); st.m[k] = !st.m[k]; vput(st); log('vmute.' + k, st.m[k] ? 1 : 0); paintAll(); }, 'dk-m'));
        ms.appendChild(sw('S', function () { return !!vst().s[k]; }, function () { var st = vst(); st.s[k] = !st.s[k]; vput(st); log('vsolo.' + k, st.s[k] ? 1 : 0); paintAll(); }, 'dk-so'));
        c.appendChild(ms);
        var o = fader({ id: 'vspeed.' + k, name: 'speed', k: 'R', L: SPD, def: 0, lab: function (r) { return r === 0 ? 'as now' : '×' + Math.pow(PHI, r).toFixed(2); },
          get: function () { return +vst().sp[k] || 0; }, set: function (r) { var st = vst(); st.sp[k] = r; vput(st); }, greyFn: function () { return cssMoves(k) ? null : 'not moving by CSS right now (it runs on its own clock, or has not loaded yet)'; } });
        o.el.classList.add('dk-mini-f'); c.appendChild(o.el);
        FD.push({ el: c, paint: function () { c.querySelectorAll('.dk-sw').forEach(function (b) { if (b._sync) b._sync(); }); var st = vst(), any = Object.keys(st.s).some(function (x) { return st.s[x]; }); c.classList.toggle('is-off', !!st.m[k] || (any && !st.s[k])); }, meter: null, f: { id: 'vch.' + k } });
        g.appendChild(c); });
      m.appendChild(g); });
    var vt = E('div', 'dk-tools'), vr = E('button', 'dk-mini', 'all back on, as now'); vr.type = 'button';
    vr.addEventListener('click', function () { vput({ m: {}, s: {}, sp: {} }); log('visual.reset', 1); paintAll(); }); vt.appendChild(vr); m.appendChild(vt);
    // scene + arrivals: the dial lab's own rungs, the same storage, read by the page on its next load
    var KS = 'dadSceneDials.v1', SP = { clouds: [10, 7, 13, 'R', 'clouds', function (r) { return 'every ' + Math.round(Math.pow(PHI, r)) + ' s'; }], pings: [6, 4, 9, 'R', 'dish pings', function (r) { return 'every ' + Math.pow(PHI, r).toFixed(0) + ' s'; }],
      topsweep: [3, 2, 5, 'V', 'top sweep', function (r) { return (1 - Math.pow(PHI, -(5 + 1 - r))).toFixed(2); }], intensity: [5, 1, 6, 'N', 'planet pumps', function (r) { return r <= 1 ? 'off' : 'rung ' + r; }], scenery: [0, -3, 3, 'V', 'scenery', function (r) { return (r > 0 ? '+' : '') + r; }],
      arrspeed: [0, -2, 2, 'R', 'arrival speed', function (r) { return '×' + Math.pow(PHI, r).toFixed(2); }], arrstagger: [2, 0, 4, 'R', 'arrival gaps', function (r) { return Math.pow(PHI, -r).toFixed(2) + ' s'; }], arrstart: [5, 2, 8, 'V', 'arrival start', function (r) { return Math.round(100 * Math.pow(PHI, -r)) + '%'; }] };
    function sd(id) { var x = SP[id], L = []; for (var r = x[1]; r <= x[2]; r++) L.push(r);
      return { id: 'scene.' + id, name: x[4], k: x[3], L: L, def: x[0], lab: x[5], get: function () { var d = ld(KS, {}); return d[id] != null ? +d[id] : x[0]; }, set: function (r) { var d = ld(KS, {}); d[id] = r; sv(KS, d); } }; }
    var sc = strip(host, 'vscene', 'Scene', 'seen on the next load');
    tools(sc, bank(sc, ['clouds', 'pings', 'topsweep', 'intensity', 'scenery'].map(sd)));
    var ar = strip(host, 'varrive', 'Arrivals', 'how things come in on load');
    tools(ar, bank(ar, ['arrspeed', 'arrstagger', 'arrstart'].map(sd)));
    host.appendChild(E('p', 'dk-note', 'Coming with the cascade: the layer stack, every group as its emoji at the layer it is awake on, live.'));
  }

  // ---------- page, tabs, meters ----------
  var el = null, body = null, readEl = null, tabs = {}, mT = 0, lastFocus = null;
  var TXL = null;
  function txLast() { if (!TXL) return; var d = DJ(), F = d && d.fx, lt = F && F.lastTransition, t = lt ? 'last change: ' + lt.style : ''; if (TXL.textContent !== t) TXL.textContent = t; TXL.hidden = !t; }   // which set the last change played
  function paintAll() { FD.forEach(function (o) { try { o.paint(); } catch (e) {} }); }
  function meters() { FD.forEach(function (o) { try { if (o.meter) o.meter(); } catch (e) {} }); var D = DK(); if (readEl && D) { var l = D.live(); readEl.textContent = (D.read || 'Ed’s DJ is off') + (l ? ' · phrase ' + l.phrase + ' of 4' : ''); } }
  // CHANNEL METERS (Danny 18:47 AWST 27 Oct: 'We don't want it actually measuring the sound volume ... the energy in the circuit ... mapped
  // from our parameters'): each channel's capacitor voltage from js/dad-autodj-quiz.js (chMeter: every note a charge pulse of the level the
  // engine set x the layer's arc gain x the crossfade, discharging over PHI^-1 of a beat). No audio is measured. Read every PHI^-5 s while
  // the Sound tab is open, transform only.
  var MSTEP = Math.pow(PHI, -5);                                          // phi: read every PHI^-5 s (~90 ms)
  function fast() { clearTimeout(fT); if (!isOpen() || UI.tab !== 'sound') return; var D = DK(); if (D && D.meter) MIX.forEach(function (m) {
      m.v = clamp(D.meter(m.ch), 0, 1); m.mi.style.transform = 'scaleY(' + m.v.toFixed(3) + ')'; m.mi.parentNode.title = m.ch + ': energy ' + m.v.toFixed(2); });
    fT = setTimeout(fast, MSTEP * MS); }
  var fT = 0;
  function tick() { clearTimeout(mT); if (!isOpen()) return; meters(); var D = DK(), l = D && D.live(); txLast(); mT = setTimeout(tick, (l && l.bpm > 0 ? SPM / l.bpm : 1) * MS); }   // once a beat (DeepSeek check Danny relayed 18:16: a bar is too slow to read)
  function show(t) { UI.tab = t; sv(KUI, UI); Object.keys(tabs).forEach(function (k) { tabs[k].b.setAttribute('aria-selected', k === t ? 'true' : 'false'); tabs[k].p.hidden = k !== t; });
    if (t === 'visual' && !tabs.visual.p.childNodes.length) visualPage(tabs.visual.p); paintAll(); meters(); fast(); }
  function build() {
    if (el) return; var main = doc.getElementById('home-main'); if (!main) return;
    if (!doc.querySelector('link[data-desk]')) { var l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = CSS; l.setAttribute('data-desk', '1'); doc.head.appendChild(l); }
    el = E('section', 'dk'); el.id = 'dj-desk'; el.setAttribute('aria-label', 'Ed’s desk'); el.setAttribute('data-guard', 'dj-desk');
    var top = E('div', 'dk-top');                                          // no title, close or readout line (Danny 18:43 AWST 27 Oct: 'Remove this part'); the faders button, Esc, or the floating X in full screen
    var tb = E('div', 'dk-tabs'); tb.setAttribute('role', 'tablist');
    [['sound', 'Sound 🎛️'], ['visual', 'Visual 🌠']].forEach(function (a) { var b = E('button', 'dk-tab', a[1]), p = E('div', 'dk-page'); b.type = 'button'; b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { show(a[0]); log('tab', a[0]); }); tb.appendChild(b); tabs[a[0]] = { b: b, p: p }; });
    top.appendChild(tb); el.appendChild(top); body = E('div', 'dk-body'); body.appendChild(tabs.sound.p); body.appendChild(tabs.visual.p); el.appendChild(body);
    soundPage(tabs.sound.p);
    main.insertBefore(el, main.firstChild);
    // FULL SCREEN (Danny 18:44 AWST 27 Oct: 'if I double click on the background of the panel, it goes full screen with same x in top corner
    // floating'): two taps on the desk's background (not a button, fader or switch) within PHI^-1 s and PHI^-3 of a rem-ish slop take the
    // desk over the header and footer; the floating X brings it back. His own ask, so the double tap is his on purpose here.
    var fx = E('button', 'dk-fx', '\u00D7'); fx.type = 'button'; fx.setAttribute('aria-label', 'Leave full screen'); fx.addEventListener('click', function (e) { e.stopPropagation(); full(false); }); el.appendChild(fx);
    var lastT = 0, lastX = 0, lastY = 0;
    el.addEventListener('click', function (e) { var t = e.target; if (t && t.closest && t.closest('button,.dk-trk,.dk-sw,a,input')) { lastT = 0; return; }
      var now = performance.now(), near2 = Math.abs(e.clientX - lastX) < 40 && Math.abs(e.clientY - lastY) < 40;   // unit: px of slop between the two taps
      if (lastT && now - lastT < IPH * MS && near2) { lastT = 0; full(!de.hasAttribute('data-desk-full')); log('fullscreen', de.hasAttribute('data-desk-full') ? 1 : 0); return; }
      lastT = now; lastX = e.clientX; lastY = e.clientY; });
    doc.addEventListener('keydown', function (e) { if ((e.key === 'Escape' || e.key === 'Esc') && isOpen()) { e.preventDefault(); if (de.hasAttribute('data-desk-full')) full(false); else close(true); } });
  }
  function isOpen() { return de.hasAttribute('data-desk'); }
  var keep = 0;
  function open() {
    var D = DK(); if (D && !UI.moodsCleared) { try { D.toLive(); } catch (e) {} UI.moodsCleared = 1; sv(KUI, UI); }   // the mood buttons are gone: anything set by hand on them goes back to live, once
    build(); if (!el) return; var main = doc.getElementById('home-main'); keep = main ? main.scrollTop : 0; lastFocus = doc.activeElement;
    de.setAttribute('data-desk', '1'); if (main) main.scrollTop = 0; show(UI.tab === 'visual' ? 'visual' : 'sound'); tick(); sync(true);
  }
  function full(on) { if (on) de.setAttribute('data-desk-full', '1'); else de.removeAttribute('data-desk-full'); }
  function close(refocus) { if (!isOpen()) return; full(false); de.removeAttribute('data-desk'); clearTimeout(mT); clearTimeout(fT); var main = doc.getElementById('home-main'); if (main) main.scrollTop = keep; sync(false);
    if (refocus) { var b = doc.getElementById('dj-edit'); if (b) b.focus({ preventScroll: true }); } }
  function sync(o) { var b = doc.getElementById('dj-edit'); if (b) b.setAttribute('aria-expanded', o ? 'true' : 'false'); }
  root.DjDesk = { open: open, close: close, toggle: function () { isOpen() ? close(false) : open(); }, get isOpen() { return isOpen(); }, history: function () { return ld(KH, []); }, paint: paintAll };
})(window, document);
