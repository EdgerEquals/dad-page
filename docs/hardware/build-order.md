# Build order [proposal]

Status: **draft plan, 30 Oct 2026.** A dependency-ordered plan built from [decisions.md](decisions.md) (1-17) and [hardware-concepts.md](hardware-concepts.md). Each step lists what it is, what it needs, what it unlocks, whether it's hardware (HW) or software (SW), and what's still open. Steps in the same stage can run in parallel. Every step should work without the next one ("no overcomplexity").

## Stage A: foundations (everything else depends on these)

### A1. Noise, power and grounding rules
- **What:** the zero-Wi-Fi, wired-only rule; no-wireless Pi/CM5 variants; no PoE near audio; linear analog supplies and filtered digital supplies; star ground with one analog-digital join; balanced lines; a quiet Eurorack supply; isolation in every hub.
- **Needs:** nothing. **Unlocks:** every module is designed to these from day one.
- **HW** (a design standard, not one device).
- **Open:** how to power the existing Pi 4 rack without PoE near the audio.

### A2. Main unit and bus
- **What:** the main unit (engine, bus master, global clock) and the custom low-latency bus carrying timestamped events.
- **Needs:** A1. **Unlocks:** every hub, knob, sensor and log.
- **HW + SW.**
- **Open:** Pi CM5 + real-time MCU vs Bela; CAN-FD or other; clock distribution; how the browser engine runs on it.

### A3. Timestamped logging, record button and drive
- **What:** one shared log on the bus clock for MIDI, CV, VCA, knob, audio and later sensor streams; a hard drive on a Pi; a record button lit red. Nothing is saved when it's off.
- **Needs:** A2. **Unlocks:** re-performance, the review loop with Ed's bot, EEG review, room-model data, harmonic-state capture.
- **HW** (button, drive) + **SW** (logger).
- **Open:** log format; which Pi holds the drive.

### A4. Hub module with VCAs and analog switching relays
- **What:** the per-device hub: isolated MIDI/USB/TRS, CV, gates, clock, studio-grade VCAs on every source, compressor insert points, and the digitally controlled analog switching patchbay (latching signal relays, VCA dip on every switch, just another bus node).
- **Needs:** A1, A2. **Unlocks:** volumes from the desk, glass chop, the silence amplifier, autopilot re-routing, the musical ↔ clinical dial's routing, CV-to-DMX.
- **HW** + firmware.
- **Open:** VCA choice; relay type and matrix size; Eurorack-to-+4 dBu level matching.

### A5. Hardware level ceiling
- **What:** an analog limiter and loop-gain guard that software can't override, plus the horn high-pass floor and the sub excursion limit.
- **Needs:** A1 (sits in the main path). **Unlocks:** the silence amplifier, harmonics work at level, guarded feedback, cone breakup.
- **HW only.**
- **Open:** topology for a horn stack with no DSP protection.

## Stage B: sensing

### B1. Room mic and measurement mic analysis
- **What:** the Audio-Technica room mic and the Behringer measurement mic (always on analysis duty), tapped into the engine: live room mapping, energy and ratio thresholds, harmonic amplitude and phase tracking, noise-floor watch.
- **Needs:** A2, A3. **Unlocks:** the room layer (D), harmonic tracking (E), the silence amplifier, guarded feedback.
- **HW** (preamp, tap) + **SW** (analysis).
- **Open:** measurement mic model; a second mic later.

### B2. IR knob camera
- **What:** the IR read-back Pi for synth panels, with the 3-position sync control; also the glass-box stream feed.
- **Needs:** A2, A1 (LED strobe only during exposure). **Unlocks:** two-way sync with synths that can't report, the glass box.
- **HW + SW.**
- **Open:** dot design, angles, a colour camera for the stream.

### B3. Speaker voltage and current sensing
- **What:** isolated, low-voltage sensing at each amp output to read speaker impedance and back-EMF.
- **Needs:** A1, A3. **Unlocks:** measured damping and harmonics work (E); a check on cone protection.
- **HW** + SW readout.
- **Open:** sensing method and isolation; the optional piezo.

## Stage C: motorised knobs and the duet

### C1. Motorised smart knobs
- **What:** knob modules with bezel touch, recall, adaptive mapping, the instrument-select knob, and the performance dials (room, machine-involvement, feedback, breakup, harmonic, EEG, musical ↔ clinical). Motor PWM above 20 kHz, off at target, snubbers.
- **Needs:** A1, A2. **Unlocks:** the duet, recall during replay, every dial-based behaviour.
- **HW** + firmware.
- **Open:** motor and driver choice; dial vs touch bar for musical ↔ clinical.

### C2. Duet with the machine
- **What:** follow the hand, hand back on bezel touch, knob suggestions; shadow layer later. Governed by the machine-involvement dial.
- **Needs:** C1, A3 (logs to learn Ed's gestures). **Unlocks:** autopilot / ghost mode, re-performance replay.
- **SW mainly.**

## Stage D: room layer behaviours
- **What:** room balance (always-on, energy-triggered correction; hub analog filter; house-PA feed), the room dial (damp ↔ crank), slow crossover moves, the room's tail and echoes, the silence amplifier, the background 3D room model Pi.
- **Needs:** B1, A4, A5, C1 (room dial). **Unlocks:** playing the room in builds, the AR/visuals branch.
- **HW** (correction filter, crossover CV, room-model Pi) + **SW.**
- **Open:** filter topology; making the analog crossover CV-steerable; the room-model method.

## Stage E: harmonics
- **What:** a damping control per amp (low-voltage feedback side only), the analog harmonic stage (amount + all-pass phase), and harmonic tracking deciding when to lean in. Two knobs first; macro later. Then the musical ↔ clinical tags and dial across the system.
- **Needs:** A5, B1, B3, C1, A4 (patchbay for the musical ↔ clinical routing). **Unlocks:** the harmonic knob, room coupling as a performance control.
- **HW + SW.**
- **Open:** damping circuit per amp; stage topology; blind tests of phase audibility; the gear tags.

## Stage F: lighting
- **What:** CV-to-DMX on the CV bus; the silent-drop button; the glass-box overlays.
- **Needs:** A4 (CV outs), B2 (feed). Can run in parallel with D and E.
- **HW** (converter, button) + **SW.**

## Stage G: EEG
- **What:** the Muse stream timestamped into the log; Ed wears it first, then a crowd member, for the drop. Mapping evolves through the review loop.
- **Needs:** A3. Can start early as a recording-only experiment.
- **SW mostly; HW** for the link.
- **Open:** a short BLE link with a wired backhaul, or wired body sensors.

## Stage H: cone excursion
- **What:** IR dots on cones; a normal camera for the subs; high-speed camera or per-driver distance sensors for faster drivers; the cone-breakup dial.
- **Needs:** B2 (camera approach), A5, the built horn/sub stack.
- **HW + SW.**
- **Open:** sensors for the mid and horn drivers.

## Stage I: guarded feedback (last)
- **What:** deliberate feedback held under runaway on a chosen note, with the amount on a dial.
- **Needs:** A5 working and tested, B1, H (excursion limits), D.
- **SW + HW** (relies on the ceiling).

## Running alongside everything
- **φ structure** (decision 12) is software on the global clock: possible once A2 exists.
- **Autopilot / ghost mode** grows from C2 and the patchbay (A4).
- **The review loop** with Ed's bot starts as soon as A3 records a first night.
