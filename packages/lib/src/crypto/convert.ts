import * as tweetnacl from 'tweetnacl';

const nacl = (tweetnacl as any).lowlevel;
const gf0 = nacl.gf();
const gf1 = nacl.gf([1]);
const I = nacl.gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);

function inv25519(o: Float64Array, i: Float64Array) {
  var c = nacl.gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 253; a >= 0; a--) {
    nacl.S(c, c);
    if (a !== 2 && a !== 4) nacl.M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}

function par25519(a: Float64Array) {
  var d = new Uint8Array(32);
  nacl.pack25519(d, a);
  return d[0] & 1;
}

function neq25519(a: Float64Array, b: Float64Array): number {
  var c = new Uint8Array(32), d = new Uint8Array(32);
  nacl.pack25519(c, a);
  nacl.pack25519(d, b);
  return nacl.crypto_verify_32(c, 0, d, 0);
}

function unpackneg(r: Float64Array[], p: Uint8Array) {
  var t = nacl.gf(), chk = nacl.gf(), num = nacl.gf(),
    den = nacl.gf(), den2 = nacl.gf(), den4 = nacl.gf(),
    den6 = nacl.gf();

  nacl.set25519(r[2], gf1);
  nacl.unpack25519(r[1], p);
  nacl.S(num, r[1]);
  nacl.M(den, num, nacl.D);
  nacl.Z(num, num, r[2]);
  nacl.A(den, r[2], den);

  nacl.S(den2, den);
  nacl.S(den4, den2);
  nacl.M(den6, den4, den2);
  nacl.M(t, den6, num);
  nacl.M(t, t, den);

  nacl.pow2523(t, t);
  nacl.M(t, t, num);
  nacl.M(t, t, den);
  nacl.M(t, t, den);
  nacl.M(r[0], t, den);

  nacl.S(chk, r[0]);
  nacl.M(chk, chk, den);
  if (neq25519(chk, num)) nacl.M(r[0], r[0], I);

  nacl.S(chk, r[0]);
  nacl.M(chk, chk, den);
  if (neq25519(chk, num)) return -1;

  if (par25519(r[0]) === (p[31] >> 7)) nacl.Z(r[0], gf0, r[0]);

  nacl.M(r[3], r[0], r[1]);
  return 0;
}



// Converts Ed25519 public key to Curve25519 public key.
// montgomeryX = (edwardsY + 1)*inverse(1 - edwardsY) mod p
export function convertPublicKey(pk: Uint8Array): Uint8Array {
  var z = new Uint8Array(32),
    q = [nacl.gf(), nacl.gf(), nacl.gf(), nacl.gf()],
    a = nacl.gf(), b = nacl.gf();

  if (unpackneg(q, pk)) {
    throw new Error('Invalid public key');
  }

  var y = q[1];

  nacl.A(a, gf1, y);
  nacl.Z(b, gf1, y);
  inv25519(b, b);
  nacl.M(a, a, b);

  nacl.pack25519(z, a);
  return z;
}

// Converts Ed25519 secret key to Curve25519 secret key.
export function convertSecretKey(sk: Uint8Array) {
  var d = new Uint8Array(64), o = new Uint8Array(32), i;
  nacl.crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;
  for (i = 0; i < 32; i++) o[i] = d[i];
  for (i = 0; i < 64; i++) d[i] = 0;
  return o;
}
