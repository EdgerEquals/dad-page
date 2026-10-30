# Harmonics: Ed's thesis (SPECULATIVE)

Status: **final round done, 30 Oct 2026.** The kept parts are now [decision 16](decisions.md#16-harmonics-accepted). This is Ed's idea in his own words (lightly cleaned up from dictation), followed by a few careful starting thoughts. Nothing here is decided except that Ed wants a **harmonic knob** on the system.

## In Ed's words
From about the age of 18 I've had experiences with music where some of them would really light me up inside, and others would be a letdown, or just sound bad. I always asked why. I'm much older now, and I've had many experiences of acoustic music, some with orchestras and many, many acoustic experiences. When you bring in amplification, it's probably an order of magnitude less often that it's a good experience. The thing I've learned is that **it's about harmonics.**

This is why I like a **low-feedback or no-feedback analog approach.** You have to use feedback with buffering sometimes, but I limit it as much as possible from where my signal leaves my machine to where it reaches the air.

When the sound gets to the air, it pressurises the room. That pressure feeds back through the loudspeaker and into my output transformers, and it oscillates there. So you've got an oscillation in the room, in the sound pressure, that's also coupled to an oscillation in the output transformer, and to the valve too: it's pushing back on the valve, impedance-wise, as an oscillation.

This is why old valve guitar amps sound so good: because of this exact thing. Solid state can't do it, because of its topology. Solid-state guitar amps just don't lock you into the room and have modes locking from the room back to the guitarist, especially when there's acoustic feedback.

When all of that happens organically, the way it used to, **the harmonics build, and build, and build.** That is the key to a transcendental music experience: the way the harmonics unfold in the room. This existed for a thousand years in concert halls and churches. Now that we do things with amplification and electricity, it's likely being lost along the way.

I want my system to have a **harmonic knob**. It's probably going to be something like the **phase of the harmonics relative to the fundamental**. Very few people in audio work at this level, just a small group of high-end listeners, composers and technicians, but the level exists.

Some of this is technical, some is engineering, some is poetry, some is music theory, some is physics and some is psychology. There's a lot there.

## Starting thoughts (from Ed's bot, offered carefully)
These are a first pass for the reviewers to push on, not conclusions.

1. **The amp–speaker–room coupling is real, and output impedance is the lever.** Valve amps with low or no global negative feedback have a relatively high output impedance (a low damping factor). The loudspeaker's back-EMF, and the acoustic load the room puts on the cone, then genuinely affect the current and voltage at the output transformer and valve. So "the room pushes back into the amp" is a real electrical effect, not just a metaphor. How large it is in audible terms is the open question.
2. **High-feedback solid state largely clamps it.** A typical solid-state amp with lots of global feedback has a very low output impedance, which holds the speaker terminals to the input signal and suppresses most of that interaction. This fits Ed's guitar-amp observation, although guitar amps also differ in their clipping, sag and speaker choices, so the coupling is probably one ingredient among several.
3. **A variable damping (output impedance) control is a real, buildable "lock into the room" knob.** Mixed current and voltage feedback, or a switchable/variable feedback network, can set an amp's output impedance from tight to loose. **This must be done only on the low-voltage feedback network, never by adjusting high-voltage bias** (see the left-behind note on remote biasing in [decisions.md](decisions.md)). It's worth testing on one of the DIY valve amps.
4. **Harmonic phase relative to the fundamental: test it, don't assume it.** On steady tones, the ear is mostly insensitive to the phase of harmonics. It can become audible on transients, at high level, and at low frequencies, where the waveform shape (its peak factor) changes how drivers, valves and transformers behave and how the ear hears it. A horn stack played loud is exactly where that might show. So it's worth blind listening tests on the real rig.
5. **An analog harmonic stage with amount and phase control is buildable.** For example, a controlled waveshaper or valve stage generating a chosen mix of harmonics, with an all-pass network (or the equivalent) steering their phase relative to the fundamental, under hub CV. That's a candidate for what the harmonic knob does, alongside, or instead of, the damping control above.
6. **The room keeps the ratios.** Halls and churches build harmonics through long decay and many reflections that keep a note's partials ringing together. The room-model, room-tail and guarded-feedback decisions already point the system that way. The harmonic knob could be where they meet.

## Questions for the reviewers
- Is the speaker-to-amp coupling at low damping factor large enough to matter musically at concert levels on a horn stack? How would we measure it?
- What should the harmonic knob actually control: output impedance (damping), harmonic amount, harmonic phase, or a mix?
- How do we test harmonic-phase audibility fairly on this rig?
- What else in acoustics, psychoacoustics, instrument building or music history explains why acoustic music in good rooms so often "lights people up" and amplified music so rarely does?
- Go as speculative as you like, but flag which parts you believe are physics and which are poetry.

## Final round: what we kept and left behind (30 Oct 2026)
Both reviewers agreed on the core: the coupling between room, speaker and amp through a low damping factor (back-EMF and acoustic loading) is real, and **variable damping is the lever.** Ed accepted this filter.

### Kept
- **Variable damping-factor (output impedance) control**, via mixed current and voltage feedback on the **low-voltage side**, per amp or as a master. This is the core of the harmonic knob.
- **The harmonic knob has two dimensions:** room coupling (damping, tight ↔ loose) and a harmonic stage (valve or waveshaper amount, plus all-pass phase relative to the fundamental). Two separate knobs first; a calibrated single macro later.
- **Harmonic analysis in the engine:** the room mic tracks harmonic amplitude and phase relative to the fundamental, and the engine decides when to lean in or back off.
- **Direct coupling measurement:** sense the speaker voltage and current at the amp output (low-voltage, isolated sensing) to read impedance and back-EMF directly. A piezo on the output transformer or baffle is an optional extra.
- **No global negative feedback;** tuned local feedback is allowed where needed (Ed's "buffering where needed").
- **Dead, absorbent rooms:** push more harmonics from the analog drive stages before the amp (the Tube Zone and similar), within the sliding-scale rule.
- **A hardware ceiling on the coupling loop** (already decided).
- **"Harmonic state" capture** is already covered by the record button and logging.

### Left behind
- **The engine dropping the valve amps' high-tension (HT) voltage by 10-15% ("phi-sag"):** that's engine control of high voltage, the same safety cut as remote valve biasing.
- **Raising idle-valve bias for a room-matched hum:** high-voltage bias adjustment, and deliberate hum breaks the noise rule.
- **A motorised baffle moving compression drivers by millimetres:** the alignment only holds for one listening spot, and it's heavy.
- **EEG "frisson" unlocking the harmonic knob:** the headband can't detect it reliably, and the EEG work is focused on the drop.
- **A micro-delay to align back-EMF phase:** not a meaningful control.

### Short corrections
- Room-mode sound pressure doesn't grow "exponentially".
- Back-EMF doesn't really modulate valve bias to make even harmonics. Those come mainly from single-ended valve transfer curves and the output transformer.
- There are no digital effects in Ed's live path to bypass. It's analog end to end.
