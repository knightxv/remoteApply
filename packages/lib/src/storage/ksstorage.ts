import { Inject, Injectable } from '@bfchain/util';
import { SortedSet } from '../containers';
import type { Key, Value, Rank } from '../containers';

import { IKSStorage, IStorageOption } from './types';

export type KSValue = Value;
export type KSRank = Rank;

export const KSSTORAGE_ARGS = Symbol('KSSTORAGE_ARGS');
@Injectable()
export class KSStorage<T extends Key = string, K extends Key = any, V extends Value = any>
  implements IKSStorage<T, K, V>
{
  private db: Map<T, SortedSet<K, V>> = new Map();
  private limit: number = 100000;
  private reverse: boolean = false;
  constructor(
    @Inject(KSSTORAGE_ARGS)
    storageOption: IStorageOption,
  ) {
    if (storageOption.limit != undefined) {
      this.limit = storageOption.limit;
    }

    if (storageOption.reverse != undefined) {
      this.reverse = storageOption.reverse;
    }
  }

  create(topic: T, reverse: boolean = false): void {
    const set = new SortedSet<K, V>(this.limit, reverse);
    this.db.set(topic, set);
  }

  set(topic: T, key: K, value: V) {
    let set = this.db.get(topic);
    if (set == undefined) {
      set = new SortedSet<K, V>(this.limit, this.reverse);
      this.db.set(topic, set);
    }

    set.set(key, value);
  }
  del(topic: T, key: K) {
    const set = this.db.get(topic);
    if (set == undefined) {
      return;
    }

    set.delete(key);
  }
  drop(topic: T) {
    this.db.delete(topic);
  }
  rank(topic: T, key: K) {
    const set = this.db.get(topic);
    if (set == undefined) {
      return -1;
    }

    return set.rank(key);
  }
  range(topcic: T, offset: number, limit: number) {
    const set = this.db.get(topcic);
    if (set == undefined) {
      return [];
    }

    return set.range(offset, limit);
  }
}
