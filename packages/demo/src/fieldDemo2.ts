import { Resolve, Injectable, ModuleStroge, Inject, InjectProp, MODULE_MAP } from '@bfchain/util';
import { remoteProxy, RemoteRole, SERVICES_PUBSUB, RemoteField, grant, getInstanceModuleMap } from '@cccd/core';
import { pubsub } from '@cccd/lib';
const moduleMap = new ModuleStroge([[SERVICES_PUBSUB, pubsub]]);
type FiledContructor = {
  new (filedName: string): any;
};

// fieldDefineRole('admin', 'signRecord', 'get', 'write', "xxx");

// @Injectable()
// class FieldArray {
//   @xxx
//   async push() {}
//   @get
//   async get() {}
// }

@Injectable()
class FieldArray {
  async push() {}
  async get() {}
}

@Injectable()
@grant('admin')
class Server {
  constructor() {}
  @Field()
  public aaa!: FieldArray;
  steup() {
    console.log(this.aaa);
  }
}

@remoteProxy('adminPublicKey')
export class SignAdmin implements Server {
  @RemoteField()
  public aaa!: FieldArray;
  steup(): void {
    throw new Error('Method not implemented.');
  }
}

function Field() {
  return (tar: Object, prop: string) => {
    let instance: FiledContructor;
    Object.defineProperty(tar, prop, {
      get() {
        if (!instance) {
          const moduleMap = getInstanceModuleMap(this);
          const FieldClass = Reflect.getMetadata('design:type', tar, prop) as FiledContructor;
          instance = Resolve(FieldClass, moduleMap);
        }
        return instance;
      },
    });
  };
}

Resolve(Server, moduleMap).steup();

const signAdmin = Resolve(SignAdmin, moduleMap);
console.log(signAdmin.aaa.push);
