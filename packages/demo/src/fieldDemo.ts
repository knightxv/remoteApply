import { Resolve, Injectable, ModuleStroge, Inject, InjectProp, MODULE_MAP } from '@bfchain/util';
import { keyPair, remoteProxy, RoleManager } from '@cccd/core';
import { Field, FieldArray, FieldMap, FIELD_ARGS } from '@cccd/corev2';
import { IStorageOption, KVSTORAGE_ARGS } from '@cccd/lib';

interface TN {
  v: number;
  next?: TN;
  parent?: TN;
}
@Injectable()
class BaseA {
  @Field() arr!: FieldArray<number>;
  @Field() map!: FieldMap<number>;
  @Field() map2!: FieldMap<TN>;
}
@Injectable()
class A extends BaseA {
  async print() {
    await this.arr.push(1);
    console.log(await this.arr.get(0));
    console.log(`arr len=${await this.arr.len()}`);
    await this.map.set('a', 1);
    await this.map.set('b', 2);
    console.log(await this.map.get('a'));
    console.log(`map len=${await this.map.len()}`);
    console.log('iterating map');
    for await (const [k, v] of this.map) {
      console.log(`k=${k},v=${v}`);
    }
    await this.map.set('a', 2);
    console.log(`map len=${await this.map.len()}`);
    console.log(await this.map.get('a'));
    const tn1: TN = {
      v: 1,
    };
    const tn2: TN = {
      v: 2,
      parent: tn1,
    };
    tn1.next = tn2;
    await this.map2.set('1', tn1);
    console.log(await this.map2.get('1'));
    console.log(`map2 len=${await this.map2.len()}`);
  }
}

const option: IStorageOption = {
  location: 'data/bfchain',
};
const moduleMap = new ModuleStroge();
moduleMap.set(KVSTORAGE_ARGS, option);
const roleManager = Resolve(RoleManager, moduleMap);
(async () => {
  const userSeed = new Uint8Array(32).fill(2);
  const userKeypair = keyPair(userSeed);
  roleManager.login(userKeypair.secretKey);
  // Resolve(A, moduleMap).print();
  Resolve(
    FieldMap,
    moduleMap.installMask(
      new ModuleStroge([
        [FIELD_ARGS.PREFIX_KEY, 'prifixKey'],
        [FIELD_ARGS.FIELD_KEY, 'prop'],
      ]),
    ),
  );
  Resolve(
    FieldMap,
    moduleMap.installMask(
      new ModuleStroge([
        [FIELD_ARGS.PREFIX_KEY, 'prifixKey'],
        [FIELD_ARGS.FIELD_KEY, 'prop'],
      ]),
    ),
  );
  Resolve(
    FieldMap,
    moduleMap.installMask(
      new ModuleStroge([
        [FIELD_ARGS.PREFIX_KEY, 'prifixKey'],
        [FIELD_ARGS.FIELD_KEY, 'prop'],
      ]),
    ),
  );
})();
