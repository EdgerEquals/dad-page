/* RATIO CORE (ratiocore1, step 1 of the ratio dial; Danny 10:23-10:56 AWST 30 Oct 2026: 'composers were just choosing ratios ... swap
   out the Golden ratio with any ratio'; 31 Oct 'Yes go' to the ratio-dial order, ratio core first). R is the one base ratio the music is
   built from. Every music file (the engine, extras, effects, voice, bus worklet, desk registry, MIDI writer) reads it here instead of
   defining its own phi, so a later dial can swap it in one place. Step 1 adds no dial: R = phi, and the music is bit for bit as before.
   Loaded as a plain script (window) and into the AudioWorklet (globalThis) before js/dj-bus-worklet.js. No timers, no DOM, no network.
     R, IR        the base ratio and its inverse (today phi and phi^-1)
     PHI, IPHI    the golden ratio itself, for the places still marked 'φ-only: step 2' (the golden draws, which need an irrational
                  step, and the spots that lean on phi's own algebra, phi^2 = phi + 1); they keep phi whatever R becomes until step 2
     rung(n, ref) ref x R^n: a step on the ladder (ref defaults to 1) */
(function (G) {
  'use strict';
  if (G.RatioCore) return;
  var PHI = (1 + Math.sqrt(5)) / 2, R = PHI;                             // phi: the golden ratio; R = phi until the ratio dial (step 3)
  function rung(n, ref) { return (ref == null ? 1 : ref) * Math.pow(R, n); }
  G.RatioCore = Object.freeze({ R: R, IR: 1 / R, PHI: PHI, IPHI: 1 / PHI, rung: rung });
})(typeof window !== 'undefined' ? window : globalThis);
