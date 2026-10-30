# Hardware layer: overview and architecture (speculative draft)

## Start here: the challenge
Please answer this before you read any further, including the rest of this page.

### Synths and drum machines
- Behringer RD-8 Rhythm Designer
- Dave Smith Instruments Tempest
- Behringer TD-3
- Behringer Crave
- Behringer MonoPoly
- Korg volca fm
- Behringer K-2
- Behringer Neutron
- Behringer Eurorack modules: 2x CP3A-M, Chaos, 1027 Sequential Controller, Space FX, filter, envelope and attenuator modules, CP1A power supply

### Sequencers, loopers and controllers
- Pioneer DJ Toraiz SQUID
- Pioneer Toraiz SP-16
- Roger Linn Design LinnStrument
- 2x midiphy MBSEQ V4+
- 2x midiphy LoopA v2 (one half-built)
- Sixty Four Pixels Arpie
- Boomerang III Phrase Sampler + Side Car
- Roland E-4 Voice Tweaker
- 2x MIDI controllers

### Effects
- Strymon Volante
- Electro-Harmonix Cathedral
- MI Audio Tube Zone
- Roland MX-1 Mix Performer

### Recording, video and processing
- JLM Audio Sidekick 500-series rack
- JLM Audio VUPPM 500 meter
- 2x AudioScape V1290
- 2x AudioScape V3A
- AudioScape V-Comp
- G-series stereo bus compressor
- JLM Audio stereo VU meter
- Lavry Engineering DA10
- Roland VR-1HD
- Audio-Technica vocal microphone

### Amplification and speakers
- 3x DIY valve power amplifiers (812A-type x2)
- Yamaha DSP-E492
- Speakers: a tall wooden stacked pair, a black coaxial cabinet, a pair of round full-range speakers
- Unassembled speaker components:
  - 2x Vitavox 15-inch drivers (AK-15 or AK-40)
  - 4x Australian-made 15-inch AlNiCo woofers from broadcast monitors
  - JBL 2440 compression drivers
  - 15-inch multicell horns
  - Assorted vintage 12-inch and 10-inch AlNiCo paper-cone drivers
  - Acoustic Elegance SBP15 15-inch subwoofers

### Computers
- 19-inch rack with 4x Raspberry Pi 4 (PoE)
- AMD Ryzen 9 mini PC
- AMD desktop PC

**Reverse-engineer this list objectively and write a profile of who you think bought it.**

---

*Answered? Read on.*

## Where we are (30 Oct 2026)
Three brainstorm rounds are done, about 111 ideas were filtered to a shortlist of 15, and Ed has now decided all 15 (accepted, changed or folded), with a set of global rules that apply to everything. The hardware those decisions imply is listed as concepts, before any detailed design. We're now asking for **one final, deliberately speculative round**, on the decisions and the hardware concepts, and **especially on harmonics**: Ed's thesis that the way harmonics build in a room is what makes music transcendent, and his wanted harmonic knob. After this round, building starts.

**New, read these first:**
- [decisions.md](decisions.md): the global rules and all 15 decisions, with Ed's changes, plus what was left behind.
- [hardware-concepts.md](hardware-concepts.md): every piece of hardware the decisions imply (dials, buttons, patchbay, sensors, recording, noise rules), marked decided or open.
- [harmonics.md](harmonics.md): Ed's harmonics thesis in his words, starting thoughts and questions. **SPECULATIVE.**

Status: **design draft, 30 Oct 2026.** Nothing here is built yet. It's written for outside reviewers.
Owner: Ed ([EdgerEquals](https://github.com/EdgerEquals)). The hardware described here is meant to become a product. The music engine stays Ed's own software.

## What this is
Ed's music engine (this repo, plain JavaScript and Web Audio) currently plays on a phone or computer. The goal is to make it playable through physical hardware: motorised knobs, per-instrument hub modules and his analog synths, drum machines, Eurorack, valve compressors, valve amps and a horn/sub speaker stack. Engine and analog rig should become one low-latency instrument that hears itself and the room.

## Read in this order
| File | What's in it |
|---|---|
| [principles.md](principles.md) | Vision and design principles |
| [engine.md](engine.md) | What the existing MIDI/audio engine in this repo does, from the code |
| [hardware.md](hardware.md) | The gear, its connections, the speaker stack and the signal path |
| [architecture.md](architecture.md) | How it fits together: main unit, bus, hubs, smart knobs, camera read-back, room mic, sync, plus a block diagram and the build roadmap |
| [ideas.md](ideas.md) | **SPECULATIVE.** 15 new-territory ideas and 13 "Stratosphere" performance concepts |
| [open-questions.md](open-questions.md) | What's still unknown or unverified |
| [decisions.md](decisions.md) | The 15 decisions and the global rules (30 Oct) |
| [hardware-concepts.md](hardware-concepts.md) | Hardware concepts the decisions imply, decided or open |
| [harmonics.md](harmonics.md) | **SPECULATIVE.** Ed's harmonics thesis and the harmonic knob |

## Labels used
- **[verified]**: checked against a manufacturer manual, spec page or the code. Sources are linked.
- **[unverified]**: plausible, but not confirmed.
- **[proposal]**: a design suggestion. Nothing is decided.
- **SPECULATIVE**: ideas and concepts that need prototyping before anyone can say they work.

## For reviewers
The questions we'd most like help with:
1. The main unit: a Raspberry Pi CM5 plus a real-time microcontroller, or a Bela? (architecture.md)
2. The custom bus: CAN-FD or something else, and the clock distribution. (architecture.md)
3. The hub module: isolation, VCAs, the CV range and switchable compressor inserts. (architecture.md)
4. Camera-based knob read-back for synths that can't report their own settings. (architecture.md)
5. Which of the ideas in ideas.md are realistic, and which are hand-waving.
6. Final round: the decisions, the hardware concepts, and harmonics (harmonics.md). Be as speculative as you like.
