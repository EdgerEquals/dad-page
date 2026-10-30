# Open questions

## For reviewers
1. **Main unit:** a Pi CM5 with a real-time MCU and codec, or a Bela? How should the browser engine run there?
2. **Bus:** is CAN-FD right for timestamped events plus a global clock across ~20 hubs and 50+ knobs? How should clock be distributed and drift corrected?
3. **Hub audio:** VCA choice and how to make insert switching click-free. Level matching between Eurorack (about ±5 V) and +4 dBu studio gear.
4. **Smart knob:** motor and driver choice for a ~25 mm knob, bezel sensing, and keeping the motor from fighting the hand.
5. **Camera read-back:** dot or fiducial design on the knob caps, frame rate, occlusion handling, and angle accuracy at stage distance.
6. **Safety:** an analog limiter and loop-gain guard topology that software can't override, for a horn stack with no DSP protection.
7. **Speculative physics:** Is tuning to room modes useful in practice? Can a guarded speaker-to-mic feedback loop be held just under runaway? How well can the crowd be separated from the stack in a room-mic signal?

## Gear details still to confirm (Ed)
- volca fm original or fm2; second Pioneer unit (SP-16?); Arpie firmware; models of the two MIDI controllers.
- Audio-Technica mic model (dynamic or condenser).
- Tube Zone maker; G-series bus compressor maker; whether it has an external sidechain jack.
- Whether the JLM Sidekick has link jumpers between slot pairs.
- Is the Eurorack mix mono? Is there more mixing out of shot?
- Speaker stack: Vitavox model (AK-15 or AK-40); the maker of the broadcast-monitor woofers; multicell horn model; SBP15 quantity; whether the "15-inch and 10-inch noise drivers" mentioned are real or a dictation slip.
- Whether pedal mods (for example a switch jack on the Cathedral) and hardware mods to the analog synths are acceptable.
- The meaning of the "V3A link / high-tone trick" in Ed's old notes.

## Engine (not verified in the code)
- No live MIDI in/out and no hardware control path exist yet (see engine.md). How the engine targets the hubs is open.
- Output latency on the main-unit candidates has not been measured.
