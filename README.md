# Dad's page

Danny's dashboard / questionnaire page, live at https://edgerequals.github.io/dad-page/ (moved here from
EdgerEquals/simmie-chat `questionnaire-preview.html` on 25 Oct 2026; the old URL redirects here, keeping the query string and hash).

- `index.html` is the page. Everything it loads is in this repo except:
  - the shared data files `/simmie-chat/age-dial.json` (the age dial) and `/simmie-chat/facts.json` (the shared fact bank), which stay in
    simmie-chat (same origin) so dial and fact updates there keep reaching this page;
  - Google Fonts, Open-Meteo (weather, marine/tide) and the Rebella site status checks (external, read-only).
- Heavy parts load on tap only: both header-logo zooms, their sound engine (`js/logo-sound.js`, `js/logo-sound-dad.js`) and Tone.js
  (`vendor/tone/`, MIT, self-hosted).
- Answers to the questions stay in page memory (nothing is sent anywhere). Usage counts (`js/phi-adapt.js`) stay on the device.
- Page guard: run `bash tools/install_page_guard.sh` once per clone. Removing page elements needs a new line in `.page-guard-allow`
  approved by Danny. Rollback by tag before every change.
