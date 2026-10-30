/* dj-vu-panel.js: Ed's desk as UP / DOWN buttons and two classic VU meters (Danny t299u, 30 Oct 2026: 'make it up and down button with the
   UV meter on the left and similar UV meter on the right ... the indicator on the right ... on the left is the energy ... classic UV meter
   styles ... a button next to ... the VU meter on the left where I can press it and I can get the info and it opens in a window ... the same
   every panel in the menu and with the mixer ... I press in it and it opens another window where all the drums are'; t301u: the same
   drill-down for every group, the top level only what is playing, a back button at each level; t328u 14:31 AWST: 'get the VE panels and get
   all that finished and pushed live'). Harness rule 23: up / down buttons, two VU meters, an info button, drill-down, compact rows, no dials.
   LIVE: this is the desk's visible face. The inline stub in index.html owns window.DjDesk before any tap and loads this file on the first
   tap, so js/dj-desk.js (MIDI Bot's, audio-owned) never builds its dial face; it is still loaded, out of sight, only for its registry.
   It talks to the engine only through its public handles: DadAutoDJ.params() / set() / mixer() / setLevel() / paramsReady() (MIDI Bot,
   deskapi1), and for the switches the dial face had but the registry does not carry (style, form, shapes, templates, mute / solo) the
   same DadAutoDJ.desk calls the dial face makes (pick / setPick / dial / mute / solo / boxSet) and AnimTiles.desk for the visual mutes.
   It plays, resumes and unlocks nothing (harness rule 25: sound belongs to the engine).
   Every row: [info] [energy VU] [name + value] [setting VU] [up / down] (+ [M / S] in the mixers). One tap = one notch (no hold).
   Meters: one requestAnimationFrame loop, only while the desk is open, the page visible, and only for rows on screen. */
(function (root, doc) {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2, IPH = 1 / PHI, MS = 1e3;
  var SEG = 13;                       // phi: a Fibonacci count of segments: 8 green, 3 amber, 2 red (Fibonacci split, classic green-amber-red ladder)
  var TAU = 0.3;                      // cite: VU ballistics, 300 ms integration time (IEC 60268-17 / ANSI C16.5 standard volume indicator)
  var HOLD = PHI;                     // phi rules 8: the peak holds PHI^1 s, then drops
  var REPAINT = PHI;                  // phi: values, playing and greyed states re-read every PHI^1 s while open
  var WAITP = Math.pow(PHI, -1);      // phi: while the DJ engine is still loading, look again every PHI^-1 s
  var CSS = 'css/dj-vu-panel.css?v=vupanels1', KH = 'dadDesk.hist.v1', HMAX = 1597;   // the dial face's own move history (js/dj-desk.js KH, HMAX)
  var de = doc.documentElement;
  function api() { var d = root.DadAutoDJ; return d && typeof d.params === 'function' && typeof d.mixer === 'function' ? d : null; }
  function DK() { var d = api(); return d && d.desk; }
  function E(tag, cls, txt) { var n = doc.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function B(cls, txt, aria) { var b = E('button', cls, txt); b.type = 'button'; if (aria) b.setAttribute('aria-label', aria); return b; }
  function near(L, v) { var b = 0; for (var i = 1; i < L.length; i++) if (Math.abs(L[i] - v) < Math.abs(L[b] - v)) b = i; return b; }
  function log(id, v) { try { var h = JSON.parse(localStorage.getItem(KH) || '[]') || []; h.push([Date.now(), id, typeof v === 'number' ? +v.toFixed(4) : v]); if (h.length > HMAX) h.splice(0, h.length - HMAX); localStorage.setItem(KH, JSON.stringify(h)); } catch (e) {} }
  function dial(k, v) { var D = DK(); if (!D || !D.dial) return 0; if (arguments.length > 1) { D.dial(k, v); log('dial.' + k, v); return v; } return D.dial(k) | 0; }
  function trackE() { var D = DK(); return D && D.trackE ? D.trackE() : 0; }
  function chE(ch) { return function () { var D = DK(); return D && D.energy ? D.energy(ch) : 0; }; }

  // ---------- the classic VU ladder ----------
  function vu(kind) { var w = E('div', 'vp-vu vp-vu-' + kind), s = []; w.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < SEG; i++) { var g = E('i', i >= SEG - 2 ? 'r' : i >= SEG - 5 ? 'a' : 'g'); w.appendChild(g); s.push(g); }
    return { el: w, s: s, lit: -1, pk: -1, y: 0, peak: 0, hold: 0 }; }
  function vuLit(m, n, pk) { n = Math.max(0, Math.min(SEG, n)); if (n !== m.lit) { for (var i = 0; i < SEG; i++) m.s[i].classList.toggle('on', i < n); m.lit = n; }
    if (pk != null && pk !== m.pk) { if (m.pk >= 0 && m.s[m.pk]) m.s[m.pk].classList.remove('pk'); if (pk >= 0 && m.s[pk]) m.s[pk].classList.add('pk'); m.pk = pk; } }
  function vuHome(m, i) { m.s.forEach(function (g, j) { g.classList.toggle('home', j === i); }); }

  // ---------- mute / solo switches ----------
  function msw(lab, on, flip, aria) { var b = B('vp-ms vp-ms-' + lab.toLowerCase(), lab, aria);
    b._sync = function () { var v = false; try { v = !!on(); } catch (e) {} b.setAttribute('aria-pressed', v ? 'true' : 'false'); return v; };
    b.addEventListener('click', function () { try { flip(); } catch (e) {} paintAll(); }); b._sync(); return b; }

  // ---------- one row ----------
  var ROWS = [], io = null;
  function row(o) {   // o: { label, steps, labels, def, get(), set(v), energy(), info() -> [title, lines], drill | null, disabled(), ms: [M, S] | null, out() }
    var r = E('div', 'vp-row'), inf = B('vp-i', 'i', 'About ' + o.label), L = vu('e'), mid = o.drill ? B('vp-mid vp-dr') : E('div', 'vp-mid'), R = vu('s'), ud = E('div', 'vp-ud');
    var nm = E('span', 'vp-nm', o.label), val = E('span', 'vp-val'), up = B('vp-up', '▲', o.label + ' up a step'), dn = B('vp-dn', '▼', o.label + ' down a step');
    mid.appendChild(nm); mid.appendChild(val); if (o.drill) { mid.appendChild(E('span', 'vp-chev', '›')); mid.setAttribute('aria-label', 'Open ' + o.label); mid.addEventListener('click', o.drill); }
    ud.appendChild(up); ud.appendChild(dn); r.appendChild(inf); r.appendChild(L.el); r.appendChild(mid); r.appendChild(R.el); r.appendChild(ud);
    var ms = null; if (o.ms) { ms = E('div', 'vp-msw'); o.ms.forEach(function (b) { if (b) ms.appendChild(b); else ms.appendChild(E('span', 'vp-ms vp-ms-no')); }); r.appendChild(ms); }
    var n = o.steps.length; if (n < 2) r.classList.add('is-fixed');   // a single step: shown, read, never stepped
    if (o.def != null && n > 1) vuHome(R, Math.max(0, Math.round(near(o.steps, o.def) / (n - 1) * SEG) - 1));
    function dis() { var g = ''; try { g = o.disabled ? o.disabled() : ''; } catch (e) {} return g || ''; }
    function paint() { var v = null; try { v = o.get(); } catch (e) {} var i = v == null ? -1 : near(o.steps, v), g = dis();
      val.textContent = i < 0 ? '–' : o.labels[i]; vuLit(R, n > 1 && i >= 0 ? Math.round(i / (n - 1) * SEG) : 0, null);
      up.disabled = !!g || i < 0 || i >= n - 1; dn.disabled = !!g || i <= 0; r.classList.toggle('is-off', !!g); r.setAttribute('data-i', i);
      var out = false; try { out = !!(o.out && o.out()); } catch (e) {} r.classList.toggle('is-out', out);
      if (ms) ms.querySelectorAll('button').forEach(function (b) { b._sync(); }); }
    function step(d) { var i = near(o.steps, o.get()) + d; if (dis() || i < 0 || i >= n) return; o.set(o.steps[i]); paint(); }
    up.addEventListener('click', function () { step(1); }); dn.addEventListener('click', function () { step(-1); });
    inf.addEventListener('click', function () { var x = o.info(); var g = dis(); if (g) x[1].unshift('Waiting: ' + g); info(x[0], x[1]); });
    paint(); var rec = { el: r, m: L, energy: o.energy || function () { return 0; }, on: false, paint: paint }; ROWS.push(rec); r._vp = rec; if (io) io.observe(r);
    return r; }

  // ---------- the switches the registry does not carry (the dial face's rows, the same engine calls) ----------
  function one(label, opts, get, set, en, note) {   // opts: [[name, value]]; one of them
    var V = opts.map(function (_, i) { return i; });
    return row({ label: label, steps: V, labels: opts.map(function (x) { return x[0]; }), def: 0, energy: en,
      get: function () { var v = get(); for (var i = 0; i < opts.length; i++) if (opts[i][1] === v) return i; return null; },
      set: function (i) { set(opts[i][1]); },
      info: function () { return [label, [note || '', opts.length + ' choices: ' + opts.map(function (x) { return x[0]; }).join(' · ')]]; } }); }
  function any(name, on, flip, en, note) {   // one switch of a 'pick any set' group: off / on
    return row({ label: name, steps: [0, 1], labels: ['off', 'on'], def: null, energy: en, get: function () { return on() ? 1 : 0; }, set: function () { flip(); },
      info: function () { return [name, [note || '', 'one of a set: any number can be on together']]; } }); }
  function sec(t) { body.appendChild(E('div', 'vp-sec', t)); }
  var BSN = ['octave pump', 'machine 8ths', 'sequence', 'funk', 'kick-lock', 'dark walk', 'gallop', 'approach', 'bounce', 'deep sea', 'cold machine', 'synth-pop', 'stutter'];
  var PMS = [['auto', 0], ['swell', 1], ['stab', 2], ['pluck', 4], ['gate', 8], ['random', -1]];
  var TX = ['auto', 'techno cut', 'trance build', 'echo out', 'scatter roll', 'flanger wash', 'random'];
  var CHOICE = {
    style: function (D) { sec('style'); body.appendChild(one('style', [['auto', 'auto'], ['random', 'random']].concat((D.genres || []).map(function (g) { return [g, g]; })),
        function () { return D.pick || 'auto'; }, function (g) { D.setPick(g === 'auto' ? null : g); log('style', g); }, trackE, 'auto = the pumps choose; random = chance'));
      sec('form'); body.appendChild(one('form', [['emergent', -3], ['written', 0], ['off', -1], ['random', -2]].concat((D.forms || []).map(function (n, i) { return [n, i + 1]; })),
        function () { return dial('fmM'); }, function (v) { dial('fmM', v); }, trackE, 'emergent = the pumps choose the sections; written = the style’s own; off = one arc per track')); },
    changes: function () { sec('harmony + melody faders'); body.appendChild(one('faders land', [['next track', 0], ['now', 1]], function () { return dial('dkNow'); }, function (v) { dial('dkNow', v); }, trackE,
      'now: the music rebuilds as you move them · next track: they wait for it')); },
    bass: function () { var en = chE('bass'); sec('shape · pick any set');
      body.appendChild(any('all shapes', function () { return !(dial('bShp') > 0); }, function () { dial('bShp', 0); }, en, 'every shape in the pool'));
      BSN.forEach(function (nm, j) { body.appendChild(any(nm, function () { var m = dial('bShp'); return m > 0 && !!(m & (1 << j)); }, function () { var m = dial('bShp'); dial('bShp', (m > 0 ? m : 0) ^ (1 << j)); }, en)); }); },
    pad: function () { var en = chE('pad'); sec('shape · pick any set');
      PMS.forEach(function (x) { var b = x[1]; body.appendChild(any(x[0], function () { var m = dial('padM'); return b <= 0 ? m === b : m > 0 && !!(m & b); },
        function () { var m = dial('padM'); dial('padM', b <= 0 ? b : m > 0 ? m ^ b : b); }, en, b <= 0 ? 'stands alone' : null)); }); },
    effects: function () { var d = api(), F = function () { return d && d.fx; }; sec('transition · pick any set');
      var cur = function () { var f = F(), e = f && f.eff && f.eff.trans; return e ? e.i | 0 : 0; };
      TX.forEach(function (lab, i) { var solo = i === 0 || i === TX.length - 1; body.appendChild(any(lab, function () { var h = cur(), f = F(); return solo ? h === i : h > 0 && h < TX.length - 1 && !!f && (f.tset || []).indexOf(i) >= 0; },
        function () { var f = F(); if (f && f.trans) f.trans(i, !solo); else if (f && f.set) f.set('trans', i); log('fx.trans', i); }, trackE, solo ? 'stands alone' : null)); }); },
    master: function (D) { sec('template'); body.appendChild(one('template', [['auto', 0], ['none', -1]].concat((D.templates || []).map(function (n, i) { return [n, i + 1]; })), function () { return dial('tpM'); }, function (v) { dial('tpM', v); }, trackE, 'auto follows the style’s palette; none is a dry reference'));
      body.appendChild(one('model', [['template', 0], ['off', -1], ['VCA', 1], ['FET', 2], ['opto', 3], ['vari-mu', 4]], function () { return dial('mbM'); }, function (v) { dial('mbM', v); }, trackE, 'the compressor: the template’s, off, or one forced'));
      body.appendChild(one('buses', [['template', 0], ['off', -1]], function () { return dial('bsM'); }, function (v) { dial('bsM', v); }, trackE, 'the drum, bass, music and front buses')); },
    voice: function () { var en = chE('voice'); sec('voice');
      body.appendChild(one('voice', [['auto', 0], ['off', -1], ['singer', 1], ['machine', 2], ['choir', 3]], function () { return dial('voM'); }, function (v) { dial('voM', v); }, en, 'auto: a track has a voice or not; choir in breakdowns, the machine or singer at the peaks'));
      body.appendChild(one('the middle', [['auto', 0], ['events', 1], ['talker', 2], ['choir bed', 3]], function () { return dial('voF'); }, function (v) { dial('voF', v); }, en, 'events: rest, a tease before each change · talker · choir bed')); }
  };

  // ---------- the box, its pages, the info window ----------
  var el = null, head = null, body = null, back = null, ttl = null, win = null, stack = [], waitT = 0;
  function css() { if (doc.querySelector('link[data-vp]')) return; var l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = CSS; l.setAttribute('data-vp', '1'); doc.head.appendChild(l); }
  function build() {
    if (el) return; var main = doc.getElementById('home-main'); if (!main) return; css();
    el = E('section', 'vp'); el.id = 'dj-desk'; el.setAttribute('aria-label', 'Ed’s desk'); el.setAttribute('data-guard', 'dj-desk');   // #dj-desk: the engine and the page treat taps here as the desk's own
    head = E('div', 'vp-head'); back = B('vp-back', '‹', 'Back'); ttl = E('h2', 'vp-ttl'); var x = B('vp-x', '×', 'Close the desk');
    back.addEventListener('click', function () { if (stack.length > 1) { stack.pop(); render(); } }); x.addEventListener('click', function () { close(true); });
    head.appendChild(back); head.appendChild(ttl); head.appendChild(x); el.appendChild(head);
    body = E('div', 'vp-body'); el.appendChild(body); main.insertBefore(el, main.firstChild);
    if (root.IntersectionObserver) io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.target._vp) e.target._vp.on = e.isIntersecting; }); }, { root: main });
    doc.addEventListener('keydown', function (e) { if ((e.key === 'Escape' || e.key === 'Esc') && isOpen()) { e.preventDefault(); if (win) shut(); else close(true); } });
    doc.addEventListener('visibilitychange', loop);
    root.addEventListener('dj:params', function () { if (isOpen() && body.getAttribute('data-wait')) render(); });
    stack = [{ t: 'menu' }];
  }
  function clear() { ROWS.forEach(function (r) { if (io) io.unobserve(r.el); }); ROWS = []; body.textContent = ''; body.removeAttribute('data-wait'); body.classList.remove('vp-has-ms'); }
  function waiting(t) { body.setAttribute('data-wait', '1'); body.appendChild(E('div', 'vp-sec', t));
    if (!waitT) waitT = setTimeout(function () { waitT = 0; if (isOpen() && body.getAttribute('data-wait')) render(); }, WAITP * MS); }
  function render() { clear(); var top = stack[stack.length - 1], A = api(); back.hidden = stack.length < 2; shut();
    if (!A) { ttl.textContent = 'Ed’s desk'; waiting('the DJ is still loading'); }
    else if (!(A.params() || []).length) { ttl.textContent = 'Ed’s desk'; waiting('loading the desk'); A.paramsReady(function () { if (isOpen() && body.getAttribute('data-wait')) render(); }); }
    else if (top.t === 'menu') menu(); else if (top.t === 'panel') panel(top.id); else mixer(top.node);
    body.scrollTop = 0; var m = doc.getElementById('home-main'); if (m) m.scrollTop = 0; if (!io) ROWS.forEach(function (r) { r.on = true; }); loop(); }
  function go(o) { stack.push(o); render(); }
  function panels() { var out = [], by = {}; (api().params() || []).forEach(function (p) { var k = p.panel || 'all'; if (!by[k]) { by[k] = { id: k, label: p.panelLabel || k, list: [] }; out.push(by[k]); } by[k].list.push(p); }); return out; }
  function nav(t, fn) { var b = B('vp-nav', null); b.appendChild(E('span', null, t)); b.appendChild(E('span', 'vp-chev', '›')); b.addEventListener('click', fn); body.appendChild(b); }
  function menu() { ttl.textContent = 'Ed’s desk';
    nav('Mixer', function () { go({ t: 'mix', node: null }); });
    panels().forEach(function (P) { nav(P.label, function () { go({ t: 'panel', id: P.id }); }); }); }
  function kindLine(p) { return p.kind ? p.kind + ' · ' + p.kindName : ''; }
  // the visual mixer's mutes (AnimTiles.desk, the same state the dial face wrote)
  function vst() { var A = root.AnimTiles, st = A && A.deskState ? A.deskState() : {}; st.m = st.m || {}; st.s = st.s || {}; st.sp = st.sp || {}; return st; }
  function vput(st) { var A = root.AnimTiles; if (A && A.desk) A.desk(st); }
  function vms(k) { if (!root.AnimTiles || !root.AnimTiles.desk) return null;
    return [msw('M', function () { return !!vst().m[k]; }, function () { var st = vst(); st.m[k] = !st.m[k]; vput(st); log('vmute.' + k, st.m[k] ? 1 : 0); }, 'Mute ' + k),
            msw('S', function () { return !!vst().s[k]; }, function () { var st = vst(); st.s[k] = !st.s[k]; vput(st); log('vsolo.' + k, st.s[k] ? 1 : 0); }, 'Solo ' + k)]; }
  function vout(k) { return function () { var st = vst(), s = Object.keys(st.s).some(function (x) { return st.s[x]; }); return !!st.m[k] || (s && !st.s[k]); }; }
  function panel(id) { var A = api(), D = DK(), P = panels().filter(function (x) { return x.id === id; })[0]; if (!P) return; ttl.textContent = P.label; var sc = null, vm = P.id === 'visual.vmixer';
    if (vm) body.classList.add('vp-has-ms');
    if (D && CHOICE[P.id]) { CHOICE[P.id](D); sc = '\u0000'; }
    P.list.forEach(function (p) {
      var sx = p.section || (sc === '\u0000' ? P.label.toLowerCase() : '');
      if (!vm && sx && sx !== sc) { sc = sx; sec(sx); }
      var k = vm && p.id.indexOf('vspeed.') === 0 ? p.id.slice(7) : null;
      body.appendChild(row({ label: p.label, steps: p.steps && p.steps.length ? p.steps : [p.min, p.max], labels: p.labels || (p.steps || [p.min, p.max]).map(String), def: p.def,
        disabled: function () { return p.disabled; }, get: function () { return p.value; }, set: function (v) { A.set(p.id, v); }, energy: p.energy,
        ms: k ? vms(k) : null, out: k ? vout(k) : null,
        info: function () { var L = p.steps || [], lb = p.labels || [], lines = [];
          if (p.info) lines.push(p.info);
          lines.push(P.label + (p.section ? ' · ' + p.section : '') + (p.panelNote ? ' · ' + p.panelNote : ''));
          if (lb.length) lines.push(lb[0] + ' … ' + lb[lb.length - 1] + ' in ' + lb.length + ' steps' + (p.def != null ? ' · home ' + lb[near(L, p.def)] : ''));
          if (p.kind) lines.push(kindLine(p));
          return [p.label, lines]; } })); }); }
  // the sound mixer: channels (mute / solo through the desk), rack units (mute = their own on / off, solo through boxSet), voice parts read only
  function unit(id) { var s = String(id).split('.'), u = +s[s.length - 1]; return s.length >= 3 && isFinite(u) && /^(808|303|dx|jup|juno)$/.test(s[s.length - 2]) ? { rack: s[s.length - 2], u: u } : null; }
  function mxs() { var D = DK(); return (D && D.mx) || { m: {}, s: {}, b: {} }; }
  function chMS(ch) { var D = DK(); if (!D || !D.mute) return null;
    return [msw('M', function () { return !!mxs().m[ch]; }, function () { var v = !mxs().m[ch]; D.mute(ch, v); log('mute.' + ch, v ? 1 : 0); }, 'Mute ' + ch),
            msw('S', function () { return !!mxs().s[ch]; }, function () { var v = !mxs().s[ch]; D.solo(ch, v); log('solo.' + ch, v ? 1 : 0); }, 'Solo ' + ch)]; }
  function boxMS(b) { var D = DK(); if (!D || !D.boxSet) return null; var X = function () { return (mxs().b || {})[b.rack]; };
    return [null, msw('S', function () { var x = X(); return !!(x && x.s && x.s[b.u]); }, function () { var x = X(), v = !(x && x.s && x.s[b.u]); D.boxSet(b.rack, b.u, 's', v); log('box.' + b.rack + '.' + b.u + '.s', v ? 1 : 0); }, 'Solo ' + b.rack + ' ' + b.u)]; }
  function chOut(g) { return function () { var D = DK(); return D && D.on ? !D.on(g.id) : false; }; }
  function mixer(n) { var A = api(), D = DK(), CH = (D && D.CHS) || [];
    var list = n ? n.children : (A.mixer() || []).filter(function (g) { var x = mxs(); return g.playing || x.m[g.id] || x.s[g.id] || g.level !== 0; });
    ttl.textContent = n ? n.label : 'Mixer'; body.classList.add('vp-has-ms');
    list.forEach(function (g) { var isCh = CH.indexOf(g.id) >= 0, b = unit(g.id), fixed = !g.steps || g.steps.length < 2;
      body.appendChild(row({ label: g.label, steps: g.steps && g.steps.length ? g.steps : [0], labels: g.labels && g.labels.length ? g.labels : ['as set'], def: g.def,
        get: function () { return g.level; }, set: function (v) { A.setLevel(g.id, v); }, energy: g.energy,
        ms: isCh ? chMS(g.id) : b ? boxMS(b) : [null, null], out: isCh ? chOut(g) : null,
        drill: g.children && g.children.length ? function () { go({ t: 'mix', node: g }); } : null,
        info: function () { var L = g.labels || []; return [g.label, [(n ? n.label + ' · ' : '') + 'level ' + (L[near(g.steps || [0], g.level)] || '') + (g.playing ? ' · playing' : ' · resting'),
          fixed ? 'no level of its own yet: it follows its channel' : b ? 'a rack unit: on or off; S plays it alone in its rack' : isCh ? 'M mutes the channel, S plays it alone' : '',
          g.children && g.children.length ? g.children.length + ' inside: ' + g.children.map(function (c) { return c.label; }).join(', ') : '']]; } })); });
    if (!list.length) body.appendChild(E('div', 'vp-sec', 'nothing playing')); }
  function info(t, lines) { shut(); win = E('div', 'vp-win'); win.setAttribute('role', 'dialog'); win.setAttribute('aria-label', t);
    var h = E('div', 'vp-wh'), x = B('vp-x', '×', 'Close'); h.appendChild(E('b', null, t)); h.appendChild(x); win.appendChild(h);
    lines.filter(Boolean).forEach(function (l) { win.appendChild(E('p', null, l)); });
    x.addEventListener('click', shut); win.addEventListener('click', function (e) { if (e.target === win) shut(); });
    var main = doc.getElementById('home-main'); win.style.top = ((main ? main.scrollTop : 0) + head.offsetHeight) + 'px';   // one layout read, on open only
    el.appendChild(win); x.focus({ preventScroll: true }); }
  function shut() { if (win) { win.remove(); win = null; } }
  function paintAll() { ROWS.forEach(function (r) { r.paint(); }); }

  // ---------- the meter loop ----------
  var raf = 0, last = 0, rp = 0;
  function frame(t) { raf = 0; if (!isOpen() || doc.hidden) return; var dt = last ? Math.min(IPH, (t - last) / MS) : 0; last = t; var k = dt ? 1 - Math.exp(-dt / TAU) : 1;
    for (var i = 0; i < ROWS.length; i++) { var r = ROWS[i], m = r.m; if (!r.on) continue; var x = 0; try { x = +r.energy() || 0; } catch (e) {} x = Math.max(0, Math.min(1, x));
      m.y += (x - m.y) * k; var n = Math.round(m.y * SEG); if (n >= m.peak) { m.peak = n; m.hold = HOLD; } else if ((m.hold -= dt) < 0) { m.peak = Math.max(n, m.peak - 1); m.hold = HOLD * IPH * IPH * IPH; }   // phi: after the hold, a segment every PHI^-2 s
      vuLit(m, n, m.peak > 0 ? m.peak - 1 : -1); }
    if ((rp -= dt) < 0) { rp = REPAINT; for (var j = 0; j < ROWS.length; j++) if (ROWS[j].on) ROWS[j].paint(); }
    raf = requestAnimationFrame(frame); }
  function loop() { if (!raf && isOpen() && !doc.hidden) { last = 0; rp = REPAINT; raf = requestAnimationFrame(frame); } }

  // ---------- open / close: the same handle the faders button already calls ----------
  function isOpen() { return de.hasAttribute('data-desk') && de.hasAttribute('data-vp'); }
  function sync(o) { var b = doc.getElementById('dj-edit'); if (b) b.setAttribute('aria-expanded', o ? 'true' : 'false'); }
  function open() { build(); if (!el) return; de.setAttribute('data-desk', '1'); de.setAttribute('data-vp', '1'); render(); sync(true); }
  function close(refocus) { if (!isOpen()) return; shut(); de.removeAttribute('data-desk'); de.removeAttribute('data-vp'); if (raf) cancelAnimationFrame(raf); raf = 0; sync(false);
    if (refocus) { var b = doc.getElementById('dj-edit'); if (b) b.focus({ preventScroll: true }); } }
  // vumock: true is the engine's marker for 'not the dial face' (dad-autodj-quiz.js regLoad / apiSetLevel); vp marks this face
  root.DjDesk = { open: open, close: close, toggle: function () { isOpen() ? close(false) : open(); }, get isOpen() { return isOpen(); }, paint: paintAll, vumock: true, vp: 1 };
})(window, document);
