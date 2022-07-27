import sortedSet from 'redis-sorted-set';

export type Key = number | string;
export type Rank = number;
export type Score = number;
export interface ScoreValue {
  score: Score;
  // will auto inject valueOf() function with score value
  // valueOf(): Score;
}
export type Value = ScoreValue | number;

export interface Item<V extends Value> {
  key: Key;
  value: V;
}
export type OptionalValue<V extends Value> = V | null;

export const ItemSizeLimit = 100 * 10000; // 1 million

function addValueInfo<V extends Value>(value: V, revert: boolean): V {
  if (typeof value !== 'number') {
    if (!revert) {
      value.valueOf = () => value.score;
    } else {
      value.valueOf = () => -value.score;
    }
    return value;
  } else {
    if (!revert) {
      return value;
    } else {
      return -value as V;
    }
  }
}

function removeValueInfo<V extends Value>(value: V, revert: boolean): V {
  if (typeof value !== 'number') {
    delete (value as any).valueOf;
    return value;
  } else {
    if (!revert) {
      return value;
    } else {
      return -value as V;
    }
  }
}

export class SortedSet<K extends Key = string, V extends Value = number> implements SortedSet<K, V> {
  private items = new sortedSet();
  constructor(private readonly limit: number = ItemSizeLimit, private readonly reverse: boolean = false) {
    if (this.limit > ItemSizeLimit) {
      throw new Error(`SortedSet limit ${limit} exceeds limit ${ItemSizeLimit}`);
    }
  }

  checkLimit() {
    const overLimitCount = this.size() - this.limit;
    if (overLimitCount > 0) {
      this.items.remRangeByRank(this.limit, this.size());
    }
  }

  add(key: K, value: V): OptionalValue<V> {
    const old = this.items.add(key, addValueInfo<V>(value, this.reverse));
    this.checkLimit();
    return old;
  }

  set(key: K, value: V): OptionalValue<V> {
    return this.add(key, value);
  }

  remove(key: K): OptionalValue<V> {
    return this.items.rem(key);
  }

  delete(key: K): OptionalValue<V> {
    return this.remove(key);
  }

  size(): number {
    return this.items.card();
  }

  get(key: K): OptionalValue<V> {
    const value = this.items.get(key);
    if (value === null) {
      return null;
    }

    return removeValueInfo<V>(value, this.reverse);
  }

  has(key: K): boolean {
    return this.items.has(key);
  }

  rank(key: K): Rank {
    return this.items.rank(key);
  }

  range(startRank: Rank, endRank: Rank): K[] {
    // end is exclusive
    return this.items.slice(startRank, endRank);
  }

  rangeValue(startRank: Rank, endRank: Rank): V[] {
    const data = this.items.range(startRank, endRank, { withScores: true }) as [key: K, value: V][];
    return data.map(([_, value]) => {
      return removeValueInfo<V>(value, this.reverse);
    });
  }
  rangeWithValue(startRank: Rank, endRank: Rank): Item<V>[] {
    const data = this.items.range(startRank, endRank, { withScores: true }) as [key: K, value: V][];
    return data.map(([key, value]) => {
      return { key, value: removeValueInfo<V>(value, this.reverse) };
    });
  }

  keys(): K[] {
    return this.items.keys();
  }

  values(): V[] {
    return this.items.values().map((v: V) => {
      return removeValueInfo<V>(v, this.reverse);
    });
  }
}
