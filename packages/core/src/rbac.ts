import { Evt } from '@bfcs/util-evt';

// RBAC -- Role-based Access Control
// User + Role + Permission

export enum Permission {
  GET = 'GET',
  SET = 'SET',
  APPLY = 'APPLY',
  GET_REMOTE = 'GET_REMOTE',
  SET_REMOTE = 'SET_REMOTE',
  APPLY_REMOTE = 'APPLY_REMOTE',
}

export enum PermissionEvent {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
}

export interface PermissionEventData {
  permission: Permission;
  event: PermissionEvent;
}

export class Role1 {
  permissionSet: Set<Permission> = new Set();
  evt = new Evt<PermissionEventData>({ id: 'permission' });
  constructor(public readonly name: string, private permissions: Permission[]) {
    for (const permission of permissions) {
      this.addPermission(permission);
    }
  }

  addPermission(permission: Permission): void {
    if (this.permissionSet.has(permission)) {
      return;
    }
    this.permissionSet.add(permission);
    this.evt.post({ permission, event: PermissionEvent.ADD });
  }

  removePermission(permission: Permission): void {
    if (!this.permissionSet.has(permission)) {
      return;
    }
    this.permissionSet.delete(permission);
    this.evt.post({ permission, event: PermissionEvent.REMOVE });
  }

  hasPermission(permission: Permission): boolean {
    return this.permissionSet.has(permission);
  }

  getPermissions(): Permission[] {
    return this.permissions.slice();
  }

  onPermission(listener: (permission: PermissionEventData) => void) {
    return this.evt.attach(listener);
  }
}

export enum RoleEvent {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
}

export interface RoleEventData {
  role: Role1;
  event: RoleEvent;
}

class RoleManager {
  roles: Map<string, Role1> = new Map();
  evt = new Evt<RoleEventData>({ id: 'role' });

  addRole(name: string, role: Role1): void {
    if (this.roles.has(name)) {
      throw new Error(`Role ${name} already exists`);
    }

    this.roles.set(name, role);
    this.evt.post({ role, event: RoleEvent.ADD });
  }

  delRole(name: string): void {
    const role = this.roles.get(name);
    if (!role) {
      return;
    }

    this.roles.delete(name);
    this.evt.post({ role, event: RoleEvent.REMOVE });
  }

  getRole(name: string): Role1 | undefined {
    return this.roles.get(name);
  }

  hasRole(name: string): boolean {
    return this.roles.has(name);
  }

  onRole(listener: (role: RoleEventData) => void) {
    return this.evt.attach(listener);
  }
}

// export const defineRole1 = (name: string, permissions: Permission[]): Role1 => {
//   const role = new Role1(name, permissions);
//   roleManager.addRole(name, role);
//   return role;
// }

// // preset roles
// const sysRoleLocal = 'sys.local';
// const sysRoleRemote = 'sys.remote';
// defineRole1(sysRoleLocal, [Permission.GET, Permission.SET, Permission.APPLY]);
// defineRole1(sysRoleRemote, [Permission.GET_REMOTE, Permission.SET_REMOTE, Permission.APPLY_REMOTE]);

export type PublicKey = string;
export type PrivateKey = string;
export interface KeyPair {
  publicKey: PublicKey;
  privateKey: PrivateKey;
}

export const keyPairFromPublicKey = (publicKey: PublicKey): KeyPair => {
  return {
    publicKey,
    privateKey: '',
  };
};

export const keyPairFromPrivateKey = (privateKey: PrivateKey): KeyPair => {
  return {
    publicKey: privateKey, // @todo get public key from private key
    privateKey,
  };
};

export class User {
  constructor(public readonly name: string, private keypair: KeyPair) {}

  publicKey() {
    return this.keypair.publicKey;
  }

  privateKey() {
    return this.keypair.privateKey;
  }
}

export enum UserEvent {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
}

export interface UserEventData {
  user: User;
  event: UserEvent;
}

class UserManager {
  users: Map<string, { user: User; roles: string[] }> = new Map();
  evt = new Evt<UserEventData>({ id: 'user' });

  addUser(name: string, user: User, roles: string[]): void {
    if (this.users.has(name)) {
      throw new Error(`User ${name} already exists`);
    }

    if (roles.length === 0) {
      throw new Error(`User ${name} must have at least one role`);
    }

    this.users.set(name, { user, roles: roles.slice() });
    this.evt.post({ user, event: UserEvent.ADD });
  }

  delUser(name: string): void {
    const user = this.users.get(name);
    if (!user) {
      return;
    }
    this.users.delete(name);
    this.evt.post({ user: user.user, event: UserEvent.REMOVE });
  }

  getUser(name: string): User | undefined {
    const user = this.users.get(name);
    if (!user) {
      return undefined;
    }

    return user.user;
  }

  hasUser(name: string): boolean {
    return this.users.has(name);
  }

  getUserRoles(name: string): string[] {
    const user = this.users.get(name);
    if (!user) {
      return [];
    }

    return user.roles;
  }

  getUserPermissions(name: string): Permission[] {
    const user = this.users.get(name);
    const permissions: Permission[] = [];
    if (!user) {
      return permissions;
    }
    // for (const roleName of user.roles) {
    //   const role = roleManager.getRole(roleName);
    //   if (role != undefined) {
    //     permissions.push(...role.getPermissions())
    //   }
    // }
    return permissions;
  }

  onUser(listener: (user: UserEventData) => void) {
    return this.evt.attach(listener);
  }

  hasPermission(name: string, permission: Permission): boolean {
    const user = this.users.get(name);
    if (!user) {
      return false;
    }
    for (const roleName of user.roles) {
      // const role = roleManager.getRole(roleName);
      // if (role && role.hasPermission(permission)) {
      //   return true;
      // }
    }

    return false;
  }

  login(name: string, keypair: KeyPair) {
    if (this.users.has(name)) {
      throw new Error(`User ${name} already exist`);
    }

    let roles: string[] = [];
    // if (keypair.privateKey != "") {
    //   // @todo check if keypair is valid
    //   roles = [sysRoleLocal];
    // } else if (keypair.publicKey != "") {
    //   // @todo check if keypair is valid
    //   roles = [sysRoleRemote];
    // }
    const user = new User(name, keypair);
    this.addUser(name, user, roles);
  }
}

export const userManager = new UserManager();

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
      if (target[fields_symbol] === undefined || !target[fields_symbol].has(propKey)) {
        return Reflect.get(target, propKey, receiver);
      }

      // have local read permission, get original
      if (userManager.hasPermission(name, Permission.GET)) {
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
            if (!userManager.hasPermission(name, Permission.APPLY_REMOTE)) {
              throw new Error(`User "${name}" does not have permission to apply method "${String(thisArg)}"`);
            }
            // apply remote
            // @todo fix me, now just do nothing
            let value = String(thisArg);
            const caller = userManager.getUser(target[caller_symbol]);
            if (caller !== undefined) {
              value += '_' + caller.privateKey();
            }
            const user = userManager.getUser(name);
            if (user !== undefined) {
              value += '_' + user.publicKey();
            }
            value += '_remote';
            console.log(`apply remote ${value}`);
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
          value += '_remote';
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
      if (target[fields_symbol] === undefined || !target[fields_symbol].has(propKey)) {
        return Reflect.set(target, propKey, value, receiver);
      }

      // have local write permission, set original
      if (userManager.hasPermission(name, Permission.SET)) {
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
        value += '_remote';
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
        return proxyIt(instance, name);
      },
    });
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
