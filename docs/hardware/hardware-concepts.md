# Hardware concepts implied by the decisions

Status: **concept list, 30 Oct 2026.** This is every piece of hardware the [decisions](decisions.md) (1-17) imply, *before* any detailed design. No part numbers are chosen unless an existing doc already names one. It builds on [architecture.md](architecture.md) (main unit, bus, hubs, smart knobs, camera read-back).

- **Decided:** Ed has agreed the concept exists and what it does.
- **Open:** the concept is agreed or proposed, but a key choice is still unmade.

## Performance controls

### Dials
Each is one physical dial (one parameter per dial, per the principles), likely a motorised smart knob so it can be recalled.

| Dial | What it does | Status |
|---|---|---|
| **Room dial** (damp ↔ crank) | Damped (the default lean): quieten the room's resonant modes as much as possible. Cranked: play into them, in a build or solo. Also governs the room's tail, the echoes from the room model, and the silence amplifier. | Decided |
| **Machine-involvement dial** | From fully off to fully playing along: how much the duet, knob suggestions and shadow layer may do. Touch always wins regardless. | Decided |
| **Feedback amount dial** | How much guarded feedback is allowed. The system always holds it under threshold; the hardware ceiling is the backstop. | Decided |
| **Cone-breakup dial** | How much deliberate cone breakup is allowed, within safe measured excursion. | Decided (sensing open, see below) |
| **Harmonic knob, part 1: room coupling** | The per-amp (or master) damping control, tight ↔ loose. See decision 16. | Decided |
| **Harmonic knob, part 2: harmonic stage** | Amount and all-pass phase of the analog harmonic stage relative to the fundamental. Two knobs first; one calibrated macro later. | Decided; macro open |
| **Musical ↔ clinical dial / touch bar** | Shifts the whole architecture between clinical/rigid and musical, through patchbay routing and software settings. A dial or a digital switching touch bar. See decision 17. | Decided; dial vs touch bar open |
| **EEG dial** | How much the EEG signal is allowed to act on the drop. Mapping evolves through the review loop. | Open: mapping |
| Replay-stray amount (re-performance) | How far a replayed night strays from the original. Could share a dial. | Open |

### Buttons and switches
| Control | What it does | Status |
|---|---|---|
| **Record button, lit red** | Press to start, press to stop. Red while recording. Nothing is saved when it's off. | Decided |
| **Autopilot / ghost-mode switch** | The machine performs on its own in Ed's style, and may re-route gear through the patchbay, while he's away. | Decided (concept); behaviour later |
| **Silent-drop button** (or gesture) | Lights black, mix falls to sub + room sound + drone, then slams back. Always called by Ed, never automatic. | Decided |
| 3-position sync control (existing) | Push hardware → software / push software → hardware / live sync, for the camera read-back. | Decided earlier |

## Audio routing and processing

| Concept | Notes | Status |
|---|---|---|
| **Digitally controlled analog switching patchbay** | Audio stays fully analog through **latching signal relays** (hold position with no power, add no noise). Control is digital; the patchbay is **just another node on the bus**. The hub VCA dips briefly during each switch so there's never a click. Re-routes compressors, effects and inserts, including in autopilot. | Decided (concept); relay type, matrix size open |
| **Hub VCAs** | Studio-grade VCAs on every source: volume, chops (glass chop), ducking, sends, silence-amplifier swell, click-free switching dips. | Decided |
| **Compressor insert points** | Switchable inserts so any of the four compressors can go anywhere; studio uses all, live keeps them in the bus chain (sliding scale). | Decided |
| **Analog room-correction filter in a hub** | For the room balance layer on Ed's own stack; slow, ratio-based. Plus a **correction feed output** for house PAs. | Decided; filter topology open |
| **Crossover CV** | The sub/horn crossover moves slowly in small steps. The crossover stays analog. | Decided; how it's made CV-steerable is open |
| **Hardware level ceiling / limiter** | Analog, software can't override. Needed before the silence amplifier and guarded feedback. Includes the fixed horn high-pass floor and a sub excursion limit (from hardware.md). | Decided |
| Analog echo | For the acoustic shadow / room-answer echoes. Existing gear (e.g. the Volante) may cover it. | Open |
| **Damping control per amp** | Variable output impedance via mixed current and voltage feedback, on the **low-voltage feedback network only** (never high-voltage bias or supply). No global negative feedback; local feedback where needed. Per amp, with an optional master. | Decided; circuit open |
| **Analog harmonic stage** | A valve stage or waveshaper (amount) plus an all-pass network (phase relative to the fundamental), under hub CV. In dead rooms, analog drive stages before the amps (e.g. the Tube Zone) get pushed harder. | Decided (concept); topology open |

## Sensing

| Concept | Notes | Status |
|---|---|---|
| **Room mic(s)** | The Audio-Technica mic as the system's ear (alongside the measurement mic): live room mapping, harmonic tracking, energy thresholds, silence-amplifier source, guarded feedback, noise-floor watch. A second mic would sharpen the room model. | One mic decided; second mic open |
| **Behringer measurement mic** (model to confirm, e.g. ECM8000) | The clinical end of the mic spectrum: always on measurement and analysis duty (room mapping, SPL, harmonic tracking), whatever the musical ↔ clinical dial says. | Decided; model to confirm |
| **Speaker voltage and current sensing** | At each amp output, isolated, on the low-voltage side: reads speaker impedance and back-EMF directly, for the harmonics and coupling work. | Decided |
| Piezo on transformer or baffle | Optional extra coupling measurement. | Open (optional) |
| **Background Pi for the 3D room model** | Runs at low priority, builds and refines a room model from room-mic spectral data through the night; feeds echoes, tail, visuals and AR. Keeps per-venue models on the drive. | Decided (concept); method open |
| **IR knob camera Pi** (existing plan) | 940 nm IR LED ring, NoIR camera, pass filter, retroreflective dots. Also feeds the glass-box stream view. | Decided |
| **Colour camera for the stream** | The IR feed is mono; a normal colour camera for a nicer stream picture. | Open |
| **Cone excursion sensing** | A retroreflective IR dot on each cone. A normal camera is fine for slow, large **sub** excursion. Faster midrange and horn drivers need a **high-speed camera or a per-driver IR/laser distance sensor**. Breakup itself is too fast to film. On Ed's own stack. | Decided (concept); sensor per driver type open |
| **Muse EEG link** | The EEG stream must be timestamped into the same recording log. Options: (a) a short Bluetooth LE link to a small receiver right next to the wearer, with a **wired** backhaul; or (b) **wired body sensors** instead (skin-response finger strap or heart-rate sensor) as the zero-radio option. Note: a nearby receiver shortens the link but does not lower the headband's own transmit power. | **Open** |

## Recording and data

| Concept | Notes | Status |
|---|---|---|
| **Hard drive on a Pi** | Stores stems (the only heavy data) plus timestamped MIDI, CV, VCA, knob, EEG and room-model data. Only while the record button is armed. | Decided |
| **One shared timestamped log** | Every stream (dials, MIDI, CV, VCA, audio, EEG, camera) on the bus clock, so recordings can be replayed and reviewed. | Decided |
| Replay into the rig | Recorded control data replayed through the bus, motorised knobs moving to match. | Decided |

## Lighting and visuals

| Concept | Notes | Status |
|---|---|---|
| **CV-to-DMX converter** | On the CV bus, so lights follow the modulation. | Decided |
| Visuals / AR output | Driven by the room model and the glass-box feed. | Open (new branch) |

## Clinical ↔ musical tag (applies to all gear)
Every piece of hardware, and each of its parameters, carries a tag for where it sits between **clinical** (measurement, rigid, precise) and **musical** (artistic, characterful). The musical ↔ clinical dial reads these tags to choose routing and settings. The tags below are a first guess for Ed to correct; parameter-level tags come later.

| Gear | Tag (first guess) |
|---|---|
| Behringer measurement mic | Clinical (fixed: always analysis) |
| Audio-Technica vocal / room mic | Middle (model to confirm) |
| A ribbon mic (if added) | Musical |
| Lavry DA10 | Clinical |
| G-series bus compressor (SSL G-style) | Middle-clinical |
| AudioScape V3A (LA-3A-style opto) | Middle-musical |
| AudioScape V-Comp (valve variable-mu) | Musical |
| AudioScape V1290 preamps (Neve-style) | Musical |
| Tube Zone overdrive, analog harmonic stage | Musical |
| Valve amps: damping tight ↔ loose | Clinical ↔ musical (a parameter-level tag) |
| Hub VCAs, analog switching patchbay | Neutral (they route; they shouldn't colour) |

## Noise and EMF rules (apply to everything above)
Ed avoids Wi-Fi and RF fields. The system must be wired, with zero Wi-Fi and minimal RF, and high-efficiency horns (~105-110 dB/W and up) will expose any hiss or hum.

| Rule | Status |
|---|---|
| **Zero Wi-Fi.** Everything wired: bus, MIDI, CV, audio. | Decided |
| **No-wireless Pi and CM5 variants** bought rather than disabling or removing radios. | Decided |
| **No PoE near the audio.** (The existing Pi 4 rack is PoE; it needs separate, clean power or must sit away from the audio.) | Decided; how the rack is powered is open |
| **Linear supplies for the analog side**, filtered (or remote) switching supplies for the digital side. | Decided |
| **Star ground**, with a single join between analog and digital grounds. Avoid ground loops between Eurorack, valve amps, hubs and USB. Hub isolation (opto MIDI, isolated USB and power). | Decided |
| **Balanced lines** out of the Eurorack, a quiet Eurorack supply, low-noise valves in amp input stages. | Decided |
| **Motor PWM above 20 kHz**, motor drive **off once a knob reaches its target**, snubbers across each motor. | Decided |
| **IR LEDs strobed only during camera exposure**, on a proper constant-current driver with local capacitors. | Decided |
| **Quiet-window pause:** motors and LEDs pause in quiet passages. | Decided |
| **Noise-floor watch:** the room mic tracks the noise floor and flags rising hum as a likely ground loop. Measure rather than trust supply brand claims. | Decided |

## Still open, in one list
1. The damping circuit and harmonic-stage topology, and the later harmonic macro ([harmonics.md](harmonics.md)).
2. The Muse link: short BLE + wired backhaul, or wired body sensors.
3. Cone excursion sensors for the faster drivers.
4. Patchbay matrix size and relay choice.
5. A second room mic, and a colour camera.
6. How the room model is computed, and the AR/visuals branch.
7. Powering the Pi rack without PoE near the audio.
8. The clinical ↔ musical tags for every piece of gear and parameter, and dial vs touch bar.
9. The Behringer measurement mic model.
