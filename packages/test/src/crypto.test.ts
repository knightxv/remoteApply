import test from 'ava';
import { crypto, SeedLength } from '@cccd/lib';

test('测试是否能正常加解密数据', async (t) => {
  const seed1 = new Uint8Array(32).fill(1);
  const keyPair1 = crypto.keyPair(seed1);
  const seed2 = new Uint8Array(32).fill(2);
  const keyPair2 = crypto.keyPair(seed2);
  const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  const sigature = crypto.sign(data, keyPair1.secretKey);
  const ok = crypto.verify(data, sigature, keyPair1.publicKey);
  t.deepEqual(ok, true);

  const encryptData = crypto.encrypt(data, keyPair2.publicKey, keyPair1.secretKey);
  const decryptData = crypto.decrypt(encryptData, keyPair1.publicKey, keyPair2.secretKey);
  t.deepEqual(data, decryptData);
});
