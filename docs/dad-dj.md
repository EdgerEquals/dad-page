# Dad's DJ: design notes (moved out of js/dad-autodj-quiz.js on 26 Oct 2026 so the start engine ships lighter)

```
Dad's auto-DJ, generated in the browser (questionnaire preview only; phi rule 10 in /home/box/.config/phi-timing-rules.md).
   Music is synthesised with plain Web Audio (no audio files, no YouTube or streaming, no keys, no copyrighted tracks).
   Dad's side runs on Simmie's faster ladder (every base period x PHI^-1.5). Four pumps add phi steps to s:
     time of day  day 0 | evening (18-21) +0.5 | clear night (21-24) +1.5 (cloudy/wet night counts as evening +0.5) | deep night 00-05 +2
     weather      from the page's own cached Open-Meteo state (window.SIM_WX, 'simwx' event; no new calls):
                  hot -1 | sun -0.5 | storm 0 | cloud 0 | rain +0.5 | fog +1 | (clear night is counted by the time pump) | none 0
     urgency      idle 0 | new -0.5 | urgent -1.5   (no message feed here: idle unless the demo chips change it)
     mood tag     calm +1 | warm +0.5 | proud 0 | playful -0.5 | excited -1 | serious +0.5 | neutral/unknown 0
   From s:  crossfade = PHI^(3.5+s) s, clamped 2.06-22.83, equal-power   BPM = 60 / PHI^(-1+s/2), clamped 62-157
            volume = 0.55 x PHI^(-s/4), clamped 0.25-0.8 (serious or urgent duck to 0.3)
            track length = PHI^(7.5+s) s (Bonnie slot PHI^9 x PHI^-1.5)   genre from mood (neutral plays the proud genre).
   Clock: boundaries fall on multiples of the current crossfade period; pumps are re-read only there, never mid-fade,
   and a new track starts at a boundary. Nothing plays before a tap; the page's sound switch is the master mute.
   The page never reads any message text (there is none here); the demo chips only stand in for Simmie's tags.
   Storage: localStorage 'preview.dadDJ.vol' (slider) + the DJ entry in 'dadRhythm.v1' (js/rhythm-continuity.js). Test hooks: ?mood= ?urgency= ?hour=0-23 ; window.DadAutoDJ.
   CONTINUITY (Danny 13:47 / 13:51 AWST 26 Oct 2026):
     save + restore  on/off, the knob nudges, the genre rotation, the boundary grid and the playing track (genre, BPM, seed, birth time).
                     After a reload or iOS discard the pill shows 'on' at once; sound needs one tap (browser rule), anywhere on the page.
     arrangement     a track's position is a function of wall-clock time since its birth (step = age x BPM x 4 / 60), so catching up is
                     analytic: the seed rebuilds the same motif and progression, whole track lengths that passed while away advance the
                     rotation, and the remainder sets the step.
     keep alive      the mix is routed through a MediaStreamAudioDestinationNode into a hidden <audio> element (iOS treats that as media
                     playback) with a Media Session (lock-screen play / pause / stop); while hidden the scheduler looks PHI^3 s ahead.
                     On return (visibilitychange, pageshow) the context and element resume; if iOS still wants a gesture, one gentle
                     'tap to resume', never a reset.
     knobs           each pump chip opens at its live value; a hand change is a NUDGE in ladder steps on top of the live value, so the
                     live value keeps moving under it; the nudge is saved with the DJ and reset by the daily restart.
```

Split (Danny 14:20 AWST 26 Oct): js/dad-autodj-quiz.js = start engine (tier 1); js/dj-extras.js = lead voices, drums, reverb, knob chips (after first sound).
