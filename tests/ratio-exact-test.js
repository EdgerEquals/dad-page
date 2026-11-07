/* Exact ratios beside the live doubles (stage 1, not wired into the music).
   From the repo root: node tests/ratio-exact-test.js
   No browser, no audio, no server. */
'use strict';
var fs = require('fs'), vm = require('vm'), path = require('path');
var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'ratio-core.js'), 'utf8');
var pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name); } }
function throws(name, fn, part) {
  try { fn(); fail++; console.log('FAIL ' + name + ' (no throw)'); }
  catch (e) {
    var good = !part || String(e && e.message).indexOf(part) >= 0;
    if (good) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + ' (' + e.message + ')'); }
  }
}
function load(withBig) {
  var g = { Math: Math, Object: Object, Error: Error, Number: Number };
  g.BigInt = withBig ? BigInt : undefined;                               // undefined shadows the vm intrinsic, so the guard can be tested
  g.globalThis = g;
  vm.createContext(g);
  vm.runInContext(src, g, { filename: 'js/ratio-core.js' });
  return g.RatioCore;
}
var C = load(true), E = C.exact, PHI = (1 + Math.sqrt(5)) / 2;

ok('R is the algebraic double', Object.is(C.R, PHI));
ok('PHI is R', Object.is(C.PHI, C.R));
ok('IR is 1/R', Object.is(C.IR, 1 / C.R));
ok('IPHI is 1/PHI', Object.is(C.IPHI, 1 / C.PHI));
ok('five numeric keys stay numbers or rung', ['R', 'IR', 'PHI', 'IPHI'].every(function (k) { return typeof C[k] === 'number'; }) && typeof C.rung === 'function');

var ns = [-11, -7, -6, -5, -4, -3, -2, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3, 3.5, 4, 5, 6, 7, 9, 11, Infinity];
var refs = [undefined, null, 1, 2, 0, -1, 0.16];
var rungSame = true;
ns.forEach(function (n) {
  refs.forEach(function (ref) {
    var got = ref === undefined ? C.rung(n) : C.rung(n, ref);
    var exp = (ref == null ? 1 : ref) * Math.pow(PHI, n);
    if (!Object.is(got, exp)) rungSame = false;
  });
});
ok('rung matches Math.pow bit for bit, integer and non-integer', rungSame);

ok('3/2 * 2/3 = 1', E.eq(E.mul(E.rat(3, 2), E.rat(2, 3)), 1));
ok('1/3 + 1/6 = 1/2', E.eq(E.add(E.rat(1, 3), E.rat(1, 6)), E.rat(1, 2)));
ok('2/4 reduces to 1/2', E.eq(E.rat(2, 4), E.rat(1, 2)) && E.str(E.rat(2, 4)) === '1/2');
ok('string 3/2', E.eq(E.rat('3/2'), E.rat(3, 2)));
ok('signs fold into the numerator', E.eq(E.rat(2, -4), E.rat(-1, 2)) && E.str(E.rat(-3, -2)) === '3/2');
ok('(3/2)^5 = 243/32', E.eq(E.pow(E.rat(3, 2), 5), E.rat(243, 32)));
ok('(3/2)^-2 = 4/9', E.eq(E.pow(E.rat('3/2'), -2), E.rat(4, 9)));
ok('(-3/2)^3 = -27/8', E.eq(E.pow(E.rat(-3, 2), 3), E.rat(-27, 8)));
ok('(-3/2)^2 = 9/4', E.eq(E.pow(E.rat(-3, 2), 2), E.rat(9, 4)));
ok('bigint exponent', E.eq(E.pow(E.rat(3, 2), BigInt(4)), E.rat(81, 16)));

var phi = E.phi;
ok('φ prints as φ', E.str(phi) === 'φ');
ok('φ^2 = φ + 1', E.eq(E.pow(phi, 2), E.add(phi, 1)));
ok('φ^2 - φ - 1 = 0', E.eq(E.sub(E.pow(phi, 2), E.add(phi, 1)), 0));
ok('φ * φ^-1 = 1', E.eq(E.mul(phi, E.inv(phi)), 1));
ok('φ^-1 = φ - 1', E.eq(E.inv(phi), E.sub(phi, 1)));
ok('φ^2 - φ^-1 = 2', E.eq(E.sub(E.pow(phi, 2), E.inv(phi)), 2));   // the lenE identity, checked here only
ok('(1 + φ^-1 + φ^-2) / 2 = 1', E.eq(E.div(E.add(E.add(1, E.inv(phi)), E.pow(phi, -2)), 2), 1));
var rack = [0, 1, 2, 3].reduce(function (s, k) { return E.add(s, E.pow(phi, -k)); }, E.rat(0));
ok('1 + φ^-1 + φ^-2 + φ^-3 = 2φ - 1', E.eq(rack, E.alg(-1, 2)) && E.str(rack) === '-1 + 2φ');
ok('those four shares sum to one kit', E.eq([0, 1, 2, 3].reduce(function (s, k) { return E.add(s, E.div(E.pow(phi, -k), rack)); }, E.rat(0)), 1));

function fib(n) {
  var a = 0, b = 1, i, s = n < 0 ? -1 : 1, m = Math.abs(n);
  for (i = 0; i < m; i++) { var c = a + b; a = b; b = c; }
  if (n < 0 && (m % 2 === 0)) a = -a;
  return a;
}
var fibOk = true;
for (var n = -12; n <= 24; n++) {
  var want = E.add(E.mul(fib(n), phi), fib(n - 1));
  if (!E.eq(E.pow(phi, n), want)) fibOk = false;
}
ok('φ^n = F_n φ + F_(n-1) for n = -12..24', fibOk);

var order = [-1, 0, E.rat(1, 3), 1, E.rat(3, 2), E.rat(8, 5), phi, E.rat(13, 8), 2];
var ordOk = true;
for (var i = 0; i < order.length; i++) for (var j = 0; j < order.length; j++) {
  var c = E.cmp(order[i], order[j]);
  if (c !== (i < j ? -1 : i > j ? 1 : 0)) ordOk = false;
}
ok('order -1 < 0 < 1/3 < 1 < 3/2 < 8/5 < φ < 13/8 < 2', ordOk);
ok('8/5 < φ < 13/8 by the field, not by a float', E.cmp(E.rat(8, 5), phi) < 0 && E.cmp(phi, E.rat(13, 8)) < 0);

ok('num(φ) is RatioCore.PHI', Object.is(E.num(phi), C.PHI));
ok('num(3/2) is 1.5', Object.is(E.num(E.rat(3, 2)), 1.5));
ok('num(1/3) is the double 1/3', Object.is(E.num(E.rat(1, 3)), 1 / 3));
ok('num(0) is 0', Object.is(E.num(0), 0));
ok('num(φ^-1) is the double PHI - 1', Object.is(E.num(E.inv(phi)), C.PHI - 1));
ok('PHI - 1 and 1/PHI are one ulp apart', C.PHI - 1 !== C.IPHI && Math.abs((C.PHI - 1) - C.IPHI) === Math.pow(2, -53));
var near = true;
for (n = -40; n <= 40; n++) {
  var a = E.num(E.pow(phi, n)), b = Math.pow(PHI, n), scale = Math.max(Math.abs(a), Math.abs(b), 1);
  if (Math.abs(a - b) / scale > 1e-12) near = false;
}
ok('num(φ^n) within 1e-12 relative of Math.pow for n = -40..40', near);

var wide = E.div(E.rat(BigInt('1' + '0'.repeat(40)), 1), 3);
ok('a 40-digit ratio survives add and compare', E.eq(E.mul(wide, 3), E.rat(BigInt('1' + '0'.repeat(40)), 1)));
ok('num of a wide ratio is finite', isFinite(E.num(wide)) && E.num(wide) > 0);

throws('zero denominator', function () { E.rat(1, 0); }, 'zero denominator');
throws('float is not a ratio', function () { E.rat(1.5, 2); }, 'integer');
throws('NaN is not a ratio', function () { E.rat(NaN); }, 'integer');
throws('decimal string is not a ratio', function () { E.rat('1.5'); }, 'integer');
throws('division by zero', function () { E.div(1, 0); }, 'division by zero');
throws('inverse of zero', function () { E.inv(0); }, 'division by zero');
throws('zero to a negative power', function () { E.pow(0, -1); }, 'negative');
throws('zero to the power zero', function () { E.pow(0, 0); }, 'power zero');
throws('half power is refused', function () { E.pow(phi, 1 / 2); }, 'integer');
throws('real exponent is refused', function () { E.pow(E.rat(3, 2), 1.5); }, 'integer');
throws('exponent past the technical limit', function () { E.pow(phi, 4097); }, 'technical limit');
throws('negative exponent past the limit', function () { E.pow(phi, -4097); }, 'technical limit');
ok('exponent at the limit is accepted', E.eq(E.pow(E.rat(1), 4096), 1));
throws('alg does not take a golden coefficient', function () { E.alg(phi, 1); }, 'plain ratio');
throws('empty string', function () { E.rat(''); }, 'integer');
ok('isRat / isPhi', E.isRat(E.rat(3, 2)) && !E.isPhi(E.rat(3, 2)) && E.isPhi(phi) && !E.isRat(phi));

var bare = load(false);
ok('without BigInt the doubles still load', Object.is(bare.R, PHI) && Object.is(bare.rung(4), Math.pow(PHI, 4)));
throws('without BigInt, exact.rat refuses', function () { bare.exact.rat(3, 2); }, 'BigInt');
ok('without BigInt, reading nothing exact leaves rung usable', Object.is(bare.rung(-3, 2), 2 * Math.pow(PHI, -3)));

var t0 = process.hrtime.bigint();
for (n = 0; n < 500; n++) E.num(E.pow(phi, 30));
var ms = Number(process.hrtime.bigint() - t0) / 1e6;
ok('500 x num(φ^30) in ' + ms.toFixed(1) + ' ms (allocation stays off the audio thread)', ms < 500);

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
