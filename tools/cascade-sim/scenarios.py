import sys, json, numpy as np; sys.path.insert(0, '.')
import circuit
PHI = circuit.PHI
base = dict(pumps=[3, 2, 2])
runs = {
  'R1 pumps + launches only, radio off':           dict(P=base),
  'R2 + radio from 1 h':                           dict(P=base, radio=(1, 6)),
  'R3 + radio + two short visits (taps)':          dict(P=base, radio=(1, 6), taps=[(0.05, 30), (3.0, 30)]),
  'R4 as R2, every input off at 3 h':              dict(P=base, radio=(1, 6), inputs_off=3),
  'R5 as R4, one more pump on Sky and on Sound':   dict(P=dict(pumps=[4, 2, 3]), radio=(1, 6), inputs_off=3),
}
res = {}
for name, kw in runs.items():
    r = circuit.run(hours=6.0, **kw); res[name] = r
    a = np.array([x['A'] for x in r['rec']]); tt = np.array([x['t'] for x in r['rec']]) / 3600
    late = tt > 5
    print(f"\n{name}\n   loop gain G (Sky/Machine/Sound): {[round(x, 3) for x in r['G']]}   load-line A* (Sky): {r['Astar'][0]:.3f} of layer-1 strike")
    print(f"   tank level mean / last hour: {a.mean(0).round(2)} / {a[late].mean(0).round(2)}")
    for dn, f, c, fi in zip(circuit.DOM, r['fires'], r['chatter'], r['first']):
        top = max([k + 1 for k in range(8) if f[k] > 0], default=0)
        print(f"   {dn:8s} fires per layer {f}  highest layer {top}  flutter {sum(c)}")
    aw = np.array([x['awake'] for x in r['rec']]); print('   awake groups at 0.5 h / 2 h / 3.5 h / 5.9 h:', [int(aw[np.argmin(abs(tt - h))].sum()) for h in (0.5, 2, 3.5, 5.9)])
np.save('rec.npy', np.array([[ [x['awake'] for x in res[n]['rec']] ] for n in res], dtype=bool), allow_pickle=False)
json.dump({n: {k: (v if k != 'rec' else None) for k, v in res[n].items()} for n in res}, open('summary.json', 'w'), default=float)
r = res['R2 + radio from 1 h']
print('\nREADOUTS (parts as defaults):')
for d, dn in enumerate(circuit.DOM):
    print(f"   {dn:8s} rung T = PHI^{[8,6,4][d]} = {r['T'][d]:.1f} s   Q = {r['Q'][d]:.2f}   tank memory = {r['tau'][d]:.0f} s   loop gain = {r['G'][d]:.3f}"
          f"   RC margin: tank {r['rc_margin_tank'][d]:.2f}, layer 1 {r['rc_margin_layer1'][d]:.2f}")
print('   lock ratio (coupling / half the frequency gap; >= 1 would lock):', np.round(np.array(r['lock_ratio']), 3).tolist())
print('   strike voltages per layer (layer 1 = 1):', [round(x, 3) for x in r['S']])
