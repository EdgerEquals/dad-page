#!/usr/bin/env python3
"""Build media/pad-crew.webp: two original pad workers, 8 frames each, 16x16,
lossless WebP strip. Page palette. Not Nintendo likenesses (no red/green,
no moustache, no M/L caps). Run from the repo root."""
from pathlib import Path
import io
from PIL import Image

# dad-page palette
PAL = [
    (0, 0, 0, 0),           # . transparent
    (0, 0, 0, 255),         # K pure black
    (157, 188, 206, 255),   # L #9DBCCE
    (133, 166, 187, 255),   # M #85A6BB
    (31, 84, 120, 255),     # B #1F5478
    (20, 58, 87, 255),      # D #143A57
    (10, 242, 255, 255),    # C #0AF2FF
]
CH = {'.': 0, 'K': 1, 'L': 2, 'M': 3, 'B': 4, 'D': 5, 'C': 6}

# 8-frame busy loop. A: visor cap + cyan straps + mid overalls.
# B: brimless knit cap + mid straps + dark overalls.
# Ladder is a slim two-rail prop (M), not a broom. Faces: two eye pixels and
# a one-pixel mouth. No moustache, no badges.

A = [
# 0 stand, ladder planted left
[
"................",
".M.M............",
".M.M...CCCC.....",
".MMM...CCCCC....",
".M.M...CLLLC....",
".M.M...KLLLK....",
".M.M....LKL.....",
".M.M...CBBBC....",
".......BBBBB....",
".......BBBBB....",
".......BB.BB....",
".......D...D....",
".......D...D....",
"........D.D.....",
"................",
"................",
],
# 1 step, ladder tilts in
[
"................",
"..M.M...........",
"..M.M..CCCC.....",
"..MMM..CCCCC....",
"..M.M..CLLLC....",
"..M.M..KLLLK....",
"..M.M...LKL.....",
"..M.M.CBBBBC....",
".......BBBBB....",
".......BBBBB....",
"......BB...BB...",
"......D.....D...",
".......D....D...",
"........D..D....",
"................",
"................",
],
# 2 stoop (cleaning, no broom)
[
"................",
"...M.M..........",
"...M.M..........",
"...MMM.CCCC.....",
"...M.M.CCCCC....",
"...M.M.CLLLC....",
"...M.M.KLLLK....",
"...M.M..LKL.....",
"...M.M.CBBBC....",
"......BBBBBB....",
".....BBB..BB....",
".....D.....D....",
"......D....D....",
".......DD.......",
"................",
"................",
],
# 3 reach / fuss at the ground
[
"................",
"....M.M.........",
"....M.M.........",
"....MMM.........",
"....M.M.CCCC....",
"....M.M.CCCCC...",
"....M.M.CLLLC...",
"....M.M.KLLLK...",
"....M.M..LKL....",
"....MMC.BBBBC...",
"......BBBBBB....",
".....D.BB.D.....",
".....D.....D....",
"......D...D.....",
"................",
"................",
],
# 4 stand up, step the other foot, ladder coming with
[
"................",
"..M.M...........",
"..M.M...CCCC....",
"..MMM...CCCCC...",
"..M.M...CLLLC...",
"..M.M...KLLLK...",
"..M.M....LKL....",
"..MMC...BBBBC...",
"........BBBBB...",
"........BBBBB...",
".......BB...B...",
"......D....D....",
"......D....D....",
".......D..D.....",
"................",
"................",
],
# 5 start to raise the ladder
[
"................",
"....M.M.CCCC....",
"....M.M.CCCCC...",
"....MMM.CLLLC...",
"....M.M.KLLLK...",
"....M.M..LKL....",
"....M.M.CBBBC...",
"....M.M.BBBBB...",
"......M.BBBBB...",
"........BB.BB...",
"........D...D...",
"........D...D...",
".........D.D....",
"................",
"................",
"................",
],
# 6 ladder almost up, off balance (slapstick)
[
"................",
".M.M....CCCC....",
".M.M...CCCCC....",
".MMM...CLLLC....",
".M.M...KLLLK....",
".M.M....LKL.....",
".M.M..CBBBBC....",
".M.....BBBBB....",
".......BBBBB....",
"......BB...BB...",
".....D......D...",
"......D.....D...",
".......D...D....",
"................",
"................",
"................",
],
# 7 recover / bump lean, ladder planted again
[
"................",
".M.M............",
".M.M....CCCC....",
".MMM...CCCCC....",
".M.M...CLLLC....",
".M.M...KLLLK....",
".M.M....LKL.....",
".M.M...CBBBC....",
".......BBBBB....",
"......BBBBBB....",
"......BB...B....",
".....D....D.....",
".....D....D.....",
"......D..D......",
"................",
"................",
],
]

B = [
# 0 stand, empty hands (A has the ladder this beat)
[
"................",
"................",
".....MMMMM......",
"....MMMMMMM.....",
"....MLLLLLM.....",
"....KLLLLLK.....",
".....LLKLL......",
"....MDBBBDM.....",
".....DDDDD......",
".....DDDDD......",
".....DD.DD......",
".....K...K......",
".....K...K......",
"......K.K.......",
"................",
"................",
],
# 1 step toward A
[
"................",
"................",
"....MMMMM.......",
"...MMMMMMM......",
"...MLLLLLM......",
"...KLLLLLK......",
"....LLKLL.......",
"...MDBBBDM......",
"....DDDDD.......",
"....DDDDD.......",
"...DD...DD......",
"...K.....K......",
"....K....K......",
".....K..K.......",
"................",
"................",
],
# 2 stoop with A
[
"................",
"................",
"................",
".....MMMMM......",
"....MMMMMMM.....",
"....MLLLLLM.....",
"....KLLLLLK.....",
".....LLKLL......",
"....MDBBBDM.....",
"....DDDDDD......",
"...DDD..DD......",
"...K.....K......",
"....K....K......",
".....KK.........",
"................",
"................",
],
# 3 reach
[
"................",
"................",
"................",
"......MMMMM.....",
".....MMMMMMM....",
".....MLLLLLM....",
".....KLLLLLK....",
"......LLKLL.....",
"....MMDDDDM.....",
".....DDDDDD.....",
"....K.DD.K......",
"....K.....K.....",
".....K...K......",
"................",
"................",
"................",
],
# 4 stand, start to take the ladder
[
"................",
"................",
"....MMMMM.......",
"...MMMMMMM......",
"...MLLLLLM......",
"...KLLLLLK......",
"....LLKLL.......",
"..M.MDBBBDM.....",
"..M..DDDDD......",
"..M..DDDDD......",
"..M.DD...D......",
"..M.K...K.......",
"....K...K.......",
".....K.K........",
"................",
"................",
],
# 5 helping raise (holds lower rails)
[
"................",
"................",
"....MMMMM.......",
"...MMMMMMM......",
"...MLLLLLM......",
"...KLLLLLK......",
"....LLKLL.......",
"...MDBBBDM.M.M..",
"....DDDDD..M.M..",
"....DDDDD..MMM..",
"....DD.DD..M.M..",
"....K...K..M.M..",
"....K...K.......",
".....K.K........",
"................",
"................",
],
# 6 off balance with A, ladder high
[
"................",
"................",
".....MMMMM......",
"....MMMMMMM.....",
"....MLLLLLM.....",
"....KLLLLLK.....",
".....LLKLL......",
"....MDBBBDM.....",
".....DDDDD.M.M..",
"....DDDDDD.M.M..",
"...DD...DD.MMM..",
"...K.....K.M.M..",
"....K....K......",
".....K..K.......",
"................",
"................",
],
# 7 recover, step back
[
"................",
"................",
"......MMMMM.....",
".....MMMMMMM....",
".....MLLLLLM....",
".....KLLLLLK....",
"......LLKLL.....",
".....MDBBBDM....",
"......DDDDD.....",
".....DDDDDD.....",
".....DD...D.....",
"....K....K......",
"....K....K......",
".....K..K.......",
"................",
"................",
],
]

def frame(rows):
    assert len(rows) == 16 and all(len(r) == 16 for r in rows), (len(rows), [len(r) for r in rows])
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = im.load()
    for y, row in enumerate(rows):
        for x, c in enumerate(row):
            px[x, y] = PAL[CH[c]]
    return im

def sheet():
    im = Image.new('RGBA', (16 * 8, 16 * 2), (0, 0, 0, 0))
    for i, rows in enumerate(A):
        im.paste(frame(rows), (i * 16, 0))
    for i, rows in enumerate(B):
        im.paste(frame(rows), (i * 16, 16))
    return im

def main():
    root = Path(__file__).resolve().parents[1]
    out = root / 'media' / 'pad-crew.webp'
    im = sheet()
    buf = io.BytesIO()
    im.save(buf, format='WEBP', lossless=True, exact=True, method=6)
    out.write_bytes(buf.getvalue())
    print(f'wrote {out} {out.stat().st_size} bytes {im.size[0]}x{im.size[1]}')
    # also a nearest-neighbour preview for inspection (16x)
    prev = im.resize((im.size[0] * 16, im.size[1] * 16), Image.Resampling.NEAREST)
    preview = root / 'media' / 'pad-crew-preview.png'
    # don't ship the preview; write beside the script run if asked
    return out, prev

if __name__ == '__main__':
    out, prev = main()
    # local inspection copy, not for the repo
    p = Path('/workspace/pixel/shots/pad-crew-frames-16x.png')
    p.parent.mkdir(parents=True, exist_ok=True)
    prev.save(p)
    print('preview', p, p.stat().st_size)
