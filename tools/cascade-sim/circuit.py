# Phase 0 circuit simulator for the dashboard cascade (Danny 15:14 AWST 27 Oct: "Go").
# THE RULE: no dial multiplies a node's amplitude. Every dial is a RUNG, a COUPLING, a THRESHOLD, a LOSS or a PUMP COUNT.
# Three domains (Sky, Machine, Sound) = tank oscillators simulated by their envelope A (amplitude) and phase; loop gain from a
# varactor pumped by n fixed-depth pumps: G = m1 * n * Q / 2 (the parametric-oscillator threshold is G = 1). A zener ceiling.
# Each tank drives a uniform resistive ladder of 8 layers (each node phi^2 below the last in steady state); every node has a
# capacitor (memory tau_k = R_L * C_k, x phi^2 per layer) and a gas gap whose strike voltage comes from Paschen's law for its own
# gas and pressure (heaviest gas at the bottom, pressure falling one golden step per layer; ground pressure = the weather).
# A gap strikes at V_strike and quenches at V_strike * phi^-1; when it strikes it kicks the next node (carry-over, Marx-style)
# and a smaller share back down (bounce), and the discharge carries into the other domains through the coupling k.
import math, json, sys
import numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0]); from paschen import paschen, PHI
GAS = [('xenon', 26, 350, '#b9c8ff'), ('krypton', 17, 240, '#d6ccff'), ('argon', 12, 180, '#9c6bff'), ('air', 15, 365, '#c58ad9'),
       ('nitrogen', 12, 342, '#e98bc4'), ('neon', 4, 100, '#ff5a2a'), ('helium', 3, 34, '#ffb4a2'), ('hydrogen', 5, 130, '#ff4fa3')]
K = len(GAS); DOM = ['Sky', 'Machine', 'Sound']; P0 = 760.0
def strikes(p_ground):                                     # normalised: layer 1 at standard pressure = 1 (a unit, not a dial)
    s1 = paschen(GAS[0][1], GAS[0][2], P0)
    return np.array([paschen(A, B, p_ground * PHI ** -k) / s1 for k, (_, A, B, _) in enumerate(GAS)])
DEFAULT = dict(
    rung=[8, 6, 4],              # RUNG: tank period PHI^rung s
    Q=[PHI ** 4, PHI ** 3, PHI ** 5],   # LOSS: tank Q (= R sqrt(C/L)), i.e. its damping
    pumps=[2, 2, 2],             # PUMP COUNT: varactor pumps per tank (each a fixed depth m1)
    m1=PHI ** -5,                # part value: one pump's modulation depth (fixed, never a dial)
    zener=PHI,                   # THRESHOLD: ceiling in units of layer-1 strike
    drive=[PHI ** -1.5, 0.0, 0.0],   # COUPLING: how strongly the always-on pumps couple into each tank (Sky only by default)
    k=[[0, PHI ** -6, PHI ** -7], [PHI ** -6, 0, PHI ** -6], [PHI ** -7, PHI ** -6, 0]],  # COUPLING between tanks
    tau1=PHI ** 8,               # LOSS: layer-1 memory (s); x PHI^2 per layer
    up=PHI ** -2, down=PHI ** -4,  # COUPLING: carry-over share to the next layer up / back down when a gap strikes
    kick=dict(launch=PHI ** -2, fail=PHI ** -0.5, collide=PHI ** -4, tap=PHI ** -1, bar=PHI ** -5),   # COUPLING per event class
)
def run(hours=6.0, dt=0.1, P=None, radio=(0, 0), taps=(), inputs_off=None, weather=True, seed=7, glow=True):
    P = {**DEFAULT, **(P or {})}; rng = np.random.default_rng(seed); n = int(hours * 3600 / dt)
    T = np.array([PHI ** r for r in P['rung']]); w = 2 * math.pi / T; Q = np.array(P['Q'])
    tau = Q * T / math.pi                                   # tank energy decay time
    G = P['m1'] * np.array(P['pumps']) * Q / 2              # loop gain
    kmat = np.array(P['k'])
    A = np.zeros(3); th = np.zeros(3)
    tauk = P['tau1'] * PHI ** (2 * np.arange(K))            # layer memory
    Rl = 1.0; Rs = 1.0; C = tauk / Rl                       # uniform resistive ladder (steady share phi^-2 per layer)
    v = np.zeros((3, K)); on = np.zeros((3, K), bool); last = np.full((3, K), -1e9)
    sparks = []; fires = np.zeros((3, K), int); first = np.full((3, K), np.nan); chatter = np.zeros((3, K), int)
    pumpT = PHI ** (4 + 0.5 * np.arange(13)); pumpPh = 2 * math.pi * ((np.arange(13) + 1) * (PHI - 1) % 1)   # the page pump's 13 modes
    hp = np.zeros(3); hpT = 60 * 15 * PHI ** (2 * np.arange(3)); wx_prev = None   # change filter bank: ~15 min, 40 min, 1.7 h
    sample = max(1, int(10 / dt)); rec = []; above = np.zeros(3)
    t_launch = PHI ** 6; next_launch = t_launch; launch_n = 0; next_col = rng.exponential(60 / 6.5)
    for i in range(n):
        t = i * dt; live = inputs_off is None or t < inputs_off * 3600
        # ---- weather (synthetic Perth afternoon): a front, rain at 2 h, warming; pressure in Torr
        hrs = t / 3600
        p_g = P0 + (2.0 - 3.0 * min(1, max(0, (hrs - 1) / 3))) if weather else P0      # ~ -4 hPa over 3 h
        rain = 1.0 if (weather and hrs > 2) else 0.0; temp = 0.5 * math.sin(2 * math.pi * hrs / 24)
        wx = np.array([p_g / 10, rain, temp])
        if wx_prev is None: wx_prev = wx.copy(); base = np.repeat(wx[None, :], 3, 0)   # filters start settled on the first reading
        S = strikes(p_g) if i % sample == 0 or i == 0 else S
        # ---- inputs into the tanks (drive D in amplitude units per tank time)
        D = np.zeros(3)
        if live:
            pump = 1 + PHI ** -3 * np.mean(np.sin(2 * math.pi * t / pumpT + pumpPh))   # around 1, fixed depth
            D += np.array(P['drive']) * pump
            if weather:   # each band: AC-coupled (steady blocked, step -> spike, creep -> long offset), rectified into Sky
                base += (wx[None, :] - base) * (dt / hpT)[:, None]; band = np.abs(wx[None, :] - base).sum(1); D[0] += PHI ** -2 * band.sum()
            if radio[0] <= hrs < radio[1]: D[2] += PHI ** -1.5 * (0.5 + 0.5 * ((t % 37) / 37))   # the DJ: a track's energy arc
        ev = np.zeros(3)
        if live and t >= next_launch:
            launch_n += 1; next_launch += t_launch; fail = launch_n % 5 == 0
            ev[1] += P['kick']['fail'] if fail else P['kick']['launch']
        if live and t >= next_col: next_col += rng.exponential(60 / 6.5); ev[1] += P['kick']['collide'] * rng.exponential(1)
        for (ts, dur) in taps:
            if live and ts * 3600 <= t < ts * 3600 + dur and rng.random() < dt / 4: ev[1] += P['kick']['tap']
        if live and radio[0] <= hrs < radio[1] and (t % 2.0) < dt: ev[2] += P['kick']['bar']
        # ---- tank envelopes: (G-1) growth, zener ceiling, drive, coupling, kicks
        coup = (kmat * (A[None, :] - A[:, None])).sum(1)
        A += dt / tau * ((G - 1) * A - PHI ** 4 * np.maximum(0, A - P['zener']) + D + coup) + ev      # zener: nothing below its knee, hard above it; k dimensionless on each tank's own time scale
        A = np.maximum(A, 0); th += w * dt
        above += A >= S[0] * PHI ** -1 * PHI ** 0.9
        # ---- ladder: layer 1's gap sits across the tank (node 0 = the tank); layers 2..8 are the uniform RC ladder above it
        v[:, 0] = A
        for k in range(1, K):
            right = v[:, k + 1] if k < K - 1 else 0
            g = 1 / Rs + (1 / Rs if k < K - 1 else 0) + 1 / Rl
            v[:, k] = (C[k] * v[:, k] + dt * (v[:, k - 1] / Rs + right / Rs)) / (C[k] + dt * g)
        # ---- gaps are sparks: at V_strike the node dumps to V_quench = V_strike * PHI^-1; a share of the dump carries up
        #      (Marx-style), a smaller share bounces down, and the discharge carries into the other tanks through k
        strike = v >= S[None, :]
        if strike.any():
            for d, k in zip(*np.nonzero(strike)):
                q = S[k] * PHI ** -1; dump = v[d, k] - q
                if t - last[d, k] < PHI ** 2: chatter[d, k] += 1          # re-struck within PHI^2 s: flutter
                last[d, k] = t; fires[d, k] += 1; sparks.append((t, int(d), int(k)))
                if np.isnan(first[d, k]): first[d, k] = t
                v[d, k] = q
                if k == 0: A[d] = q
                if k + 1 < K: v[d, k + 1] += P['up'] * dump
                if k > 0: v[d, k - 1] += P['down'] * dump
                for e in range(3):
                    if e != d: A[e] += kmat[d][e] * dump
            v[:, 0] = A
        if i % sample == 0:
            awake = (t - last) < PHI ** (np.arange(K)[None, :] + 1)          # afterglow: layer k stays lit PHI^(k+1) s
            rec.append(dict(t=t, A=A.copy(), awake=awake.copy()))
    hrsT = hours
    out = dict(sparks=sparks, G=G.tolist(), Q=Q.tolist(), T=T.tolist(), tau=tau.tolist(), fires=fires.tolist(), first=first.tolist(), chatter=chatter.tolist(),
               above=(above / n).tolist(), S=strikes(P0).tolist(), tauk=tauk.tolist(), rec=rec, hours=hours)
    # load line: steady amplitude with only the always-on drive, A* solves (G-1)A - phi A^3/z^2 + D = 0
    Dm = np.array(P['drive']); Astar = []
    for d in range(3):
        a = 0.0
        for _ in range(4000): a += 0.01 * ((G[d] - 1) * a - PHI ** 4 * max(0, a - P['zener']) + Dm[d])
        Astar.append(a)
    out['Astar'] = Astar
    # RC margin: memory vs PHI^2 x the shortest pump period feeding each domain
    shortest = [PHI ** 4, 60 / 6.5, 2.0]
    out['rc_margin_layer1'] = [tauk[0] / (PHI ** 2 * s) for s in shortest]
    out['rc_margin_tank'] = [tau[d] / (PHI ** 2 * shortest[d]) for d in range(3)]
    # lock: Adler, pair locks if coupling > |delta w| / 2 (k as a rate per s)
    dw = np.abs(w[:, None] - w[None, :]); kk = kmat; out['lock_ratio'] = (kk / np.where(dw > 0, dw / 2, np.inf)).tolist()
    return out
