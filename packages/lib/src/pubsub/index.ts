class PromiseOut<T = void> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void = () => {};
  reject: (reason?: any) => void = () => {};
  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

export interface IPubSub {
  sub(key: string): AsyncGenerator<SubData, void, unknown>;
  pub(key: string, value: Uint8Array, receiver?: string): Promise<void>;
  onSub(key: string, listener: Sublistener, bindObj?: unknown): void;
  offSub(key: string, listener: Sublistener): void;
  login(publicKey: string): Promise<void>;
}

export type SubData = [string[], Uint8Array];
export type Sublistener = (subData: SubData) => void;

class PubSub implements IPubSub {
  constructor(
    private readonly keywordMap: {
      [key in string]: string;
    },
  ) {}
  login(publicKey: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  keyEventMap: Map<RegExp, PromiseOut<SubData>> = new Map();
  subEventMap: Map<string, Set<Sublistener>> = new Map();
  lisenterBindWeakMap: WeakMap<Sublistener, Sublistener> = new WeakMap();
  public async *sub(key: string) {
    for (const keyword in this.keywordMap) {
      key = key.replace(keyword, `(${this.keywordMap[keyword]})`);
    }
    const reg = new RegExp(`^${key}$`);
    this.keyEventMap.set(reg, new PromiseOut());
    do {
      const promiseOut = this.keyEventMap.get(reg);
      if (!promiseOut) {
        break;
      }
      yield await promiseOut.promise;
      this.keyEventMap.set(reg, new PromiseOut());
    } while (true);
    this.keyEventMap.delete(reg);
  }

  public async pub(key: string, value: Uint8Array) {
    for (const [reg, promiseOut] of this.keyEventMap) {
      const matchs = key.match(reg);
      if (matchs != null) {
        promiseOut.resolve([matchs, value]);
      }
    }
    for (let [subEventKey, listenerList] of this.subEventMap) {
      let regSubEventKey = subEventKey;
      for (const keyword in this.keywordMap) {
        regSubEventKey = regSubEventKey.replace(keyword, `(${this.keywordMap[keyword]})`);
      }
      const reg = new RegExp(`^${regSubEventKey}$`);
      const matchs = key.match(reg);
      if (matchs != null) {
        for (const listener of listenerList) {
          const handler = this.lisenterBindWeakMap.get(listener);
          handler?.([matchs, value]);
        }
      }
    }
  }
  onSub(key: string, listener: Sublistener, bindObj?: unknown) {
    const handler = listener.bind(bindObj);
    this.lisenterBindWeakMap.set(listener, handler);
    const listenerList = this.subEventMap.get(key);
    if (listenerList == undefined) {
      this.subEventMap.set(key, new Set([listener]));
      return;
    }
    listenerList.add(listener);
  }
  offSub(key: string, listener?: Sublistener) {
    if (listener == undefined) {
      const listenerList = this.subEventMap.get(key);
      if (listenerList == undefined) {
        return;
      }
      for (const listener of listenerList) {
        this.lisenterBindWeakMap.delete(listener);
      }
      this.subEventMap.delete(key);
      return;
    }
    const listenerList = this.subEventMap.get(key);
    this.lisenterBindWeakMap.delete(listener);
    if (listenerList == undefined) {
      this.subEventMap.delete(key);
      return;
    }
    listenerList.delete(listener);
  }
}

const keywordMap = {
  // $address: '\\w+',
  // $timeStamp: '\\d+',
  $publicKey: '[\\w=+_&]+',
  $signature: '[\\w=+_&]+',
  $className: '\\w+',
  $key: '\\w+',
  $endKey: '[\\w-]+',
  '$*': '.+',
};

export const pubsub = new PubSub(keywordMap);

// (async () => {
//   for await (const [key, value] of pubsub.sub("/sign/$address/$timeStamp")) {
//     console.log(key, value);
//     return;
//   }
// })();

// pubsub.pub("/sign/abcd/1231e321", new Uint8Array([1, 2, 3]));
// pubsub.pub("/sign/abcd/1231321", new Uint8Array([1, 2, 3]));
