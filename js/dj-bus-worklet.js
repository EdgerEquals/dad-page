// js/dj-bus-worklet.js: Ed's master bus. One compressor in four classic topologies, then a saturation stage, on an AudioWorklet.
// MASTER BUS (Danny 22:06 AWST 27 Oct, Claude chat: 'it's really really missing Master bus compression' ... 'and distortion the same way';
// 20:17 'can we find compressors ... simulations of vintage units'). The four topologies are adapted from audiojs/dynamics (see the notice
// below): VCA (dbx / SSL bus class: peak detection, near-hard knee), FET (1176 class: very fast peak attack, high ratios, firm knee),
// opto (LA-2A class: RMS detection, wide knee, the T4 cell's program-dependent release), vari-mu (Fairchild class: feedback detection,
// ratio that grows with drive, very soft knee). Ours adds: one detector LINKED across the channels (the stereo image never shifts),
// auto make-up that follows the average gain reduction (a rule, not a dial: level in = level out on average, so it never gets louder,
// it gets denser), a parallel mix, and a soft-clip saturation stage whose threshold rides the running level.
//
// Adapted from audiojs/dynamics (@audio/dynamics-vca, -fet, -opto, -varimu, -envelope, -compressor), MIT licence:
//   Copyright (c) Dmitry Iv. <dfcreative@gmail.com>
//   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files
//   (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge,
//   publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
//   subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or
//   substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
//   BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
//   ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
// Their gain computer is the standard soft-knee curve (Giannoulis, Massberg & Reiss, 'Digital Dynamic Range Compressor Design', JAES 2012).
'use strict';
const PHI = globalThis.RatioCore.R, IPH = 1 / PHI, FLO = 20;                                  // R: the base ratio, from js/ratio-core.js (ratiocore1; phi today, loaded into the worklet first); cite: 20 Hz, the bottom of hearing
const L10 = Math.LN10 / 20;
function db2lin(db) { return Math.exp(db * L10); }
function lin2db(x) { return Math.log(Math.max(Math.abs(x), 1e-10)) / L10; }
function coef(ms) { return ms > 0 ? Math.exp(-1 / (ms * 0.001 * sampleRate)) : 0; }                // one-pole smoothing coefficient for a time in ms
function gainDb(level, thr, ratio, knee) {                                                     // soft-knee gain computer (dB, <= 0)
  const d = level - thr; if (d < -knee / 2) return 0; if (d >= knee / 2) return -(d * (1 - 1 / ratio));
  const x = d + knee / 2; return -(1 - 1 / ratio) * x * x / (2 * knee);
}
// REVIEW FIXES (DeepSeek's review of bus1, Danny relayed 08:10 AWST 28 Oct; Danny approved the mix-template draft the same minute, 'go
// with that'): the peak detector now lets go over PHI^5 ms (~11 ms, was 1 ms, which let it ride a bass wave and modulate it); the RMS
// window is PHI^-7 s (~34 ms, was 256 samples, ~5 ms, barely different from peak); the saturation threshold rides the level AFTER the
// compressor (it was the input, so a hard squeeze saturated less); threshold, mix, ratio, knee and the saturation settings glide to
// each new value over PHI^-5 s (no zipper when the energy arc or a fader moves them). Saturation types from the templates: soft (tanh),
// tube (biased, even harmonics), tape (tanh then a gentle top roll-off), transistor (odd cubic, 3rd-harmonic).
const SAT = { none: 0, soft: 1, tube: 2, tape: 3, transistor: 4 };
class EdBus extends AudioWorkletProcessor {
  constructor() {
    super();
    this.p = { model: 1, det: 'peak', opto: false, mu: false, thr: -20, ratio: 4, atk: 10, rel: 150, knee: 1, mix: 1, satT: 0, asym: 0, sat: 1 };
    this.q = Object.assign({}, this.p);                                                         // the targets the glide moves toward
    this.env = 0; this.gr = 0; this.mem = 0; this.mk = 0; this.lvl = 0; this.grMin = 0; this.grSum = 0; this.n = 0;
    this.win = Math.max(64, Math.round(sampleRate * Math.pow(PHI, -7))); this.rb = new Float32Array(this.win); this.ri = 0; this.rs = 0;   // phi: RMS window PHI^-7 s
    this.dx = [0, 0, 0, 0, 0, 0, 0, 0]; this.dy = [0, 0, 0, 0, 0, 0, 0, 0]; this.lp = [0, 0, 0, 0, 0, 0, 0, 0]; this.y = new Float32Array(8);
    this.port.onmessage = (e) => { const d = e.data; if (d && d.k === 'p' && d.p) { Object.assign(this.q, d.p); ['model', 'det', 'opto', 'mu', 'atk', 'rel', 'sat'].forEach((k) => { if (k in d.p) this.p[k] = d.p[k]; }); } };
  }
  process(inputs, outputs) {
    const inp = inputs[0], out = outputs[0]; if (!out || !out.length) return true;
    const N = out[0].length;
    if (!inp || !inp.length) { for (let c = 0; c < out.length; c++) out[c].fill(0); return true; }
    const P = this.p, Q = this.q, C = inp.length;
    if (!P.model) { for (let c = 0; c < out.length; c++) out[c].set(inp[Math.min(c, C - 1)]); return true; }   // off: straight through
    const gl = 1 - Math.exp(-N / (sampleRate * Math.pow(PHI, -5)));                           // phi: settings glide over PHI^-5 s
    ['thr', 'ratio', 'knee', 'mix', 'satT', 'asym'].forEach((k) => { const a = P[k], b = Q[k]; if (!isFinite(a) || (a === 0) !== (b === 0)) P[k] = b; else P[k] = a + (b - a) * gl; });   // a switch on or off lands at once
    const aC = coef(P.atk), eR = coef(Math.pow(PHI, 5)), memC = coef(3000), mkC = coef(Math.pow(PHI, 2) * 1000), lvC = coef(PHI * 1000);   // phi: detector release PHI^5 ms; ~3 s T4 memory (audiojs); make-up tau PHI^2 s, level tau PHI s
    const MKMAX = Math.pow(PHI, 4), R = 1 - 2 * Math.PI * FLO * IPH * IPH / sampleRate, LPk = 1 - Math.exp(-2 * Math.PI * 20000 * IPH / sampleRate);   // phi: make-up at most PHI^4 dB; DC blocker 20 Hz x PHI^-2; tape roll-off 20 kHz x PHI^-1
    const ty = P.sat | 0, CO = Math.min(out.length, 8);
    let rC = coef(P.rel);
    for (let i = 0; i < N; i++) {
      let pk = 0, sq = 0;
      for (let c = 0; c < C; c++) { const x = inp[c][i]; const a = x < 0 ? -x : x; if (a > pk) pk = a; sq += x * x; }
      sq /= C;
      let mag;
      if (P.mu) { const g0 = db2lin(this.gr); pk *= g0; sq *= g0 * g0; }                     // vari-mu: the detector hears the compressed output (feedback)
      if (P.det === 'rms') { this.rs += sq - this.rb[this.ri]; this.rb[this.ri] = sq; this.ri = (this.ri + 1) % this.win; mag = Math.sqrt(Math.max(0, this.rs / this.win)); }
      else mag = pk;
      const ec = mag > this.env ? aC : eR; this.env = ec * this.env + (1 - ec) * mag;
      const lv = lin2db(this.env); let ratio = P.ratio;
      if (P.mu) ratio = P.ratio + Math.max(0, lv - P.thr) / Math.pow(PHI, 3);                // phi: the 'mu' grows a step per PHI^3 dB of drive
      const target = gainDb(lv, P.thr, Math.max(1, ratio), Math.max(0.01, P.knee));
      if (P.opto) { this.mem = this.mem * memC + (target < -1 ? 1 - memC : 0); if ((i & 15) === 0) rC = coef(P.rel * (1 + 6 * this.mem)); }   // T4 memory slows the release (audiojs: x(1 + 6 m)), refreshed every 16 samples
      this.gr = target < this.gr ? target + (this.gr - target) * aC : target + (this.gr - target) * rC;
      this.mk = this.mk * mkC + Math.min(MKMAX, -this.gr) * (1 - mkC);
      if (this.gr < this.grMin) this.grMin = this.gr; this.grSum += this.gr;
      const g = db2lin(this.gr + this.mk), mix = P.mix;
      let ps = 0;
      for (let c = 0; c < CO; c++) { const x = inp[Math.min(c, C - 1)][i], y = x + mix * (x * g - x); this.y[c] = y; ps += y * y; }
      this.lvl = this.lvl * lvC + (ps / CO) * (1 - lvC);                                    // the level AFTER the compressor
      const T = ty && P.satT > 0 ? Math.max(1e-4, Math.sqrt(this.lvl) * P.satT) : 0, as = ty === SAT.tube ? Math.max(P.asym, Math.pow(IPH, 4)) : P.asym, tp = T * (1 + as), tn = T * (1 - as);   // phi: a tube is biased at least PHI^-4
      for (let c = 0; c < CO; c++) {
        let y = this.y[c];
        if (T > 0) {
          if (ty === SAT.transistor) { const u = y / T; y = u >= 1 ? T : u <= -1 ? -T : T * (1.5 * u - 0.5 * u * u * u); }   // odd cubic: the 3rd harmonic
          else y = y >= 0 ? tp * Math.tanh(y / tp) : tn * Math.tanh(y / tn);
          if (ty === SAT.tape) { this.lp[c] += LPk * (y - this.lp[c]); y = this.lp[c]; }        // tape: a gentle top roll-off
          if (as > 0) { const z = y - this.dx[c] + R * this.dy[c]; this.dx[c] = y; this.dy[c] = z; y = z; }   // even harmonics leave DC: block it
        }
        out[c][i] = y;
      }
    }
    this.n += N; if (this.n >= sampleRate * Math.pow(PHI, -4)) { this.port.postMessage({ gr: this.grMin, av: this.grSum / this.n, mk: this.mk }); this.n = 0; this.grMin = 0; this.grSum = 0; }   // phi: report every PHI^-4 s
    return true;
  }
}
registerProcessor('ed-bus', EdBus);

// ===== FOUR BUSES (mix templates step 2; Danny 09:09 AWST 28 Oct, Claude chat: 'All', the third of 'work through all three'; the draft he
// approved at 08:10, 'I approve that draft go with that': claude.ai/artifact/XxFZYKosXsse852C5tLYvt): drums, bass, music (stabs, arp, pad)
// and front (lead, answer, voice), each the sum of BOTH tracks after their crossfades. Per bus: saturation BEFORE its compressor (the
// draft: before on the buses, after on the master), then one of the master's four topologies with the detector linked across the pair,
// auto make-up from its average reduction, and a SERVO of its own that aims the bus at the template's reduction on its loud moments (the
// master's rules: a quiet gate, a deadband of max(PHI^-3, PHI^-3 x target) dB, the step scaled below a 1 dB target). New here, a HOLD
// THROUGH SILENCE: while a bus sits more than PHI^3 dB under its loud level (a breakdown with the drums out), its threshold rests at
// that floor and its loud level falls only PHI^-3 dB a step, so the first hit after a breakdown is squeezed as the last one was.
// The drums also feed a PARALLEL copy (New York compression), its own compressor blended in as a crossfade (denser, never louder).
// The compressor core repeats EdBus's above (same maths, same audiojs/dynamics origin, MIT notice at the top); EdBus is left as tuned.
const MKMAX0 = Math.pow(PHI, 4);
class Dyn {
  constructor(mkMax) {
    this.p = { model: 0, det: 'peak', opto: false, mu: false, thr: 0, ratio: 2, atk: 10, rel: 150, knee: 1 }; this.q = Object.assign({}, this.p);
    this.env = 0; this.gr = 0; this.mem = 0; this.mk = 0; this.k = 0; this.grMin = 0; this.rMin = 0; this.mkMax = mkMax || MKMAX0;
    this.win = Math.max(64, Math.round(sampleRate * Math.pow(PHI, -7))); this.rb = new Float32Array(this.win); this.ri = 0; this.rs = 0;   // phi: RMS window PHI^-7 s
    this.memC = coef(3000); this.mkC = coef(Math.pow(PHI, 2) * 1000); this.eR = coef(Math.pow(PHI, 5));   // ~3 s T4 memory (audiojs); make-up tau PHI^2 s; detector release PHI^5 ms
    this.tgt = 0; this.off = Math.pow(PHI, 3); this.hit = 0; this.loud = null; this.ref = null;   // phi: the threshold starts PHI^3 dB over the level (a gentle start; the servo comes down to the target)
  }
  set(d) { Object.assign(this.q, d); ['model', 'det', 'opto', 'mu', 'atk', 'rel'].forEach((k) => { if (k in d) this.p[k] = d[k]; }); if ('tgt' in d) this.tgt = d.tgt; if ('off' in d && isFinite(d.off)) this.off = d.off; }
  block(N) {
    const P = this.p, Q = this.q, gl = 1 - Math.exp(-N / (sampleRate * Math.pow(PHI, -5)));   // phi: settings glide over PHI^-5 s
    P.thr += (Q.thr - P.thr) * gl; P.ratio += (Q.ratio - P.ratio) * gl; P.knee += (Q.knee - P.knee) * gl;
    this.aC = coef(P.atk); if (!this.p.opto) this.rC = coef(P.rel); else if (this.rC == null) this.rC = coef(P.rel);
    this.hit = Math.max(-this.grMin, this.hit * Math.pow(IPH, N / sampleRate / Math.pow(PHI, 3))); this.grMin = 0;   // the hits: a peak hold that falls by PHI^-1 every PHI^3 s
  }
  gain(pk, sq) {                                                                               // one sample: the linked detector in, the gain (with make-up) out
    const P = this.p; if (P.mu) { const g0 = db2lin(this.gr); pk *= g0; sq *= g0 * g0; }       // vari-mu: the detector hears the output
    let mag; if (P.det === 'rms') { this.rs += sq - this.rb[this.ri]; this.rb[this.ri] = sq; this.ri = (this.ri + 1) % this.win; mag = Math.sqrt(Math.max(0, this.rs / this.win)); } else mag = pk;
    const ec = mag > this.env ? this.aC : this.eR; this.env = ec * this.env + (1 - ec) * mag;
    const lv = lin2db(this.env); let ratio = P.ratio; if (P.mu) ratio += Math.max(0, lv - P.thr) / Math.pow(PHI, 3);
    const target = gainDb(lv, P.thr, Math.max(1, ratio), Math.max(0.01, P.knee));
    if (P.opto) { this.mem = this.mem * this.memC + (target < -1 ? 1 - this.memC : 0); if ((this.k++ & 15) === 0) this.rC = coef(P.rel * (1 + 6 * this.mem)); }   // T4 memory (audiojs: x(1 + 6 m))
    this.gr = target < this.gr ? target + (this.gr - target) * this.aC : target + (this.gr - target) * this.rC;
    this.mk = this.mk * this.mkC + Math.min(this.mkMax, -this.gr) * (1 - this.mkC);
    if (this.gr < this.grMin) this.grMin = this.gr; if (this.gr < this.rMin) this.rMin = this.gr;
    return db2lin(this.gr + this.mk);
  }
  servo(lv) {                                                                                  // once a PHI s: lv = the bus's level (dB)
    if (!(this.tgt > 0) || !this.p.model || !(lv > -Math.pow(PHI, 9))) return;                // phi: under -PHI^9 dB (~-76 dB) the bus is silent: hold everything (it starts at 0 dB, no squeeze)
    const quiet = this.loud != null && lv < this.loud - Math.pow(PHI, 3);
    this.loud = this.loud == null ? lv : quiet ? this.loud - Math.pow(IPH, 3) : Math.max(lv, this.loud - IPH);   // phi: falls PHI^-1 dB a step while it plays, PHI^-3 while it rests
    const ref = quiet ? this.loud - Math.pow(PHI, 3) : lv, t = this.tgt, er = this.hit - t, sm = Math.min(1, t), dbd = Math.max(Math.pow(PHI, -3), t * Math.pow(IPH, 3));
    if (!quiet && Math.abs(er) > dbd) this.off = Math.max(-Math.pow(PHI, 5), Math.min(Math.pow(PHI, 5), this.off + Math.max(-PHI * sm, Math.min(PHI * sm, er * IPH * sm))));
    this.q.thr = ref + this.off;
  }
}
function satur(y, ty, T, as, st, c, R, LPk) {                                                // the master's saturation types, state per channel
  if (!(T > 0) || !ty) return y; const tp = T * (1 + as), tn = T * (1 - as);
  if (ty === SAT.transistor) { const u = y / T; y = u >= 1 ? T : u <= -1 ? -T : T * (1.5 * u - 0.5 * u * u * u); }
  else y = y >= 0 ? tp * Math.tanh(y / tp) : tn * Math.tanh(y / tn);
  if (ty === SAT.tape) { st.lp[c] += LPk * (y - st.lp[c]); y = st.lp[c]; }
  if (as > 0) { const z = y - st.dx[c] + R * st.dy[c]; st.dx[c] = y; st.dy[c] = z; y = z; }
  return y;
}
class EdBuses extends AudioWorkletProcessor {
  constructor() {
    super();
    this.B = [0, 1, 2, 3].map(() => ({ c: new Dyn(), sat: 0, over: 0, pw: 0, st: { lp: [0, 0], dx: [0, 0], dy: [0, 0] } }));
    this.par = new Dyn(Math.pow(PHI, 5)); this.mix = 0; this.n = 0; this.sv = 0; this.x = new Float32Array(2);   // phi: the parallel copy's make-up up to PHI^5 dB
    this.port.onmessage = (e) => { const d = e.data; if (!d || d.k !== 'p') return;
      (d.b || []).forEach((p, i) => { const b = this.B[i]; if (!b || !p) return; b.c.set(p); if ('sat' in p) b.sat = p.sat | 0; if ('over' in p) b.over = +p.over || 0; });
      if (d.par) { this.par.set(d.par); if ('mix' in d.par) this.mix = Math.max(0, Math.min(1, +d.par.mix || 0)); } };
  }
  process(inputs, outputs) {
    const out = outputs[0]; if (!out || !out.length) return true; const N = out[0].length, L = out[0], Rt = out[1] || out[0];
    L.fill(0); if (Rt !== L) Rt.fill(0);
    const lvC = coef(PHI * 1000), R = 1 - 2 * Math.PI * FLO * IPH * IPH / sampleRate, LPk = 1 - Math.exp(-2 * Math.PI * 20000 * IPH / sampleRate);   // phi: level tau PHI s; DC blocker 20 Hz x PHI^-2; tape roll-off 20 kHz x PHI^-1
    const pr = this.par, pOn = this.mix > 0 && pr.p.model; if (pOn) pr.block(N);
    for (let b = 0; b < 4; b++) {
      const inp = inputs[b], B = this.B[b], C = B.c, on = C.p.model > 0; if (!inp || !inp.length) { if (on) C.block(N); continue; }
      const i0 = inp[0], i1 = inp[1] || inp[0], ty = B.sat, T = ty && B.over > 0 ? Math.max(1e-4, Math.sqrt(B.pw) * Math.pow(10, B.over / 20)) : 0, as = ty === SAT.tube ? Math.pow(IPH, 4) : 0;   // phi: a tube is biased PHI^-4
      if (on) C.block(N); const par = b === 0 && pOn, m = this.mix;
      for (let i = 0; i < N; i++) {
        let a = i0[i], z = i1[i]; B.pw = B.pw * lvC + (a * a + z * z) / 2 * (1 - lvC);
        if (T > 0) { a = satur(a, ty, T, as, B.st, 0, R, LPk); z = satur(z, ty, T, as, B.st, 1, R, LPk); }
        let ya = a, yz = z; const aa = a < 0 ? -a : a, az = z < 0 ? -z : z, pk = aa > az ? aa : az, sq = (a * a + z * z) / 2;
        if (on) { const g = C.gain(pk, sq); ya = a * g; yz = z * g; }
        if (par) { const gp = pr.gain(pk, sq); ya = ya * (1 - m) + a * gp * m; yz = yz * (1 - m) + z * gp * m; }   // New York: the smashed copy crossfaded in
        L[i] += ya; if (Rt !== L) Rt[i] += yz;
      }
    }
    this.sv += N; if (this.sv >= sampleRate * PHI) { this.sv = 0; this.B.forEach((B) => B.c.servo(10 * Math.log10(Math.max(B.pw, 1e-12)))); if (pOn) pr.servo(10 * Math.log10(Math.max(this.B[0].pw, 1e-12))); }   // phi: the servos step once a PHI s
    this.n += N; if (this.n >= sampleRate * Math.pow(PHI, -4)) { this.n = 0;   // phi: report every PHI^-4 s
      this.port.postMessage({ k: 'b', gr: this.B.map((B) => B.c.rMin), hit: this.B.map((B) => B.c.hit), off: this.B.map((B) => B.c.off), pgr: pr.rMin, phit: pr.hit, poff: pr.off });
      this.B.forEach((B) => { B.c.rMin = 0; }); pr.rMin = 0; }
    return true;
  }
}
registerProcessor('ed-buses', EdBuses);
