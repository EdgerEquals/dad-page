import sys, numpy as np, matplotlib; sys.path.insert(0, '.'); matplotlib.use('Agg'); import matplotlib.pyplot as plt
import circuit
PHI = circuit.PHI; GAS = circuit.GAS
cases = [('Loop gain under 1 (Sky 0.93, Sound 1.0): every input off at 3 h', dict(P=dict(pumps=[3, 2, 2]), radio=(1, 6), inputs_off=3)),
         ('One more pump on Sky and Sound (loop gain 1.24 and 1.5): inputs off at 3 h', dict(P=dict(pumps=[4, 2, 3]), radio=(1, 6), inputs_off=3))]
fig, ax = plt.subplots(4, 2, figsize=(15, 11), sharex=True, gridspec_kw=dict(height_ratios=[1.1, 1, 1, 1]))
fig.patch.set_facecolor('#0b0f14')
for c, (title, kw) in enumerate(cases):
    r = circuit.run(hours=6.0, **kw)
    t = np.array([x['t'] for x in r['rec']]) / 3600; A = np.array([x['A'] for x in r['rec']])
    a0 = ax[0, c]; a0.set_facecolor('#0b0f14')
    for d, col in zip(range(3), ['#7fb7ff', '#ffb35a', '#7dffb0']): a0.plot(t, A[:, d], color=col, lw=0.9, label=f"{circuit.DOM[d]} tank (loop gain {r['G'][d]:.2f})")
    a0.axhline(1, color='#ff6b6b', lw=0.8, ls='--'); a0.text(0.05, 1.03, 'layer-1 strike voltage', color='#ff6b6b', fontsize=8)
    a0.axvline(3, color='#888', lw=0.8, ls=':'); a0.text(3.05, 1.45, 'all inputs off', color='#aaa', fontsize=8)
    a0.axvline(1, color='#555', lw=0.6, ls=':'); a0.text(1.03, 1.45, 'radio on', color='#888', fontsize=8)
    a0.set_ylim(0, 1.65); a0.set_title(title, color='#e8eef4', fontsize=10.5, loc='left'); a0.legend(fontsize=7.5, loc='lower right', facecolor='#111', labelcolor='#ddd', framealpha=.6)
    sp = np.array(r['sparks']) if r['sparks'] else np.zeros((0, 3))
    for d in range(3):
        a = ax[d + 1, c]; a.set_facecolor('#0b0f14')
        sel = sp[sp[:, 1] == d] if len(sp) else sp
        for k in range(8):
            ts = sel[sel[:, 2] == k][:, 0] / 3600 if len(sel) else []
            a.vlines(ts, k + 0.6, k + 1.4, color=GAS[k][3], lw=0.7, alpha=0.9)
        a.set_ylim(0.4, 8.6); a.set_yticks(range(1, 9)); a.set_yticklabels([f'{k+1} {GAS[k][0]}' for k in range(8)], fontsize=7, color='#cfd8e0')
        a.set_ylabel(circuit.DOM[d], color='#e8eef4', fontsize=10); a.axvline(3, color='#888', lw=0.8, ls=':')
        a.tick_params(colors='#8a96a3')
    for a in ax[:, c]:
        for s in a.spines.values(): s.set_color('#2a3440')
    ax[3, c].set_xlabel('hours', color='#cfd8e0')
fig.suptitle('Circuit simulation, 6 h: each tick is a spark in that layer, coloured by its gas; tank levels on top', color='#e8eef4', fontsize=12)
plt.tight_layout(); plt.savefig(sys.argv[1], dpi=105, facecolor=fig.get_facecolor())
print('ok')
