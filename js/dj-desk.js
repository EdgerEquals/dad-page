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
  var CSS = 'css/dj-desk.css?v=knob1';
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
  // KNOBS (Danny 08:43-08:49 AWST 28 Oct, Claude chat: 'I want it next to a knob ... press on the top of the button to turn it right and
  // the bottom to turn it left ... the position ... rotate around on the knob ... OLED ... really crisp ... a rotary encoder around it ...
  // super lightweight but nicely animated'; 'stereo VU meters ... on the left of the knob ... a bit wider ... traditional colours';
  // 'much darker and just the information I need to glow'; draft: claude.ai/artifact/Rctkmox4JYbCCQ4YMtD6su; 08:49 'build them in'):
  // every fader is now a push encoder: an LED ring of 21 segments (Fibonacci) lit to the setting, a pointer that glides round, a dim tick
  // at the default, and an OLED window with the value. The top half turns it right a step, the bottom half left; hold to keep turning,
  // faster each step (PHI^-1 of the last wait, from 0.38 s down to 70 ms). A fader with a live reading gets a stereo VU on its left
  // (green / yellow / red, a peak that holds and falls). Colour by kind: L blue, R cyan, C green, V amber, N pink. Drawn once; only
  // classes, the pointer angle and the meter transforms change. Same spec as the faders it replaces (the desk's other code is unchanged).
  var KSEG = 21, KA0 = -135, KA1 = 135, KNO = 0, KV = [], SVGNS = 'http://www.w3.org/2000/svg';
  function karc(r, a, b) { var p = function (d) { var t = (d - 90) * Math.PI / 180; return [60 + r * Math.cos(t), 60 + r * Math.sin(t)]; }, s0 = p(a), e0 = p(b); return 'M' + s0[0].toFixed(2) + ' ' + s0[1].toFixed(2) + 'A' + r + ' ' + r + ' 0 ' + (b - a > 180 ? 1 : 0) + ' 1 ' + e0[0].toFixed(2) + ' ' + e0[1].toFixed(2); }
  function sv0(n, at, txt) { var e = doc.createElementNS(SVGNS, n); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; }
  function vuMake() { var vu = E('div', 'dk-vu'), bars = []; for (var i = 0; i < 2; i++) { var b = E('div', 'dk-vb'), c = E('i', 'dk-vl'), l = E('i', 'dk-vm'), pk = E('b', 'dk-vp'); b.appendChild(c); b.appendChild(l); b.appendChild(pk); vu.appendChild(b); bars.push({ l: l, pk: pk, p: 0, hold: 0 }); } return { el: vu, bars: bars }; }   // the colours stay put (green low, red high); a dark cover lifts off them
  function vuSet(v, ys, dt) { v.bars.forEach(function (b, i) { var y = clamp(ys[i] || 0, 0, 1); if (y >= b.p) { b.p = y; b.hold = IPH; } else if ((b.hold -= dt) < 0) b.p = Math.max(y, b.p - dt * IPH);   // phi: the peak holds PHI^-1 s, then falls PHI^-1 of the scale a second
    b.l.style.transform = 'scaleY(' + (1 - y).toFixed(3) + ')'; b.pk.style.transform = 'translateY(' + (-b.p * 100).toFixed(1) + '%)'; b.pk.style.opacity = b.p > 0.02 ? '' : '0'; }); }
  function fader(f) {
    var id = 'dkk' + (KNO++), w = E('div', 'dk-f dk-kn' + (f.grey ? ' is-grey' : '')), nm = E('div', 'dk-nm', f.name), row = E('div', 'dk-knr'), kn = E('div', 'dk-knob'), val = E('div', 'dk-val');
    w.setAttribute('data-k', f.k); nm.appendChild(E('span', 'dk-kl', f.k));
    var vu = f.live ? vuMake() : null; if (vu) row.appendChild(vu.el);
    var svg = sv0('svg', { viewBox: '0 0 120 120', 'aria-hidden': 'true' }), segs = [], span = (KA1 - KA0) / KSEG, n = f.L.length;
    var glow = sv0('path', { class: 'dk-kg', d: karc(54, KA0, KA0 + 0.01) }); svg.appendChild(glow);
    for (var i = 0; i < KSEG; i++) { var sg = sv0('path', { class: 'dk-ks', d: karc(54, KA0 + i * span + 2.5, KA0 + (i + 1) * span - 2.5) }); svg.appendChild(sg); segs.push(sg); }
    var di = f.def != null ? near(f.L, f.def) : 0, da = KA0 + (KA1 - KA0) * (n > 1 ? di / (n - 1) : 0);
    svg.appendChild(sv0('path', { class: 'dk-kh', d: karc(61.5, da - 2, da + 2) }));
    svg.appendChild(sv0('circle', { class: 'dk-kb', cx: 60, cy: 60, r: 46 }));
    var ptr = sv0('g', { class: 'dk-kp' }); ptr.appendChild(sv0('circle', { cx: 60, cy: 18.5, r: 2.4 })); svg.appendChild(ptr);
    svg.appendChild(sv0('rect', { class: 'dk-ko', x: 25, y: 40, width: 70, height: 40, rx: 7 }));
    svg.appendChild(sv0('rect', { class: 'dk-kc u', x: 26, y: 41, width: 68, height: 19, rx: 6 })); svg.appendChild(sv0('rect', { class: 'dk-kc d', x: 26, y: 60, width: 68, height: 19, rx: 6 }));
    svg.appendChild(sv0('path', { class: 'dk-kv u', d: 'M56 47l4-3.2 4 3.2z' })); svg.appendChild(sv0('path', { class: 'dk-kv d', d: 'M56 73l4 3.2 4-3.2z' }));
    var tv = sv0('text', { class: 'dk-kt', x: 60, y: 65, 'text-anchor': 'middle' }); svg.appendChild(tv);
    var lb = sv0('rect', { class: 'dk-kbar', x: 31, y: 71.5, width: 58, height: 1.4 }); svg.appendChild(lb);
    kn.appendChild(svg);
    var up = E('button', 'dk-kh2 u'), dn = E('button', 'dk-kh2 d'); up.type = dn.type = 'button'; up.setAttribute('aria-label', f.name + ' up a step'); dn.setAttribute('aria-label', f.name + ' down a step'); kn.appendChild(up); kn.appendChild(dn);
    kn.setAttribute('role', 'slider'); kn.setAttribute('tabindex', f.grey ? '-1' : '0'); kn.setAttribute('aria-label', f.name);
    row.appendChild(kn); w.appendChild(nm); w.appendChild(row); w.appendChild(val);
    var h = E('div', 'dk-hint'); w.appendChild(h); if (f.note) w.appendChild(E('div', 'dk-fnote', f.note));   // HINTS (Danny 08:28 AWST 28 Oct, 'Yes please'): a fader may carry a one-line note of what it measures
    function greyNow() { var g = f.greyFn ? f.greyFn() : f.grey; w.classList.toggle('is-grey', !!g); h.textContent = g || ''; h.hidden = !g; up.disabled = dn.disabled = !!g; kn.setAttribute('tabindex', g ? '-1' : '0'); return g; }
    function idx() { var v = f.get(); return v == null ? near(f.L, f.def != null ? f.def : f.L[0]) : near(f.L, v); }
    function paint() { greyNow(); var i = idx(), y = n > 1 ? i / (n - 1) : 0, lit = Math.round(y * (KSEG - 1)), a = KA0 + (KA1 - KA0) * y;
      for (var j = 0; j < KSEG; j++) { segs[j].classList.toggle('on', j < lit); segs[j].classList.toggle('at', j === lit); }
      glow.setAttribute('d', karc(54, KA0, Math.max(KA0 + 0.01, a))); ptr.style.transform = 'rotate(' + a.toFixed(1) + 'deg)';
      val.textContent = f.lab(f.L[i]); tv.textContent = val.textContent; tv.setAttribute('font-size', val.textContent.length > 9 ? 11.5 : val.textContent.length > 6 ? 14 : 16.5);   // a long value steps down a size to stay inside the window
      kn.setAttribute('aria-valuenow', String(i)); kn.setAttribute('aria-valuetext', val.textContent); kn.setAttribute('aria-valuemin', '0'); kn.setAttribute('aria-valuemax', String(n - 1)); }
    function to(i) { if (greyNow()) return false; i = clamp(i, 0, n - 1); if (i === idx()) return false; f.set(f.L[i]); log(f.id, f.L[i]); paint(); return true; }
    function hold(btn, d, cls) { var t = 0, wait = 0;
      function go() { if (!to(idx() + d)) return stop(); wait = Math.max(70, wait * IPH); t = setTimeout(go, wait); }   // unit: 70 ms, the fastest repeat
      function stop() { clearTimeout(t); kn.classList.remove(cls); }
      btn.addEventListener('pointerdown', function (e) { if (btn.disabled) return; e.preventDefault(); kn.classList.add(cls); to(idx() + d); wait = IPH * IPH * MS; t = setTimeout(go, wait); });   // phi: the first repeat after PHI^-2 s
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { btn.addEventListener(ev, stop); });
      btn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); to(idx() + d); } });
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); }); }
    hold(up, 1, 'up'); hold(dn, -1, 'dn');
    kn.addEventListener('keydown', function (e) { if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); to(idx() + 1); } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); to(idx() - 1); } });
    paint();
    var kv = vu ? { vu: vu, lb: lb, f: f } : null; if (kv) KV.push(kv);
    var o = { el: w, paint: paint, meter: function () { if (!kv) return; }, f: f };
    FD.push(o); return o;
  }
  function sw(lab, on, click, cls) { var b = E('button', 'dk-sw' + (cls ? ' ' + cls : ''), lab); b.type = 'button'; b.setAttribute('aria-pressed', on() ? 'true' : 'false');
    b.addEventListener('click', function () { click(); b.setAttribute('aria-pressed', on() ? 'true' : 'false'); }); b._sync = function () { b.setAttribute('aria-pressed', on() ? 'true' : 'false'); }; return b; }

  // ---------- strips ----------
  var SW = [];
  // STRIP MUTE + SOLO (Danny 20:58 / 21:02 AWST 27 Oct: 'I need a mute and solo button' ... 'I need mute and solo in the harmony panel'): a
  // strip that plays its own channels gets M and S beside its name, driving the mixer's own mute / solo for all of them (the mixer shows
  // the same state). M: all of its channels muted (or all back); S: all of them soloed (or all back). chs = the mixer channels it plays.
  function stripMS(s, h, id, chs) {
    var w = E('div', 'dk-shw'), ms = E('div', 'dk-ms dk-shms'), D = DK(); s.insertBefore(w, h); w.appendChild(h); w.appendChild(ms);
    var all = function (k) { return chs.every(function (ch) { return !!D.mx[k][ch]; }); };
    ms.appendChild(sw('M', function () { return all('m'); }, function () { var v = !all('m'); chs.forEach(function (ch) { D.mute(ch, v); }); log('mute.' + id, v ? 1 : 0); paintAll(); }, 'dk-m'));
    ms.appendChild(sw('S', function () { return all('s'); }, function () { var v = !all('s'); chs.forEach(function (ch) { D.solo(ch, v); }); log('solo.' + id, v ? 1 : 0); paintAll(); }, 'dk-so'));
    FD.push({ el: ms, paint: function () { ms.querySelectorAll('.dk-sw').forEach(function (q) { if (q._sync) q._sync(); }); }, meter: null, f: { id: 'ms.' + id } });
  }
  function strip(host, id, title, note, chs) {
    var s = E('section', 'dk-s'), h = E('button', 'dk-sh'), b = E('div', 'dk-sb'); h.type = 'button';
    var t = E('b', null, title); h.appendChild(t); if (note) h.appendChild(E('small', null, note)); h.appendChild(E('span', 'dk-fold', '▾'));
    s.setAttribute('data-strip', id); if (folded(id)) s.classList.add('is-folded'); h.setAttribute('aria-expanded', folded(id) ? 'false' : 'true');
    h.addEventListener('click', function () { var f = !s.classList.contains('is-folded'); s.classList.toggle('is-folded', f); h.setAttribute('aria-expanded', f ? 'false' : 'true'); UI.fold[id] = f ? 1 : 0; sv(KUI, UI); });
    s.appendChild(h); s.appendChild(b); host.appendChild(s); if (chs && chs.length && DK()) stripMS(s, h, id, chs); return b;
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
    var m = strip(host, 'mixer', 'Mixer', 'mute · solo · the energy in each channel'), grid = E('div', 'dk-mix');
    D.CHS.forEach(function (ch) {
      var c = E('div', 'dk-ch'), top = E('div', 'dk-chn', CHN[ch]), ms = E('div', 'dk-ms'), vu = vuMake();
      c.appendChild(top);
      ms.appendChild(sw('M', function () { return !!D.mx.m[ch]; }, function () { var v = !D.mx.m[ch]; D.mute(ch, v); log('mute.' + ch, v ? 1 : 0); }, 'dk-m'));
      ms.appendChild(sw('S', function () { return !!D.mx.s[ch]; }, function () { var v = !D.mx.s[ch]; D.solo(ch, v); log('solo.' + ch, v ? 1 : 0); }, 'dk-so'));
      c.appendChild(ms);
      // NO SENDS (Danny 07:48 AWST 28 Oct: 'Remove effect sends'): the echo and wash send faders are gone from the channels; any that
      // were up go back to off, so nothing hidden stays routed. The effects' own returns (the Effects strip) are untouched.
      ['e', 'w'].forEach(function (k) { if (((k === 'e' ? D.mx.e : D.mx.w)[ch] | 0) > 0) D.send(ch, k, 0); });
      // LEVEL (Danny 08:43 'lost my ability to change the volumes'; 08:49 'build them in'): a loss knob, 0 dB down a rung at a time to off,
      // with the channel's stereo VU on its left (the energy in the circuit after the level; mono channels move both sides together)
      // DRIVE (Danny 09:44 AWST 28 Oct: 'I need to be able to turn things up ... overdrive everything'): the level knob now goes both ways,
      // a rung (about 4.2 dB) a step from off up to +21 dB; above 0 dB the channel overloads like a console channel driven hot
      var lvk = fader({ id: 'level.' + ch, name: 'level', k: 'R', L: [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5], def: 0, note: 'above 0 dB the channel drives into overload', lab: function (v) { return v <= -6 ? 'off' : v === 0 ? '0 dB' : (v > 0 ? '+' : '\u2212') + (Math.abs(v) * 20 * Math.log10(PHI)).toFixed(1) + ' dB' + (v > 0 ? ' drive' : ''); }, get: function () { return D.level ? D.level(ch) : 0; }, set: function (v) { if (D.level) D.level(ch, v); } });
      var row = E('div', 'dk-chr'); row.appendChild(vu.el); row.appendChild(lvk.el); c.appendChild(row); grid.appendChild(c);
      FD.push({ el: c, paint: function () { c.querySelectorAll('.dk-sw').forEach(function (b) { if (b._sync) b._sync(); }); c.classList.toggle('is-off', !D.on(ch)); },
        meter: null, f: { id: 'ch.' + ch } });
      MIX.push({ ch: ch, vu: vu, v: 0 });
    });
    m.appendChild(grid);
    // STYLE
    var st = strip(host, 'style', 'Style', 'style · form'), row = E('div', 'dk-sws');
    ['auto', 'random'].concat(D.genres).forEach(function (gk) { row.appendChild(sw(gk, function () { return (D.pick || 'auto') === gk; }, function () { D.setPick(gk === 'auto' ? null : gk); log('style', gk); row.querySelectorAll('.dk-sw').forEach(function (b) { b._sync(); }); })); });   // auto = the pumps choose; random = chance, each new track (Danny 18:53)
    st.appendChild(E('div', 'dk-sub', 'style')); st.appendChild(row);
    // TEMPO (Danny 18:19 AWST 28 Oct, Claude chat: electro in 120-130 'locks into resonance ... because we can't have rules and I still would like to
    // be able to change the BPM on the fly ... slide it all the way down slowly'): tempo is his move on top of everything (rungs, PHI^-5 a step, the
    // tracks glide there); tempo lock is how strongly a style's energy is held in its home tempo (electro 120-130).
    var TPV = []; for (var tk = -18; tk <= 7; tk++) TPV.push(tk * P(-5));   // phi: steps of PHI^-5 rung (x1.044, ~5 BPM at 125), from x0.46 to x1.35
    st.appendChild(E('div', 'dk-sub', 'tempo'));
    bank(st, [{ id: 'dial.tpo', name: 'tempo', k: 'R', L: TPV, def: 0, note: 'your tempo move: slide it down for a breakdown, the music glides there', lab: function (v) { return Math.abs(v) < 1e-9 ? 'as the style' : '\u00D7' + Math.pow(PHI, v).toFixed(2); }, get: function () { return D.dial('tpo'); }, set: function (v) { D.dial('tpo', v); } },
      { id: 'dial.tLk', name: 'tempo lock', k: 'C', L: [0, P(-3), P(-2), IPH, 1], def: 1, note: "how strongly a style's energy is held in its home tempo (electro 120-130)", lab: function (v) { return v === 0 ? 'free' : v === 1 ? 'held' : Math.round(v * 100) + '%'; }, get: function () { return D.dial('tLk'); }, set: function (v) { D.dial('tLk', v); } }]);
    var TPL = E('div', 'dk-hint dk-txl'); st.appendChild(TPL); TPLF = function () { var l = D.live && D.live(), t = l && l.bpm ? Math.round(l.bpm) + ' BPM' + (l.home ? ' \u00B7 home ' + l.home[0] + '\u2013' + l.home[1] : '') : ''; if (TPL.textContent !== t) TPL.textContent = t; TPL.hidden = !t; };
    // FORM (Danny 07:46 AWST 28 Oct: 'Can you add form'): the shape over time, sections that bring whole parts in and take them out.
    // emergent = the pumps choose the sections (the default since 09:59 28 Oct), written = the style's own written form, off = the old
    // arc (short tracks), random = a written form per track; the named written forms follow; the readout shows where the track is.
    var fr = E('div', 'dk-sws'), FMS = [['emergent', -3], ['written', 0], ['off', -1], ['random', -2]]   // EMERGENT BY DEFAULT (Danny 09:59): emergent first; written = the style's own written form (was 'auto').concat((D.forms || []).map(function (n, i) { return [n, i + 1]; }));
    FMS.forEach(function (x) { fr.appendChild(sw(x[0], function () { return (D.dial('fmM') | 0) === x[1]; }, function () { D.dial('fmM', x[1]); log('dial.fmM', x[1]); fr.querySelectorAll('.dk-sw').forEach(function (q) { q._sync(); }); })); });
    st.appendChild(E('div', 'dk-sub', 'form')); st.appendChild(fr);
    var FML = E('div', 'dk-hint dk-txl'); st.appendChild(FML);
    FMLF = function () { var l = D.live && D.live(), f = l && l.form, t = !l ? '' : !f ? 'form off: one arc per track' : f.name + ' · ' + f.sec + ', bar ' + f.bar + ' of ' + f.bars + (f.next ? ' · next: ' + f.next : ' · then the next track'); if (FML.textContent !== t) FML.textContent = t; };
    var ffl = bank(st, [{ id: 'dial.fmU', name: 'phrase', k: 'N', L: [1, 2, 4, 8], def: 4, lab: function (v) { return v + (v > 1 ? ' bars' : ' bar'); }, get: function () { return D.dial('fmU'); }, set: function (v) { D.dial('fmU', v); } },
      { id: 'dial.fmR', name: 'build roll', k: 'N', L: [0, 1, 2, 4], def: 1, lab: function (v) { return v ? v + (v > 1 ? ' bars' : ' bar') : 'off'; }, get: function () { return D.dial('fmR'); }, set: function (v) { D.dial('fmR', v); } },
      { id: 'dial.fmS', name: 'drop stop', k: 'N', L: [0, 2, 4, 8], def: 4, lab: function (v) { return v ? v + ' sixteenths' : 'off'; }, get: function () { return D.dial('fmS'); }, set: function (v) { D.dial('fmS', v); } }]);
    // EMERGENT FORM (Danny 09:09 AWST 28 Oct 'All'): the pumps choose the sections; these set the pumps. The meters beside 'peak at' and
    // 'breakdown at' show the section pump against them, the one beside 'ends after' the track pump (parameters, not the audio).
    var fpv = function (k) { return function () { var l = D.live && D.live(), f = l && l.form; return f && f.pump ? Math.max(0, Math.min(1, (f.pump[k] + 1) / 2)) : null; }; };
    var fd = function (k, name, kind, L, def, note, lab, live) { return { id: 'dial.' + k, name: name, k: kind, L: L, def: def, note: note, lab: lab, get: function () { return D.dial(k); }, set: function (v) { D.dial(k, v); }, live: live }; };
    var phl = function (v) { return v + (v === 1 ? ' phrase' : ' phrases'); }, TH = [0, P(-5), P(-4), P(-3), P(-2), IPH];
    st.appendChild(E('div', 'dk-sub', 'emergent form'));
    var efl = bank(st, [fd('fmSP', 'sections', 'R', [3, 5, 8, 13], 5, 'how long the section pump takes to rise and fall', phl),
      fd('fmHi', 'peak at', 'V', TH, P(-3), 'the pump goes over this: the peak (a lift, or a drop after a build)', num, fpv('sec')),
      fd('fmLo', 'breakdown at', 'V', TH, P(-4), 'the pump goes under minus this: the breakdown', num, fpv('sec')),
      fd('fmHy', 'let go', 'V', TH, P(-4), 'how far back the pump must fall before a level lets go', num),
      fd('fmDr', 'drift', 'N', [0, 1, 2], 1, 'whole phrases a section may grow or shrink', function (v) { return v ? '+-' + phl(v) : 'none'; }),
      fd('fmMn', 'at least', 'R', [5, 8, 13, 21], 8, 'the shortest track, before its outro', phl),
      fd('fmTP', 'ends after', 'R', [8, 13, 21, 34], 13, 'the track pump: the track ends at its first peak after the shortest', phl, fpv('trk'))]);
    tools(st, ffl.concat(efl));   // one reset + dice for both Form banks
    // CHANGES (Danny 18:55-18:59 AWST 27 Oct: 'Can the transition happen faster when I change a parameter?' ... 'build it as dials so that I
    // can adjust it ... from my usage data ... where I generally land'): how a change made here lands; the DJ's own changes keep the radio pacing
    var cg = strip(host, 'changes', 'Changes', 'how fast your changes land');
    var BB = [1, 2, 3, 5, 8, 0], FDL = [1 / 4, 1 / 2, 1, 2, 4, 8, 0], DPL = [0, P(-4), P(-3), P(-2), IPH, 1, -1];
    var cl = bank(cg, [{ id: 'dial.dkBars', name: 'build', k: 'R', L: BB, def: 1, note: 'bars your change builds before it lands', lab: function (v) { return v === 0 ? 'radio' : v + (v === 1 ? ' bar' : ' bars'); }, get: function () { return D.dial('dkBars'); }, set: function (v) { D.dial('dkBars', v); } },
      { id: 'dial.dkFade', name: 'fade', k: 'R', L: FDL, def: 1, note: 'bars the old and new overlap', lab: function (v) { return v === 0 ? 'style' : (v < 1 ? '1/' + Math.round(1 / v) + ' bar' : v + (v === 1 ? ' bar' : ' bars')); },   /* bars, not seconds (Danny 08:14 28 Oct) */ get: function () { return D.dial('dkFade'); }, set: function (v) { D.dial('dkFade', v); } },
      { id: 'dial.dkDepth', name: 'sweep', k: 'C', L: DPL, def: -1, note: 'how much of the transition effects fire', lab: function (v) { return v < 0 ? 'auto' : v === 0 ? 'none' : v === 1 ? 'full' : v.toFixed(2); }, get: function () { return D.dial('dkDepth'); }, set: function (v) { D.dial('dkDepth', v); } }]);
    var nowRow = E('div', 'dk-sws'); cg.appendChild(E('div', 'dk-sub', 'harmony + melody faders'));
    [['next track', 0], ['now', 1]].forEach(function (x) { nowRow.appendChild(sw(x[0], function () { return (D.dial('dkNow') | 0) === x[1]; }, function () { D.dial('dkNow', x[1]); log('dial.dkNow', x[1]); nowRow.querySelectorAll('.dk-sw').forEach(function (b) { b._sync(); }); })); });
    cg.appendChild(nowRow); cg.appendChild(E('div', 'dk-hint dk-txl', 'now: the music rebuilds as you move them · next track: they wait for it')); tools(cg, cl);
    // DRUMS
    var rd = function (k, name, kind, lo, hi, def, live) { return { id: 'rd.' + k, name: name, k: kind, L: gl(lo, hi, def), def: def, lab: function (v) { return v === def ? 'mid' : num(v); }, get: function () { return D.rd(k); }, set: function (v) { D.rd(k, v); }, live: live }; };
    var lv = function () { return D.live() || {}; }, rp = function (k) { return function () { var r = lv().rp; return r && r[k] != null ? r[k] : null; }; };
    var dr = strip(host, 'drums', 'Drums', null, ['drums']);
    var dl = bank(dr, [rd('energy', 'energy', 'V', -1, 1, 0, function () { var e = lv().e; return e == null ? null : e; }), rd('vary', 'vary', 'C', 0, 1, 1 / 2), rd('reach', 'reach', 'C', 0, 1, 1 / 2),
      rd('rest', 'rests', 'L', 0, 1, 1 / 2, rp('spc')), rd('stop', 'stops', 'V', 0, 1, 1 / 2), rd('contrast', 'contrast', 'R', 0, 1, 1 / 2), rd('roll', 'rolls', 'N', 0, 1, 1 / 2),
      rd('laid', 'laid back', 'R', 0, 1, 1 / 2), rd('ghost', 'ghosts', 'N', 0, 1, 1 / 2, rp('ghost')),
      { id: 'dial.c808', name: '808 character', k: 'R', L: [0, IPH, 1, PHI, PHI * PHI], def: 1, lab: function (v) { return ['off', 'less', 'normal', 'more', 'max'][near([0, IPH, 1, PHI, PHI * PHI], v)]; }, get: function () { return D.dial('c808'); }, set: function (v) { D.dial('c808', v); } }]);
    tools(dr, dl);
    // BASS (Danny 20:10 AWST 27 Oct, Claude chat: the bass shapes aimed at 'Kraftwerk, Anthony Rother and Detroit like Aux 88'): the shapes
    // are switches (any set; all = every shape), the faders are the library share and slide / accent couplings, and the steps each track changes.
    var bs = strip(host, 'bass', 'Bass', 'the 303 line · our own electro shapes', ['bass']);
    var BSN = ['octave pump', 'machine 8ths', 'sequence', 'funk', 'kick-lock', 'dark walk', 'gallop', 'approach', 'bounce', 'deep sea', 'cold machine', 'synth-pop', 'stutter'], bsw = E('div', 'dk-sws');
    var bsOn = function (j) { var m = D.dial('bShp') | 0; return j < 0 ? !(m > 0) : m > 0 && !!(m & (1 << j)); };
    [-1].concat(BSN.map(function (_, j) { return j; })).forEach(function (j) { bsw.appendChild(sw(j < 0 ? 'all' : BSN[j], function () { return bsOn(j); }, function () { var m = D.dial('bShp') | 0; m = j < 0 ? 0 : (m > 0 ? m : 0) ^ (1 << j); D.dial('bShp', m); log('dial.bShp', m); bsw.querySelectorAll('.dk-sw').forEach(function (q) { q._sync(); }); })); });
    bs.appendChild(E('div', 'dk-sub', 'shape · pick any set')); bs.appendChild(bsw);
    var BSL = E('div', 'dk-hint dk-txl'); bs.appendChild(BSL); BSLF = function () { var l = D.live && D.live(), t = l && l.bass ? 'playing: ' + l.bass : ''; if (BSL.textContent !== t) BSL.textContent = t; BSL.hidden = !t; };
    var pc = function (v) { return Math.round(v * 100) + '%'; };
    var bfl = bank(bs, [{ id: 'dial.bLib', name: 'library share', k: 'C', L: [0, Math.pow(IPH, 3), IPH * IPH, IPH, 1 - Math.pow(IPH, 3), 1], def: IPH, lab: pc, get: function () { return D.dial('bLib'); }, set: function (v) { D.dial('bLib', v); } },
      { id: 'dial.bMut', name: 'notes changed', k: 'N', L: [0, 1, 2, 3, 5, 8], def: 2, lab: function (v) { return String(v); }, get: function () { return D.dial('bMut'); }, set: function (v) { D.dial('bMut', v); } },
      { id: 'dial.bSl', name: 'slides', k: 'C', L: CPL, def: 1, lab: cplLab, get: function () { return D.dial('bSl'); }, set: function (v) { D.dial('bSl', v); } },
      { id: 'dial.bAc', name: 'accents', k: 'C', L: CPL, def: 1, lab: cplLab, get: function () { return D.dial('bAc'); }, set: function (v) { D.dial('bAc', v); } }]);
    tools(bs, bfl);
    // HARMONY
    var dial = function (k, name, kind, lo, hi, def, lab) { return { id: 'dial.' + k, name: name, k: kind, L: gl(lo, hi, def), def: def, lab: lab || function (v) { return Math.abs(v - def) < 1e-9 ? 'mid' : num(v); }, get: function () { return D.dial(k); }, set: function (v) { D.dial(k, v); } }; };
    var hm = strip(host, 'harmony', 'Harmony', 'chords · arp · pad', ['chords', 'arp', 'pad']);
    var hl = bank(hm, [dial('modeR', 'mode range', 'R', 1 / 2, 3, (1 / 2 + 3) / 2), dial('modeLo', 'dark end', 'V', -5, -4, (-4 - 5) / 2, function (v) { return v <= -5 + 1e-9 ? 'locrian' : v >= -4 - 1e-9 ? 'phrygian' : num(v); }),
      dial('loopLo', 'shortest loop', 'R', 0, 1, 1 / 2, function (v) { return Math.pow(2, v).toFixed(1) + ' ch'; }), dial('loopHi', 'longest loop', 'R', 2, 3, 5 / 2, function (v) { return Math.pow(2, v).toFixed(1) + ' ch'; }),
      dial('hrLo', 'fastest chord', 'R', -1, 0, -1 / 2, function (v) { return Math.pow(2, v).toFixed(2) + ' bar'; }), dial('hrHi', 'slowest chord', 'R', 1, 2, 3 / 2, function (v) { return Math.pow(2, v).toFixed(1) + ' bar'; }),
      dial('rho0', 'root motion, calm', 'C', 1 / 2, 1, 3 / 4), dial('rho1', 'root motion, driving', 'C', -1, -1 / 2, -3 / 4)]);
    tools(hm, hl);
    // PAD (Danny 19:58 AWST 27 Oct, Claude chat: the electro pad as a stab, a pluck or a gated pad? 'All'): the shapes are switches, any set
    // layers (as the transitions); auto lets the energy pick, random draws one or two per track. The faders move every shape in rungs from
    // its own; gate rate in powers of two (1/32 .. 1/4), gate open the share of each chop (a threshold).
    var pd = strip(host, 'pad', 'Pad', "electro's Juno pad · steps are rungs from each shape's own", ['pad']);
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
    var me = strip(host, 'melody', 'Melody', 'motif memory · call and response', ['lead', 'answer']);
    var ml = bank(me, [dial('recall', 'recall', 'C', 0, 1, IPH, function (v) { return Math.round(v * 100) + '%'; }), dial('mRh', 'own rhythm', 'C', 0, 1, IPH * IPH, function (v) { return Math.round(v * 100) + '%'; }), dial('resp', 'answer', 'C', 0, 1, IPH, function (v) { return Math.round(v * 100) + '%'; }),
      { id: 'dial.belS', name: 'bells', k: 'C', L: [0, P(-3), P(-2), IPH, 1], def: IPH, note: 'how many phrases a bell plays, as lead or answer', lab: function (v) { return v === 0 ? 'none' : Math.round(v * 100) + '% of phrases'; }, get: function () { return D.dial('belS'); }, set: function (v) { D.dial('belS', v); } },
      { id: 'dial.lN', name: 'lead voices', k: 'N', L: [1, 2, 3], def: 3, note: 'how many instruments a track hands the lead between: its own in the middle, another at the peaks, the softest in breakdowns', lab: function (v) { return ['', 'one', 'a pair', 'pair or trio'][v] || String(v); }, get: function () { return D.dial('lN'); }, set: function (v) { D.dial('lN', v); } },
      { id: 'dial.soloP', name: 'solo chance', k: 'C', L: [0, P(-3), P(-2), IPH, 1], def: IPH, note: 'the share of tracks that take a solo at a long peak (electro: rare, about 1 in 8 at the default; full = always)', lab: function (v) { return v === 0 ? 'never' : Math.round(v * 100) + '% of tracks'; }, get: function () { return D.dial('soloP'); }, set: function (v) { D.dial('soloP', v); } },
      { id: 'dial.soloA', name: 'solo climb', k: 'C', L: [0, P(-3), P(-2), IPH, 1], def: IPH, note: 'how far a solo climbs: notes per bar, register, leaps', lab: function (v) { return v === 0 ? 'off' : Math.round(v * 100) + '%'; }, get: function () { return D.dial('soloA'); }, set: function (v) { D.dial('soloA', v); } },
      { id: 'dial.soloL', name: 'solo after', k: 'V', L: [1, 2, 3, 5], def: 2, note: 'the shortest peak section that gets a solo', lab: function (v) { return v + (v === 1 ? ' phrase' : ' phrases'); }, get: function () { return D.dial('soloL'); }, set: function (v) { D.dial('soloL', v); } },
      { id: 'dial.mDr', name: 'drift', k: 'N', L: [0, 1, 2, 3, 5, 8], def: 3, note: 'how many notes of the motif drift away before it comes home', lab: function (v) { return v === 0 ? 'off' : 'up to ' + v + (v === 1 ? ' note' : ' notes'); }, get: function () { return D.dial('mDr'); }, set: function (v) { D.dial('mDr', v); } },
      { id: 'dial.mDrT', name: 'drift time', k: 'R', L: [3, 5, 8, 13], def: 8, note: 'phrases to drift out and come back home', lab: function (v) { return v + ' phrases'; }, get: function () { return D.dial('mDrT'); }, set: function (v) { D.dial('mDrT', v); } },
      { id: 'dial.mBl', name: 'build', k: 'C', L: [0, P(-3), P(-2), IPH, 1], def: IPH, note: 'how much the lead starts as a hook and fills in with the energy', lab: function (v) { return v === 0 ? 'off' : Math.round(v * 100) + '%'; }, get: function () { return D.dial('mBl'); }, set: function (v) { D.dial('mBl', v); } },
      { id: 'dial.mBp', name: 'build pace', k: 'R', L: [1, 2, 3, 5], def: 2, note: 'phrases for the lead to fill in from its first entry', lab: function (v) { return v + (v === 1 ? ' phrase' : ' phrases'); }, get: function () { return D.dial('mBp'); }, set: function (v) { D.dial('mBp', v); } }]);   // THE MELODY (Danny 12:53 AWST 28 Oct 'lock them in')
    var LDL = E('div', 'dk-hint dk-txl'); me.appendChild(LDL); LDLF = function () { var l = D.live && D.live(), x = l && l.lead, t = '';   // what the lead is doing on this track
      if (x) { var nm = function (k) { return x.names[x.all.indexOf(k)] || k; }; t = 'lead: ' + nm(x.mid) + (x.peak !== x.mid ? ', then ' + nm(x.peak) + ' at the peaks' : '') + (x.bd !== x.mid ? ', ' + nm(x.bd) + ' in breakdowns' : '') + (x.solo ? ' · solos at long peaks' : '') + (x.nowName ? ' — now ' + x.nowName + (x.sk > 0 ? ', soloing ' + Math.round(x.sk * 100) + '%' : '') : ''); }
      if (LDL.textContent !== t) LDL.textContent = t; LDL.hidden = !t; };   // own rhythm: Danny 20:15 'Dial for now'; bells: Danny 10:10 'more sparsely'
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
    // MASTER BUS (Danny 22:06 AWST 27 Oct: 'it's really really missing Master bus compression' ... 'and distortion the same way' ...
    // 'however it goes, I'll work with it'); TEMPLATES (08:02-08:10 AWST 28 Oct: 'the way all the effects are wired will change with
    // each pallet' ... 'I approve that draft go with that'): a template row (auto follows the style's palette; none is a dry reference),
    // a model row (the template's, off, or one forced), then faders in rungs from the template: squeeze (how hard the loudest moments
    // are pushed; the threshold finds it), ratio, attack, release, knee, mix, energy follow; saturation (off, the template's, heavier),
    // even harmonics. The squeeze meter is the compressor's gain reduction (its control voltage, the circuit's own state).
    var mbs = strip(host, 'master', 'Master bus', 'templates · compressor · saturation · buses');
    var bp = function () { var b = D.bus && D.bus(); return b && b.p || {}; };
    var tpw = E('div', 'dk-sws'), TPN = [['auto', 0], ['none', -1]].concat((D.templates || []).map(function (n, i) { return [n, i + 1]; }));
    TPN.forEach(function (x) { tpw.appendChild(sw(x[0], function () { return (D.dial('tpM') | 0) === x[1]; }, function () { D.dial('tpM', x[1]); log('dial.tpM', x[1]); tpw.querySelectorAll('.dk-sw').forEach(function (q) { q._sync(); }); setTimeout(paintAll, 60); })); });
    mbs.appendChild(E('div', 'dk-sub', 'template')); mbs.appendChild(tpw);
    var MBN = [['template', 0], ['off', -1], ['VCA', 1], ['FET', 2], ['opto', 3], ['vari-mu', 4]], mbw = E('div', 'dk-sws');
    MBN.forEach(function (x) { mbw.appendChild(sw(x[0], function () { return (D.dial('mbM') | 0) === x[1]; }, function () { D.dial('mbM', x[1]); log('dial.mbM', x[1]); mbw.querySelectorAll('.dk-sw').forEach(function (q) { q._sync(); }); setTimeout(paintAll, 60); })); });
    mbs.appendChild(E('div', 'dk-sub', 'compressor · SSL-, 1176-, LA-2A-, Fairchild-style')); mbs.appendChild(mbw);
    var MBL = E('div', 'dk-hint dk-txl'); mbs.appendChild(MBL);
    var mbAv = 0; MBLF = function () { var b = D.bus && D.bus(), P = b && b.p || {}; if (b && b.on) mbAv += ((+b.av || 0) - mbAv) * IPH;   // phi: the average settles over a few beats
      var t = !b || !b.on ? 'loading…' : !P.model ? (P.tpl ? 'off' : 'no template: dry') : P.model + (P.own ? ' from the ' + P.tpl + ' template' : ' (forced) on ' + P.tpl) + ' · the hits ' + (+b.hit || 0).toFixed(1) + ' dB (aiming ' + (+P.target || 0).toFixed(1) + '), ' + (-mbAv).toFixed(1) + ' dB on average' + (P.sat ? ' · ' + P.sat + ' bends +' + (+P.over).toFixed(1) + ' dB' : '');
      if (MBL.textContent !== t) MBL.textContent = t; };
    var pct = function (v) { return Math.round(v * 100) + '%'; }, rr = function (k, unit, dp) { return function (v) { var B = bp().base; return B && isFinite(B[k]) ? (B[k] * Math.pow(PHI, v)).toFixed(dp) + unit : (Math.abs(v) < 1e-9 ? 'own' : (v > 0 ? '+' : '') + num(v)); }; };
    var mfl = bank(mbs, [Object.assign(dial('mbT', 'squeeze', 'R', -3, 3, 0, function (v) { var P = bp(), T = P.target && D.dial('mbT') != null ? P.target / Math.pow(PHI, D.dial('mbT')) : null; return T ? (T * Math.pow(PHI, v)).toFixed(1) + ' dB' : (Math.abs(v) < 1e-9 ? 'template' : (v > 0 ? '+' : '') + num(v)); }), { live: function () { var b = D.bus && D.bus(); return b && b.on && b.p && b.p.model ? clamp(-b.gr / Math.pow(PHI, 4), 0, 1) : null; } }),
      dial('mbR', 'ratio', 'R', -2, 3, 0, function (v) { var B = bp().base; return B ? Math.max(1, B.q * Math.pow(PHI, v)).toFixed(1) + ':1' : num(v); }), dial('mbA', 'attack', 'R', -3, 3, 0, rr('a', ' ms', 1)), dial('mbRl', 'release', 'R', -3, 3, 0, rr('r', ' ms', 0)), dial('mbK', 'knee', 'R', -3, 3, 0, rr('k', ' dB', 1)),
      { id: 'dial.mbX', name: 'mix', k: 'C', L: [0, Math.pow(IPH, 3), IPH * IPH, IPH, 1 - Math.pow(IPH, 3), 1], def: 1, lab: pct, get: function () { return D.dial('mbX'); }, set: function (v) { D.dial('mbX', v); } },
      { id: 'dial.mbE', name: 'energy follow', k: 'C', L: CPL, def: IPH, lab: cplLab, get: function () { return D.dial('mbE'); }, set: function (v) { D.dial('mbE', v); } }]);
    tools(mbs, mfl);
    mbs.appendChild(E('div', 'dk-sub', 'saturation'));
    var sfl = bank(mbs, [{ id: 'dial.mbS', name: 'saturate', k: 'V', L: [-1, 0, 1, 2, 3, 4], def: 0, lab: function (v) { var P = bp(); return v < 0 ? 'off' : v === 0 ? (P.sat ? 'template' : 'template: none') : 'heavier ' + v; }, get: function () { return D.dial('mbS'); }, set: function (v) { D.dial('mbS', v); } },
      { id: 'dial.mbH', name: 'even harmonics', k: 'C', L: [0, Math.pow(IPH, 4), Math.pow(IPH, 3), IPH * IPH], def: 0, lab: pct, get: function () { return D.dial('mbH'); }, set: function (v) { D.dial('mbH', v); } }]);
    tools(mbs, sfl);
    // FOUR BUSES (Danny 09:09 AWST 28 Oct 'All'; the draft's step 2): drums, bass, music (stabs, arp, pad) and front (lead, answer, voice),
    // each squeezed toward its template's reduction in rungs; smash = the drums' parallel copy, crushed and blended in; bus drive = the
    // saturation before each bus compressor. The meter beside each knob is that bus's gain reduction (the circuit's own state).
    var bb = function () { var b = D.bus && D.bus(); return b && b.buses || null; };
    var bsw = E('div', 'dk-sws'); [['template', 0], ['off', -1]].forEach(function (x) { bsw.appendChild(sw(x[0], function () { return (D.dial('bsM') | 0) === x[1]; }, function () { D.dial('bsM', x[1]); log('dial.bsM', x[1]); bsw.querySelectorAll('.dk-sw').forEach(function (q) { q._sync(); }); setTimeout(paintAll, 60); })); });
    mbs.appendChild(E('div', 'dk-sub', 'buses · drums, bass, music, front')); mbs.appendChild(bsw);
    var BXL = E('div', 'dk-hint dk-txl'); mbs.appendChild(BXL);
    BXLF = function () { var x = bb(), N = ['drums', 'bass', 'music', 'front'], t = !x ? 'loading…' : !x.p ? '' : x.p.off || !x.p.tpl ? 'off: the buses pass straight through' : N.map(function (n, i) { var q = x.p.b[i]; return q.model ? n + ' ' + (x.r ? (+x.r.hit[i] || 0).toFixed(1) : '0.0') + ' of ' + q.tgt.toFixed(1) + ' dB' : n + ' straight'; }).join(' · ') + (x.p.par.mix > 0 ? ' · smash ' + (x.r ? (+x.r.phit || 0).toFixed(1) : '0.0') + ' dB at ' + Math.round(x.p.par.mix * 100) + '%' : '');
      if (BXL.textContent !== t) BXL.textContent = t; };
    var bgr = function (i) { return function () { var x = bb(), on = x && x.r && x.p && !x.p.off && (i < 0 ? x.p.par.mix > 0 : x.p.b[i].model); return on ? clamp(-(i < 0 ? x.r.pgr : x.r.gr[i]) / Math.pow(PHI, 4), 0, 1) : null; }; };
    var bsq = function (k, name, i, note) { return Object.assign(dial(k, name, 'R', -3, 3, 0, function (v) { var x = bb(), q = x && x.p && x.p.b[i]; return q && q.model ? (q.tgt / Math.pow(PHI, D.dial(k)) * Math.pow(PHI, v)).toFixed(1) + ' dB' : (Math.abs(v) < 1e-9 ? 'template' : (v > 0 ? '+' : '') + num(v)); }), { note: note, live: bgr(i) }); };
    var bfl = bank(mbs, [bsq('bsD', 'drums', 0, 'how hard the drum bus is squeezed'),
      { id: 'dial.bsP', name: 'smash', k: 'C', L: [-5, -2, -1, 0, 1, 2], def: 0, note: "the drums' parallel copy, crushed and blended in", live: bgr(-1), get: function () { return D.dial('bsP'); }, set: function (v) { D.dial('bsP', v); },
        lab: function (v) { if (v <= -5) return 'off'; var x = bb(), m = x && x.p && x.p.par, cur = D.dial('bsP'); return m && m.mix > 0 && cur > -5 ? Math.round(Math.min(1, m.mix / Math.pow(PHI, cur) * Math.pow(PHI, v)) * 100) + '%' : (v ? (v > 0 ? '+' : '') + v : 'template'); } },
      bsq('bsB', 'bass', 1, 'how hard the bass bus is squeezed'), bsq('bsU', 'music', 2, 'stabs, arp and pad together'), bsq('bsF', 'front', 3, 'lead, answer and voice together'),
      { id: 'dial.bsS', name: 'bus drive', k: 'V', L: [-1, 0, 1, 2, 3], def: 0, note: 'saturation before each bus compressor', lab: function (v) { return v < 0 ? 'off' : v === 0 ? 'template' : 'heavier ' + v; }, get: function () { return D.dial('bsS'); }, set: function (v) { D.dial('bsS', v); } },
      // KICK DUCK (Danny 10:05 AWST 28 Oct 'Yes'): how hard each kick ducks the bass, pad and chords; template = the palette's (electro none)
      { id: 'dial.kdC', name: 'kick duck', k: 'C', L: [-1, 0, P(-3), P(-2), IPH, 1], def: -1, note: 'each kick dips the bass, pad and chords', lab: function (v) { return v < 0 ? 'template' : v === 0 ? 'off' : 'up to ' + (v * 2 * 20 * Math.log10(PHI)).toFixed(1) + ' dB'; }, get: function () { return D.dial('kdC'); }, set: function (v) { D.dial('kdC', v); } }]);
    tools(mbs, bfl);
    // VOICE
    var vo = strip(host, 'voice', 'Voice', null, ['voice']);
    // VOICE PER TRACK (Danny 09:59 AWST 28 Oct: 'it's either in a track or it's not ... we should have them all on the menu'): auto = each
    // track draws a voice or none (the chance knob), and a voiced track the flavour of its middle; the buttons force one for every track.
    var vrow = function (k, list) { var w = E('div', 'dk-sws'); list.forEach(function (x) { w.appendChild(sw(x[0], function () { return (D.dial(k) | 0) === x[1]; }, function () { D.dial(k, x[1]); log('dial.' + k, x[1]); w.querySelectorAll('.dk-sw').forEach(function (q) { q._sync(); }); })); }); return w; };
    vo.appendChild(E('div', 'dk-sub', 'voice · auto: a track has a voice or not; choir in breakdowns, the machine (electro) or singer at the peaks'));
    vo.appendChild(vrow('voM', [['auto', 0], ['off', -1], ['singer', 1], ['machine', 2], ['choir', 3]]));
    vo.appendChild(E('div', 'dk-sub', 'the middle · events: rest, a tease before each change · talker · choir bed'));
    vo.appendChild(vrow('voF', [['auto', 0], ['events', 1], ['talker', 2], ['choir bed', 3]]));
    var VPL = E('div', 'dk-hint dk-txl'); vo.appendChild(VPL);
    VPLF = function () { var V = window.DadAutoDJ && DadAutoDJ.voice, P = V && V.plan && V.plan(), t = !P ? 'the voice loads after the first sound' : !P.on ? 'this track: no voice (' + Math.round(P.chance * 100) + '% of ' + ((D.live() || {}).genre || 'its') + ' tracks have one)' : 'this track: ' + (P.force ? P.force + ' (forced)' : P.ch + ' voice, ' + P.flavName) + ' · now: ' + (P.role === 'none' ? 'resting' : P.role === 'lead' ? P.ch : 'choir');
      if (VPL.textContent !== t) VPL.textContent = t; };
    var vpk = bank(vo, [{ id: 'dial.voP', name: 'voice tracks', k: 'C', L: [-9, -2, -1, 0, 1, 2, 9], def: 0, note: 'how many tracks have a voice, in rungs from the style\u2019s', lab: function (v) { return v <= -9 ? 'never' : v >= 9 ? 'always' : v === 0 ? 'style' : (v > 0 ? '+' : '') + v + (Math.abs(v) === 1 ? ' rung' : ' rungs'); }, get: function () { return D.dial('voP'); }, set: function (v) { D.dial('voP', v); } }]);
    var vd = function (k, name, kind, lo, hi, def) { return { id: 'voice.' + k, name: name, k: kind, L: gl(lo, hi, def), def: def, lab: function (v) { return Math.abs(v - def) < 1e-9 ? 'mid' : num(v); }, get: function () { var V = d && d.voice; return V && V.dial ? V.dial(k) : null; }, set: function (v) { var V = d && d.voice; if (V && V.dial) { V.dial(k, v); var R = root.RhythmContinuity; if (R && R.save) try { R.save(); } catch (e) {} } } }; };
    var vl = bank(vo, [vd('floor', 'floor', 'V', P(-4), P(-2), P(-3)), vd('club', 'club', 'C', 1, PHI * PHI, PHI), vd('tc', 'timing', 'R', 1 / 3, 2 / 3, 1 / 2), vd('nw', 'width', 'C', 0, IPH, IPH / 2), vd('soar', 'soar', 'R', IPH, PHI, 1), vd('vib', 'vibrato', 'R', IPH, PHI, 1)]);
    tools(vo, vpk.concat(vl));
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
    // MY MOVES (Danny 09:44 AWST 28 Oct: 'I need you to look out for me, what settings I had last night ... make that the default volumes
    // for electro'): the desk's history of moves lives only on this phone; this hands the last three days of it, and the settings now, to
    // the share sheet (or copies them) so they can be pasted to Claude.
    sy.appendChild(E('div', 'dk-sub', 'my moves')); var shr = E('div', 'dk-sws'), SHL = 'share my moves';
    var shb = sw(SHL, function () { return false; }, function () { var since = Date.now() - 3 * 24 * 3600 * 1000, t = JSON.stringify({ at: new Date().toISOString(), pick: D.pick, mx: D.mx, dial: D.dials || null, moves: ld(KH, []).filter(function (x) { return x[0] >= since; }) });
      var done = function (m) { shb.textContent = m; setTimeout(function () { shb.textContent = SHL; }, 2600); }, copy = function () { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { done('copied: paste it to Claude'); }, function () { done('could not copy'); }); else done('could not copy'); };
      if (navigator.share) navigator.share({ title: "Ed's DJ moves", text: t }).then(function () { done('shared'); }, copy); else copy(); });
    shr.appendChild(shb);
    // SOUND LOG (Danny 14:15 AWST 28 Oct, Claude chat: 'The Audio is dropping out ... sometimes that stops ... at some point it times out I think
    // the website reloads'): js/rhythm-continuity.js logs every interruption, every resume try and every reload by the phone on this phone only;
    // this hands that log (and the state now) to the share sheet so it can be pasted to Claude.
    var SLL = 'share sound log', slb = sw(SLL, function () { return false; }, function () { var A = window.RhythmContinuity && RhythmContinuity.audio, hb = null; try { hb = JSON.parse(localStorage.getItem('dadRhythm.heartbeat.v1') || 'null'); } catch (e) {}
      var t = JSON.stringify({ at: new Date().toISOString(), ua: navigator.userAgent, now: A ? A.info() : null, heartbeat: hb, log: A ? A.log() : [] }, null, 1);
      var done = function (m) { slb.textContent = m; setTimeout(function () { slb.textContent = SLL; }, 2600); }, copy = function () { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { done('copied: paste it to Claude'); }, function () { done('could not copy'); }); else done('could not copy'); };
      if (navigator.share) navigator.share({ title: "Ed's DJ sound log", text: t }).then(function () { done('shared'); }, copy); else copy(); });
    shr.appendChild(slb); sy.appendChild(shr);
    // LOAD GUARD (Danny 19:01 AWST 28 Oct: cutting out on the phone after the tempo update): when the phone struggles (late notes, skips, the audio
    // clock falling behind) the engine holds back stacked layers rather than cut out; this sets how far it may go, and the line says what it is doing.
    sy.appendChild(E('div', 'dk-sub', 'load guard'));
    bank(sy, [{ id: 'dial.ldG', name: 'load guard', k: 'N', L: [0, 1, 2], def: 2, note: 'when the phone struggles, hold back layers instead of cutting out: 1 the stacked units (Jupiter, 808), 2 also the house kit, pad under and ghost snares', lab: function (v) { return ['off', 'stacks', 'stacks + extras'][v] || String(v); }, get: function () { return D.dial('ldG'); }, set: function (v) { D.dial('ldG', v); } }]);
    var LGL = E('div', 'dk-hint dk-txl'); sy.appendChild(LGL); LGLF = function () { var K = window.DadAutoDJ && DadAutoDJ._kit, h = K && K.health ? K.health() : null, t = !h ? '' : (h.guard ? 'holding back layers (level ' + h.guard + ')' : 'all layers playing') + ' \u00B7 audio clock \u00D7' + h.ratio.toFixed(3) + ' \u00B7 look-ahead ' + h.lookAhead.toFixed(2) + ' s'; if (LGL.textContent !== t) LGL.textContent = t; LGL.hidden = !t; };
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
  var TXL = null, BSLF = null, MBLF = null, FMLF = null, BXLF = null, VPLF = null, LDLF = null, TPLF = null, LGLF = null;
  function txLast() { if (!TXL) return; var d = DJ(), F = d && d.fx, lt = F && F.lastTransition, t = lt ? 'last change: ' + lt.style : ''; if (TXL.textContent !== t) TXL.textContent = t; TXL.hidden = !t; }   // which set the last change played
  function paintAll() { FD.forEach(function (o) { try { o.paint(); } catch (e) {} }); }
  function meters() { FD.forEach(function (o) { try { if (o.meter) o.meter(); } catch (e) {} }); var D = DK(); if (readEl && D) { var l = D.live(); readEl.textContent = (D.read || 'Ed’s DJ is off') + (l ? ' · phrase ' + l.phrase + ' of 4' : ''); } }
  // CHANNEL METERS (Danny 18:47 AWST 27 Oct: 'We don't want it actually measuring the sound volume ... the energy in the circuit ... mapped
  // from our parameters'): each channel's capacitor voltage from js/dad-autodj-quiz.js (chMeter: every note a charge pulse of the level the
  // engine set x the layer's arc gain x the crossfade, discharging over PHI^-1 of a beat). No audio is measured. Read every PHI^-5 s while
  // the Sound tab is open, transform only.
  var MSTEP = Math.pow(PHI, -5);                                          // phi: read every PHI^-5 s (~90 ms)
  function fast() { clearTimeout(fT); if (!isOpen() || UI.tab !== 'sound') return; var D = DK();
    if (D && D.meter) MIX.forEach(function (m) { m.v = clamp(D.meter(m.ch), 0, 1); vuSet(m.vu, [m.v, m.v], MSTEP); });   // mono channels: both sides together
    KV.forEach(function (k) { if (!k.vu.el.isConnected || k.vu.el.offsetParent === null) return; var x = null; try { x = k.f.live(); } catch (e) {} k.vu.el.style.visibility = x == null || !isFinite(x) ? 'hidden' : ''; if (x == null || !isFinite(x)) return; x = clamp(x, 0, 1); vuSet(k.vu, [x, x], MSTEP); k.lb.style.transform = 'scaleX(' + x.toFixed(3) + ')'; });
    fT = setTimeout(fast, MSTEP * MS); }
  var fT = 0;
  function tick() { clearTimeout(mT); if (!isOpen()) return; meters(); var D = DK(), l = D && D.live(); txLast(); if (BSLF) try { BSLF(); } catch (e) {} if (MBLF) try { MBLF(); } catch (e) {} if (BXLF) try { BXLF(); } catch (e) {} if (VPLF) try { VPLF(); } catch (e) {} if (LDLF) try { LDLF(); } catch (e) {} if (TPLF) try { TPLF(); } catch (e) {} if (LGLF) try { LGLF(); } catch (e) {} if (FMLF) try { FMLF(); } catch (e) {} mT = setTimeout(tick, (l && l.bpm > 0 ? SPM / l.bpm : 1) * MS); }   // once a beat (DeepSeek check Danny relayed 18:16: a bar is too slow to read)
  function show(t) { UI.tab = t; sv(KUI, UI); Object.keys(tabs).forEach(function (k) { tabs[k].b.setAttribute('aria-selected', k === t ? 'true' : 'false'); tabs[k].p.hidden = k !== t; });
    if (t === 'visual' && !tabs.visual.p.childNodes.length) visualPage(tabs.visual.p); paintAll(); meters(); fast(); }
  function build() {
    if (el) return; var main = doc.getElementById('home-main'); if (!main) return;
    if (!doc.querySelector('link[data-desk]')) { var l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = CSS; l.setAttribute('data-desk', '1'); doc.head.appendChild(l); }
    if (!doc.querySelector('link[data-desk-font]')) { var lf = doc.createElement('link'); lf.rel = 'stylesheet'; lf.href = 'https://fonts.googleapis.com/css2?family=VT323&display=swap'; lf.setAttribute('data-desk-font', '1'); doc.head.appendChild(lf); }   // the knobs' OLED face (VT323, SIL Open Font License, Peter Hull), only with the desk; a monospace stands in until it lands
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
    var lastT = 0, lastX = 0, lastY = 0, foldT = 0;
    el.addEventListener('click', function (e) { var t = e.target; if (t && t.closest && t.closest('button,.dk-trk,.dk-sw,a,input')) { lastT = 0; return; }
      var now = performance.now(), near2 = Math.abs(e.clientX - lastX) < 40 && Math.abs(e.clientY - lastY) < 40;   // unit: px of slop between the two taps
      if (lastT && now - lastT < IPH * MS && near2) { lastT = 0; clearTimeout(foldT); full(!de.hasAttribute('data-desk-full')); log('fullscreen', de.hasAttribute('data-desk-full') ? 1 : 0); return; }
      lastT = now; lastX = e.clientX; lastY = e.clientY;
      // TAP TO FOLD (Danny 21:01 AWST 27 Oct: 'press anywhere in the background of the menu that I'm in and it shrinks down'): one tap on
      // an open strip's background (not a fader, button or switch) folds it, once the double-tap window (PHI^-1 s) has passed with no
      // second tap; two taps still mean full screen.
      var sx = t && t.closest && t.closest('.dk-s'); clearTimeout(foldT);
      if (sx && !sx.classList.contains('is-folded') && t.closest('.dk-sb') && !t.closest('.dk-f,.dk-ch')) foldT = setTimeout(function () { var hb = sx.querySelector('.dk-sh'); if (hb && !sx.classList.contains('is-folded')) { hb.click(); log('fold.tap', sx.getAttribute('data-strip')); } }, IPH * MS); });
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
