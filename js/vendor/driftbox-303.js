/* driftbox 303: the TB-303 voice from @driftbox/engine 0.6.0 by Louis Emmett, MIT licence (full text below).
   Source: https://github.com/emmettl/driftbox (packages/engine, commit c92e124, 18 Oct 2026), npm @driftbox/engine@0.6.0.
   Bundled unchanged from dist/bassline.js, dist/bass.js, dist/dsp/worklet.js, dist/dsp/ladder.js and dist/voices/common.js into one
   classic script (esbuild, ES2022 so the ladder class keeps its fields when it is stringified into the AudioWorklet), exposing
   window.Driftbox303 = { Bassline, bassNote, params, SLIDE, version }. The ladder is Antti Huovilainen's transistor-ladder model, as
   driftbox credits it. Used by Ed's DJ as the main unit of the 303 rack (js/dj-extras.js), loaded only when an acid line plays
   (Danny 15:4x AWST 27 Oct: 'always for acknowledging anything I'm using').

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
  // ../dl/driftbox/x/package/dist/dsp/ladder.js
  var Ladder = class {
    /** The four one-pole stages. */
    s0 = 0;
    s1 = 0;
    s2 = 0;
    s3 = 0;
    /** Stage 3's previous output, and the half-sample-delayed average fed back. */
    prev3 = 0;
    feedback = 0;
    /** tanh of each stage output, carried over so it is computed once per stage. */
    t0 = 0;
    t1 = 0;
    t2 = 0;
    t3 = 0;
    sampleRate;
    constructor(sampleRate) {
      this.sampleRate = sampleRate;
    }
    reset() {
      this.s0 = this.s1 = this.s2 = this.s3 = 0;
      this.t0 = this.t1 = this.t2 = this.t3 = 0;
      this.prev3 = this.feedback = 0;
    }
    /**
     * One sample through the filter.
     *
     * `cutoff` is in Hz and `resonance` runs 0..1, where 1 is a little past the point of
     * self-oscillation. Both are read per sample rather than cached, because on a 303 the
     * cutoff is being swept by an envelope on every single note — a filter whose
     * coefficients only update per block is audibly steppy on a fast decay.
     */
    process(input, cutoff, resonance) {
      const nyquist = this.sampleRate * 0.5;
      const clamped = cutoff < 20 ? 20 : cutoff > nyquist * 0.92 ? nyquist * 0.92 : cutoff;
      const f = clamped / this.sampleRate / 2;
      const f2 = f * f;
      const f3 = f2 * f;
      const fcr = 1.873 * f3 + 0.4955 * f2 - 0.649 * f + 0.9988;
      const acr = -3.9364 * f2 + 1.8409 * f + 0.9968;
      const tune = 1 - Math.exp(-2 * Math.PI * f * fcr);
      const k = 4.8 * (resonance < 0 ? 0 : resonance > 1 ? 1 : resonance) * acr;
      for (let pass = 0; pass < 2; pass++) {
        const x = input - k * (this.feedback - 0.5 * input);
        const tx = Math.tanh(x);
        this.s0 += tune * (tx - this.t0);
        this.t0 = Math.tanh(this.s0);
        this.s1 += tune * (this.t0 - this.t1);
        this.t1 = Math.tanh(this.s1);
        this.s2 += tune * (this.t1 - this.t2);
        this.t2 = Math.tanh(this.s2);
        this.s3 += tune * (this.t2 - this.t3);
        this.feedback = (this.s3 + this.prev3) * 0.5;
        this.prev3 = this.s3;
        this.t3 = Math.tanh(this.s3);
      }
      return this.s3;
    }
  };

  // ../dl/driftbox/x/package/dist/dsp/worklet.js
  var LADDER_PROCESSOR = "driftbox-ladder";
  var SOURCE = `
const Ladder = ${Ladder.toString()}

class LadderProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      // a-rate on both, because on a 303 the cutoff is being swept by an envelope on
      // every note. A k-rate parameter only updates once per 128-sample block, which
      // on a fast decay is audibly steppy \u2014 a zipper on the front of each note.
      { name: 'frequency', defaultValue: 800, minValue: 20, maxValue: 20000, automationRate: 'a-rate' },
      { name: 'resonance', defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: 'a-rate' },
    ]
  }

  constructor() {
    super()
    this.filters = []
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]
    const frequency = parameters.frequency
    const resonance = parameters.resonance

    for (let channel = 0; channel < output.length; channel++) {
      const source = input[channel]
      const target = output[channel]
      let filter = this.filters[channel]
      if (!filter) filter = this.filters[channel] = new Ladder(sampleRate)

      for (let i = 0; i < target.length; i++) {
        target[i] = filter.process(
          source ? source[i] : 0,
          frequency.length > 1 ? frequency[i] : frequency[0],
          resonance.length > 1 ? resonance[i] : resonance[0],
        )
      }
    }

    // Never retire. A self-oscillating filter keeps making sound with no input at all,
    // so the usual "no input, no output, shut down" optimisation would silence the
    // squelch exactly at the top of the resonance knob where it matters.
    return true
  }
}

registerProcessor(${JSON.stringify(LADDER_PROCESSOR)}, LadderProcessor)
`;
  var loaded = /* @__PURE__ */ new WeakMap();
  function loadLadder(ctx) {
    const existing = loaded.get(ctx);
    if (existing)
      return existing;
    const attempt = (async () => {
      if (!ctx.audioWorklet)
        return false;
      try {
        const url = URL.createObjectURL(new Blob([SOURCE], { type: "application/javascript" }));
        try {
          await ctx.audioWorklet.addModule(url);
        } finally {
          URL.revokeObjectURL(url);
        }
        return true;
      } catch {
        return false;
      }
    })();
    loaded.set(ctx, attempt);
    return attempt;
  }

  // ../dl/driftbox/x/package/dist/bassline.js
  var SILENCE = 1e-4;
  var ATTACK = 3e-3;
  var RELEASE = 0.012;
  var Bassline = class _Bassline {
    output;
    ctx;
    osc;
    vca;
    cutoff;
    resonance;
    /** What the oscillator was last told to do, and when. Web Audio has no way to ask a
     *  param what it will be at a future time, and every note here is scheduled ahead of
     *  the clock — so a slide's starting pitch and level have to be remembered rather
     *  than read back. */
    lastFrequency;
    lastGain = 0;
    /** When the last scheduled note stops holding. A note that arrives before this one is
     *  a slide landing on a note that is still sounding, so the VCA has to pick up from
     *  the level it is actually at rather than from silence. */
    heldUntil = 0;
    wave = "sawtooth";
    /** What a resonance of 1 means to whichever filter is in the chain: 1 for the ladder,
     *  which takes 0..1 directly, or a biquad's Q. */
    resonanceScale;
    constructor(ctx, filter, cutoff, resonance, resonanceScale) {
      this.ctx = ctx;
      this.cutoff = cutoff;
      this.resonance = resonance;
      this.resonanceScale = resonanceScale;
      this.osc = ctx.createOscillator();
      this.osc.type = this.wave;
      this.lastFrequency = 110;
      this.osc.frequency.setValueAtTime(this.lastFrequency, 0);
      this.vca = ctx.createGain();
      this.vca.gain.setValueAtTime(0, 0);
      this.output = ctx.createGain();
      this.output.gain.setValueAtTime(1, 0);
      this.osc.connect(filter);
      filter.connect(this.vca);
      this.vca.connect(this.output);
      this.osc.start();
    }
    /**
     * Build a 303, with a real ladder if this context can run one.
     *
     * The fallback is a single BiquadFilterNode: two poles instead of four, linear, with
     * nothing saturating inside the feedback loop and so no self-oscillation at all. It
     * is a filter sweep rather than a squelch, and it is meant only to keep an old
     * browser or a strict Content-Security-Policy from getting silence. Cascading two
     * biquads would buy the four poles but not the character, and cannot be done cleanly
     * anyway — an AudioParam cannot drive another AudioParam, so the two stages would
     * need their sweeps scheduled twice and kept in step by hand.
     *
     * If a bassline ever sounds tame, check `usingLadder` before blaming the patch.
     */
    static async create(ctx, options = {}) {
      const usingLadder = options.useLadder !== false && await loadLadder(ctx);
      if (usingLadder) {
        const node = new AudioWorkletNode(ctx, LADDER_PROCESSOR);
        return {
          bassline: new _Bassline(ctx, node, node.parameters.get("frequency"), node.parameters.get("resonance"), 1),
          usingLadder
        };
      }
      const biquad = ctx.createBiquadFilter();
      biquad.type = "lowpass";
      return {
        bassline: new _Bassline(ctx, biquad, biquad.frequency, biquad.Q, 18),
        usingLadder
      };
    }
    /** Schedule one note at `time` on the audio clock. */
    play(note, time) {
      if (note.wave !== this.wave) {
        this.wave = note.wave;
        this.osc.type = note.wave;
      }
      const frequency = this.osc.frequency;
      frequency.cancelScheduledValues(time);
      if (note.glide > 0) {
        frequency.setValueAtTime(note.glideFrom ?? this.lastFrequency, time);
        frequency.exponentialRampToValueAtTime(note.frequency, time + note.glide);
      } else {
        frequency.setValueAtTime(note.frequency, time);
      }
      this.lastFrequency = note.frequency;
      this.resonance.cancelScheduledValues(time);
      this.resonance.setValueAtTime(note.resonance * this.resonanceScale, time);
      if (note.retrigger) {
        this.cutoff.cancelScheduledValues(time);
        this.cutoff.setValueAtTime(note.filter.peak, time);
        this.cutoff.exponentialRampToValueAtTime(note.filter.base, time + note.filter.decay);
      }
      const gain = this.vca.gain;
      gain.cancelScheduledValues(time);
      gain.setValueAtTime(time < this.heldUntil ? Math.max(this.lastGain, SILENCE) : SILENCE, time);
      gain.linearRampToValueAtTime(note.gain, time + (note.retrigger ? ATTACK : Math.min(note.glide, note.gate)));
      gain.setValueAtTime(note.gain, time + note.gate);
      gain.exponentialRampToValueAtTime(SILENCE, time + note.gate + RELEASE);
      this.lastGain = note.gain;
      this.heldUntil = time + note.gate;
    }
    /** Cut the line off — stopping the transport should not leave a note hanging. */
    silence(time = this.ctx.currentTime) {
      const gain = this.vca.gain;
      gain.cancelScheduledValues(time);
      gain.setValueAtTime(time < this.heldUntil ? Math.max(this.lastGain, SILENCE) : SILENCE, time);
      gain.exponentialRampToValueAtTime(SILENCE, time + 0.02);
      this.lastGain = 0;
      this.heldUntil = 0;
    }
    dispose() {
      try {
        this.osc.stop();
      } catch {
      }
      this.osc.disconnect();
      this.vca.disconnect();
      this.output.disconnect();
    }
  };

  // ../dl/driftbox/x/package/dist/voices/common.js
  function range(value, low, high) {
    return low + (high - low) * Math.max(0, Math.min(1, value));
  }
  function ratioRange(value, low, high) {
    return low * Math.pow(high / low, Math.max(0, Math.min(1, value)));
  }

  // ../dl/driftbox/x/package/dist/bass.js
  function bassStepSounds(step) {
    return step.note !== null && step.gate !== false;
  }
  var DEFAULT_BASS_PARAMS = {
    tune: 0.5,
    wave: 0,
    cutoff: 0.32,
    resonance: 0.72,
    envMod: 0.6,
    decay: 0.42,
    accent: 0.6,
    level: 0.7
  };
  var BASS_VOICES = [
    { id: "303.a", name: "303 A" },
    { id: "303.b", name: "303 B" }
  ];
  var BASS_BY_ID = new Map(BASS_VOICES.map((v) => [v.id, v]));
  var SLIDE_SECONDS = 0.055;
  var ROOT_HZ = 55;
  var CUTOFF_CEILING = 11e3;
  function bassNote(params, step, previous, stepSeconds) {
    const pitch = step.note;
    if (!bassStepSounds(step) || pitch === null)
      return null;
    const root = ratioRange(params.tune, ROOT_HZ / 2, ROOT_HZ * 2);
    const frequency = root * Math.pow(2, pitch / 12);
    const glidingIn = previous.slide && previous.note !== null;
    const slidingIn = glidingIn && bassStepSounds(previous);
    const accent = step.accent ? range(params.accent, 0.15, 1) : 0;
    const base = ratioRange(params.cutoff, 90, 4200);
    const peak = Math.min(CUTOFF_CEILING, base * (1 + range(params.envMod, 0, 1) * 7 + accent * 5));
    return {
      frequency,
      glide: glidingIn ? SLIDE_SECONDS : 0,
      ...glidingIn ? { glideFrom: root * Math.pow(2, previous.note / 12) } : {},
      retrigger: !slidingIn,
      // A sliding note has to outlast its own step or there is nothing left sounding for
      // the next note to glide out of. An ordinary one stops short, leaving the gap that
      // makes a line articulate rather than a drone.
      gate: stepSeconds * (step.slide ? 1.05 : 0.52),
      wave: params.wave < 0.5 ? "sawtooth" : "square",
      gain: range(params.level, 0, 1) * (0.62 + 0.38 * accent),
      // Accent leans on the resonance circuit too, which is why an accented note squelches
      // harder and not just louder.
      resonance: Math.min(1, range(params.resonance, 0, 1) + accent * 0.12),
      filter: {
        peak,
        base,
        decay: ratioRange(params.decay, 0.05, 1.4)
      }
    };
  }

  // entry303.js
  window.Driftbox303 = { Bassline, bassNote, params: DEFAULT_BASS_PARAMS, SLIDE: SLIDE_SECONDS, version: "0.6.0" };
})();
