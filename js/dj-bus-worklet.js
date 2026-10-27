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
const PHI = (1 + Math.sqrt(5)) / 2, IPH = 1 / PHI, FLO = 20;                                  // phi: the golden ratio; cite: 20 Hz, the bottom of hearing
const L10 = Math.LN10 / 20;
function db2lin(db) { return Math.exp(db * L10); }
function lin2db(x) { return Math.log(Math.max(Math.abs(x), 1e-10)) / L10; }
function coef(ms) { return ms > 0 ? Math.exp(-1 / (ms * 0.001 * sampleRate)) : 0; }                // one-pole smoothing coefficient for a time in ms
function gainDb(level, thr, ratio, knee) {                                                     // soft-knee gain computer (dB, <= 0)
  const d = level - thr; if (d < -knee / 2) return 0; if (d >= knee / 2) return -(d * (1 - 1 / ratio));
  const x = d + knee / 2; return -(1 - 1 / ratio) * x * x / (2 * knee);
}
class EdBus extends AudioWorkletProcessor {
  constructor() {
    super();
    this.p = { model: 1, det: 'peak', opto: false, mu: false, thr: -20, ratio: 4, atk: 10, rel: 150, knee: 1, mix: 1, satT: 0, asym: 0 };
    this.env = 0; this.gr = 0; this.mem = 0; this.mk = 0; this.lvl = 0; this.grMin = 0; this.grSum = 0; this.n = 0;
    this.win = 256; this.rb = new Float32Array(this.win); this.ri = 0; this.rs = 0;           // unit: 256-sample RMS window (the audiojs default)
    this.dx = [0, 0, 0, 0, 0, 0, 0, 0]; this.dy = [0, 0, 0, 0, 0, 0, 0, 0];
    this.port.onmessage = (e) => { const d = e.data; if (d && d.k === 'p' && d.p) Object.assign(this.p, d.p); };
  }
  process(inputs, outputs) {
    const inp = inputs[0], out = outputs[0]; if (!out || !out.length) return true;
    const N = out[0].length;
    if (!inp || !inp.length) { for (let c = 0; c < out.length; c++) out[c].fill(0); return true; }
    const P = this.p, C = inp.length;
    if (!P.model) { for (let c = 0; c < out.length; c++) out[c].set(inp[Math.min(c, C - 1)]); return true; }   // off: straight through
    const aC = coef(P.atk), eR = coef(1), memC = coef(3000), mkC = coef(Math.pow(PHI, 2) * 1000), lvC = coef(PHI * 1000);   // unit: 1 ms detector release, ~3 s T4 memory (audiojs); phi: make-up tau PHI^2 s, level tau PHI s
    const MKMAX = Math.pow(PHI, 4), R = 1 - 2 * Math.PI * FLO * IPH * IPH / sampleRate;   // phi: make-up at most PHI^4 dB; DC blocker at 20 Hz x PHI^-2
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
      const target = gainDb(lv, P.thr, ratio, P.knee);
      if (P.opto) { this.mem = this.mem * memC + (target < -1 ? 1 - memC : 0); if ((i & 15) === 0) rC = coef(P.rel * (1 + 6 * this.mem)); }   // T4 memory slows the release (audiojs: x(1 + 6 m)), refreshed every 16 samples
      this.gr = target < this.gr ? target + (this.gr - target) * aC : target + (this.gr - target) * rC;
      this.mk = this.mk * mkC + Math.min(MKMAX, -this.gr) * (1 - mkC);
      if (this.gr < this.grMin) this.grMin = this.gr; this.grSum += this.gr;
      const g = db2lin(this.gr + this.mk), mix = P.mix;
      this.lvl = this.lvl * lvC + sq * (1 - lvC);
      const T = P.satT > 0 ? Math.max(1e-4, Math.sqrt(this.lvl) * P.satT) : 0, tp = T * (1 + P.asym), tn = T * (1 - P.asym);
      for (let c = 0; c < out.length; c++) {
        const x = inp[Math.min(c, C - 1)][i]; let y = x + mix * (x * g - x);
        if (T > 0) { y = y >= 0 ? tp * Math.tanh(y / tp) : tn * Math.tanh(y / tn);
          if (P.asym > 0) { const z = y - this.dx[c] + R * this.dy[c]; this.dx[c] = y; this.dy[c] = z; y = z; } }   // even harmonics leave DC: block it
        out[c][i] = y;
      }
    }
    this.n += N; if (this.n >= sampleRate * Math.pow(PHI, -4)) { this.port.postMessage({ gr: this.grMin, av: this.grSum / this.n, mk: this.mk }); this.n = 0; this.grMin = 0; this.grSum = 0; }   // phi: report every PHI^-4 s
    return true;
  }
}
registerProcessor('ed-bus', EdBus);
