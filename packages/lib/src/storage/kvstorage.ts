import { Inject, Injectable } from '@bfchain/util';
import leveldown, { LevelDown } from 'leveldown';
import levelup, { LevelUp } from 'levelup';
import type { AbstractLevelDOWN, AbstractIterator } from 'abstract-leveldown';
import * as v8 from 'v8';
import { IKVStorage, IStorageOption } from './types';
import { getMaxKey } from './util';

export const KVSTORAGE_ARGS = Symbol('KVSTORAGE_ARGS');
@Injectable()
export class KVStorage<K extends string = string, V extends any = any> implements IKVStorage<K, V> {
  public db: LevelUp<LevelUp<AbstractLevelDOWN<K, Uint8Array>>>;
  private _cbMap = new Map<K, (k: K, v: V) => Promise<void>>();
  constructor(
    @Inject(KVSTORAGE_ARGS)
    storageOption: IStorageOption,
  ) {
    this.db = this.createValueTable(storageOption.location);
  }
  createValueTable(dbPath: string) {
    const down = leveldown(dbPath) as unknown as AbstractLevelDOWN<K, Uint8Array>;
    return levelup(down);
  }
  sub(key: K, cb: (k: K, v: V) => Promise<void>) {
    this._cbMap.set(key, cb);
  }
  get(key: K) {
    return new Promise<V | undefined>((resolve, reject) => {
      this.db.get(key, (err: Error | undefined, value: Buffer) => {
        if (err) {
          resolve(undefined);
          return;
        }
        resolve(v8.deserialize(value));
      });
    });
  }
  set(key: K, value: V) {
    return new Promise<void>((resolve, reject) => {
      this.db.put(key, v8.serialize(value), async (err) => {
        if (err) {
          reject(err);
          return;
        }
        // @fixme 导致resolve变慢
        const cb = this._cbMap.get(key);
        cb && (await cb(key, value));
        resolve();
      });
    });
  }
  del(key: K) {
    return new Promise<void>((resolve, reject) => {
      this.db.del(key, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async *rangeIterator(
    min: K,
    max: K,
    options: {
      keys?: boolean;
      reverse?: boolean;
      limit?: number;
    } = {},
  ): AsyncGenerator<[K, V], void, unknown> {
    const iterator = this.db.iterator({
      gte: min,
      lte: max,
      ...options,
    }) as unknown as AsyncGenerator<[Buffer, Buffer]>;
    for await (const [key, val] of iterator) {
      yield [key.toString() as K, v8.deserialize(val) as V];
    }
  }
  async *prefixIterator(
    preKey: K,
    options: { keys?: boolean; limit?: number; reverse?: boolean } = {},
  ): AsyncGenerator<[K, V], void, unknown> {
    const max = getMaxKey(preKey);
    const iterator = this.db.iterator({
      gte: preKey,
      lt: max,
      ...options,
    }) as unknown as AsyncGenerator<[Buffer, Buffer]>;
    for await (const [key, value] of iterator) {
      const keyStr = key.toString();
      if (!keyStr.startsWith(preKey)) {
        break;
      }
      yield [keyStr as K, v8.deserialize(value) as V];
    }
  }
  async prefixDel(preKey: K) {
    const chain = this.db.batch();
    for await (const [k, _] of this.prefixIterator(preKey, { keys: true })) {
      chain.del(k);
    }
    await chain.write();
  }
}
