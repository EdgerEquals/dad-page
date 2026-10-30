# media/emoji-alive: frame strips for the animated emoji trial

These four files are frame strips made from **Noto Animated Emoji** by Google
(https://googlefonts.github.io/noto-emoji-files/), downloaded from
`https://fonts.gstatic.com/s/e/notoemoji/latest/<codepoint>/512.webp` on 30 Oct 2026.

Noto Animated Emoji is licensed under the Creative Commons Attribution 4.0 International licence
(CC BY 4.0, https://creativecommons.org/licenses/by/4.0/). Copyright Google LLC.

Changes made here: each animation is resized from 512 px to 96 px, every second source frame is kept
(60 ms a frame), and the frames are laid side by side in one WebP strip (quality 70), by
`tools/emoji-alive-strips.py`. js/emoji-alive.js plays them (Danny 09:06 AWST 30 Oct 2026).

| file        | emoji             | frames |
|-------------|-------------------|--------|
| 1f680.webp  | rocket            | 10     |
| 1f98b.webp  | butterfly         | 42     |
| 1f42c.webp  | dolphin           | 26     |
| 1f30d.webp  | Earth (Europe-Africa) | 40 |
