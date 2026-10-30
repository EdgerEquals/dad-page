# Hardware layer: overview and architecture (speculative draft)

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

## Labels used
- **[verified]**: checked against a manufacturer manual, spec page or the code. Sources are linked.
- **[unverified]**: plausible, but not confirmed.
- **[proposal]**: a design suggestion. Nothing is decided.
- **SPECULATIVE**: ideas and concepts that need prototyping before anyone can say they work.

## For reviewers
**A blind exercise to try first, before reading anything else here:** [gear-profile-challenge.md](gear-profile-challenge.md). It's a plain gear list with one question.

The questions we'd most like help with:
1. The main unit: a Raspberry Pi CM5 plus a real-time microcontroller, or a Bela? (architecture.md)
2. The custom bus: CAN-FD or something else, and the clock distribution. (architecture.md)
3. The hub module: isolation, VCAs, the CV range and switchable compressor inserts. (architecture.md)
4. Camera-based knob read-back for synths that can't report their own settings. (architecture.md)
5. Which of the ideas in ideas.md are realistic, and which are hand-waving.
