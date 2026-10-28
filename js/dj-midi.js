/* Dad's DJ MIDI export (Danny 14:48 AWST 26 Oct 2026: 'exports the last minute of what was played as a midi file ... reopen it in my DAW').
   Loaded only when the export button is pressed. A tiny hand-rolled Standard MIDI File writer (no library):
   type 1, 480 PPQ, track 0 = tempo + 4/4 time signature at the current BPM, then one track per voice (drums, bass, chords, lead),
   drums on channel 10 with General MIDI percussion keys. The same event list also gives a midicsv text dump (dev only, DadMidi.csv).
   Saves as dad-dj-YYYYMMDD-HHMM.mid: the share sheet when the browser can share files (iOS Safari -> Files, a DAW), else a download.
   BAR LINES + VELOCITY RATIO (Danny 12:20 AWST 27 Oct, Claude chat: 'Yes' to building both after the first download landed 2 1/2 beats into a bar
   and maxed at 127): when the log carries the DJ's downbeats ('bar' entries) the file starts on one and every one of them sits on a bar line of
   the file - the tempo of each bar is the track's own BPM, or the measured length of a bar that straddles a handover - so the grid in a DAW is
   the DJ's grid all the way through, crossfades included; a log without downbeats keeps the handover tempo map below. Velocity is each note's
   level as a ratio of the loudest note in the minute (that one = 127), so the slam downbeat stays PHI above the rest instead of clipping.
   The tempo track ends with the music. */
(function () {
  'use strict';
  var PPQ = 480;                                                          // anchor: Danny 14:48 AWST 26 Oct (480 PPQ)
  var MS = 1e3, SPM = 60, B7 = 128, B8 = 256, US = 1e6;                 // unit: ms per s, s per minute, 7-bit and 8-bit ranges, microseconds per s
  // part -> [track name, channel index, GM program] ; channel index 9 = MIDI channel 10 (drums)
  var PARTS = [['drums', 'Drums', 9, 0], ['bass', 'Bass', 1, 33], ['chords', 'Chords', 2, 4], ['lead', 'Lead', 3, 80]];   // cite: General MIDI Level 1 (ch 10 percussion; programs 34 fingered bass, 5 e-piano, 81 square lead)
  var TS = [4, 2, 24, 8], DCH = PARTS[0][2];                              // cite: SMF 1.0 time signature 4/4, 24 clocks per click, 8 32nds per quarter; drums channel
  var QPB = TS[0] * 4 / Math.pow(2, TS[1]), BAR = QPB * PPQ, SPQ = 4;     // unit: quarter notes per bar (4/4 -> 4), ticks per bar, the DJ's sixteenth steps per quarter
  function isPart(e) { for (var i = 0; i < PARTS.length; i++) if (PARTS[i][0] === e[1]) return true; return false; }
  // the DJ's downbeats -> [wall ms, bpm of the bar that starts there]; whole bars are added in front at the first bar's tempo if anything starts earlier
  function barsOf(ev) {
    var bs = ev.filter(function (e) { return e[1] === 'bar' && e[2] > 0; }).sort(function (a, b) { return a[0] - b[0]; });
    bs = bs.filter(function (b, i) { return !i || b[0] > bs[i - 1][0]; }); if (!bs.length) return null;   // one downbeat per instant
    for (var j = 0; j < bs.length - 1;) { var bj = bs[j], nj = bs[j + 1]; if (nj[0] - bj[0] < (1 / ((1 + Math.sqrt(5)) / 2)) * QPB * SPM * MS / bj[2] && j > 0) bs.splice(j, 1); else j++; }   // CATCH-UP (Danny's 19:39 28 Oct file: a 4653 BPM bar after an interruption): a downbeat followed within PHI^-1 of its own bar is a resume jump, not a bar; drop it and the bar before runs to the next
    var first = Math.min.apply(null, ev.map(function (e) { return e[0]; }));
    while (first < bs[0][0]) { var b = bs[0]; bs.unshift([b[0] - QPB * SPM * MS / b[2], 'bar', b[2], b[3], b[4] - QPB * SPQ]); }
    return bs.map(function (b, i) { var n = bs[i + 1], same = n && n[3] === b[3] && n[4] - b[4] === QPB * SPQ;   // the next downbeat is this track's very next bar
      return [b[0], n && !same ? QPB * SPM * MS / (n[0] - b[0]) : b[2]]; });   // a bar across a handover (or a resync jump) runs at its measured length
  }
  function vlq(n) { var b = [n & 0x7F]; while ((n >>= 7)) b.unshift((n & 0x7F) | 0x80); return b; }   // unit: MIDI variable-length quantity
  function u32(n) { return [(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF]; }      // unit: big-endian bytes
  function ascii(s) { s = String(s); try { s = s.normalize('NFD'); } catch (e) {} return s.replace(/[\u0300-\u036f]/g, '').replace(/[\u2010-\u2015]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[^\x20-\x7e]/g, '?'); }   // MIDI Bot review: text meta is ASCII (accents dropped, dashes kept, the rest '?'), never 7-bit masked
  function str(s) { return Array.prototype.map.call(ascii(s), function (c) { return c.charCodeAt(0); }); }
  function chunk(id, body) { return str(id).concat(u32(body.length), body); }
  function meta(type, data) { return [0xFF, type].concat(vlq(data.length), data); }   // unit: SMF meta event
  function build(ev, bpm, title, tl) {
    var t0 = ev.length ? Math.min.apply(null, ev.map(function (e) { return e[0]; })) : Date.now(), seg = [[t0, bpm]], tk, tmp = [];   // the earliest event (the log is in look-ahead order, not time order); tmp: [tick, us per quarter]
    var bars = barsOf(ev);
    if (bars) {
      // BAR LINES: downbeat i is tick i x BAR; between two downbeats ticks run in proportion, past the last one at its tempo
      tk = function (ms) { if (ms <= bars[0][0]) return 0; var i = 0; while (i + 1 < bars.length && bars[i + 1][0] <= ms) i++;
        var k = i + 1 < bars.length ? (ms - bars[i][0]) / (bars[i + 1][0] - bars[i][0]) * BAR : (ms - bars[i][0]) / MS * bars[i][1] / SPM * PPQ;
        return Math.max(0, Math.round(i * BAR + k)); };
      bars.forEach(function (b, i) { var us = Math.max(1, Math.min(B8 * B8 * B8 - 1, Math.round(SPM * US / b[1]))); if (!tmp.length || tmp[tmp.length - 1][1] !== us) tmp.push([i * BAR, us]); });   // only real tempo changes
    } else {
      // TEMPO MAP (MIDI Bot review): crossfades between tracks of different BPM get a tempo change at the handover, and ticks integrate it
      if (tl && tl.length) { var b0 = null; tl.forEach(function (x) { if (x[0] <= t0) b0 = x[1]; }); seg = [[t0, b0 || tl[0][1]]];
        tl.forEach(function (x) { if (x[0] > t0 && x[1] !== seg[seg.length - 1][1]) seg.push([x[0], x[1]]); }); }   // only real tempo changes
      tk = function (ms) { var k = 0; for (var i = 0; i < seg.length; i++) { var a = seg[i][0], b = i + 1 < seg.length ? Math.min(seg[i + 1][0], ms) : ms; if (b <= a) break; k += (b - a) / MS * seg[i][1] / SPM * PPQ; } return Math.max(0, Math.round(k)); };
      seg.forEach(function (x) { tmp.push([tk(x[0]), Math.round(SPM * US / x[1])]); });
    }
    // VELOCITY: each note's level as a ratio of the loudest note in the minute (that one = 127); 0 = inaudible: the note is dropped, not written at velocity 1 (MIDI Bot review)
    var top = 0; ev.forEach(function (e) { if (isPart(e) && e[3] > top) top = e[3]; });
    var vel = function (v) { return top > 0 ? Math.max(0, Math.min(B7 - 1, Math.round(v / top * (B7 - 1)))) : 0; };
    var tracks = [], rows = [], prow = [], endT = 0;
    PARTS.forEach(function (P, pi) {
      var ch = P[2], es = [];
      var notes = []; ev.forEach(function (e) { if (e[1] !== P[0]) return; var on = tk(e[0]); var vv = vel(e[3]); if (!vv) return; notes.push([on, Math.max(on + 1, tk(e[0] + e[4] * MS)), Math.max(0, Math.min(B7 - 1, Math.round(e[2]))), vv]); });
      notes.sort(function (a, b) { return a[0] - b[0]; }); var held = {};
      notes.forEach(function (x) { var h = held[x[2]]; if (h && h[1] > x[0]) h[1] = x[0]; held[x[2]] = x; });   // same pitch again: end the earlier note there (no truncation of the new one)
      notes.forEach(function (x) { if (x[1] > x[0]) es.push([x[0], 1, x[2], x[3]], [x[1], 0, x[2], 0]); });
      var lastCC = {}; ev.slice().sort(function (a, b) { return a[0] - b[0]; }).forEach(function (e) { if (e[1] !== 'cc') return; var v = Math.max(0, Math.min(B7 - 1, Math.round(e[3] * (B7 - 1)))); if (lastCC[e[2]] === v) return; if (lastCC[e[2]] == null && tk(e[0]) > 0) es.push([0, 2, e[2], v]); lastCC[e[2]] = v; es.push([tk(e[0]), 2, e[2], v]); });   // each controller starts the file at its first known value (tick 0)   // transition sweeps (CC74/93/91) on every part
      es.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });   // note-offs before note-ons at the same tick
      var body = [0].concat(meta(0x03, str(P[1]))), last = 0, tn = pi + 2;
      prow.push([tn, 0, 'Start_track'], [tn, 0, 'Title_t', '"' + P[1] + '"']);
      if (ch !== DCH) { body = body.concat([0, 0xC0 | ch, P[3]]); prow.push([tn, 0, 'Program_c', ch, P[3]]); }
      es.forEach(function (x) { body = body.concat(vlq(x[0] - last), [(x[1] === 2 ? 0xB0 : x[1] ? 0x90 : 0x80) | ch, x[2], x[3]]); last = x[0];   // unit: SMF status bytes (control change / note on / off)
        prow.push([tn, x[0], x[1] === 2 ? 'Control_c' : x[1] ? 'Note_on_c' : 'Note_off_c', ch, x[2], x[3]]); });
      body = body.concat([0], meta(0x2F, [])); prow.push([tn, last, 'End_track']); tracks.push(body); endT = Math.max(endT, last);
    });
    // track 0: title, tempo map, 4/4, ending with the music (the last event of any part)
    var ttl = (document.documentElement.getAttribute('data-who')||'Dad') + '\'s DJ' + (title ? ' - ' + title : ''), c0 = [0].concat(meta(0x03, str(ttl)));
    rows.push([0, 0, 'Header', 1, PARTS.length + 1, PPQ], [1, 0, 'Start_track'], [1, 0, 'Title_t', '"' + ascii(ttl).replace(/"/g, '""') + '"']);   // midicsv order: Header first (csvmidi rejects anything before it)
    var lastT = 0; tmp.forEach(function (x, i) { var at = Math.max(lastT, x[0]), us = x[1];
      c0 = c0.concat(vlq(at - lastT), meta(0x51, [(us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF])); lastT = at; rows.push([1, at, 'Tempo', us]);   // unit: tempo as 3 big-endian bytes (SMF meta 0x51)
      if (!i) { c0 = c0.concat([0], meta(0x58, TS)); rows.push([1, 0, 'Time_signature'].concat(TS)); } });
    endT = Math.max(endT, lastT); c0 = c0.concat(vlq(endT - lastT), meta(0x2F, [])); rows.push([1, endT, 'End_track']);
    tracks.unshift(c0); rows = rows.concat(prow);
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
  window.DadMidi = { build: build, save: save, name: name, csv: function (ev, bpm, title, tl) { return build(ev, bpm, title, tl).csv; } };
})();
