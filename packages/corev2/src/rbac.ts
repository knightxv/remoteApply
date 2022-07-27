import { userManager } from './user';
import { Permission } from './permission';

const injectedSymbols = new Set<Symbol>();
const defineSymbol = (name: string) => {
  const sym = Symbol(name);
  injectedSymbols.add(sym);
  return sym;
};
const isInjectedSymbol = (sym: Symbol): boolean => {
  return injectedSymbols.has(sym);
};
const fields_symbol = defineSymbol('__rbac_fields__');
const methods_symbol = defineSymbol('__rbac_methods__');
const users_symbol = defineSymbol('__rbac_users__');
const caller_symbol = defineSymbol('__rbac_caller__');

function isField(target: any, propKey: string | Symbol): boolean {
  return target[fields_symbol] !== undefined && target[fields_symbol].has(propKey);
}

function isMethod(target: any, propKey: string | Symbol): boolean {
  return target[methods_symbol] !== undefined && target[methods_symbol].has(propKey);
}

function proxyIt(_target: any, name: string) {
  return new Proxy(_target, {
    get: (target, propKey, receiver) => {
      if (typeof propKey === 'symbol' && isInjectedSymbol(propKey)) {
        if (propKey === users_symbol || propKey === caller_symbol) {
          return Reflect.get(target, propKey, receiver);
        }
        throw new Error(`Cannot access ${String(propKey)}`);
      }

      // not hooked, get original
      if (!isField(target, propKey) && !isMethod(target, propKey)) {
        return Reflect.get(target, propKey, receiver);
      }

      // have local read permission, get original
      if (userManager.hasPermission(name, Permission.GET)) {
        // @todo read it from storage(cache)
        return Reflect.get(target, propKey, receiver);
      }

      // not have remote read permission, throw error
      if (!userManager.hasPermission(name, Permission.GET_REMOTE)) {
        throw new Error(`User "${name}" does not have permission to get property "${String(propKey)}"`);
      }

      // have remote read permission
      // it is a method, proxy it with remote call
      if (target[methods_symbol].has(propKey)) {
        return new Proxy(target[propKey], {
          apply(_applyTarget, thisArg, _argArray) {
            if (userManager.hasPermission(name, Permission.APPLY)) {
              //@todo apply locally
              return;
            }

            if (!userManager.hasPermission(name, Permission.APPLY_REMOTE)) {
              throw new Error(`User "${name}" does not have permission to apply method "${String(thisArg)}"`);
            }
            // apply remote
            // @todo fix me, now just do nothing

            if (_argArray.length > 0 && typeof _argArray[0] === 'string') {
              let value = String(_argArray[0]);
              const caller = userManager.getUser(target[caller_symbol]);
              if (caller !== undefined) {
                value += '_' + caller.privateKey();
              }
              const user = userManager.getUser(name);
              if (user !== undefined) {
                value += '_' + user.publicKey();
              }
              value += '_remote_APPLY_';
              _argArray[0] = value;
            }
            Reflect.apply(_applyTarget, thisArg, _argArray);
          },
        });
      } else {
        // get remote
        // @todo fix me, now just a mock for string
        let value = Reflect.get(target, propKey, receiver);
        if (typeof value === 'string') {
          const caller = userManager.getUser(target[caller_symbol]);
          if (caller !== undefined) {
            value += '_' + caller.privateKey();
          }
          const user = userManager.getUser(name);
          if (user !== undefined) {
            value += '_' + user.publicKey();
          }
          value += '_remote_GET_';
        } else if (value instanceof DataBase) {
          if (value['string'] !== undefined && !String(value['string']).endsWith('_remote_GET_')) {
            value['string'] += '_remote_GET_';
          }
        }
        return value;
      }
    },
    set: (target, propKey, value, receiver) => {
      if (typeof propKey === 'symbol' && isInjectedSymbol(propKey)) {
        if (propKey === caller_symbol) {
          return Reflect.set(target, propKey, value, receiver);
        }
        throw new Error(`Cannot access ${String(propKey)}`);
      }

      // not hooked, set original
      if (!isField(target, propKey) && !isMethod(target, propKey)) {
        return Reflect.set(target, propKey, value, receiver);
      }

      // have local write permission, set original
      if (userManager.hasPermission(name, Permission.SET)) {
        // @tod write it to storage(cache)
        return Reflect.set(target, propKey, value, receiver);
      }

      // not have remote write permission, throw error
      if (!userManager.hasPermission(name, Permission.SET_REMOTE)) {
        throw new Error(`User "${name}" does not have permission to set property "${String(propKey)}"`);
      }

      // have remote write permission, set remote
      // @todo fix me, now just a mock
      if (typeof value === 'string') {
        const caller = userManager.getUser(target[caller_symbol]);
        if (caller !== undefined) {
          value += '_' + caller.privateKey();
        }
        const user = userManager.getUser(name);
        if (user !== undefined) {
          value += '_' + user.publicKey();
        }
        value += '_remote_SET_';
      }
      return Reflect.set(target, propKey, value, receiver);
    },
    has(target, propKey) {
      if (typeof propKey === 'symbol' && isInjectedSymbol(propKey)) {
        return false;
      }
      return Reflect.has(target, propKey);
    },
  });
}

export interface Option {
  name?: string;
  timeout?: number;
  shared?: boolean;
}

type Consturctor = { new (...args: any[]): any };
export function grant<T extends Consturctor>(name: string) {
  return (target: T) => {
    return new Proxy(target, {
      construct(target, args, _newTarget) {
        const instance = new target(...args);
        instance[users_symbol] = name;
        for (const arg of args) {
          // inject caller info to proxy instance
          if (arg instanceof Object && arg[users_symbol] !== undefined) {
            arg[caller_symbol] = name;
          }
        }
        const proxy = proxyIt(instance, name);
        return proxy;
      },
    });
  };
}

function proxyIt2(_target: any, name: string) {
  return new Proxy(_target, {
    get: (target, propKey, receiver) => {
      if (typeof propKey === 'symbol' && isInjectedSymbol(propKey)) {
        if (propKey === users_symbol || propKey === caller_symbol) {
          return Reflect.get(target, propKey, receiver);
        }
        throw new Error(`Cannot access ${String(propKey)}`);
      }

      // have local read permission, get original
      if (userManager.hasPermission(name, Permission.GET)) {
        // @todo read it from storage(cache)
        return Reflect.get(target, propKey, receiver);
      }

      // not have remote read permission, throw error
      if (!userManager.hasPermission(name, Permission.GET_REMOTE)) {
        throw new Error(`User "${name}" does not have permission to get property "${String(propKey)}"`);
      }

      const propValue = Reflect.get(target, propKey, receiver);
      // have remote read permission
      // it is a method, proxy it with remote call
      if (typeof propValue === 'function') {
        return new Proxy(target[propKey], {
          apply(_applyTarget, thisArg, _argArray) {
            if (userManager.hasPermission(name, Permission.APPLY)) {
              //@todo apply locally
              return;
            }

            if (!userManager.hasPermission(name, Permission.APPLY_REMOTE)) {
              throw new Error(`User "${name}" does not have permission to apply method "${String(thisArg)}"`);
            }
            // apply remote
            // @todo fix me, now just do nothing

            if (_argArray.length > 0 && typeof _argArray[0] === 'string') {
              let value = String(_argArray[0]);
              const caller = userManager.getUser(target[caller_symbol]);
              if (caller !== undefined) {
                value += '_' + caller.privateKey();
              }
              const user = userManager.getUser(name);
              if (user !== undefined) {
                value += '_' + user.publicKey();
              }
              value += '_remote_APPLY_';
              _argArray[0] = value;
            }
            Reflect.apply(_applyTarget, thisArg, _argArray);
          },
        });
      } else {
        // get remote
        // @todo fix me, now just a mock for string
        let value = Reflect.get(target, propKey, receiver);
        if (typeof value === 'string') {
          const caller = userManager.getUser(target[caller_symbol]);
          if (caller !== undefined) {
            value += '_' + caller.privateKey();
          }
          const user = userManager.getUser(name);
          if (user !== undefined) {
            value += '_' + user.publicKey();
          }
          value += '_remote_GET_';
        } else if (value instanceof DataBase) {
          if (value['string'] !== undefined && !String(value['string']).endsWith('_remote_GET_')) {
            value['string'] += '_remote_GET_';
          }
        }
        return value;
      }
    },
    set: (target, propKey, value, receiver) => {
      if (typeof propKey === 'symbol' && isInjectedSymbol(propKey)) {
        if (propKey === caller_symbol) {
          return Reflect.set(target, propKey, value, receiver);
        }
        throw new Error(`Cannot access ${String(propKey)}`);
      }

      // have local write permission, set original
      if (userManager.hasPermission(name, Permission.SET)) {
        // @tod write it to storage(cache)
        return Reflect.set(target, propKey, value, receiver);
      }

      // not have remote write permission, throw error
      if (!userManager.hasPermission(name, Permission.SET_REMOTE)) {
        throw new Error(`User "${name}" does not have permission to set property "${String(propKey)}"`);
      }

      // have remote write permission, set remote
      // @todo fix me, now just a mock
      if (typeof value === 'string') {
        const caller = userManager.getUser(target[caller_symbol]);
        if (caller !== undefined) {
          value += '_' + caller.privateKey();
        }
        const user = userManager.getUser(name);
        if (user !== undefined) {
          value += '_' + user.publicKey();
        }
        value += '_remote_SET_';
      }
      return Reflect.set(target, propKey, value, receiver);
    },
    has(target, propKey) {
      if (typeof propKey === 'symbol' && isInjectedSymbol(propKey)) {
        return false;
      }
      return Reflect.has(target, propKey);
    },
  });
}

export function grant2<T extends Consturctor>(name: string) {
  return (target: T) => {
    return new Proxy(target, {
      construct(target, args, _newTarget) {
        const instance = new target(...args);
        instance[users_symbol] = name;
        for (const arg of args) {
          // inject caller info to proxy instance
          if (arg instanceof Object && arg[users_symbol] !== undefined) {
            arg[caller_symbol] = name;
          }
        }
        const proxy = proxyIt2(instance, name);
        return proxy;
      },
    });
  };
}

const fromObjectKey = 'fromObject';
const ignoreProperties = new Set<string | Symbol>(['hasOwnProperty', 'toString', 'valueOf']);

type DataConsturctor = Consturctor & { fromObject(obj: any): any };
export class DataBase {
  static fromObject = <T>(_o: Object): T => {
    throw new Error('not need implemented');
  };
}

export function data<T extends DataConsturctor>() {
  return (target: T) => {
    const targetProxy = new Proxy(target, {
      construct(target, args, _newTarget) {
        const instance = new target(...args);
        return new Proxy(instance, {
          get: (target, propKey, receiver) => {
            const value = Reflect.get(target, propKey, receiver);
            if (typeof value !== 'function' || ignoreProperties.has(propKey)) {
              return value;
            }
            return new Proxy(value, {
              apply(_applyTarget, _thisArg, _argArray) {
                throw new Error(`Cannot apply method ${String(propKey)}`);
              },
            });
          },
        });
      },
    });

    target[fromObjectKey] = function (obj: Object) {
      const instance = new targetProxy();
      for (const key in obj) {
        if (instance.hasOwnProperty(key)) {
          instance[key] = obj[key];
        }
      }
      return instance;
    };
    return targetProxy;
  };
}

export function method(opt?: Option) {
  return (target: any, property: string, _descriptor: PropertyDescriptor) => {
    if (!target[methods_symbol]) {
      target[methods_symbol] = new Map<string | Symbol, Option | undefined>();
    }
    target[methods_symbol].set(property, opt);
  };
}

export function field(opt?: Option) {
  return (target: any, property: string) => {
    if (!target[fields_symbol]) {
      target[fields_symbol] = new Map<string | Symbol, Option | undefined>();
    }
    target[fields_symbol].set(property, opt);
  };
}
