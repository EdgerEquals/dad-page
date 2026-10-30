# Decisions: the 15 shortlisted ideas

Status: **decided by Ed, 30 Oct 2026.** These are decisions on *what* the system does. Nothing is designed or built yet. The hardware each one implies is listed in [hardware-concepts.md](hardware-concepts.md).

How we got here: three brainstorm rounds with two outside reviewers produced about 111 ideas. They were filtered down to a shortlist of 15. Ed went through the 15 one at a time and accepted, changed or folded each one. The ideas themselves are described in [ideas.md](ideas.md).

## Global rules (apply to every idea)
1. **Everything runs live, at the same time.** None of these is a separate mode or a pre-show step. They are all always on, and each is called on by the music when it's needed.
2. **No soundcheck sweep.** The room is mapped on the fly, all through the set, from the room mic.
3. **Energy-triggered, ratio thresholds.** A behaviour wakes only when the music's energy flows through its threshold (for example, into one of the room's resonances). It holds while the energy stays there, lets go when it leaves, and the result is fed back through the room.
4. **No fixed values.** Every threshold is a ratio, never an absolute number. (This is the engine's existing principle; see [principles.md](principles.md).)
5. **Ed's touch always wins, instantly.** The machine follows and offers. It never fights the hand and never leads.
6. **Sliding scale of gear with the scale of the performance.** In the studio, recording a single stem, an idea can use the whole chain. In a live set it only gets what's free. Every idea is allocated gear this way.
7. **The memory and review loop lives in Ed's conversation with his bot, not in the rig.** The rig just records. After a run of gigs or a tour, Ed and the bot review what the engine put out against what Ed changed. The bot then suggests new gestures and pushes software changes, or Ed makes physical hardware changes.
8. **The hardware concept comes first.** Behaviour and mapping can evolve later in software, but the hardware has to have the infrastructure (inputs, logging, switching, sensors) from the start.

## The 15 decisions

### 1. Room balance layer: ACCEPTED
The room mic hears what the stack actually puts into the room and compares it with what the engine sent. It corrects slowly and gently, in ratios: an analog correction filter in a hub on Ed's own stack, or a correction feed into a house PA. It adjusts as the floor fills.
**Ed's change:** no soundcheck sweep. Always listening, always mapping live, correcting only when the music's energy crosses into a room resonance, and holding only while it stays there.

### 2. Tuned to the building, with a crossover that follows the room: ACCEPTED WITH CHANGE
**Ed's change: one room dial, from damp to crank.**
- Default leans **damped**: the system quietens the room's nasty resonant modes as much as it can. Worst case is a tin-roofed, tin-walled warehouse; those modes get pulled down, not followed.
- **The room never decides where the music goes.** The people's feedback steers the music.
- The exception is Ed's choice on the dial: in a build or a solo he can crank it, pull the music tight into the hard modes and deliberately play the room, then bring it back down.
- The sub/horn crossover moves only slowly and in small steps, so the stack never audibly changes shape.

### 3. The room's tail and the acoustic shadow: ACCEPTED, EXPANDED
In a break, cut the stack and let the venue's own decay be the reverb, then bring the music back as a pad. An analog echo answers like the room.
**Ed's changes:**
- Not limited to the back wall: use **all** the reflections.
- A **3D model of the room**, built from room-mic spectral data at low priority in the background (possibly on its own Raspberry Pi), refined through the night. Echoes and tail draw on it.
- **New branch:** the room model also feeds visuals and **augmented reality**.
- On the room dial.
- Honest note: one mic gives a rough model (reflection distances and resonances), not a precise 3D map. A second mic or the camera could sharpen it later.

### 4. Duet with the machine: ACCEPTED
Let go of a motorised knob and it carries on your gesture. Touch its bezel and it hands control straight back. Knobs can suggest a move by turning slightly; you accept by taking it further. Later, a hidden "shadow" layer can play its own controls, always yielding to the hand.
**Plus:** a **machine-involvement dial**, from fully off to fully playing along.

### 5. Branching re-performance: ACCEPTED
Every recorded night is saved as stems plus every MIDI, CV, VCA and knob move with timestamps. A night can be replayed into the real rig, with the motorised knobs moving to recreate it, and each replay strays a little.
**Ed's changes:** storage is a **hard drive on one of the Raspberry Pis** (audio is the only heavy data; control logs are tiny). One hardware **record button, lit red while recording**. Press to start, press to stop. If it's not armed, nothing is saved.

### 6. A memory across nights: ACCEPTED, REDESIGNED
**Ed's change:** no live memory feature in the rig. The memory is the review loop (global rule 7): after several gigs or a tour, Ed and his bot review the recordings, and changes come back as software updates or hardware changes. The rig just records. Each venue's room model is still kept on the drive as data, so a return gig starts warm.

### 7. Silence amplifier: ACCEPTED
In the gaps and breakdowns, the room's own sound becomes the source: crowd murmur and the hum of the space, picked up by the room mic and swelled gently through the stack via the hub VCAs. A hard hardware level ceiling stops it running away. Wakes only when the music's energy falls below a ratio threshold. On the room dial.

### 8. CV-driven light and the silent drop: ACCEPTED
The CV that moves the synths also drives the lights through a CV-to-DMX converter, so light follows the modulation rather than flashing on the beat. The **silent drop** (lights black; mix falls to sub, room sound and a drone; then everything slams back) is a **button or gesture Ed calls**, never automatic.

### 9. Glass box: ACCEPTED
The IR camera that already reads the knobs also feeds the stream and venue screens: a clean view of the panels with overlays showing knob values, what the machine is doing, and when Ed takes over. The IR image is mono, so a colour camera may be added for a nicer picture. Ties into the room-model / AR branch.

### 10. EEG: ACCEPTED, REFOCUSED ON THE DROP
**Ed's change: it's about the drop, not colour.**
- **Step 1:** Ed wears the Muse headband. His EEG is recorded on the same timeline as his dial moves, the build and the drop. Ed and his bot then look together: does the build, and the moment the drop lands, show up in his brain data?
- **Step 2:** a crowd member wears it, used only for the drop.
- The mapping, and which parts of the data to use, evolve between Ed and his bot over time through the review loop. The hardware only needs the infrastructure: the EEG stream timestamped into the same recording log as dials, MIDI, CV and audio.
- Caveat: at the drop people tense, move and clench, and muscle and movement artefacts are strong on a four-electrode dry headband. The headband's motion sensor, plus some still or seated sessions, help separate brain from jaw.
- Open: the Bluetooth link (see hardware-concepts.md).

### 11. Performer flow state shapes how much the machine offers: FOLDED INTO EEG
Not built as its own feature. If the EEG recordings show something reliable, it's added later through the review loop.

### 12. Golden-ratio structure on a steady clock: ACCEPTED, SOFTWARE ONLY
The dance clock never moves. Phrases and sections follow Fibonacci lengths (8, 13 bars), and sequencers can run Fibonacci polyrhythms (3:5, 5:8) against each other, beside a slow structural clock. Rhythms reset each phrase so they don't drift. Hardware only needs the global clock. φ is Ed's artistic principle, not a claim about the brain.

### 13. Glass chop: ACCEPTED AS ONE OPTION
Vocal chops through the AudioScape gear: compress first, then chop last with the hub's analog VCAs gated on the clock, for clean analog chop edges. A 1/φ-of-a-bar stutter is one optional flavour, reset each phrase.
**Ed's change:** it ties up a lot of gear, so it follows the sliding scale (global rule 6): the full chain on a single stem in the studio, only what's free live.

### 14. Compression as orchestra → a switching patchbay: VARIATION ACCEPTED
**Ed's variation:** a **digitally controlled analog switching patchbay**. Audio stays fully analog through relays; control is digital, and the patchbay is just another node on the bus. It lets the engine re-route the gear itself (compressors, effects, inserts), especially in **autopilot / ghost mode**: Ed hits an autopilot switch and the machine performs on its own in his style while he's away. The hardware concept has to exist before hardware and software design; the behaviour comes after.

### 15. Guarded feedback: ACCEPTED, BUILT LAST
The stack and the room mic (or a valve or tape loop) feed back on purpose, held just under runaway on a chosen note, with the hardware limiter as the safety net.
**Ed's changes:**
- The **amount of feedback is on a dial**; the system always keeps it under threshold. The hardware ceiling must work first.
- **Cone excursion sensing** on Ed's own stack: a retroreflective dot on each cone, read by camera (the same IR approach as the knobs), to measure excursion and limit it.
- **Cone breakup on a dial:** some breakup sounds good, so allow a controlled amount deliberately, within safe excursion limits. "Turning a problem into a solution."
- Note: a normal camera keeps up with slow, large sub excursion. Faster midrange and horn drivers need a high-speed camera or a per-driver IR/laser distance sensor. Breakup itself happens too fast to film; it's controlled indirectly through drive, with excursion as the safety measure.

## Left behind (and why, briefly)
- **Anti-phase nulling of standing waves, including on a house PA:** a null holds in one spot only and moves with every body; risky on someone else's PA.
- **Tug-of-war, knob resistance:** the knob fighting the hand breaks the "touch wins" rule.
- **AI opener / pre-empting the performer:** the machine offers and follows; it never leads.
- **Heart rate or crowd driving tempo or drops:** the clock stays steady.
- **Robotic patch gantries, mic stands, moving speakers:** too heavy; the relay patchbay covers the useful part.
- **Remote valve biasing from temperature and humidity:** a high-voltage safety risk; bias drifts with valve age and mains, not humidity. Measure, don't adjust.
- **Brain as resonator (alpha-rate sound), infrasonic/ultrasonic/otoacoustic composition, rotary sub:** hearing and safety risks at the levels needed; weak evidence; heavy hardware.
- **EEG gamma bursts as triggers, single EEG bands on single parameters, a "deep state" opening a section:** a consumer headband can't resolve these reliably (now superseded by the drop-focused EEG plan above).
- **"Golden everything" (φ on every time constant, retuning room modes to φ):** the engine already runs on φ ratios; room modes are fixed by the room and can only be played against.
- **Idle knob motion as percussion or breathing:** moving a knob changes its parameter.
- **Heavy sensor kits, crowd phones as a mic array, air density as an input, cross-city synced rigs:** against "as light as possible", or unreliable.
- **State files as NFTs, live lathe cutting, "neural ghost" playback:** off-mission for the performance (possibly a release idea later).
- **Wet finger on a CV jack:** a gimmick next to the LinnStrument and motor knobs.

Parked (not rejected) items stay in the master list for later, for example sub choreography, crowd-load compensation as its own feature, house-PA listen mode, dub and tape tricks, genre palettes and VCA role hand-offs between machines.
