# Ed's DJ (dad-page) — start here

Read this first in every new session. Then read only what the next task needs (grep for a function, don't read whole files).
Live site: https://edgerequals.github.io/dad-page/ · Repo: EdgerEquals/dad-page (GitHub Pages, plain JS, no build step).

## Working with Danny
- Danny (Edger Equals): engineer and electronic musician in Perth (AWST). He works by voice on an iPhone and judges by listening.
- Ask one question at a time. Give your view; he decides. Keep replies short.
- He relays DeepSeek's replies, often pasted as his own message. Follow Danny, not DeepSeek. Check DeepSeek's claims against the
  code or the MIDI before acting: it has described code and files that weren't what was there.
- **Never implement a DeepSeek suggestion straight away** (Danny 13:13 AWST 28 Oct): it is all for consideration. Give your view,
  discuss it with Danny, and build or push only once he says go.
- When a build is live, paste the whole link: `https://edgerequals.github.io/dad-page/?fresh=<short sha>`.
- Credit third-party code under its licence; use outside code only where the licence checks out, else build from scratch.

## Rules for the code
- No gain dials. Every dial is one of five types: **R** rung, **C** coupling, **V** threshold, **L** loss, **N** pump count. Ratios are
  φ (`PHI`, `IPH = 1/PHI`); mark them in comments (`// phi: ...`). Exceptions Danny approved: mix templates may use real units (ms,
  dB, 2:1) (08:02 28 Oct); the mixer level is a rung both ways, up to +21 dB of drive (09:44 28 Oct).
- Every tunable is a knob on the desk. Meters are mapped from parameters, never measured audio (a compressor's gain reduction counts).
- Comments cite Danny's approval with the time, e.g. `(Danny 10:05 AWST 28 Oct 'Yes')`.
- Add comments only at the END of a line. A `//` comment inserted mid-line has swallowed code here several times.
- Syntax-check every edited file: `node -e "new (require('vm').Script)(require('fs').readFileSync('FILE','utf8'))"`.
- The desk: opens as a page, nothing on it is selectable, M/S on sound strips, tap a strip's background to fold it.

## Ship checklist
1. Bump the `?v=` of everything changed: `index.html` (dad-autodj-quiz.js, quiz-dj-pill.js) · `js/quiz-dj-pill.js` (dj-desk.js) ·
   `js/dad-autodj-quiz.js` (VURL dj-voice.js, FXURL dj-fx.js, XURL dj-extras.js, BUSURL dj-bus-worklet.js) · `js/dj-desk.js` (CSS).
2. Test what you touched: `bash tests/run.sh desk-test voice-test` (needs Playwright; the runner serves the repo at /dad-page/).
   CI runs the core set on every push (`.github/workflows/tests.yml`); known-flaky checks are in `tests/flaky.txt`.
3. `python3 tools/page_guard.py` (also the pre-push hook).
4. Rollback branch first: `git push origin HEAD:refs/heads/rollback/pre-<name>-<yyyy-mm-dd>`.
5. Commit: what changed and why, citing Danny; end with the attribution lines the session gives. Push main; send the full link.

## Map
- `js/dad-autodj-quiz.js` — the engine (~1500 lines). `GEN` styles · `makeTrack` (per-track graph: layers → level → overload →
  four bus outputs) · `playStep` (notes per 16th) · `rplan` (rhythm plan) · Form: `FORMS`, `emerge` (emergent planner), `secAt`,
  `fOn` · mixer `MX` · templates `TPL` (master) and `TPLB` (buses) · `busSet` / `bussesSet` (servos) · `DIAL` (every desk dial) ·
  API `window.DadAutoDJ.desk`.
- `js/dj-extras.js` instruments (Juno, Jupiter, DX7 worklet, 303, 808) · `js/dj-fx.js` effects and transitions between tracks ·
  `js/dj-voice.js` voice (singer, Rother machine, choir; per-track plan) · `js/dj-bus-worklet.js` master compressor `EdBus` + four
  buses `EdBuses` (adapted from audiojs/dynamics, MIT) · `js/dj-desk.js` + `css/dj-desk.css` the desk · `js/rhythm-continuity.js`
  reload/resume · `tests/` · `tools/page_guard.py`.
- Test hooks: `DadAutoDJ.desk` (`dial(k,v)`, `level`, `bus()`, `live()`, `setPick`), `DadAutoDJ._kit` (`INST`, `voiceHook`, `emerge`),
  `DadAutoDJ.notes()` (note log: `[ms, part, note, vel, dur]`), `DadAutoDJ.voice` (`plan()`, `mode()`, `log()`).
- Danny's MIDI exports (`dad-dj-*.mid`): parse with mido and round to the 16th grid (flooring shows false one-step shifts).

## State (28 Oct 2026, 19:35 AWST)
Live: emergent Form by default (pumps choose sections, track ends at the track pump's peak) · four mix buses + master compressor with
servos · mixer drive · electro rolls on (level kicks, no kick duck, fills only at section changes, on the one) · bells sparser
(`belS`) · voice per track (electro ~1 in 4; choir in breakdowns, machine/singer at peaks, middle flavour events/talker/choir bed) ·
**melody** (`melody1`, Melody strip, 8 dials; `roster`, `lVoice`, `soloK`, `melAt`, `mKeep` after `melDev`): lead voices per track from the
style's palette `LROS` (first lead section = its own voice, later peaks the second, breakdowns the softest), a solo at long peaks on
`soloP` of tracks, drift (almost-repeats, out and home over `mDrT` phrases), build (hook first, fills with energy). Measured on electro:
a solo peak ~4 notes/bar over 16 pitches; without a solo the DX7's sections are unchanged at under 1 note/bar (sparse bells + electro's
sparse motif, `mel: 0.12`). Tests: `tests/melody-test.js` (in CI).
**Load / dropouts** (`load1`, Danny 14:15 28 Oct): the cause was the main thread, not a leak (memory flat over 12 min). Notes are
scheduled on the main thread; the page's visuals stalled it past the old PHI^-4 s look-ahead ~70x a minute (late notes = the
'chug and catch-up', >0.5 s = a skip). Now: a stall-aware look-ahead (`lookAhead`, PHI x the longest recent clock gap, PHI^-4 ..
PHI^-1 s); the 808 bank plays rendered takes (`play808` / `render8` in dj-extras.js: 3 takes per sound per track, mono unless
panned, silent tails trimmed, ~6 MB a track); the layer overload shaper oversamples only when driven; the Jupiter stops 7 release
time constants after the note. Measured (3 min electro, headless): late sounds 2.8% -> ~0.4%; 808 nodes per 4 min 47k -> 8.5k.
foot-push.js reads its font size once (it forced a style recalc several times a frame). Diagnostics on Danny's phone: the System
strip's 'share sound log' (resume log + 'reloaded by the phone' lines from a heartbeat). Tests: `tests/load-test.js` (in CI).
Probes worth reusing: count late `start()` calls (patch AudioBufferSourceNode.prototype.start too, it has its own); CDP WebAudio
getRealtimeData on the realtime context only (offline renders create contexts too).
**Tempo** (`tempo1`, Danny 18:19 28 Oct): a style may have a home window (`g.home`, electro [120, 130], the genre's convention);
`lockBpm` folds the live (pump) tempo by octaves and draws it in with tanh in log tempo (a resonance, not a clamp); `tLk` (tempo lock,
C) blends free/held; a tap goes straight through; `tpo` (tempo, R, PHI^-5 a step) is his live move on top of every style (slide down
for a breakdown; tracks glide). Style strip: tempo, tempo lock, a BPM readout. Electro solos rare: `g.solo` is an exponent on
`soloP` (electro PHI^3: ~13% of tracks at the default, full = always). Tests: `tests/tempo-test.js` (in CI).
Electro, measured over 12 min (28 Oct): drums, 303 bass and track length are right; tempo was 112 (now home); no breakdown in 3
tracks; no voice in 3 tracks; solos too common (now rare). Proposed next for electro, waiting on Danny's pick: breakdowns likely in
electro, the machine voice more often, straighter swing, a denser repeating riff for the lead, the hard/soft vibe knob.
**Cut-outs on the phone after tempo1** (Danny 19:01 28 Oct): headless runs of load1 and tempo1 are equally clean, so the phone struggles
at electro's new ~121 BPM (~25% more notes than ~95). `guard1`: health every PHI^4 s (late steps, skips, worst clock gap, audio clock vs
wall clock) -> the sound log ('health:' lines); a load guard (`GRD`, DIAL `ldG`, System strip) holds back stacked layers (1: Jupiter
stab/octave units, 808 sub/snap; 2: also the house kit, pad under, ghost snares) and widens the look-ahead cap to 1 s. Tests:
`tests/guard-test.js` (in CI). Next: Danny's 'share sound log' after a cut-out says which it is.
**Parked in `git stash`** (not live, built before the cut-out report): the vibe macro (`vb` + reaches `vbD/vbY/vbT/vbS`; engine, 808,
pad attack; the dj-fx.js part and the desk Vibe strip not yet written), electro breakdowns likely (planned: emerge LO lowered by
PHI^-3 for electro, 53% -> ~89% in 600 simulated tracks), electro voice PHI^-3 -> PHI^-1 (dj-voice.js VCH). Danny said yes to all three
(18:57): vibe for every style, soft to hard, hard end drives every channel into clipping and reaches into the effects.
**GitHub listen runs** (Danny 19:17): `.github/workflows/listen.yml` + `tests/probes/` (listen.js, listen.sh, report.py); start with
`gh workflow run listen.yml -f minutes=5 -f genre=electro -f compare=<sha> -f capture=yes`; read results from the run's annotations
(`gh api repos/EdgerEquals/dad-page/check-runs/<job id>/annotations`). Use these for long runs instead of the session.

Next, in Danny's agreed order (12:53 28 Oct):
1. ~~Melody~~ (live 28 Oct, melody1; waiting on Danny's listen).
2. **Genres**: electronic → dance; then techno, house, trance… two at a time. Open question: does the quirky arp over a half-time beat
   go into ambient, or a new Crossover style (ambient stays drumless)?
3. **CPU**: measure on his phone first; a polyphony cap as a safety net (not DeepSeek's "voice pool" as written).
4. **Riser**: modulation pumps (scatter, reverse loop, chop, delay) cascading faster through a build; its own dial, set per genre;
   scaled by how big the coming drop is.
5. Later: era dial (vintage/modern, humanise, fault engine) · the Motown team (a background group that writes soul/funk records for
   hip-hop to sample; chords cross over with the hip-hop track; era templates; 45-on-33 speed) · sampler (SP-1200 chop + grain cloud) ·
   vocoder · licence-checked audio samples · morph dial (after genres) · hardware (Bela/ESP32: nothing to build yet) ·
**haptic test** (Danny 13:16-13:18 28 Oct: yes, one minute, 'not urgent, do it later'): a desk button; for a minute a hidden Safari
switch (`<input type=checkbox switch>`, iOS 17.4+) is clicked on each kick; first tick inside the tap, the rest from timers, which is
what the test finds out.
DeepSeek's held list (13:44 28 Oct, 13 items, for discussion only): schematic modelling, Pi rack, AES HAT, BPM drift/catch-up, S&H
freeze, chord genome, soft/hard electro vibe, vibe bus + genre chops, build/riser dials, haptics, roadmap, Mono/Poly + organ + strings,
era dial; + (19:0x-19:26) MIDI out to hardware, a PHI-to-CC map, audio/MIDI mutes + snap-sync, mic-based analog lock, a modulation
matrix with LFOs, variation / loop breaks (fresh seed on play, 303 rests, 808 via vibe), non-Roland drums (DMX, LinnDrum, Simmons,
RZ-1: sample playback needs licence-checked kits; a buffer source plays once, so no node 'pool'), an orchestral stab rack, SP-1200
signal chain. Nothing goes in until Danny says go.
Older queue: Instruments/Composition split of the Style row · per-part memory faders · tap a fader name for its description ·
feedback strip · what the Changes strip's mute/solo should do · mix templates steps 3–6.
Waiting on Danny: his "share my moves" paste (System strip) to set electro's default balance from his night-of-27-Oct settings.
