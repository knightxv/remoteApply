abstract class FixSizedArray {
  protected _inner!: Array<number>;
  constructor(size: number) {
    this._inner = new Array<number>(size);
  }
  protected setBytes(bytes: ArrayLike<number>) {
    if (bytes.length < this._inner.length) {
      throw new Error('invalid size');
    }
    const inner = this._inner;
    this._inner.forEach((_, i) => {
      inner[i] = bytes[i];
    });
  }
}
export class Key extends FixSizedArray {
  static fromJSON(): Key {
    throw new Error('unimplemented');
  }
  toJSON() {
    throw new Error('unimplemented');
  }
  constructor(bytes: ArrayLike<number>) {
    super(16);
    this.setBytes(bytes);
  }
}

export class Address extends FixSizedArray {
  static fromJSON(): Address {
    throw new Error('unimplemented');
  }
  toJSON() {
    throw new Error('unimplemented');
  }
  override toString() {
    return '';
  }
  constructor(bytes: ArrayLike<number>) {
    super(16);
    this.setBytes(bytes);
  }
}

export type DbGet = {
  key: ArrayLike<number>;
  auth: {
    address: ArrayLike<number>;
    pubKey: ArrayLike<number>;
    sign?: ArrayLike<number>; // 用于签名
  };
};
export type DbSet<T> = DbGet & {
  value: T;
  auth: {
    cipher?: ArrayLike<number>; // 用于加解密
  };
};
