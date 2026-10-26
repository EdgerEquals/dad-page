# Dev tool only (not loaded by any page). Renders media/space-loop.webm|mp4 + poster; see the header comment. Run from /workspace/saturnloop2.
# Saturn loop v2 (Danny 12:20 / 12:21 AWST 26 Oct 2026). Builds on /workspace/bg-loop-trial/render.py (same scene, same size and loop).
# Every value is a ratio: PHI powers, cited Saturn data (orbit-ref-data-draft.json: NSSDC_SATURN, NSSDC_RINGS, JPL_HORIZONS_SATURN;
# ring optical depths from NSSDC satringfact via bg-planet-shots/NOTES), the frame size, or the palette anchors.
#   Saturn sweeps across the frame in LOOP * PHI**-4 of the loop, spins fast, full-spectrum bands and rings (hue stepped by the
#   golden angle), and once per pass turns luminous with a rainbow wave travelling across it. Everything else runs faster
#   (whole cycles per loop, so the loop stays seamless).
import numpy as np, os, math, json, colorsys
from PIL import Image, ImageDraw
PHI = (1 + math.sqrt(5)) / 2; IP = 1 / PHI; TAU = 2 * math.pi   # phi: the golden ratio itself
A8 = 255; HEX = 16; CH = 3; SEXT = 6; DEG = 360   # unit: 8-bit channel max, hex base, RGB channels, HSV sextants, degrees per turn
SHADE = (DEG * 5 / 6, DEG / 3)   # anchor: the trial's moon shadow side (render.py chord 300..120 deg, unchanged)
GA = IP * IP                                     # golden angle as a fraction of a turn
REF = json.load(open('/workspace/orbit-ref-data-draft.json'))['ringed_planet']
W, H, FPS, SEC = 720, 1280, 24, 8                # anchor: the existing loop's frame size, frame rate and length (media/space-loop.webm)
N = FPS * SEC; S = 2; SW, SH = W * S, H * S      # 2x supersample
LOOP = SEC
SWEEP = LOOP * PHI ** -4                         # Danny: across the screen in PHI^-4 of the loop
T0 = LOOP * IP * IP                              # sweep starts at the golden fraction of the loop (off-screen across the wrap)
def rgb(h): return tuple(int(h[1 + 2 * i:1 + 2 * i + 2], HEX) for i in range(CH))
TEAL = rgb('#0F5C6E'); DEEP = rgb('#0A3F4C'); SAND = rgb('#F6EBD9'); SKY = rgb('#D6ECEF'); CHAR = rgb('#24292E')   # anchor: Dad's palette
def hsv(h, s, v): return tuple(int(round(c * A8)) for c in colorsys.hsv_to_rgb(h % 1, s, v))
def mix(a, b, t): return tuple(int(round(a[i] * (1 - t) + b[i] * t)) for i in range(CH))
g = np.linspace(0, 1, SH)[:, None, None]
BG = Image.fromarray(((np.array(CHAR) * (1 - g) + np.array(DEEP) * g) * np.ones((1, SW, 1))).round().astype(np.uint8), 'RGB')
rng = np.random.default_rng(11)                   # anchor: the trial's seed (same star field)
NS = round(PHI ** 11 / PHI)                       # about the trial's star count (PHI^10 = 123)
sx = rng.random(NS) * SW; sy = rng.random(NS) * SH
sr = rng.choice([1, PHI ** IP, PHI, PHI ** 2], NS, p=[IP ** 2 + IP ** 4, IP ** 2 - IP ** 6, IP ** 4 - IP ** 7, IP ** 7]) * S   # sizes and shares are phi steps (shares sum to 1)
sh = rng.random(NS)                               # star hue: full spectrum
sa = rng.uniform(IP ** 2, 1 - IP ** 4, NS)
tw = rng.random(NS) < IP ** 2
tk = rng.choice([round(PHI ** 2), round(PHI ** 3), round(PHI ** 4)], NS)   # twinkle cycles per loop (faster; whole numbers = seamless)
tph = rng.random(NS) * TAU
def disc(d, x, y, r, fill): d.ellipse((x - r, y - r, x + r, y + r), fill=fill)
# ---- Saturn (cited shape) ----
F = REF['flattening']; EQ = REF['ring_radii_km']['equator']; RR = REF['ring_radii_km']
SB = math.sin(math.radians(abs(REF['ring_opening_now']['obs_sub_lat_deg']['2026-10-26'])))   # ring opening as seen from Earth now
R = W * S * PHI ** (-7 / 2)                       # planet radius, half a rung under PHI^-3 of the frame width
TILT = -TAU * PHI ** -6                           # ring tilt on screen (about the trial's -16..-20 deg)
# ring regions in planet radii, opacity 1 - exp(-tau) with tau the midpoint of the cited range
RINGS = [(RR['C_inner'] / EQ, RR['B_inner'] / EQ, (5e-2 + 0.35) / 2),        # cite: NSSDC_RINGS C ring tau 0.05-0.35
         (RR['B_inner'] / EQ, RR['B_outer'] / EQ, (0.4 + 2.5) / 2),           # cite: NSSDC_RINGS B ring tau 0.4-2.5
         (RR['B_outer'] / EQ, RR['A_inner'] / EQ, (0 + 0.1) / 2),             # cite: NSSDC_RINGS Cassini division tau 0-0.1
         (RR['A_inner'] / EQ, RR['A_outer'] / EQ, (0.4 + 1.0) / 2)]           # cite: NSSDC_RINGS A ring tau 0.4-1.0
FR = (RR['F'] / EQ, 0.1)                                                      # cite: NSSDC_RINGS F ring tau 0.1
OUT = RR['F'] / EQ
SPIN_TURNS = PHI ** 3                             # turns of the band pattern during one pass (fast spin)
BOX = int(R * OUT * PHI ** IP)
yy, xx = np.mgrid[-BOX:BOX, -BOX:BOX].astype(float)
cu, su = math.cos(TILT), math.sin(TILT)
U = (cu * xx + su * yy) / R; V = (-su * xx + cu * yy) / R
PL = U ** 2 + (V / (1 - F)) ** 2 <= 1
RHO = np.sqrt(U ** 2 + (V / SB) ** 2)
def ring_alpha():
    a = np.zeros_like(RHO)
    for lo, hi, tau in RINGS: a = np.where((RHO >= lo) & (RHO < hi), 1 - math.exp(-tau), a)
    w = IP ** 6
    a = np.where(np.abs(RHO - FR[0]) < w, 1 - math.exp(-FR[1]), a)
    return a
RA = ring_alpha()
def hsv_np(h, s, v):
    h = (h % 1) * SEXT; i = np.floor(h).astype(int) % SEXT; f = h - np.floor(h)
    p = v * (1 - s); q = v * (1 - s * f); t = v * (1 - s * (1 - f))
    r = np.choose(i, [v, q, p, p, t, v]); g = np.choose(i, [t, v, v, q, p, p]); b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], -1)
def saturn(u):                                    # u = 0..1 through the pass
    lat = np.clip(V / (1 - F), -1, 1)
    lon = np.arcsin(np.clip(U / np.sqrt(np.maximum(1 - lat ** 2, IP ** 12)), -1, 1))
    spin = TAU * SPIN_TURNS * u
    band = np.cos(lat * PHI ** 4 * math.pi)                       # zonal bands
    hue = lat * IP + u * IP ** 2 + IP ** 5 * np.sin(lon * round(PHI ** 3) + spin) + IP ** 6 * band   # full spectrum pole to pole
    limb = np.power(np.clip(1 - U ** 2 - (V / (1 - F)) ** 2, 0, 1), IP ** 2)
    lum = 0.0
    a, b = IP ** 2, IP                            # luminous window inside the pass
    if a < u < b: lum = math.sin(math.pi * (u - a) / (b - a)) ** 2
    wave = np.exp(-((U - (PHI * (2 * (u - a) / (b - a) - 1) if a < u < b else -PHI * 2)) * PHI) ** 2)
    sat = IP - IP ** 3 * lum * wave
    val = (IP ** 2 + IP * limb) * (1 - IP ** 4 + IP ** 4 * band) + lum * IP ** 2 * (IP ** 2 + wave)
    hue = hue + lum * wave * (U * IP - u * PHI ** 2)
    pc = hsv_np(hue, sat, np.clip(val, 0, 1))
    rh = RHO * PHI ** 2 + u * PHI + lum * wave * (U * IP)
    rc = hsv_np(rh, IP + IP ** 3 * lum, np.clip(IP + IP ** 2 + lum * IP ** 2 * wave, 0, 1))
    shimmer = 1 - IP ** 4 + IP ** 4 * np.sin(TAU * (RHO * PHI ** 5 - u * PHI ** 3))
    ra = RA * shimmer
    img = np.zeros(U.shape + (CH + 1,))
    back = (V < 0) & ~PL
    for m, col, al in ((back, rc, ra), (PL, pc, np.ones_like(ra)), ((V >= 0) & (RA > 0), rc, ra)):
        al = np.where(m, al, 0)[..., None]
        img[..., :CH] = img[..., :CH] * (1 - al) + col * al; img[..., CH:] = img[..., CH:] * (1 - al) + al
    if lum > 0:                                   # soft glow: brighten the whole sprite a touch while luminous
        img[..., :CH] = np.clip(img[..., :CH] * (1 + lum * IP ** 3), 0, 1)
    return Image.fromarray((img * A8).round().astype(np.uint8), 'RGBA')
# ---- teal system from the trial, faster ----
def teal_planet(Rt):
    size = int(Rt * (2 + IP ** 3 * PHI)); c = size / 2
    p = Image.new('RGBA', (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(p)
    disc(d, c, c, Rt, TEAL + (A8,)); d.ellipse((c - Rt * (1 - IP ** 3), c - Rt * (1 - IP ** 4), c + Rt * IP ** 2, c - Rt * IP ** 6), fill=mix(TEAL, SKY, IP ** 4 + IP ** 7) + (A8,))
    m = Image.new('L', (size, size), 0); disc(ImageDraw.Draw(m), c, c, Rt, A8); p.putalpha(m)
    ImageDraw.Draw(p).ellipse((c - Rt, c - Rt, c + Rt, c + Rt), outline=SKY + (int(A8 * (1 - IP ** 5)),), width=int(PHI ** 2 * S))
    return p
TPR = W * S * PHI ** -4 * IP ** IP; TP = teal_planet(TPR)
ORB = [(TPR * PHI ** 2, TPR * IP ** IP), (TPR * PHI ** 2 * PHI ** IP, TPR * PHI ** IP)]
MOONS = [(0, round(PHI ** 2), IP ** 2, TPR * IP ** 3 * PHI, SAND), (1, -round(PHI ** 3), PHI ** 2, TPR * IP ** 5, hsv(GA, IP ** 2, 1)),
         (1, -round(PHI ** 3), PHI ** 2 + IP * PHI * math.pi / PHI, TPR * IP ** 6 * PHI, hsv(2 * GA, IP ** 2, 1))]
SAT_REVS = round(PHI ** 5)
SHOOT = [(k * IP ** 2 + IP ** 4) % 1 for k in range(round(PHI ** 3))]   # start fractions of the loop, golden spacing
SH_LEN = IP ** 4                                                         # each streak lasts PHI^-4 of the loop
def frame(f):
    t = f / N; T = TAU * t; sec = t * LOOP
    im = BG.copy(); ov = Image.new('RGBA', (SW, SH), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for i in range(NS):
        a = sa[i] * (1 + math.sin(tk[i] * T + tph[i])) / 2 if tw[i] else sa[i]
        r = sr[i] * (1 - IP ** 3 + IP ** 2 * a) if tw[i] else sr[i]
        disc(d, sx[i], sy[i], r, hsv(sh[i], IP ** 3, 1) + (int(A8 * a),))
    for k, s0 in enumerate(SHOOT):
        u = (t - s0) % 1
        if u < SH_LEN:
            u /= SH_LEN; fade = math.sin(math.pi * u)
            x0, y0 = SW * ((k * IP) % 1), SH * ((k * GA) % 1) * IP; ang = TAU * (IP ** 3 + (k * GA) % 1 * IP ** 4)
            L = SW * IP; hx, hy = x0 + math.cos(ang) * L * u, y0 + math.sin(ang) * L * u
            tail = SW * IP ** 4 * min(1, u * PHI ** 2)
            for j in range(round(PHI ** 5)):
                a0 = j / round(PHI ** 5); a1 = (j + 1) / round(PHI ** 5)
                d.line((hx - math.cos(ang) * tail * a0, hy - math.sin(ang) * tail * a0, hx - math.cos(ang) * tail * a1, hy - math.sin(ang) * tail * a1),
                       fill=hsv(k * GA + a0 * IP, IP ** 2, 1) + (int(A8 * fade * (1 - a0)),), width=max(1, int((PHI ** 2 - PHI * a0) * S)))
    im.paste(ov, (0, 0), ov)
    # Saturn pass
    u = (sec - T0) / SWEEP
    if 0 <= u <= 1:
        sp = saturn(u)
        cx = -BOX + (SW + 2 * BOX) * u; cy = SH * IP ** 2 + SH * IP ** 4 * (u - 1 / 2)
        im.paste(sp, (int(cx - sp.width / 2), int(cy - sp.height / 2)), sp)
    # teal system, faster sweep
    cx = SW * IP ** 2 * IP ** IP + SW * IP ** 5 * math.sin(round(PHI ** 2) * T + IP); cy = SH * IP ** IP * PHI ** IP * IP + SH * IP ** 6 * math.sin(round(PHI ** 2) * T)
    ov = Image.new('RGBA', (SW, SH), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for rx, ry in ORB: d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), outline=SKY + (int(A8 * IP ** 2),), width=int(PHI * S))
    pos = []
    for o, rev, ph, r, col in MOONS:
        rx, ry = ORB[o]; a = rev * T + ph; pos.append((math.sin(a) > 0, cx + rx * math.cos(a), cy + ry * math.sin(a), r, col, o == 0 and rev > 0))
    def moon(d, mx, my, r, col, A):
        disc(d, mx, my, r, col + (A8,)); d.chord((mx - r, my - r, mx + r, my + r), SHADE[0], SHADE[1], fill=mix(col, CHAR, IP ** 2) + (A8,))
    def sat(d, mx, my, front):
        a = SAT_REVS * T; sr_ = TPR * IP ** 2 * PHI ** IP; px = mx + sr_ * math.cos(a); py = my + sr_ * IP ** 2 * PHI * math.sin(a)
        if (math.sin(a) > 0) != front: return
        d.rectangle((px - 2 * S, py - 2 * S, px + 2 * S, py + 2 * S), fill=SAND + (A8,))
        d.line((px - PHI ** 4 * S, py, px - PHI ** 2 * S, py), fill=SKY + (A8,), width=2 * S); d.line((px + PHI ** 2 * S, py, px + PHI ** 4 * S, py), fill=SKY + (A8,), width=2 * S)
    for front in (False, True):
        if front:
            im.paste(ov, (0, 0), ov); im.paste(TP, (int(cx - TP.width / 2), int(cy - TP.height / 2)), TP)
            ov = Image.new('RGBA', (SW, SH), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
            for rx, ry in ORB: d.arc((cx - rx, cy - ry, cx + rx, cy + ry), 0, DEG / 2, fill=SKY + (int(A8 * IP ** PHI),), width=int(PHI * S))
        for fr, mx, my, r, col, A in pos:
            if fr == front:
                if A: sat(d, mx, my, False)
                moon(d, mx, my, r, col, A)
                if A: sat(d, mx, my, True)
    im.paste(ov, (0, 0), ov)
    return im.resize((W, H), Image.LANCZOS)
if __name__ == '__main__':
    import sys
    os.makedirs('frames', exist_ok=True)
    only = [int(x) for x in sys.argv[1:]]
    for f in (only or range(N)): frame(f).save(f'frames/{f:04d}.png')
    print('done', N, 'frames; sweep frames', int(T0 * FPS), '..', int((T0 + SWEEP) * FPS))
