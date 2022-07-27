import { Key, Value, Rank } from '../containers';

export interface IStorageOption {
  location: string;
  reverse?: boolean;
  limit?: number;
}

export interface IStoragIteratorOption {
  keys?: boolean;
  reverse?: boolean;
  limit?: number;
}

export interface IKVStorage<K extends string = string, V extends any = any> {
  get(key: K): Promise<V | undefined>;
  set(key: K, value: V): Promise<void>;
  del(key: K): Promise<void>;
  rangeIterator(min: K, max: K, options?: IStoragIteratorOption): AsyncGenerator<[K, V], void, unknown>;
  prefixIterator(
    preKey: K,
    options?: { keys?: boolean; limit?: number; reverse?: boolean },
  ): AsyncGenerator<[K, V], void, unknown>;
  prefixDel(preKey: K): Promise<void>;
}

export interface IKSStorage<T extends Key = string, K extends Key = any, V extends Value = any> {
  create(topic: T, reverse?: boolean): void;
  set(topic: T, key: K, value: V): void;
  del(topic: T, key: K): void;
  drop(topic: T): void;
  rank(topic: T, key: K): Rank;
  range(topic: T, offset: number, limit: number): K[];
}
