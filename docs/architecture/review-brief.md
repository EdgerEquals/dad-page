# Review brief: Ed's DJ, a ratio-driven music engine (for outside reviewers)

**Suggested repo path:** `docs/architecture/review-brief.md`. The full map is `docs/architecture/architecture-map.md`.

## What it is
- A generative music engine in plain JavaScript (Web Audio). It runs on a phone web page, and later perhaps on a Raspberry Pi.
- It plays continuous electronic and other styles: drums, bass, chords, lead, voice, four mix buses and a master compressor.
- Nothing is pre-recorded. Every note and sound is generated live from "pumps": slow sine-wave sources driven by real inputs (weather, time of day, tide, moon) and by the owner's desk knobs.

## The principle (the owner's words, paraphrased)
- No rules, no absolute values, no on/off switches.
- Music emerges from ratios: rungs on a ladder, couplings between parts, thresholds that strike and let go, losses and decays, and how many pumps feed a node.
- Effects aren't turned up with a gain. More pumps are added.
- Anything fixed must trace to the owner's approval, a cited source, or a technical limit.
- Today the ratio is the golden ratio φ. The owner's idea: "composers were just choosing ratios".

## The problem we want help with
1. **Words → ratios.** The owner gives guidance in words ("happy", "keep it in this tempo range", "drop it down like this"). Those words were coded as literal numbers and hard limits, for example a tempo wall at 62–157 BPM. How should a feeling word become a set of ratios on the existing building blocks instead?
2. **One swappable base ratio.** φ should sit in one place, so it can be swapped for 3:2, √2 or any ratio, and you can hear how the whole system expresses it.

## What the code looks like now (short)
- φ is defined separately in 9 files and used about 1,970 times.
- φ does four jobs:
  - (a) a step size (one rung = ×φ)
  - (b) splits that add to 1, because φ⁻¹ + φ⁻² = 1
  - (c) "even random" draws, frac(n·φ⁻¹)
  - (d) Fibonacci counts

  Only (a) is the ratio to swap. A rational ratio would make (c) repeat, and (b) would stop adding up.
- Six intent dimensions already exist: drive, density, tension, brightness, weight and space. Each is 1/(1+φ^−X) of the pumps, and the music reads them in about 35 places.
- A mood word still picks a genre list from a lookup table.
- There are about 150 `clamp()` calls. Some are audible hard walls (tempo, melody range, level).
- One place already does it the intended way: a style's "home tempo" folds by octaves and is pulled in softly with tanh in log tempo, a resonance rather than a wall.
- The proposal under discussion is one small core. It holds the base ratio, `rung`, `share` (splits that add to 1 for any ratio), `draw` (on a separate irrational), a threshold with hysteresis, a "cavity" (a soft well with an optional octave fold instead of a clamp) and an RC glide.
- A feeling word becomes an offset vector, in rungs, on the six dimensions.

## Two goals the owner added
- **Learning loop.** Every control change he makes is logged as text (time, control, old → new) next to the audio recording. The assistant reviews log and audio after each performance, later monthly, later about every six months, and proposes ratio changes. He approves them.
- **Live access on a Raspberry Pi.** It may run on a Pi in a Eurorack-format rack, with no phone. He'd use a command-line console (USB keyboard, small HDMI screen, maybe a Eurorack display module) to report bugs to the assistant live while it reads the logs. Low cost and low latency matter. No hardware has been chosen.

## Questions for you
1. Is "a feeling word = an offset vector in rungs on a few intent dimensions, plus one coupling strength" a sound way to map words to ratios? What would you change, or what's missing?
2. To make the base ratio swappable, should step size, splits, quasi-random draws and counts be separate constants? Which of them should follow the base ratio?
3. Is a "cavity" (an octave fold plus a soft tanh pull in log space) a good general replacement for hard limits like a tempo range or a pitch ceiling? Are there better forms?
4. What's the smallest set of building blocks that covers capacitance, resistance, impedance, thresholds, boundaries and cavities for music? Is anything redundant or missing?
5. What's a simple plain-text log format for control changes that lines up with an audio recording and is easy to review months later?
6. For a Pi console: what's a low-latency, low-cost way to run a generative Web Audio engine on a Pi, or port it? And how should a remote assistant safely reach the Pi to read logs?

## How to reply
- Short, numbered to match the questions (1–6).
- Say what you'd keep, change or drop, in a sentence or two each.
- Please mark anything you are unsure of.
- Don't assume code you haven't seen. Ask instead.
- Your reply goes to the owner first. Nothing is built from it until he says go.
