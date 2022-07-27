import { ModuleStroge, Resolve, InjectProp, MODULE_MAP } from '@bfchain/util';
import { ApplyClientEndpoint, APPLY_CLIENT_ENDPOINT_ARGS } from '../comlink/applyClientEndpoint';
import { wrap } from '../comlink/comlink';
import { INJECT_PROP_MODULE_MAP } from '../const';
import { ExposeServerConstructor } from '../exposeServer';
import { RemoteRole } from '../role';
import { AnyConstructor } from '../type';
import { getInstanceModuleMap } from '../util';

export const remoteProxy = (servicePublicKey: string) => {
  const remoteRole = new RemoteRole(servicePublicKey);
  return (_tar: ExposeServerConstructor) => {
    Reflect.defineMetadata('service-publickey', servicePublicKey, _tar);
    return new Proxy(class extends _tar {}, {
      construct(_: ExposeServerConstructor) {
        const moduleMap = getInstanceModuleMap(this);
        Reflect.defineMetadata(INJECT_PROP_MODULE_MAP, moduleMap, _tar);
        const className = _tar.name;
        const applyClient = Resolve(
          ApplyClientEndpoint,
          moduleMap.installMask(
            new ModuleStroge([
              [APPLY_CLIENT_ENDPOINT_ARGS.REMOTE_ROLE, remoteRole],
              [APPLY_CLIENT_ENDPOINT_ARGS.CLASS_NAME, className],
            ]),
          ),
        );
        return wrap(applyClient, new _tar());
      },
    });
  };
};

export const RemoteField = () => {
  return (tar: Object, prop: string) => {
    let instance: any;
    Object.defineProperty(tar, prop, {
      get() {
        if (!instance) {
          const moduleMap = Reflect.getMetadata(INJECT_PROP_MODULE_MAP, tar.constructor);
          const serverPublicKey = Reflect.getMetadata('service-publickey', tar.constructor);
          if (serverPublicKey == undefined || moduleMap == undefined) {
            throw new ReferenceError('can not get service publickey, use "remoteProxy" Decorator before');
          }
          const FieldClass = Reflect.getMetadata('design:type', tar, prop) as AnyConstructor;
          const className = FieldClass.name;
          const remoteRole = new RemoteRole(serverPublicKey);
          const applyClientEndpoint = Resolve(
            ApplyClientEndpoint,
            moduleMap.installMask(
              new ModuleStroge([
                [APPLY_CLIENT_ENDPOINT_ARGS.REMOTE_ROLE, remoteRole],
                [APPLY_CLIENT_ENDPOINT_ARGS.CLASS_NAME, className],
              ]),
            ),
          );
          instance = wrap(applyClientEndpoint, tar);
        }
        return instance;
      },
    });
  };
};
