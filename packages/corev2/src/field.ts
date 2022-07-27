import { KVStorage } from '@cccd/lib';
import {
  RemoteRole,
  RoleManager,
  EXPONSE_SERVER_ARGS,
  INJECT_TOKEN_ROLE_MANAGER,
  getInstanceModuleMap,
} from '@cccd/core';
import { Resolve, Injectable, ModuleStroge, Inject, InjectProp, Resolvable } from '@bfchain/util';

type ConstructorType = new (...args: any[]) => any;
type FiledContructor = {
  new (fieldName: string): any;
};

type FieldOption = {
  private?: boolean;
};

export function Field(options: FieldOption = {}) {
  return (tar: Object, prop: string) => {
    let instance: FiledContructor;
    Object.defineProperty(tar, prop, {
      get() {
        if (!instance) {
          const moduleMap = getInstanceModuleMap(this);
          const FieldClass = Reflect.getMetadata('design:type', tar, prop) as FiledContructor;
          const roleManager = moduleMap.get(INJECT_TOKEN_ROLE_MANAGER) as RoleManager;
          let prifixKey = roleManager.loginRole.publicKeyBase64;
          if (options.private) {
            const applyRole = moduleMap.get(EXPONSE_SERVER_ARGS.APPLY_ROLE) as RemoteRole;
            prifixKey += `:${applyRole.publicKeyBase64}`;
          }
          instance = Resolve(
            FieldClass,
            moduleMap.installMask(
              new ModuleStroge([
                [FIELD_ARGS.PREFIX_KEY, prifixKey],
                [FIELD_ARGS.FIELD_KEY, prop],
              ]),
            ),
          );
        }
        return Object.seal(instance);
      },
      set(value: any) {
        throw new Error('cannot set field');
      },
    });
  };
}

export function PrivateField() {
  return (tar: Object, prop: string) => {
    let instance: FiledContructor;
    Object.defineProperty(tar, prop, {
      get() {
        if (!instance) {
          const moduleMap = getInstanceModuleMap(this);
          const FieldClass = Reflect.getMetadata('design:type', tar, prop) as FiledContructor;
          const roleManager = moduleMap.get(INJECT_TOKEN_ROLE_MANAGER) as RoleManager;
          const applyRole = moduleMap.get(EXPONSE_SERVER_ARGS.APPLY_ROLE) as RemoteRole;
          const prefixKey = `${roleManager.loginRole.publicKeyBase64}:${applyRole.publicKeyBase64}`;
          instance = Resolve(
            FieldClass,
            moduleMap.installMask(
              new ModuleStroge([
                [FIELD_ARGS.PREFIX_KEY, prefixKey],
                [FIELD_ARGS.FIELD_KEY, prop],
              ]),
            ),
          );
        }
        return instance;
      },
    });
  };
}
export function PublicField() {
  return (tar: Object, prop: string) => {
    let instance: FiledContructor;
    Object.defineProperty(tar, prop, {
      get() {
        if (!instance) {
          const moduleMap = getInstanceModuleMap(this);
          const FieldClass = Reflect.getMetadata('design:type', tar, prop) as FiledContructor;
          const roleManager = moduleMap.get(INJECT_TOKEN_ROLE_MANAGER) as RoleManager;
          const prifixKey = `${roleManager.loginRole.publicKeyBase64}`;
          instance = Resolve(
            FieldClass,
            moduleMap.installMask(
              new ModuleStroge([
                [FIELD_ARGS.PREFIX_KEY, prifixKey],
                [FIELD_ARGS.FIELD_KEY, prop],
              ]),
            ),
          );
        }
        return instance;
      },
    });
  };
}

export const FIELD_ARGS = {
  PREFIX_KEY: Symbol('field-args-private-key'),
  FIELD_KEY: Symbol('field-args-field-key'),
};

class BaseField {
  constructor(
    protected roleManager: RoleManager,
    protected kvStorage: KVStorage,
    @Inject(FIELD_ARGS.PREFIX_KEY) protected prefixKey: string,
    @Inject(FIELD_ARGS.FIELD_KEY) protected fieldKey: string,
  ) {
    console.log(`ctor injecting ${fieldKey}`);
  }
}

@Resolvable()
export class FieldArray<T> extends BaseField {
  private _countKey = () => `${this.prefixKey}/${this.fieldKey}/count`;
  async len() {
    const len = await this.kvStorage.get(this._countKey());
    console.log(`fieldKey = ${this.fieldKey}, len=${len}`);
    return (len || 0) as number;
  }
  private _contentKey = (idx: number) => `${this.prefixKey}/${this.fieldKey}/content/${idx}`;
  private async _nextIdx() {
    const c = (await this.kvStorage.get(this._countKey())) as number;
    return c !== undefined ? c : 0;
  }
  async push(v: T) {
    const idx = await this._nextIdx();
    const k = this._contentKey(idx);
    await this.kvStorage.set(k, v);
    await this.kvStorage.set(this._countKey(), idx + 1);
  }
  async get(idx: number) {
    return (await this.kvStorage.get(this._contentKey(idx))) as T;
  }
  async splice(start: number, deleteCount?: number, ...items: T[]) {
    const len = await this.len();
    if (start >= len - 1) {
      start = len - 1;
    }
    if (start < 0) {
      start = len - start;
      start = start < 0 ? 0 : start;
    }

    if (!deleteCount) {
      deleteCount = len - start;
    }
    if (deleteCount <= 0) {
      deleteCount = 0;
    }
    const deletedItems = [] as T[];
    for (let i = 0; i < deleteCount; i++) {
      const idx = start + i;
      const item = await this.get(idx);
      deletedItems.push(item);
    }
    // @todo, 等一个成熟的删除方案，不然只能挨个删除，根据索引重排内容，代价太大

    if (items.length > 0) {
      const idxStart = await this._nextIdx();
      for (let i = 0; i < items.length; i++) {
        const idx = idxStart + i;
        const k = this._contentKey(idx);
        await this.kvStorage.set(k, items[i]);
        await this.kvStorage.set(this._countKey(), idx + 1);
      }
    }
    return deletedItems;
  }
}

@Resolvable()
export class FieldMap<T> extends BaseField {
  private _countKey = () => `${this.prefixKey}/${this.fieldKey}/count`;
  async len() {
    const len = await this.kvStorage.get(this._countKey());
    console.log(`fieldKey = ${this.fieldKey}, len=${len}`);
    return (len || 0) as number;
  }
  private _contentPrefixKey = () => `${this.prefixKey}/${this.fieldKey}/content/`;
  private _contentKey = (k: string) => `${this._contentPrefixKey()}/${k}`;
  async set(key: string, value: T) {
    const exists = await this.has(key);
    await this.kvStorage.set(this._contentKey(key), value);
    if (!exists) {
      const len = await this.len();
      await this.kvStorage.set(this._countKey(), len + 1);
    }
  }
  async get(key: string) {
    return (await this.kvStorage.get(this._contentKey(key))) as T;
  }
  async has(key: string) {
    return (await this.kvStorage.get(this._contentKey(key))) !== undefined;
  }
  async del(key: string) {
    const len = await this.len();
    await this.kvStorage.del(this._contentKey(key));
    await this.kvStorage.set(this._countKey(), len - 1);
  }
  async clear() {
    try {
      await this.kvStorage.prefixDel(this._contentPrefixKey());
      await this.kvStorage.set(this._countKey(), 0);
    } catch (e) {
      throw e;
    }
  }
  [Symbol.asyncIterator]() {
    return this.entries();
  }
  async *entries() {
    const prefixKeyLen = this._contentPrefixKey().length;
    for await (const [k, v] of this.kvStorage.prefixIterator(this._contentPrefixKey())) {
      yield [k.substring(prefixKeyLen + 1), v] as [string, T];
    }
  }
  async *values() {
    for await (const [_, v] of this.kvStorage.prefixIterator(this._contentPrefixKey())) {
      yield v as T;
    }
  }
  async *keys() {
    const prefixKeyLen = this._contentPrefixKey().length;
    for await (const [k, _] of this.kvStorage.prefixIterator(this._contentPrefixKey(), {
      keys: true,
    })) {
      yield k.substring(prefixKeyLen + 1);
    }
  }
}
@Resolvable()
export class FieldSet<T> extends BaseField {
  private _countKey = () => `${this.prefixKey}/${this.fieldKey}/count`;
  async len() {
    const len = await this.kvStorage.get(this._countKey());
    return (len || 0) as number;
  }
  private _contentPrefixKey = () => `${this.prefixKey}/${this.fieldKey}/content/`;
  private _contentKey = (k: string) => `${this._contentPrefixKey()}/${k}`;
}
class FieldPrimtive<T> extends BaseField {
  private _contentKey = `${this.prefixKey}/${this.fieldKey}`;
  private _cache: T | null = null;

  async set(v: T) {
    this._cache = v;
    await this.kvStorage.set(this._contentKey, v);
  }

  async get() {
    // return this._cache;
    return (await this.kvStorage.get(this._contentKey)) as T;
  }

  // @note: print info by console.log, for node only
  [require('util').inspect.custom]() {
    return `${this.constructor.name}{data: ${this._cache}}`;
  }
}

@Resolvable()
export class FieldNumber extends FieldPrimtive<number> {}
@Resolvable()
export class FieldBoolean extends FieldPrimtive<boolean> {}
@Resolvable()
export class FieldString extends FieldPrimtive<string> {}
@Resolvable()
export class FieldUint8Array extends FieldPrimtive<Uint8Array> {}
