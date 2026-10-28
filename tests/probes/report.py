import json, sys, collections, statistics as st

D = json.load(open(sys.argv[1]))
notes, states = D['notes'], D['states']
bars = [n for n in notes if n[1] == 'bar']
ev = [n for n in notes if n[1] not in ('bar', 'cc')]
GM = {36: 'kick', 38: 'snare', 39: 'clap', 42: 'hat', 82: 'shaker', 45: 'tom', 56: 'cow'}

# tracks from bar lines (track id = n[3]); each bar: [ms, 'bar', bpm, id, step]
tracks = collections.OrderedDict()
for b in bars:
    tracks.setdefault(b[3], []).append(b)

def bar_of(ms, bl):
    # index of the bar line at or before ms, and the 16th step inside it
    i = None
    for k, b in enumerate(bl):
        if b[0] <= ms: i = k
        else: break
    if i is None or i + 1 >= len(bl): return None, None
    a, z = bl[i][0], bl[i + 1][0]
    return i, int(round((ms - a) / (z - a) * 16)) % 16

print('captured: %d notes over %.1f min, %d tracks' % (len(ev), (ev[-1][0] - ev[0][0]) / 6e4, len(tracks)))
secs = collections.OrderedDict()
for s in states:
    l = s.get('l')
    if l and l.get('form'): secs.setdefault(s.get('seed'), []).append(l['form']['sec'])
for tid, bl in tracks.items():
    if len(bl) < 8: continue
    a, z = bl[0][0], bl[-1][0]
    bpm = st.median([b[2] for b in bl])
    E = [n for n in ev if a <= n[0] < z]
    print('\n=== track %s: %d bars, %.0f BPM, %.1f min' % (tid, len(bl), bpm, (z - a) / 6e4))
    # drum grid
    grid = collections.defaultdict(lambda: [0] * 16); vel = collections.defaultdict(list); per = collections.defaultdict(lambda: collections.Counter())
    for n in E:
        if n[1] != 'drums': continue
        i, s16 = bar_of(n[0], bl)
        if i is None: continue
        k = GM.get(n[2], str(n[2])); grid[k][s16] += 1; vel[k].append(n[3]); per[k][i] += 1
    nb = len(bl) - 1
    print('  drums, hits per bar position (16ths, of %d bars):' % nb)
    for k in ['kick', 'snare', 'clap', 'hat', 'cow', 'tom', 'shaker']:
        if k in grid:
            row = grid[k]; print('   %-6s %s  (%.1f/bar, vel %.2f-%.2f)' % (k, ' '.join('%3d' % x for x in row), sum(row) / nb, min(vel[k]), max(vel[k])))
    for part in ['bass', 'chords', 'pad', 'lead', 'answer', 'voice']:
        P = [n for n in E if n[1] == part]
        if not P: print('  %-7s none' % part); continue
        pos = collections.Counter(); bl_on = set()
        for n in P:
            i, s16 = bar_of(n[0], bl)
            if i is not None: pos[s16] += 1; bl_on.add(i)
        ps = [n[2] for n in P]; pcs = collections.Counter(p % 12 for p in ps)
        iv = collections.Counter(abs(b - a) for a, b in zip(ps, ps[1:]))
        print('  %-7s %4d notes in %d of %d bars (%.1f per bar played), range %d-%d, distinct pitches %d, top intervals %s, top steps %s' % (
            part, len(P), len(bl_on), nb, len(P) / max(1, len(bl_on)), min(ps), max(ps), len(set(ps)),
            ' '.join('%d:%d' % x for x in iv.most_common(4)), ' '.join('%d:%d' % x for x in pos.most_common(5))))
    # kick against bass: share of bass notes that land with a kick
    kpos = set(); bpos = []
    for n in E:
        i, s16 = bar_of(n[0], bl)
        if i is None: continue
        if n[1] == 'drums' and n[2] == 36: kpos.add((i, s16))
        if n[1] == 'bass': bpos.append((i, s16))
    if bpos: print('  bass notes landing with a kick: %d%%' % (100 * sum(1 for x in bpos if x in kpos) / len(bpos)))
seen = []
for s in states:
    l = s.get('l')
    if l and l.get('form'):
        k = (s.get('seed'), l['form']['sec'])
        if not seen or seen[-1][0] != k: seen.append([k, 1, l.get('lead'), s.get('voice'), l.get('bass')])
        else: seen[-1][1] += 1
print('\nsections in order (seconds):')
for k, n, ld, vo, bs in seen:
    print('  %-10s %-11s %4d s  lead %-8s %s voice %-6s bass %s' % (k[0], k[1], n, (ld or {}).get('now'), 'SOLO' if ld and ld.get('sk') else '    ', (vo or {}).get('role'), bs))
print('errors', D['errs'] or 'none')
