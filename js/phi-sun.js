/* SHARED SUN ANCHOR + SKY CONSTANTS (rule 13, Danny 12:34 AWST 26 Oct 2026). Loaded sync in <head> (tiny). ONE anchor for every orbit and
   sweep: window.PhiSun. Position = phi-ratio of the viewport, top right: x = 1 - PHI^-k, y = PHI^-k (from the top). Moving k moves everything.
   The block between the SKY markers is JSON (plus // comments) and is ALSO read by tools/render-saturn-loop.py, so the video loop and the emoji layers
   share these numbers instead of copying them. cite: AU values from the NSSDC Saturn and Uranus fact sheets (J2000 mean elements). */
(function () {
  'use strict';
  var C = /*SKY*/{
    "k": 4,                           // phi: rung exponent of the Sun position
    "loopSec": 8,                     // anchor: the video loop length (media/space-loop.webm, 8 s)
    "sweepExp": -3,                   // phi: Saturn crosses in LOOP * PHI**-3 (Danny 12:34)
    "spinTurnsExp": 3,                // phi: band turns per pass = PHI**3
    "saturnAU": 9.53707032,           // cite: NSSDC Saturn fact sheet, semimajor axis (AU, J2000)
    "uranusAU": 19.19126393,          // cite: NSSDC Uranus fact sheet, semimajor axis (AU, J2000)
    "saturnEqKm": 60268,               // cite: NSSDC Saturn fact sheet, equatorial radius (km)
    "uranusEqKm": 25559,               // cite: NSSDC Uranus fact sheet, equatorial radius (km)
    "uranusObliquityDeg": 97.77       // cite: NSSDC Uranus fact sheet, obliquity to orbit (deg)
  }/*SKY*/;
  var PHI = (1 + Math.sqrt(5)) / 2;                                      // phi: the golden ratio
  var S = { k: C.k, x: 1 - Math.pow(PHI, -C.k), y: Math.pow(PHI, -C.k), sky: C,
    loop: C.loopSec, sweep: C.loopSec * Math.pow(PHI, C.sweepExp),
    kepler: Math.pow(C.uranusAU / C.saturnAU, 3 / 2),   // cite: Kepler III, period ratio = (semimajor ratio)^(3/2)
    px: function () { return { x: S.x * innerWidth, y: S.y * innerHeight }; } };
  try { var r = document.documentElement.style; r.setProperty('--sun-x', String(S.x)); r.setProperty('--sun-y', String(S.y)); } catch (e) {}
  window.PhiSun = S;
})();
