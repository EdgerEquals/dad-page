# Hardware overview: the rig

Ed's own gear, researched 30 Oct 2026 from manufacturer manuals, MIDI implementation charts and spec pages. **"To confirm"** means the model or detail isn't verified yet. Read-back means the engine can ask the device for its current values.

## How the rig is chosen
Every box is there for its sound, not its price. The synths and drum machines are mostly Behringer recreations of classic circuits (808, 303, Mono/Poly, MS-20, Moog modular), kept because they sound huge and carry analog richness. The outboard is almost all from one maker of vintage recreations, AudioScape, chosen for its character. **Mixing happens inside the Eurorack**, through Moog CP3-style discrete-transistor mixers, and goes from there to valve amps and speakers with no digital stage in between.

## Sources and control
| Device | MIDI | USB | CV / gate / sync | Remote control | Read-back |
|---|---|---|---|---|---|
| Behringer RD-8 (drums) | DIN in/out/thru | MIDI only | 3 trig outs, sync in/out, 11 individual outs | Notes, velocity, clock; SysEx pattern dumps; voice knobs are panel only | Patterns/settings by SysEx; knobs no |
| DSI Tempest (analog drums) | DIN in/out | MIDI | 2 pedal inputs (expression/switch); 6 stereo voice outs | Notes, clock, a fixed CC set (user reports); no MIDI learn | None documented |
| Behringer TD-3 (bass) | DIN in, out/thru | MIDI (most SysEx over USB only) | CV 1 V/oct, gate, sync in, **external filter input** | Notes, bend, clock; no CC | Config/patterns by SysEx; knobs no |
| Behringer Crave | DIN in, out/thru | MIDI | 18 CV in / 14 out (±5 V) | Notes; no knob CCs | None |
| Behringer MonoPoly | DIN in/out/thru | MIDI | CV/trig in/out, VCO/VCF mod in, arp clock | Notes; global settings by SysEx | Global only |
| Korg volca fm (original or fm2, to confirm) | Original: DIN in only | none | Sync in/out | 11 CCs; DX7 SysEx | None |
| Behringer K-2 (MS-20 style) | DIN in/thru | MIDI | Patch bay; external signal processor (pitch-to-CV, envelope follower) | Notes only | None |
| Behringer Neutron | DIN | MIDI | 32-point patch bay | Mod/sustain CCs; global SysEx | Global only |
| Behringer Eurorack row (2x CP3A-M mixers, Chaos, 1027 sequential controller, Space FX, filters, envelopes, others) | none | none | CV/gate/clock | CV only | Hub can sample CV |
| Pioneer Toraiz SQUID (sequencer) | DIN in, 2 outs | MIDI | 2 CV/gate out, clock, DIN sync | Notes, CC lanes, clock | None documented |
| Pioneer Toraiz SP-16 (to confirm) | DIN | MIDI | none | Clock, note/CC | Unverified |
| Roger Linn LinnStrument | DIN or USB | MIDI (fast, bus-powered) | Footswitch | MPE controller | Sends its own playing |
| midiphy MBSEQ V4+ x2 (open source) | 4 in / 8 out DIN each | MIDI + OTG | CV/gate/trig/clock expansion; Ethernet OSC option | Full; firmware is open | Extendable |
| midiphy LoopA v2 x2 (one half-built, open source) | 2 in / 3 out DIN | MIDI | 2 gate ins, footswitch | CC remote, clock | Extendable |
| Arpie (DIY arpeggiator, to confirm) | DIN in/out + sync in | none | Clock | Panel, clock | Unverified |

## Effects and loopers
| Device | Control inputs | Notes |
|---|---|---|
| Strymon Volante (magnetic echo) | Full MIDI CC via TRS EXP jack or USB | Head levels, speed, wear, reverse, infinite hold, kill dry are all CC [verified, midi.guide] |
| EHX Cathedral (reverb) | None (no MIDI, no EXP) | Tap/infinite footswitch only |
| Tube Zone overdrive (likely MI Audio, to confirm) | None | 9-25 V DC supply |
| Boomerang III + Side Car | EXP jack (loop volume or decay); MIDI clock via Pedal Link | Audio looper |
| Roland E-4 Voice Tweaker | TRS MIDI notes, bend, clock; USB-C audio | Vocoder, harmony, looper |
| Roland MX-1 Mix Performer | CC for levels and Beat FX; transmits CC on change | **Used for its Beat FX and break effects, not as the mixer** |
| Roland VR-1HD (AV streaming mixer) | MIDI only via a computer app | 3 HDMI inputs; streaming |

## Audio path (no remote control; the hubs work around these)
- JLM Sidekick 500-series rack with a VUPPM meter, holding 2x AudioScape V1290 preamps (Neve 1290-style) and 2x AudioScape V3A (LA-3A-style opto). 3 slots free.
- AudioScape V-Comp: a valve variable-mu compressor in the 1950s broadcast style.
- G-series stereo bus compressor (SSL G-style; likely AudioScape, to confirm).
- Lavry DA10 DAC, a JLM stereo VU meter.
- Audio-Technica vocal mic used as the **room mic** (model to confirm).
- Three DIY valve power amps (812A-type x2, plus one more).

## Speakers
- **Studio:** Ed's own speakers (a tall wooden stacked pair, a black coaxial cabinet, a pair of round full-range speakers) on the valve amps. These are his monitors.
- **Live: a horn/sub stack, components owned, not yet built.**
  - 2x Vitavox 15-inch (AK-15 or AK-40, to confirm): AlNiCo, made for horn loading.
  - 4x Australian-made 15-inch AlNiCo woofers from broadcast monitors (maker to confirm).
  - JBL 2440 compression drivers (AlNiCo, 2-inch throat, rated from 500 Hz) on 15-inch multicell horns (horn model to confirm).
  - Assorted vintage 12-inch and 10-inch AlNiCo paper-cone drivers.
  - Acoustic Elegance SBP15 15-inch subs (sealed, low distortion, standard Faraday sleeve). Quantity to confirm.
  - Horn tops run near 118 dB/W and the subs about 91 dB/W, so the subs need many more drivers or much more power.

### No monitors, by design
Live, Ed plays in front of the same stack the dancers hear. The path from synth to cone is analog, so there's no digital latency to hide and no need for monitors. For the system design this means:
1. **Never put a converter in the main audio path.** Hubs control VCAs, switches, CV and MIDI, and tap audio *in parallel*.
2. **The latency budget is acoustic** (about 2.9 ms per metre). The engine is the only source with a buffer delay, so it schedules ahead by its measured output latency.
3. **The crossover stays analog.** Horns and subs are aligned physically, not with DSP delay.
4. **The room mic is the only live "monitor":** the system's ear.
5. **Protection lives in analog hardware** (level ceiling, a fixed horn high-pass floor, a sub excursion limit), so the software can't override it.

## Signal path
- **Live / streaming:** sources → Eurorack mix (2x CP3A-M) → bus compression → valve amps → stack.
- **Recording:** compressors in many places; Ed always wants more. Hence **switchable insert points**, so any of the four compressors (V3A x2, V-Comp, G-series) can go anywhere, chosen from the desk.

## Computers available
A 19-inch rack with 4x Raspberry Pi 4 on PoE, a Ryzen 9 mini PC and a desktop PC.

## What the gear tells the hub design
- **Volume over MIDI is nearly impossible.** RD-8, TD-3, Crave, MonoPoly, K-2, Neutron, volca and E-4 have no CC7. Volume has to come from **hub VCAs** or Eurorack VCAs on hub CV, which also gives the system real two-way state, because it owns the volume.
- **No synth can report its knob positions.** Only the MX-1, LinnStrument, Volante (MIDI out on) and the open-source midiphy units transmit changes. That's why the camera read-back exists (architecture.md).
- **No gear supports MIDI 2.0.** MIDI 2.0 lives on Ed's bus and is translated to MIDI 1.0 at each hub.
- **Rough counts across all hubs:** ~18-20 DIN outs, 8-10 DIN ins, 5-7 isolated USB host ports, TRS MIDI (type A/B selectable), 8-16 calibrated CV outs, 8-10 clock/sync outs (PPQN, width and polarity selectable), gate outs at +5 / +12 / +15 V and S-trig.
