import { IKVStorage, IStoragIteratorOption } from './types';

export const KVSTORAGE_ARGS = Symbol('KVSTORAGE_ARGS');

export class KVStorage<K extends string = string, V extends any = any> implements IKVStorage<K, V> {
  prefixDel(preKey: K): Promise<void> {
    throw new Error('Method not implemented.');
  }
  get(key: K): Promise<V | undefined> {
    throw new Error('Method not implemented.');
  }
  set(key: K, value: V): Promise<void> {
    throw new Error('Method not implemented.');
  }
  del(key: K): Promise<void> {
    throw new Error('Method not implemented.');
  }
  rangeIterator(min: K, max: K, options?: IStoragIteratorOption | undefined): AsyncGenerator<[K, V], void, unknown> {
    throw new Error('Method not implemented.');
  }
  prefixIterator(
    preKey: K,
    options?: { keys?: boolean | undefined; limit?: number | undefined; reverse?: boolean } | undefined,
  ): AsyncGenerator<[K, V], void, unknown> {
    throw new Error('Method not implemented.');
  }
}
