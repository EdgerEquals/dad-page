// Offline check of the emergent Form planner: prints section sequences and track lengths across seeds.
const PHI = (1 + Math.sqrt(5)) / 2, IPH = 1 / PHI, SPB = 4;
const frac = (x) => x - Math.floor(x), clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const FE = [Math.pow(IPH, 3), IPH * IPH, IPH, 1 - Math.pow(IPH, 3), 1 - Math.pow(IPH, 4), 1];
const FORMS = {
  electro: [['intro', 2, 1, 1, 'kh'], ['groove', 2, 2, 2, 'kshcb'], ['stabs in', 2, 3, 3, 'kshcbCa'], ['full', 4, 5, 5, 'kshcbCapl', 'B'], ['breakdown', 2, 0, 0, 'pla', 'B', 'bd'],
    ['build', 2, 1, 4, 'kshba', 'A', 'roll'], ['drop', 4, 5, 5, 'kshcbCapl', 'A', 'drop'], ['outro', 2, 2, 1, 'khcb', 'A', 'out']],
  club: [['intro', 2, 1, 1, 'kh'], ['build', 2, 2, 3, 'khcba'], ['drop', 4, 5, 5, 'kshcbCapl', 'A', 'drop'], ['breakdown', 4, 0, 1, 'pla', 'B', 'bd'],
    ['build', 2, 1, 4, 'pas', 'B', 'roll'], ['drop', 4, 5, 5, 'kshcbCapl', 'A', 'drop'], ['outro', 2, 2, 1, 'khb', 'A', 'out']],
  song: [['intro', 1, 1, 1, 'Chp'], ['verse', 2, 2, 2, 'khcbCl'], ['chorus', 2, 4, 4, 'kshcbCapl', 'B', 'lift'], ['verse', 2, 2, 2, 'kshcbCl'], ['chorus', 2, 5, 5, 'kshcbCapl', 'B', 'lift'],
    ['bridge', 2, 1, 1, 'bCpl', 'A', 'bd'], ['chorus', 2, 5, 5, 'kshcbCapl', 'B', 'drop'], ['outro', 1, 1, 0, 'Cpl', 'A', 'out']],
  ternary: [['A', 2, 2, 2, 'Cbl'], ['B', 2, 1, 1, 'Cbpa', 'B', 'bd'], ['A again', 2, 3, 3, 'Cblpa', 'A', 'lift'], ['coda', 1, 1, 0, 'Cp', 'A', 'out']],
  arch: [['opening', 2, 0, 1, 'p'], ['rise', 2, 1, 2, 'pbl'], ['climax', 2, 5, 5, 'pblcCash', 'B', 'lift'], ['fall', 2, 2, 1, 'pl', 'A', 'bd'], ['coda', 1, 1, 0, 'p', 'A', 'out']],
  tide: [['still', 2, 0, 0, 'p'], ['voice', 2, 1, 1, 'pl'], ['swell', 2, 2, 2, 'plb', 'B'], ['ebb', 2, 1, 1, 'pb', 'B', 'bd'], ['still', 1, 0, 0, 'p', 'A', 'out']]
};
const DIAL = Object.assign({ fmSP: 5, fmTP: 13, fmMn: 8, fmHi: Math.pow(IPH, 4), fmLo: Math.pow(IPH, 4), fmHy: Math.pow(IPH, 4), fmDr: 1 }, JSON.parse(process.argv[2] || '{}'));
// ---- copied from the engine ----
function fpump(sd, n, P, x) { var s = 0; for (var j = 0; j < n; j++) s += Math.sin(2 * Math.PI * x / (P * Math.pow(PHI, (j - (n - 1) / 2) / 2)) + 2 * Math.PI * frac((j + 1 + sd) * IPH)); return s / n; }
function emerge(nm, tr, u) {
  var R = FORMS[nm].map(function (x) { return { n: x[0], ph: x[1], e0: FE[x[2]], e1: FE[x[3]], P: x[4], h: x[5] || 'A', f: x[6] || '', top: x[3] }; }), mid = R.slice(1, -1);
  var by = function (q) { return mid.filter(q).sort(function (a, b) { return a.top - b.top; }); };
  var V = { low: by(function (r) { return r.f === 'bd'; }), build: by(function (r) { return r.f === 'roll'; }), high: by(function (r) { return r.top >= 4 && r.f !== 'bd' && r.f !== 'roll'; }), mid: by(function (r) { return r.top < 4 && r.f !== 'bd' && r.f !== 'roll'; }) };
  if (R[0].top >= 2 || V.mid.length < 2) V.mid = V.mid.concat([R[0]]).sort(function (a, b) { return a.top - b.top; });
  if (!V.mid.length) V.mid = V.high.length ? V.high.slice(0, 1) : V.low.slice(); if (!V.high.length) V.high = V.mid.slice(-1); if (!V.low.length) V.low = V.mid.slice(0, 1);
  var sd = tr.seed | 0, lean = ((tr.dm ? tr.dm.drive : 1 / 2) - 1 / 2) * IPH * IPH, SP = DIAL.fmSP * u, TP = DIAL.fmTP * u, MN = DIAL.fmMn * u, DR = Math.round(DIAL.fmDr), HI = DIAL.fmHi, LO = DIAL.fmLo, HY = DIAL.fmHy;
  var sec = function (b) { return fpump(sd, 3, SP, b) + lean; }, lenP = function (b) { return fpump(sd + 3, 2, SP * PHI, b); }, trk = function (b) { return fpump(sd + 7, 2, TP, b); };
  var S = [], b0 = 0, lvl = 'intro', seen = 0, end = false;
  var cap = function (r) { return Math.round(r.ph * PHI + DR) * u; };
  var put = function (r, lv, f) { var ph = lv === 'out' ? r.ph : Math.max(1, r.ph + Math.round(DR * lenP(b0))), L = S[S.length - 1];
    if (L && L.r === r && L.b + ph * u <= cap(r)) L.b += ph * u; else S.push({ n: r.n, b: ph * u, e0: r.e0, e1: r.e1, P: r.P, h: r.h, f: f == null ? r.f : f, s0: b0, r: r, lv: lv }); b0 += ph * u; };
  put(R[0], 'intro');
  for (var k = 0; k < 89; k++) {
    for (var p = seen + u; p <= b0; p += u) if (p >= MN && trk(p) >= trk(p - u) && trk(p) > trk(p + u)) end = true;
    seen = b0; if (end || b0 >= MN + TP) { if (lvl === 'low' && V.build.length) { var dz = V.high.filter(function (r) { return r.f === 'drop'; }); put(V.build[0], 'build'); put(dz[0] || V.high[V.high.length - 1], 'high', 'drop'); } break; }   // a breakdown in a style with a build always resolves: build, drop, then the outro
    var s = sec(b0), nl = lvl === 'high' ? (s < HI - HY ? (s < -LO ? 'low' : 'mid') : 'high') : lvl === 'low' ? (s > -LO + HY ? (s > HI ? 'high' : 'mid') : 'low') : (s > HI ? 'high' : s < -LO ? 'low' : 'mid');
    if (nl === 'low' && lvl === 'intro') nl = 'mid';
    if (nl !== 'low' && lvl === 'low' && V.build.length) { var dr = V.high.filter(function (r) { return r.f === 'drop'; }); put(V.build[0], 'build'); put(dr[0] || V.high[V.high.length - 1], 'high', 'drop'); lvl = 'high'; continue; }
    var C = V[nl], L = S[S.length - 1], x = clamp((s + LO) / Math.max(1e-6, HI + LO), 0, 1 - 1e-9);
    if (nl === 'high' && lvl !== 'high') { var lf = C.filter(function (r) { return r.f !== 'drop'; }); if (lf.length) C = lf; }
    var pick = C[Math.floor(x * C.length)];
    if (nl === lvl && C.indexOf(L.r) >= 0) pick = L.r;
    if (pick === L.r && L.b + pick.ph * u > cap(pick) && C.length > 1) pick = C[(C.indexOf(pick) + 1) % C.length];
    put(pick, nl, nl === 'high' && lvl !== 'high' ? (pick.f === 'drop' ? 'lift' : pick.f || (pick.top >= 4 ? 'lift' : '')) : pick.f === 'drop' ? '' : null); lvl = nl;
  }
  put(R[R.length - 1], 'out');
  return S;
}
// ---- report ----
if (process.argv[3] === "stats") { const lv = {}; let n = 0, pk = 0, bd = 0, dr = 0, L = [];
  for (const nm of ['electro', 'club', 'song']) for (let sd = 0; sd < 200; sd++) { const S = emerge(nm, { seed: Math.imul(sd + 1, 2654435761) | 0, dm: { drive: (sd % 5) / 4 } }, SPB); n++;
    if (S.some((q) => q.lv === 'high')) pk++; if (S.some((q) => q.lv === 'low')) bd++; if (S.some((q) => q.lv === 'build')) dr++; L.push(S[S.length - 1].s0); S.forEach((q) => { lv[q.lv] = (lv[q.lv] || 0) + q.b; }); }
  L.sort((a, b) => a - b); console.log(JSON.stringify(DIAL), 'peak', (pk / n * 100).toFixed(0) + '%', 'breakdown', (bd / n * 100).toFixed(0) + '%', 'build+drop', (dr / n * 100).toFixed(0) + '%', 'bars p10/50/90', L[n / 10 | 0], L[n / 2 | 0], L[n * 9 / 10 | 0], JSON.stringify(lv)); process.exit(0); }
const bpm = { electro: 126, club: 124, song: 112, ternary: 84, arch: 92, tide: 76 };
let lens = [], lv = { low: 0, mid: 0, high: 0, build: 0 };
for (const nm of Object.keys(FORMS)) {
  console.log('== ' + nm);
  for (let sd = 0; sd < 6; sd++) {
    const seed = Math.imul(sd + 1, 2654435761) | 0, drive = [0.2, 0.5, 0.8][sd % 3];
    const S = emerge(nm, { seed, dm: { drive } }, SPB), bars = S[S.length - 1].s0 + S[S.length - 1].b, sec = (bars - S[S.length - 1].b) * SPB * 60 / bpm[nm];
    lens.push(sec); S.forEach((q) => { if (lv[q.lv] != null) lv[q.lv] += q.b; });
    console.log('  d' + drive + ' ' + Math.round(sec) + 's ' + S.map((q) => q.n + (q.f && q.f !== q.r.f ? '[' + q.f + ']' : '') + ':' + q.b).join(' > '));
  }
}
lens.sort((a, b) => a - b);
console.log('track seconds min/median/max', Math.round(lens[0]), Math.round(lens[lens.length >> 1]), Math.round(lens[lens.length - 1]));
const tot = Object.values(lv).reduce((a, b) => a + b, 0); console.log('bars by level', Object.fromEntries(Object.entries(lv).map(([k, v]) => [k, (v / tot * 100).toFixed(0) + '%'])));
