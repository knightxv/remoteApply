import { Injectable } from '@bfchain/util';
import { crypto } from '@cccd/lib';
import 'reflect-metadata';

// uint8array to base64
export function uint8ArrayToBase64(u8a: Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(u8a)))
    .replace(/\//g, '_')
    .replace(/\+/g, '&');
}
// base64 to uint8array
export function base64ToUint8Array(b64: string): Uint8Array {
  const u8a = new Uint8Array(
    atob(b64.replace(/_/g, '/').replace(/&/g, '+'))
      .split('')
      .map((c) => c.charCodeAt(0)),
  );
  return u8a;
}

export function keyPair(seed: Uint8Array) {
  return crypto.keyPair(seed);
}

export const roleDefinitions = new Map<string /* role name */, Role>(); // 保存用户定义的角色，给装饰器用

export class Role {
  public readonly publicKey: Uint8Array;
  constructor(publicKey: Uint8Array | string) {
    if (typeof publicKey === 'string') {
      this.publicKey = base64ToUint8Array(publicKey);
    } else {
      this.publicKey = publicKey;
    }
  }
  get publicKeyBase64(): string {
    return uint8ArrayToBase64(this.publicKey);
  }
}

export class RemoteRole extends Role {}
export class LocalRole extends Role {
  constructor(public readonly privateKey: Uint8Array) {
    super(crypto.fromSecretKey(privateKey).publicKey);
  }
}

export const INJECT_TOKEN_ROLE_MANAGER = 'inject-token-roleManager';

@Injectable(INJECT_TOKEN_ROLE_MANAGER)
export class RoleManager {
  public _loginRole?: LocalRole;
  get loginRole() {
    const loginRole = this._loginRole;
    if (loginRole == undefined) {
      throw new ReferenceError('need login');
    }
    return loginRole;
  }
  login(privateKey: Uint8Array) {
    this._loginRole = new LocalRole(privateKey);
    return this._loginRole;
  }
}
