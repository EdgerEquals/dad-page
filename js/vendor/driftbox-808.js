/* driftbox 808: the TR-808 voices and the renderer from @driftbox/engine 0.6.0 by Louis Emmett, MIT licence (full text below).
   Source: https://github.com/emmettl/driftbox (packages/engine, commit c92e124, 18 Oct 2026), npm @driftbox/engine@0.6.0.
   Bundled unchanged from dist/voices/tr808.js, dist/voices/common.js and dist/render.js into one classic script (esbuild, ES2017),
   exposing window.Driftbox808 = { voices, renderVoice, version }. Used by Ed's DJ as one of the units in the 808 bank (js/dj-extras.js),
   loaded only when an electro track plays (Danny 15:4x AWST 27 Oct: 'always for acknowledging anything I'm using').

   MIT License

   Copyright (c) 2026 Louis Emmett

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   SOFTWARE.
*/
(() => {
  // ../dl/driftbox/x/package/dist/voices/common.js
  function range(value, low, high) {
    return low + (high - low) * Math.max(0, Math.min(1, value));
  }
  function ratioRange(value, low, high) {
    return low * Math.pow(high / low, Math.max(0, Math.min(1, value)));
  }
  function accentGain(params, accent) {
    return range(params.level, 0, 1) * (0.62 + 0.38 * accent);
  }
  var METALLIC_RATIOS = [2, 3, 4.16, 5.43, 6.79, 8.21];
  function metallicSources(base, gain, amp) {
    return METALLIC_RATIOS.map((ratio) => ({
      kind: "osc",
      type: "square",
      frequency: base * ratio,
      gain,
      amp
    }));
  }

  // ../dl/driftbox/x/package/dist/voices/tr808.js
  function bassDrum(params, accent) {
    const base = range(params.tune, 42, 72);
    const decay = ratioRange(params.decay, 0.12, 1.6);
    const attack = base * range(params.tone, 2.2, 4.4);
    return {
      duration: decay + 0.1,
      gain: accentGain(params, accent),
      sources: [
        {
          kind: "osc",
          type: "sine",
          frequency: attack,
          pitch: [{ to: base, at: 0.042 }],
          gain: 1,
          amp: [
            { to: 1, at: 2e-3, curve: "lin" },
            { to: 0, at: decay }
          ]
        },
        // The click. On the real machine this is the trigger pulse bleeding through, and
        // it is most of what lets a kick cut through a mix on small speakers.
        {
          kind: "noise",
          gain: range(params.colour, 0, 0.5),
          amp: [
            { to: 1, at: 4e-4, curve: "lin" },
            { to: 0, at: 0.014 }
          ],
          filter: { type: "highpass", frequency: 1200 }
        }
      ],
      pan: range(params.pan, -1, 1)
    };
  }
  function snare(params, accent) {
    const tune = ratioRange(params.tune, 0.75, 1.35);
    const snappy = range(params.colour, 0.05, 1);
    const noiseDecay = ratioRange(params.decay, 0.05, 0.4);
    const toneDecay = Math.min(noiseDecay, 0.12);
    const body = (frequency, gain) => ({
      kind: "osc",
      type: "triangle",
      frequency: frequency * tune,
      gain,
      amp: [
        { to: 1, at: 1e-3, curve: "lin" },
        { to: 0, at: toneDecay }
      ]
    });
    return {
      duration: Math.max(noiseDecay, toneDecay) + 0.05,
      gain: accentGain(params, accent),
      sources: [
        // Two tuned shells, a fifth-ish apart. This pair is the whole "body" of an 808
        // snare; the noise on top is the wires.
        body(185, (1 - snappy * 0.5) * 0.9),
        body(330, (1 - snappy * 0.5) * 0.5),
        {
          kind: "noise",
          gain: snappy,
          amp: [
            { to: 1, at: 1e-3, curve: "lin" },
            { to: 0, at: noiseDecay }
          ],
          filter: { type: "highpass", frequency: range(params.tone, 700, 2600) }
        }
      ],
      pan: range(params.pan, -1, 1)
    };
  }
  function clap(params, accent) {
    const decay = ratioRange(params.decay, 0.12, 0.6);
    const centre = range(params.tone, 700, 1800);
    const spacing = range(params.colour, 6e-3, 0.016);
    const burst = (delay, gain) => ({
      kind: "noise",
      gain,
      delay,
      amp: [
        { to: 1, at: 6e-4, curve: "lin" },
        { to: 0, at: 0.012 }
      ]
    });
    return {
      duration: decay + spacing * 3 + 0.05,
      gain: accentGain(params, accent) * 0.9,
      filter: { type: "bandpass", frequency: centre, Q: 1.6 },
      sources: [
        burst(0, 0.8),
        burst(spacing, 0.9),
        burst(spacing * 2, 1),
        {
          kind: "noise",
          gain: 0.7,
          delay: spacing * 3,
          amp: [
            { to: 1, at: 1e-3, curve: "lin" },
            { to: 0, at: decay }
          ]
        }
      ],
      pan: range(params.pan, -1, 1)
    };
  }
  function metallic(decayRange, bandpass, q) {
    return (params, accent) => {
      const base = 40 * ratioRange(params.tune, 0.7, 1.5);
      const decay = ratioRange(params.decay, decayRange[0], decayRange[1]);
      const bright = ratioRange(params.tone, 0.6, 1.7);
      return {
        duration: decay + 0.05,
        gain: accentGain(params, accent) * 0.5,
        sources: metallicSources(base, 0.35, [
          { to: 1, at: 8e-4, curve: "lin" },
          { to: 0, at: decay }
        ]),
        filter: { type: "bandpass", frequency: bandpass * bright, Q: q },
        pan: range(params.pan, -1, 1)
      };
    };
  }
  function tom(baseLow, baseHigh) {
    return (params, accent) => {
      const base = range(params.tune, baseLow, baseHigh);
      const decay = ratioRange(params.decay, 0.1, 0.7);
      return {
        duration: decay + 0.05,
        gain: accentGain(params, accent),
        sources: [
          {
            kind: "osc",
            type: "sine",
            frequency: base * 1.9,
            pitch: [{ to: base, at: 0.06 }],
            gain: 1,
            amp: [
              { to: 1, at: 2e-3, curve: "lin" },
              { to: 0, at: decay }
            ]
          },
          {
            kind: "noise",
            gain: range(params.colour, 0, 0.22),
            amp: [
              { to: 1, at: 1e-3, curve: "lin" },
              { to: 0, at: 0.03 }
            ],
            filter: { type: "highpass", frequency: 600 }
          }
        ],
        pan: range(params.pan, -1, 1)
      };
    };
  }
  function cowbell(params, accent) {
    const tune = ratioRange(params.tune, 0.8, 1.25);
    const decay = ratioRange(params.decay, 0.1, 0.6);
    const amp = [
      { to: 1, at: 1e-3, curve: "lin" },
      { to: 0, at: decay }
    ];
    return {
      duration: decay + 0.05,
      gain: accentGain(params, accent) * 0.7,
      sources: [
        { kind: "osc", type: "square", frequency: 540 * tune, gain: 0.6, amp },
        { kind: "osc", type: "square", frequency: 800 * tune, gain: 0.6, amp }
      ],
      filter: { type: "bandpass", frequency: range(params.tone, 1800, 3600), Q: 2.4 },
      pan: range(params.pan, -1, 1)
    };
  }
  function rimshot(params, accent) {
    const decay = ratioRange(params.decay, 0.02, 0.09);
    return {
      duration: decay + 0.03,
      gain: accentGain(params, accent) * 0.8,
      sources: [
        {
          kind: "osc",
          type: "triangle",
          frequency: range(params.tune, 1400, 2200),
          pitch: [{ to: range(params.tune, 320, 520), at: 0.012 }],
          gain: 1,
          amp: [
            { to: 1, at: 5e-4, curve: "lin" },
            { to: 0, at: decay }
          ]
        }
      ],
      filter: { type: "bandpass", frequency: range(params.tone, 1200, 2800), Q: 1.4 },
      pan: range(params.pan, -1, 1)
    };
  }
  function maracas(params, accent) {
    const decay = ratioRange(params.decay, 0.015, 0.14);
    return {
      duration: decay + 0.03,
      gain: accentGain(params, accent) * 0.6,
      sources: [
        {
          kind: "noise",
          gain: 1,
          amp: [
            { to: 1, at: 8e-4, curve: "lin" },
            { to: 0, at: decay }
          ]
        }
      ],
      filter: { type: "highpass", frequency: range(params.tone, 4e3, 9e3) },
      pan: range(params.pan, -1, 1)
    };
  }
  var TR808_VOICES = [
    { id: "808.bd", trim: 0.8, name: "Bass Drum", machine: "tr808", build: bassDrum },
    { id: "808.sd", trim: 0.66, name: "Snare", machine: "tr808", build: snare },
    { id: "808.cp", trim: 3.35, name: "Clap", machine: "tr808", build: clap },
    { id: "808.lt", trim: 0.87, name: "Low Tom", machine: "tr808", build: tom(55, 105), pitched: { low: 55, high: 105 } },
    { id: "808.mt", trim: 0.86, name: "Mid Tom", machine: "tr808", build: tom(90, 170), pitched: { low: 90, high: 170 } },
    { id: "808.ht", trim: 0.86, name: "Hi Tom", machine: "tr808", build: tom(140, 265), pitched: { low: 140, high: 265 } },
    { id: "808.rs", trim: 1.79, name: "Rimshot", machine: "tr808", build: rimshot },
    { id: "808.cb", trim: 2.16, name: "Cowbell", machine: "tr808", build: cowbell },
    {
      id: "808.ch",
      trim: 8.59,
      name: "Closed Hat",
      machine: "tr808",
      // Closed and open hats share one circuit on the real machine, so a closed hat
      // silences a ringing open one. Without this a 16th-note hat pattern turns into a
      // wash of overlapping open hats.
      choke: "808.hats",
      build: metallic([0.02, 0.09], 9400, 1.4)
    },
    {
      id: "808.oh",
      trim: 4.28,
      name: "Open Hat",
      machine: "tr808",
      choke: "808.hats",
      build: metallic([0.15, 0.9], 8600, 1.2)
    },
    { id: "808.ma", trim: 1.14, name: "Maracas", machine: "tr808", build: maracas }
  ];

  // ../dl/driftbox/x/package/dist/render.js
  var SILENCE = 1e-4;
  var noiseBuffers = /* @__PURE__ */ new WeakMap();
  function seededRandom(seed) {
    let state = seed >>> 0 || 1;
    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }
  function noiseBuffer(ctx, options = {}) {
    var _a, _b, _c;
    const sampleRate = (_a = options.sampleRate) != null ? _a : ctx.sampleRate;
    const key = `${sampleRate}:${(_b = options.bitDepth) != null ? _b : "float"}:${(_c = options.seed) != null ? _c : "random"}`;
    let buffers = noiseBuffers.get(ctx);
    if (!buffers) {
      buffers = /* @__PURE__ */ new Map();
      noiseBuffers.set(ctx, buffers);
    }
    const cached = buffers.get(key);
    if (cached)
      return cached;
    const seconds = options.seed === void 0 ? 2 : 4;
    const length = Math.floor(sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    const random = options.seed === void 0 ? Math.random : seededRandom(options.seed);
    const maximumCode = options.bitDepth ? Math.pow(2, Math.max(2, Math.min(16, options.bitDepth))) - 1 : 0;
    for (let i = 0; i < data.length; i++) {
      const value = random() * 2 - 1;
      data[i] = maximumCode ? Math.round((value + 1) * maximumCode / 2) / maximumCode * 2 - 1 : value;
    }
    buffers.set(key, buffer);
    return buffer;
  }
  function applyEnvelope(param, from, points, time, scale = 1) {
    var _a;
    let previous = from;
    param.setValueAtTime(previous === 0 ? 0 : Math.max(previous, SILENCE), time);
    if (!points)
      return;
    for (const point of points) {
      const at = time + point.at;
      const to = point.to * scale;
      const exponential = ((_a = point.curve) != null ? _a : "exp") === "exp" && previous > 0 && to !== 0;
      if (exponential)
        param.exponentialRampToValueAtTime(Math.max(to, SILENCE), at);
      else
        param.linearRampToValueAtTime(to, at);
      previous = to;
    }
  }
  function buildFilter(ctx, spec, time) {
    var _a;
    const filter = ctx.createBiquadFilter();
    filter.type = spec.type;
    filter.Q.setValueAtTime((_a = spec.Q) != null ? _a : 1, time);
    applyEnvelope(filter.frequency, spec.frequency, spec.envelope, time);
    return filter;
  }
  var driveCurves = /* @__PURE__ */ new Map();
  function driveCurve(amount) {
    const key = Math.round(amount * 20);
    const cached = driveCurves.get(key);
    if (cached)
      return cached;
    const samples = 1024;
    const curve = new Float32Array(samples);
    const quantised = key / 20;
    const k = 1 + quantised * 40;
    for (let i = 0; i < samples; i++) {
      const x = i / (samples - 1) * 2 - 1;
      curve[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    driveCurves.set(key, curve);
    return curve;
  }
  function buildSource(ctx, source, destination, time, duration) {
    var _a;
    const start = time + ((_a = source.delay) != null ? _a : 0);
    const node = source.kind === "osc" ? (() => {
      const osc = ctx.createOscillator();
      osc.type = source.type;
      applyEnvelope(osc.frequency, source.frequency, source.pitch, start);
      return osc;
    })() : (() => {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer(ctx, source);
      noise.loop = true;
      noise.loopStart = 0;
      noise.loopEnd = noise.buffer.duration;
      if (source.playbackRate !== void 0) {
        noise.playbackRate.setValueAtTime(source.playbackRate, start);
      }
      return noise;
    })();
    const gain = ctx.createGain();
    applyEnvelope(gain.gain, 0, source.amp, start, source.gain);
    gain.gain.setValueAtTime(0, time + duration);
    let tail = gain;
    if (source.filter) {
      const filter = buildFilter(ctx, source.filter, start);
      gain.connect(filter);
      tail = filter;
    }
    node.connect(gain);
    tail.connect(destination);
    if (source.kind === "noise") {
      const offset = source.seed === void 0 ? Math.random() * 1.5 : 0;
      const noise = node;
      noise.start(start, offset);
    } else
      node.start(start);
    node.stop(time + duration);
    return node;
  }
  function renderVoice(ctx, spec, destination, time) {
    var _a;
    const output = ctx.createGain();
    output.gain.setValueAtTime((_a = spec.trim) != null ? _a : 1, time);
    output.connect(destination);
    const out = ctx.createGain();
    out.gain.setValueAtTime(spec.gain, time);
    let head = out;
    if (spec.drive && spec.drive > 0) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = driveCurve(spec.drive);
      shaper.oversample = "2x";
      out.connect(shaper);
      head = shaper;
    }
    if (spec.filter) {
      const filter = buildFilter(ctx, spec.filter, time);
      head.connect(filter);
      head = filter;
    }
    if (spec.pan !== void 0 && spec.pan !== 0 && ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, spec.pan)), time);
      head.connect(panner);
      head = panner;
    }
    head.connect(output);
    const nodes = spec.sources.map((source) => buildSource(ctx, source, out, time, spec.duration));
    const last = nodes[nodes.length - 1];
    if (last) {
      last.onended = () => {
        out.disconnect();
        head.disconnect();
        output.disconnect();
      };
    }
    return { output, endsAt: time + spec.duration };
  }

  // entry808.js
  window.Driftbox808 = { voices: TR808_VOICES, renderVoice, version: "0.6.0" };
})();
