# Ed's DJ: architecture map, and a proposed core (draft, 30 Oct 2026)

For Danny. **Draft only.** Nothing has been committed, pushed or sent.
- **Code read:** `EdgerEquals/dad-page` main at **022f429** (resume3). The engine files are unchanged since the 30 Oct audit (5bd8856), apart from the resume fix (A:1253–1257, A:1328) and `rhythm-continuity.js`, so the audit's line numbers still hold.
- **Line refs:**
  - A = `js/dad-autodj-quiz.js`
  - X = `js/dj-extras.js`
  - F = `js/dj-fx.js`
  - V = `js/dj-voice.js`
  - W = `js/dj-bus-worklet.js`
  - K = `js/dj-desk.js`
  - MI = `js/dj-midi.js`
  - RC = `js/rhythm-continuity.js`
  - PP = `js/phi-pumps.js`
- **Audit refs:** "audit 1.1" means item 1.1 in `dj-rules-audit-2026-10-30.md`. **M-n** marks a fixed value found here that the audit didn't cover, because it is older than the audit's range.
- **Tags:**
  - [C]: read in the code
  - [I]: inferred
  - [P]: a proposal (nothing is decided)
  - [Q]: open for Danny
- **Suggested repo path:** `docs/architecture/architecture-map.md`.

---

## 0. The short version

1. **φ is defined 9 times, not once** [C]. Every audio file declares its own `PHI`, so there is no single place to swap it (§2).
2. **φ does four different jobs in the code.** Only the first is the "ratio" you want to swap:
   - (a) **step size**: one rung of a ladder
   - (b) **splitting**: shares that add up, because φ⁻¹ + φ⁻² = 1
   - (c) **"random but even" draws**: the golden sequence
   - (d) **counts**: Fibonacci numbers

   Swap φ for 3:2 everywhere today and (b) stops adding up and (c) collapses into a 3-step loop (§2.3).
3. **The vocabulary exists, but as copies, not as parts.** Thresholds with hysteresis, RC decays, pump trees, soft walls and rungs are written out inline hundreds of times. The electrical model itself (`tools/cascade-sim/`, Python) isn't what the JS engine runs on [C].
4. **Boundaries are mostly hard walls.** There are about 150 `clamp()` calls in the audio code. Most are harmless 0..1 guards, but some are the audible walls in the audit: tempo 62–157, the melody's degree windows, level 0.25–0.8, and fade 2.06–22.83 s [C].
5. **A "feeling word → numbers" layer already exists, half-built.** Six intent dimensions (drive, density, tension, brightness, weight, space) are each a logistic of the pumps, and the music reads them in about 35 places (§3). But the mood word *also* picks genres from a lookup table and, for "serious", sets the volume to a typed 0.3. That's a switch, not a ratio.

---

## 1. Building blocks as they stand

### 1a. Pumps (sources) [C]
| Block | Where | Built from | Literal instead of derived |
|---|---|---|---|
| Page pump tree: `node(name, n, k0, depth, parent, seed)`, n sine modes on half-rung φ steps | PP:29–33 | φ; Fibonacci pump counts page 13 → logo 8 → … | page depth `0.146` (= φ⁻⁴ typed as a decimal), logo depth `0.09` (≈ φ⁻⁵), `G = 0.6180339887`, `4.236` (= φ³) at PP:36. Frozen decimals don't follow a base swap. |
| Live streams → z in −1..1 against each stream's own range (sun, temp, humidity, wind, pressure, tide, moon, season, knob nudges) | A:58–75 | measured data (cited: Open-Meteo, WMO codes) | none: this layer is clean |
| Four DJ pumps (time, sky, urgency, mood), each the sum of its streams × sign × coupling | A:94–98 | signs (MIDI Bot sweep 4b) and couplings `cpTime`… (C) | signs are taste calls on a dial (A:54 `DadAutoDJ.sign`), so they're fine |
| Pump energy u = 1 / (1 + φ^(Σ pumps)) | A:528 | logistic in base φ | none |
| Emergent Form pumps `fpump` (section 3 modes, length 2, track 2) | A:618 | **a re-implementation** of the PP formula in bars | `89` section cap (audit 1.5), the "must" grammar (audit 1.5) |
| Chip pump (`dj:chip`, 2 modes, period φ^φ) | A:431–436 | PP node | none |
| Ratio pump (site motion) | `js/ratio-pump.js` | lowest feed | weather words typed as numbers ("storm 1, hot .9, sun .8 …"), `0.887`. This is visual, not audio, but it's the same "word → typed number" pattern. |

### 1b. Capacitance (stored energy, memory) [C]
| Block | Where | Notes |
|---|---|---|
| Section energy `fx.e` on the golden ladder `FE = [φ⁻³, φ⁻², φ⁻¹, 1−φ⁻³, 1−φ⁻⁴, 1]` | A:578, A:599–601 | It replaced the old age arc. `1−φ⁻³` relies on φ's own arithmetic (§2.3). |
| Channel meters: each note is a charge pulse into an RC, τ = φ⁻¹ beat | A:873–883 | a real capacitor model ("mapped from parameters", Danny meter1) |
| 303 accent capacitor `u.wow` (charges φ⁻¹ per accent, drains φ⁻²) | X:201 | clean |
| Motif memory: last `MEMN 8` themes, weighted φ^−age | A:460–485 | `8` (audit 1.11), 32-step call (audit 1.12) |
| Stall memory STL (peak hold, τ φ⁵ s) | A:1089 | TECH |
| Servo memory per palette | A:1543, A:1562 | clean |

### 1c. Resistance / loss (damping, decay, glide) [C]
| Block | Where | Literal instead of derived |
|---|---|---|
| `setTargetAtTime` glides (an RC charge, 101 uses) | everywhere | mostly φ-rung τ |
| Note envelopes | A:441–444 INST; X:304–340 | **M-1:** typed seconds and levels: pad a 0.35·d / hold 0.6·d / rel 0.25·d, pluck a 0.003 / rel 0.22, bass rel 0.08, `voice()` default rel 0.2 / a 0.005 (A:402). The newer X shapes are φ rungs (φ⁻⁹ … φ⁻²). |
| Reverb impulse | X:353 | **M-2:** a fixed **2.2 s** impulse, `(1 − i/L)^3` decay, send ramp to 0.35. This overlaps the room question (catch-up Q-J). |
| Mixer level, a loss/rung of φ (≈4.18 dB) per step, −6 off | A:845–868 | DANNY (keep) |
| Compressor/saturation models | W, A:1494, A:1546 | templates in real units, DANNY (keep, audit 1.19) |

### 1d. Thresholds (V: strike and let go) [C]
| Block | Where | Literal instead of derived |
|---|---|---|
| Section pump peak/breakdown/let-go `fmHi φ⁻³`, `fmLo φ⁻⁴`, `fmHy φ⁻⁴` | A:221, A:625 | φ values (audit Q6); `bdLean` electro |
| Servo quiet gate −φ⁶ dB, deadband φ⁻³ | A:1563–1566 | audit 1.20 |
| Load guard levels 0/1/2, "3 calm windows" | A:1081–1087 | audit 2.2: a step, not a gradient |
| Bells gate `belS`; pad modes by energy | A:809; X:319–321 | audit 1.9, 1.27 |
| Chip share drawn against a golden sequence | A:438 | clean (a probabilistic threshold) |
| Electro "sustained" test `a > φ⁻⁵ or hold > dur·φ⁻¹` | A:407 | clean |

The electrical model's gas gap (strike at V, quench at V·φ⁻¹; `docs/electrical-model.md`) is the general form. The engine writes each threshold its own way, and only some have hysteresis [C].

### 1e. Boundaries (walls, folds, soft edges) [C]
| Block | Where | Type today |
|---|---|---|
| Tempo `BPM_LO 62` / `BPM_HI 157` | A:24, A:139, A:145 | **hard wall** (audit 1.1) |
| Tempo home `lockBpm`: octave fold to the window centre, then `tanh` in log tempo | A:136–137 | **fold + soft edge**, the model for the rest |
| Tempo fader ×0.46…×1.35 | K:164 | fixed ends (audit 3.1) |
| Melody degrees 2..16 / 4..13, `TOPM 96` | A:497–504, A:966, A:982 | hard walls (audit 1.13–1.14) |
| Overall level `clamp(…, 0.25, 0.8)`; `vol = 0.3` when mood is "serious" or urgency is "urgent" | A:143–144 | **M-3:** a typed wall, plus a word → number switch |
| Track fade `clamp(φ^(3.5+sf), 2.06, 22.83)` | A:146 | **M-4:** φ^1.5 and φ^6.5 written as decimals (they won't follow a base swap) |
| Track length `φ^max(6, …)` | A:146 | a floor in rungs (fine as a rung, but it's a fixed floor) |
| Channel overload: straight to φ⁻¹ then tanh | A:866 | a soft edge (DANNY drive1) |
| Echo loop ceiling `CEIL = φ⁻²`, feedback cap φ^−½ | F:39 | a soft edge; the ceiling isn't a knob (recheck item) |
| Hearing range 20 Hz–20 kHz | A:231, X:12, W:22 | CITED (keep) |

### 1f. Cavities (resonance, space) [C]
- **Tempo home as a resonance** (A:136): the one place a "range" is already a well that the energy moves inside.
- **Reverb / wash** (X:349–356, F wash): one fixed 2.2 s room (M-2). Room size is waiting on Danny (CLAUDE.md "Next").
- **Echo loop** (F:36–42): a feedback cavity with a soft ceiling.
- **Filter cut** = the root's frequency × φ^(φ² ± brightness) (A:508). That's a resonance placed relative to the key, not in Hz.
  - **M-5:** the `cut:` Hz values in the `GEN` table (A:154–176) look **unused** for tracks, because `makeTrack` overwrites `gx.cut` [I, A:508]. That's dead fixed data.

### 1g. Couplings (C) and impedance [C]
- **The mix genome W:** pump → parameter weights φ^±1 (A:104–129).
- **System couplings:** `cpTime`… (A:80).
- **Vibe reaches:** `vbD`/`vbY`/`vbT`/`vbS` (A:847–866).
- **Tempo lock** `tLk` (A:136).
- **Answer** `resp`, **recall**, **mRh** (A:475–507).
- **Impedance** has no code concept yet [C]. The doc's ladder (input impedance φ·R) is in the Python sim only. Its nearest relative in the engine is glide time: how hard a node resists being moved. → **Q3**.

### 1h. Buses and the amplitude matrix [C]
- **Signal path:** layers → channel level (rung) → overload → four buses (drums / bass / music / front, A:509–518) → bus compressors and the parallel smash (`TPLB`, A:1533) → master `EdBus` (W) → saturation → trim → ceiling.
- **Typed instrument levels** sit *inside* layers:
  - audit 1.24: X 0.07 / 0.05 / 0.16·φ
  - **M-6:** A:441–444 pad ×0.10, pluck ×0.16, bass ×0.22/×0.16/×1.2
  - audit 1.15: chip ×0.45
- **`shape()` (A:536–542) moves layer gains with section energy.** That's an engine-driven amplitude scaling. It isn't a dial, so it isn't a rule break as worded, but it's what "levels as ratios in the amplitude matrix" would replace [I].

### 1i. The desk (dial types) [C]
- About **106 typed knobs** in K: **R 39, C 35, V 16, N 13, L 3**. The visuals desk is included.
- Most knobs' *ranges* (the `L:[…]` lists and min/max) are Claude's choices: "MIDI Bot open ranges" for modeR/loop/hr, the tempo fader ends, phrase 1/2/4/8 (audit 3.1–3.3).
- Switches Danny approved: style pick, form mode, template/model/bus mode, mute/solo, voice never/always (audit 3.6–3.8, 1.31).

### 1j. The genre table (`GEN`, A:152–176): the biggest typed surface [C]
- **M-7:** each style carries typed numbers:
  - `root` (MIDI 43–55) and the root offsets `[-2,0,0,2,3,-3]` (A:489)
  - `mel` 0.08–0.32 and its ×2.2 / ×0.6 strong/weak multipliers (A:497)
  - `rev` 0.18–0.55
  - `swing 0.12` (unread, catch-up V-3)
  - `cut` (see M-5)
  - drum strings, which are patterns (cited conventions for electro)
- `home()` (A:184) already *derives* each genre's place in the six dimensions from its own drums and mode. That's the right direction.

### Literal count (indicator only)
There are about **2,000 numeric literals other than 0/1/2** in the audio files (A 1,091, X 289, K 278, V 118, W 70, F 67, MI 39, RC 35, PP 22). Most of them are:
- φ exponents (`Math.pow(PHI, 3)`: ~330)
- units (12 semitones, 16 steps, ms)
- Fibonacci counts
- cited astronomy (RC)

The audible unapproved ones are the audit's 43 plus M-1…M-7.

---

## 2. Where φ lives

### 2.1 Definitions: 9, one per file [C]
| File:line | Form |
|---|---|
| A:5 | `PHI = 1.6180339887` (typed); `IPH` at A:104 |
| X:12 (+ `IPH` again at X:383) | `(1 + Math.sqrt(5)) / 2` |
| F:15, V:30, K:16, RC:28 | `(1 + Math.sqrt(5)) / 2` |
| W:22 (AudioWorklet, its own scope) | `(1 + Math.sqrt(5)) / 2` |
| MI:25 | inline `1 / ((1 + Math.sqrt(5)) / 2)` |
| PP:28 | `1.6180339887` and `G = 0.6180339887` (typed); exported as `PhiPumps.PHI`, which no audio file reads |

### 2.2 Uses [C]
- About **1,970** `PHI` / `IPH` / `IP` references: A 745, X 463, F 319, V 187, K 132, W 80, RC 41, MI 2.
- Frozen decimals or φ-specific constants that won't follow a swap:
  - A:146 `2.06` / `22.83`
  - PP `0.146`, `0.09`, `4.236`, `G`
  - ratio-pump `0.887`
  - X:107 `/ Math.sqrt(5)` (Binet's normalisation, true only for φ)
  - A:1217 `GA = 0x9E3779B9` (2³²/φ hash)

### 2.3 The four jobs φ does, and what a swap would do [C/I]
| Job | Examples | With another ratio r |
|---|---|---|
| (a) **Rung / step**: value = ref · φⁿ | levels (≈4.18 dB a rung), tempo fader φ⁻⁵ steps, periods φᵏ s, cut φ^(φ²…) | **This is the swappable ratio.** Rungs get bigger or smaller everywhere at once, which is the point. |
| (b) **Splitting**: shares that add to 1 because φ⁻¹ + φ⁻² = 1 | FE `1−φ⁻³`; A:1023 / A:1047 `1 − φ⁻² − φ⁻³` (= φ⁻² only for φ); `lg = φ⁻¹ + (1−φ⁻¹)e`; X:107 shares | They stop summing. They need normalising (share_k = r⁻ᵏ / Σ), or a decision [Q2]. |
| (c) **Even "random" draws**: frac(n·φ⁻¹), `gold()` (A:695, 49 calls), ~33 other `frac(…IPH)` draws, genome Weyl sequence | genre picks, chip notes, motif recall, voice plan | A rational r (3:2, 2:1) makes them **repeat** with a short period. frac(n·2/3) only takes 3 values, and √2 is fine. These need their own irrational constant, kept separate from the "composer ratio" [P]. |
| (d) **Counts**: Fibonacci 2, 3, 5, 8, 13, 89; history 1597; log 89 | pump counts, phrase choices, guard "3" | Integers, so they don't change. Whether they should follow r (e.g. round(rⁿ)) is an open question [Q2]. |

The octave (2:1, and √2 as its midpoint in `lockBpm`) is kept separate from φ in the code [C]. Doubling a frequency is physics, not a composer's ratio choice. It should stay separate [P].

---

## 3. The feeling layer that already exists [C]

**Path:** pumps → six dimensions d = 1 / (1 + φ^−X) (A:94) → the music. Where each dimension is read:

| Dimension | What it moves (file:line) |
|---|---|
| drive | tempo (`sb = −X.drive`, A:142 → `baseBpm`), loop length and root-motion direction (A:249–251), genre closeness (A:194–199), Form lean (A:625, 649), rhythm plan (A:699), voice (V:55) |
| density | melody note chance (A:497), track length (A:142), voicing stack (A:546), rests and ghosts (A:717, 729) |
| tension | spread of every weighted pick D = φ^(φ²·tension) (A:193, 249, 260), vibrato depth (A:423), leap chance (A:499), rhythm (A:702–727), answer (A:767) |
| brightness | mode on the line of fifths (A:495), filter cut (A:508), genre closeness (A:194) |
| weight | bass layer (A:540), phone bass (A:519), level (A:142) |
| space | reverb send (A:512), chord length (A:260), stereo width (A:417), rhythm space (A:700), fade (A:142) |

**What breaks the ratio idea today:**
- **`GENRES`** (A:6): the mood word picks a fixed genre list. This is a lookup, a switch.
- **A:144** `vol = 0.3` when "serious" or "urgent" (M-3).
- **The mood's signs** reach only drive, density and space (A:58). Words have no direct reach into tension, brightness or weight.

---

## 4. Proposed core [P] (for discussion; nothing decided)

### 4.1 Seven building blocks, one file
Proposed file: `js/ratio-core.js`, loaded before the audio and visual files, also posted into the worklet. It would hold:
1. `R`: **the base ratio** (φ today). The *only* place it's set. A desk dial or `?ratio=` could swap it for listening tests.
2. `rung(n, ref)` = ref · Rⁿ (job a).
3. `share(k, n)` = R⁻ᵏ / Σ R⁻ʲ, a split that adds to 1 for any R (job b).
4. `draw(n, stream)`: low-discrepancy draws on a **separate** irrational constant (job c). [Q2: does it stay golden whatever R is?]
5. `gap(x, strike, letGo)`: a threshold with hysteresis (the gas gap). Quench at strike · R⁻¹ by default.
6. `cavity(x, centre, width, fold)`: a boundary as a well, not a wall.
   - optional fold by octaves (2:1, physics)
   - then a soft pull: centre · exp(w · tanh(ln(x/centre) / s))
   - the softness s comes from R (today ln φ · φ⁻¹, A:136)
   - nothing is clamped
7. `tank(τ)` / `glide`: RC charge and decay, where τ is a rung.

**Pumps** stay in `phi-pumps.js`, but they read R and `draw` from the core. `fpump` (A:618) would become a call to it.

Every literal that's left would carry one of the CLAUDE.md origin tags: DANNY / CITED / TECH (approved, cited source, or technical limit).

### 4.2 A feeling word as a vector [P]
- **A word is a point, not a setting.** It's an offset Δ in **rungs of R** on the six existing dimensions, plus one coupling k (how strongly the word pulls against the live pumps, 0..1, a C knob).
- It enters exactly where the stream nudges enter now (X += k·Δ, A:72). Every existing reader in §3 follows without new code.
- It wouldn't choose a genre from a list. The genre draw already weighs closeness in the dimensions (A:194–199), so a word would tilt that draw instead of replacing it. That retires `GENRES` and M-3.
- **Magnitudes are Danny's**, set by ear or read back from his desk moves and MIDI exports. Nothing below is a decided value.

**Worked example: "happy"** (directions only; sizes are open → Q5)

Juslin & Laukka (2003, *Psychological Bulletin* 129(5):770–814, doi:10.1037/0033-2909.129.5.770) review 41 music-performance studies. They report that happiness is typically communicated with fast tempo, high sound level and bright timbre. They also note that notation features such as mode and harmony vary more by culture, so those are **not** taken from that source here.

| Dimension | Direction for "happy" | Source | What follows in the code |
|---|---|---|---|
| drive | + | J&L 2003 (tempo) | tempo up a fraction of a rung (A:142), shorter loops (A:249) |
| brightness | + | J&L 2003 (timbre) | filter cut up (A:508); the mode leans toward the bright end of the fifths line (A:495). Whether "happy" should move the mode is **Q5b**, not taken from the source. |
| "sound level" | + | J&L 2003 | **Not as gain** (Danny's principle): as density + drive into the compressors and clippers, which already exist |
| density, tension, weight, space | ? | none | left at 0 until Danny decides |

**Tracing one entry** (Δ_brightness = +1 rung, k = 1):
1. X_brightness rises by 1.
2. d_brightness = 1 / (1 + R^−X) rises.
3. The filter cut = root · R^(R² + 2d − 1) moves up, and the mode position moves by (d − ½) · `modeR`.
4. With R = φ this is today's maths. Swap R and the same word expresses itself in the new ratio.

**Worked example: the tempo wall as a cavity**
- **Today:** gBpm = clamp(b · φ^tpo, 62, 157) (A:138–139). Below about 62 the fader keeps moving and the music doesn't.
- **[P]** tempo = cavity(b · R^tpo, centre = the style's home or the session tempo, width = a rung of R, fold = 2:1).
  1. **Fold:** a tempo that drifts past half or double the centre is heard as half-time or double-time of the same groove. `lockBpm` already does this (A:137).
  2. **Pull:** the pumps and the energy still move it inside the well, softly. The tanh is `lockBpm`'s, with s derived from R.
  3. **Fader:** `tpo` keeps working all the way down. Sliding down past the fold flips the groove to its double-time reading rather than stopping [I]. Whether that's what Danny wants to hear is **Q4**.
- 62 and 157 disappear. The only fixed thing left is the 2:1 octave.

### 4.3 A suggested order (Danny decides) [P]
1. Write `ratio-core.js` and point the 9 φ definitions at it. Behaviour stays bit-identical at R = φ, and the tests would prove it.
2. Move jobs (b), (c) and (d) onto `share` / `draw` / counts, so that a swap of R is *safe to hear*.
3. Replace the audible walls with `cavity` / `gap`. Start with tempo, then the melody range, then the level and fade (audit top 10, M-3, M-4).
4. Feeling words as vectors (retire `GENRES` and the 0.3).
5. Move typed instrument levels into the amplitude matrix as `share`s (audit 1.24, M-6).
6. The learning loop's log (§5) from step 1 onward, so every later change is measured against Danny's moves.

---

## 5. Two more goals from Danny (10:32 AWST 30 Oct): goals only; no hardware is specified here

### G1: Learning loop [goal]
- **What he asked for:** when Danny changes a parameter on his hardware, the system logs what changed (time, control, old → new) alongside the audio recording.
  - MIDI Bot reviews log + audio after each performance, later monthly, and eventually about every six months.
  - From that it learns how he likes it to sound and proposes ratio changes. Danny approves them.
  - The log is **text** and is **built in from the start**.
- **What exists now** [C]:
  - **Desk move history:** K:28 `log(id, v)` → `[time, id, new value]`, kept on the phone (`HMAX 1597` entries). "Share my moves" hands over the last 3 days plus the current settings (K:386–391). It records **new values only, not old → new**, and nothing ties it to the audio.
  - **Sound log:** RC:210, 89 lines.
  - **MIDI export:** the last minute (MI). It has bar lines but not desk moves.
- **[P] for discussion:**
  - one line per change: `ISO time · control id · old → new · track/section/bar · R`
  - the same clock as the recording, so a move can be found in the audio
  - plain text, so it can live in the midi repo under the text-only rule
  - proposals back to Danny as "this dial, from x to y rungs, because of these moves"
- **Open:** G1-a to G1-d in §6.

### G2: Live access on a Raspberry Pi [goal]
- **What he asked for:** the system may run on a Pi rack (Eurorack-format modules) with no phone or computer.
  - Danny wants a **command line in front of him**: a USB mechanical keyboard, a small HDMI screen, maybe a Eurorack display module.
  - From there he can tell MIDI Bot about bugs live, and MIDI Bot can check the logs.
  - Low cost, low latency.
- **What exists now:** nothing Pi-side in the repo. DeepSeek's held list mentions a "Pi rack" and "AES HAT" for discussion only (CLAUDE.md) [C].
- **Bearing on the core [P]:**
  - `ratio-core` and the logs should be plain files that any runtime can read, so the same maths and the same log format can run in a browser now and on a Pi later.
  - Whether the engine itself is ported (browser on the Pi, or a native audio engine) is a later decision.
- **Open:** G2-a to G2-d in §6. No hardware is specified here.

---

## 6. Open questions for Danny (one at a time; suggested order)
- **Q1.** Is the step back the order in §4.3? Start with the single R and bit-identical behaviour, then hear swaps.
- **Q2.** When R changes:
  - should the "even random" draws stay golden (my view: yes, because a rational R makes them repeat)?
  - should the Fibonacci counts stay as they are or follow R?
  - should the splits renormalise so they still add up?
- **Q3.** What does **impedance** mean to you in the music? Resistance to being moved (glide time), how much a part loads the one feeding it, or something else? It's the one word in your list with no code behind it.
- **Q4.** Tempo as a cavity: past the fold, do you want to hear half-time/double-time, or a stronger pull back toward home, or both blended by the tempo lock?
- **Q5.** For "happy": how far on drive and brightness (in rungs)? (b) Should a word move the mode at all, given the source says mode is culture-bound? (c) Which other words do you use, so we can collect a vocabulary?
- **Q6.** Should the genre table's typed values (M-7: root, `mel`, `rev`, the ×2.2/×0.6) be derived from the dimensions as `home()` does, or treated as an approved "artistic layer" like the templates?
- **Q7.** Should the `GENRES` mood → genre list and the "serious = level 0.3" line go once words become vectors?
- **G1-a.** Which controls count as "hardware" now: only the desk on the phone, or a MIDI controller too?
- **G1-b.** Where should log + audio live? (The midi repo is text only and under 1 MB, so audio would need to live elsewhere.)
- **G1-c.** Review rhythm: after each session first. When do you want monthly and six-monthly to begin?
- **G1-d.** Should proposals change the ratios themselves or only the defaults of dials?
- **G2-a.** How should MIDI Bot reach the Pi? Over the network, through the repo (the Pi pushes logs and reads replies), or something else? This includes what is and isn't exposed to the internet.
- **G2-b.** Does the Pi run the same browser engine, or a native one?
- **G2-c.** Is the console text-only (typed bug notes), or should it also show the log live?
- **G2-d.** What's the latency target: for sound (audio buffer), or for the console round trip?

## Sources
- Code at 022f429 as cited.
- `docs/electrical-model.md`; `tools/cascade-sim/circuit.py`.
- `dj-rules-audit-2026-10-30.md`, `dj-engine-catchup-2026-10-30.md`.
- Juslin, P. N., & Laukka, P. (2003). Communication of emotions in vocal expression and music performance: Different channels, same code? *Psychological Bulletin*, 129(5), 770–814. https://doi.org/10.1037/0033-2909.129.5.770
