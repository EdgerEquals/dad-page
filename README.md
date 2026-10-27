# Dad's page

Danny's dashboard / questionnaire page, live at https://edgerequals.github.io/dad-page/ (moved here from
EdgerEquals/simmie-chat `questionnaire-preview.html` on 25 Oct 2026; the old URL redirects here, keeping the query string and hash).

- `index.html` is the page. Everything it loads is in this repo except:
  - the shared data files `/simmie-chat/age-dial.json` (the age dial) and `/simmie-chat/facts.json` (the shared fact bank), which stay in
    simmie-chat (same origin) so dial and fact updates there keep reaching this page;
  - Google Fonts, Open-Meteo (weather, marine/tide) and the Rebella site status checks (external, read-only).
- Heavy parts load on tap only: both header-logo zooms, their sound engine (`js/logo-sound.js`, `js/logo-sound-dad.js`) and Tone.js
  (`vendor/tone/`, MIT, self-hosted).
- `dials.html` is Danny's dial sandbox (the three Kids Club golden-ratio dials, step x phi / divide by phi, ratios shown live), opened from the
  tiny phi link left of the footer satellite; it loads only on that tap, uses `js/dial-sandbox.js` + `js/season-pumps.js` (unchanged copy
  of the shared season-pumps file), reads no usage record and keeps only its own positions in localStorage `dadDialSandbox.v1`.
- Answers to the questions stay in page memory (nothing is sent anywhere). Usage counts (`js/phi-adapt.js`) stay on the device.
- Page guard: run `bash tools/install_page_guard.sh` once per clone. Removing page elements needs a new line in `.page-guard-allow`
  approved by Danny. Rollback by tag before every change.

## Credits (third-party code)

Danny's rule (27 Oct 2026): always acknowledge anything we use, and expect the same in return.

- **driftbox** (`js/vendor/driftbox-808.js`): the TR-808 voices and renderer from
  [@driftbox/engine](https://github.com/emmettl/driftbox) 0.6.0 by Louis Emmett, MIT licence (full text in the file).
  One of the units in Ed's DJ 808 bank (electro); loaded only when an electro track plays.
- **driftbox 303** (`js/vendor/driftbox-303.js`): the TB-303 voice from the same package (Louis Emmett, MIT), with its ladder
  filter after Antti Huovilainen's model. The main unit of Ed's DJ 303 rack; loaded only when an acid line plays.
- **dx7-synth-js** (`js/vendor/dx7-worklet.js`): the DX7 FM voice by [Matt Montag](https://github.com/mmontag/dx7-synth-js),
  MIT licence (full text in the file), run in an AudioWorklet. The patches are ours (warm bell, tine piano); no factory ROM voices.
  Ed's Juno and Ed's Jupiter (`js/dj-extras.js`) are written from scratch.
- **audiojs/dynamics** (`js/dj-bus-worklet.js`): the master bus compressor's four topologies (VCA / SSL-bus class, FET / 1176
  class, opto / LA-2A class, vari-mu / Fairchild class) and the soft-knee gain computer are adapted from
  [@audio/dynamics](https://github.com/audiojs/dynamics) by Dmitry Iv., MIT licence (notice in the file). Ours adds a linked
  stereo detector, auto make-up from the average gain reduction, a parallel mix and a level-riding saturation stage.
