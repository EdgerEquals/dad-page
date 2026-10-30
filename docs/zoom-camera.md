# js/zoom-camera.js: the zoom camera (stage 1, zoomcam1; trimmed in zoomtrim)

The code carries no comments to keep its weight down (Danny t327u, 30 Oct 2026). This note is the commented version: the design, the
citations and the reasons. Plan and measurements: /workspace/solar/zoom-plan-2026-10-30.md (box).

## Design (was the file header)

```
 ZOOM CAMERA, stage 1 (zoomcam1; Danny t307u 30 Oct 2026: "tie our view into the gravity model ... careening around
   like a pinball through all the orbits ... caught into the gravity well of another planet or moon, then flicked back out ... a bias so
   that we mostly are looking at that Sun ... sometimes as a planet comes past we get sucked into it, and that's how we fix the Zoom").
   Loaded late by js/solar-model.js after its first home draw (not under reduced motion: the still home frame stays). Decisions: Danny 30 Oct
   (62% home via a quiet spell; the viewing capsule; crashes as they are for now, a dial later; t325u). Plan: zoom-plan-2026-10-30.md.
   THE CAMERA IS A BODY: a massless probe in the real gravity of the Sun, 8 planets, Pluto and 21 moons (restricted n-body: it feels every
   cited GM in js/solar-system.js at its real place, it pulls nothing, so the cited ephemeris and the fixed Sun stay exact).
     integrator  kick-drift-kick leapfrog (velocity Verlet), step h = PHI^-6 of the smallest local dynamical time sqrt(d^3 / GM) over
                 every body (the rocket's own rule, 588966d), at most PHI^10 (~123) steps a frame (more needed -> the clock waits, never skips)
     gravity     exact point mass outside every body (a sphere's field); inside, the uniform-sphere field GM r / R^3 (never reached: the
                 capsule touches the surface first). Was Plummer softening with epsilon = R, which cut surface gravity by 2^1.5 (capsule work)
     collision   the viewing capsule (Apollo CM, cited below): above 9.1 m/s into a surface it breaks up and a new one starts at home; at or
                 below it bounces (normal speed x PHI^-1, rule 15: the lost energy is the hit's dispersion); a bound bounce ends at its next touch
     the bias    a low-thrust ENGINE (any direction, at most PHI^-2 of the Sun's pull where we are; a declared control choice, not data).
                 Outside every sphere of influence it steers us into a LANE beside the nearest planet's orbit: the planet's own ellipse
                 scaled by k = 1 -+ PHI^(1/2) Hill radii / r, a damped spring on the lane's moving point (w0 = PHI^2 x the planet's mean
                 motion, damping PHI^-1). The lane runs a little faster (inside) or slower (outside) than the planet (Kepler III), so the
                 planet comes to us. Between PHI x SOI and the SOI edge the engine fades out (smoothstep in log distance, rule 6); inside a
                 sphere of influence it is off: every capture, loop and fling is pure gravity. (A beta = 1 solar sail was tried first: it
                 cannot push sunward and lost the Earth lane, 67 -> 330 SOI radii in 40 model s; see the plan.)
   ZOOM FROM DISTANCE (no dial): depth in a sphere of influence (Laplace r = a (m/M)^(2/5)), w = smoothstep(log(r_soi/d) / log(PHI^3)):
     w = 0 at the SOI edge = the home view (Sun on PhiSun, the one true-scale km/px); w = 1 at PHI^-3 of the SOI = the body centred on screen
     with our distance to it at PHI^-1 of the half short side (km/px = d PHI / S, log-blended). Nested: a moon's SOI inside its planet's.
   TIME: one clock for everything. Home: PHI^34 x real. Deep in a well: one local dynamical time sqrt(d^3/GM) per model second (log-blended
     by w, never faster than home), so a pass plays at the same pace at Jupiter or at Phobos (Kepler III, the 3/2 power). 
```

## The quiet spell

THE QUIET SPELL (Danny 30 Oct 2026: "Go with about 62% home"): when a pass ends (the lens is back home) the engine keeps station -
the lane steps out to PHI^2 spheres of influence off the planet's orbit and stops closing on it (its phase tau is held), and the engine,
still capped at PHI^-2 of the Sun's pull, burns prograde inside the sphere of influence (along our speed relative to the planet, the
low-thrust spiral out; it never brakes, so it cannot help a capture) - until
home time has caught up with QUIET x the time spent in passes (viewer seconds, cumulative since load). A capture that outlasts
QUIET^-1 x the home time before it, while home is behind, starts the spell early, from inside the well (the prograde climb), so no
capture holds the view for good. Then the lane closes again from
where we are (on the side of the orbit that closes from here) and gravity does the rest. QUIET = PHI aims at a home share of PHI / (1 + PHI) = PHI^-1 (62%). That ratio is the
ONE free knob; every pass itself (capture, loops, fling) stays pure gravity.

Constants: QUIET = PHI (home : pass time), QOFF = PHI^2 (station, x SOI off the orbit), HOMEW = PHI^-6 ("home" = lens weight below it).

## The viewing capsule

THE VIEWING CAPSULE (Danny t316u 30 Oct: "a viewing capsule that we're in and it has parameters so it can bounce off but if the impact
of the bounce is too strong ... disintegrate and starts again"). Modelled on the Apollo Command Module:
  radius  1.955 m   cite: base diameter 3.91 m (12 ft 10 in), Apollo CSM specifications (en.wikipedia.org/wiki/Apollo_command_and_service_module)
  mass    5560 kg   cite: same (12,250 lb); used for the impact energy dispersed (rule 15)
  VMAX    9.1 m/s   cite: the normal (vertical) touchdown speed the CM was drop-tested to, 30 ft/s: NASA Langley dynamic-model tests,
                    NTRS 19670027235 (38 g peak on water; on sand and hard clay-gravel the heat shield failed at that speed);
                    flight statistics NTRS 19720004141: mean normal impact 8.96 m/s, P(successful impact) = 0.98665
  REST    PHI^-1    no published rebound coefficient for a capsule: a declared phi choice (the same PHI^-1 as before)
A contact whose speed into the surface is above VMAX disintegrates the capsule (debris fades, nothing is reborn from it) and a new one
starts at home. At or below VMAX it bounces. If that bounce leaves it bound to the body (slower than the body's escape speed there) it
can never climb out by itself (the engine is off in a well), so its next touch of the same body ends the ride (stranded): no endless
re-hits. Surfaces: the Sun's photosphere and every body's mean radius (Jupiter .. Neptune: the 1-bar cloud tops, no surface to stand on;
any contact there is far above VMAX anyway), and Saturn's ring plane from the C ring's inner edge to the A ring's outer edge, the plane
taken from Enceladus's orbit (equatorial to 0.02 deg; its cited elements are in js/solar-system.js). Ring particles orbit at the local
circular speed, so there the impact speed is the capsule's whole speed relative to them (they strike every face).

Constants: CAPR = 1.955e-3 km, CAPM = 5560 kg, VMAX = 9.1e-3 km/s, DEAD = PHI^2 viewer seconds of debris.

## Other phi choices in the code

- STEP = PHI^-6 of the smallest local dynamical time; CAP = round(PHI^10) = 123 substeps a frame (4 x CAP per call at most).
- BAND = 3 ln PHI: the lens weight runs over PHI^3 of depth in a sphere of influence (smoothstep in log distance).
- LANE = PHI^-2 SOI off the planet's orbit; W0 = PHI^2 x the lane's mean motion; ZETA = PHI^-1 damping; THR = PHI^-2 of the local solar pull (the engine cap); REST = PHI^-1.
- The engine fades from PHI x SOI to the SOI edge; inside a well it is off except the quiet spell's prograde climb, only while bound, never braking.
- Far off the lane the spring's position error is held at cap / w0^2 (no saturated wind-up).
- pickLane takes the side of the orbit that closes from where we are (was: a whole lap, up to ~50 min at Saturn).
- A capture longer than the home time before it / QUIET while home is behind starts the quiet spell early (the prograde climb).
- x^-3/2 is computed as 1 / (s sqrt s): IEEE-exact everywhere (Math.pow rounds differently across JIT tiers).
- Near a surface (within one radius) the step also resolves the time to reach it (free fall or closing speed, floored at the capsule radius), so a touchdown speed is the real one.
- The lens eases in at PHI^-2 s and out at PHI^0 s (rule 6), so a loop poking out of a sphere of influence does not throw the view home.
- The clock: soft-min over every planet and moon of its local dynamical time per model second against home (PHI^34 x real).
- ZoomCam API used by js/solar-model.js: on, probe (r, hits, dead, debris, home, pass), start(id, gapS), frame(F0). view() and lane() are for tests.

## The parts in js/solar-model.js and js/solar-system.js

- Distance-driven layers (rule 17), by apparent size alpha = real radius / real distance from the capsule (never by the screen):
  alpha < PHI^-10 emoji (L0); PHI^-10 .. PHI^-7 light animation (L1, stage 3: the emoji until then); PHI^-7 .. PHI^-4 the lit disc with
  bands and ring (L2); above PHI^-4 real NASA imagery (L3, stage 4: L2 until then). An emoji smaller than PHI^3 px is no glyph, so there
  the far body stays the home dot. The lit side faces the true Sun on screen, so the phase is real geometry; bands from PHI^5 px.
- Debris (the capsule's end, emoji-collide style): a flash growing PHI^-2 -> PHI over PHI^0 s and 13 fragments on golden angles at
  golden-sequence distances (scale PHI^4 px), cubic ease-out, fading over DEAD = PHI^2 viewer s, timed by the camera's own clock; nothing is
  reborn. Stranded: no debris. A bounce: 3 sparks for PHI^-1 s. No marker, trail or readout: the capsule is the viewer.
- The ping layer's display group (Sun glyph, big Earth, Moon) and the display comet fade by 1 - w while away (stage 2 makes them the real ones).
- zoom-camera.js loads after solar-model's first home draw; reduced motion keeps the still home frame (no camera).
- js/solar-system.js: frame() is the camera's view when ZoomCam.on (else baseFrame(), the home frame); at() places bodies relative to the
  view centre (cx, cy); helio(), baseFrame(), GMS and G are exported for the camera.
