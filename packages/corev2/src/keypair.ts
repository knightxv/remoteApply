import { crypto, encodeBase64, decodeBase64, decodeUTF8, PublicKeyLength, SecretKeyLength } from '@cccd/lib'

export type PublicKey = string
export type PrivateKey = string
export interface KeyPair {
  publicKey: PublicKey;   // base64encode
  privateKey: PrivateKey; // base64encode
}

export function keyPairFromPublicKey(publicKey: PublicKey): KeyPair {
  try {
    const publicKeyByets = decodeBase64(publicKey);
    if (publicKeyByets.byteLength == PublicKeyLength) {
      return { publicKey, privateKey: "", }
    }
  } catch (e) {

  }

  try {
    const publicKeyByets = decodeUTF8(publicKey);
    if (publicKeyByets.byteLength == PublicKeyLength) {
      return { publicKey: encodeBase64(publicKeyByets), privateKey: "", }
    }
  } catch (e) {
  }

  throw new Error(`bad publicKey ${publicKey}, must be base64 or utf8 encoded, and has ${PublicKeyLength} bytes`);
}

export function keyPairFromPrivateKey(privateKey: PrivateKey): KeyPair {
  try {
    const privateKeyByets = decodeBase64(privateKey);
    if (privateKeyByets.byteLength == SecretKeyLength) {
      const publicKey = encodeBase64(crypto.fromSecretKey(privateKeyByets).publicKey);
      return { publicKey, privateKey, }
    }
  } catch (e) {
  }

  try {
    const privateKeyByets = decodeUTF8(privateKey);
    if (privateKeyByets.byteLength == SecretKeyLength) {
      const publicKey = encodeBase64(crypto.fromSecretKey(privateKeyByets).publicKey);
      return { publicKey, privateKey: encodeBase64(privateKeyByets), }
    }
  } catch (e) {
  }

  throw new Error(`bad privateKey ${privateKey}, must be base64 or utf8 encoded, and has ${SecretKeyLength} bytes`);
}