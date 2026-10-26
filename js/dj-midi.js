/* Dad's DJ MIDI export (Danny 14:48 AWST 26 Oct 2026: 'exports the last minute of what was played as a midi file ... reopen it in my DAW').
   Loaded only when the export button is pressed. A tiny hand-rolled Standard MIDI File writer (no library):
   type 1, 480 PPQ, track 0 = tempo + 4/4 time signature at the current BPM, then one track per voice (drums, bass, chords, lead),
   drums on channel 10 with General MIDI percussion keys. The same event list also gives a midicsv text dump (dev only, DadMidi.csv).
   Saves as dad-dj-YYYYMMDD-HHMM.mid: the share sheet when the browser can share files (iOS Safari -> Files, a DAW), else a download. */
(function () {
  'use strict';
  var PPQ = 480;                                                          // anchor: Danny 14:48 AWST 26 Oct (480 PPQ)
  var MS = 1e3, SPM = 60, B7 = 128, B8 = 256, US = 1e6;                 // unit: ms per s, s per minute, 7-bit and 8-bit ranges, microseconds per s
  // part -> [track name, channel index, GM program] ; channel index 9 = MIDI channel 10 (drums)
  var PARTS = [['drums', 'Drums', 9, 0], ['bass', 'Bass', 1, 33], ['chords', 'Chords', 2, 4], ['lead', 'Lead', 3, 80]];   // cite: General MIDI Level 1 (ch 10 percussion; programs 34 fingered bass, 5 e-piano, 81 square lead)
  var TS = [4, 2, 24, 8], DCH = PARTS[0][2];                              // cite: SMF 1.0 time signature 4/4, 24 clocks per click, 8 32nds per quarter; drums channel
  function vlq(n) { var b = [n & 0x7F]; while ((n >>= 7)) b.unshift((n & 0x7F) | 0x80); return b; }   // unit: MIDI variable-length quantity
  function u32(n) { return [(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF]; }      // unit: big-endian bytes
  function str(s) { return Array.prototype.map.call(s, function (c) { return c.charCodeAt(0) & 0x7F; }); }
  function chunk(id, body) { return str(id).concat(u32(body.length), body); }
  function meta(type, data) { return [0xFF, type].concat(vlq(data.length), data); }   // unit: SMF meta event
  function vel(v) { return Math.max(1, Math.min(B7 - 1, Math.round(v * (B7 - 1)))); }
  function build(ev, bpm, title, tl) {
    // TEMPO MAP (MIDI Bot review): crossfades between tracks of different BPM get a tempo change at the handover, and ticks integrate it
    var t0 = ev.length ? ev[0][0] : Date.now(), seg = [[t0, bpm]];
    if (tl && tl.length) { var b0 = null; tl.forEach(function (x) { if (x[0] <= t0) b0 = x[1]; }); seg = [[t0, b0 || tl[0][1]]];
      tl.forEach(function (x) { if (x[0] > t0 && x[1] !== seg[seg.length - 1][1]) seg.push([x[0], x[1]]); }); }   // only real tempo changes
    var tk = function (ms) { var k = 0; for (var i = 0; i < seg.length; i++) { var a = seg[i][0], b = i + 1 < seg.length ? Math.min(seg[i + 1][0], ms) : ms; if (b <= a) break; k += (b - a) / MS * seg[i][1] / SPM * PPQ; } return Math.max(0, Math.round(k)); };
    var tempo = Math.round(SPM * US / seg[0][1]), tracks = [], rows = [];
    var c0 = meta(0x03, str('Dad\'s DJ' + (title ? ' - ' + title : '')));
    c0 = [0].concat(c0, [0], meta(0x51, [(tempo >> 16) & 0xFF, (tempo >> 8) & 0xFF, tempo & 0xFF]), [0], meta(0x58, TS));   // unit: tempo as 3 big-endian bytes (SMF meta 0x51)
    var lastT = 0; seg.slice(1).forEach(function (x) { var at = tk(x[0]), us = Math.round(SPM * US / x[1]); c0 = c0.concat(vlq(at - lastT), meta(0x51, [(us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF])); lastT = at; rows.push([1, at, 'Tempo', us]); });   // unit: tempo bytes
    c0 = c0.concat([0], meta(0x2F, []));
    tracks.push(c0);
    rows.push([0, 0, 'Header', 1, PARTS.length + 1, PPQ], [1, 0, 'Start_track'], [1, 0, 'Title_t', '"Dad\'s DJ"'], [1, 0, 'Tempo', tempo], [1, 0, 'Time_signature'].concat(TS));
    rows.push([1, lastT, 'End_track']);
    PARTS.forEach(function (P, pi) {
      var ch = P[2], es = [];
      var notes = []; ev.forEach(function (e) { if (e[1] !== P[0]) return; var on = tk(e[0]); notes.push([on, Math.max(on + 1, tk(e[0] + e[4] * MS)), Math.max(0, Math.min(B7 - 1, Math.round(e[2]))), vel(e[3])]); });
      notes.sort(function (a, b) { return a[0] - b[0]; }); var held = {};
      notes.forEach(function (x) { var h = held[x[2]]; if (h && h[1] > x[0]) h[1] = x[0]; held[x[2]] = x; });   // same pitch again: end the earlier note there (no truncation of the new one)
      notes.forEach(function (x) { if (x[1] > x[0]) es.push([x[0], 1, x[2], x[3]], [x[1], 0, x[2], 0]); });
      var lastCC = {}; ev.forEach(function (e) { if (e[1] !== 'cc') return; var v = Math.max(0, Math.min(B7 - 1, Math.round(e[3] * (B7 - 1)))); if (lastCC[e[2]] === v) return; lastCC[e[2]] = v; es.push([tk(e[0]), 2, e[2], v]); });   // transition sweeps (CC74/93/91) on every part
      es.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });   // note-offs before note-ons at the same tick
      var body = [0].concat(meta(0x03, str(P[1]))), last = 0, tn = pi + 2;
      rows.push([tn, 0, 'Start_track'], [tn, 0, 'Title_t', '"' + P[1] + '"']);
      if (ch !== DCH) { body = body.concat([0, 0xC0 | ch, P[3]]); rows.push([tn, 0, 'Program_c', ch, P[3]]); }
      es.forEach(function (x) { body = body.concat(vlq(x[0] - last), [(x[1] === 2 ? 0xB0 : x[1] ? 0x90 : 0x80) | ch, x[2], x[3]]); last = x[0];   // unit: SMF status bytes (control change / note on / off)
        rows.push([tn, x[0], x[1] === 2 ? 'Control_c' : x[1] ? 'Note_on_c' : 'Note_off_c', ch, x[2], x[3]]); });
      body = body.concat([0], meta(0x2F, [])); rows.push([tn, last, 'End_track']); tracks.push(body);
    });
    rows.push([0, 0, 'End_of_file']);
    var bytes = chunk('MThd', [0, 1, 0, tracks.length, (PPQ >> 8) & 0xFF, PPQ & 0xFF]);   // unit: format 1, track count, division
    tracks.forEach(function (b) { bytes = bytes.concat(chunk('MTrk', b)); });
    return { bytes: new Uint8Array(bytes), csv: rows.map(function (r) { return r.join(', '); }).join('\n') + '\n' };
  }
  function name(d) { d = d || new Date(); var p = function (n) { return (n < 10 ? '0' : '') + n; };   // unit: two-digit pad
    return 'dad-dj-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + '.mid'; }
  function save(ev, bpm, title, tl) {
    var r = build(ev, bpm, title, tl), fn = name(), blob = new Blob([r.bytes], { type: 'audio/midi' });
    var file = null; try { file = new File([blob], fn, { type: 'audio/midi' }); } catch (e) {}
    function dl() { var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = fn; a.rel = 'noopener'; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, SPM * MS); }
    var touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (touch && file && navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: fn }).catch(function (e) { if (!e || e.name !== 'AbortError') dl(); });
    else dl();
    return { name: fn, size: r.bytes.length };
  }
  window.DadMidi = { build: build, save: save, name: name, csv: function (ev, bpm) { return build(ev, bpm).csv; } };
})();
