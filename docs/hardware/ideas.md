# Ideas: new territory and Stratosphere (SPECULATIVE)

> **SPECULATIVE.** Everything on this page assumes the whole system in [architecture.md](architecture.md) already works. None of it is built or tested. Physics marked as speculative (room modes, feedback, crowd separation) needs measuring. Manufacturer specs are named where they're used.

## The core claim
Other people modulate analog gear blind, from an LFO or a pedal. This rig **hears the result** (parallel taps and the room mic) and **knows the future**, because the engine knows the next bar. So it can schedule early, measure what each box did, correct, and hold analog gear right at an edge (feedback, breakup, freeze) that people usually only hit by luck.

## Part A: Stratosphere, 13 performance concepts (SPECULATIVE)
Difficulty: Near / Mid / Moonshot. These go beyond the 15 ideas in Part B.

1. **Tuned to the building** (Mid). Audience: the drop lands on the room itself; every venue sounds different. Hands: a soundcheck sweep learns the room's strongest low resonances (modes); the instrument knob picks one, and the motorised knob's detents snap the key and sub notes to it as ratios. Gap: engineers suppress modes, nobody tunes to them. Needs: room mic(s), sweep, ratio tuning, analog crossover, sub VCAs. Speculative: modes vary by position (blooms in one spot, cancels in another). SPL: hardware level ceiling.
2. **The crowd is the sidechain** (Moonshot). Audience: cheering opens the build (filters, valve drive, compression). Hands: one knob sets the crowd's power as a ratio. Gap: crowd interaction never reaches the signal path. Needs: room mics away from the stack; the engine subtracts the known stack output and keeps the crowd remainder; CV to VCAs and inserts. Speculative: only partial separation is realistic, so use it as a slow energy signal.
3. **Sub choreography** (Mid). Audience: the bass leaves and returns; the set lifts into horns only, then the subs drop back; bass walks between sub clusters. Hands: a motorised knob is the crossover; LFO spin moves bass between clusters on the clock. Gap: crossovers are set once. Needs: hub-controlled analog crossover (VCF + VCA per band), amp channels per cluster, hardware floors. Protection: the JBL 2440 is rated from 500 Hz, so give it a fixed hardware high-pass minimum; the SBP15 has 14 mm peak excursion, so add a sub limiter.
4. **The living set** (Mid). Audience: a set that ripens, cool and clean to hot, as valves warm and oscillators drift. Hands: as usual; the engine writes harmony that fits the drift instead of correcting it. Needs: parallel taps per voice, pitch and tone tracking, self-profiling maps.
5. **Duet with the machine** (Moonshot). Audience: when Ed lets go, a knob keeps moving in his style, and it hands back the moment he touches it. Hands: a bezel nudge means "I've got it"; letting go hands the gesture over. Needs: motorised knobs with bezel sensing, gesture logs, an engine model trained on Ed's own sets.
6. **Glass box: the machine is visible** (Near). Audience: the camera view of the panels with live overlays on the stream and screens; knobs moving by themselves. Needs: a visible-light camera beside the IR one, a renderer Pi, and the VR-1HD's 3 HDMI inputs (Roland).
7. **Loops that learn your attention** (Mid). Each escape keeps the notes Ed leaned on and mutates the rest; a motorised knob scrolls back through the generations. Needs: open-source MBSEQ/LoopA firmware, logs.
8. **A memory across nights** (Near). Motifs return across gigs; a venue's second show starts already tuned. Hands: a "remember this" button. Needs: logs, room fingerprints, a motif library.
9. **Never twice, always re-playable** (Near). Stems of every analog source plus timestamped control data (CV, VCA, MIDI, knobs, camera); re-perform the set later into the same analog rig, with editable gestures. Needs: a multichannel tap (the MX-1's 18-in USB as a stopgap), a control log, replay. Analog drift means it won't re-render identically; that's a feature.
10. **Compression as orchestra** (Mid). Ed's 4 compressors (V3A x2, V-Comp, G-series) on switchable insert points; one knob morphs the routing per section (lows to vari-mu, vocal to opto, drums to VCA); another sets overall squash as a ratio. Needs: a click-free insert matrix (VCA crossfades), band-split filters, Eurorack to +4 dBu level matching.
11. **A band of rigs** (Moonshot). Performers with linked knobs; parameters passed across the stage; capture/escape between performers. Needs: bus networking, a control-ownership protocol, MIDI 2.0 property exchange.
12. **The room's tail as the breakdown** (Near). The stack cuts dead, the venue's echo is the breakdown, and the captured tail returns as the next pad. Hands: one "cut to room" move, its length a ratio of the measured decay. Needs: room mic, timestamped stack VCAs, a loop buffer.
13. **Hands in the air** (Mid). The IR camera's occlusion problem turned around: hand height and position over a panel become control, like a theremin over the synth. Needs: hand tracking on the camera Pi (speed on a Pi 4 untested).

Safety: a horn stack with no DSP protection needs analog limits software can't override: a level ceiling, a fixed horn high-pass floor, and a sub excursion limit. Watch crowd SPL with a meter at the mix position.

### Flagships
- Duet with the machine, in a glass box (5 + 6): a visible second performer sharing physical knobs. This defines Ed as an artist.
- Tuned to the building (1 + 3 + 12): the stack and the venue as one instrument. Only possible with the all-analog, no-monitor stack.
- Never twice, always re-playable (9 + 8): every set becomes a re-performable record and adds to a memory across nights.

### Path
1. Now: log everything (timestamped MIDI, CV, knobs) and capture stems. Feeds 8 and 9 and trains 5 later.
2. Next: hubs with VCAs, the insert matrix and motorised knobs (unlocks 10, 12 and the touch half of 5).
3. Then: the camera Pi plus video into the VR-1HD (6, then 13).
4. Then: soundcheck measurement and a CV analog crossover with hardware floors (1, 3).
5. Moonshot: the duet model from logs, then a band of rigs (5, 11); the crowd sidechain (2) once separation works.

## Part B: New territory, 15 ideas (SPECULATIVE)
Some build on Ed's notes on old-school analog studio tricks: keyed gating, gated reverb, ducking, re-amping, runaway echo, Frippertronics, controlled feedback, dub mute performance and generation loss.

### 1. Glass chop: precision analog vocal chopping (centrepiece)
- Sounds like: trance chops with real silence between slices, clean edges at any tempo, and the density and mid-push of the V3A and V-Comp on every slice. No smeared compressor pumping in the gaps, no digital zipper.
- The gap: hardware gates trigger from audio (late, chattery). DAW chops are digital, so the analog colour is printed before the chop or lost after it. Nobody chops live audio in analog with sample-accurate, clock-scheduled edges.
- Chain: AT mic → V1290 (gain, colour) → V3A pair (level, mid-push) → V-Comp (density; BYPASS mode gives valve tone with no compression, per AudioScape) → hub VCA (the chop) → Eurorack mix and the stack, with a parallel tap to the engine and a parallel VCA send to the Volante for the throw. The chop stays analog end to end.
- Key rule: compress first, chop last. If the chop sits before the compressors, they recover in the gaps and pull the noise floor up. That's the haze Ed hears. Chopping last keeps true silence and full dynamic range.
- Two flavours: Hard is the hub VCA, with edge length as a ratio of the beat, per-slice level from the engine, gated reverb and delay sends on their own VCAs. Soft is an opto "breathing" chop. The V3A has no external sidechain input (AudioScape lists only stereo link, which works through a chassis jumper). One reading of the old "V3A link trick": link two V3As and feed a key signal into the partner unit so its detector ducks the vocal unit. Untested; the JLM Sidekick's link jumpers are unverified.
- Builds on the engine-side chop design: the engine supplies the hat-keyed→grid pattern, stutter and last-slice throw; the hardware makes it analog.
- Hub needs: 2-4 studio-grade audio VCAs per vocal hub (THAT 2180-class as an example), balanced line I/O, timestamped edges locked to the global clock, a line-level key-signal out, a Eurorack-level output into the CP3A-M mix, and a parallel audio tap to the engine.

### 2. Tape-echo choreography (Volante)
- Sounds like: the delay rhythm itself changes every bar. Heads switch in patterns, reverse on the last beat, a tape-stop at phrase ends, infinite hold with oscillation as a riser.
- The gap: people recall presets. Nobody sequences head switching, wear and speed per beat from the music's own analysis.
- Verified CCs (midi.guide): head playback 21-24, head levels 25-28, speed 19, wear 15, mechanics 14, reverse 44, infinite hold 46 and with oscillation 45, pause ramp 38/42/43, kill dry 84, clock 63, sound-on-sound 41-50.
- Hub needs: TRS MIDI out (Volante EXP jack in digital mode), dense CC streaming, timestamps, audio return to hear the result.

### 3. Freeze on cue (Cathedral)
- Sounds like: reverb or echo frozen exactly on the downbeat, playing over the frozen wash, then released on the next phrase. Pre-delay tapped from the clock.
- The gap: the Cathedral has no MIDI or expression input (EHX manual); infinite needs a foot held down.
- Trick: a known DIY mod wires the TAP/INFINITE switch contacts to a jack. An isolated hub switch-closure output can then tap tempo and hold infinite (over 350 ms). Hub VCAs on its send and return gate the frozen tail. It's a mod that voids the warranty; the pedal is discontinued and cheap.
- Hub needs: opto/relay switch-closure outs, VCA send/return, timestamps.

### 4. Drive that follows the song (Tube Zone)
- Sounds like: overdrive that blooms in the build and cleans up in the breakdown, at constant loudness.
- The gap: the pedal has six knobs and no control input (MI Audio).
- Trick: a hub VCA before it sets how hard it's driven, and one after it restores loudness, both from the engine's loudness analysis. Experimental: MI Audio says it runs from 9 V up to 25 V DC with more headroom, so a hub-controlled supply could set headroom. Under-volting is untested; don't go below 9 V without checking.
- Hub needs: pedal-level (hi-Z, unbalanced) I/O, a VCA pair, optional programmable pedal supply.

### 5. Expression-jack ghost (any pedal with an EXP jack)
- Sounds like: a foot pedal moved by the engine. On the Boomerang III, loop volume or decay rate (Boomerang manual) moves with the arrangement.
- The gap: expression jacks expect a pot. Synth CV doesn't fit, and every pedal's curve differs.
- Trick: the hub emulates a pot (digipot or opto-resistor on TRS), calibrated by sweeping it and measuring the result through the audio return. Ratios, not fixed values.
- Hub needs: isolated expression-jack emulator outputs, self-calibration.

### 6. Listening CV (analysed audio drives the analog)
- Sounds like: the MonoPoly or Crave filter "talking" along with Ed's vocal formants, the bass filter following the kick's brightness, the room's loudness opening a pad.
- The gap: hardware envelope followers track one thing (level). The engine can pull onset, brightness, pitch, vowel and room energy, and send each as calibrated CV with ratios and smoothing set by the music.
- Targets (verified): Crave 18 CV ins ±5 V, MonoPoly VCO/VCF mod ±5 V, K-2 patch bay (it also has its own hardware envelope follower), Neutron patch bay, Eurorack.
- Hub needs: calibrated bipolar CV outs, per-jack gain/offset ratios, audio return from every source.

### 7. Ghost hands (camera + CV)
- Sounds like: an acid filter ride Ed does by hand on the TD-3 gets replayed later, or mirrored live, on a CV-capable filter (Crave, K-2, Eurorack). Or his RD-8 hand moves are turned into automation.
- The gap: hand performance on a non-MIDI synth is lost the moment it ends. The camera turns it into data.
- Bonus: the TD-3 has an external filter input (+12 dBu, Behringer), so any audio (vocal, pads, drums) can go through the 303 filter while Ed rides the knobs.
- Hub needs: camera read-back stream, CV outs, a hot line-level out for the TD-3 filter in.

### 8. The room plays along
- Sounds like: feedback that sings on a chosen note and never squeals out of control; filters tuned to the room's own resonances; the room's echo becoming part of the groove.
- The gap: musicians fight room modes and feedback. Here the engine measures the room through the AT mic, finds its modes, and holds the speaker-to-mic loop just under runaway (Larsen surfing), picking the note.
- Gear: AT mic → V1290, valve amps and speakers, engine.
- Hub needs: room mic input, a fast VCA on the speaker feed, and a hardware safety limiter that works even if the software stops.

### 9. Safe runaway (valve and tape feedback loops)
- Sounds like: a self-oscillating dub loop through the Volante and the V-Comp's "glitch mode" (Triple mode, fastest recovery, input cranked, per AudioScape), swept and tamed bar by bar.
- The gap: runaway echo is thrilling and dangerous. Players ride it by ear and lose it. The engine measures loop gain and keeps it at the edge.
- Hub needs: VCA in the loop, hardware loop-gain guard, Volante CCs.

### 10. Dub throws that land
- Sounds like: a single word or snare thrown into the tape echo exactly on the beat, the dry signal killed (Volante kill dry, CC 84), the repeats darkening.
- The gap: hand throws on a mixer are late or early. The engine knows when the slice comes and opens the send for exactly that slice.
- Hub needs: send VCAs with timestamps, TRS MIDI.

### 11. Giorgio and Kraftwerk, with precision
- Sounds like: Moroder-style sequenced bass with accent through a VCA per step, Kraftwerk-style robotic vocals through the E-4 vocoder played with notes from the engine.
- Verified: the E-4 has a vocoder and receives notes, bend and clock (Roland manual).
- Gap: vintage tricks had fixed patterns. Here the patterns come from the engine's ratios and react to the room.
- Hub needs: a VCA per synth output, CV/gates, USB or TRS MIDI to the E-4.

### 12. Pump and summing drive in the Moog mixers
- Sounds like: a French-house pump where the dip arrives just before the kick, not after it, and the CP3A-M mixers pushed into warm transistor drive as the build rises.
- The gap: a sidechain compressor only reacts after the kick lands, and nobody plays summing distortion as a performance control. The engine knows the kick is coming and how hot the build should run.
- Gear: hub VCAs, or Eurorack VCAs on hub CV, pre-dip each channel before the CP3A-M mixers. The CP3A-M is discrete-transistor and clips asymmetrically when driven hard (AMSynths), so input level becomes a drive control. The MX-1 sits on a send for its Beat FX (Filter, Side Chain, Slicer) and break effects, played by CC, out of the main path. AudioScape lists no external key input on the G-series (unverified).
- Hub needs: VCAs before the mixer, Eurorack-level audio and CV, DIN MIDI CC to the MX-1 send, timestamps.

### 13. Generation loss as a dial
- Sounds like: a loop re-amped through the valve amps and room each pass (Lucier's "I Am Sitting in a Room", Frippertronics) until the room has eaten it, stopped at the pass that sounds right.
- Gap: you normally stop by ear. The engine measures how far each pass has moved from the original and stops at a ratio Ed sets.
- Gear: Boomerang III Copy Live (resampling), valve amps, AT mic, LoopA keeps the matching MIDI aligned; MIDI clock into the Side Car's Pedal Link.
- Hub needs: re-amp outs, audio return, VCAs, MIDI clock out, an expression emulator for the Boomerang's decay rate.

### 14. Audio-rate CV
- Sounds like: metallic, vocal and ring-mod timbres from the analog synths, with the engine as the modulation oscillator, locked to the key and the clock.
- Gap: most CV interfaces update too slowly for audio-rate modulation.
- Targets: Crave CV ins, MonoPoly VCO/VCF mod, Eurorack.
- Hub needs: CV outs that update at audio rate (DC-coupled, same rate as the engine).

### 15. The rig that profiles itself
- Sounds like: nothing; it's what makes the rest work. The engine plays test tones and sweeps through every analog box and CV input, measures what comes back, and builds its own response maps.
- Gap: everyone calibrates by hand, once. This makes Ed's "no fixed values, ratios and calibration" rule automatic, and re-checks when valves warm up.
- Hub needs: test/re-amp outs, audio return, CV outs, expression emulators, latency measurement.

## Control inputs on the pedals and effects
| Device | Control inputs | Source | Hub trick |
|---|---|---|---|
| Strymon Volante | Full MIDI CC via EXP jack (digital mode) or USB; 300 presets | strymon.net, midi.guide | Stream CCs per beat |
| EHX Cathedral | None (no MIDI, no EXP); TAP/INFINITE footswitch | EHX manual | Switch-closure mod + VCA send/return |
| Tube Zone (MI Audio, to confirm) | None; 6 knobs; 9-25 V DC | MI Audio manual | VCA drive + make-up; experimental supply |
| Boomerang III + Side Car | EXP jack: loop volume or decay; MIDI clock via Side Car Pedal Link | Boomerang manual | Expression emulator, MIDI clock |
| Roland E-4 | MIDI notes, bend, clock; vocoder, harmony, scatter, looper | Roland manual | Play vocoder from engine |
| Roland MX-1 | CC for levels, Beat FX, scenes by PC | Roland MIDI implementation | Effects on a send; breaks played by CC |
| AudioScape V3A | None; stereo link via chassis jumper | AudioScape | VCA chop after it; link-key trick (untested) |
| AudioScape V-Comp | None; XLR in/out | AudioScape | Feedback loop, glitch mode, Bypass colour |
| AudioScape G-series | No external key listed (unverified) | AudioScape | VCA pre-dip before it |
| DSI Tempest | DIN MIDI in/out, USB MIDI; receives notes + fixed CCs (users report 12 distortion, 13 compression, 20-27 Beat FX); no documented knob transmit; 2 pedal inputs; 6 stereo voice outs | DSI manual, Sequential forum | Expression emulator on pedal inputs; voice outs into Eurorack mix |

## What to integrate, ranked by how many ideas each capability unlocks
Numbers refer to Part B unless marked Stratosphere.

| Rank | Capability | Ideas it unlocks | Count |
|---|---|---|---|
| 1 | Studio-grade audio VCAs in hubs | 1, 3, 4, 8, 9, 10, 11, 12, 13 | 9 |
| 2 | Parallel audio taps to engine with latency measurement | 1, 2, 4, 6, 8, 9, 13, 15 | 8 |
| 3 | Timestamped, clock-locked event scheduling in each hub | 1, 2, 3, 7, 10, 11, 12 | 7 |
| 4 | MIDI CC streaming out (TRS/DIN/USB) | 2, 9, 10, 11, 12, 13 | 6 |
| 4= | Eurorack-level audio and CV I/O (new: the mix lives in the modular) | 1, 6, 7, 11, 12, 14 | 6 |
| 5 | Calibrated bipolar CV outs | 6, 7, 11, 14, 15 | 5 |
| 6 | Re-amp / pedal-level and hot line outs | 4, 7, 13, 15 | 4 |
| 7 | Hardware safety limiter / loop-gain guard | 8, 9, 13 | 3 |
| 8 | Expression-jack emulator | 5, 13, 15 | 3 |
| 8= | Switchable compressor insert points | 1, 9, 12 (+ Stratosphere 10) | 3 |
| 9 | Line-level key-signal out | 1, 12 | 2 |
| 10 | Isolated switch-closure outs | 3 | 1 |
| 11 | Camera read-back | 7 | 1 |
| 12 | Audio-rate CV update | 14 | 1 |
| 13 | Programmable pedal supply | 4 | 1 |

Design rule from the speaker stack: nothing puts a converter in the analog main path.

Note: the JLM Sidekick has 3 free slots and ±16 V rails . The vocal hub's VCA stage could be built as a 500-series card that lives in that rack.
