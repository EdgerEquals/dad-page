# The MIDI/audio engine (what the code does today)

This summarises the code on `main` as of 30 Oct 2026. Line-level detail lives in [../architecture/architecture-map.md](../architecture/architecture-map.md) and [../dad-dj.md](../dad-dj.md); this page is the short version for hardware reviewers.

## What it is
- A **generative music engine** written in plain JavaScript on the **Web Audio API**. There's no build step. It runs in a web page ([live site](https://edgerequals.github.io/dad-page/)), served by GitHub Pages from the repo root.
- **Nothing is pre-recorded.** Drums, bass, chords, lead and voice are all synthesised live. The 808 bank plays takes the engine renders itself for each track.
- **Driven by "pumps":** slow sine-mode sources fed by real inputs (time of day, weather, tide, moon, season) and by the desk's knobs. Six intent dimensions (drive, density, tension, brightness, weight, space) are logistic functions of those pumps, and the music reads them throughout.
- **Ratios, not fixed numbers.** The golden ratio φ is the step size, the split and the "even random" sequence (see the architecture map, section 2).

## Main modules
| File | Role |
|---|---|
| `js/dad-autodj-quiz.js` | The engine: styles (`GEN`), per-track audio graph (`makeTrack`), the 16th-note scheduler (`playStep`), rhythm plan, emergent song form, mixer, templates, bus servos, every desk dial |
| `js/dj-extras.js` | Instruments: Juno and Jupiter (written from scratch), a DX7 FM voice (AudioWorklet, from dx7-synth-js, MIT), a 303 (driftbox, MIT), an 808 bank (driftbox, MIT) |
| `js/dj-fx.js` | Effects and transitions between tracks (echo loop, wash, filter, delay throw) |
| `js/dj-voice.js` | Synthesised voice (singer, machine voice, choir) with formant filters |
| `js/dj-bus-worklet.js` | Master compressor `EdBus` and four mix buses `EdBuses` on an AudioWorklet. Four topologies: VCA, FET, opto, vari-mu (adapted from audiojs/dynamics, MIT) |
| `js/dj-desk.js` | The on-screen desk: knobs and strips Ed uses to steer the engine |
| `js/dj-midi.js` | MIDI export: writes the **last minute** of what played as a Standard MIDI File (type 1, 480 PPQ, a track each for drums, bass, chords and lead), bar-aligned to the engine's own downbeats |
| `js/rhythm-continuity.js` | Keeps the music continuous across reloads and phone interruptions |
| `js/phi-pumps.js` | The pump tree |

## Signal path inside the engine
layers → channel level (in φ rungs) → overload shaper → four buses (drums / bass / music / front) → bus compressors and parallel smash → master compressor → saturation → trim → soft ceiling.

## Timing
Notes are scheduled from the main thread with a look-ahead. That window adapts to measured stalls, from φ⁻⁴ to φ⁻¹ s, widening to 1 s under the load guard. The engine also keeps a note log (`DadAutoDJ.notes()`).

## What does NOT exist yet (relevant to the hardware)
- **No live MIDI input or output.** The code doesn't use the Web MIDI API (`requestMIDIAccess` appears nowhere). MIDI exists only as a file export.
- **No CV or hardware control path.** Hardware (Bela or ESP32 were mentioned) is listed as "later" in the repo's notes.
- **Microphone:** only a stand-alone test page (`tools/mic-check.html`) measures the phone's mic and speaker loop. The engine doesn't use the mic yet.
- **Audio input from external gear:** none. The engine only generates.

So the hardware layer needs, at minimum:
1. a live control bus out of the engine (notes, clock, CC, CV targets);
2. a live control and audio-analysis path into it;
3. engine scheduling that targets the hubs' timestamped events instead of only Web Audio nodes.

## Not verified here
- Whether the engine will run on the main unit in a browser, in a headless browser, or ported to another runtime. That's undecided.
- Real-world output latency on the main-unit candidates. Not measured.
