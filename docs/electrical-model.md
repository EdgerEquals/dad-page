# The electrical model of the dashboard

Danny, 27 Oct 2026 (Claude chat, 15:05–15:14 AWST): the whole page — visuals, sound and the cascade between them — is modelled as one
circuit, so it has a visual face, an acoustic face and an electrical face that all obey the same equations. This file is the reference
for the cascade director's parts and for every dial on the desk. Phase 0 simulator: `tools/cascade-sim/` (Python, no page code).
Drawings: `docs/electrical-model-system.svg` (three coupled tanks) and `docs/electrical-model-domain.svg` (one domain and its ladder).

## The rule (check every dial against it)

**No dial multiplies a node's amplitude.** More or faster modulation comes from adding pumps, shifting frequencies up the golden ladder;
an effect's depth is never turned up with a gain (Danny 15:11 AWST 27 Oct).

Every dial must be exactly one of these five. If it is none of them, it is an amplitude multiplier and breaks the rule.

| Kind | What it sets | Examples that pass |
|---|---|---|
| **Rung** | where on the φ ladder a node's period sits | a tank's period φ^n s; a group's afterglow φ^(k+1) s |
| **Coupling** | k, R or C between two nodes | Sky→Machine coupling; a pump's coupling part R_c into its tank; carry-over share up the ladder |
| **Threshold** | the strike voltage of a gap | layer gases and pressures; the zener knee |
| **Loss** | damping at a node | a tank's Q; a layer's leak R (its memory τ = R·C) |
| **Pump count** | how many fixed-depth sources feed a node | number of varactor pumps on Sky |

Fails: "crash amount", "presence peak", "balance depth" as they stand today (js/dad-autodj-quiz.js DIAL colD, js/dj-voice.js VD.peak,
DIAL balD). Converting them is a design change, not a rename: a continuous 0→1 amount becomes a count of discrete golden-rung
sources that either feed the node or don't. It will feel different under the hand; that is intended.

## Mapping

| The page | The circuit |
|---|---|
| a group's stored energy | capacitor, ½CV² |
| inertia, bounce-back, oscillation | inductor, ½LI² |
| losses, memory | resistor; a layer's memory τ = R_L·C |
| handing energy up a layer | the ladder's series resistor |
| coupling between domains (Sky, Machine, Sound) | coupling capacitors k |
| pumps (sun, moon, tide, weather …) | fixed-amplitude AC sources through a coupling part |
| change filter (only change is expressed) | RC high-pass, one per golden band (~15 min, 40 min, 1.7 h) |
| taps, launches, collisions | charge pulses |
| thresholds and promotion | gas gap / neon: strikes at V_strike, quenches at V_strike·φ^-1 |
| a group awake | its lamp lit (afterglow φ^(k+1) s) |
| self-sustaining | varactor (parametric pump) negative resistance: loop gain G = m₁·n·Q/2 ≥ 1 |
| ceiling | zener with its knee above the strike voltage |
| speed | tank rung 1/2π√(LC), and how often the gaps fire |

## Why φ belongs here (claims that can be checked)

1. **The ladder.** A long ladder of identical resistors has input impedance exactly φ·R, and each stage sits exactly φ² below the one
   before (checked numerically to 15 digits). φ is what self-similarity produces: a structure that contains a copy of itself (x = 1 + 1/x).
2. **The most irrational number.** Oscillators tuned in golden steps are the hardest to lock together, so the domains interact without
   collapsing into one beat. Phase 0: the strongest pair (Sky–Machine) sits at 0.52 of the locking threshold.
3. **The neon relaxation oscillator.** A gap fed by a current fires at a fixed height and fires *more often* when fed harder:
   energy shows as frequency, not amplitude, by the physics of the part.

## The stratified atmosphere

Each layer's gap has its own gas and pressure: heaviest gas at the bottom, lightest at the top (the heterosphere order), pressure falling
one golden step per layer; the real weather sets the ground pressure and shifts the whole column. Strike voltage from Paschen's law
(V = B·pd / (ln(A·pd) − ln(ln(1 + 1/γ))), γ = 0.01, gap 1 cm):

| Layer | Gas | Pressure (Torr) | Strike (layer 1 = 1) | Glow |
|---|---|---|---|---|
| 1 | xenon | 760 | 1.000 | blue-lavender |
| 2 | krypton | 470 | 0.475 | pale violet |
| 3 | argon | 290 | 0.248 | violet |
| 4 | air | 179 | 0.323 | purple |
| 5 | nitrogen | 111 | 0.210 | pink-purple |
| 6 | neon | 69 | 0.053 | orange-red |
| 7 | helium | 42 | 0.014 | peach |
| 8 | hydrogen | 26 | 0.032 | magenta |

The ladder only delivers φ^-2(k-1) of the tank voltage to layer k, so from layer 4 up a gap can only fire through carry-over from a
discharge below (Marx-generator style): the chain reaction is the only way up. A real Perth pressure swing (750→773 Torr) moves every
strike voltage by about 2.6 %. Paschen's curve has a minimum, so thinner gas is not always easier: below it, breakdown rises again.

## Near threshold

Supply 2 % above strike, quench at 0.6: a 1 % rise in strike stretches the firing period from 3.0 to 3.7 RC (+23 %), 1.5 % to 4.4 RC
(+46 %); past the supply it stops. Running just under strike is where small real changes become large changes in rate, which is why the
atmosphere needs no scaling. Phase 0, Sky at the edge (drive coupling φ^-5.5, load line 0.92 of strike): 28 sparks/h dry and steady,
74 sparks/h with rain and falling pressure (2.6×). At coupling φ^-1.5 (load line 1.67) it is 66 → 113 (1.7×): further from the edge,
the weather says less.

## Memory margin (flutter guard)

A node's memory should be at least φ² × the shortest pump period feeding it, or noise near threshold makes the gap flutter.
Margin = τ / (φ² × shortest period); keep it ≥ 1, aim for ≥ φ.

## Phase 0 readouts (defaults; 3 h, radio on from 0.5 h)

| Domain | Rung | Q | Tank memory | Pumps | Loop gain | Margin tank / layer 1 | Sparks per hour, layers 1→8 |
|---|---|---|---|---|---|---|---|
| Sky | φ^8 = 47 s | φ^4 = 6.85 | 102 s | 3 | 0.93 | 5.7 / 2.6 | 137, 74, 67, 10, 3, 3, 3, 0.5 |
| Machine | φ^6 = 18 s | φ^3 = 4.24 | 24 s | 2 | 0.38 | 1.0 / 1.9 | 203, 153, 123, 37, 18, 18, 18, 9 |
| Sound | φ^4 = 6.9 s | φ^5 = 11.1 | 24 s | 2 | 1.00 | 4.6 / 9.0 | 550, 335, 256, 88, 44, 44, 44, 22 |

Layer memories: 47 s, 2 min, 5 min, 14 min, 37 min, 1.6 h, 4.2 h, 11 h. No noise flutter anywhere with pumps and radio alone; the
Machine re-strikes (64 in 3 h) are real back-to-back hits (a crash right after a launch). Layers 5–7 fire together as one chain
(neon and helium are so easy that one discharge carries straight through); their gases or pressures are the threshold dials for that.

**Self-sustaining.** With every input switched off at 3 h: loop gain below 1 dies away; one more pump on Sky (G 1.24) and Sound
(G 1.5) keeps them firing on their own. More pumps, faster firing, same height: Sky layer 1 after inputs off = 21/h (4 pumps),
53/h (5), 85/h (6); Sound 142/h (3), 299/h (4), 454/h (5).

## Next

Phase 1 (one shared clock), then the director runs this circuit on that clock; the debug view is the live schematic with loop gain,
Q and load line; the desk's dials are these parts, labelled electrically, each one passing the five-part check.
