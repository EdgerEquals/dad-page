# Vision and principles

## Vision
Electronic music performed live, not played back. Ed has spent about 15 years building his rig of analog synths, drum machines, Eurorack, sequencers and loopers, vintage-recreation compressors, valve amps and speakers. This hardware layer joins that rig to his generative engine so the whole thing behaves as one instrument:
- The engine can drive every machine: notes, clock, CV, levels and effects.
- Ed's hands on any knob are captured and fed back.
- The engine hears every source, and the room, and responds.

## Principles (Ed's, paraphrased)
- **As light as possible.** Nothing heavier than it needs to be. No compromises that add latency (a USB CAN dongle was rejected for that reason).
- **No fixed values.** Use ratios and calibration, not hard-coded numbers. Each CV output stores its own gain/offset ratio. Every device's response is measured and mapped. The engine already works this way (see engine.md).
- **Low latency.** The live audio path from synth to speaker is analog end to end. The hardware never puts a converter into that path; it only controls it and taps it.
- **Isolation built into every module.** Opto-isolated MIDI inputs and isolated USB, to avoid ground loops and hum.
- **Redundancy.** If the software stops, the analog rig keeps playing safely. Safety limits are in hardware.
- **One global clock** for every machine.
- **MIDI 2.0 ready.** MIDI 2.0 runs on Ed's own bus and in the engine, translated to MIDI 1.0 at each hub, since none of the current gear supports MIDI 2.0 [verified for the gear listed].
- **No overcomplexity.** Every layer works without the next one.
- **One parameter per dial**, as far as possible.
- **The power layer comes later.**
