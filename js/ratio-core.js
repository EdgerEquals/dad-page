/* RATIO CORE (ratiocore1, step 1 of the ratio dial; Danny 10:23-10:56 AWST 30 Oct 2026: 'composers were just choosing ratios ... swap
   out the Golden ratio with any ratio'; 31 Oct 'Yes go' to the ratio-dial order, ratio core first). R is the one base ratio the music is
   built from. Every music file (the engine, extras, effects, voice, bus worklet, desk registry, MIDI writer) reads it here instead of
   defining its own phi, so a later dial can swap it in one place. Step 1 adds no dial: R = phi, and the music is bit for bit as before.
   Loaded as a plain script (window) and into the AudioWorklet (globalThis) before js/dj-bus-worklet.js. No timers, no DOM, no network.
     R, IR        the base ratio and its inverse (today phi and phi^-1), IEEE doubles, unchanged
     PHI, IPHI    the golden ratio itself, for the places still marked 'φ-only: step 2' (the golden draws, which need an irrational
                  step, and the spots that lean on phi's own algebra, phi^2 = phi + 1); they keep phi whatever R becomes until step 2
     rung(n, ref) ref x R^n: a step on the ladder (ref defaults to 1). Still Math.pow, so old callers stay bit for bit, including a
                  non-integer n
     exact        exact ratios and exact golden values (Danny 15:03 AWST 7 Nov 2026 'Okay good let’s go', stage 1 only). Nothing in the
                  music reads this yet. A plain ratio is p/q. A golden value is a + bφ, φ = (1 + √5) / 2, reduced with φ^2 = φ + 1.
                  Integer powers stay in that form. exact.num is the conversion to a double. A non-integer power is refused: a square
                  root or a real exponent is a double on purpose, at the call site, not inside here.
                  Allocates a few small objects per call. The bus worklet keeps using the doubles above; do not call exact from the
                  audio callback. Needs BigInt (iOS 14 and later, same era as the worklet). The doubles above do not need it, and this
                  file still parses where BigInt is absent.
                  Exponent past ±4096 is refused: a technical CPU bound so one call cannot stall the page, not a musical rung. */
(function (G) {
  'use strict';
  if (G.RatioCore) return;
  var PHI = (1 + Math.sqrt(5)) / 2, R = PHI;                             // phi: the golden ratio; R = phi until the ratio dial (step 3)
  function rung(n, ref) { return (ref == null ? 1 : ref) * Math.pow(R, n); }

  var B0 = null, ZERO = null, ONE = null, PHI_EX = null;
  function big() {
    if (B0) return B0;
    if (typeof BigInt !== 'function') throw new Error('ratio: exact arithmetic needs BigInt');
    B0 = { z: BigInt(0), o: BigInt(1), two: BigInt(2), five: BigInt(5), lim: BigInt(4096), safe: BigInt(9007199254740991) };   // technical: |exponent| <= 4096; safe = 2^53 - 1
    return B0;
  }
  function constants() {
    if (ZERO) return;
    var B = big();
    ZERO = Object.freeze({ k: 'q', n: B.z, d: B.o });
    ONE = Object.freeze({ k: 'q', n: B.o, d: B.o });
    PHI_EX = Object.freeze({ k: 'p', a: ZERO, b: ONE });                   // 0 + 1φ
  }
  function zero() { constants(); return ZERO; }
  function one() { constants(); return ONE; }
  function igcd(a, b) {
    var z = big().z;
    while (b !== z) { var t = a % b; a = b; b = t; }
    return a === z ? big().o : a;
  }
  function q(n, d) {
    var B = big();
    if (d === B.z) throw new Error('ratio: zero denominator');
    if (d < B.z) { n = -n; d = -d; }
    if (n === B.z) return zero();
    var g = igcd(n < B.z ? -n : n, d);
    if (g !== B.o) { n /= g; d /= g; }
    return Object.freeze({ k: 'q', n: n, d: d });
  }
  function intOf(x, name) {
    big();                                                                 // so a missing BigInt fails here, before any bare BigInt() call
    if (typeof x === 'bigint') return x;
    if (typeof x === 'number' && x === Math.trunc(x) && Math.abs(x) <= 9007199254740991) return BigInt(x);
    if (typeof x === 'string' && /^-?\d+$/.test(x)) return BigInt(x);
    throw new Error('ratio: ' + name + ' must be an integer');
  }
  function isRat(x) { return !!(x && x.k === 'q' && typeof x.n === 'bigint' && typeof x.d === 'bigint'); }
  function isPhi(x) { return !!(x && x.k === 'p' && isRat(x.a) && isRat(x.b) && x.b.n.toString() !== '0'); }
  function as(x) {
    if (isRat(x) || (x && x.k === 'p' && isRat(x.a) && isRat(x.b))) return x;
    return rat(x);
  }
  function rat(n, d) {
    if (isRat(n) && d === undefined) return n;
    if (typeof n === 'string' && d === undefined) {
      big();
      var s = n.trim(), m = /^(-?\d+)\/(-?\d+)$/.exec(s);
      if (m) return q(BigInt(m[1]), BigInt(m[2]));
      return q(intOf(s, 'ratio'), big().o);
    }
    return q(intOf(n, 'numerator'), d === undefined ? big().o : intOf(d, 'denominator'));
  }
  function pin(a, b) {
    if (!isRat(a) || !isRat(b)) throw new Error('ratio: a golden value is not a plain ratio');
    if (b.n === big().z) return a;
    return Object.freeze({ k: 'p', a: a, b: b });
  }
  function alg(a, b) {
    if (a && a.k === 'p' || b && b.k === 'p') throw new Error('ratio: a golden value is not a plain ratio');
    return pin(as(a), b === undefined ? zero() : as(b));
  }
  function addQ(x, y) { return q(x.n * y.d + y.n * x.d, x.d * y.d); }
  function subQ(x, y) { return q(x.n * y.d - y.n * x.d, x.d * y.d); }
  function mulQ(x, y) { return q(x.n * y.n, x.d * y.d); }
  function negQ(x) { return q(-x.n, x.d); }
  function lift(x) { return x.k === 'p' ? x : { a: x, b: zero() }; }   // a rational as a + 0φ, not stored (pin would fold it back)
  function add(x, y) {
    x = as(x); y = as(y);
    if (x.k === 'q' && y.k === 'q') return addQ(x, y);
    x = lift(x); y = lift(y);
    return pin(addQ(x.a, y.a), addQ(x.b, y.b));
  }
  function neg(x) {
    x = as(x);
    return x.k === 'q' ? negQ(x) : pin(negQ(x.a), negQ(x.b));
  }
  function sub(x, y) { return add(x, neg(y)); }
  function mulP(x, y) {                                         // (a + bφ)(c + dφ) = ac + bd + (ad + bc + bd)φ
    var ac = mulQ(x.a, y.a), bd = mulQ(x.b, y.b), ad = mulQ(x.a, y.b), bc = mulQ(x.b, y.a);
    return pin(addQ(ac, bd), addQ(addQ(ad, bc), bd));
  }
  function mul(x, y) {
    x = as(x); y = as(y);
    if (x.k === 'q' && y.k === 'q') return mulQ(x, y);
    if (x.k === 'q') return pin(mulQ(x, y.a), mulQ(x, y.b));   // q(a + bφ) = qa + qb φ
    if (y.k === 'q') return pin(mulQ(y, x.a), mulQ(y, x.b));
    return mulP(x, y);
  }
  function inv(x) {
    x = as(x);
    var B = big();
    if (x.k === 'q') { if (x.n === B.z) throw new Error('ratio: division by zero'); return q(x.d, x.n); }
    var a = x.a, b = x.b, norm = subQ(addQ(mulQ(a, a), mulQ(a, b)), mulQ(b, b));   // a^2 + ab - b^2, the norm in Q(φ)
    if (norm.n === B.z) throw new Error('ratio: division by zero');
    return pin(mulQ(addQ(a, b), inv(norm)), mulQ(negQ(b), inv(norm)));
  }
  function div(x, y) {
    y = as(y);
    if (y.k === 'q' && y.n === big().z) throw new Error('ratio: division by zero');
    return mul(x, inv(y));
  }
  function isZero(x) { return x.k === 'q' && x.n === big().z; }
  function pow(x, k) {
    var B = big();
    k = intOf(k, 'exponent');
    var ak = k < B.z ? -k : k;
    if (ak > B.lim) throw new Error('ratio: exponent past the technical limit (4096)');
    x = as(x);
    if (k < B.z) { if (isZero(x)) throw new Error('ratio: zero to a negative power'); return pow(inv(x), -k); }
    if (k === B.z) { if (isZero(x)) throw new Error('ratio: zero to the power zero'); return one(); }
    var r = one(), base = x;
    while (k > B.z) {
      if ((k & B.o) === B.o) r = mul(r, base);
      k >>= B.o;
      if (k > B.z) base = mul(base, base);
    }
    return r;
  }
  function sgn(x) {
    x = as(x);
    var B = big();
    if (x.k === 'q') return x.n > B.z ? 1 : x.n < B.z ? -1 : 0;
    var P = x.a.n * x.b.d, Rv = x.b.n * x.a.d, U = B.two * P + Rv, V = Rv;   // sign of P + Rφ = sign of (2P + R) + R√5
    if (V === B.z) return U > B.z ? 1 : U < B.z ? -1 : 0;
    if (U === B.z) return V > B.z ? 1 : -1;
    var up = U > B.z, vp = V > B.z;
    if (up === vp) return up ? 1 : -1;
    var left = U * U, right = B.five * V * V, c = left > right ? 1 : left < right ? -1 : 0;
    return up ? c : -c;
  }
  function cmp(x, y) { return sgn(sub(x, y)); }
  function eq(x, y) { return cmp(x, y) === 0; }
  function sh(n) { var m = n.toString(2).length; return m > 53 ? m - 53 : 0; }   // keep a 53-bit mantissa for the double boundary
  function numQ(n, d) {
    var B = big();
    if (n === B.z) return 0;
    var neg = n < B.z;
    if (neg) n = -n;
    if (d < B.z) { d = -d; neg = !neg; }
    var kn = sh(n), kd = sh(d), v = Number(n >> BigInt(kn)) / Number(d >> BigInt(kd)) * Math.pow(2, kn - kd);
    return neg ? -v : v;
  }
  function isqrt(n) {                                                    // floor(sqrt(n)), n >= 0
    var B = big();
    if (n < B.two) return n;
    var x = n, y = (x + B.o) / B.two;
    while (y < x) { x = y; y = (x + n / x) / B.two; }
    return x;
  }
  function numUV(U, V, D) {                                              // (U + V√5) / D, cancellation-safe
    var B = big();
    if (D < B.z) { U = -U; V = -V; D = -D; }
    if (V === B.z) return numQ(U, D);
    var au = U < B.z ? -U : U, av = V < B.z ? -V : V;
    var k = Math.max(au.toString(2).length, av.toString(2).length) + 96;
    var scale = B.o << BigInt(k), root = isqrt(B.five * scale * scale);   // floor(√5 · 2^k), absolute error under |V| / 2^k
    return numQ(U * scale + V * root, D * scale);
  }
  function safeRat(q) {
    var s = big().safe;
    return q.n <= s && -q.n <= s && q.d <= s;
  }
  function num(x) {
    x = as(x);
    if (x.k === 'q') return numQ(x.n, x.d);
    if (safeRat(x.a) && safeRat(x.b)) {
      var av = Number(x.a.n) / Number(x.a.d), bv = Number(x.b.n) / Number(x.b.d);
      var direct = av + bv * PHI, mag = Math.abs(av) + Math.abs(bv * PHI);   // φ^-1 lands on PHI - 1, one ulp away from 1/PHI
      if (Math.abs(direct) * 8 >= mag) return direct;                      // under ~3 bits of cancellation the sum is already a faithful double
    }
    var P = x.a.n * x.b.d, Rv = x.b.n * x.a.d, Dd = x.a.d * x.b.d;        // (P + Rv φ) / Dd = (2P + Rv + Rv√5) / (2 Dd)
    var B = big();
    return numUV(B.two * P + Rv, Rv, B.two * Dd);
  }
  function str(x) {
    x = as(x);
    var B = big();
    if (x.k === 'q') return x.d === B.o ? x.n.toString() : x.n.toString() + '/' + x.d.toString();
    var mag = x.b.n < B.z ? neg(x.b) : x.b, bs = mag.n === B.o && mag.d === B.o ? 'φ' : str(mag) + 'φ', a = str(x.a);
    if (x.b.n < B.z) return a === '0' ? '-' + bs : a + ' - ' + bs;
    return a === '0' ? bs : a + ' + ' + bs;
  }
  var exact = Object.freeze({
    rat: rat, alg: alg, get phi() { constants(); return PHI_EX; },
    add: add, sub: sub, mul: mul, div: div, neg: neg, inv: inv, pow: pow, cmp: cmp, eq: eq, num: num, str: str, isRat: isRat, isPhi: isPhi
  });
  G.RatioCore = Object.freeze({ R: R, IR: 1 / R, PHI: PHI, IPHI: 1 / PHI, rung: rung, exact: exact });
})(typeof window !== 'undefined' ? window : globalThis);
