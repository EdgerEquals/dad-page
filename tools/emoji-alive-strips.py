#!/usr/bin/env python3
"""Make the frame strips in media/emoji-alive/ from Noto Animated Emoji (Google, CC BY 4.0; see media/emoji-alive/LICENSE.md).
Usage: python3 tools/emoji-alive-strips.py [out_dir]   (needs Pillow with WebP; downloads the four 512 px WebPs)
Each strip: every second source frame (2 x the source's 30 ms frame), resized to PX, side by side, WebP quality Q.
If a frame count changes, update STRIP in js/emoji-alive.js."""
import io, struct, sys, os, urllib.request
from PIL import Image
CODES = ['1f680', '1f98b', '1f42c', '1f30d']   # rocket, butterfly, dolphin, Earth (Danny's four, 26 Oct)
PX, Q = 96, 70                                  # unit: 96 px frames (2x a ~48 px glyph), WebP quality 70
SRC = 'https://fonts.gstatic.com/s/e/notoemoji/latest/%s/512.webp'
def durations(b):
    i, out = 12, []
    while i < len(b):
        t, n = b[i:i + 4], struct.unpack('<I', b[i + 4:i + 8])[0]
        if t == b'ANMF': d = b[i + 20:i + 23]; out.append(d[0] | d[1] << 8 | d[2] << 16)   # ANMF: x, y, w-1, h-1 (3 bytes each), then duration
        i += 8 + n + (n & 1)
    return out
def strip(code, out_dir):
    b = urllib.request.urlopen(SRC % code).read(); d = durations(b); im = Image.open(io.BytesIO(b))
    step = 2 * min(d); starts = [sum(d[:i]) for i in range(len(d))]; n = sum(d) // step
    S = Image.new('RGBA', (PX * n, PX), (0, 0, 0, 0))
    for k in range(n):
        t = k * step; im.seek(max(j for j in range(len(d)) if starts[j] <= t))
        S.paste(im.convert('RGBA').resize((PX, PX), Image.LANCZOS), (k * PX, 0))
    p = os.path.join(out_dir, code + '.webp'); S.save(p, 'WEBP', quality=Q, method=6, alpha_quality=Q)
    print(code, n, 'frames', os.path.getsize(p), 'bytes')
if __name__ == '__main__':
    o = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'media', 'emoji-alive')
    for c in CODES: strip(c, o)
