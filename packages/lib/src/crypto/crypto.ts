import * as tweetnacl from 'tweetnacl';
export { decodeUTF8, encodeUTF8, decodeBase64, encodeBase64 } from 'tweetnacl-util';
import { convertPublicKey, convertSecretKey } from './convert';

function equal(ua1: Uint8Array, ua2: Uint8Array): boolean {
  if (ua1.byteLength != ua2.byteLength) {
    return false;
  }

  for (var i = 0; i < ua1.byteLength; i++) {
    if (ua1[i] != ua2[i]) {
      return false;
    }
  }

  return true;
}

const SignatureSignOffset = 0;
const SignatureSignLength = 64;     // tweetnacl.sign.signatureLength // // tweetnacl.sign.seedLength
const SignatureHashOffset = 64;
const SignatureHashLength = 64;     // tweetnacl.hash.hashLength
const NonceLength = 24;             // tweetnacl.box.nonceLength
export const PublicKeyLength = 32;  // tweetnacl.sign.publicKeyLength
export const SecretKeyLength = 64;  // tweetnacl.sign.secretKeyLength
export const SeedLength = 32;       // tweetnacl.sign.seedLength
export const MessageHashLength = SignatureHashLength;
export const SignatureLength = SignatureSignLength + SignatureHashLength;


export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export class Crypto {
  public seed(): Uint8Array {
    return tweetnacl.randomBytes(SeedLength);
  }

  public keyPair(seed?: Uint8Array): KeyPair {
    if (seed === undefined) {
      seed = this.seed();
    } else {
      if (seed.byteLength != SeedLength) {
        throw new Error('bad seed size');
      }
    }

    return tweetnacl.sign.keyPair.fromSeed(seed);
  }

  public fromSecretKey(secretKey: Uint8Array): KeyPair {
    if (secretKey.byteLength != SecretKeyLength) {
      throw new Error('bad secretKey size');
    }
    return tweetnacl.sign.keyPair.fromSecretKey(secretKey);
  }

  public hash(message: Uint8Array): Uint8Array {
    const h = tweetnacl.hash(message);
    if (h.byteLength != MessageHashLength) {
      throw new Error('bad hash size');
    }
    return h;
  }

  public sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
    if (secretKey.byteLength != SecretKeyLength) {
      throw new Error('bad secretKey size');
    }
    const msgHash = tweetnacl.hash(message);
    const s = tweetnacl.sign(msgHash, secretKey);
    if (s.byteLength != SignatureLength) {
      throw new Error('bad signature size');
    }
    return s;
  }

  public verify(message: Uint8Array, sigature: Uint8Array, publicKey: Uint8Array): boolean {
    if (sigature.byteLength != SignatureLength) {
      throw new Error('bad sigature size');
    }

    if (publicKey.byteLength != PublicKeyLength) {
      throw new Error('bad publicKey size');
    }

    const hashData = sigature.subarray(SignatureHashOffset, SignatureHashOffset + SignatureHashLength);
    if (message.byteLength < 256) {
      const msgHash = this.hash(message);
      if (!equal(msgHash, hashData)) {
        throw new Error('bad hash value');
      }

      return this.verifySignature(sigature, publicKey);
    } else {
      const ok = this.verifySignature(sigature, publicKey);
      if (!ok) {
        return false;
      }
      const msgHash = this.hash(message);
      return equal(msgHash, hashData);
    }
  }

  public verifySignature(sigature: Uint8Array, publicKey: Uint8Array): boolean {
    if (sigature.byteLength != SignatureLength) {
      throw new Error('bad sigature size');
    }

    if (publicKey.byteLength != PublicKeyLength) {
      throw new Error('bad publicKey size');
    }

    const signData = sigature.subarray(SignatureSignOffset, SignatureSignOffset + SignatureSignLength);
    const hashData = sigature.subarray(SignatureHashOffset, SignatureHashOffset + SignatureHashLength);
    return tweetnacl.sign.detached.verify(hashData, signData, publicKey);
  }

  public encrypt(data: Uint8Array, publicKey: Uint8Array, secretKey: Uint8Array): Uint8Array {
    if (publicKey.byteLength != PublicKeyLength) {
      throw new Error('bad publicKey size');
    }

    if (secretKey.byteLength != SecretKeyLength) {
      throw new Error('bad secretKey size');
    }

    const nonce = tweetnacl.randomBytes(tweetnacl.box.nonceLength);
    const convertedPublicKey = convertPublicKey(publicKey);
    const convertedSecretKey = convertSecretKey(secretKey);
    const encrypted = tweetnacl.box(data, nonce, convertedPublicKey, convertedSecretKey);
    const n = new Uint8Array(encrypted.byteLength + nonce.byteLength);
    n.set(encrypted);
    n.set(nonce, encrypted.length);
    return n;
  }

  public decrypt(data: Uint8Array, publicKey: Uint8Array, secretKey: Uint8Array): Uint8Array {
    if (publicKey.byteLength != PublicKeyLength) {
      throw new Error('bad publicKey size');
    }

    if (secretKey.byteLength != SecretKeyLength) {
      throw new Error('bad secretKey size');
    }

    if (data.byteLength < NonceLength) {
      throw new Error('bad data size');
    }

    const convertedPublicKey = convertPublicKey(publicKey);
    const convertedSecretKey = convertSecretKey(secretKey);
    const nonce = data.subarray(data.byteLength - NonceLength);
    const encrypted = data.subarray(0, data.byteLength - NonceLength);
    const decrypted = tweetnacl.box.open(encrypted, nonce, convertedPublicKey, convertedSecretKey);
    if (!decrypted) {
      throw new Error('decrypt failed');
    }
    return decrypted;
  }
}

export const crypto = new Crypto();