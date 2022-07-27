import { base64ToUint8Array, LocalRole, RemoteRole, uint8ArrayToBase64 } from './role';
import {
  IKVStorage,
  IKSStorage,
  KSValue,
  KSRank,
  textEncoder,
  textDecoder,
  crypto,
  IPubSub,
  Sublistener,
  IStoragIteratorOption,
} from '@cccd/lib';
import { getMaxKey } from '@cccd/lib/src/storage/util';

type IPamras<P extends string> = { [key in P]: string };

type ParseTemplate<T> = T extends `:${infer Left}` ? Left : T extends `${infer Left}/:${infer Right}` ? Right : never;

type ParseKey<Template> = Template extends `/${infer Left}/${infer Right}`
  ? ParseTemplate<Left> | ParseTemplate<Right>
  : ParseTemplate<Template>;

type BuildKeyParams<Template> = IPamras<ParseKey<Template>>;

class Field<S extends string> {
  constructor(public key: S) { }
  getKey(params?: BuildKeyParams<S>) {
    let saveKey = this.key;
    if (params) {
      for (const key in params) {
        saveKey = saveKey.replace(`:${key}`, params[key]) as S;
      }
    }
    return saveKey;
  }
}

export class PrivateFiled<
  T extends any,
  K extends string = string,
  P extends BuildKeyParams<K> = BuildKeyParams<K>,
> extends Field<K> {
  constructor(public key: K, public applyRole: RemoteRole) {
    super(key);
  }
  public storage?: IKVStorage<string, T>;
  setStorage<V extends T>(storage: IKVStorage<string, V>): PrivateFiled<V, K, P> {
    this.storage = storage;
    return this as PrivateFiled<V, K, P>;
  }
  async get(params?: P) {
    if (this.storage == undefined) {
      throw new ReferenceError('field need storage');
    }
    return this.storage.get(this.getStorageKey(params));
  }
  async set(val: T, params?: P) {
    if (this.storage == undefined) {
      throw new ReferenceError('field need storage');
    }
    return this.storage.set(this.getStorageKey(params), val);
  }
  getStorageKey(params?: P) {
    return this.applyRole.publicKeyBase64 + ':' + this.getKey(params);
  }
  async *prefix(params?: P, options?: IStoragIteratorOption) {
    if (this.storage == undefined) {
      throw new ReferenceError('field need storage');
    }
    const storageKey = this.getStorageKey(params);
    for await (const [key, val] of this.storage.prefixIterator(storageKey, options)) {
      yield [key.replace(storageKey, ''), val] as [string, boolean];
    }
  }
}

export const encodeSignFiled = (val: unknown, privateKey: Uint8Array): [string, Uint8Array] => {
  const data = textEncoder.encode(JSON.stringify(val));
  return [uint8ArrayToBase64(crypto.sign(data, privateKey)), data];
};
export const decodeVerifyFiled = <T>(
  message: Uint8Array,
  sign: string,
  publicKey: Uint8Array,
): [false, undefined] | [true, T] => {
  const sigature = base64ToUint8Array(sign);
  const verify = crypto.verify(message, sigature, publicKey);
  if (!verify) {
    return [verify, undefined];
  }
  return [verify, JSON.parse(textDecoder.decode(message)) as T];
};

export class PublicFiled<
  T extends any,
  K extends string = string,
  P extends BuildKeyParams<K> = BuildKeyParams<K>,
> extends Field<K> {
  public storageKey: string;
  public storage?: IKVStorage<string, T>;
  constructor(public key: K, public localRole: LocalRole, public pubsub: IPubSub) {
    super(key);
    this.storageKey = localRole.publicKeyBase64 + key;
    this.pubsub.onSub(`${localRole.publicKeyBase64}/PUBLIC_KEY_REQUEST/$publicKey/$endKey`, async ([keys, _data]) => {
      const [_, applyUserPublicKey, getKey] = keys;
      const reg = new RegExp(`^${this.key.replace(/:\w+/g, '\\w+')}$`);
      if (!reg.test(getKey)) {
        return;
      }
      const data = await this.getPrefixKey(getKey);
      const [signature, result] = encodeSignFiled(data, this.localRole.privateKey);
      this.pubsub.pub(
        `${applyUserPublicKey}/PUBLIC_KEY_RESPONSE/${localRole.publicKeyBase64}/${this.key}/${signature}`,
        result,
        applyUserPublicKey
      );
    });
    this.pubsub.onSub(
      `${localRole.publicKeyBase64}/PUBLIC_KEY_RANGE_REQUEST/$publicKey/$key/$endKey`,
      async ([keys, pData]) => {
        let [_, applyUserPublicKey, minKey, maxKey] = keys;
        const reg = new RegExp(`^${this.key.replace(/:\w+/g, '(\\w?)+')}$`);
        console.log('PUBLIC_KEY_RANGE_REQUEST-----', keys, reg);
        if (!reg.test(minKey)) {
          return;
        }
        if (maxKey === '-') {
          maxKey = getMaxKey(this.key.replace(/:\w+/g, ''));
        }
        console.log('PUBLIC_KEY_RANGE_REQUEST--222---');
        const limit = pData[0] || 10;
        const storageMinKey = this.getPrefixKey(minKey);
        const storageMaxKey = this.getPrefixKey(maxKey);
        const data = [] as T[];
        for await (const [_, item] of this.storage!.rangeIterator(storageMinKey, storageMaxKey, { limit })) {
          data.push(item);
        }
        console.log('PUBLIC_KEY_RANGE_REQUEST--end---', data);
        const [signature, result] = encodeSignFiled(data, this.localRole.privateKey);
        this.pubsub.pub(
          `${applyUserPublicKey}/PUBLIC_KEY_RANGE_RESPONSE/${localRole.publicKeyBase64}/${this.key}/${signature}`,
          result,
          applyUserPublicKey
        );
      },
    );
  }
  async get(params?: P) {
    if (this.storage == undefined) {
      throw new ReferenceError('field need storage');
    }
    return this.storage.get(this.getStorageKey(params));
  }
  async set(val: T, params?: P) {
    if (this.storage == undefined) {
      throw new ReferenceError('field need storage');
    }
    const [signature, result] = encodeSignFiled(val, this.localRole.privateKey);
    this.pubsub.pub(`${this.localRole.publicKeyBase64}/FIELD_UPDATE/${signature}/${this.getKey(params)}`, result);
    return this.storage.set(this.getStorageKey(params), val);
  }
  getStorageKey(params?: P) {
    return this.localRole.publicKeyBase64 + ':' + this.getKey(params);
  }
  getPrefixKey(key: string) {
    return this.localRole.publicKeyBase64 + ':' + key;
  }
  setStorage<V extends T>(storage: IKVStorage<string, V>): PublicFiled<V, K, P> {
    this.storage = storage;
    return this as PublicFiled<V, K, P>;
  }
}

// enum PublicKSFiledAction {
//   SET = 1,
//   DEL = 2,
//   RANGE = 3,
// }
// interface PublicKSFiledData {
//   action: PublicKSFiledAction;
//   offset?: number;
//   limit?: number;
// }

export class PublicKSFiled<
  T extends string = string,
  K extends string = string,
  V extends KSValue = KSValue,
  P extends BuildKeyParams<T> = BuildKeyParams<T>,
> extends Field<T> {
  public storageKey: string;
  public storage?: IKSStorage<string, K, V>;
  constructor(public topic: T, public localRole: LocalRole, public pubsub: IPubSub) {
    super(topic);
    this.storageKey = localRole.publicKeyBase64 + topic;
    // this.pubsub.onSub(`${localRole.publicKeyBase64}/PUBLIC_KEY_REQUEST/$publicKey/$key`, async ([keys, _data]) => {
    //   const [_, applyUserPublicKey, getKey] = keys;
    //   if (getKey != this.key) {
    //     return;
    //   }
    //   const data = await this.get();
    //   const [signature, result] = encodeSignFiled(data, this.localRole.privateKey);
    //   this.pubsub.pub(
    //     `${applyUserPublicKey}/PUBLIC_KEY_RESPONSE/${localRole.publicKeyBase64}/${this.key}/${signature}`,
    //     result,
    //     applyUserPublicKey
    //   );
    // });
  }
  async remove(key: K, params?: P) {
    if (this.storage == undefined) {
      throw new ReferenceError('field need storage');
    }
    return this.storage.del(this.getStorageKey(params), key);
  }
  async set(key: K, val: V, params?: P) {
    if (this.storage == undefined) {
      throw new ReferenceError('field need storage');
    }
    // const [signature, result] = encodeSignFiled(val, this.localRole.privateKey);
    // this.pubsub.pub(`${this.localRole.publicKeyBase64}/FIELD_UPDATE/${signature}/${this.key}`, result);
    return this.storage.set(this.getStorageKey(params), key, val);
  }

  async range(start: KSRank, end: KSRank, params?: P) {
    if (this.storage == undefined) {
      throw new ReferenceError('field need storage');
    }
    return this.storage.range(this.getStorageKey(params), start, end);
  }

  getStorageKey(params?: P) {
    return this.localRole.publicKeyBase64 + ':' + this.getKey(params);
  }
  setStorage<N extends V>(storage: IKSStorage<string, K, N>): PublicKSFiled<T, K, N, P> {
    this.storage = storage;
    return this as PublicKSFiled<T, K, N, P>;
  }
}

export const getFiledPublicValue = <T>(
  key: string,
  pubsub: IPubSub,
  loginRole: LocalRole,
  remoteRole: RemoteRole,
  timeout: number = 30,
  callBack?: (key: string, val: Uint8Array) => void,
) => {
  return new Promise<T>((resolve, reject) => {
    pubsub.pub(
      `${remoteRole.publicKeyBase64}/PUBLIC_KEY_REQUEST/${loginRole.publicKeyBase64}/${key}`,
      new Uint8Array(),
      remoteRole.publicKeyBase64,
    );
    const subKey = `${loginRole.publicKeyBase64}/PUBLIC_KEY_RESPONSE/${remoteRole.publicKeyBase64}/${key}/$signature`;
    const timer = setTimeout(() => {
      reject(new Error('getPublicKey timeout'));
      pubsub.offSub(subKey, subHandler);
    }, timeout * 1000);
    const subHandler: Sublistener = ([keys, data]) => {
      const [originKey, signature] = keys;
      const [verify, val] = decodeVerifyFiled<T>(data, signature, remoteRole.publicKey);
      if (verify) {
        callBack?.(originKey, data);
        clearTimeout(timer);
        resolve(val);
        pubsub.offSub(subKey, subHandler);
      }
    };
    pubsub.onSub(subKey, subHandler);
  });
};

// p2p加速
export class RemotePublicField<K extends string, P extends BuildKeyParams<K> = BuildKeyParams<K>> extends Field<K> {
  public subKey: string;
  // private cacheMap: Map<string, Uint8Array> = new Map();
  constructor(key: K, public localRole: LocalRole, public remoteRole: RemoteRole, public pubsub: IPubSub) {
    super(key);
    this.subKey = `${remoteRole.publicKeyBase64}/PUBLIC_KEY_REQUEST/$publicKey/$key`;
    // this.pubsub.onSub(this.subKey, this.subHandler, this);
  }
  // subHandler: Sublistener = async ([keys, _data]) => {
  //   const [cacheKey] = keys;
  //   const cacheData = this.cacheMap.get(cacheKey);
  //   if (cacheData) {
  //     this.pubsub.pub(cacheKey, cacheData);
  //   }
  // };
  get<T>(params?: P) {
    return getFiledPublicValue<T>(
      this.getKey(params),
      this.pubsub,
      this.localRole,
      this.remoteRole,
      // 30,
      // (key, value) => {
      //   // this.cacheMap.set(key, value);
      // },
    );
  }
  range<T>(min: P, max?: P, limit: number = 10, timeout = 30) {
    return new Promise<T[]>((resolve, reject) => {
      const { pubsub, remoteRole, localRole } = this;
      const minKey = this.getKey(min);
      const maxKey = max ? this.getKey(max) : '-';
      pubsub.pub(
        `${remoteRole.publicKeyBase64}/PUBLIC_KEY_RANGE_REQUEST/${localRole.publicKeyBase64}/${minKey}/${maxKey}`,
        new Uint8Array([limit]),
        remoteRole.publicKeyBase64
      );
      const subKey = `${localRole.publicKeyBase64}/PUBLIC_KEY_RANGE_RESPONSE/${remoteRole.publicKeyBase64}/${this.key}/$signature`;
      const timer = setTimeout(() => {
        reject(new Error('getPublicKey timeout'));
        pubsub.offSub(subKey, subHandler);
      }, timeout * 1000);
      const subHandler: Sublistener = ([keys, data]) => {
        const [originKey, signature] = keys;
        const [verify, val] = decodeVerifyFiled<T[]>(data, signature, remoteRole.publicKey);
        if (verify) {
          clearTimeout(timer);
          resolve(val);
          pubsub.offSub(subKey, subHandler);
        }
      };
      pubsub.onSub(subKey, subHandler);
    });
  }
  // destroy() {
  //   this.pubsub.offSub(this.subKey, this.subHandler);
  // }
}
